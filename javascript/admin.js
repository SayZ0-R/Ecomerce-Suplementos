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
    carregarEstatisticas();
    renderizarGraficoVendas();
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


// --- 2. DASHBOARD (ESTATÍSTICAS REAIS) ---
async function carregarEstatisticas() {
    const { data: pedidos, error } = await _supabase.from('pedidos').select('total, status_pagamento, status_pedido');

    if (error) return;

    // Soma apenas pedidos com status_pagamento 'Aprovado'
    const totalVendido = pedidos
        .filter(p => p.status_pagamento === 'Aprovado')
        .reduce((acc, p) => acc + parseFloat(p.total), 0);

    // Conta pedidos que não estão 'Concluído'
    const pendentes = pedidos.filter(p =>
        p.status_pedido !== 'Concluído' &&
        p.status_pedido !== 'Cancelado' &&
        p.status_pedido !== 'Enviado'
    ).length;

    document.getElementById('stats-vendas').innerText = totalVendido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('stats-pendentes').innerText = pendentes;
}


// --- 3. GESTÃO DE CATEGORIAS ---
async function carregarCategoriasNoSelect() {
    const { data, error } = await _supabase.from('categorias').select('*').order('nome');
    if (data) {
        const select = document.getElementById('prod-categoria');
        select.innerHTML = data.map(c => `<option value="${c.nome}">${c.nome}</option>`).join('');
    }
}

function abrirModalCategoria() {
    const modalCat = document.getElementById('modal-categoria');
    
    // Forçamos o display e um z-index altíssimo para furar a fila
    modalCat.style.display = 'flex';
    modalCat.style.zIndex = '9999'; 
    
    // Opcional: focar no campo de texto automaticamente
    setTimeout(() => {
        document.getElementById('novo-nome-cat').focus();
    }, 100);
}

function fecharModalCategoria() {
    const modalCat = document.getElementById('modal-categoria');
    modalCat.style.display = 'none';
}

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

    document.getElementById('prod-preco-cartao').value = p.preco_cartao || "";
    document.getElementById('prod-max-parcelas').value = p.max_parcelas || 4;

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
            // NOVOS CAMPOS ABAIXO:
            preco_cartao: document.getElementById('prod-preco-cartao').value ? parseFloat(document.getElementById('prod-preco-cartao').value) : null,
            max_parcelas: parseInt(document.getElementById('prod-max-parcelas').value),

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

