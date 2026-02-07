// 1. Alternar entre Abas de Login e Cadastro
function alternarTab(tipo) {
    const btnLogin = document.getElementById('btn-tab-login');
    const btnCad = document.getElementById('btn-tab-cad');
    const formLogin = document.getElementById('form-login');
    const formCad = document.getElementById('form-cadastro');

    if (tipo === 'login') {
        btnLogin.classList.add('active');
        btnCad.classList.remove('active');
        formLogin.classList.add('active');
        formCad.classList.remove('active');
    } else {
        btnCad.classList.add('active');
        btnLogin.classList.remove('active');
        formCad.classList.add('active');
        formLogin.classList.remove('active');
    }
}

// 2. Lógica de Cadastro (SignUp)
document.getElementById('form-cadastro').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nome = document.getElementById('cad-nome').value;
    const email = document.getElementById('cad-email').value;
    const senha = document.getElementById('cad-senha').value;

    const { data, error } = await _supabase.auth.signUp({
        email: email,
        password: senha,
        options: {
            data: { full_name: nome }
        }
    });

    if (error) {
        alert("Erro no cadastro: " + error.message);
    } else {
        alert("Cadastro realizado! Verifique seu e-mail para confirmar a conta.");
        alternarTab('login');
    }
});

// 3. Lógica de Login (SignIn)
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;

    const { data, error } = await _supabase.auth.signInWithPassword({
        email: email,
        password: senha
    });

    if (error) {
        alert("Erro ao entrar: Verifique e-mail e senha.");
    } else {
        // Usa a função do database.js para decidir o destino
        const nivel = await checarNivelAcesso();
        
        if (nivel === 'admin') {
            alert("Acesso Administrativo detectado.");
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'index.html';
        }
    }
});