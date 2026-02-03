// Banco de dados temporário
const produtos = [
    { id: 1, nome: "Whey Protein Isolado Premium", categoria: "proteinas", preco: 49.99, precoAntigo: 59.99, imagem: "Imagens/Proteinas.png", avaliacao: 4.8, descricao: "O Whey Protein Premium oferece 24g de proteína por dose, ideal para recuperação muscular rápida.", nutricional: "Proteínas: 24g | Carbo: 2g | Gorduras: 1g", receitas: "Shake: Bata 1 scoop com 200ml de água gelada e uma banana." },
    { id: 2, nome: "Creatina Monohidratada", categoria: "creatina", preco: 24.99, precoAntigo: 34.99, imagem: "Imagens/Creatina.png", avaliacao: 4.9, descricao: "Creatina 100% pura para aumento de força e explosão muscular nos treinos intensos.", nutricional: "Creatina Monohidratada: 3g por dose.", receitas: "Consumir 3g ao dia, preferencialmente com uma fonte de carboidrato para melhor absorção." },
    { id: 3, nome: "BCAA 2:1:1 Complex", categoria: "bcaa", preco: 29.99, precoAntigo: 34.99, imagem: "Imagens/BCAA.png", avaliacao: 4.7, descricao: "Aminoácidos essenciais que auxiliam na redução da fadiga muscular pós-treino.", nutricional: "Leucina: 1g | Isoleucina: 0.5g | Valina: 0.5g", receitas: "Misture 5g em 300ml de água e consuma durante o treino." },
    { id: 4, nome: "Pré-Treino Explosion", categoria: "pre-treino", preco: 34.99, precoAntigo: 45.00, imagem: "Imagens/BCAA.png", avaliacao: 4.8, descricao: "Fórmula avançada com cafeína e beta-alanina para foco total e energia extrema.", nutricional: "Cafeína: 200mg | Beta-Alanina: 2g | Taurina: 1g", receitas: "Diluir 1 dose em 200ml de água 20 minutos antes do treino." },
    { id: 5, nome: "Multivitamínico A-Z", categoria: "vitaminas", preco: 19.99, precoAntigo: 29.99, imagem: "Imagens/Vitaminas.png", avaliacao: 4.7, descricao: "Complexo completo de vitaminas e minerais para fortalecer o sistema imunológico.", nutricional: "Vitaminas A, B, C, D, E e Minerais essenciais.", receitas: "Tomar 1 cápsula ao dia, preferencialmente após o almoço." },
    { id: 6, nome: "Coqueteleira Pro Shaker", categoria: "acessorios", preco: 15.00, precoAntigo: 25.00, imagem: "Imagens/Acessorios.png", avaliacao: 4.5, descricao: "Coqueteleira resistente com rede misturadora para shakes sem grumos.", nutricional: "Material Livre de BPA | Capacidade 600ml.", receitas: "Lavar com água morna e sabão neutro após o uso." }
];

// 1. Função de Renderização (Design Original Mantido)
function renderizarProdutosGrid(lista) {
    const grid = document.getElementById('grid-produtos');
    const contador = document.getElementById('contador-produtos');
    if (!grid) return;

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
                <div class="botoes-card">
                    <a href="produto.html?id=${p.id}" class="btn-saiba-mais">Saiba Mais</a>
                    <button class="btn-add-cart" onclick="prepararAdicao('${p.id}')">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    if (contador) contador.innerText = `${lista.length} produto(s) encontrado(s)`;
}

// 2. Filtro Unificado (Busca, Categoria e Preço)
function filtrar() {
    const busca = document.getElementById('input-busca')?.value.toLowerCase() || "";
    const categoria = document.querySelector('input[name="categoria"]:checked')?.value || "todos";
    
    const slider = document.getElementById('filtro-preco');
    const precoMax = slider ? parseFloat(slider.value) : 100;

    const valorPrecoTxt = document.getElementById('valor-preco');
    if (valorPrecoTxt) valorPrecoTxt.innerText = `R$ ${precoMax.toFixed(0)}`;

    const filtrados = produtos.filter(p => {
        const bateNome = p.nome.toLowerCase().includes(busca);
        const bateCategoria = categoria === 'todos' || p.categoria === categoria;
        const batePreco = p.preco <= precoMax;
        return bateNome && bateCategoria && batePreco;
    });

    renderizarProdutosGrid(filtrados);
}

// 3. Resetar Filtros
function resetarFiltros() {
    const inputBusca = document.getElementById('input-busca');
    if (inputBusca) inputBusca.value = "";

    const radioTodos = document.querySelector('input[name="categoria"][value="todos"]');
    if (radioTodos) radioTodos.checked = true;

    const sliderPreco = document.getElementById('filtro-preco');
    if (sliderPreco) {
        const maximo = sliderPreco.max || 100;
        sliderPreco.value = maximo;
    }

    filtrar();
}

// 4. Ponte para o Carrinho (CORRIGIDA)
function prepararAdicao(id) {
    const p = produtos.find(item => item.id == id);
    
    if (p && typeof adicionarAoCarrinho === 'function') {
        const produtoFormatado = {
            id: p.id,
            nome: p.nome,
            preco: p.preco,
            imagem: p.imagem,
            categoria: p.categoria, // <--- Aqui garante que a categoria real seja enviada
            quantidade: 1
        };
        adicionarAoCarrinho(produtoFormatado);
    }
}

// 5. Inicialização e Eventos
document.addEventListener('DOMContentLoaded', () => {
    renderizarProdutosGrid(produtos);
    
    const sliderPreco = document.getElementById('filtro-preco');
    
    sliderPreco?.addEventListener('input', filtrar);
    sliderPreco?.addEventListener('change', filtrar);

    document.getElementById('input-busca')?.addEventListener('input', filtrar);
    document.querySelectorAll('input[name="categoria"]').forEach(i => i.addEventListener('change', filtrar));

    document.getElementById('btn-resetar')?.addEventListener('click', resetarFiltros);

    const btnMobile = document.getElementById('btn-abrir-filtros');
    const sidebar = document.getElementById('sidebar');

    if (btnMobile && sidebar) {
        btnMobile.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            btnMobile.innerHTML = sidebar.classList.contains('active') 
                ? '<i class="fas fa-times"></i> Fechar Filtros' 
                : '<i class="fas fa-sliders-h"></i> Filtros';
        });
    }
});