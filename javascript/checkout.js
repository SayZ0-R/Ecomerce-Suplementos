// =============================================
// CHECKOUT — NutrirVida
// Mercado Pago Payment Brick (Checkout Transparente)
// =============================================

const MP_PUBLIC_KEY = 'APP_USR-e053326e-4fdf-454d-8920-39cb31eb47c0';
const MAX_PARCELAS  = 4;

// Controlador do Brick — guardado para poder chamar .update() ao trocar método
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
    const { carrinho, frete, metodo, subtotalPix, subtotalCartao, totalPix, totalCartao, totalAtivo, economia } = calcularTotais();

    // --- Resumo de itens ---
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

    // --- Subtotal ---
    const elSubtotal = document.getElementById('resumo-subtotal');
    if (elSubtotal) {
        const sub = metodo === 'pix' ? subtotalPix : subtotalCartao;
        elSubtotal.innerText = `R$ ${sub.toFixed(2).replace('.', ',')}`;
    }

    // --- Frete ---
    const elFrete = document.getElementById('resumo-frete');
    if (elFrete) {
        elFrete.innerText     = frete === 0 ? 'Grátis' : `R$ ${frete.toFixed(2).replace('.', ',')}`;
        elFrete.style.color   = frete === 0 ? '#2ecc71' : '';
    }

    // --- Desconto Pix ---
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

    // --- Total ---
    const elTotal = document.getElementById('total-final-checkout');
    if (elTotal) {
        elTotal.innerText   = `R$ ${totalAtivo.toFixed(2).replace('.', ',')}`;
        elTotal.style.color = metodo === 'pix' ? '#2ecc71' : '#1a1a1a';
    }

    // Salva para uso no submit
    localStorage.setItem('nutrirVida_total_dinamico', totalAtivo.toFixed(2));

    return totalAtivo;
}

// =============================================
// 2. PAYMENT BRICK (CARTÃO)
// =============================================
async function renderPaymentBrick(totalInicial) {
    const container = document.getElementById('paymentBrick_container');
    if (!container) return;

    // Limpa tentativas falhas anteriores antes de criar uma nova
    container.innerHTML = '';

    // Limpa instância anterior se existir
    if (paymentBrickController) {
        try { await paymentBrickController.unmount(); } catch(e) {}
        paymentBrickController = null;
    }

    try {
        const mp           = new MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
        const bricksBuilder = mp.bricks();

        paymentBrickController = await bricksBuilder.create('payment', 'paymentBrick_container', {
            initialization: {
                amount: totalInicial,
                payer: {
                    email: document.getElementById('email-checkout')?.value || ''
                }
            },
            customization: {
                paymentMethods: {
                    creditCard: 'all',
                    debitCard:  'none',
                    ticket:     'none',
                    bankTransfer: 'none',
                    atm:        'none',
                    maxInstallments: MAX_PARCELAS,
                },
                visual: {
                    style: {
                        theme: 'default',
                        customVariables: {
                            baseColor:    '#2ecc71',
                            baseColorSecondary: '#27ae60',
                            fontFamily:   'DM Sans, sans-serif',
                            borderRadius: '8px',
                        }
                    },
                    hideFormTitle: true,
                    hidePaymentButton: false,
                }
            },
            callbacks: {
                onReady: () => {
                    console.log('Payment Brick pronto');
                },
                onError: (error) => {
                    console.error('Erro no Payment Brick:', error);
                },
                onSubmit: async ({ selectedPaymentMethod, formData }) => {
                    if (!validarCamposEndereco()) return;
                    await processarPedidoCartao(formData);
                }
            }
        });
    } catch (err) {
        console.error('Erro ao renderizar Payment Brick:', err);
        paymentBrickController = null;
        throw err;
    }
}

// =============================================
// 3. VALIDAÇÃO DE CAMPOS
// =============================================
function validarCamposEndereco() {
    const campos = ['nome-completo', 'whatsapp', 'logradouro', 'numero', 'bairro'];
    for (const id of campos) {
        const el = document.getElementById(id);
        if (!el || !el.value.trim()) {
            alert(`Por favor, preencha o campo: ${el?.placeholder || id}`);
            el?.focus();
            return false;
        }
    }
    return true;
}

