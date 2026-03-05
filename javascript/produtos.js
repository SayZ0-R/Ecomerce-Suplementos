let produtosBanco = [];
let categoriasExistentes = [];

// 1. Carrega os produtos do Supabase
async function carregarLoja() {
    try {
        const { data, error } = await _supabase
            .from('produtos')
            .select('*')
            .order('nome', { ascending: true });

        if (error) throw error;

        produtosBanco = data;
        
        // Extrair categorias únicas
        categoriasExistentes = [...new Set(data.map(p => p.categoria))].filter(Boolean);

        renderizarFiltrosCategorias();
        filtrar(); 
    } catch (e) {
        console.error("Erro ao carregar loja:", e.message);
    }
}

// 2. Renderiza os filtros dinâmicos (Top 6 + Outras)
function renderizarFiltrosCategorias() {
    const container = document.getElementById('container-categorias-dinamicas');
    if (!container) return;

    const principais = categoriasExistentes.slice(0, 6);
    const outras = categoriasExistentes.slice(6);

    // Verifica se tem produtos em promoção para mostrar o filtro
    const temPromocao = produtosBanco.some(p => p.promocao);

    let html = `<label><input type="radio" name="categoria" value="todos" checked onchange="filtrar()"> Todas</label>`;

    if (temPromocao) {
        html += `<label><input type="radio" name="categoria" value="__promocao__" onchange="filtrar()">
             Promoções</label>`;
    }

    principais.forEach(cat => {
        html += `<label><input type="radio" name="categoria" value="${cat}" onchange="filtrar()"> ${cat}</label>`;
    });

    if (outras.length > 0) {
        html += `
            <div class="outras-categorias-box">
                <button type="button" class="btn-outras" onclick="document.getElementById('lista-outras').classList.toggle('show')">
                    Outras Categorias <i class="fas fa-chevron-down"></i>
                </button>
                <div id="lista-outras" class="lista-suspensa">
                    ${outras.map(cat => `
                        <label><input type="radio" name="categoria" value="${cat}" onchange="filtrar()"> ${cat}</label>
                    `).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

// 3. Filtra os produtos em tempo real
function filtrar() {
    const busca = document.getElementById('input-busca')?.value.toLowerCase() || "";
    const categoriaSelecionada = document.querySelector('input[name="categoria"]:checked')?.value || "todos";

    const precoMinVal = document.getElementById('filtro-preco-min')?.value;
    const precoMaxVal = document.getElementById('filtro-preco-max')?.value;
    const precoMin = precoMinVal !== '' && precoMinVal !== null ? parseFloat(precoMinVal) : 0;
    const precoMax = precoMaxVal !== '' && precoMaxVal !== null ? parseFloat(precoMaxVal) : Infinity;

    const filtrados = produtosBanco.filter(p => {
        const bateNome      = p.nome.toLowerCase().includes(busca);
        const bateCategoria = categoriaSelecionada === 'todos'
            || (categoriaSelecionada === '__promocao__' ? p.promocao === true : p.categoria === categoriaSelecionada);
        const batePreco     = p.preco >= precoMin && p.preco <= precoMax;
        return bateNome && bateCategoria && batePreco;
    });

    renderizarVitrine(filtrados);
}

// Limpa todos os filtros e volta ao estado inicial
function resetarFiltros() {
    const inputBusca = document.getElementById('input-busca');
    if (inputBusca) inputBusca.value = '';

    const radioTodos = document.querySelector('input[name="categoria"][value="todos"]');
    if (radioTodos) radioTodos.checked = true;

    const inputMin = document.getElementById('filtro-preco-min');
    const inputMax = document.getElementById('filtro-preco-max');
    if (inputMin) inputMin.value = '0';
    if (inputMax) inputMax.value = '';

    filtrar();
}

// 4. Renderiza a vitrine de produtos (ATUALIZADA COM PREÇO NO CARTÃO)
function renderizarVitrine(lista) {
    const grid = document.getElementById('grid-produtos');
    const contador = document.getElementById('contador-produtos');
    if (!grid) return;

    if (lista.length === 0) {
        grid.innerHTML = `<div class="vazio">Nenhum produto encontrado.</div>`;
        if (contador) contador.innerText = "0 produtos";
        return;
    }

    grid.innerHTML = lista.map(p => {
        // --- LOGICA DE PREÇO NO CARTÃO ---
        const valorPix = Number(p.preco);
        const valorCartao = p.preco_cartao ? Number(p.preco_cartao) : valorPix;
        const parcelas = p.max_parcelas || 4;
        
        const pixFormatado = valorPix.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const cartaoFormatado = valorCartao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        return `
        <div class="card-produto">
            <div class="imagem-link" onclick="window.location.href='produto.html?id=${p.id}'" style="cursor:pointer">
                <img src="${p.imagem_url || 'Imagens/placeholder.png'}" alt="${p.nome}">
            </div>
            <div class="card-info">
                <span class="categoria-label">${p.categoria}</span>
                <h3 onclick="window.location.href='produto.html?id=${p.id}'" style="cursor:pointer">${p.nome}</h3>
                <div class="rating"><i class="fas fa-star"></i> 4.8</div>
                
                <div class="preco-box">
                    ${p.preco_antigo ? `<span class="preco-antigo">R$ ${Number(p.preco_antigo).toFixed(2).replace('.', ',')}</span>` : ''}
                    
                    <div class="preco-pix-loja">
                        <span class="preco-atual">${pixFormatado}</span>
                        <small>no Pix</small>
                    </div>
                    
                    <div class="preco-cartao-loja">
                        <small>ou ${cartaoFormatado} em até ${parcelas}x</small>
                    </div>
                </div>

                <div class="botoes-card">
                    <a href="produto.html?id=${p.id}" class="btn-saiba-mais">Ver Detalhes</a>
                    <button class="btn-add-cart" onclick="adicionarAoCarrinhoRapido('${p.id}')">
                        <i class="fas fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        </div>
    `}).join('');

    if (contador) contador.innerText = `${lista.length} produto(s) encontrado(s)`;
}

// 5. FUNÇÃO DO CARRINHO (CORRIGIDA COM PREÇO CARTÃO)
function adicionarAoCarrinhoRapido(id) {
    // Busca o produto completo no array local
    const p = produtosBanco.find(item => item.id == id);

    if (!p) {
        console.error("Produto não encontrado!");
        return;
    }

    // Formata o objeto INCLUINDO o preco_cartao para o checkout entender a diferença
    const produtoParaCarrinho = {
        id: p.id,
        nome: p.nome,
        preco: p.preco, // Preço Pix
        preco_cartao: p.preco_cartao, // <--- ESTA LINHA FALTAVA!
        imagem: p.imagem_url,
        quantidade: 1
    };

    // Verifica se a função global de adicionar existe no script.js
    if (typeof adicionarAoCarrinho === 'function') {
        adicionarAoCarrinho(produtoParaCarrinho);
        
        // Feedback visual
        const btn = event.currentTarget;
        const icon = btn?.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-check';
            setTimeout(() => icon.className = 'fas fa-cart-plus', 2000);
        }
    } else {
        alert('Erro: Sistema de carrinho não carregado.');
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    carregarLoja();
    document.getElementById('input-busca')?.addEventListener('input', filtrar);
});

// Sobrescrevendo o alert nativo do navegador
window.alert = function(mensagem) {
    const notification = document.createElement('div');
    notification.className = 'custom-alert';

    const isCarrinho = mensagem.startsWith('__CARRINHO__');
    const isErro     = !isCarrinho && /erro|error|falha|inválido|vazio|preencha|não encontrado|por favor|selecione|atenção|obrigatório|recusado|cancelado|⚠/i.test(mensagem);
    const textoFinal = isCarrinho ? mensagem.replace('__CARRINHO__', '') : mensagem;

    const cor  = isErro ? '#e74c3c' : '#27ae60';
    const icon = isErro ? 'fas fa-times-circle' : 'fas fa-check-circle';

    notification.innerHTML = `
        <i class="${icon}" style="color:${cor};font-size:1.1rem;"></i>
        <span>${textoFinal}</span>
    `;
    notification.style.borderLeft = `4px solid ${cor}`;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('hide');
        setTimeout(() => notification.remove(), 400);
    }, 3000);
};


document.addEventListener('DOMContentLoaded', () => {
    const btnMobile = document.querySelector('.btn-mobile-filtros');
    const sidebar = document.querySelector('.sidebar-filtros');

    if (btnMobile && sidebar) {
        btnMobile.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            console.log("Sidebar lateral alternada");
        });
    }
});