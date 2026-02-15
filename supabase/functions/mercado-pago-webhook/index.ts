import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const body = await req.json()
    console.log("Notificação recebida do MP:", body)

    // O Mercado Pago avisa sobre 'payment' ou 'plan_subscription'
    // Nós só queremos processar pagamentos
    if (body.type === 'payment' || body.action?.includes('payment')) {
      const paymentId = body.data?.id || body.resource?.split('/').pop()

      // Buscar detalhes do pagamento no Mercado Pago
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')}` }
      })
      
      const paymentData = await mpResponse.json()

      if (paymentData.status === 'approved') {
        const orderId = paymentData.external_reference // O ID do seu banco
        
        console.log(`Pagamento aprovado para o Pedido: ${orderId}`)

        const { error } = await supabase
          .from('pedidos')
          .update({ status_pagamento: 'Aprovado' })
          .eq('id', orderId)

        if (error) throw error
      }
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error("Erro no Webhook:", err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
})