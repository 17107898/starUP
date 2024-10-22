// Função para formatar o CEP enquanto o usuário digita
function formatarCEP(cep) {
    // Remove todos os caracteres que não sejam números
    cep = cep.replace(/\D/g, '');
    
    // Formata o CEP para o padrão 'XXXXX-XXX'
    if (cep.length > 5) {
        cep = cep.replace(/^(\d{5})(\d)/, '$1-$2');
    }
    
    return cep;
}

// Função para buscar o endereço via API do ViaCEP
function buscarEndereco(cep) {
    // Remover caracteres não numéricos do CEP
    cep = cep.replace(/\D/g, '');

    // Verificar se o CEP tem 8 dígitos
    if (cep.length !== 8) {
        document.getElementById('response').textContent = 'CEP inválido!';
        return;
    }

    // Fazer a requisição para a API ViaCEP
    fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao buscar CEP');
            }
            return response.json();
        })
        .then(data => {
            if (data.erro) {
                document.getElementById('response').textContent = 'CEP não encontrado!';
                return;
            }

            // Preencher os campos com os dados retornados pela API
            document.getElementById('street').value = data.logradouro;
            document.getElementById('neighborhood').value = data.bairro;
            document.getElementById('city').value = data.localidade;
            document.getElementById('state').value = data.uf;
        })
        .catch(error => {
            console.error('Erro:', error);
            document.getElementById('response').textContent = 'Erro ao buscar CEP.';
        });
}

// Adicionar evento ao campo de CEP para formatar enquanto o usuário digita e buscar o endereço automaticamente ao completar 8 dígitos
document.getElementById('location').addEventListener('input', function () {
    const cepInput = document.getElementById('location');
    cepInput.value = formatarCEP(cepInput.value);
    
    // Se o CEP tiver 8 dígitos, buscar o endereço automaticamente
    const cepLimpo = cepInput.value.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
        buscarEndereco(cepLimpo);
    }
});

// Função para exibir o campo de contato baseado na escolha do método
document.getElementById('contactMethod').addEventListener('change', function () {
    const selectedMethod = this.value;
    const contactDetailDiv = document.getElementById('contactDetail');
    const contactLabel = document.getElementById('contactLabel');
    const contactInput = document.getElementById('contactInput');
    
    // Exibe o campo e define o placeholder e o label conforme o método escolhido
    if (selectedMethod === 'email') {
        contactLabel.innerHTML = 'Por favor, insira seu email:';
        contactInput.placeholder = 'Digite seu email';
        contactInput.type = 'email';
        contactDetailDiv.style.display = 'block';  // Exibe o campo
    } else if (selectedMethod === 'telefone') {
        contactLabel.innerHTML = 'Por favor, insira seu número de telefone:';
        contactInput.placeholder = 'Digite seu número de telefone';
        contactInput.type = 'tel';  // Define como campo de telefone
        contactDetailDiv.style.display = 'block';
    } else if (selectedMethod === 'whatsapp') {
        contactLabel.innerHTML = 'Por favor, insira seu número do WhatsApp:';
        contactInput.placeholder = 'Digite seu número do WhatsApp';
        contactInput.type = 'tel';  // Define como campo de telefone
        contactDetailDiv.style.display = 'block';
    } else {
        contactDetailDiv.style.display = 'none';  // Oculta o campo se nenhum método for selecionado
    }
});

// Função para enviar o formulário de serviço
document.getElementById('servicoForm').addEventListener('submit', function(event) {
    event.preventDefault();

    // Coleta o ID do prestador de um input oculto ou outro meio
    const prestadorId = document.getElementById('prestadorId').value;
    const serviceType = document.getElementById('serviceType').value;
    const description = document.getElementById('description').value;
    const budget = document.getElementById('budget').value;
    const urgency = document.getElementById('urgency').value;
    const location = document.getElementById('location').value;
    const street = document.getElementById('street').value;
    const neighborhood = document.getElementById('neighborhood').value;
    const city = document.getElementById('city').value;
    const state = document.getElementById('state').value;
    const contactMethod = document.getElementById('contactMethod').value;
    const contactDetail = document.getElementById('contactInput').value;  // Coletando o valor do campo de contato
    const contactDate = document.getElementById('contactDate').value;
    const comments = document.getElementById('comments').value;
    const providerPreferences = document.getElementById('providerPreferences').value;

    // Verificar se os campos estão preenchidos corretamente (opcional)
    if (!serviceType || !description || !budget || !urgency || !location || !contactMethod || !contactDetail || !contactDate) {
        document.getElementById('response').textContent = 'Por favor, preencha todos os campos obrigatórios.';
        return;
    }

    // Fazer a requisição para a rota /api/cadastrar-servico (Prestador)
    fetch('/api/cadastrar-servico', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prestadorId: prestadorId,
            serviceType: serviceType,
            description: description,
            budget: budget,
            urgency: urgency,
            location: location,
            street: street,
            neighborhood: neighborhood,
            city: city,
            state: state,
            contactMethod: contactMethod,
            contactDetail: contactDetail,  // Adiciona o contato fornecido pelo usuário
            contactDate: contactDate,
            comments: comments,
            providerPreferences: providerPreferences
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro na resposta do servidor');
        }
        return response.json();
    })
    .then(data => {
        if (data.redirect) {
            window.location.href = data.redirect; // Redireciona após sucesso
        } else {
            document.getElementById('response').textContent = data.message; // Mensagem de sucesso
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        document.getElementById('response').textContent = 'Erro ao enviar o serviço.';
    });
});
