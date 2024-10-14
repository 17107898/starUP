document.getElementById('servicoForm').addEventListener('submit', function(event) {
    event.preventDefault();

    // Coleta o ID do prestador de um input oculto ou outro meio
    const prestadorId = document.getElementById('prestadorId').value; // Supondo que tenha um input hidden com o ID do prestador

    // Coleta de dados do prestador
    const serviceType = document.getElementById('serviceType').value;
    const description = document.getElementById('description').value;
    const budget = document.getElementById('budget').value;
    const urgency = document.getElementById('urgency').value;
    const location = document.getElementById('location').value;
    const contactMethod = document.getElementById('contactMethod').value;
    const contactDate = document.getElementById('contactDate').value;
    const comments = document.getElementById('comments').value;
    const providerPreferences = document.getElementById('providerPreferences').value;

    // Verificar se os campos estão preenchidos corretamente (opcional)
    if (!serviceType || !description || !budget || !urgency || !location || !contactMethod || !contactDate) {
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
            prestadorId: prestadorId,  // Enviando o ID do prestador
            serviceType: serviceType,
            description: description,
            budget: budget,
            urgency: urgency,
            location: location,
            contactMethod: contactMethod,
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
            // Redireciona para a página de upload de mídia após o sucesso
            window.location.href = data.redirect;
        } else {
            // Mostra a mensagem de sucesso
            document.getElementById('response').textContent = data.message;
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        document.getElementById('response').textContent = 'Erro ao enviar o serviço.';
    });
});
