function enviarWhatsApp(event) {
    event.preventDefault(); // Impede o formulário de recarregar a página

    // 1. Configurações
    const telefoneDono = "553188801752"; // COLOQUE O SEU NÚMERO AQUI (com DDD e sem espaços)
    
    // 2. Captura os valores dos campos
    const nome = document.getElementById('nome').value;
    const assunto = document.getElementById('assunto').value;
    const mensagem = document.getElementById('mensagem').value;

    // 3. Monta a mensagem padronizada
    // O encodeURIComponent serve para converter espaços e símbolos para o formato de URL
    const textoPadrao = `Olá, meu nome é *${nome}*, tenho uma dúvida sobre o *${assunto}*.\n\n*Mensagem:* ${mensagem}`;
    
    // 4. Cria a URL final do WhatsApp
    const urlWhatsApp = `https://wa.me/${telefoneDono}?text=${encodeURIComponent(textoPadrao)}`;

    // 5. Abre em uma nova aba
    window.open(urlWhatsApp, '_blank');
}