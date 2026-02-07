document.addEventListener('DOMContentLoaded', async () => {
    // 1. Atualiza o valor total logo ao carregar
    atualizarTotalCheckout();

    const form = document.getElementById('form-checkout');
    const divCartao = document.getElementById('dados-cartao');

    // 2. Lógica para mostrar/esconder campos de cartão
    document.getElementsByName('metodo-pagamento').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'cartao') {
                divCartao.classList.remove('hidden');
            } else {
                divCartao.classList.add('hidden');
            }
        });
    });

    // 3. Evento de envio do formulário (Finalizar Compra)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Bloqueia o botão para evitar cliques duplos
        const btnFinalizar = form.querySelector('button[type="submit"]');
        btnFinalizar.innerText = "Processando...";
        btnFinalizar.disabled = true;

        // Pegar dados do localStorage
        const carrinho = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
        const frete = parseFloat(localStorage.getItem('nutrirVida_frete')) || 0;

        if (carrinho.length === 0) {
            alert("Seu carrinho está vazio!");
            window.location.href = 'index.html';
            return;
        }

        // Calcular total novamente por segurança
        const subtotal = carrinho.reduce((acc, item) => acc + (parseFloat(item.preco) * item.quantidade), 0);
        const totalGeral = subtotal + frete;

        // Montar o objeto do pedido para o Banco de Dados
        const pedido = {
            cliente_nome: document.getElementById('nome-completo').value,
            cliente_email: document.getElementById('email').value, // Certifique-se que o ID no HTML é 'email'
            whatsapp: document.getElementById('whatsapp').value,   // Certifique-se que o ID no HTML é 'whatsapp'
            endereco: `${document.getElementById('rua').value}, ${document.getElementById('numero').value} - ${localStorage.getItem('nutrirVida_bairro')}`,
            itens: carrinho, // O Supabase salva o array como JSON automaticamente
            subtotal: subtotal,
            frete: frete,
            total: totalGeral,
            metodo_pagamento: document.querySelector('input[name="metodo-pagamento"]:checked').value,
            status: 'Pendente',
            created_at: new Date().toISOString()
        };

        try {
            // --- ENVIO PARA O SUPABASE ---
            const { data, error } = await _supabase
                .from('pedidos')
                .insert([pedido]);

            if (error) throw error;

            // --- SUCESSO ---
            console.log("Pedido salvo no banco:", data);
            alert("Pedido enviado com sucesso! Aguarde nosso contato via WhatsApp.");

            // Limpeza pós-compra
            localStorage.removeItem('nutrirVida_cart');
            localStorage.removeItem('nutrirVida_frete');
            localStorage.removeItem('nutrirVida_bairro');
            
            window.location.href = 'index.html';

        } catch (error) {
            console.error("Erro ao salvar pedido:", error);
            alert("Erro ao processar pedido: " + error.message);
            btnFinalizar.innerText = "FINALIZAR COMPRA";
            btnFinalizar.disabled = false;
        }
    });
});

// Função para calcular e exibir o total na tela de checkout
function atualizarTotalCheckout() {
    const carrinho = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
    const campoTotal = document.getElementById('total-final-checkout');
    const freteSalvo = parseFloat(localStorage.getItem('nutrirVida_frete')) || 0;

    if (carrinho.length === 0) {
        if (campoTotal) campoTotal.innerText = "R$ 0,00";
        return;
    }

    const subtotalProdutos = carrinho.reduce((acc, item) => {
        return acc + (parseFloat(item.preco) * parseInt(item.quantidade));
    }, 0);

    const totalGeral = subtotalProdutos + freteSalvo;

    if (campoTotal) {
        campoTotal.innerText = `R$ ${totalGeral.toFixed(2).replace('.', ',')}`;
    }
}