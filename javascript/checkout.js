// 1. A FUNÇÃO DE CÁLCULO INTELIGENTE
function atualizarTotalCheckout() {
    // Puxa os produtos que estão no carrinho
    const carrinho = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
    // Puxa o frete (caso tenha sido calculado)
    const frete = parseFloat(localStorage.getItem('nutrirVida_frete')) || 0;
    
    // Verifica qual método está selecionado (usando o name="metodo-pagamento" do seu HTML)
    const metodoInput = document.querySelector('input[name="metodo-pagamento"]:checked');
    const metodoSelecionado = metodoInput ? metodoInput.value : 'pix';
    
    const elementoTotal = document.getElementById('total-final-checkout');
    const containerParcelas = document.getElementById('parcelamento-container');

    let subtotalGeral = 0;

    carrinho.forEach(item => {
        // A MÁGICA ACONTECE AQUI:
        // Se for cartão, ele tenta usar o preco_cartao. 
        // Se não existir o campo preco_cartao no item, ele usa o preco (pix) como segurança.
        let precoParaCalculo;
        
        if (metodoSelecionado === 'cartao') {
            precoParaCalculo = item.preco_cartao ? parseFloat(item.preco_cartao) : parseFloat(item.preco);
        } else {
            precoParaCalculo = parseFloat(item.preco);
        }

        subtotalGeral += precoParaCalculo * item.quantidade;
    });

    const totalFinal = subtotalGeral + frete;

    // Atualiza o valor no resumo da compra (HTML)
    if (elementoTotal) {
        elementoTotal.innerText = `R$ ${totalFinal.toFixed(2).replace('.', ',')}`;
    }

    // Gerencia o seletor de parcelas
    if (metodoSelecionado === 'cartao') {
        containerParcelas.style.display = 'block';
        gerarOpcoesParcelas(totalFinal);
    } else {
        containerParcelas.style.display = 'none';
    }

    // Salva esse total dinâmico para ser usado no fechamento do pedido
    localStorage.setItem('nutrirVida_total_dinamico', totalFinal.toFixed(2));
}

// 2. FUNÇÃO PARA GERAR O TEXTO DAS PARCELAS
function gerarOpcoesParcelas(total) {
    const select = document.getElementById('select-parcelas');
    if (!select) return;
    
    select.innerHTML = '';
    // Gera de 1x até 12x (você pode diminuir o limite se quiser)
    for (let i = 1; i <= 12; i++) {
        const valorParcela = total / i;
        const option = document.createElement('option');
        option.value = i;
        option.text = `${i}x de R$ ${valorParcela.toFixed(2).replace('.', ',')}`;
        select.appendChild(option);
    }
}

// 3. INICIALIZAÇÃO E EVENTOS
document.addEventListener('DOMContentLoaded', async () => {
    // Sua trava de segurança de login
    const nivel = await checarNivelAcesso();
    if (!nivel) {
        window.location.replace('login.html');
        return;
    }

    // Adiciona o evento "change" em todos os botões de rádio de pagamento
    const radiosPagamento = document.querySelectorAll('input[name="metodo-pagamento"]');
    radiosPagamento.forEach(radio => {
        radio.addEventListener('change', () => {
            console.log("Método alterado para:", radio.value);
            atualizarTotalCheckout();
        });
    });

    // Roda o cálculo pela primeira vez ao abrir a página
    atualizarTotalCheckout();

    // Lógica do botão Finalizar (Submit)
    const form = document.getElementById('form-checkout');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerText = "Processando...";

            const pedido = {
                cliente_nome: document.getElementById('nome-completo').value,
                cliente_email: document.getElementById('email').value,
                whatsapp: document.getElementById('whatsapp').value,
                endereco: `${document.getElementById('rua').value}, ${document.getElementById('numero').value}`,
                itens: JSON.parse(localStorage.getItem('nutrirVida_cart')),
                total: parseFloat(localStorage.getItem('nutrirVida_total_dinamico')),
                metodo_pagamento: document.querySelector('input[name="metodo-pagamento"]:checked').value,
                parcelas: document.getElementById('select-parcelas')?.value || 1,
                status: 'Pendente'
            };

            try {
                const { error } = await _supabase.from('pedidos').insert([pedido]);
                if (!error) {
                    alert("Pedido recebido com sucesso!");
                    localStorage.removeItem('nutrirVida_cart');
                    window.location.href = 'index.html';
                } else { throw error; }
            } catch (err) {
                alert("Erro ao salvar pedido: " + err.message);
                btn.disabled = false;
                btn.innerText = "Finalizar Pedido";
            }
        });
    }
});