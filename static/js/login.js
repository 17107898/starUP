document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault(); // Evitar o comportamento padrão do formulário

    // Coletar os dados do formulário
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    // Verificar se os campos de email e senha estão preenchidos
    if (!email || !password) {
        displayMessage('Email e senha são obrigatórios.', 'error');
        return;
    }

    try {
        // Enviar a requisição POST para a API de login
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password
            }),
        });

        // Verificar se o login foi bem-sucedido
        if (response.ok) {
            const data = await response.json();

            if (data.redirectUrl) {
                // Redirecionar para a URL recebida
                window.location.href = data.redirectUrl;
            } else {
                displayMessage('Nenhum serviço encontrado para este cliente.', 'error');
            }
        } else if (response.status === 401) {
            // Login falhou por credenciais inválidas
            displayMessage('Credenciais inválidas. Tente novamente.', 'error');
        } else {
            displayMessage('Ocorreu um erro ao fazer login. Tente novamente.', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        displayMessage('Erro ao conectar com o servidor. Tente novamente mais tarde.', 'error');
    }
});

// Função para exibir mensagens na página
function displayMessage(message, type) {
    const messageContainer = document.getElementById('messageContainer');
    
    if (messageContainer) {
        messageContainer.innerHTML = `<p class="${type}">${message}</p>`;
    } else {
        alert(message); // Fallback para alert se o elemento não existir
    }
}
