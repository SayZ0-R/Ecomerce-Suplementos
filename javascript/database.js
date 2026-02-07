// Configurações do Supabase
// Substitua pelas chaves do seu painel em Settings > API
const SUPABASE_URL = 'https://seu-projeto.supabase.co';
const SUPABASE_KEY = 'sua-chave-anon-aqui';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// CENTRALIZADO: Mude o e-mail do dono aqui quando ele te enviar
const EMAIL_ADMIN = 'seu-email-admin@teste.com'; 

/**
 * Função global para checar quem está logado e qual seu nível
 * Retorna: 'admin', 'cliente' ou null (se deslogado)
 */
async function checarNivelAcesso() {
    try {
        const { data: { user }, error } = await _supabase.auth.getUser();
        
        if (error || !user) return null;

        if (user.email === EMAIL_ADMIN) {
            return 'admin';
        }
        return 'cliente';
    } catch (e) {
        console.error("Erro ao checar acesso:", e);
        return null;
    }
}

/**
 * Função para deslogar de qualquer página
 */
async function deslogar() {
    await _supabase.auth.signOut();
    window.location.href = 'login.html';
}