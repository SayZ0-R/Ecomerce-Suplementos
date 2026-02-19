import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // AJUSTE 1: Tratar o pré-flight do CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const body = await req.json()
    console.log("Notificação recebida do MP:", body)

    if (body.type === 'payment' || body.action?.includes('payment')) {
      const paymentId = body.data?.id || body.resource?.split('/').pop()

      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')}` }
      })
      
      const paymentData = await mpResponse.json()

      if (paymentData.status === 'approved') {
        const orderId = paymentData.external_reference 
        
        console.log(`Pagamento aprovado para o Pedido: ${orderId}`)

        const { error } = await supabase
          .from('pedidos')
          .update({ status_pagamento: 'Aprovado' })
          .eq('id', orderId)

        if (error) throw error
      }
    }

    // AJUSTE 2: Incluir os corsHeaders na resposta de sucesso
    return new Response(JSON.stringify({ ok: true }), { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })

  } catch (err) {
    console.error("Erro no Webhook:", err.message)
    // AJUSTE 3: Incluir os corsHeaders na resposta de erro
    return new Response(JSON.stringify({ error: err.message }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })
  }
})