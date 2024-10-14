// Selecionar elementos
const initialScreen = document.getElementById('initialScreen');
const loginScreen = document.getElementById('loginScreen');
const registerScreen = document.getElementById('registerScreen');

// Botões de navegação
const loginButton = document.getElementById('loginButton');
const registerButton = document.getElementById('registerButton');
const registerClientButton = document.getElementById('registerClientButton');
const registerProviderButton = document.getElementById('registerProviderButton');

// Mostrar a tela de login
loginButton.addEventListener('click', () => {
    initialScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
});

// Mostrar a tela de cadastro
registerButton.addEventListener('click', () => {
    initialScreen.classList.add('hidden');
    registerScreen.classList.remove('hidden');
});

// Redirecionar para a página de cadastro de cliente
registerClientButton.addEventListener('click', () => {
    window.location.href = "/cadastro_cliente"; // Rota da página de cadastro de cliente
});

// Redirecionar para a página de cadastro de prestador
registerProviderButton.addEventListener('click', () => {
    window.location.href = "/cadastro_prestador"; // Rota da página de cadastro de prestador
});

// Adicionando evento de envio do formulário de login
document.getElementById('loginForm').addEventListener('submit', function (event) {
    event.preventDefault();  // Evitar o comportamento padrão do formulário

    // Coletar os dados do formulário
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    // Fazer a requisição POST para o endpoint de login
    fetch('/api/login', {
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
            // Redireciona para a página de solicitação de serviço
            window.location.href = "/solicitar_servico";
        } else {
            // Exibir mensagem de erro
            alert(data.message);
        }
    })
    .catch(error => {
        console.error('Erro no login:', error);
    });
});
