document.addEventListener('DOMContentLoaded', () => {
    // --- MENU MOBILE ---
    const mobileMenu = document.getElementById("mobile-menu");
    const navList = document.querySelector(".nav-list");

    if (mobileMenu) {
        mobileMenu.onclick = function () {
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

    // --- BOTÃO IR PARA CHECKOUT (COM TRAVA DE FRETE) ---
    const btnCheckout = document.getElementById('btn-checkout');
    if (btnCheckout) {
        btnCheckout.addEventListener('click', () => {
            const carrinho = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
            const freteSalvo = localStorage.getItem('nutrirVida_frete'); // Verifica se o frete existe

            if (carrinho.length === 0) {
                alert("Seu carrinho está vazio!");
                window.location.href = 'Loja.html';
                return;
            }

            // --- A NOVA TRAVA AQUI ---
            if (freteSalvo === null || freteSalvo === undefined) {
                alert("Por favor, informe seu bairro para calcular o frete antes de continuar.");
                document.getElementById('bairro-input')?.focus(); // Dá foco no campo de bairro
                return;
            }

            // Se passou pelas duas travas, vai para o checkout
            window.location.href = 'checkout.html';
        });
    }

    // --- 3. NOVAS CONEXÕES (VINCULANDO O BANNER E OUTROS) ---
    // Chamamos a função do banner aqui para que o JS busque os dados do Supabase
    carregarBannerPromocional();

    // Mantemos as outras inicializações do seu sistema
    atualizarBadgeCarrinho();
    carregarPaginaProduto();

    if (document.getElementById('cart-list')) {
        carregarCarrinho();
    }

    // --- INICIALIZAÇÃO ---
    atualizarBadgeCarrinho();
    carregarPaginaProduto();

    // Inicia o carrinho se estiver na página dele
    if (document.getElementById('cart-list')) {
        carregarCarrinho();
    }

    carregarDestaquesMaisVendidos()
    if (document.getElementById('cart-list')) {
        carregarCarrinho();
    }

    async function carregarDestaquesMaisVendidos() {
        const container = document.getElementById('mais-vendidos-container');
        if (!container) return;

        try {
            // Busca os produtos marcados como mais_vendido
            const { data, error } = await _supabase
                .from('produtos')
                .select('*')
                .eq('mais_vendido', true)
                .limit(4);

            if (error) throw error;

            if (!data || data.length === 0) {
                container.innerHTML = "<p class='aviso-vazio'>Nenhuma oferta em destaque no momento.</p>";
                return;
            }

            // Limpa e Renderiza
            container.innerHTML = '';
            renderizarProdutos(data, 'mais-vendidos-container');

        } catch (e) {
            console.error("Erro ao carregar destaques:", e);
        }
    }

    // ESTE É O SEU NOVO MOLDE (TEMPLATE)
    function renderizarProdutos(produtos, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = produtos.map(p => `
        <article class="product-card">
            <div class="product-image">
                <img src="${p.imagem_url}" alt="${p.nome}">
            </div>
            <div class="product-info">
                <span class="product-category">${p.categoria || 'Suplementos'}</span>
                <h3 class="product-title">${p.nome}</h3>
                <div class="product-rating">
                    <span class="star">⭐</span>
                    <span class="rating-value">4.8</span>
                    <span class="reviews">(Novo)</span>
                </div>
                <div class="product-price-container">
                    <div class="prices">
                        ${p.preco_antigo ? `<span class="old-price">R$ ${Number(p.preco_antigo).toFixed(2).replace('.', ',')}</span>` : ''}
                        <span class="current-price">R$ ${Number(p.preco).toFixed(2).replace('.', ',')}</span>
                    </div>
                    <button class="btn-cart" onclick="adicionarAoCarrinho({id:'${p.id}', nome:'${p.nome}', preco:${p.preco}, imagem:'${p.imagem_url}'})">
                        <i class="cart-icon">🛒</i>
                    </button>
                </div>
            </div>
        </article>
    `).join('');
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
        if (input) input.value = bairroSalvo;
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
        if (!silencioso) alert("Bairro não encontrado na lista de entregas.");
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
    if (btnAtivo) btnAtivo.classList.add('active');

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

async function carregarBannerPromocional() {
    // 1. Elementos que vamos manipular
    const bannerImg = document.getElementById('banner-img-alvo');
    const bannerTitulo = document.getElementById('banner-titulo-alvo');
    const bannerDesc = document.getElementById('banner-desc-alvo');

    if (!bannerImg || !bannerTitulo || !bannerDesc) return;

    try {
        // 2. Busca o banner ativo no banco (chave 'banner_principal')
        const { data, error } = await _supabase
            .from('configuracoes_site')
            .select('*')
            .eq('chave', 'banner_principal')
            .single();

        if (error || !data) {
            console.warn("Usando banner padrão do HTML.");
            return;
        }

        // 3. VINCULAÇÃO DIRETA (A mágica acontece aqui)
        // Atualiza a Imagem com o tratamento de alta resolução que você pediu
        bannerImg.style.backgroundImage = `linear-gradient(to right, rgba(0,0,0,0.9), rgba(0,0,0,0.1)), url('${data.imagem_url}')`;
        bannerImg.style.imageRendering = "high-quality";

        // Atualiza o Título
        bannerTitulo.innerText = data.titulo;

        // Atualiza a Descrição + Preço (formatado em Real)
        const precoFormatado = parseFloat(data.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        bannerDesc.innerHTML = `${data.descricao} <br><strong>Por apenas ${precoFormatado}</strong>`;

    } catch (err) {
        console.error("Erro na vinculação do banner:", err);
    }
}





// Sobrescrevendo o alert nativo do navegador
window.alert = function (mensagem) {
    // 1. Criar o elemento na hora (ele passa a existir aqui)
    const notification = document.createElement('div');
    notification.className = 'custom-alert';
    notification.innerHTML = `
        <i class="fas fa-check-circle" style="color: #27ae60;"></i>
        <span>${mensagem}</span>
    `;

    // 2. Adicionar ao corpo do site
    document.body.appendChild(notification);

    // 3. Remover automaticamente após 3 segundos
    setTimeout(() => {
        notification.classList.add('hide');
        setTimeout(() => notification.remove(), 400);
    }, 3000);
};



