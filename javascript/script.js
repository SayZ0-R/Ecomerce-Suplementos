document.addEventListener('DOMContentLoaded', () => {
    // --- MENU MOBILE ---
    const mobileMenu = document.getElementById("mobile-menu");
    const navList = document.querySelector(".nav-list");

    if (mobileMenu) {
        mobileMenu.onclick = function() {
            this.classList.toggle('active');
            if (navList) navList.classList.toggle('active');
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

    // --- BOTÃO IR PARA CHECKOUT ---
    const btnCheckout = document.getElementById('btn-checkout');
    if (btnCheckout) {
        btnCheckout.addEventListener('click', () => {
            const carrinho = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
            if (carrinho.length > 0) {
                window.location.href = 'checkout.html';
            } else {
                alert("Seu carrinho está vazio!");
                window.location.href = 'Loja.html';
            }
        });
    }

    // --- INICIALIZAÇÃO ---
    atualizarBadgeCarrinho();
    carregarPaginaProduto();
    
    // Inicia o carrinho se estiver na página dele
    if (document.getElementById('cart-list')) {
        carregarCarrinho();
    }
});

// --- LÓGICA DO CARRINHO (Desenhar Itens) ---
function carregarCarrinho() {
    const cartList = document.getElementById('cart-list');
    if (!cartList) return;

    let carrinho = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];

    if (carrinho.length === 0) {
        cartList.innerHTML = `<div style="text-align:center; padding: 50px;"><p>Seu carrinho está vazio.</p></div>`;
        atualizarDisplays(0, 0);
        return;
    }

    let subtotal = 0;
    cartList.innerHTML = carrinho.map((item, index) => {
        const totalItem = (parseFloat(item.preco) || 0) * (parseInt(item.quantidade) || 1);
        subtotal += totalItem;
        return `
            <div class="cart-item">
                <div class="item-product">
                    <img src="${item.imagem}" alt="${item.nome}">
                    <div class="item-info">
                        <h3>${item.nome}</h3>
                        <p style="font-size: 0.85rem; color: #666;">Categoria: <strong>${item.categoria || 'Geral'}</strong></p>
                    </div>
                </div>
                <div class="item-price">R$ ${parseFloat(item.preco).toFixed(2).replace('.', ',')}</div>
                <div class="item-quantity">
                    <button onclick="alterarQuantidade(${index}, -1)">-</button>
                    <input type="number" value="${item.quantidade}" readonly>
                    <button onclick="alterarQuantidade(${index}, 1)">+</button>
                </div>
                <div class="item-total">R$ ${totalItem.toFixed(2).replace('.', ',')}</div>
                <button class="btn-remove" onclick="removerDoCarrinho(${index})"><i class="fas fa-trash"></i></button>
            </div>`;
    }).join('');

    // Tenta recalcular frete se já houver bairro salvo
    const bairroSalvo = localStorage.getItem('nutrirVida_bairro');
    if (bairroSalvo) {
        const input = document.getElementById('bairro-input');
        if(input) input.value = bairroSalvo;
        calcularFretePorBairro(true); 
    } else {
        atualizarDisplays(subtotal, 0);
    }
}

// --- LÓGICA DO FRETE POR BAIRRO ---
function calcularFretePorBairro(silencioso = false) {
    const inputElement = document.getElementById('bairro-input');
    if (!inputElement) return;

    const inputBairro = inputElement.value.toLowerCase().trim();
    const carrinho = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
    const subtotal = carrinho.reduce((acc, item) => acc + (parseFloat(item.preco) * item.quantidade), 0);

    let valorFrete = -1;

    const grupo4 = ["canaã", "canaãzinho", "bethânia", "jardim vitória", "residencial bethânia"];
    const grupo7 = ["jardim panorama", "panorama", "caravelas", "veneza 1", "veneza 2", "centro", "cidade nobre", "parque das águas", "planalto 1", "planalto 2", "iguaçu"];
    const grupo9 = ["limoeiro", "bom jardim", "bairro das águas", "bela vista", "cariru"];

    if (grupo4.includes(inputBairro)) valorFrete = subtotal >= 200 ? 0 : 4.00;
    else if (grupo7.includes(inputBairro)) valorFrete = subtotal >= 250 ? 0 : 7.00;
    else if (grupo9.includes(inputBairro)) valorFrete = subtotal >= 250 ? 0 : 9.00;

    if (valorFrete !== -1) {
        localStorage.setItem('nutrirVida_frete', valorFrete);
        localStorage.setItem('nutrirVida_bairro', inputBairro);
        atualizarDisplays(subtotal, valorFrete);
        if (!silencioso) alert("Frete calculado com sucesso!");
    } else if (inputBairro !== "") {
        alert("Bairro não encontrado na lista de entregas.");
    }
}

// Auxiliar para atualizar valores na tela
function atualizarDisplays(subtotal, frete) {
    const subtotalEl = document.getElementById('subtotal');
    const freteEl = document.getElementById('shipping-value');
    const totalEl = document.getElementById('final-total');

    const valorTotalCalculado = (subtotal + frete).toFixed(2);

    if (subtotalEl) subtotalEl.innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    if (freteEl) freteEl.innerText = frete === 0 ? "Grátis" : `R$ ${frete.toFixed(2).replace('.', ',')}`;
    if (totalEl) totalEl.innerText = `R$ ${valorTotalCalculado.replace('.', ',')}`;

    // --- ESTA LINHA ABAIXO É A QUE FALTA ---
    // Salva o total como string (ex: "150.50") para o checkout ler
    localStorage.setItem('nutrirVida_total', valorTotalCalculado);
}

function alterarQuantidade(index, delta) {
    let carrinho = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
    carrinho[index].quantidade += delta;
    if (carrinho[index].quantidade < 1) {
        removerDoCarrinho(index);
    } else {
        localStorage.setItem('nutrirVida_cart', JSON.stringify(carrinho));
        carregarCarrinho();
        atualizarBadgeCarrinho();
    }
}

function removerDoCarrinho(index) {
    let carrinho = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
    carrinho.splice(index, 1);
    localStorage.setItem('nutrirVida_cart', JSON.stringify(carrinho));
    carregarCarrinho();
    atualizarBadgeCarrinho();
}

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

// --- PÁGINA DE PRODUTO & ABAS ---
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
                for(let i=0; i<qtd; i++) { adicionarAoCarrinho(p); }
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
    const btnAtivo = document.querySelector(`[onclick*="mudarAba('${tipo}')"]`);
    if(btnAtivo) btnAtivo.classList.add('active');

    if (tipo === 'descricao') container.innerText = p.descricao;
    if (tipo === 'nutricional') container.innerText = p.nutricional;
    if (tipo === 'receitas') container.innerText = p.receitas;
}


async function acessarPerfil() {
    const { data: { user }, error } = await _supabase.auth.getUser();

    if (error || !user) {
        // Se não estiver logado, manda para o login
        alert("Por favor, faça login para acessar seu perfil.");
        window.location.href = 'login.html';
    } else {
        // Se estiver logado, manda para a página de perfil
        window.location.href = 'perfil.html';
    }
}