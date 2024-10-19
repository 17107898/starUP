// Função para validar o CNPJ
function validaCNPJ (cnpj) {
    const b = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const c = String(cnpj).replace(/[^\d]/g, '');

    if (c.length !== 14) return false;
    if (/0{14}/.test(c)) return false;

    let n = 0;

    for (let i = 0; i < 12; n += c[i] * b[++i]);
    if (c[12] != (((n %= 11) < 2) ? 0 : 11 - n)) return false;

    n = 0;
    for (let i = 0; i <= 12; n += c[i] * b[i++]);
    if (c[13] != (((n %= 11) < 2) ? 0 : 11 - n)) return false;

    return true;
}

// Função para formatar o CNPJ
function formatCNPJ(value) {
    const cnpj = value.replace(/\D/g, ''); // Remove tudo que não é dígito
    if (cnpj.length <= 2) return cnpj;
    if (cnpj.length <= 5) return `${cnpj.slice(0, 2)}.${cnpj.slice(2)}`;
    if (cnpj.length <= 8) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5)}`;
    if (cnpj.length <= 12) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8)}`;
    return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12, 14)}`;
}

// Adicionar a formatação enquanto o usuário digita o CNPJ
document.getElementById('cnpj').addEventListener('input', function(event) {
    event.target.value = formatCNPJ(event.target.value);
});

// Lógica de envio do formulário
document.getElementById('clienteForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const cnpj = document.getElementById('cnpj').value;
    const responseElement = document.getElementById('response'); // Para facilitar as respostas

    // Limpar a mensagem anterior
    responseElement.textContent = '';

    // Verificação de campos obrigatórios
    if (!name || !email || !password || !confirmPassword) {
        responseElement.textContent = 'Por favor, preencha todos os campos obrigatórios!';
        return;
    }

    // Verificação se as senhas coincidem
    if (password !== confirmPassword) {
        responseElement.textContent = 'As senhas não coincidem!';
        return;
    }

    // Validação completa do CNPJ (se fornecido)
    if (cnpj && !validaCNPJ(cnpj)) {
        responseElement.textContent = 'CNPJ inválido!';
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
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro na solicitação');
        }
        return response.json();
    })
    .then(data => {
        responseElement.textContent = data.message;
        if (data.redirect) {
            window.location.href = data.redirect;  // Redireciona para a tela de solicitação de serviço
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        responseElement.textContent = 'Erro ao cadastrar cliente. Tente novamente mais tarde.';
    });
});
