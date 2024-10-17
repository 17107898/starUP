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
    formData.append('contactMethod', contactMethod);
    formData.append('contactDate', contactDate);
    formData.append('references', references); // Arquivo opcional
    formData.append('comments', comments);
    formData.append('providerPreferences', providerPreferences);

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
            return response.json(); // Para lidar com qualquer outro tipo de resposta JSON
        }
    })
    .then(data => {
        if (data) {
            // Exibir a resposta do servidor (caso não seja um redirecionamento)
            document.getElementById('response').textContent = data.message;
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        document.getElementById('response').textContent = 'Erro ao solicitar o serviço.';
    });
});
