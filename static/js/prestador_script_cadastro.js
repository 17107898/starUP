document.getElementById('prestadorForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const service = document.getElementById('service').value;

    // Validação de senha
    if (password.length < 6) {
        document.getElementById('response').textContent = 'A senha deve ter pelo menos 6 caracteres.';
        return;
    }

    if (password !== confirmPassword) {
        document.getElementById('response').textContent = 'As senhas não correspondem.';
        return;
    }

    // Fazendo a requisição para o backend usando fetch
    fetch('/api/cadastrar-prestador', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name, email: email, password: password, service: service })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('response').textContent = data.message;
        if (data.redirect) {
            window.location.href = data.redirect;  // Redireciona para a página de detalhes do serviço
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        document.getElementById('response').textContent = 'Erro ao cadastrar prestador de serviços.';
    });
});