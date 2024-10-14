document.getElementById('clienteForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const cnpj = document.getElementById('cnpj').value;

    if (password !== confirmPassword) {
        document.getElementById('response').textContent = 'As senhas não coincidem!';
        return;
    }

    // Fazendo a requisição para o backend usando fetch
    fetch('/api/cadastrar-cliente', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name, email: email, password: password, cnpj: cnpj })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('response').textContent = data.message;
        if (data.redirect) {
            window.location.href = data.redirect;  // Redireciona para a tela de solicitação de serviço
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        document.getElementById('response').textContent = 'Erro ao cadastrar cliente.';
    });
});
