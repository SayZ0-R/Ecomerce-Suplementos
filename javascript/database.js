// Configurações do Supabase
const SUPABASE_URL = 'https://kmmowmfrfshaazvfuheg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_qVyBTyr2S5dj97i2w9vj9g_8zLkqn5Z';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function checarNivelAcesso() {
    try {
        const { data: { user }, error } = await _supabase.auth.getUser();
        if (error || !user) return null;

        const { data, error: errAdmin } = await _supabase
            .from('admins')
            .select('email')
            .eq('email', user.email)
            .maybeSingle();

        if (!errAdmin && data) return 'admin';

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
      
        localStorage.clear(); 
        sessionStorage.clear();

       
        window.location.replace('index.html');
    }
}