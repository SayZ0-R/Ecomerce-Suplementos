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
    const { tipo, orderId, email, frete, items } = payload

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

      const itensMercadoPago = (items ?? []).map((i: any) => ({
        id:          String(i.id),
        title:       String(i.nome),
        description: String(i.nome),
        unit_price:  Number(i.preco),
        quantity:    Number(i.quantidade),
        currency_id: 'BRL'
      }))

      if (frete && Number(frete) > 0) {
        itensMercadoPago.push({
          id:          'frete',
          title:       'Frete',
          description: 'Taxa de entrega',
          unit_price:  Number(frete),
          quantity:    1,
          currency_id: 'BRL'
        })
      }

      const prefBody = {
        items: itensMercadoPago,
        payer: { email: email },
        external_reference: String(orderId),
        notification_url: 'https://kmmowmfrfshaazvfuheg.supabase.co/functions/v1/mercado-pago-webhook',
        back_urls: {
          success: 'https://ecormece-suplo.netlify.app/index.html',
          failure: 'https://ecormece-suplo.netlify.app/checkout.html',
          pending: 'https://ecormece-suplo.netlify.app/perfil.html'
        },
        auto_return: 'approved',
        payment_methods: {
          excluded_payment_types: [
            { id: 'credit_card' },
            { id: 'debit_card'  },
            { id: 'ticket'      }
          ],
          installments: 1
        }
      }

      const mpRes  = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MP_TOKEN()}`,
          'Content-Type':  'application/json'
        },
        body: JSON.stringify(prefBody)
      })

      const mpData = await mpRes.json()
      console.log('[pix] resposta MP:', JSON.stringify(mpData))

      return new Response(JSON.stringify({ id: mpData.id }), {
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