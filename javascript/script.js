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
            // CORREÇÃO: Unificado para usar 'nutrirVida_cart'
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

    // CORREÇÃO: Unificado para 'nutrirVida_cart'
    let carrinho = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];

    if (carrinho.length === 0) {
        cartList.innerHTML = `<div style="text-align:center; padding: 50px;"><p>Seu carrinho está vazio.</p></div>`;
        atualizarDisplays(0, 0);
        return;
    }

    let subtotal = 0;
    cartList.innerHTML = carrinho.map((item, index) => {
        // CORREÇÃO: Garantindo que quantidade seja Number para o cálculo de subtotal
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
    // CORREÇÃO: Unificado para 'nutrirVida_cart'
    const carrinho = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
    const subtotal = carrinho.reduce((acc, item) => acc + (parseFloat(item.preco) * parseInt(item.quantidade)), 0);

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
        if(!silencioso) alert("Bairro não encontrado na lista de entregas.");
    }
}

function atualizarDisplays(subtotal, frete) {
    const subtotalEl = document.getElementById('subtotal');
    const freteEl = document.getElementById('shipping-value');
    const totalEl = document.getElementById('final-total');

    const valorTotalCalculado = (subtotal + frete).toFixed(2);

    if (subtotalEl) subtotalEl.innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    if (freteEl) freteEl.innerText = frete === 0 ? "Grátis" : `R$ ${frete.toFixed(2).replace('.', ',')}`;
    if (totalEl) totalEl.innerText = `R$ ${valorTotalCalculado.replace('.', ',')}`;

    localStorage.setItem('nutrirVida_total', valorTotalCalculado);
}

function alterarQuantidade(index, delta) {
    let carrinho = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
    // CORREÇÃO: Garantindo soma aritmética
    carrinho[index].quantidade = parseInt(carrinho[index].quantidade) + delta;
    
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
    // CORREÇÃO: Lê sempre do storage no momento do clique para sincronizar abas
    let carrinhoAtual = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
    const index = carrinhoAtual.findIndex(item => item.id === produto.id);

    // CORREÇÃO: Pega a quantidade vinda do produto ou 1
    const qtdAdicional = parseInt(produto.quantidade) || 1;

    if (index > -1) {
        carrinhoAtual[index].quantidade = parseInt(carrinhoAtual[index].quantidade) + qtdAdicional;
    } else {
        carrinhoAtual.push({
            id: produto.id,
            nome: produto.nome,
            preco: produto.preco,
            imagem: produto.imagem,
            categoria: produto.categoria, 
            quantidade: qtdAdicional
        });
    }

    localStorage.setItem('nutrirVida_cart', JSON.stringify(carrinhoAtual));
    atualizarBadgeCarrinho();
    alert(`${produto.nome} adicionado ao carrinho!`);
}

function atualizarBadgeCarrinho() {
    // CORREÇÃO: Lê sempre do storage para o contador estar certo
    let carrinhoParaBadge = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
    const total = carrinhoParaBadge.reduce((acc, item) => acc + (parseInt(item.quantidade) || 0), 0);
    const badge = document.getElementById('cart-count');
    if (badge) {
        badge.textContent = total;
        badge.style.display = total > 0 ? 'flex' : 'none';
    }
}

// --- PÁGINA DE PRODUTO & ABAS (CORREÇÃO DO ALERTA DUPLO) ---
// --- PÁGINA DE PRODUTO & ABAS (VERSÃO CORRIGIDA PARA SUPABASE) ---
function carregarPaginaProduto() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (!id) return;

    // CORREÇÃO: Em vez de procurar no array "produtos" (que pode estar vazio),
    // vamos usar o produto que você já buscou do Supabase no script da página.
    // Usamos um pequeno intervalo para garantir que o Supabase já respondeu.
    setTimeout(() => {
        const p = window.produtoAtual; 
        
        if (p) {
            // Sincroniza a imagem (alguns bancos usam imagem_url, outros imagem)
            const imagemFinal = p.imagem_url || p.imagem;

            const btnComprar = document.getElementById('btn-comprar-detalhe');
            if (btnComprar) {
                btnComprar.onclick = null; 
                btnComprar.onclick = (e) => {
                    e.preventDefault();
                    e.stopImmediatePropagation();

                    const qtdInput = document.getElementById('qtd-produto');
                    const qtd = qtdInput ? parseInt(qtdInput.value) : 1;
                    
                    const pComQtd = {
                        id: p.id,
                        nome: p.nome,
                        preco: p.preco,
                        imagem: imagemFinal,
                        categoria: p.categoria,
                        quantidade: qtd
                    };

                    adicionarAoCarrinho(pComQtd);
                };
            }
        }
    }, 500); // Aguarda o carregamento do banco
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
        alert("Por favor, faça login para acessar seu perfil.");
        window.location.href = 'login.html';
    } else {
        window.location.href = 'perfil.html';
    }
}

async function carregarConteudoIndex() {
    await carregarBannerPromocional();
    await carregarDestaquesMaisVendidos();
}

async function carregarBannerPromocional() {
    const bannerContainer = document.getElementById('banner-dinamico');
    if (!bannerContainer) return;
    const { data, error } = await _supabase.from('configuracoes_site').select('*').eq('chave', 'banner_principal').single();
    if (error || !data) return;
    bannerContainer.innerHTML = `
        <div class="promo-banner" style="background-image: linear-gradient(to right, rgba(0,0,0,0.9), rgba(0,0,0,0.1)), url('${data.imagem_url}');">
            <div class="promo-content">
                <span class="promo-badge">OFERTA ESPECIAL</span>
                <h2 class="promo-title">${data.titulo}</h2>
                <p class="promo-subtitle">${data.descricao} - <strong>R$ ${parseFloat(data.preco).toFixed(2)}</strong></p>
                <a href="Loja.html" class="promo-button">Aproveitar Agora <i class="fas fa-arrow-right"></i></a>
            </div>
        </div>`;
}

async function carregarDestaquesMaisVendidos() {
    const vitrine = document.getElementById('vitrine-mais-vendidos');
    if (!vitrine) return;
    const { data: produtos, error } = await _supabase.from('produtos').select('*').eq('mais_vendido', true).limit(4);
    if (error || !produtos) return;
    vitrine.innerHTML = produtos.map(p => `
        <article class="product-card">
            <div class="product-image"><img src="${p.imagem_url}" alt="${p.nome}"></div>
            <div class="product-info">
                <span class="product-category">${p.categoria}</span>
                <h3 class="product-title">${p.nome}</h3>
                <div class="product-price-container">
                    <div class="prices">
                        ${p.preco_antigo ? `<span class="old-price">R$ ${p.preco_antigo.toFixed(2)}</span>` : ''}
                        <span class="current-price">R$ ${p.preco.toFixed(2)}</span>
                    </div>
                    <button class="btn-cart" onclick="adicionarAoCarrinho({id:'${p.id}', nome:'${p.nome}', preco:${p.preco}, imagem:'${p.imagem_url}', categoria:'${p.categoria}'})" aria-label="Adicionar ao carrinho">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                </div>
            </div>
        </article>`).join('');
}