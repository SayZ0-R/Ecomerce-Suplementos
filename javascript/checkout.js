// =============================================
// CHECKOUT — NutrirVida
// Mercado Pago Payment Brick (Checkout Transparente)
// =============================================

const MP_PUBLIC_KEY = 'TEST-0cff84ff-8330-4dbe-bb80-07793085c3f2';
const MAX_PARCELAS  = 4;

let paymentBrickController = null;

// =============================================
// 1. CÁLCULO DO TOTAL E RESUMO LATERAL
// =============================================
function calcularTotais() {
    const carrinho = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
    const frete    = parseFloat(localStorage.getItem('nutrirVida_frete')) || 0;
    const metodo   = document.querySelector('input[name="metodo-pagamento"]:checked')?.value || 'cartao';

    let subtotalPix    = 0;
    let subtotalCartao = 0;

    carrinho.forEach(item => {
        const precoPix    = parseFloat(item.preco);
        const precoCartao = item.preco_cartao ? parseFloat(item.preco_cartao) : precoPix;
        subtotalPix    += precoPix    * item.quantidade;
        subtotalCartao += precoCartao * item.quantidade;
    });

    const totalPix    = subtotalPix    + frete;
    const totalCartao = subtotalCartao + frete;
    const totalAtivo  = metodo === 'pix' ? totalPix : totalCartao;
    const economia    = totalCartao - totalPix;

    return { carrinho, frete, metodo, subtotalPix, subtotalCartao, totalPix, totalCartao, totalAtivo, economia };
}

function atualizarTotalCheckout() {
    const { carrinho, frete, metodo, subtotalPix, subtotalCartao, totalAtivo, economia } = calcularTotais();

    const resumoItens = document.getElementById('resumo-itens');
    if (resumoItens) {
        resumoItens.innerHTML = carrinho.map(item => {
            const preco     = metodo === 'cartao' && item.preco_cartao ? parseFloat(item.preco_cartao) : parseFloat(item.preco);
            const totalItem = preco * item.quantidade;
            return `
                <div class="summary-item">
                    <div>
                        <div class="summary-item-name">${item.nome}</div>
                        <div class="summary-item-qty">Qtd: ${item.quantidade}</div>
                    </div>
                    <div class="summary-item-price">R$ ${totalItem.toFixed(2).replace('.', ',')}</div>
                </div>`;
        }).join('');
    }

    const elSubtotal = document.getElementById('resumo-subtotal');
    if (elSubtotal) {
        const sub = metodo === 'pix' ? subtotalPix : subtotalCartao;
        elSubtotal.innerText = `R$ ${sub.toFixed(2).replace('.', ',')}`;
    }

    const elFrete = document.getElementById('resumo-frete');
    if (elFrete) {
        elFrete.innerText   = frete === 0 ? 'Grátis' : `R$ ${frete.toFixed(2).replace('.', ',')}`;
        elFrete.style.color = frete === 0 ? '#2ecc71' : '';
    }

    const linhaDesconto = document.getElementById('linha-desconto-pix');
    const valorDesconto = document.getElementById('valor-desconto-pix');
    if (linhaDesconto && valorDesconto) {
        if (metodo === 'pix' && economia > 0) {
            linhaDesconto.style.display = 'flex';
            valorDesconto.innerText     = `- R$ ${economia.toFixed(2).replace('.', ',')}`;
        } else {
            linhaDesconto.style.display = 'none';
        }
    }

    const elTotal = document.getElementById('total-final-checkout');
    if (elTotal) {
        elTotal.innerText   = `R$ ${totalAtivo.toFixed(2).replace('.', ',')}`;
        elTotal.style.color = metodo === 'pix' ? '#2ecc71' : '#1a1a1a';
    }

    localStorage.setItem('nutrirVida_total_dinamico', totalAtivo.toFixed(2));
    return totalAtivo;
}

// =============================================
// 2. PAYMENT BRICK (CARTÃO)
// =============================================
async function destruirBrick() {
    if (paymentBrickController) {
        try { paymentBrickController.destroy(); } catch(e) {}
        paymentBrickController = null;
    }
    const c = document.getElementById('paymentBrick_container');
    if (c) c.innerHTML = '';
}

