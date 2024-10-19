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

// Função para enviar o formulário de solicitação de serviço
document.getElementById('serviceRequestForm').addEventListener('submit', function(event) {
    event.preventDefault();

    // Coleta o ID do cliente de um campo oculto
    const clienteId = document.getElementById('clienteId').value;

    // Coleta os demais dados do formulário
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
    const contactDate = document.getElementById('contactDate').value;
    const references = document.getElementById('references').files[0]; // Arquivo opcional
    const comments = document.getElementById('comments').value;
    const providerPreferences = document.getElementById('providerPreferences').value;

    // Criar um objeto FormData para envio de arquivos
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
    if (references) {
        formData.append('references', references); // Arquivo opcional
    }
    formData.append('comments', comments);
    formData.append('providerPreferences', providerPreferences);

    // Limpar mensagens anteriores
    document.getElementById('response').textContent = '';

    // Enviar a solicitação para o back-end
    fetch('/api/solicitar-servico', {
        method: 'POST',
        body: formData,
    })
    .then(response => {
        if (response.redirected) {
            // Redirecionar o navegador se o servidor retornou um redirecionamento
            window.location.href = response.url;
        } else {
            // Verificar se a resposta é JSON e lidar com ela
            return response.json().then(data => {
                if (!response.ok) {
                    // Exibir mensagem de erro se a resposta não for sucesso (HTTP status != 2xx)
                    throw new Error(data.message || 'Erro ao processar a solicitação.');
                }
                return data;
            });
        }
    })
    .then(data => {
        if (data && data.message) {
            // Exibir a mensagem de sucesso ou qualquer outra resposta do servidor
            document.getElementById('response').textContent = data.message;
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        document.getElementById('response').textContent = error.message || 'Erro ao solicitar o serviço.';
    });
});
