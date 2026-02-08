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