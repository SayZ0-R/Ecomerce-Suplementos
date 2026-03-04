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
window._todosPedidos   = [];
window._graficoPeriodo = 6;

async function carregarEstatisticas() {
    const { data: pedidos, error } = await _supabase
        .from('pedidos')
        .select('total, status_pagamento, status_pedido, created_at');

    if (error) return;

    window._todosPedidos = pedidos;

    const aprovados = pedidos.filter(p => p.status_pagamento === 'Aprovado');

    // Card "Pedidos Aprovados" — contagem total do banco
    const elTotalGeral = document.getElementById('stats-total-geral');
    if (elTotalGeral) elTotalGeral.innerText = `${aprovados.length} pedido(s)`;

    // Card "Pedidos Pendentes"
    const pendentes = pedidos.filter(p =>
        p.status_pedido !== 'Concluído' &&
        p.status_pedido !== 'Cancelado' &&
        p.status_pedido !== 'Enviado'
    ).length;
    document.getElementById('stats-pendentes').innerText = pendentes;

    // Popula select de meses e atualiza card de vendas do mês
    popularSelectMeses(aprovados);
    atualizarStatsMes();
}

function popularSelectMeses(aprovados) {
    const select = document.getElementById('select-mes-stats');
    if (!select) return;

    const mesesUnicos = {};
    aprovados.forEach(p => {
        const d    = new Date(p.created_at);
        const chave = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        mesesUnicos[chave] = label.charAt(0).toUpperCase() + label.slice(1);
    });

    const chavesOrdenadas = Object.keys(mesesUnicos).sort().reverse();
    const mesAtual = (() => {
        const n = new Date();
        return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
    })();

    select.innerHTML = chavesOrdenadas
        .map(c => `<option value="${c}" ${c === mesAtual ? 'selected' : ''}>${mesesUnicos[c]}</option>`)
        .join('');
}

function atualizarStatsMes() {
    const select = document.getElementById('select-mes-stats');
    if (!select || !window._todosPedidos.length) return;

    const mesSelecionado = select.value;

    const aprovadosDoMes = window._todosPedidos.filter(p => {
        if (p.status_pagamento !== 'Aprovado') return false;
        const d     = new Date(p.created_at);
        const chave = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        return chave === mesSelecionado;
    });

    const totalMes = aprovadosDoMes.reduce((acc, p) => acc + parseFloat(p.total), 0);

    document.getElementById('stats-vendas').innerText =
        totalMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const elQtd = document.getElementById('stats-qtd-pedidos');
    if (elQtd) elQtd.innerText = `${aprovadosDoMes.length} pedido(s) aprovado(s)`;
}

