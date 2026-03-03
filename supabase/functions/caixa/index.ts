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
    const url    = new URL(req.url)
    const limite = url.searchParams.get('limit') ?? '20'
    const offset = url.searchParams.get('offset') ?? '0'

    console.log('[caixa] limite:', limite, '| offset:', offset)

    // Busca pagamentos aprovados na API do MP
    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payments/search?status=approved&limit=${limite}&offset=${offset}`,
      {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')}`
        }
      }
    )

    const mpData = await mpRes.json()
    console.log('[caixa] total encontrado:', mpData.paging?.total)

    // Formata para resposta limpa
    const pagamentos = (mpData.results ?? []).map((p: any) => ({
      id:                 p.id,
      status:             p.status,
      status_detail:      p.status_detail,
      payment_method_id:  p.payment_method_id,
      transaction_amount: p.transaction_amount,
      net_received_amount: p.fee_details?.find((f: any) => f.type === 'mercadopago_fee')
                            ? p.transaction_amount - (p.fee_details.reduce((acc: number, f: any) => acc + f.amount, 0))
                            : p.transaction_amount,
      external_reference: p.external_reference,
      payer_email:        p.payer?.email,
      date_approved:      p.date_approved,
      installments:       p.installments,
    }))

    return new Response(JSON.stringify({
      total:      mpData.paging?.total ?? 0,
      limit:      Number(limite),
      offset:     Number(offset),
      pagamentos: pagamentos,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err: any) {
    console.error('[caixa] ERRO:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})