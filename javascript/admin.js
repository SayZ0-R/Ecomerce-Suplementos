// --- 1. TRAVA DE SEGURANÇA E INICIALIZAÇÃO ---
async function validarAdmin() {
    const nivel = await checarNivelAcesso();
    if (nivel !== 'admin') {
        alert("Acesso negado! Esta área é apenas para administradores.");
        window.location.replace('login.html');
        return;
    }

    identificarAdmin();
    carregarCategoriasNoSelect();
    carregarProdutosDoBanco();
    carregarPedidosAdmin();
    carregarDadosBanner(); 
}

async function identificarAdmin() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user && user.user_metadata) {
        const nomeCompleto = user.user_metadata.full_name || "Administrador";
        const adminNameElement = document.querySelector('.admin-name strong');
        const avatarElement = document.querySelector('.avatar');
        
        if (adminNameElement) adminNameElement.innerText = nomeCompleto;
        if (avatarElement) avatarElement.innerText = nomeCompleto.charAt(0).toUpperCase();
    }
}

document.addEventListener('DOMContentLoaded', validarAdmin);

// --- 2. NAVEGAÇÃO ENTRE ABAS ---
function mostrarSecao(secaoId) {
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));

    const menuAlvo = document.querySelector(`[onclick="mostrarSecao('${secaoId}')"]`);
    if (menuAlvo) menuAlvo.classList.add('active');

    const secaoAlvo = document.getElementById(`sec-${secaoId}`);
    if (secaoAlvo) secaoAlvo.classList.add('active');

    const titulos = {
        'dashboard': 'Painel de Controle',
        'produtos': 'Gerenciar Estoque',
        'pedidos': 'Pedidos Recebidos',
        'banners': 'Configuração de Banner'
    };
    document.getElementById('secao-titulo').innerText = titulos[secaoId] || 'Admin';
}

// --- 3. GESTÃO DE CATEGORIAS ---
async function carregarCategoriasNoSelect() {
    const { data, error } = await _supabase.from('categorias').select('*').order('nome');
    if (data) {
        const select = document.getElementById('prod-categoria');
        select.innerHTML = data.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
    }
}

function abrirModalCategoria() { document.getElementById('modal-categoria').classList.add('active'); }
function fecharModalCategoria() { document.getElementById('modal-categoria').classList.remove('active'); }

async function salvarNovaCategoria() {
    const nome = document.getElementById('novo-nome-cat').value;
    if (!nome) return alert("Digite um nome!");

    const { error } = await _supabase.from('categorias').insert([{ nome: nome }]);

    if (error) {
        alert("Erro: Categoria já existe ou falha no banco.");
    } else {
        alert("Categoria adicionada!");
        document.getElementById('novo-nome-cat').value = "";
        fecharModalCategoria();
        carregarCategoriasNoSelect(); 
    }
}

// --- 4. GESTÃO DE PRODUTOS (COM EDIÇÃO E ESTOQUE) ---

// Abre o modal preenchido para edição
async function editarProduto(id) {
    const { data: p, error } = await _supabase.from('produtos').select('*').eq('id', id).single();
    if (error) return alert("Erro ao carregar produto");

    // Preenche os campos do formulário
    document.getElementById('prod-id').value = p.id;
    document.getElementById('prod-nome').value = p.nome;
    document.getElementById('prod-categoria').value = p.categoria;
    document.getElementById('prod-estoque').value = p.estoque || 0;
    document.getElementById('prod-preco').value = p.preco;
    document.getElementById('prod-preco-antigo').value = p.preco_antigo || "";
    document.getElementById('prod-descricao').value = p.descricao || "";
    document.getElementById('prod-mais-vendido').checked = p.mais_vendido;
    document.getElementById('prod-promocao').checked = p.promocao;
    
    // Ajustes visuais do modal
    document.getElementById('modal-titulo').innerText = "Editar Produto";
    document.getElementById('aviso-imagem').style.display = "block";
    document.getElementById('prod-file-name').innerText = "Alterar Foto (Opcional)";
    
    abrirModalProduto();
}

