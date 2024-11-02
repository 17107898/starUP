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

document.getElementById('contactMethod').addEventListener('change', function () {
    const selectedMethod = this.value;
    const contactDetailDiv = document.getElementById('contactDetail');
    const contactLabel = document.getElementById('contactLabel');
    const contactInput = document.getElementById('contactInput');
    
    if (selectedMethod === 'email') {
        contactLabel.innerHTML = 'Por favor, insira seu email:';
        contactInput.placeholder = 'Digite seu email';
        contactInput.type = 'email';
        contactDetailDiv.style.display = 'block';
    } else if (selectedMethod === 'telefone') {
        contactLabel.innerHTML = 'Por favor, insira seu número de telefone:';
        contactInput.placeholder = 'Digite seu número de telefone';
        contactInput.type = 'tel';
        contactDetailDiv.style.display = 'block';
    } else if (selectedMethod === 'whatsapp') {
        contactLabel.innerHTML = 'Por favor, insira seu número do WhatsApp:';
        contactInput.placeholder = 'Digite seu número do WhatsApp';
        contactInput.type = 'tel';
        contactDetailDiv.style.display = 'block';
    } else {
        contactDetailDiv.style.display = 'none';
    }
});

document.getElementById('servicoForm').addEventListener('submit', function(event) {
    event.preventDefault();

    // Função de validação dos campos
    function validarCampos() {
        const prestadorId = document.getElementById('prestadorId').value.trim();
        const serviceType = document.getElementById('serviceType').value.trim();
        const description = document.getElementById('description').value.trim();
        const budget = document.getElementById('budget').value.trim();
        const urgency = document.getElementById('urgency').value.trim();
        const location = document.getElementById('location').value.trim();
        const street = document.getElementById('street').value.trim();
        const neighborhood = document.getElementById('neighborhood').value.trim();
        const city = document.getElementById('city').value.trim();
        const state = document.getElementById('state').value.trim();
        const contactMethod = document.getElementById('contactMethod').value.trim();
        const contactDetail = document.getElementById('contactInput').value.trim();
        const contactDate = document.getElementById('contactDate').value.trim();
        const comments = document.getElementById('comments').value.trim();
        const providerPreferences = document.getElementById('providerPreferences').value.trim();

        if (!prestadorId || !serviceType || !description || !budget || !urgency || !location ||
            !street || !neighborhood || !city || !state || !contactMethod || !contactDetail ||
            !contactDate || !comments || !providerPreferences) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return false;
        }

        return true;
    }

    // Verifica se todos os campos foram preenchidos antes de enviar
    if (!validarCampos()) {
        return; // Se a validação falhar, interrompe o envio
    }

    // Coleta os dados para enviar
    const formData = new FormData();
    formData.append('prestadorId', document.getElementById('prestadorId').value);
    formData.append('serviceType', document.getElementById('serviceType').value);
    formData.append('description', document.getElementById('description').value);
    formData.append('budget', document.getElementById('budget').value);
    formData.append('urgency', document.getElementById('urgency').value);
    formData.append('location', document.getElementById('location').value);
    formData.append('street', document.getElementById('street').value);
    formData.append('neighborhood', document.getElementById('neighborhood').value);
    formData.append('city', document.getElementById('city').value);
    formData.append('state', document.getElementById('state').value);
    formData.append('contactMethod', document.getElementById('contactMethod').value);
    formData.append('contactDetail', document.getElementById('contactInput').value);
    formData.append('contactDate', document.getElementById('contactDate').value);
    formData.append('comments', document.getElementById('comments').value);
    formData.append('providerPreferences', document.getElementById('providerPreferences').value);

    // Adicionar os certificados, se existirem
    const certificados = document.getElementById('certificados').files;
    if (certificados.length > 0) {
        for (let i = 0; i < certificados.length; i++) {
            formData.append('certificados[]', certificados[i]);
        }
    }

    // Enviar os dados usando fetch
    fetch('/api/cadastrar-servico', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro na resposta do servidor');
        }
        return response.json();
    })
    .then(data => {
        if (data.redirect) {
            window.location.href = data.redirect;
        } else {
            document.getElementById('response').textContent = data.message;
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        document.getElementById('response').textContent = 'Erro ao enviar o serviço.';
    });
});
