const produtos = [
    { id: 1, nome: "Whey Protein Isolado Premium", categoria: "proteinas", preco: 49.99, precoAntigo: 59.99, imagem: "Imagens/Proteinas.png", avaliacao: 4.8, vendas: 2 },
    { id: 2, nome: "Creatina Monohidratada", categoria: "creatina", preco: 24.99, precoAntigo: 34.99, imagem: "Imagens/Creatina.png", avaliacao: 4.9, vendas: 1 },
    { id: 3, nome: "BCAA 2:1:1 Complex", categoria: "bcaa", preco: 29.99, precoAntigo: 34.99, imagem: "Imagens/BCAA.png", avaliacao: 4.7, vendas: 0 },
    { id: 4, nome: "Pré-Treino Explosion", categoria: "pre-treino", preco: 34.99, precoAntigo: 45.00, imagem: "Imagens/BCAA.png", avaliacao: 4.8, vendas: 1 },
    { id: 5, nome: "Multivitamínico A-Z", categoria: "vitaminas", preco: 19.99, precoAntigo: 29.99, imagem: "Imagens/Vitaminas.png", avaliacao: 4.7, vendas: 5 },
    { id: 6, nome: "Coqueteleira Pro Shaker", categoria: "acessorios", preco: 15.00, precoAntigo: 25.00, imagem: "Imagens/Acessorios.png", avaliacao: 4.5, vendas: 10 }
];

let totalProdutos = 0;

// Função para desenhar os produtos na tela
function renderizarProdutos() {
    const grid = document.getElementById('grid-produtos');
    grid.innerHTML = produtos.map(p => `
        <div class="card-produto">
            <img src="${p.imagem}" alt="${p.nome}">
            <div class="card-info">
                <span class="categoria-label">${p.categoria}</span>
                <h3>${p.nome}</h3>
                <div class="rating"><i class="fas fa-star"></i> ${p.avaliacao}</div>
                <div class="preco-box">
                    <span class="preco-antigo">R$ ${p.precoAntigo.toFixed(2)}</span>
                    <span class="preco-atual">R$ ${p.preco.toFixed(2)}</span>
                </div>
                <button class="btn-add-cart">
                    <i class="fas fa-shopping-cart"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Função que aumenta o contador
function adicionarAoCarrinho() {
    totalProdutos++;
    const badge = document.querySelector('.cart-badge');
    if (badge) {
        badge.textContent = totalProdutos;
        badge.style.display = 'flex'; // Mostra o verdinho
    }
}

// Evento de clique
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('btn-add-cart') || e.target.closest('.btn-add-cart')) {
        adicionarAoCarrinho();
    }
});

// Inicializa a vitrine ao carregar
renderizarProdutos();

function filtrar() {
    const termoBusca = document.getElementById('input-busca').value.toLowerCase();
    const categoriaSelecionada = document.querySelector('input[name="categoria"]:checked').value;

    const produtosFiltrados = produtos.filter(p => {
        const marcaNoTexto = p.nome.toLowerCase().includes(termoBusca);
        const marcaNaCategoria = categoriaSelecionada === 'todos' || p.categoria === categoriaSelecionada;
        return marcaNoTexto && marcaNaCategoria;
    });

    renderizarFiltrados(produtosFiltrados);
}

// Modifique a função que gera o HTML do card (renderizarProdutos ou renderizarFiltrados)
function renderizarFiltrados(lista) {
    const grid = document.getElementById('grid-produtos');
    const contador = document.getElementById('contador-produtos');
    
    if (contador) contador.innerText = `${lista.length} produtos encontrados`;
    
    grid.innerHTML = lista.map(p => `
        <div class="card-produto">
            <img src="${p.imagem}" alt="${p.nome}">
            <div class="card-info">
                <span class="categoria-label">${p.categoria}</span>
                <h3>${p.nome}</h3>
                <div class="rating"><i class="fas fa-star"></i> ${p.avaliacao}</div>
                <div class="preco-box">
                    <span class="preco-antigo">R$ ${p.precoAntigo.toFixed(2)}</span>
                    <span class="preco-atual">R$ ${p.preco.toFixed(2)}</span>
                </div>
                <button class="btn-add-cart" onclick="adicionarItem('${p.id}')">
                    <i class="fas fa-shopping-cart"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Função que serve de ponte entre a vitrine e o LocalStorage
function adicionarItem(id) {
    // Encontra o produto completo no seu array 'produtos' usando o ID
    const produtoSelected = produtos.find(p => p.id == id);
    if (produtoSelected) {
        // Chama a função global que estará no script.js
        adicionarAoCarrinho(produtoSelected);
    }
}

// Eventos para busca e filtro
document.getElementById('input-busca').addEventListener('input', filtrar);
document.querySelectorAll('input[name="categoria"]').forEach(input => {
    input.addEventListener('change', filtrar);
});

// Chamar ao carregar para mostrar tudo inicialmente
renderizarFiltrados(produtos);

function criarCardProduto(p) {
    return `
        <div class="card-produto">
            <img src="${p.imagem}" alt="${p.nome}">
            <div class="card-info">
                <span class="categoria-label">${p.categoria}</span>
                <h3>${p.nome}</h3>
                <div class="rating"><i class="fas fa-star"></i> ${p.avaliacao}</div>
                <div class="preco-box">
                    <span class="preco-antigo">R$ ${p.precoAntigo.toFixed(2)}</span>
                    <span class="preco-atual">R$ ${p.preco.toFixed(2)}</span>
                </div>
                
                <div class="botoes-card">
                    <a href="produto.html?id=${p.id}" class="btn-saiba-mais">Saiba Mais</a>
                    
                    <button class="btn-add-cart" onclick="adicionarItem('${p.id}')">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}