// =============================================
// 4. PROCESSAR PEDIDO CARTÃO
// =============================================
async function processarPedidoCartao(formData) {
    const carrinho      = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
    const freteAtual    = parseFloat(localStorage.getItem('nutrirVida_frete')) || 0;
    const totalDinamico = parseFloat(localStorage.getItem('nutrirVida_total_dinamico'));
    const metodo        = 'cartao';

    const totalItensQtd = carrinho.reduce((acc, item) => acc + (parseInt(item.quantidade) || 0), 0);

    // Itens com preco_cartao para o banco
    const itensParaMP = carrinho.map(item => ({
        ...item,
        preco: item.preco_cartao ? item.preco_cartao : item.preco
    }));

    const pedidoData = {
        cliente_nome:          document.getElementById('nome-completo').value,
        cliente_email:         document.getElementById('email-checkout').value,
        whatsapp:              document.getElementById('whatsapp').value,
        endereco:              `${document.getElementById('logradouro').value}, ${document.getElementById('numero').value} - ${document.getElementById('bairro').value}`,
        itens:                 carrinho,
        total_itens_quantidade: totalItensQtd,
        total:                 totalDinamico,
        metodo_pagamento:      metodo,
        status_pagamento:      'Aguardando',
        status_pedido:         'Pendente'
    };

    try {
        // 1. Salva pedido no Supabase
        const { data, error } = await _supabase
            .from('pedidos')
            .insert([pedidoData])
            .select();

        if (error) throw error;

        const pedidoCriado = data[0];

        // 2. Envia para Edge Function com token do Brick
        const response = await fetch(`${SUPABASE_URL}/functions/v1/vendedor`, {
            method: 'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({
                tipo:             'cartao',
                orderId:          pedidoCriado.id,
                email:            pedidoData.cliente_email,
                frete:            freteAtual,
                items:            itensParaMP,
                // Dados do Brick — token tokenizado, nunca dados brutos
                token:            formData.token,
                installments:     Math.min(Number(formData.installments), MAX_PARCELAS),
                paymentMethodId:  formData.payment_method_id,
                issuerId:         formData.issuer_id,
                transactionAmount: totalDinamico,
            })
        });

        const result = await response.json();
        console.log('Resposta cartão:', result);

        if (result.status === 'approved' || result.status === 'in_process') {
            localStorage.removeItem('nutrirVida_cart');
            alert('Pedido confirmado! Você receberá um e-mail de confirmação.');
            window.location.href = 'perfil.html';
        } else {
            const msg = result.status_detail || result.error || 'Pagamento não aprovado. Verifique os dados do cartão.';
            throw new Error(msg);
        }

    } catch (err) {
        console.error('Erro ao processar cartão:', err);
        alert('Erro ao processar pagamento: ' + err.message);
    }
}