async function salvarProduto(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-submit-prod');
    const idExistente = document.getElementById('prod-id').value;
    const inputArquivo = document.getElementById('prod-upload');
    const arquivo = inputArquivo.files[0];

    btn.innerText = "Processando..."; btn.disabled = true;

    try {
        let urlFinal = null;

        // Se houver um novo arquivo, faz o upload
        if (arquivo) {
            const nomeArq = `${Date.now()}_${arquivo.name.replace(/\s/g, '_')}`;
            const { error: errImg } = await _supabase.storage.from('produtos').upload(`fotos/${nomeArq}`, arquivo);
            if (errImg) throw errImg;
            urlFinal = _supabase.storage.from('produtos').getPublicUrl(`fotos/${nomeArq}`).data.publicUrl;
        }

        const dados = {
            nome: document.getElementById('prod-nome').value,
            preco: parseFloat(document.getElementById('prod-preco').value),
            preco_antigo: document.getElementById('prod-preco-antigo').value ? parseFloat(document.getElementById('prod-preco-antigo').value) : null,
            descricao: document.getElementById('prod-descricao').value,
            categoria: document.getElementById('prod-categoria').value,
            estoque: parseInt(document.getElementById('prod-estoque').value),
            mais_vendido: document.getElementById('prod-mais-vendido').checked,
            promocao: document.getElementById('prod-promocao').checked
        };

        if (urlFinal) dados.imagem_url = urlFinal;

        let erro;
        if (idExistente) {
            // Lógica de UPDATE
            const { error } = await _supabase.from('produtos').update(dados).eq('id', idExistente);
            erro = error;
        } else {
            // Lógica de INSERT (Novo produto exige imagem)
            if (!urlFinal) throw new Error("A imagem é obrigatória para novos produtos!");
            const { error } = await _supabase.from('produtos').insert([dados]);
            erro = error;
        }

        if (erro) throw erro;

        alert(idExistente ? "Produto atualizado!" : "Produto cadastrado!");
        fecharModalProduto();
        carregarProdutosDoBanco();
    } catch (e) { 
        alert("Erro: " + e.message); 
    } finally { 
        btn.innerText = "Salvar Produto"; btn.disabled = false; 
    }
}

