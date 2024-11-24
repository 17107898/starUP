document.addEventListener("DOMContentLoaded", function() {
    var modal = document.getElementById("modal");
    var openModalBtn = document.getElementById("open-modal-btn");
    var closeModal = document.getElementsByClassName("close")[0];
    var modalFeedbacks = document.getElementById("modal-feedbacks");

    if (modal && closeModal && modalFeedbacks) {
        if (openModalBtn) {
            openModalBtn.onclick = function() {
                modalFeedbacks.innerHTML = ""; // Limpa o conteúdo do modal

                // Certifique-se de que 'feedbacks' está definido corretamente
                if (typeof feedbacks !== 'undefined') {
                    feedbacks.forEach(function(feedback) {
                        modalFeedbacks.innerHTML += `
                            <div class="feedback-item">
                                <p><strong>Cliente:</strong> ${feedback.nome_cliente}</p>
                                <p><strong>Comentário:</strong> ${feedback.comentario}</p>
                                <p><strong>Nota:</strong> ${feedback.nota}</p>
                            </div>
                        `;
                    });
                } else {
                    console.error("A variável 'feedbacks' não está definida.");
                }

                modal.style.display = "block";
                document.body.classList.add("no-scroll");
            };
        }

        closeModal.onclick = function() {
            modal.style.display = "none";
            document.body.classList.remove("no-scroll");
        };

        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = "none";
                document.body.classList.remove("no-scroll");
            }
        };
    } else {
        console.error("Um ou mais elementos necessários para o modal não foram encontrados.");
    }
});



function abrirPopup(imageSrc) {
    const popup = document.getElementById('popupCertificado');
    const popupImg = document.getElementById('popupImg');
    
    // Define a imagem do popup
    popupImg.src = imageSrc;

    // Exibe o popup
    popup.style.display = 'flex';
}

