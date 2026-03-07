// --- 1. NAVEGAÇÃO ENTRE ABAS ---
function alternarTab(tipo) {
    const isLogin = tipo === 'login';

    // Alterna a visibilidade dos formulários
    document.getElementById('form-login').classList.toggle('active', isLogin);
    document.getElementById('form-cadastro').classList.toggle('active', !isLogin);

    // Alterna o visual das abas
    document.getElementById('btn-tab-login').classList.toggle('active', isLogin);
    document.getElementById('btn-tab-cad').classList.toggle('active', !isLogin);
}

// --- 2. EVENTO DE LOGIN ---
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;

    // Feedback visual
    btn.innerText = "Entrando...";
    btn.disabled = true;

    try {
        const { data, error } = await _supabase.auth.signInWithPassword({ email, password: senha });
        
        if (error) {
            // TRATAMENTO ESPECÍFICO: E-mail não confirmado
            if (error.message.includes("Email not confirmed")) {
                alert("Sua conta ainda não foi ativada! Verifique seu e-mail e clique no link de confirmação.");
            } else {
                alert("Erro no login: Verifique seu e-mail e senha.");
            }
            return;
        }

        // Login sucesso: Checa se é um dos admins na lista do Database.js
        const nivel = await checarNivelAcesso();
        if (nivel === 'admin') {
            window.location.replace('admin.html');
        } else {
            window.location.replace('index.html');
        }

    } catch (err) {
        alert("Erro de conexão com o servidor.");
    } finally {
        btn.innerText = "Entrar";
        btn.disabled = false;
    }
});

// --- VALIDAÇÃO MATEMÁTICA DE CPF ---
function validarCPF(cpf) {
    // Remove máscara
    cpf = cpf.replace(/[^\d]/g, '');

    // Deve ter 11 dígitos e não pode ser sequência repetida
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    // Calcula 1º dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf[9])) return false;

    // Calcula 2º dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf[10])) return false;

    return true;
}

// --- VALIDAÇÃO DE IDADE MÍNIMA ---
function validarIdadeMinima(nascimento, idadeMinima = 16) {
    const hoje = new Date();
    const nasc  = new Date(nascimento);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade >= idadeMinima;
}

// --- 3. EVENTO DE CADASTRO (UNIFICADO COM TODOS OS CAMPOS) ---
document.getElementById('form-cadastro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');

    // Captura de TODOS os dados que você incluiu nas duas versões
    const email = document.getElementById('cad-email').value;
    const senha = document.getElementById('cad-senha').value;
    const nome = document.getElementById('cad-nome').value;
    const telefone = document.getElementById('cad-telefone').value;
    const cpf = document.getElementById('cad-cpf').value;
    const nascimento = document.getElementById('cad-nascimento').value;

    // --- VALIDAÇÕES ANTES DE ENVIAR ---
    if (!validarCPF(cpf)) {
        alert('⚠️ CPF inválido. Verifique os números e tente novamente.');
        return;
    }

    if (!validarIdadeMinima(nascimento, 16)) {
        alert('⚠️ É necessário ter pelo menos 16 anos para criar uma conta.');
        return;
    }

    // Feedback visual
    btn.innerText = "Criando conta...";
    btn.disabled = true;

    try {
        const { error } = await _supabase.auth.signUp({
            email: email,
            password: senha,
            options: { 
                data: { 
                    full_name: nome,
                    telefone: telefone,
                    cpf: cpf,
                    nascimento: nascimento
                } 
            }
        });

        if (error) {
            alert("Erro ao cadastrar: " + error.message);
        } else { 
            alert("Sucesso! Verifique seu e-mail para confirmar a conta antes de fazer o login."); 
            alternarTab('login'); 
        }
    } catch (err) {
        alert("Erro ao processar cadastro.");
    } finally {
        btn.innerText = "Criar Conta";
        btn.disabled = false;
    }
});


// Sobrescrevendo o alert nativo do navegador
window.alert = function(mensagem) {
    const notification = document.createElement('div');
    notification.className = 'custom-alert';

    const isErro = /erro|error|falha|inválido|vazio|preencha|não encontrado|por favor|selecione|atenção|obrigatório|recusado|cancelado|⚠/i.test(mensagem);
    const cor  = isErro ? '#e74c3c' : '#27ae60';
    const icon = isErro ? 'fas fa-times-circle' : 'fas fa-check-circle';

    notification.innerHTML = `
        <i class="${icon}" style="color:${cor};font-size:1.1rem;"></i>
        <span>${mensagem}</span>
    `;
    notification.style.borderLeft = `4px solid ${cor}`;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('hide');
        setTimeout(() => notification.remove(), 400);
    }, 3000);
};