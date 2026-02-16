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
    // --- BOTÃO IR PARA CHECKOUT (COM TRAVA DE SEGURANÇA) ---
const btnCheckout = document.getElementById('btn-checkout');
if (btnCheckout) {
    btnCheckout.addEventListener('click', (e) => {
        const carrinho = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
        const selectBairro = document.getElementById('bairro-input');
        const freteSalvo = localStorage.getItem('nutrirVida_frete');

        // 1. Verifica se o carrinho está vazio
        if (carrinho.length === 0) {
            alert("Seu carrinho está vazio!");
            window.location.href = 'Loja.html';
            return;
        }

        // 2. Verifica se o Select está na opção padrão ("Selecione seu bairro")
        if (!selectBairro || selectBairro.value === "") {
            alert("⚠️ Por favor, selecione seu bairro para calcular o frete antes de continuar.");
            selectBairro.focus();
            selectBairro.style.borderColor = "red"; // Destaque visual de erro
            return;
        }

        // 3. Verifica se o frete foi gravado (garante que ele clicou ou o sistema calculou)
        if (freteSalvo === null || freteSalvo === undefined) {
            alert("⚠️ Erro no cálculo do frete. Por favor, selecione o bairro novamente.");
            return;
        }

        // Se passou em todas as travas, limpa o destaque de erro e segue
        selectBairro.style.borderColor = "#ddd";
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
                .limit(8);

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

    // ESTE É O SEU NOVO MOLDE (TEMPLATE) ATUALIZADO
    function renderizarProdutos(produtos, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = produtos.map(p => {
            // --- LÓGICA DE CÁLCULO PARA O CARTÃO ---
            const valorPix = Number(p.preco);
            const valorCartao = p.preco_cartao ? Number(p.preco_cartao) : valorPix;
            const parcelas = p.max_parcelas || 4;

            const pixFormatado = valorPix.toFixed(2).replace('.', ',');
            const cartaoFormatado = valorCartao.toFixed(2).replace('.', ',');

            return `
        <article class="product-card">
            <div class="product-image" onclick="window.location.href='produto.html?id=${p.id}'" style="cursor:pointer">
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
                        
                        <div class="price-pix-row">
                            <span class="current-price">R$ ${pixFormatado}</span>
                            <small class="pix-label">no Pix</small>
                        </div>

                        <div class="price-card-row">
                            <small class="card-details">Ou R$ ${cartaoFormatado} em até ${parcelas}x</small>
                        </div>
                    </div>
                    
                    <button class="btn-cart" onclick="adicionarAoCarrinho({id:'${p.id}', nome:'${p.nome}', preco:${p.preco}, preco_cartao:${valorCartao}, imagem:'${p.imagem_url}'})">
                        <i class="cart-icon">🛒</i>
                    </button>
                </div>
            </div>
        </article>
    `;
        }).join('');

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

    // --- LOGICA DE INICIALIZAÇÃO ---
    const freteSalvo = localStorage.getItem('nutrirVida_frete');
    
    // Se já tiver um frete calculado anteriormente, aplica. 
    // Se não, exibe o subtotal e deixa o frete zerado/vazio no display.
    if (freteSalvo !== null) {
        atualizarDisplays(subtotal, parseFloat(freteSalvo));
    } else {
        atualizarDisplays(subtotal, 0); 
        // Forçamos o texto "Selecione o bairro" no campo de frete se quiser ser mais claro
        const freteEl = document.getElementById('shipping-value');
        if (freteEl) freteEl.innerText = "Selecione o bairro";
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
    const avisoFrete = document.getElementById('aviso-frete-gratis');
    const selectBairro = document.getElementById('bairro-input');

    // 1. Descobrir qual o valor real do frete para o bairro selecionado
    let valorBairroOriginal = 0;
    if (selectBairro && selectBairro.selectedIndex > 0) {
        const option = selectBairro.options[selectBairro.selectedIndex];
        valorBairroOriginal = parseFloat(option.dataset.valor || 0);
    } else {
        // Se não houver bairro selecionado, tenta pegar o que estava no frete passado pela função
        valorBairroOriginal = frete;
    }

    // 2. REGRA DE OURO: Se subtotal >= 250, frete é 0. Se não, volta o valor original do bairro.
    let freteFinal = subtotal >= 250 ? 0 : valorBairroOriginal;

    // 3. Cálculo do Total Final
    const valorTotalCalculado = (subtotal + freteFinal).toFixed(2);

    // --- ATUALIZAÇÃO DA TELA ---
    if (subtotalEl) subtotalEl.innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    
    if (freteEl) {
        if (freteFinal === 0 && subtotal >= 250) {
            freteEl.innerText = "Grátis";
            freteEl.style.color = "#27ae60";
            freteEl.style.fontWeight = "bold";
        } else if (selectBairro && selectBairro.value === "") {
            freteEl.innerText = "Selecione o bairro";
            freteEl.style.color = "#666";
        } else {
            freteEl.innerText = `R$ ${freteFinal.toFixed(2).replace('.', ',')}`;
            freteEl.style.color = "#333";
            freteEl.style.fontWeight = "normal";
        }
    }

    if (totalEl) totalEl.innerText = `R$ ${valorTotalCalculado.replace('.', ',')}`;

    // Mensagem dinâmica de aviso
    if (avisoFrete) {
        if (subtotal >= 250) {
            avisoFrete.innerHTML = "🎉 Parabéns! Você ganhou <strong>Frete Grátis</strong>!";
            avisoFrete.className = "aviso-gratis-sucesso"; // Você pode estilizar no CSS
        } else {
            const falta = 250 - subtotal;
            avisoFrete.innerHTML = `Faltam <strong>R$ ${falta.toFixed(2).replace('.', ',')}</strong> para o Frete Grátis!`;
            avisoFrete.className = "aviso-gratis-falta";
        }
    }

    // Atualiza os dados no LocalStorage para o Checkout não ir com valor errado
    localStorage.setItem('nutrirVida_frete', freteFinal);
    localStorage.setItem('nutrirVida_total', valorTotalCalculado);
}


function alterarQuantidade(index, delta) {
    let carrinho = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
    carrinho[index].quantidade = parseInt(carrinho[index].quantidade) + delta;

    if (carrinho[index].quantidade < 1) {
        removerDoCarrinho(index);
    } else {
        localStorage.setItem('nutrirVida_cart', JSON.stringify(carrinho));
        // Recarrega o carrinho e por consequência os cálculos de frete grátis
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
    let carrinhoAtual = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
    const index = carrinhoAtual.findIndex(item => item.id === produto.id);
    const qtdAdicional = parseInt(produto.quantidade) || 1;

    if (index > -1) {
        carrinhoAtual[index].quantidade += qtdAdicional;
    } else {
        carrinhoAtual.push({
            id: produto.id,
            nome: produto.nome,
            preco: produto.preco,
            preco_cartao: produto.preco_cartao, // <--- ADICIONE ESTA LINHA
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
                        preco_cartao: p.preco_cartao, 
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
    const bannerImg = document.getElementById('banner-img-alvo');
    const bannerTitulo = document.getElementById('banner-titulo-alvo');
    const bannerDesc = document.getElementById('banner-desc-alvo');

    if (!bannerImg || !bannerTitulo || !bannerDesc) return;

    try {
        
        const { data, error } = await _supabase
            .from('configuracoes_site')
            .select('*')
            .eq('chave', 'banner_principal')
            .single();

        if (error || !data) return;

       
        const timestamp = Date.now();
        const urlComCacheBuster = `${data.imagem_url}?t=${timestamp}`;

        bannerImg.style.backgroundImage = `linear-gradient(to right, rgba(0,0,0,0.9), rgba(0,0,0,0.1)), url('${urlComCacheBuster}')`;
        bannerTitulo.innerText = data.titulo;

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

// Variável global para armazenar os fretes vindo do banco
let listaFretesBD = [];

async function carregarBairrosNoSelect() {
    const select = document.getElementById('bairro-input');
    
    try {
        const { data, error } = await _supabase
            .from('frete_bairros')
            .select('*')
            .order('bairro', { ascending: true });

        if (error) throw error;

        listaFretesBD = data; // Guarda para consulta rápida

        select.innerHTML = '<option value="">Selecione seu bairro...</option>';
        
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.bairro; // Nome do bairro
            // Guardamos o valor no atributo data para facilitar o cálculo
            option.dataset.valor = item.valor; 
            option.textContent = `${item.bairro} (R$ ${parseFloat(item.valor).toFixed(2).replace('.', ',')})`;
            select.appendChild(option);
        });

    } catch (error) {
        console.error("Erro ao carregar bairros:", error);
        select.innerHTML = '<option value="">Erro ao carregar fretes</option>';
    }
}

// Chame a função quando o DOM carregar
document.addEventListener('DOMContentLoaded', carregarBairrosNoSelect);

function atualizarValorFreteSelecionado() {
    const select = document.getElementById('bairro-input');
    const optionSelecionada = select.options[select.selectedIndex];
    
    if (!optionSelecionada || optionSelecionada.value === "") {
        alert("Por favor, selecione um bairro válido.");
        return;
    }

    // 1. Pega o valor original do frete do banco (que está no dataset)
    let valorFreteBase = parseFloat(optionSelecionada.dataset.valor || 0);
    
    // 2. Calcula o subtotal atual dos produtos
    const carrinho = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
    const subtotal = carrinho.reduce((acc, item) => acc + (parseFloat(item.preco) * parseInt(item.quantidade)), 0);

    // 3. REGRA DE FRETE GRÁTIS: Se subtotal >= 250, o valor do frete vira 0
    let valorFinalFrete = subtotal >= 250 ? 0 : valorFreteBase;

    // 4. Salva no LocalStorage
    localStorage.setItem('nutrirVida_frete', valorFinalFrete);
    localStorage.setItem('nutrirVida_bairro', optionSelecionada.value);

    // 5. Atualiza a tela
    atualizarDisplays(subtotal, valorFinalFrete);
    
    if (valorFinalFrete === 0 && subtotal >= 250) {
        alert("Parabéns! Você atingiu o valor para Frete Grátis.");
    } else {
        alert("Frete calculado com sucesso!");
    }
}

function exibirFreteNoCarrinho(valor) {
    const freteElemento = document.getElementById('cart-shipping'); // Ajuste para o seu ID
    if (freteElemento) {
        freteElemento.innerText = valor === 0 ? "Grátis" : `R$ ${valor.toFixed(2).replace('.', ',')}`;
    }
    atualizarTotalFinal(valor); // Soma o frete ao total dos produtos
}