function fecharPopup() {
    const popup = document.getElementById('popupCertificado');
    
    // Esconde o popup
    popup.style.display = 'none';
}
function checarSolicitacaoServico() {
    // Obter os parâmetros da URL
    const urlParams = new URLSearchParams(window.location.search);
    const prestadorId = urlParams.get('prestador_id'); // Captura o ID do prestador
    const clienteId = urlParams.get('cliente_id'); // Captura o ID do cliente (se necessário)

    if (!prestadorId) {
        alert("Erro: ID do prestador não encontrado na URL.");
        return;
    }

    // Enviar requisição para verificar se o serviço já foi enviado
    fetch(`/api/servico/${prestadorId}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert("Erro: " + data.error);
                return;
            }

            // Verifique se o cliente já enviou o serviço
            if (data.ja_enviado) {
                alert("Você já enviou este serviço para este prestador.");
            } else {
                // Abrir o popup se o serviço ainda não foi enviado
                abrirPopupSolicitacao();
            }
        })
        .catch(error => {
            console.error('Erro ao verificar o serviço:', error);
            alert("Erro ao verificar o serviço. Tente novamente.");
        });
}
// Função para abrir o popup com as informações do serviço
function abrirPopupSolicitacao() {
    let tipoServicoLegivel = '';
    switch (prestador.service_type) {
        case 'desenvolvimento_software':
            tipoServicoLegivel = 'Desenvolvimento de Software';
            break;
        case 'infraestrutura_ti':
            tipoServicoLegivel = 'Infraestrutura de TI';
            break;
        case 'seguranca_cibernetica':
            tipoServicoLegivel = 'Segurança Cibernética';
            break;
        case 'inteligencia_artificial':
            tipoServicoLegivel = 'Inteligência Artificial';
            break;
        case 'cloud_computing':
            tipoServicoLegivel = 'Computação em Nuvem';
            break;
        case 'data_science':
            tipoServicoLegivel = 'Ciência de Dados';
            break;
        case 'desenvolvimento_web':
            tipoServicoLegivel = 'Desenvolvimento Web';
            break;
        case 'desenvolvimento_mobile':
            tipoServicoLegivel = 'Desenvolvimento Mobile';
            break;
        case 'iot':
            tipoServicoLegivel = 'Internet das Coisas (IoT)';
            break;
        case 'suporte_tecnico':
            tipoServicoLegivel = 'Suporte Técnico';
            break;
        case 'automacao_industrial':
            tipoServicoLegivel = 'Automação Industrial';
            break;
        case 'devops':
            tipoServicoLegivel = 'DevOps';
            break;
        case 'analise_de_dados':
            tipoServicoLegivel = 'Análise de Dados';
            break;
        default:
            tipoServicoLegivel = 'Serviço não especificado';
    }
    // Preencha as informações no popup com os dados da solicitação
    document.getElementById('tipoServico').textContent = tipoServicoLegivel;
    // Preencher as informações no popup com os dados da solicitação
    document.getElementById('orcamentoServico').value = prestador.orcamento;
    document.getElementById('urgenciaServico').value = prestador.urgencia;
    document.getElementById('dataContatoServico').value = prestador.data_contato;

    // Exibir o popup
    document.getElementById('popupSolicitacao').style.display = 'flex';
}



// Função para mostrar ou esconder a caixa de mensagem
function toggleMensagem() {
    const mensagemContainer = document.getElementById('mensagemContainer');
    if (mensagemContainer.style.display === 'none') {
        mensagemContainer.style.display = 'block';
    } else {
        mensagemContainer.style.display = 'none';
    }
}



// Função para fechar o popup
function fecharPopupSolicitacao() {
    document.getElementById('popupSolicitacao').style.display = 'none';
}

// Função para confirmar a solicitação de serviço
function confirmarSolicitacao() {
    const orcamento = document.getElementById('orcamentoServico').value;
    const urgencia = document.getElementById('urgenciaServico').value;
    const dataContato = document.getElementById('dataContatoServico').value;
    const horaContato = document.getElementById('horaContatoServico').value;
    const mensagemCliente = document.getElementById('mensagemCliente').value;

    // Dados adicionais não editáveis
    const prestadorId = prestador.prestador_id; // Capturando o prestador_id corretamente
    const tipoServico = document.getElementById('tipoServico').textContent; // Não editável, mas ainda captura o conteúdo
    const descricao = document.getElementById('descricaoServico').textContent; // Não editável
    const localizacao = document.getElementById('localizacaoServico').textContent;
    const rua = document.getElementById('ruaServico').textContent;
    const bairro = document.getElementById('bairroServico').textContent;
    const cidade = document.getElementById('cidadeServico').textContent;
    const estado = document.getElementById('estadoServico').textContent;
    const metodoContato = document.getElementById('metodoContatoServico').textContent;

    if (!prestadorId) {
        alert("Erro: ID do prestador não encontrado!");
        return;
    }

    // Enviar a solicitação ao servidor
    fetch('/api/solicitar_servico_confirmar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            prestador_id: prestadorId,  // Passando o prestador_id corretamente
            orcamento: orcamento,
            urgencia: urgencia,
            data_contato: dataContato,
            hora_contato: horaContato,
            mensagem_cliente: mensagemCliente,
            tipo_servico: tipoServico,
            descricao: descricao,
            localizacao: localizacao,
            rua: rua,
            bairro: bairro,
            cidade: cidade,
            estado: estado,
            metodo_contato: metodoContato
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('Erro: ' + data.error);
        } else {
            alert('Solicitação enviada com sucesso!');
            fecharPopupSolicitacao();  // Fecha o popup após a confirmação
        }
    })
    .catch(error => {
        console.error('Erro ao enviar solicitação:', error);
    });
}


// Obter os dados enviados pelo backend
const contactDaysContainer = document.getElementById('contactDays');
const diasHorasContato = JSON.parse(contactDaysContainer.getAttribute('data-dias-horas-contato') || '{}');

// Iterar pelos dias e preencher os checkboxes e horários
for (const [dia, hora] of Object.entries(diasHorasContato)) {
    const checkbox = document.querySelector(`input[type="checkbox"][id="${dia}"]`);
    const horarioInput = document.querySelector(`input[type="time"][id="${dia}Time"]`);

    if (checkbox && horarioInput) {
        checkbox.checked = true; // Marcar o checkbox como selecionado
        horarioInput.value = hora; // Preencher o horário correspondente
    }
}

