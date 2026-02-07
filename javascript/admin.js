// --- 1. TRAVA DE SEGURANÇA EXCLUSIVA ADMIN ---
async function validarAdmin() {
    const nivel = await checarNivelAcesso();
    if (nivel !== 'admin') {
        alert("Acesso negado! Esta área é apenas para administradores.");
        window.location.replace('login.html');
        return;
    }
    carregarProdutosDoBanco();
}

// Executa a trava
document.addEventListener('DOMContentLoaded', validarAdmin);

// --- 2. FUNÇÕES DO PAINEL ---
async function salvarNovoProduto(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    btn.innerText = "Salvando..."; btn.disabled = true;

    try {
        const nome = document.getElementById('prod-nome').value;
        const preco = document.getElementById('prod-preco').value;
        const desc = document.getElementById('prod-descricao').value;
        const arquivo = document.getElementById('prod-imagem').files[0];

        if (!arquivo) throw new Error("Selecione uma imagem!");

        const nomeArq = `${Date.now()}_${arquivo.name}`;
        const { data: img, error: errImg } = await _supabase.storage.from('produtos').upload(`fotos/${nomeArq}`, arquivo);
        if (errImg) throw errImg;

        const { data: url } = _supabase.storage.from('produtos').getPublicUrl(`fotos/${nomeArq}`);

        const { error: errDb } = await _supabase.from('produtos').insert([{
            nome, preco: parseFloat(preco), descricao: desc, imagem_url: url.publicUrl
        }]);
        if (errDb) throw errDb;

        alert("Produto salvo!");
        fecharModalProduto();
        carregarProdutosDoBanco();
    } catch (e) { alert(e.message); }
    finally { btn.innerText = "Salvar Produto"; btn.disabled = false; }
}

async function carregarProdutosDoBanco() {
    const lista = document.getElementById('lista-produtos-admin');
    if (!lista) return;
    const { data, error } = await _supabase.from('produtos').select('*').order('id', {ascending: false});
    if (error) return;
    lista.innerHTML = data.map(p => `
        <div class="produto-item">
            <img src="${p.imagem_url}" width="40">
            <span>${p.nome}</span>
            <button onclick="deletarProduto(${p.id},'${p.imagem_url}')"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');
}

async function deletarProduto(id, url) {
    if (!confirm("Excluir?")) return;
    await _supabase.from('produtos').delete().eq('id', id);
    const arq = url.split('/').pop();
    await _supabase.storage.from('produtos').remove([`fotos/${arq}`]);
    carregarProdutosDoBanco();
}

// Interface
function toggleMenu() { document.getElementById('sidebar').classList.toggle('active'); }
function abrirModalProduto() { document.getElementById('modal-produto').classList.add('active'); }
function fecharModalProduto() { document.getElementById('modal-produto').classList.remove('active'); document.getElementById('form-produto').reset(); }
function mostrarNomeArquivo() { document.getElementById('nome-arquivo').innerText = document.getElementById('prod-imagem').files[0].name; }
async function confirmarSair() { if (confirm("Sair?")) await deslogar(); }