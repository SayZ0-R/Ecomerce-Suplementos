import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_PARCELAS = 4;
const MP_TOKEN     = () => Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') ?? ''

serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const bodyText = await req.text()
    const payload = JSON.parse(bodyText)
    const { tipo, orderId, email, frete, items, base_url } = payload

    // LOG DE DEBUG — mostra os primeiros 30 chars do token para confirmar qual está sendo usado
    const tokenAtual = MP_TOKEN()
    console.log('[DEBUG] MP_TOKEN primeiros 40 chars:', tokenAtual.substring(0, 40))
    console.log('[DEBUG] MP_TOKEN tamanho:', tokenAtual.length)
    console.log('[vendedor] tipo:', tipo, '| orderId:', orderId)

    if (tipo === 'cartao') {

      const token              = payload.token
      const payment_method_id  = payload.payment_method_id
      const issuer_id          = payload.issuer_id
      const installments       = payload.installments
      const transaction_amount = payload.transaction_amount

      console.log('[cartao] token:', token)
      console.log('[cartao] payment_method_id:', payment_method_id)
      console.log('[cartao] transaction_amount:', transaction_amount)

      if (!token)              throw new Error('Campo ausente: token')
      if (!payment_method_id)  throw new Error('Campo ausente: payment_method_id')
      if (!transaction_amount) throw new Error('Campo ausente: transaction_amount')

      const parcelasValidadas = Math.min(Number(installments) || 1, MAX_PARCELAS)

      const mpBody = {
        token:              token,
        issuer_id:          issuer_id,
        payment_method_id:  payment_method_id,
        transaction_amount: Number(transaction_amount),
        installments:       parcelasValidadas,
        description:        `Pedido NutrirVida #${orderId}`,
        external_reference: String(orderId),
        payer: { email: email },
        additional_info: {
          items: (items ?? []).map((i: any) => ({
            id:          String(i.id),
            title:       String(i.nome),
            description: String(i.nome),
            unit_price:  Number(i.preco),
            quantity:    Number(i.quantidade),
          }))
        },
        notification_url: 'https://kmmowmfrfshaazvfuheg.supabase.co/functions/v1/mercado-pago-webhook'
      }

      const mpRes  = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization':     `Bearer ${MP_TOKEN()}`,
          'Content-Type':      'application/json',
          'X-Idempotency-Key': `nutrivida-${orderId}-${Date.now()}`
        },
        body: JSON.stringify(mpBody)
      })

      const mpData = await mpRes.json()
      console.log('[cartao] resposta MP:', JSON.stringify(mpData))

      return new Response(JSON.stringify({
        status:        mpData.status,
        status_detail: mpData.status_detail,
        id:            mpData.id,
        message:       mpData.message,
        error:         mpData.error,
        cause:         mpData.cause,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (tipo === 'pix') {

      // Calcula o total somando itens + frete
      const totalItens = (items ?? []).reduce((acc: number, i: any) =>
        acc + (Number(i.preco) * Number(i.quantidade)), 0)
      const totalFrete  = frete && Number(frete) > 0 ? Number(frete) : 0
      const totalAmount = Number((totalItens + totalFrete).toFixed(2))

      console.log('[pix] totalItens:', totalItens, '| frete:', totalFrete, '| total:', totalAmount)

      const pixBody = {
        transaction_amount: totalAmount,
        description:        `Pedido NutrirVida #${orderId}`,
        payment_method_id:  'pix',
        external_reference: String(orderId),
        notification_url:   'https://kmmowmfrfshaazvfuheg.supabase.co/functions/v1/mercado-pago-webhook',
        payer: { email: email },
        additional_info: {
          items: (items ?? []).map((i: any) => ({
            id:          String(i.id),
            title:       String(i.nome),
            description: String(i.nome),
            unit_price:  Number(i.preco),
            quantity:    Number(i.quantidade),
          }))
        }
      }

      const mpRes  = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization':     `Bearer ${MP_TOKEN()}`,
          'Content-Type':      'application/json',
          'X-Idempotency-Key': `nutrivida-pix-${orderId}-${Date.now()}`
        },
        body: JSON.stringify(pixBody)
      })

      const mpData = await mpRes.json()
      console.log('[pix] resposta MP:', JSON.stringify(mpData))

      // Retorna QR code e copia cola para o frontend exibir
      return new Response(JSON.stringify({
        id:              mpData.id,
        status:          mpData.status,
        qr_code:         mpData.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64:  mpData.point_of_interaction?.transaction_data?.qr_code_base64,
        ticket_url:      mpData.point_of_interaction?.transaction_data?.ticket_url,
        error:           mpData.error,
        message:         mpData.message,
        cause:           mpData.cause,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    throw new Error(`tipo inválido: "${tipo}". Use "cartao" ou "pix".`)

  } catch (err: any) {
    console.error('[vendedor] ERRO:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})