// --- 5. GESTÃO DE PEDIDOS (VERSÃO ATUALIZADA COM TRAVA DE CANCELAMENTO) ---
async function carregarPedidosAdmin() {
    const lista = document.getElementById('lista-pedidos-admin');
    if (!lista) return;

    const { data, error } = await _supabase
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return;

    lista.innerHTML = data.map(p => {
        const itens = p.itens_json || [];
        const qtdTotal = p.total_itens_quantidade || 0;
        const nomesProdutos = itens.map(item => `${item.quantidade}x ${item.nome}`).join('<br>');
        const pedidoJson = encodeURIComponent(JSON.stringify(p));


        // --- NOVA LÓGICA DE TRAVA ---
        const isCancelado = p.status_pedido === 'Cancelado';

        return `
        <tr>
            
            <td>
            <div style="display: flex; gap: 8px;">
                <button class="btn-whats" style="background: #3498db;" 
                        onclick="abrirModalDetalhes('${pedidoJson}')">
                    <i class="fas fa-file-alt"></i>
                </button>
                
                
            </div>
        </td>
        
        <td>${new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
            <td>
                <strong>${p.cliente_nome || 'Cliente'}</strong><br>
                <small style="color: #666">${nomesProdutos}</small>
            </td>
            <td>${qtdTotal} un.</td>
            <td>R$ ${parseFloat(p.total).toFixed(2)}</td>
            
            <td>
                <span class="status-badge ${p.status_pagamento === 'Aprovado' ? 'status-aprovado' : (isCancelado ? 'status-cancelado' : 'status-pendente')}">
                    ${p.status_pagamento || 'Aguardando'}
                </span>
            </td>

            <td>
                <select class="status-select" 
                        onchange="atualizarStatusOperacional(${p.id}, this.value)" 
                        ${isCancelado ? 'disabled' : ''} 
                        style="${isCancelado ? 'border-color: #e74c3c; color: #e74c3c; background-color: #fdf2f2;' : ''}">
                    
                    ${isCancelado ? `
                        <option value="Cancelado" selected>Cancelado</option>
                    ` : `
                        <option value="Pendente" ${p.status_pedido === 'Pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="Em separação" ${p.status_pedido === 'Em separação' ? 'selected' : ''}>Em separação</option>
                        <option value="Enviado" ${p.status_pedido === 'Enviado' ? 'selected' : ''}>Enviado</option>
                        <option value="Concluído" ${p.status_pedido === 'Concluído' ? 'selected' : ''}>Concluído</option>
                    `}
                </select>
            </td>
            <td>${criarBotaoWhats(p)}</td>
        </tr>
    `;
    }).join('');
}

function criarBotaoWhats(p) {
    const msg = `Olá ${p.cliente_nome}, seu pedido #${p.id} foi atualizado!`;
    const tel = p.cliente_telefone ? p.cliente_telefone.replace(/\D/g, "") : "";
    return `<button class="btn-whats" onclick="window.open('https://wa.me/55${tel}?text=${encodeURIComponent(msg)}', '_blank')"><i class="fab fa-whatsapp"></i></button>`;
}

async function atualizarStatusOperacional(id, novoStatus) {
    const { error } = await _supabase
        .from('pedidos')
        .update({ status_pedido: novoStatus }) // Nome da coluna no banco
        .eq('id', id);

    if (error) {
        alert("Erro ao atualizar status: " + error.message);
    } else {
        // Recarrega estatísticas para atualizar o número de pendentes no topo
        carregarEstatisticas();
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
    document.getElementById('prod-preco-cartao').value = "";
    document.getElementById('prod-max-parcelas').value = 4;
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

    if (secaoId === 'frete') {
        carregarFretes();
    }

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


// Escuta novos pedidos em tempo real e atualiza a tela automaticamente
const canalPedidos = _supabase 
    .channel('pedidos-em-tempo-real')
    .on('postgres_changes', 
        { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'pedidos' 
        }, 
        payload => {
            console.log('Novo pedido detectado!', payload.new);
            
            // 1. CHAMA AS FUNÇÕES QUE ATUALIZAM A TELA
            carregarPedidosAdmin(); // Isso faz a lista atualizar sem F5
            carregarEstatisticas(); // Isso atualiza o faturamento no topo
            
            // 2. AVISA VOCÊ (Opcional)
            if (typeof tocarSomNotificacao === "function") {
                tocarSomNotificacao();
            }
            alert(`Novo pedido de ${payload.new.cliente_nome} recebido agora!`);
        }
    )
    .subscribe();
// --- 8. GESTÃO DE FRETE E BAIRROS ---

async function carregarFretes() {
    console.log("Iniciando carregamento de fretes...");
    const lista = document.getElementById('lista-fretes-admin');

    if (!lista) return;

    try {
        const { data, error } = await _supabase
            .from('frete_bairros')
            .select('*')
            .order('bairro', { ascending: true });

        if (error) throw error;

        if (data.length === 0) {
            lista.innerHTML = '<tr><td colspan="3" style="text-align:center;">Nenhum bairro cadastrado.</td></tr>';
            return;
        }

        lista.innerHTML = data.map(item => `
            <tr>
                <td>${item.bairro}</td>
                <td>R$ ${parseFloat(item.valor).toFixed(2).replace('.', ',')}</td>
                <td style="text-align: center;">
                    <button onclick="deletarFrete(${item.id})" style="color:red; border:none; background:none; cursor:pointer; font-size:16px">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error("Erro ao carregar fretes:", error);
    }
}

async function salvarFrete(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button');
    const bairroInput = document.getElementById('frete-bairro');
    const valorInput = document.getElementById('frete-valor');

    const bairro = bairroInput.value;
    const valor = parseFloat(valorInput.value);

    btn.disabled = true;
    btn.innerText = "Salvando...";

    try {
        const { error } = await _supabase
            .from('frete_bairros')
            .insert([{ bairro, valor }]);

        if (error) throw error;

        alert("Bairro adicionado com sucesso!");
        bairroInput.value = "";
        valorInput.value = "";
        carregarFretes(); // Atualiza a lista na hora
    } catch (error) {
        alert("Erro ao salvar: Este bairro já pode estar cadastrado.");
        console.error(error);
    } finally {
        btn.disabled = false;
        btn.innerText = "Adicionar";
    }
}

async function deletarFrete(id) {
    if (!confirm("Excluir esta taxa de entrega?")) return;

    try {
        const { error } = await _supabase
            .from('frete_bairros')
            .delete()
            .eq('id', id);

        if (error) throw error;
        carregarFretes();
    } catch (error) {
        alert("Erro ao excluir.");
    }
}

function abrirModalDetalhes(jsonString) {
    const p = JSON.parse(decodeURIComponent(jsonString));
    const itens = p.itens_json || p.itens || [];

    const listaHtml = itens.map(i => `<li>${i.quantidade}x ${i.nome || i.titulo} - R$ ${parseFloat(i.preco).toFixed(2)}</li>`).join('');

    document.getElementById('detalhe-conteudo').innerHTML = `
        <p><strong>Cliente:</strong> ${p.cliente_nome}</p>
        <p><strong>WhatsApp:</strong> ${p.whatsapp || 'Não informado'}</p>
        <p><strong>Endereço:</strong> ${p.endereco || 'Não informado'}</p>
        <hr>
        <p><strong>Itens do Pedido:</strong></p>
        <ul>${listaHtml}</ul>
        <hr>
        <p><strong>Total do Pedido:</strong> R$ ${parseFloat(p.total).toFixed(2)}</p>
    `;

    document.getElementById('modal-detalhes').style.display = 'flex';
}


async function renderizarGraficoVendas() {
    const { data: pedidos, error } = await _supabase
        .from('pedidos')
        .select('total, created_at')
        .eq('status_pagamento', 'Aprovado'); 

    if (error) return console.error("Erro ao carregar gráfico:", error);

   
    const vendasPorMes = {};

    pedidos.forEach(p => {
        const data = new Date(p.created_at);
        const mesAno = data.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        
        vendasPorMes[mesAno] = (vendasPorMes[mesAno] || 0) + parseFloat(p.total);
    });

    const meses = Object.keys(vendasPorMes);
    const valores = Object.values(vendasPorMes);

    const ctx = document.getElementById('graficoVendas').getContext('2d');
    new Chart(ctx, {
        type: 'bar', 
        data: {
            labels: meses,
            datasets: [{
                label: 'Total Vendido (R$)',
                data: valores,
                backgroundColor: '#27ae60',
                borderColor: '#219150',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}