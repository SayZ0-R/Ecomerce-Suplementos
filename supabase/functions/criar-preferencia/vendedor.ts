import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Cabeçalhos para permitir que o seu site (Frontend) acesse esta função
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { items, orderId, email } = await req.json()

    // 1. Prepara a chamada para o Mercado Pago
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: items.map((i: any) => ({
          title: i.nome,
          // O Mercado Pago exige preço em número. 
          // Se for cartão, o frontend já deve ter passado o preco_cartao
          unit_price: Number(i.preco), 
          quantity: Number(i.quantidade),
          currency_id: 'BRL'
        })),
        payer: {
          email: email
        },
        // O external_reference é o que liga o pagamento ao seu ID de pedido no Supabase
        external_reference: orderId.toString(),
        // Coloque aqui a URL da sua OUTRA função (o webhook) que já criamos
        notification_url: "https://kmmowmfrfshaazvfuheg.supabase.co/functions/v1/caixa",
        back_urls: {
          success: "https://ecormece-suplo.netlify.app/index.html",
          failure: "https://ecormece-suplo.netlify.app/checkout.html",
          pending: "https://ecormece-suplo.netlify.app/perfil.html"
        },
        auto_return: "approved",
      })
    })

    const data = await response.json()

    // Retorna o ID da preferência para o seu frontend abrir o checkout
    return new Response(JSON.stringify({ id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})