function setGraficoPeriodo(meses) {
    window._graficoPeriodo = meses;
    [3,6,12].forEach(m => {
        const btn = document.getElementById(`btn-periodo-${m}`);
        if (btn) btn.classList.toggle('ativo', m === meses);
    });
    renderizarGraficoVendas();
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

async function emitirReembolsoAdmin(pedidoId) {
    const confirmar = confirm(`Confirma o reembolso do pedido #${pedidoId}?\n\nIsso irá cancelar o pedido e emitir o reembolso no Mercado Pago.`);
    if (!confirmar) return;

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/reembolso`, {
            method: 'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({ pedidoId, solicitante: 'admin' })
        });

        const result = await response.json();

        if (result.sucesso) {
            alert(result.mensagem);
            carregarPedidosAdmin();
            carregarEstatisticas();
        } else {
            alert('Erro: ' + result.erro);
        }
    } catch (err) {
        alert('Erro ao processar reembolso: ' + err.message);
    }
}

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
        const isCancelado   = p.status_pedido === 'Cancelado';
        const isConcluido   = p.status_pedido === 'Concluído';
        const temPaymentId  = !!p.payment_id;

        // Reembolso aparece só quando: Concluído + tem payment_id + dentro de 7 dias
        const dataReferencia     = p.updated_at || p.created_at;
        const diasDesdeConclusao = isConcluido && dataReferencia
            ? (new Date() - new Date(dataReferencia)) / (1000 * 60 * 60 * 24)
            : 0;
        const podeReembolsar = isConcluido && temPaymentId && diasDesdeConclusao <= 7;

        return `
        <tr>
            
            <td>
            <div style="display: flex; gap: 8px;">
                <button class="btn-whats" style="background: #3498db;" 
                        onclick="abrirModalDetalhes('${pedidoJson}')">
                    <i class="fas fa-file-alt"></i>
                </button>
                
                ${podeReembolsar ? `
                <button onclick="emitirReembolsoAdmin(${p.id})" 
                        style="background:#e74c3c; color:white; border:none; padding:6px 10px; border-radius:5px; cursor:pointer; font-size:12px;"
                        title="Emitir reembolso (produto devolvido)">
                    <i class="fas fa-undo"></i> Reembolso
                </button>` : ''}
                
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
    if (secaoId === 'banner-principal') {
        carregarSlides();
    }
    if (secaoId === 'banners') {
        carregarBannerPromoAdmin();
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


// Realtime — escuta INSERT e UPDATE na tabela pedidos
const canalPedidos = _supabase
    .channel('pedidos-em-tempo-real')
    .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pedidos' },
        payload => {
            console.log('[Realtime] Novo pedido:', payload.new.id);
            carregarPedidosAdmin();
            carregarEstatisticas();
            if (typeof tocarSomNotificacao === "function") tocarSomNotificacao();
            alert(`Novo pedido de ${payload.new.cliente_nome} recebido agora!`);
        }
    )
    .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedidos' },
        payload => {
            console.log('[Realtime] Pedido atualizado:', payload.new.id, '| status:', payload.new.status_pedido);
            carregarPedidosAdmin();
            carregarEstatisticas();
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

    if (error) return console.error("Erro gráfico:", error);

    const periodo = window._graficoPeriodo || 6;

    // Gera eixo X com os últimos N meses (mesmo sem venda)
    const hoje = new Date();
    const labels = [], chavesEixo = [];
    for (let i = periodo - 1; i >= 0; i--) {
        const d     = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const chave = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        chavesEixo.push(chave);
        labels.push(label.charAt(0).toUpperCase() + label.slice(1));
    }

    // Agrupa por mês
    const mapaVendas = {}, mapaQtd = {};
    pedidos.forEach(p => {
        const d     = new Date(p.created_at);
        const chave = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        mapaVendas[chave] = (mapaVendas[chave] || 0) + parseFloat(p.total);
        mapaQtd[chave]    = (mapaQtd[chave]    || 0) + 1;
    });

    const valores = chavesEixo.map(c => mapaVendas[c] || 0);
    const qtds    = chavesEixo.map(c => mapaQtd[c]    || 0);

    const ctx = document.getElementById('graficoVendas').getContext('2d');
    if (window._graficoVendasInstance) window._graficoVendasInstance.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, 'rgba(0,255,136,0.18)');
    gradient.addColorStop(1, 'rgba(0,255,136,0.0)');

    window._graficoVendasInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Receita (R$)',
                    data: valores,
                    fill: true,
                    backgroundColor: gradient,
                    borderColor: '#00FF88',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#00FF88',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Pedidos',
                    data: qtds,
                    fill: false,
                    borderColor: 'rgba(100,149,237,0.8)',
                    borderWidth: 2,
                    borderDash: [5, 4],
                    pointBackgroundColor: 'rgba(100,149,237,0.9)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.4,
                    yAxisID: 'y2'
                }
            ]
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true, position: 'top', align: 'end',
                    labels: { boxWidth: 12, boxHeight: 12, borderRadius: 4,
                              useBorderRadius: true, color: '#555', font: { size: 12 } }
                },
                tooltip: {
                    backgroundColor: '#111', titleColor: '#ccc',
                    bodyColor: '#fff', padding: 14, displayColors: true,
                    callbacks: {
                        label: ctx => ctx.datasetIndex === 0
                            ? `Receita: R$ ${ctx.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            : `Pedidos: ${ctx.parsed.y}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#999', font: { size: 11 } },
                    border: { display: false }
                },
                y: {
                    beginAtZero: true, position: 'left',
                    grid: { color: 'rgba(0,0,0,0.04)' },
                    ticks: { color: '#999', font: { size: 11 },
                             callback: v => `R$ ${v.toLocaleString('pt-BR')}` },
                    border: { display: false }
                },
                y2: {
                    beginAtZero: true, position: 'right',
                    grid: { display: false },
                    ticks: { color: 'rgba(100,149,237,0.8)', font: { size: 11 },
                             callback: v => Number.isInteger(v) ? v : '' },
                    border: { display: false }
                }
            }
        }
    });
}