async function renderPaymentBrick(totalInicial) {
    const container = document.getElementById('paymentBrick_container');
    if (!container) return;

    await destruirBrick();

    const amount = Number(totalInicial);
    if (!amount || amount <= 0) {
        console.error('[Brick] amount inválido:', totalInicial);
        return;
    }

    try {
        const mp            = new MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
        const bricksBuilder = mp.bricks();

        paymentBrickController = await bricksBuilder.create('payment', 'paymentBrick_container', {
            initialization: {
                amount: amount,
                payer: {
                    email: document.getElementById('email-checkout')?.value || ''
                }
            },
            customization: {
                paymentMethods: {
                    creditCard:      'all',
                    maxInstallments: MAX_PARCELAS,
                },
                visual: {
                    style: {
                        theme: 'default',
                        customVariables: {
                            baseColor:          '#2ecc71',
                            baseColorSecondary: '#27ae60',
                            fontFamily:         'DM Sans, sans-serif',
                            borderRadius:       '8px',
                        }
                    },
                    hideFormTitle:     true,
                    hidePaymentButton: false,
                }
            },
            callbacks: {
                onReady: () => {
                    console.log('[Brick] Pronto | amount:', amount);
                },
                onError: (error) => {
                    console.error('[Brick] Erro:', JSON.stringify(error));
                },
                onSubmit: async ({ formData }) => {
                    console.log('[Brick] onSubmit raw:', JSON.stringify(formData));
                    if (!validarCamposEndereco()) return;
                    await processarPedidoCartao(formData);
                }
            }
        });

    } catch (err) {
        console.error('[Brick] Falha ao criar:', err);
        paymentBrickController = null;
    }
}

// =============================================
// 3. VALIDAÇÃO DE CAMPOS DE ENDEREÇO
// =============================================
function validarCamposEndereco() {
    const campos = ['nome-completo', 'whatsapp', 'logradouro', 'numero', 'bairro'];
    for (const id of campos) {
        const el = document.getElementById(id);
        if (!el || !el.value.trim()) {
            alert(`Por favor, preencha o campo: ${el?.labels?.[0]?.innerText || id}`);
            el?.focus();
            return false;
        }
    }
    return true;
}

// =============================================
// 4. PROCESSAR PEDIDO — CARTÃO
// =============================================
async function processarPedidoCartao(formData) {

    // Brick pode retornar direto ou aninhado em formData.formData
    const dados = formData?.formData ?? formData;

    const token              = dados.token;
    const payment_method_id  = dados.payment_method_id;
    const issuer_id          = dados.issuer_id;
    const installments       = dados.installments;
    const transaction_amount = dados.transaction_amount;

    console.log('[Cartão] token:', token);
    console.log('[Cartão] payment_method_id:', payment_method_id);
    console.log('[Cartão] issuer_id:', issuer_id);
    console.log('[Cartão] installments:', installments);
    console.log('[Cartão] transaction_amount:', transaction_amount);

    // Fallback para localStorage se Brick não enviou o valor
    const totalFinal = Number(transaction_amount) || parseFloat(localStorage.getItem('nutrirVida_total_dinamico'));

    if (!token) { alert('Erro: token do cartão ausente. Tente novamente.'); return; }
    if (!payment_method_id) { alert('Erro: método de pagamento não identificado.'); return; }
    if (!totalFinal || totalFinal <= 0) { alert('Erro: valor do pedido inválido.'); return; }

    const carrinho   = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
    const freteAtual = parseFloat(localStorage.getItem('nutrirVida_frete')) || 0;

    const totalItensQtd = carrinho.reduce((acc, item) => acc + (parseInt(item.quantidade) || 0), 0);

    const itensParaMP = carrinho.map(item => ({
        ...item,
        preco: item.preco_cartao ? item.preco_cartao : item.preco
    }));

    const pedidoData = {
        cliente_nome:           document.getElementById('nome-completo').value,
        cliente_email:          document.getElementById('email-checkout').value,
        whatsapp:               document.getElementById('whatsapp').value,
        endereco:               `${document.getElementById('logradouro').value}, ${document.getElementById('numero').value} - ${document.getElementById('bairro').value}`,
        itens:                  carrinho,
        total_itens_quantidade: totalItensQtd,
        total:                  totalFinal,
        metodo_pagamento:       'cartao',
        status_pagamento:       'Aguardando',
        status_pedido:          'Pendente'
    };

    try {
        const { data, error } = await _supabase.from('pedidos').insert([pedidoData]).select();
        if (error) throw new Error('Supabase: ' + error.message);

        const pedidoCriado = data[0];
        console.log('[Cartão] Pedido Supabase ID:', pedidoCriado.id);

        const payload = {
            tipo:               'cartao',
            orderId:            pedidoCriado.id,
            email:              pedidoData.cliente_email,
            frete:              freteAtual,
            items:              itensParaMP,
            token:              token,
            installments:       Math.min(Number(installments) || 1, MAX_PARCELAS),
            payment_method_id:  payment_method_id,
            issuer_id:          issuer_id,
            transaction_amount: totalFinal,
        };

        console.log('[Cartão] Payload Edge Function:', JSON.stringify(payload));

        const response = await fetch(`${SUPABASE_URL}/functions/v1/vendedor`, {
            method: 'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log('[Cartão] Resposta:', JSON.stringify(result));

        if (result.status === 'approved' || result.status === 'in_process') {
            localStorage.removeItem('nutrirVida_cart');
            alert('Pedido confirmado! Você receberá um e-mail de confirmação.');
            window.location.href = 'perfil.html';
        } else {
            throw new Error(result.status_detail || result.message || result.error || 'Pagamento não aprovado.');
        }

    } catch (err) {
        console.error('[Cartão] Erro:', err.message);
        alert('Erro ao processar pagamento: ' + err.message);
    }
}

// =============================================
// 5. PROCESSAR PEDIDO — PIX
// =============================================
async function processarPedidoPix() {
    if (!validarCamposEndereco()) return;

    const btn = document.getElementById('btn-confirmar-pix');
    if (btn) { btn.disabled = true; btn.querySelector('span').innerText = 'Gerando Pix...'; }

    const carrinho      = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
    const freteAtual    = parseFloat(localStorage.getItem('nutrirVida_frete')) || 0;
    const totalDinamico = parseFloat(localStorage.getItem('nutrirVida_total_dinamico'));

    const totalItensQtd = carrinho.reduce((acc, item) => acc + (parseInt(item.quantidade) || 0), 0);
    const itensParaMP   = carrinho.map(item => ({ ...item, preco: item.preco }));

    const pedidoData = {
        cliente_nome:           document.getElementById('nome-completo').value,
        cliente_email:          document.getElementById('email-checkout').value,
        whatsapp:               document.getElementById('whatsapp').value,
        endereco:               `${document.getElementById('logradouro').value}, ${document.getElementById('numero').value} - ${document.getElementById('bairro').value}`,
        itens:                  carrinho,
        total_itens_quantidade: totalItensQtd,
        total:                  totalDinamico,
        metodo_pagamento:       'pix',
        status_pagamento:       'Aguardando',
        status_pedido:          'Pendente'
    };

    try {
        const { data, error } = await _supabase.from('pedidos').insert([pedidoData]).select();
        if (error) throw new Error('Supabase: ' + error.message);

        const pedidoCriado = data[0];
        console.log('[Pix] Pedido Supabase ID:', pedidoCriado.id);

        const response = await fetch(`${SUPABASE_URL}/functions/v1/vendedor`, {
            method: 'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({
                tipo:    'pix',
                items:   itensParaMP,
                orderId: pedidoCriado.id,
                email:   pedidoData.cliente_email,
                frete:   freteAtual,
            })
        });

        const data2 = await response.json();
        console.log('[Pix] Resposta:', JSON.stringify(data2));

        if (data2.id) {
            const mp = new MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
            mp.checkout({ preference: { id: data2.id }, autoOpen: true });
            localStorage.removeItem('nutrirVida_cart');
        } else {
            throw new Error('Falha ao gerar preferência Pix: ' + JSON.stringify(data2));
        }

    } catch (err) {
        console.error('[Pix] Erro:', err.message);
        alert('Erro ao gerar Pix: ' + err.message);
        if (btn) { btn.disabled = false; btn.querySelector('span').innerText = 'CONFIRMAR E GERAR PIX'; }
    }
}

