// --- 1. TRAVA DE SEGURANÇA E IDENTIFICAÇÃO ---
async function validarAdmin() {
    const nivel = await checarNivelAcesso();
    if (nivel !== 'admin') {
        alert("Acesso negado! Esta área é apenas para administradores.");
        window.location.replace('login.html');
        return;
    }

    // Se for admin, carrega as informações iniciais
    identificarAdmin();
    carregarProdutosDoBanco();
    carregarPedidosAdmin();
    carregarDadosBanner(); // Para a nova aba de banners
}

async function identificarAdmin() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (user && user.user_metadata) {
        const nomeCompleto = user.user_metadata.full_name || "Administrador";
        // Atualiza o "Olá, Kayque" no cabeçalho
        const adminNameElement = document.querySelector('.admin-name strong');
        const avatarElement = document.querySelector('.avatar');
        
        if (adminNameElement) adminNameElement.innerText = nomeCompleto;
        if (avatarElement) avatarElement.innerText = nomeCompleto.charAt(0).toUpperCase();
    }
}

// Executa a trava ao carregar
document.addEventListener('DOMContentLoaded', validarAdmin);

// --- 2. NAVEGAÇÃO ENTRE ABAS ---
function mostrarSecao(secaoId) {
    // Remove active de todos os menus e seções
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));

    // Ativa o menu clicado
    const menuAlvo = document.querySelector(`[onclick="mostrarSecao('${secaoId}')"]`);
    if (menuAlvo) menuAlvo.classList.add('active');

    // Ativa a seção correspondente
    const secaoAlvo = document.getElementById(`sec-${secaoId}`);
    if (secaoAlvo) secaoAlvo.classList.add('active');

    // Atualiza o título do cabeçalho
    const titulos = {
        'dashboard': 'Painel de Controle',
        'produtos': 'Gerenciar Estoque',
        'pedidos': 'Pedidos Recebidos',
        'banners': 'Configuração de Banner'
    };
    document.getElementById('secao-titulo').innerText = titulos[secaoId] || 'Admin';
}

