document.addEventListener('DOMContentLoaded', () => {
    
    // --- NAVEGAÇÃO & MENU HAMBÚRGUER ---
    const mobileMenu = document.getElementById('mobile-menu') || document.querySelector(".mobile-menu");
    const navList = document.getElementById('nav-menu') || document.querySelector(".nav-list");

    if (mobileMenu && navList) {
        mobileMenu.addEventListener('click', () => {
            navList.classList.toggle('active');
            mobileMenu.classList.toggle('toggle');
            mobileMenu.classList.toggle('open');
            mobileMenu.classList.toggle('active');

            const expanded = navList.classList.contains('active');
            mobileMenu.setAttribute('aria-expanded', expanded);
        });

        document.querySelectorAll(".nav-list a, .nav-menu a").forEach(link => {
            link.addEventListener("click", () => {
                navList.classList.remove("active");
                mobileMenu.classList.remove("toggle");
                mobileMenu.classList.remove("open");
                mobileMenu.classList.remove("active");
            });
        });
    }

    // --- CONTROLE DO CARRINHO ---
    const cartBadge = document.getElementById('cart-count');
    const buyButtons = document.querySelectorAll('.btn-cart, .btn-add-cart');
    let cartItems = 0;

    if (buyButtons.length > 0 && cartBadge) {
        buyButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                cartItems++;
                cartBadge.innerText = cartItems;
                
                if (cartItems > 0) {
                    cartBadge.classList.add('active');
                }

                cartBadge.style.animation = 'none';
                cartBadge.offsetHeight; 
                cartBadge.style.animation = null; 
            });
        });
    }

    // --- FILTROS E SIDEBAR MOBILE (LOJA) ---
    const btnMobileFiltros = document.getElementById('btn-abrir-filtros');
    const sidebar = document.getElementById('sidebar');

    if (btnMobileFiltros && sidebar) {
        btnMobileFiltros.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            btnMobileFiltros.innerHTML = sidebar.classList.contains('active') 
                ? '<i class="fas fa-times"></i> Fechar Filtros' 
                : '<i class="fas fa-sliders-h"></i> Filtros';
        });
    }

    // --- LÓGICA DE PRODUTOS E FILTROS ---
    // Só executa se o grid de produtos existir na página
    const gridProdutos = document.getElementById('grid-produtos');
    if (gridProdutos) {
        
        function renderizarProdutos(lista) {
            const contador = document.getElementById('contador-produtos');
            
            gridProdutos.innerHTML = lista.map(p => `
                <div class="card-produto">
                    <img src="${p.imagem}" alt="${p.nome}">
                    <div class="card-info">
                        <span class="categoria-label">${p.categoria}</span>
                        <h3>${p.nome}</h3>
                        <div class="rating">
                            <i class="fas fa-star"></i> <span>${p.avaliacao} (Avaliações)</span>
                        </div>
                        <div class="preco-box">
                            <span class="preco-antigo">R$${(p.preco * 1.2).toFixed(2)}</span>
                            <span class="preco-atual">R$${p.preco.toFixed(2)}</span>
                        </div>
                        <button class="btn-add-cart"><i class="fas fa-shopping-cart"></i></button>
                    </div>
                </div>
            `).join('');
            
            if (contador) contador.innerText = `${lista.length} produto(s) encontrado(s)`;
        }

        function aplicarFiltros() {
            const catChecked = document.querySelector('input[name="categoria"]:checked');
            const filtroPreco = document.getElementById('filtro-preco');
            const valorPrecoTxt = document.getElementById('valor-preco');

            if (!catChecked || !filtroPreco) return;

            const catSelecionada = catChecked.value;
            const precoMaximo = filtroPreco.value;
            
            if (valorPrecoTxt) valorPrecoTxt.innerText = `R$${precoMaximo}`;

            const filtrados = produtos.filter(p => {
                const bateCategoria = catSelecionada === 'todos' || p.categoria === catSelecionada;
                const batePreco = p.preco <= precoMaximo;
                 bateCategoria && batePreco;
                return bateCategoria && batePreco;
            });

            renderizarProdutos(filtrados);
        }

        // Eventos de Filtro
        document.querySelectorAll('input[name="categoria"]').forEach(input => {
            input.addEventListener('change', aplicarFiltros);
        });

        const sliderPreco = document.getElementById('filtro-preco');
        if (sliderPreco) sliderPreco.addEventListener('input', aplicarFiltros);

        // Resetar Filtros
        const btnResetar = document.getElementById('btn-resetar');
        if (btnResetar) {
            btnResetar.addEventListener('click', () => {
                const radioTodos = document.querySelector('input[value="todos"]');
                if (radioTodos) radioTodos.checked = true;

                const slider = document.getElementById('filtro-preco');
                if (slider) {
                    slider.value = 100;
                    if (document.getElementById('valor-preco')) {
                        document.getElementById('valor-preco').innerText = `R$100`;
                    }
                }

                const busca = document.getElementById('input-busca');
                if (busca) busca.value = '';
                
                renderizarProdutos(produtos);
            });
        }

        // Inicialização inicial
        if (typeof produtos !== 'undefined') {
            renderizarProdutos(produtos);
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const profileIcon = document.querySelector('.profile-icon');
    const dropdown = document.querySelector('.profile-dropdown');

    // 1. Abre/Fecha ao clicar no ícone
    profileIcon.addEventListener('click', (e) => {
        e.preventDefault(); // Evita que o link '#' recarregue a página
        dropdown.classList.toggle('active');
    });

    // 2. Fecha ao clicar fora do menu
    document.addEventListener('click', (e) => {
        // Se o clique NÃO for no ícone e NÃO for dentro do menu aberto
        if (!profileIcon.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
});