// Função para alternar entre Login e Cadastro
function alternarTab(tipo) {
    const isLogin = tipo === 'login';

    // Alterna a visibilidade dos formulários
    document.getElementById('form-login').classList.toggle('active', isLogin);
    document.getElementById('form-cadastro').classList.toggle('active', !isLogin);

    // Alterna o visual das abas
    document.getElementById('btn-tab-login').classList.toggle('active', isLogin);
    document.getElementById('btn-tab-cad').classList.toggle('active', !isLogin);
}

// Evento de Login
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;

    const { error } = await _supabase.auth.signInWithPassword({ email, password: senha });
    
    if (error) {
        alert("Erro no login: Verifique seu e-mail e senha.");
    } else {
        const nivel = await checarNivelAcesso();
        if (nivel === 'admin') window.location.href = 'admin.html';
        else window.location.href = 'index.html';
    }
});

// Evento de Cadastro (Atualizado com Telefone, CPF e Nascimento)
document.getElementById('form-cadastro').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('cad-email').value;
    const senha = document.getElementById('cad-senha').value;
    const nome = document.getElementById('cad-nome').value;
    const telefone = document.getElementById('cad-telefone').value;
    const cpf = document.getElementById('cad-cpf').value;
    const nascimento = document.getElementById('cad-nascimento').value;

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
});