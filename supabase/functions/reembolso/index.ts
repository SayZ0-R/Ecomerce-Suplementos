import { serve }       from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MP_TOKEN = () => Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') ?? ''

serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { pedidoId, solicitante } = await req.json()
    // solicitante: 'cliente' ou 'admin'

    console.log('[reembolso] pedidoId:', pedidoId, '| solicitante:', solicitante)

    if (!pedidoId) throw new Error('pedidoId ausente')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')        ?? '',
      Deno.env.get('MP_SUPABASE_SERVICE_KEY') ?? ''
    )

    // Busca o pedido no Supabase
    const { data: pedido, error: errPedido } = await supabase
      .from('pedidos')
      .select('*')
      .eq('id', pedidoId)
      .single()

    if (errPedido || !pedido) throw new Error('Pedido não encontrado')

    console.log('[reembolso] status_pedido:', pedido.status_pedido, '| payment_id:', pedido.payment_id)

    // ==========================================
    // VALIDAÇÕES DE REGRA DE NEGÓCIO
    // ==========================================

    // Pedido já cancelado
    if (pedido.status_pedido === 'Cancelado') {
      throw new Error('Este pedido já foi cancelado.')
    }

    // Cliente só pode cancelar se o pedido ainda não foi enviado
    if (solicitante === 'cliente' && pedido.status_pedido === 'Enviado') {
      throw new Error('Produto já foi enviado. Entre em contato com a loja para solicitar reembolso.')
    }

    // Admin: verifica prazo de 7 dias para pedidos enviados
    if (solicitante === 'admin' && pedido.status_pedido === 'Enviado') {
      const dataEnvio   = new Date(pedido.updated_at)
      const agora       = new Date()
      const diasPassados = (agora.getTime() - dataEnvio.getTime()) / (1000 * 60 * 60 * 24)

      if (diasPassados > 7) {
        throw new Error(`Prazo de 7 dias para reembolso expirado. Pedido enviado há ${Math.floor(diasPassados)} dias.`)
      }
    }

    // ==========================================
    // REEMBOLSO NO MERCADO PAGO
    // ==========================================
    let mpStatus = 'sem_pagamento'

    if (pedido.payment_id) {
      // Primeiro verifica o status atual do pagamento no MP
      const mpCheck = await fetch(`https://api.mercadopago.com/v1/payments/${pedido.payment_id}`, {
        headers: { 'Authorization': `Bearer ${MP_TOKEN()}` }
      })
      const mpPayment = await mpCheck.json()
      console.log('[reembolso] status MP atual:', mpPayment.status)

      if (mpPayment.status === 'approved') {
        // Pagamento aprovado → emite reembolso total
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${pedido.payment_id}/refunds`, {
          method: 'POST',
          headers: {
            'Authorization':     `Bearer ${MP_TOKEN()}`,
            'Content-Type':      'application/json',
            'X-Idempotency-Key': `refund-${pedidoId}-${Date.now()}`
          },
          body: JSON.stringify({}) // body vazio = reembolso total
        })

        const mpData = await mpRes.json()
        console.log('[reembolso] resposta MP:', JSON.stringify(mpData))

        if (mpData.error) throw new Error('Erro no reembolso MP: ' + mpData.message)

        mpStatus = 'reembolsado'

      } else if (mpPayment.status === 'pending' || mpPayment.status === 'in_process') {
        // Pagamento pendente → cancela
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${pedido.payment_id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${MP_TOKEN()}`,
            'Content-Type':  'application/json'
          },
          body: JSON.stringify({ status: 'cancelled' })
        })
        const mpData = await mpRes.json()
        console.log('[reembolso] cancelamento MP:', JSON.stringify(mpData))
        mpStatus = 'cancelado_mp'
      } else {
        mpStatus = mpPayment.status
      }
    }

    // ==========================================
    // ATUALIZA PEDIDO NO SUPABASE
    // ==========================================
    const { error: errUpdate } = await supabase
      .from('pedidos')
      .update({
        status_pedido:    'Cancelado',
        status_pagamento: mpStatus === 'reembolsado' ? 'Reembolsado' : 'Cancelado',
      })
      .eq('id', pedidoId)

    if (errUpdate) throw new Error('Erro ao atualizar pedido: ' + errUpdate.message)

    console.log('[reembolso] pedido', pedidoId, 'cancelado | mpStatus:', mpStatus)

    return new Response(JSON.stringify({
      sucesso:  true,
      mpStatus: mpStatus,
      mensagem: mpStatus === 'reembolsado'
        ? 'Pedido cancelado e reembolso emitido com sucesso.'
        : 'Pedido cancelado com sucesso.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err: any) {
    console.error('[reembolso] ERRO:', err.message)
    return new Response(JSON.stringify({ sucesso: false, erro: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})