import { serve }       from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('[webhook] payload:', JSON.stringify(body))

    if (body.type !== 'payment' || !body.data?.id) {
      console.log('[webhook] ignorado — tipo:', body.type)
      return new Response('ignorado', { status: 200, headers: corsHeaders })
    }

    const paymentId = String(body.data.id)
    console.log('[webhook] paymentId:', paymentId)

    // Busca detalhes do pagamento no MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')}`
      }
    })

    const payment = await mpRes.json()
    console.log('[webhook] status:', payment.status, '| ref:', payment.external_reference)

    if (!payment.external_reference) {
      console.warn('[webhook] sem external_reference — ignorando')
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    // Mapeia status MP → status interno
    const statusMap: Record<string, { pagamento: string; pedido: string }> = {
      approved:     { pagamento: 'Aprovado',    pedido: 'Confirmado' },
      in_process:   { pagamento: 'Em análise',  pedido: 'Pendente'   },
      pending:      { pagamento: 'Aguardando',  pedido: 'Pendente'   },
      rejected:     { pagamento: 'Rejeitado',   pedido: 'Cancelado'  },
      cancelled:    { pagamento: 'Cancelado',   pedido: 'Cancelado'  },
      refunded:     { pagamento: 'Reembolsado', pedido: 'Cancelado'  },
      charged_back: { pagamento: 'Estornado',   pedido: 'Cancelado'  },
    }

    const mapeado = statusMap[payment.status] ?? { pagamento: payment.status, pedido: 'Pendente' }

    // Usa MP_SUPABASE_SERVICE_KEY — nome sem prefixo SUPABASE_ (bloqueado pelo CLI)
    const supabaseUrl      = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey      = Deno.env.get('MP_SUPABASE_SERVICE_KEY') ?? ''

    console.log('[webhook] supabaseUrl:', supabaseUrl)
    console.log('[webhook] serviceKey tamanho:', supabaseKey.length)

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { error } = await supabase
      .from('pedidos')
      .update({
        status_pagamento: mapeado.pagamento,
        status_pedido:    mapeado.pedido,
        payment_id:       paymentId,
      })
      .eq('id', payment.external_reference)

    if (error) {
      console.error('[webhook] erro Supabase:', error.message)
      throw new Error(error.message)
    }

    console.log('[webhook] pedido', payment.external_reference, 'atualizado →', JSON.stringify(mapeado))
    return new Response('ok', { status: 200, headers: corsHeaders })

  } catch (err: any) {
    console.error('[webhook] ERRO:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})