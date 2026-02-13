// Configurações do Supabase
const SUPABASE_URL = 'https://kmmowmfrfshaazvfuheg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_qVyBTyr2S5dj97i2w9vj9g_8zLkqn5Z';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// CENTRALIZADO: Lista de e-mails com permissão de administrador
const ADMINS_PERMITIDOS = [
    'jose.barbosajunior91@icloud.com', // Proprietário
    'marquespk98@gmail.com',           // Desenvolvedor (Você)
    'amaliaribeiro2016@icloud.com'     // Esposa
];

async function checarNivelAcesso() {
    try {
        const { data: { user }, error } = await _supabase.auth.getUser();
        if (error || !user) return null;

        // Verifica se o e-mail do usuário logado está na nossa lista de permissões
        if (ADMINS_PERMITIDOS.includes(user.email)) {
            return 'admin';
        }
        
        return 'cliente';
    } catch (e) {
        return null;
    }
}

async function deslogar() {
    try {
        // 1. Avisa o Supabase para encerrar a sessão
        await _supabase.auth.signOut();
    } catch (error) {
        console.error("Erro ao deslogar do servidor:", error);
    } finally {
        // 2. LIMPEZA CRÍTICA: Remove o "fantasma" do navegador
        localStorage.clear(); 
        sessionStorage.clear();

        // 3. DESTINO: Volta para a página inicial
        // Usamos replace para que o usuário não consiga "voltar" para a página de perfil usando a seta do navegador
        window.location.replace('index.html');
    }
}