// =============================================
// 6. ALTERNA MÉTODO
// =============================================
function alternarMetodo(metodo) {
    const painelPix    = document.getElementById('painel-pix');
    const painelCartao = document.getElementById('painel-cartao');
    const { totalPix, totalCartao } = calcularTotais();

    if (metodo === 'pix') {
        painelPix?.classList.add('active');
        painelCartao?.classList.remove('active');
        destruirBrick();
        atualizarTotalCheckout();
        console.log('[Método] Pix | total:', totalPix);
    } else {
        painelCartao?.classList.add('active');
        painelPix?.classList.remove('active');
        atualizarTotalCheckout();
        console.log('[Método] Cartão | total:', totalCartao);
        renderPaymentBrick(totalCartao);
    }
}

// =============================================
// 7. INICIALIZAÇÃO
// =============================================
document.addEventListener('DOMContentLoaded', async () => {

    const nivel = await checarNivelAcesso();
    if (!nivel) { window.location.replace('login.html'); return; }

    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
        document.getElementById('nome-completo').value  = user.user_metadata?.full_name || '';
        document.getElementById('email-checkout').value = user.email || '';
        if (user.user_metadata?.telefone) {
            document.getElementById('whatsapp').value = user.user_metadata.telefone;
        }
    }

    const totalInicial = atualizarTotalCheckout();
    await renderPaymentBrick(totalInicial);

    document.querySelectorAll('input[name="metodo-pagamento"]').forEach(radio => {
        radio.addEventListener('change', () => alternarMetodo(radio.value));
    });

    const btnPix = document.getElementById('btn-confirmar-pix');
    if (btnPix) btnPix.addEventListener('click', processarPedidoPix);
});