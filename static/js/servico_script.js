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


// Função para ativar o seletor de arquivos ao clicar no ícone
function ativarUploadCertificados() {
    const certificadoInput = document.getElementById('certificados');
    if (certificadoInput) {
        certificadoInput.click(); // Simula o clique no input de arquivos
    } else {
        console.error("Elemento de ID 'certificados' não encontrado.");
    }
}

// Lista para armazenar os arquivos carregados
let certificadosCarregados = [];

// Listener para o input de arquivos
document.addEventListener('DOMContentLoaded', function () {
    const certificadoInput = document.getElementById('certificados');
    if (certificadoInput) {
        certificadoInput.addEventListener('change', function () {
            const files = Array.from(this.files); // Converte os arquivos carregados em um array
            const messageDiv = document.getElementById('certificados-message');

            if (!messageDiv) {
                console.error("Elemento de ID 'certificados-message' não encontrado.");
                return;
            }

            // Adiciona os novos arquivos à lista cumulativa, evitando duplicatas
            files.forEach(file => {
                if (!certificadosCarregados.some(c => c.name === file.name && c.size === file.size)) {
                    certificadosCarregados.push(file);
                }
            });

            // Exibe a mensagem de sucesso com a contagem total de arquivos carregados
            if (certificadosCarregados.length > 0) {
                messageDiv.textContent = `${certificadosCarregados.length} certificado(s) carregado(s) no total.`;
                messageDiv.style.display = 'block';
            } else {
                messageDiv.style.display = 'none';
            }

            console.log("Certificados carregados:", certificadosCarregados);
        });
    } else {
        console.error("Elemento de ID 'certificados' não encontrado.");
    }
});

// Função de validação dos campos
function validarCampos() {
    const camposObrigatorios = [
        { id: 'prestadorId', mensagem: 'ID do Prestador é obrigatório.' },
        { id: 'serviceType', mensagem: 'Tipo de Serviço é obrigatório.' },
        { id: 'description', mensagem: 'Descrição é obrigatória.' },
        { id: 'budget', mensagem: 'Orçamento é obrigatório.' },
        { id: 'urgency', mensagem: 'Urgência é obrigatória.' },
        { id: 'location', mensagem: 'CEP é obrigatório.' },
        { id: 'contactMethod', mensagem: 'Forma de Contato é obrigatória.' },
        { id: 'contactInput', mensagem: 'Detalhe do Contato é obrigatório.' },
        { id: 'contactDate', mensagem: 'Data e Hora de Contato são obrigatórias.' }
    ];

    for (const campo of camposObrigatorios) {
        const elemento = document.getElementById(campo.id);
        if (!elemento || !elemento.value.trim()) {
            alert(campo.mensagem);
            return false;
        }
    }

    return true;
}

// Listener para submissão do formulário
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('servicoForm');
    if (form) {
        form.addEventListener('submit', function (event) {
            event.preventDefault(); // Evita o envio padrão do formulário

            // Valida os campos antes de enviar
            if (!validarCampos()) {
                return;
            }

            // Coleta os dados para enviar
            const formData = new FormData(form);

            // Adicionar os certificados carregados ao FormData
            certificadosCarregados.forEach((file, index) => {
                formData.append(`certificados[${index}]`, file);
            });

            // Enviar os dados usando fetch
            fetch('/api/cadastrar-servico', {
                method: 'POST',
                body: formData
            })
                .then(response => {
                    if (!response.ok) {
                        return response.text().then(text => {
                            throw new Error(text || 'Erro na resposta do servidor.');
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.redirect) {
                        window.location.href = data.redirect;
                    } else if (data.message) {
                        const responseDiv = document.getElementById('response');
                        if (responseDiv) {
                            responseDiv.textContent = data.message;
                        } else {
                            console.warn("Elemento de ID 'response' não encontrado para exibir a mensagem.");
                        }
                    }
                })
                .catch(error => {
                    console.error('Erro ao enviar:', error);
                    const responseDiv = document.getElementById('response');
                    if (responseDiv) {
                        responseDiv.textContent = 'Erro ao enviar o serviço.';
                    }
                });
        });
    } else {
        console.error("Elemento de ID 'servicoForm' não encontrado.");
    }
});