// =========================================================
// --- BANNER PRINCIPAL (CARROSSEL 4 SLIDES) ---
// =========================================================

async function carregarSlides() {
    const container = document.getElementById('lista-slides-admin');
    if (!container) return;

    const { data } = await _supabase
        .from('configuracoes_site')
        .select('valor_json')
        .eq('chave', 'slides_banner')
        .maybeSingle();

    // Default: 4 slides vazios
    const slides = (data?.valor_json?.length) ? data.valor_json : [
        { titulo: '', subtitulo: '', imagem_url: '' },
        { titulo: '', subtitulo: '', imagem_url: '' },
        { titulo: '', subtitulo: '', imagem_url: '' },
        { titulo: '', subtitulo: '', imagem_url: '' }
    ];

    container.innerHTML = slides.map((s, i) => `
        <div style="background:#fff; border-radius:14px; padding:20px; box-shadow:0 2px 12px rgba(0,0,0,0.07);">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px;">
                <div style="width:28px; height:28px; background:#111; color:#00FF88; border-radius:50%;
                            display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.85rem;">
                    ${i+1}
                </div>
                <strong style="font-size:0.95rem;">Slide ${i+1}</strong>
            </div>

            ${s.imagem_url ? `
                <img src="${s.imagem_url}" style="width:100%; height:110px; object-fit:cover; border-radius:8px; margin-bottom:12px;">
            ` : `
                <div style="width:100%; height:110px; background:#f5f5f5; border-radius:8px; margin-bottom:12px;
                             display:flex; align-items:center; justify-content:center; color:#bbb; font-size:0.85rem;">
                    Sem imagem
                </div>
            `}

            <div class="form-group" style="margin-bottom:10px;">
                <label style="font-size:0.78rem;">Título</label>
                <input type="text" id="slide-titulo-${i}" value="${s.titulo || ''}"
                    placeholder="Ex: Seu melhor desempenho começa aqui"
                    style="width:100%; padding:8px 10px; border:1px solid #eee; border-radius:8px; font-size:0.85rem;">
            </div>
            <div class="form-group" style="margin-bottom:12px;">
                <label style="font-size:0.78rem;">Subtítulo</label>
                <input type="text" id="slide-sub-${i}" value="${s.subtitulo || ''}"
                    placeholder="Ex: Suplementos premium para você"
                    style="width:100%; padding:8px 10px; border:1px solid #eee; border-radius:8px; font-size:0.85rem;">
            </div>
            <div class="form-group">
                <label style="font-size:0.78rem;">Imagem do Slide</label>
                <label for="slide-img-${i}" style="
                    display:flex; align-items:center; gap:8px; padding:8px 12px;
                    background:#f5f5f5; border-radius:8px; cursor:pointer; font-size:0.82rem; color:#555;
                    border:1.5px dashed #ddd;">
                    <i class="fas fa-upload"></i>
                    <span id="slide-img-name-${i}">${s.imagem_url ? 'Alterar imagem' : 'Escolher imagem'}</span>
                    <input type="file" id="slide-img-${i}" accept="image/*" style="display:none;"
                        onchange="document.getElementById('slide-img-name-${i}').innerText = this.files[0]?.name || 'Arquivo selecionado'">
                </label>
            </div>
        </div>
    `).join('');
}

