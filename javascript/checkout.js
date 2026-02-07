document.addEventListener('DOMContentLoaded', async () => {
    // --- TRAVA DE SEGURANÇA CHECKOUT ---
    const nivel = await checarNivelAcesso();
    if (!nivel) {
        alert("Faça login para finalizar sua compra.");
        window.location.replace('login.html');
        return;
    }

    atualizarTotalCheckout();
    const form = document.getElementById('form-checkout');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true; btn.innerText = "Enviando...";

        const carrinho = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
        const pedido = {
            cliente_nome: document.getElementById('nome-completo').value,
            cliente_email: document.getElementById('email').value,
            whatsapp: document.getElementById('whatsapp').value,
            endereco: `${document.getElementById('rua').value}, ${document.getElementById('numero').value}`,
            itens: carrinho,
            total: parseFloat(localStorage.getItem('nutrirVida_total')) || 0,
            status: 'Pendente'
        };

        const { error } = await _supabase.from('pedidos').insert([pedido]);
        if (!error) {
            alert("Pedido realizado!");
            localStorage.clear();
            window.location.href = 'index.html';
        } else {
            alert("Erro: " + error.message);
            btn.disabled = false;
        }
    });
});

// 1. Defina a função fora do DOMContentLoaded para estar disponível
function atualizarTotalCheckout() {
    const total = localStorage.getItem('nutrirVida_total') || "0.00";
    const elementoTotal = document.getElementById('total-final-checkout');
    if (elementoTotal) {
        elementoTotal.innerText = `R$ ${parseFloat(total).toFixed(2).replace('.', ',')}`;
    }
}

// 2. Chame ela IMEDIATAMENTE no início do carregamento
atualizarTotalCheckout();

document.addEventListener('DOMContentLoaded', async () => {
    // 3. Depois você faz as verificações lentas (Supabase/Segurança)
    const nivel = await checarNivelAcesso();
    // ... restante do código
});