// =============================================
// 5. PROCESSAR PEDIDO PIX
// =============================================
async function processarPedidoPix() {
    if (!validarCamposEndereco()) return;

    const btn = document.getElementById('btn-confirmar-pix');
    if (btn) { btn.disabled = true; btn.querySelector('span').innerText = 'Gerando Pix...'; }

    const carrinho      = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
    const freteAtual    = parseFloat(localStorage.getItem('nutrirVida_frete')) || 0;
    const totalDinamico = parseFloat(localStorage.getItem('nutrirVida_total_dinamico'));
    const metodo        = 'pix';

    const totalItensQtd = carrinho.reduce((acc, item) => acc + (parseInt(item.quantidade) || 0), 0);

    // Pix usa preco normal (sem acréscimo de cartão)
    const itensParaMP = carrinho.map(item => ({ ...item, preco: item.preco }));

    const pedidoData = {
        cliente_nome:          document.getElementById('nome-completo').value,
        cliente_email:         document.getElementById('email-checkout').value,
        whatsapp:              document.getElementById('whatsapp').value,
        endereco:              `${document.getElementById('logradouro').value}, ${document.getElementById('numero').value} - ${document.getElementById('bairro').value}`,
        itens:                 carrinho,
        total_itens_quantidade: totalItensQtd,
        total:                 totalDinamico,
        metodo_pagamento:      metodo,
        status_pagamento:      'Aguardando',
        status_pedido:         'Pendente'
    };

    try {
        // 1. Salva pedido no Supabase
        const { data, error } = await _supabase
            .from('pedidos')
            .insert([pedidoData])
            .select();

        if (error) throw error;

        const pedidoCriado = data[0];
        alert('Pedido registrado! Redirecionando para o Pix...');

        // 2. Chama Edge Function para criar preferência Pix
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
                metodo:  metodo
            })
        });

        const data2 = await response.json();
        console.log('Resposta Pix:', data2);

        if (data2.id) {
            // Abre o Checkout Pro só para exibir o QR Code Pix
            const mp = new MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
            mp.checkout({ preference: { id: data2.id }, autoOpen: true });
            localStorage.removeItem('nutrirVida_cart');
        } else {
            throw new Error('Erro ao gerar preferência Pix: ' + JSON.stringify(data2));
        }

    } catch (err) {
        console.error('Erro Pix:', err);
        alert('Erro ao gerar Pix: ' + err.message);
        if (btn) { btn.disabled = false; btn.querySelector('span').innerText = 'CONFIRMAR E GERAR PIX'; }
    }
}

// =============================================
// 6. ALTERNA MÉTODO (PIX ↔ CARTÃO)
// =============================================
function alternarMetodo(metodo) {
    const painelPix    = document.getElementById('painel-pix');
    const painelCartao = document.getElementById('painel-cartao');

    // 1. Primeiro atualizamos os totais para saber o valor exato de cada método
    // O seu calcularTotais() já diferencia preco_cartao de preco (pix)
    const { totalPix, totalCartao } = calcularTotais(); 

    if (metodo === 'pix') {
        painelPix?.classList.add('active');
        painelCartao?.classList.remove('active');
        
        atualizarTotalCheckout(); 
        console.log('Método: Pix | Total com desconto:', totalPix);

    } else {
        // Garante que o painel cartão está ativo ANTES de render/update (SDK precisa do container visível)
        painelCartao?.classList.add('active');
        painelPix?.classList.remove('active');
        
        atualizarTotalCheckout();
        console.log('Método: Cartão | Total:', totalCartao);

        // LÓGICA DO BRICK (CARTÃO) — painel já está .active
        if (paymentBrickController) {
            // Se já existe, apenas atualizamos o valor para o preço de cartão
            paymentBrickController.update({ 
                amount: totalCartao 
            });
        } else {
            // Se não existe e o container está visível, renderiza
            renderPaymentBrick(totalCartao);
        }
    }
}

// =============================================
// 7. INICIALIZAÇÃO
// =============================================
document.addEventListener('DOMContentLoaded', async () => {

    // Trava de login
    const nivel = await checarNivelAcesso();
    if (!nivel) {
        window.location.replace('login.html');
        return;
    }

    // Preenche dados do usuário logado
    async function preencherDadosUsuario() {
        const { data: { user } } = await _supabase.auth.getUser();
        if (user) {
            document.getElementById('nome-completo').value = user.user_metadata.full_name || '';
            document.getElementById('email-checkout').value = user.email || '';
            if (user.user_metadata.telefone) {
                document.getElementById('whatsapp').value = user.user_metadata.telefone;
            }
        }
    }

    await preencherDadosUsuario();

    // Cálculo inicial (cartão é o padrão)
    const totalInicial = atualizarTotalCheckout();

    // Renderiza o Payment Brick com valor de cartão
    await renderPaymentBrick(totalInicial);

    // Eventos dos rádios de método
    document.querySelectorAll('input[name="metodo-pagamento"]').forEach(radio => {
        radio.addEventListener('change', () => {
            console.log('Método alterado para:', radio.value);
            alternarMetodo(radio.value);
        });
    });

    // Botão Pix
    const btnPix = document.getElementById('btn-confirmar-pix');
    if (btnPix) {
        btnPix.addEventListener('click', processarPedidoPix);
    }
});