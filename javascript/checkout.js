document.addEventListener('DOMContentLoaded', () => {
    atualizarTotalCheckout();

    const form = document.getElementById('form-checkout');
    const divCartao = document.getElementById('dados-cartao');

    // Mostra/Esconde campos de cartão
    document.getElementsByName('metodo-pagamento').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'cartao') divCartao.classList.remove('hidden');
            else divCartao.classList.add('hidden');
        });
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const pedido = {
            cliente: document.getElementById('nome-completo').value,
            itens: JSON.parse(localStorage.getItem('nutrirVida_cart')),
            frete: parseFloat(localStorage.getItem('nutrirVida_frete')),
            metodo: document.querySelector('input[name="metodo-pagamento"]:checked').value,
            data: new Date().toISOString()
        };

        console.log("Pedido finalizado:", pedido);
        alert("Pedido concluído com sucesso!");

        // --- LIMPEZA PÓS-COMPRA ---
        localStorage.removeItem('nutrirVida_cart');
        localStorage.removeItem('nutrirVida_frete');
        localStorage.removeItem('nutrirVida_bairro');
        
        window.location.href = 'index.html'; // Ou sucesso.html
    });
});

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