async function salvarSlides() {
    const btn = event.target;
    btn.disabled = true;
    btn.innerText = 'Salvando...';

    try {
        // Busca slides existentes UMA VEZ fora do loop
        const { data: existing } = await _supabase
            .from('configuracoes_site')
            .select('valor_json')
            .eq('chave', 'slides_banner')
            .maybeSingle();
        const slidesExist = existing?.valor_json || [{},{},{},{}];

        const slides = [];
        for (let i = 0; i < 4; i++) {
            const titulo    = document.getElementById(`slide-titulo-${i}`)?.value || '';
            const subtitulo = document.getElementById(`slide-sub-${i}`)?.value || '';
            const fileInput = document.getElementById(`slide-img-${i}`);
            const arquivo   = fileInput?.files[0];
            let imagem_url  = slidesExist[i]?.imagem_url || '';

            if (arquivo) {
                const nome = `slide_${i}_${Date.now()}`;
                const { error: errImg } = await _supabase.storage
                    .from('produtos').upload(`banners/${nome}`, arquivo, { upsert: true });
                if (!errImg) {
                    imagem_url = _supabase.storage.from('produtos')
                        .getPublicUrl(`banners/${nome}`).data.publicUrl;
                }
            }

            slides.push({ titulo, subtitulo, imagem_url });
        }

        const { error } = await _supabase.from('configuracoes_site').upsert([{
            id: 10, chave: 'slides_banner', valor_json: slides
        }]);

        if (error) throw error;

        alert('Slides salvos com sucesso!');
        carregarSlides();
    } catch (e) {
        alert('Erro: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerText = 'Salvar Slides';
    }
}


// =========================================================
// --- BANNER PROMOCIONAL COM PRODUTOS ---
// =========================================================

async function carregarProdutosBannerAdmin() {
    const container = document.getElementById('lista-produtos-banner');
    if (!container) return;

    const { data: produtos } = await _supabase
        .from('produtos')
        .select('id, nome, preco, imagem_url')
        .order('nome');

    if (!produtos || produtos.length === 0) {
        container.innerHTML = '<p style="color:#aaa;">Nenhum produto cadastrado.</p>';
        return;
    }

    // Busca seleção já salva — maybeSingle para não dar erro se não existir
    const { data: config } = await _supabase
        .from('configuracoes_site')
        .select('valor_json')
        .eq('chave', 'banner_promo_produtos')
        .maybeSingle();

    // Garante que os IDs são sempre números para comparação correta
    const idsSalvos = (config?.valor_json?.produto_ids || []).map(Number);

    container.innerHTML = produtos.map(p => {
        const selecionado = idsSalvos.includes(Number(p.id));
        return `
        <label style="
            display:flex; align-items:center; gap:10px; padding:10px 12px;
            background:#fff; border-radius:10px; cursor:pointer;
            border: 1.5px solid ${selecionado ? '#00cc6d' : '#eee'};
            transition:0.2s;" id="label-prod-${p.id}">
            <input type="checkbox" value="${p.id}"
                ${selecionado ? 'checked' : ''}
                onchange="toggleProdutoBanner(${p.id})"
                style="width:16px; height:16px; accent-color:#00cc6d;">
            <img src="${p.imagem_url}" style="width:36px; height:36px; border-radius:6px; object-fit:cover;">
            <div>
                <div style="font-size:0.82rem; font-weight:600;">${p.nome}</div>
                <div style="font-size:0.75rem; color:#888;">R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}</div>
            </div>
        </label>
    `}).join('');

    atualizarPreviewBanner();
}

function toggleProdutoBanner(id) {
    const label = document.getElementById(`label-prod-${id}`);
    const cb    = label?.querySelector('input[type=checkbox]');
    if (label) label.style.borderColor = cb?.checked ? '#00cc6d' : '#eee';
    atualizarPreviewBanner();
}

function atualizarPreviewBanner() {
    const checkboxes = document.querySelectorAll('#lista-produtos-banner input[type=checkbox]:checked');
    const preview    = document.getElementById('preview-selecionados');
    const lista      = document.getElementById('lista-preview-selecionados');
    if (!preview || !lista) return;

    if (checkboxes.length === 0) {
        preview.style.display = 'none';
        return;
    }

    preview.style.display = 'block';
    const nomes = [...checkboxes].map(cb => {
        const label = cb.closest('label');
        return label?.querySelector('div > div:first-child')?.innerText || `Produto #${cb.value}`;
    });
    lista.innerHTML = nomes.map(n => `• ${n}`).join('<br>');
}

async function atualizarBannerPromocional(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.innerText = 'Salvando...';

    try {
        const titulo      = document.getElementById('banner-titulo').value;
        const desc        = document.getElementById('banner-desc').value;
        const valorCombo  = parseFloat(document.getElementById('banner-valor-combo').value) || null;
        const arquivo     = document.getElementById('banner-upload').files[0];

        // IDs selecionados
        const checkboxes  = document.querySelectorAll('#lista-produtos-banner input[type=checkbox]:checked');
        const produto_ids = [...checkboxes].map(cb => parseInt(cb.value));

        // Mantém imagem atual se não enviou nova
        const { data: bannerAtual } = await _supabase
            .from('configuracoes_site').select('imagem_url').eq('chave', 'banner_principal').maybeSingle();

        let imagem_url = bannerAtual?.imagem_url || null;
        if (arquivo) {
            const nome = `banner_promo_${Date.now()}`;
            const { error: errImg } = await _supabase.storage
                .from('produtos').upload(`banners/${nome}`, arquivo, { upsert: true });
            if (!errImg) {
                imagem_url = _supabase.storage.from('produtos')
                    .getPublicUrl(`banners/${nome}`).data.publicUrl;
            }
        }

        // Salva dados do banner
        const dadosBanner = { id: 1, chave: 'banner_principal', titulo, descricao: desc };
        if (imagem_url) dadosBanner.imagem_url = imagem_url;
        await _supabase.from('configuracoes_site').upsert([dadosBanner]);

        // Salva IDs dos produtos + valor do combo
        const { error } = await _supabase.from('configuracoes_site').upsert([{
            id: 11, chave: 'banner_promo_produtos', valor_json: { produto_ids, valor_combo: valorCombo }
        }]);

        if (error) throw error;

        alert(`Banner salvo! ${produto_ids.length} produto(s) vinculado(s)${valorCombo ? ` — Combo: R$ ${valorCombo.toFixed(2)}` : ''}.`);
    } catch (e) {
        alert('Erro: ' + e.message);
    } finally {
        btn.disabled = false; btn.innerText = 'Salvar Banner Promocional';
    }
}

async function carregarBannerPromoAdmin() {
    const { data } = await _supabase
        .from('configuracoes_site')
        .select('*')
        .eq('chave', 'banner_principal')
        .maybeSingle();

    if (data) {
        if (document.getElementById('banner-titulo')) document.getElementById('banner-titulo').value = data.titulo || '';
        if (document.getElementById('banner-desc'))   document.getElementById('banner-desc').value   = data.descricao || '';
    }

    // Carrega valor combo salvo
    const { data: config } = await _supabase
        .from('configuracoes_site').select('valor_json').eq('chave', 'banner_promo_produtos').maybeSingle();
    const valorCombo = config?.valor_json?.valor_combo;
    if (valorCombo && document.getElementById('banner-valor-combo')) {
        document.getElementById('banner-valor-combo').value = valorCombo;
    }

    carregarProdutosBannerAdmin();
}