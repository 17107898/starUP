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

document.getElementById('localizacaoImportante').addEventListener('change', function () {
    const camposLocalizacao = document.querySelectorAll('#location, #street, #neighborhood, #city, #state');
    const labelsLocalizacao = document.querySelectorAll('label[for="location"], label[for="street"], label[for="neighborhood"], label[for="city"], label[for="state"]');

    if (this.checked) {
        // Se o checkbox estiver marcado, exibe os campos de localização e adiciona o atributo "required"
        camposLocalizacao.forEach(campo => {
            campo.required = true; // Define como obrigatório
            campo.style.display = 'block'; // Exibe os campos
        });
        labelsLocalizacao.forEach(label => {
            label.style.display = 'block'; // Exibe os labels
        });
    } else {
        // Se o checkbox estiver desmarcado, oculta os campos de localização e remove a obrigatoriedade
        camposLocalizacao.forEach(campo => {
            campo.required = false; // Remove obrigatoriedade
            campo.style.display = 'none'; // Oculta os campos
            campo.value = ''; // Limpa os valores dos campos
        });
        labelsLocalizacao.forEach(label => {
            label.style.display = 'none'; // Oculta os labels
        });
    }
});

// Inicializa o formulário com os campos de localização ocultos, se o checkbox não estiver marcado
if (!document.getElementById('localizacaoImportante').checked) {
    const camposLocalizacao = document.querySelectorAll('#location, #street, #neighborhood, #city, #state');
    const labelsLocalizacao = document.querySelectorAll('label[for="location"], label[for="street"], label[for="neighborhood"], label[for="city"], label[for="state"]');
    
    camposLocalizacao.forEach(campo => {
        campo.style.display = 'none'; // Oculta os campos
        campo.removeAttribute('required'); // Remove o atributo required quando oculto
    });
    labelsLocalizacao.forEach(label => {
        label.style.display = 'none'; // Oculta os labels
    });
}


// Função para enviar o formulário de solicitação de serviço
document.getElementById('serviceRequestForm').addEventListener('submit', function (event) {
    event.preventDefault();

    // Coleta os dados do formulário
    const clienteId = document.getElementById('clienteId').value;
    const serviceType = document.getElementById('serviceType').value;
    const description = document.getElementById('description').value;
    const budget = document.getElementById('budget').value;
    const urgency = document.getElementById('urgency').value;
    const localizacaoImportante = document.getElementById('localizacaoImportante').checked; // Valor do checkbox

    // Verificar se a localização é importante, se não for, definir como null
    let location = null;
    let street = null;
    let neighborhood = null;
    let city = null;
    let state = null;

    if (localizacaoImportante) {
        // Coletar valores dos campos de localização se o checkbox estiver marcado
        location = document.getElementById('location').value;
        street = document.getElementById('street').value;
        neighborhood = document.getElementById('neighborhood').value;
        city = document.getElementById('city').value;
        state = document.getElementById('state').value;
    }

    const contactMethod = document.getElementById('contactMethod').value;
    const contactDate = document.getElementById('contactDate').value;
    const references = document.getElementById('references').files[0];
    const comments = document.getElementById('comments').value;
    const providerPreferences = document.getElementById('providerPreferences').value;

    // Criar um objeto FormData para enviar os dados, incluindo o checkbox
    const formData = new FormData();
    formData.append('cliente_id', clienteId);
    formData.append('serviceType', serviceType);
    formData.append('description', description);
    formData.append('budget', budget);
    formData.append('urgency', urgency);
    formData.append('location', location);
    formData.append('street', street);
    formData.append('neighborhood', neighborhood);
    formData.append('city', city);
    formData.append('state', state);
    formData.append('contactMethod', contactMethod);
    formData.append('contactDate', contactDate);
    formData.append('localizacaoImportante', localizacaoImportante); // Adiciona o valor do checkbox
    if (references) {
        formData.append('references', references);
    }
    formData.append('comments', comments);
    formData.append('providerPreferences', providerPreferences);

    // Enviar o formulário via POST para o backend
    fetch('/api/solicitar-servico', {
        method: 'POST',
        body: formData,
    })
    .then(response => {
        // Verifica se a resposta foi um redirecionamento
        if (response.redirected) {
            window.location.href = response.url; // Seguir o redirecionamento
        } else {
            return response.json(); // Processar como JSON se não for redirecionamento
        }
    })
    .then(data => {
        if (data) {
            document.getElementById('response').textContent = data.message;
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        document.getElementById('response').textContent = 'Erro ao enviar a solicitação de serviço.';
    });
});
