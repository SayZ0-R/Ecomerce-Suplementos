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
    event.currentTarget.classList.add('active');

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