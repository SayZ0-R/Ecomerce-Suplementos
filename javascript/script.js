document.addEventListener('DOMContentLoaded', () => {
    
    // --- MENU MOBILE ---
    // Selecionamos pelo ID que você adicionou
    const mobileMenu = document.getElementById("mobile-menu");
    const navList = document.querySelector(".nav-list");

    if (mobileMenu) {
        // Usamos .onclick para garantir que apenas um evento dispare
        mobileMenu.onclick = function() {
            // Alterna o X (Animação das linhas)
            this.classList.toggle('active');
            
            // Abre/Fecha o menu
            if (navList) {
                navList.classList.toggle('active');
            }
            
            // Log para você conferir no F12 se o clique está sendo registrado
            console.log("Status do menu:", this.classList.contains('active') ? "Aberto (X)" : "Fechado (≡)");
        };
    }

    // --- DROPDOWN PERFIL ---
    const profileIcon = document.querySelector('.profile-icon');
    const dropdown = document.querySelector('.profile-dropdown');
    
    if (profileIcon && dropdown) {
        profileIcon.onclick = (e) => {
            e.preventDefault();
            dropdown.classList.toggle('active');
        };

        document.addEventListener('click', (e) => {
            if (!profileIcon.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    }

    // --- INICIALIZAÇÃO ---
    atualizarBadgeCarrinho();
    carregarPaginaProduto();
});

// --- LÓGICA DO CARRINHO ---
function adicionarAoCarrinho(produto) {
    let carrinho = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
    const index = carrinho.findIndex(item => item.id === produto.id);

    if (index > -1) {
        carrinho[index].quantidade += 1;
    } else {
        carrinho.push({
            id: produto.id,
            nome: produto.nome,
            preco: produto.preco,
            imagem: produto.imagem,
            categoria: produto.categoria, 
            quantidade: 1
        });
    }

    localStorage.setItem('nutrirVida_cart', JSON.stringify(carrinho));
    atualizarBadgeCarrinho();
    alert(`${produto.nome} adicionado ao carrinho!`);
}

function atualizarBadgeCarrinho() {
    let carrinho = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
    const total = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
    const badge = document.getElementById('cart-count');
    if (badge) {
        badge.textContent = total;
        badge.style.display = total > 0 ? 'flex' : 'none';
    }
}

// --- PÁGINA DE PRODUTO ---
function carregarPaginaProduto() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (!id || typeof produtos === 'undefined') return;

    const p = produtos.find(item => item.id == id);
    if (p) {
        if(document.getElementById('detalhe-nome')) document.getElementById('detalhe-nome').innerText = p.nome;
        if(document.getElementById('detalhe-img')) document.getElementById('detalhe-img').src = p.imagem;
        if(document.getElementById('detalhe-preco-atual')) document.getElementById('detalhe-preco-atual').innerText = `R$ ${p.preco.toFixed(2)}`;
        if(document.getElementById('detalhe-preco-antigo')) document.getElementById('detalhe-preco-antigo').innerText = `R$ ${p.precoAntigo.toFixed(2)}`;
        if(document.getElementById('detalhe-rating')) document.getElementById('detalhe-rating').innerText = p.avaliacao;
        
        mudarAba('descricao');

        const btnComprar = document.getElementById('btn-comprar-detalhe');
        if (btnComprar) {
            btnComprar.onclick = () => {
                const qtdInput = document.getElementById('qtd-produto');
                const qtd = qtdInput ? parseInt(qtdInput.value) : 1;
                for(let i=0; i<qtd; i++) { 
                    adicionarAoCarrinho(p); 
                }
            };
        }
    }
}

function mudarAba(tipo) {
    const id = new URLSearchParams(window.location.search).get('id');
    if (typeof produtos === 'undefined') return;
    const p = produtos.find(item => item.id == id);
    const container = document.getElementById('conteudo-aba');
    if (!p || !container) return;

    document.querySelectorAll('.aba-item').forEach(btn => btn.classList.remove('active'));
    
    // Tenta encontrar o botão que foi clicado
    const btnAtivo = document.querySelector(`[onclick*="mudarAba('${tipo}')"]`) || event?.currentTarget;
    if(btnAtivo && btnAtivo.classList) btnAtivo.classList.add('active');

    if (tipo === 'descricao') container.innerText = p.descricao;
    if (tipo === 'nutricional') container.innerText = p.nutricional;
    if (tipo === 'receitas') container.innerText = p.receitas;
}