async function carregarProdutosDoBanco() {
    const lista = document.getElementById('lista-produtos-admin');
    if (!lista) return;
    const { data, error } = await _supabase.from('produtos').select('*').order('id', { ascending: false });
    if (error) return;

    lista.innerHTML = data.map(p => `
        <tr>
            <td>
                <div style="display:flex; align-items:center; gap:10px">
                    <img src="${p.imagem_url}" width="35" height="35" style="border-radius:5px; object-fit:cover;">
                    <span>${p.nome} ${p.mais_vendido ? '<span class="badge-destaque">★</span>' : ''}</span>
                </div>
            </td>
            <td>R$ ${p.preco.toFixed(2)}</td>
            <td><strong>${p.estoque || 0}</strong> un.</td>
            <td>
                <span class="status-badge ${p.estoque > 0 ? 'status-aprovado' : 'status-pendente'}">
                    ${p.estoque > 0 ? 'Em Estoque' : 'Esgotado'}
                </span>
            </td>
            <td>
                <button onclick="editarProduto(${p.id})" style="color:blue; border:none; background:none; cursor:pointer; margin-right:12px; font-size:16px">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deletarProduto(${p.id})" style="color:red; border:none; background:none; cursor:pointer; font-size:16px">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// --- 5. GESTÃO DE PEDIDOS ---
async function carregarPedidosAdmin() {
    const lista = document.getElementById('lista-pedidos-admin');
    if (!lista) return;
    const { data, error } = await _supabase.from('pedidos').select('*').order('created_at', { ascending: false });
    if (error) return;

    lista.innerHTML = data.map(p => `
        <tr>
            <td>${new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
            <td>${p.cliente_nome || 'Cliente'}</td>
            <td>R$ ${parseFloat(p.total).toFixed(2)}</td>
            <td>
                <select class="status-select" onchange="atualizarStatusPedido(${p.id}, this.value)">
                    <option value="Pendente" ${p.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                    <option value="Aprovado" ${p.status === 'Aprovado' ? 'selected' : ''}>Aprovado</option>
                    <option value="Enviado" ${p.status === 'Enviado' ? 'selected' : ''}>Enviado</option>
                </select>
            </td>
            <td>${criarBotaoWhats(p)}</td>
        </tr>
    `).join('');
}

function criarBotaoWhats(p) {
    const msg = `Olá ${p.cliente_nome}, seu pedido #${p.id} foi atualizado!`;
    const tel = p.cliente_telefone ? p.cliente_telefone.replace(/\D/g, "") : "";
    return `<button class="btn-whats" onclick="window.open('https://wa.me/55${tel}?text=${encodeURIComponent(msg)}', '_blank')"><i class="fab fa-whatsapp"></i></button>`;
}

async function atualizarStatusPedido(id, novoStatus) {
    const { error } = await _supabase
        .from('pedidos')
        .update({ status: novoStatus })
        .eq('id', id);

    if (error) {
        alert("Erro ao atualizar status: " + error.message);
    } else {
        // Se aprovou, recarrega os produtos para ver o estoque novo na aba de produtos
        carregarProdutosDoBanco(); 
        alert(`Pedido #${id} atualizado para ${novoStatus}!`);
    }
}

// --- 6. BANNER ---
async function atualizarBanner(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button');
    btn.innerText = "Processando..."; btn.disabled = true;

    try {
        const titulo = document.getElementById('banner-titulo').value;
        const preco = document.getElementById('banner-preco').value;
        const desc = document.getElementById('banner-desc').value;
        const arquivo = document.getElementById('banner-upload').files[0];

        let urlFinal = null;
        if (arquivo) {
            const nomeArq = `banner_${Date.now()}`;
            await _supabase.storage.from('produtos').upload(`banners/${nomeArq}`, arquivo);
            urlFinal = _supabase.storage.from('produtos').getPublicUrl(`banners/${nomeArq}`).data.publicUrl;
        }

        const dados = { id: 1, chave: 'banner_principal', titulo, preco: parseFloat(preco), descricao: desc };
        if (urlFinal) dados.imagem_url = urlFinal;

        await _supabase.from('configuracoes_site').upsert([dados]);
        alert("Banner atualizado!");
    } catch (e) { alert("Erro: " + e.message); }
    finally { btn.innerText = "Atualizar Banner"; btn.disabled = false; }
}

async function carregarDadosBanner() {
    const { data } = await _supabase.from('configuracoes_site').select('*').eq('chave', 'banner_principal').single();
    if (data) {
        document.getElementById('banner-titulo').value = data.titulo || "";
        document.getElementById('banner-preco').value = data.preco || "";
        document.getElementById('banner-desc').value = data.descricao || "";
    }
}

// --- 7. UTILITÁRIOS ATUALIZADOS ---
function abrirModalProduto() { 
    document.getElementById('modal-produto').classList.add('active'); 
}

function fecharModalProduto() { 
    document.getElementById('modal-produto').classList.remove('active'); 
    document.getElementById('form-produto').reset(); 
    document.getElementById('prod-id').value = ""; // Limpa o ID para não editar o errado depois
    document.getElementById('modal-titulo').innerText = "Configurar Produto";
    document.getElementById('aviso-imagem').style.display = "none";
    document.getElementById('prod-file-name').innerText = "Escolher Foto do Produto";
}

async function deletarProduto(id) {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    const { error } = await _supabase.from('produtos').delete().eq('id', id);
    if (error) alert("Erro ao deletar");
    else carregarProdutosDoBanco();
}

function toggleMenu() {
    // Alterna a classe 'active' na sidebar e no fundo escuro
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('sidebar-overlay').classList.toggle('active');
}

// Melhore sua função de mostrar seção para fechar o menu no mobile ao clicar
function mostrarSecao(secaoId) {
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));

    const menuAlvo = document.querySelector(`[onclick="mostrarSecao('${secaoId}')"]`);
    if (menuAlvo) menuAlvo.classList.add('active');

    const secaoAlvo = document.getElementById(`sec-${secaoId}`);
    if (secaoAlvo) secaoAlvo.classList.add('active');

    // --- ADICIONE ISSO AQUI: ---
    // Se estiver no mobile, fecha o menu após clicar em um item
    if (window.innerWidth <= 768) {
        toggleMenu();
    }

    const titulos = {
        'dashboard': 'Painel de Controle',
        'produtos': 'Gerenciar Estoque',
        'pedidos': 'Pedidos Recebidos',
        'banners': 'Configuração de Banner'
    };
    document.getElementById('secao-titulo').innerText = titulos[secaoId] || 'Admin';
}


// Sobrescrevendo o alert nativo do navegador
window.alert = function(mensagem) {
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