// --- 3. GESTÃO DE PRODUTOS (COM MAIS VENDIDOS / PROMO) ---
async function salvarNovoProduto(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    btn.innerText = "Salvando..."; btn.disabled = true;

    try {
        const nome = document.getElementById('prod-nome').value;
        const preco = document.getElementById('prod-preco').value;
        const precoAntigo = document.getElementById('prod-preco-antigo')?.value || null;
        const desc = document.getElementById('prod-descricao').value;
        const categoria = document.getElementById('prod-categoria').value;
        const maisVendido = document.getElementById('prod-mais-vendido').checked;
        const promocao = document.getElementById('prod-promocao').checked;
        const arquivo = document.getElementById('prod-imagem').files[0];

        if (!arquivo) throw new Error("Selecione uma imagem!");

        const nomeArq = `${Date.now()}_${arquivo.name}`;
        const { data: img, error: errImg } = await _supabase.storage.from('produtos').upload(`fotos/${nomeArq}`, arquivo);
        if (errImg) throw errImg;

        const { data: url } = _supabase.storage.from('produtos').getPublicUrl(`fotos/${nomeArq}`);

        const { error: errDb } = await _supabase.from('produtos').insert([{
            nome, 
            preco: parseFloat(preco), 
            preco_antigo: precoAntigo ? parseFloat(precoAntigo) : null,
            descricao: desc, 
            categoria: categoria,
            mais_vendido: maisVendido,
            promocao: promocao,
            imagem_url: url.publicUrl
        }]);
        
        if (errDb) throw errDb;

        alert("Produto salvo com sucesso!");
        fecharModalProduto();
        carregarProdutosDoBanco();
    } catch (e) { alert(e.message); }
    finally { btn.innerText = "Salvar Produto"; btn.disabled = false; }
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
                    <img src="${p.imagem_url}" width="35" style="border-radius:5px">
                    <span>${p.nome} ${p.mais_vendido ? '<span class="badge-destaque">★</span>' : ''}</span>
                </div>
            </td>
            <td>R$ ${p.preco.toFixed(2)}</td>
            <td>${p.mais_vendido ? 'Sim' : 'Não'}</td>
            <td><span class="status-badge status-aprovado">Ativo</span></td>
            <td>
                <button onclick="deletarProduto(${p.id},'${p.imagem_url}')" class="btn-delete" style="color:red; border:none; background:none; cursor:pointer">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// --- 4. GESTÃO DE PEDIDOS E WHATSAPP ---
async function carregarPedidosAdmin() {
    const lista = document.getElementById('lista-pedidos-admin');
    if (!lista) return;

    const { data, error } = await _supabase.from('pedidos').select('*').order('created_at', { ascending: false });
    if (error) return;

    lista.innerHTML = data.map(pedido => {
        const dataFormatada = new Date(pedido.created_at).toLocaleDateString('pt-BR');
        return `
            <tr>
                <td>${dataFormatada}</td>
                <td>${pedido.cliente_nome || 'Cliente'}</td>
                <td>R$ ${parseFloat(pedido.total).toFixed(2)}</td>
                <td>
                    <select class="status-select" onchange="atualizarStatusPedido(${pedido.id}, this.value)">
                        <option value="Pendente" ${pedido.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="Aprovado" ${pedido.status === 'Aprovado' ? 'selected' : ''}>Aprovado</option>
                        <option value="Enviado" ${pedido.status === 'Enviado' ? 'selected' : ''}>Enviado</option>
                        <option value="Entregue" ${pedido.status === 'Entregue' ? 'selected' : ''}>Entregue</option>
                    </select>
                </td>
                <td>
                    ${criarBotaoWhats(pedido)}
                </td>
            </tr>
        `;
    }).join('');
}

function criarBotaoWhats(pedido) {
    const mensagem = `Olá ${pedido.cliente_nome}, seu pedido #${pedido.id.toString().slice(-5)} foi enviado e está a caminho da sua casa! 🚀`;
    const telLimpo = pedido.cliente_telefone ? pedido.cliente_telefone.replace(/\D/g, "") : "";
    
    return `<button class="btn-whats" onclick="window.open('https://wa.me/55${telLimpo}?text=${encodeURIComponent(mensagem)}', '_blank')">
                <i class="fab fa-whatsapp"></i> Notificar
            </button>`;
}

async function atualizarStatusPedido(id, novoStatus) {
    const { error } = await _supabase.from('pedidos').update({ status: novoStatus }).eq('id', id);
    if (error) alert("Erro ao atualizar status");
}

// --- 5. GESTÃO DO BANNER PROMOCIONAL (CORRIGIDO PARA UPLOAD) ---
async function atualizarBanner(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button');
    const originalText = btn.innerText;
    
    btn.innerText = "Enviando Imagem...";
    btn.disabled = true;

    try {
        const titulo = document.getElementById('banner-titulo').value;
        const preco = document.getElementById('banner-preco').value;
        const descricao = document.getElementById('banner-desc').value;
        const arquivo = document.getElementById('banner-upload').files[0];

        let urlFinal = "";

        // 1. Se o usuário selecionou uma nova imagem, faz o upload
        if (arquivo) {
            const nomeArq = `banner_principal_${Date.now()}`;
            
            // Faz o upload para o balde (bucket) 'produtos' ou 'banners' (ajuste conforme seu Supabase)
            const { data: uploadData, error: uploadError } = await _supabase.storage
                .from('produtos') 
                .upload(`banners/${nomeArq}`, arquivo, { upsert: true });

            if (uploadError) throw uploadError;

            // Pega a URL pública da imagem enviada
            const { data: publicUrlData } = _supabase.storage
                .from('produtos')
                .getPublicUrl(`banners/${nomeArq}`);
                
            urlFinal = publicUrlData.publicUrl;
        }

        // 2. Prepara os dados para salvar na tabela
        const dadosParaSalvar = { 
            id: 1, 
            chave: 'banner_principal',
            titulo: titulo,
            preco: parseFloat(preco),
            descricao: descricao
        };

        // Só atualiza a imagem no banco se uma nova foi selecionada
        if (urlFinal) {
            dadosParaSalvar.imagem_url = urlFinal;
        }

        // 3. Salva ou atualiza (upsert) na tabela configuracoes_site
        const { error: dbError } = await _supabase
            .from('configuracoes_site')
            .upsert([dadosParaSalvar]);

        if (dbError) throw dbError;

        alert("Banner atualizado com sucesso!");
        
    } catch (error) {
        console.error("Erro no banner:", error);
        alert("Erro ao salvar banner: " + error.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function carregarDadosBanner() {
    const { data } = await _supabase.from('configuracoes_site').select('*').eq('chave', 'banner_principal').single();
    if (data) {
        document.getElementById('banner-img-url').value = data.imagem_url || "";
        document.getElementById('banner-titulo').value = data.titulo || "";
        document.getElementById('banner-preco').value = data.preco || "";
        document.getElementById('banner-desc').value = data.descricao || "";
    }
}

// --- 6. UTILITÁRIOS ORIGINAIS ---
async function deletarProduto(id, url) {
    if (!confirm("Excluir este produto permanentemente?")) return;
    try {
        await _supabase.from('produtos').delete().eq('id', id);
        const arq = url.split('/').pop();
        await _supabase.storage.from('produtos').remove([`fotos/${arq}`]);
        carregarProdutosDoBanco();
    } catch (e) { alert("Erro ao excluir"); }
}

function toggleMenu() { 
    document.getElementById('sidebar').classList.toggle('active'); 
    document.getElementById('sidebar-overlay').classList.toggle('active');
}

function abrirModalProduto() { document.getElementById('modal-produto').classList.add('active'); }
function fecharModalProduto() { 
    document.getElementById('modal-produto').classList.remove('active'); 
    document.getElementById('form-produto').reset(); 
    document.getElementById('nome-arquivo').innerText = "Nenhuma imagem selecionada";
}

function mostrarNomeArquivo() { 
    const input = document.getElementById('prod-imagem');
    if(input.files.length > 0) document.getElementById('nome-arquivo').innerText = input.files[0].name; 
}