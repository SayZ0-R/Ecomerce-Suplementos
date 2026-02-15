// 1. A FUNÇÃO DE CÁLCULO INTELIGENTE
function atualizarTotalCheckout() {
    // Puxa os produtos que estão no carrinho
    const carrinho = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
    // Puxa o frete (caso tenha sido calculado)
    const frete = parseFloat(localStorage.getItem('nutrirVida_frete')) || 0;

    // Verifica qual método está selecionado (usando o name="metodo-pagamento" do seu HTML)
    const metodoInput = document.querySelector('input[name="metodo-pagamento"]:checked');
    const metodoSelecionado = metodoInput ? metodoInput.value : 'pix';

    const elementoTotal = document.getElementById('total-final-checkout');
    const containerParcelas = document.getElementById('parcelamento-container');

    let subtotalGeral = 0;

    carrinho.forEach(item => {
        // A MÁGICA ACONTECE AQUI:
        // Se for cartão, ele tenta usar o preco_cartao. 
        // Se não existir o campo preco_cartao no item, ele usa o preco (pix) como segurança.
        let precoParaCalculo;

        if (metodoSelecionado === 'cartao') {
            precoParaCalculo = item.preco_cartao ? parseFloat(item.preco_cartao) : parseFloat(item.preco);
        } else {
            precoParaCalculo = parseFloat(item.preco);
        }

        subtotalGeral += precoParaCalculo * item.quantidade;
    });

    const totalFinal = subtotalGeral + frete;

    // Atualiza o valor no resumo da compra (HTML)
    if (elementoTotal) {
        elementoTotal.innerText = `R$ ${totalFinal.toFixed(2).replace('.', ',')}`;
    }

    // Gerencia o seletor de parcelas
    if (metodoSelecionado === 'cartao') {
        containerParcelas.style.display = 'block';
        gerarOpcoesParcelas(totalFinal);
    } else {
        containerParcelas.style.display = 'none';
    }

    // Salva esse total dinâmico para ser usado no fechamento do pedido
    localStorage.setItem('nutrirVida_total_dinamico', totalFinal.toFixed(2));
}

// 2. FUNÇÃO PARA GERAR O TEXTO DAS PARCELAS
function gerarOpcoesParcelas(total) {
    const select = document.getElementById('select-parcelas');
    if (!select) return;

    select.innerHTML = '';
    // Gera de 1x até 12x (você pode diminuir o limite se quiser)
    for (let i = 1; i <= 12; i++) {
        const valorParcela = total / i;
        const option = document.createElement('option');
        option.value = i;
        option.text = `${i}x de R$ ${valorParcela.toFixed(2).replace('.', ',')}`;
        select.appendChild(option);
    }
}

// 3. INICIALIZAÇÃO E EVENTOS
document.addEventListener('DOMContentLoaded', async () => {
    // Sua trava de segurança de login
    const nivel = await checarNivelAcesso();
    if (!nivel) {
        window.location.replace('login.html');
        return;
    }

    // Adiciona o evento "change" em todos os botões de rádio de pagamento
    const radiosPagamento = document.querySelectorAll('input[name="metodo-pagamento"]');
    radiosPagamento.forEach(radio => {
        radio.addEventListener('change', () => {
            console.log("Método alterado para:", radio.value);
            atualizarTotalCheckout();
        });
    });

    // Roda o cálculo pela primeira vez ao abrir a página
    atualizarTotalCheckout();

    // Lógica do botão Finalizar (Submit)
 const form = document.getElementById('form-checkout');
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerText = "Processando...";

        // --- AQUI ESTAVA O ERRO: PRECISAMOS DEFINIR AS VARIÁVEIS ABAIXO ---
        const itensCarrinho = JSON.parse(localStorage.getItem('nutrirVida_cart')) || [];
        
        // Calculamos a soma total de unidades (Ex: 2 Wheys + 1 Creatina = 3)
        const totalItensQtd = itensCarrinho.reduce((acc, item) => acc + (parseInt(item.quantidade) || 0), 0);
        
        const pedido = {
            cliente_nome: document.getElementById('nome-completo').value,
            cliente_email: document.getElementById('email-checkout').value,
            whatsapp: document.getElementById('whatsapp').value,
            endereco: `${document.getElementById('logradouro').value}, ${document.getElementById('numero').value} - ${document.getElementById('bairro').value}`,
            
            // Enviando para as colunas que o banco e o painel esperam
            itens: itensCarrinho,               // Detalhes dos produtos
            total_itens_quantidade: totalItensQtd,   // Valor numérico total (Ex: 3)
            
            total: parseFloat(localStorage.getItem('nutrirVida_total_dinamico')),
            metodo_pagamento: document.querySelector('input[name="metodo-pagamento"]:checked').value,
            status_pagamento: 'Aguardando',
            status_pedido: 'Pendente'
        };

        try {
            // 1. Inserimos o pedido e pedimos para o Supabase retornar os dados inseridos (.select())
            const { data, error } = await _supabase
                .from('pedidos')
                .insert([pedido])
                .select(); // IMPORTANTE: Isso retorna o ID gerado

            if (error) throw error;

            const pedidoCriado = data[0]; // Aqui está o seu pedido com o ID do banco

            // 2. AGORA CHAMAMOS O MERCADO PAGO (Exemplo com Checkout Pro)
            // Vamos enviar o ID do banco para o external_reference
            alert("Pedido registrado! Redirecionando para o pagamento...");
            
            // Aqui você deve chamar sua lógica de checkout do Mercado Pago
            // Vou simular a criação da preferência:
            await iniciarPagamentoMercadoPago(pedidoCriado);

            // Limpeza e redirecionamento
            localStorage.removeItem('nutrirVida_cart');
            // window.location.href = 'index.html'; // Removido para não fechar antes do pagamento
            
        } catch (err) {
            alert("Erro ao salvar pedido: " + err.message);
            btn.disabled = false;
            btn.innerText = "Finalizar Pedido";
        }
    });
}


async function iniciarPagamentoMercadoPago(pedido) {
    // Aqui você faz o fetch para o seu backend ou função que gera a preferência
    // O segredo está em passar o 'pedido.id' como 'external_reference'
    
    console.log("Iniciando MP para o ID:", pedido.id);

    // Exemplo de objeto de preferência que você enviará para a API do Mercado Pago
    const preferencia = {
        items: pedido.itens.map(i => ({
            title: i.nome,
            unit_price: parseFloat(i.preco),
            quantity: parseInt(i.quantidade)
        })),
        external_reference: pedido.id.toString(), // <--- O VÍNCULO ESTÁ AQUI
        notification_url: "SUA_URL_DA_EDGE_FUNCTION_AQUI" // A URL que o terminal te deu
    };

    // Lógica para abrir o checkout do Mercado Pago (via link ou SDK)
    // Se for Checkout Pro, você receberá um 'init_point' e fará:
    // window.location.href = response.init_point;
}


    // --- DENTRO DO DOMContentLoaded ---

    // Função para buscar e preencher dados do perfil logado
    async function preencherDadosUsuario() {
        const { data: { user } } = await _supabase.auth.getUser();
        if (user) {
            // Preenche os campos com os metadados do cadastro
            document.getElementById('nome-completo').value = user.user_metadata.full_name || "";
            document.getElementById('email-checkout').value = user.email || "";
            // Se houver telefone salvo no cadastro, preenche também
            if (user.user_metadata.telefone) {
                document.getElementById('whatsapp').value = user.user_metadata.telefone;
            }
        }
    }

    // Chama a função logo após validar o acesso
    await preencherDadosUsuario();
});