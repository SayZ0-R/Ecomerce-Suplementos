// --- 1. TRAVA DE SEGURANÇA E INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', async () => {
    // Verifica se o usuário é o admin antes de mostrar a página
    const nivel = await checarNivelAcesso();

    if (nivel !== 'admin') {
        alert("Área restrita! Por favor, faça login como administrador.");
        window.location.href = 'login.html';
        return;
    }

    console.log("Acesso autorizado. Carregando dados do banco...");
    // Aqui você pode chamar sua função de listar produtos do Supabase no futuro
    // carregarProdutosDoBanco(); 
});

// --- 2. SUAS FUNÇÕES ORIGINAIS (SEM ALTERAÇÃO DE LÓGICA) ---

// Controle do Menu Mobile
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// Troca de Seções
function mostrarSecao(secaoId) {
    // Esconde seções
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    // Desativa botões menu
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));

    // Ativa os novos
    document.getElementById(`sec-${secaoId}`).classList.add('active');
    
    // Pequena correção: Garante que o event.currentTarget exista antes de usar classList
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    // Atualiza Título
    const titulos = {
        'dashboard': 'Painel de Controle',
        'produtos': 'Gerenciar Estoque',
        'pedidos': 'Pedidos Recebidos'
    };
    document.getElementById('secao-titulo').innerText = titulos[secaoId];

    // Fecha menu no mobile após clicar
    if (window.innerWidth <= 992) toggleMenu();
}

function abrirModalProduto() {
    document.getElementById('modal-produto').classList.add('active');
}

function fecharModalProduto() {
    document.getElementById('modal-produto').classList.remove('active');
    document.getElementById('form-produto').reset();
    document.getElementById('nome-arquivo').innerText = "Nenhuma imagem selecionada";
}

function mostrarNomeArquivo() {
    const input = document.getElementById('prod-imagem');
    const span = document.getElementById('nome-arquivo');
    if (input.files.length > 0) {
        span.innerText = input.files[0].name;
        span.style.color = "#00CC6D"; 
    } else {
        span.innerText = "Nenhuma imagem selecionada";
        span.style.color = "#888";
    }
}

// --- 3. NOVA FUNÇÃO DE LOGOUT ---
async function confirmarSair() {
    if (confirm("Deseja realmente sair do painel?")) {
        await deslogar(); // Função que está no seu database.js
    }
}