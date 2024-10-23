document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();  // Previne o comportamento padrão de envio do formulário
    
    // Coletar os dados do formulário
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Enviar os dados via fetch usando o método POST
    fetch('/api/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: email,
            password: password
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'Login bem-sucedido') {
            // Redireciona para a página de solicitação de serviço após o login bem-sucedido
            window.location.href = '/solicitar_servico';
        } else {
            // Exibir mensagem de erro se as credenciais forem inválidas
            alert('Credenciais inválidas. Tente novamente.');
        }
    })
    .catch(error => {
        console.error('Erro ao fazer login:', error);
    });
});
