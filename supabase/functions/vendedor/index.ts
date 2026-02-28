import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { items, orderId, email, frete, metodo } = await req.json()

    // ✅ Lógica ANTES do fetch — lugar correto
    const itensMercadoPago = items.map((i: any) => ({
      id: String(i.id),
      title: i.nome,
      description: i.nome,
      unit_price: Number(i.preco),
      quantity: Number(i.quantidade),
      currency_id: 'BRL'
    }));

    if (frete && Number(frete) > 0) {
      itensMercadoPago.push({
        id: 'frete',
        title: 'Frete',
        description: 'Taxa de entrega',
        unit_price: Number(frete),
        quantity: 1,
        currency_id: 'BRL'
      });
    }

    // ✅ fetch usa o array já montado
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: itensMercadoPago,
        payer: {
          email: email
        },
        external_reference: orderId.toString(),
        notification_url: "https://kmmowmfrfshaazvfuheg.supabase.co/functions/v1/mercado-pago-webhook",
        back_urls: {
          success: "https://ecormece-suplo.netlify.app/index.html",
          failure: "https://ecormece-suplo.netlify.app/checkout.html",
          pending: "https://ecormece-suplo.netlify.app/perfil.html"
        },
        auto_return: "approved",
        payment_methods: metodo === 'pix'
          ? { excluded_payment_types: [{ id: 'credit_card' }] }
          : {}
      })
    })

    const data = await response.json()

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