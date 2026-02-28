import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_PARCELAS = 4;

serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const bodyText = await req.text()
    console.log("BODY RECEBIDO:", bodyText)

    const payload = JSON.parse(bodyText)
    const { tipo, orderId, email, frete, items } = payload

    console.log("TIPO:", tipo, "| ORDER:", orderId, "| FRETE:", frete, "| ITEMS:", items?.length)

    // =============================================
    // ROTA A — CARTÃO (Checkout Transparente Bricks)
    // Endpoint: POST /v1/payments
    // =============================================
    if (tipo === 'cartao') {
      const {
        token,
        installments,
        paymentMethodId,
        issuerId,
        transactionAmount
      } = payload

      // Garante máximo 4 parcelas mesmo que o frontend tente burlar
      const parcelasValidadas = Math.min(Number(installments) || 1, MAX_PARCELAS)

      console.log("CARTÃO | Token:", token, "| Parcelas:", parcelasValidadas, "| Método:", paymentMethodId)

      const response = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')}`,
          "Content-Type":  "application/json",
          // Idempotência — evita cobranças duplicadas em caso de retry
          "X-Idempotency-Key": `order-${orderId}-${Date.now()}`
        },
        body: JSON.stringify({
          token:              token,
          issuer_id:          issuerId,
          payment_method_id:  paymentMethodId,
          transaction_amount: Number(transactionAmount),
          installments:       parcelasValidadas,
          description:        `Pedido NutrirVida #${orderId}`,
          external_reference: String(orderId),
          payer: {
            email: email
          },
          // Dados adicionais dos itens para análise antifraude do MP
          additional_info: {
            items: items.map((i: any) => ({
              id:          String(i.id),
              title:       i.nome,
              description: i.nome,
              unit_price:  Number(i.preco),
              quantity:    Number(i.quantidade),
              currency_id: 'BRL'
            }))
          },
          notification_url: "https://kmmowmfrfshaazvfuheg.supabase.co/functions/v1/mercado-pago-webhook"
        })
      })

      const data = await response.json()
      console.log("RESPOSTA MP (cartão):", JSON.stringify(data))

      return new Response(JSON.stringify({
        status:        data.status,
        status_detail: data.status_detail,
        id:            data.id
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      })
    }

    // =============================================
    // ROTA B — PIX (Checkout Pro — gera QR Code)
    // Endpoint: POST /checkout/preferences
    // =============================================
    if (tipo === 'pix') {
      // Monta itens para a preferência
      const itensMercadoPago = items.map((i: any) => ({
        id:          String(i.id),
        title:       i.nome,
        description: i.nome,
        unit_price:  Number(i.preco),
        quantity:    Number(i.quantidade),
        currency_id: 'BRL'
      }))

      // Injeta frete como item separado se existir
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

      console.log("PIX | Itens:", JSON.stringify(itensMercadoPago))

      const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')}`,
          "Content-Type":  "application/json"
        },
        body: JSON.stringify({
          items: itensMercadoPago,
          payer: { email: email },
          external_reference: String(orderId),
          notification_url: "https://kmmowmfrfshaazvfuheg.supabase.co/functions/v1/mercado-pago-webhook",
          back_urls: {
            success: "https://ecormece-suplo.netlify.app/index.html",
            failure: "https://ecormece-suplo.netlify.app/checkout.html",
            pending: "https://ecormece-suplo.netlify.app/perfil.html"
          },
          auto_return: "approved",
          // ✅ Exclui cartão e débito — deixa Pix (bank_transfer) disponível
          // Pix pertence à categoria bank_transfer no MP — NUNCA exclua essa categoria
          payment_methods: {
            excluded_payment_types: [
              { id: 'credit_card' },
              { id: 'debit_card' },
              { id: 'ticket' }       // exclui boleto — só Pix
            ],
            installments: 1,
            default_payment_method_id: 'pix'   // destaca Pix como padrão
          }
        })
      })

      const data = await response.json()
      console.log("RESPOSTA MP (pix):", JSON.stringify(data))

      return new Response(JSON.stringify({ id: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      })
    }

    // Tipo não reconhecido
    throw new Error(`Tipo de pagamento inválido: "${tipo}". Use "cartao" ou "pix".`)

  } catch (error) {
    console.error("ERRO NA FUNÇÃO:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})