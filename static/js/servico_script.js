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
    document.getElementById('certificados').click(); // Simula o clique no input de arquivos
}

// Lista para armazenar os arquivos carregados
let certificadosCarregados = [];

document.getElementById('certificados').addEventListener('change', function () {
    const files = Array.from(this.files); // Converte os arquivos carregados em um array
    const messageDiv = document.getElementById('certificados-message');

    // Adiciona os novos arquivos à lista cumulativa
    files.forEach(file => {
        if (!certificadosCarregados.some(c => c.name === file.name && c.size === file.size)) {
            certificadosCarregados.push(file); // Evita duplicatas
        }
    });

    // Exibe a mensagem de sucesso com a contagem total de arquivos carregados
    if (certificadosCarregados.length > 0) {
        messageDiv.textContent = `${certificadosCarregados.length} certificado(s) carregado(s) no total.`;
        messageDiv.style.display = 'block'; // Torna a mensagem visível
    } else {
        // Oculta a mensagem caso nenhum arquivo esteja na lista cumulativa
        messageDiv.style.display = 'none';
    }

    console.log("Certificados carregados:", certificadosCarregados);
});



// Adicionar os certificados cumulativos ao FormData
function adicionarCertificadosAoFormData(formData) {
    certificadosCarregados.forEach(certificado => {
        formData.append('certificados', certificado);
    });
}

// Seleciona todos os checkboxes
document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    // Evento para quando o checkbox é alterado
    checkbox.addEventListener('change', function () {
        const label = document.querySelector(`label[for="${this.id}"]`); // Seleciona a label correspondente
        const timeInput = document.querySelector(`#${this.id}Time`); // Seleciona o campo de hora correspondente

        if (this.checked) {
            timeInput.disabled = false; // Habilita o campo de hora
            timeInput.focus(); // Foca automaticamente no campo de hora
        } else {
            timeInput.disabled = true; // Desabilita o campo de hora
            timeInput.value = ''; // Limpa o valor do campo de hora
            label.classList.remove('confirmed'); // Remove o destaque visual
        }
    });

    // Evento para quando o campo de hora perde o foco
    const timeInput = document.querySelector(`#${checkbox.id}Time`);
    timeInput.addEventListener('blur', function () {
        const label = document.querySelector(`label[for="${checkbox.id}"]`);
        if (this.value) {
            // Mantém o destaque na label se o horário estiver preenchido
            label.classList.add('confirmed');
        } else {
            // Remove o destaque se o horário não estiver preenchido
            label.classList.remove('confirmed');
        }
    });
});






// Coletar e enviar os dias e horários selecionados
document.getElementById('servicoForm').addEventListener('submit', function (event) {
    event.preventDefault();

    // Função para validar os campos
    function validarCampos() {
        // Validações adicionais podem ser feitas aqui
        const prestadorId = document.getElementById('prestadorId').value.trim();
        const serviceType = document.getElementById('serviceType').value.trim();
        const description = document.getElementById('description').value.trim();

        if (!prestadorId || !serviceType || !description) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return false;
        }
        return true;
    }

    // Verifica se os campos obrigatórios foram preenchidos
    if (!validarCampos()) {
        return;
    }

    // Coletar dias e horários selecionados
    const daysAndTimes = [];
    document.querySelectorAll('.day-selector input[type="checkbox"]').forEach(checkbox => {
        if (checkbox.checked) {
            const day = checkbox.value; // Dia da semana (ex.: 'monday')
            const time = document.querySelector(`#${checkbox.id}Time`).value; // Hora selecionada
            if (time) {
                daysAndTimes.push({ day, time });
            }
        }
    });

    // Validar se pelo menos um dia e horário foram selecionados
    if (daysAndTimes.length === 0) {
        alert('Selecione pelo menos um dia e horário.');
        return;
    }

    // Coletar os outros campos do formulário
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
    formData.append('comments', document.getElementById('comments').value);
    formData.append('providerPreferences', document.getElementById('providerPreferences').value);

    // Adicionar os dias e horários no formato JSON
    formData.append('contactDaysAndTimes', JSON.stringify(daysAndTimes));

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
