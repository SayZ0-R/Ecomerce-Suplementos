// 1. Função utilitária (sempre disponível)
function atualizarTotalCheckout() {
    const total = localStorage.getItem('nutrirVida_total') || "0.00";
    const elementoTotal = document.getElementById('total-final-checkout');
    if (elementoTotal) {
        elementoTotal.innerText = `R$ ${parseFloat(total).toFixed(2).replace('.', ',')}`;
    }
}

// 2. Execução imediata para evitar "pulo" visual de valor zerado
atualizarTotalCheckout();

// 3. Bloco ÚNICO de inicialização
document.addEventListener('DOMContentLoaded', async () => {
    
    // --- SEGURANÇA: Verificação de Acesso ---
    const nivel = await checarNivelAcesso();
    if (!nivel) {
        alert("Faça login para finalizar sua compra.");
        window.location.replace('login.html');
        return;
    }

    // Garante que o total está certo após o DOM carregar
    atualizarTotalCheckout();

    const form = document.getElementById('form-checkout');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true; 
        btn.innerText = "Enviando...";

        const carrinho = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
        
        // Proteção contra envio de carrinho vazio
        if (carrinho.length === 0) {
            alert("Seu carrinho está vazio!");
            window.location.href = 'Loja.html';
            return;
        }

        const pedido = {
            cliente_nome: document.getElementById('nome-completo').value,
            cliente_email: document.getElementById('email').value,
            whatsapp: document.getElementById('whatsapp').value,
            endereco: `${document.getElementById('rua').value}, ${document.getElementById('numero').value}`,
            itens: carrinho,
            total: parseFloat(localStorage.getItem('nutrirVida_total')) || 0,
            status: 'Pendente'
        };

        try {
            const { error } = await _supabase.from('pedidos').insert([pedido]);
            
            if (!error) {
                alert("Pedido realizado com sucesso!");
                // Limpa apenas os dados do carrinho/checkout, preservando login se necessário
                localStorage.removeItem('nutrirVida_cart');
                localStorage.removeItem('nutrirVida_total');
                localStorage.removeItem('nutrirVida_frete');
                
                window.location.href = 'index.html';
            } else {
                throw error;
            }
        } catch (err) {
            alert("Erro ao processar pedido: " + err.message);
            btn.disabled = false;
            btn.innerText = "Finalizar Pedido";
        }
    });
});