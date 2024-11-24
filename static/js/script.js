let page = 1;
let loading = false;
let activeServiceIndex = 0; // Índice do serviço ativo no carrossel vertical
let servicesElements = []; // Para armazenar os serviços carregados
let isAnimating = false; // Variável para controlar se a animação está em andamento

// Função que esconde os botões de navegação em dispositivos móveis
// Função que esconde os botões de navegação em dispositivos móveis
function hideNavigationButtonsIfMobile(serviceElement) {
    if (isMobileDevice) {  // Use a variável global
        const nextButton = serviceElement.querySelector('button.next');
        const prevButton = serviceElement.querySelector('button.prev');
        if (nextButton) {
            nextButton.style.display = 'none'; // Esconde o botão "next"
        }
        if (prevButton) {
            prevButton.style.display = 'none'; // Esconde o botão "prev"
        }
    }
}

// Função que habilita navegação por toque (swipe) no carrossel horizontal
function enableSwipeNavigation(gallery, showNext, showPrev) {
    let startX = 0;

    // Detecta o início do toque
    gallery.addEventListener('touchstart', function(event) {
        startX = event.touches[0].clientX; // Armazena a posição horizontal do toque
    });

    // Detecta o final do toque e verifica a direção do swipe
    gallery.addEventListener('touchend', function(event) {
        const endX = event.changedTouches[0].clientX;
        const deltaX = startX - endX;

        if (deltaX > 50) {
            // Swipe para a esquerda (próximo item)
            showNext();
        } else if (deltaX < -50) {
            // Swipe para a direita (item anterior)
            showPrev();
        }
    });
}


async function carregarMaisServicos() {
    if (loading) return;
    loading = true;

    // Obter os parâmetros da URL
    const urlParams = new URLSearchParams(window.location.search);
    const serviceType = urlParams.get('serviceType');
    const cep = urlParams.get('cep');
    const street = urlParams.get('street');
    const neighborhood = urlParams.get('neighborhood');
    const city = urlParams.get('city');
    const state = urlParams.get('state');
    const urgency = urlParams.get('urgency');
    const localizacaoImportante = urlParams.get('localizacaoImportante') === 'true';
    const clienteId = urlParams.get('cliente_id');  // Adicionando o cliente_id


    console.log(`Buscando serviços com os filtros: serviceType=${serviceType}, cep=${cep}, neighborhood=${neighborhood}, city=${city}, state=${state}, urgency=${urgency}, localizacaoImportante=${localizacaoImportante}`);



    // Incluindo o cliente_id na chamada fetch
    const response = await fetch(`/get_services?page=${page}&per_page=5&serviceType=${serviceType}&cep=${cep}&neighborhood=${neighborhood}&city=${city}&state=${state}&urgency=${urgency}&localizacaoImportante=${localizacaoImportante}&cliente_id=${clienteId}`);
    const data = await response.json();

    console.log(`Número de serviços encontrados: ${data.services.length}`);
    const container = document.getElementById('services-container');

    if (!data.services || data.services.length === 0) {
        console.log("Nenhum serviço encontrado.");
        loading = false;
        return;
    }

    data.services.forEach((service, index) => {
        console.log(`Carregando serviço ${index + 1}: ${service.person_name}, ${service.service_name}`);
        
        const serviceElement = document.createElement('div');
        serviceElement.classList.add('service');
    
        let galleryItems = '';
        let itemIndex = 0;
    
        galleryItems += service.images.map(imgId => `<img src="/uploads/img/${imgId}" alt="${service.service_name}" class="${itemIndex++ === 0 ? 'active' : ''}">`).join('');
    
        galleryItems += service.videos.map(vidId => 
            `<video src="/uploads/video/${vidId}" controls class="${itemIndex++ === 0 ? 'active' : ''}"></video>`
        ).join('');
        console.log('id do prestador', service)

        serviceElement.innerHTML = `
            <div class="titulo-container">
                <h1>Serviços Disponíveis</h1>
                <h3 class="tituloAvaliacao">${service.service_name}</h3>
            </div>

            <div class="gallery">
                ${galleryItems}
                <div class="video-container">
                    <div class="video-description active">
                        <div class="responsavel-info" id="responsavel-${service.id}">
                            <div class="perfil-foto" style="background-image: url('/uploads/img/${service.perfil_foto}');"></div>
                            <p>${service.person_name}</p>
                        </div>
    
                        <p><strong>Nota:</strong> ${service.rating !== null ? service.rating : 'N/A'}</p>
                        <p><strong>Descrição:</strong> 
                            <span class="short-description">${service.description.substring(0, 50)}...</span> 
                            <span class="full-description" style="display: none;">${service.description}</span>
                            <button class="read-more-btn">Ler mais</button>
                        </p>
                    </div>
                </div>
    
                <div class="navigation-buttons-horizontal">
                    <button class="prev">&laquo;</button>
                    <button class="next">&raquo;</button>
                </div>
    
                <button class="solicitar-servico-btn">✅</button>
            </div>
        `;
    
        container.appendChild(serviceElement);
        servicesElements.push(serviceElement);  // Adiciona o serviço à lista de serviços
    
        // Adicionando o evento de clique na foto e no nome para abrir o perfil do prestador
        const responsavelInfo = serviceElement.querySelector(`#responsavel-${service.id}`);
                // Adiciona os listeners aos botões de navegação após criá-los
                const nextButton = serviceElement.querySelector('.next');
                const prevButton = serviceElement.querySelector('.prev');
        
                // Função para mostrar os botões quando o mouse está sobre eles
                const mostrarBotoes = () => {
                    clearTimeout(inactivityTimeout);
                    nextButton.classList.remove('invisible');
                    prevButton.classList.remove('invisible');
                };
        
                // Função para iniciar o temporizador de invisibilidade após o mouse sair
                const iniciarTemporizador = () => {
                    inactivityTimeout = setTimeout(() => {
                        nextButton.classList.add('invisible');
                        prevButton.classList.add('invisible');
                    }, 2500); // 2,5 segundos
                };
        
                // Adiciona os eventos de hover aos botões
                nextButton.addEventListener('mouseenter', mostrarBotoes);
                nextButton.addEventListener('mouseleave', iniciarTemporizador);
                prevButton.addEventListener('mouseenter', mostrarBotoes);
                prevButton.addEventListener('mouseleave', iniciarTemporizador);
        
                // Adiciona o serviceElement ao contêiner
                container.appendChild(serviceElement);

        // Verificação se o elemento foi encontrado
        if (responsavelInfo) {
            responsavelInfo.addEventListener('click', () => {
                const urlParams = new URLSearchParams(window.location.search);
                const clienteId = urlParams.get('cliente_id');  // Capturar o cliente_id da URL
                
                // Redirecionar para o perfil do prestador, passando o prestador_id e cliente_id na URL
                window.location.href = `/perfil_prestador?prestador_id=${service.id}&cliente_id=${clienteId}`;
            });
        }else {
            // Adiciona log para verificar se o ID está correto
            console.log(`Elemento #responsavel-${service.id} não encontrado. Verifique o DOM.`);
        }

        
        // Verificar se o elemento foi adicionado corretamente
        console.log(`Serviço adicionado ao container: ${service.person_name}, ID do elemento: ${serviceElement.id}`);

        // Configurar os botões e navegação (conforme seu código original)
        const solicitarServicoBtn = serviceElement.querySelector('.solicitar-servico-btn');
        if (solicitarServicoBtn) {
            solicitarServicoBtn.addEventListener('click', () => {
                abrirPopupSolicitacao(service.id);  // Passar o objeto `service` como parâmetro
            });
        }
        
        // Adicionar evento de navegação à galeria horizontal
        const gallery = serviceElement.querySelector('.gallery');
        const videoDescription = serviceElement.querySelector('.video-description');
        let activeIndex = 0;

        // Capturar apenas imagens e vídeos, excluindo .perfil-foto
        const imagesAndVideos = gallery.querySelectorAll('img:not(.perfil-foto), video');
        console.log(`Elementos de galeria capturados para o serviço ${service.person_name}: ${imagesAndVideos.length}`);
        
        if (videoDescription) {
            videoDescription.classList.add('active'); // Deixe a descrição ativa
        }

        function showNext() {
            const currentItem = imagesAndVideos[activeIndex];
            currentItem.classList.remove('active');
            currentItem.classList.add('slide-left'); // Animação para sair pela esquerda

            activeIndex = (activeIndex + 1) % imagesAndVideos.length;

            const nextItem = imagesAndVideos[activeIndex];
            nextItem.classList.remove('slide-left', 'slide-right');
            nextItem.classList.add('active'); // Ativa o próximo item

            // Atualiza a descrição e o botão de solicitação para o primeiro item do carrossel horizontal
            if (activeIndex === 0) {
                videoDescription.classList.add('active'); // Aplica fade in para a descrição
                videoDescription.classList.remove('hidden'); // Remove a classe que esconde
                if (solicitarServicoBtn) {
                    solicitarServicoBtn.classList.add('active'); // Aplica fade in para o botão
                    solicitarServicoBtn.classList.remove('hidden'); // Remove a classe que esconde o botão
                }
            } else {
                videoDescription.classList.remove('active'); // Esconde a descrição
                videoDescription.classList.add('hidden'); // Adiciona a classe que esconde a descrição
                if (solicitarServicoBtn) {
                    solicitarServicoBtn.classList.remove('active'); // Esconde o botão
                    solicitarServicoBtn.classList.add('hidden'); // Adiciona a classe que esconde o botão
                }
            }
        }

        function showPrev() {
            const currentItem = imagesAndVideos[activeIndex];
            currentItem.classList.remove('active');
            currentItem.classList.add('slide-right'); // Animação para sair pela direita

            activeIndex = (activeIndex - 1 + imagesAndVideos.length) % imagesAndVideos.length;

            const prevItem = imagesAndVideos[activeIndex];
            prevItem.classList.remove('slide-left', 'slide-right');
            prevItem.classList.add('active'); // Ativa o item anterior

            // Atualiza a descrição e o botão de solicitação para o primeiro item do carrossel horizontal
            if (activeIndex === 0) {
                videoDescription.classList.add('active'); // Aplica fade in para a descrição
                videoDescription.classList.remove('hidden'); // Remove a classe que esconde
                if (solicitarServicoBtn) {
                    solicitarServicoBtn.classList.add('active'); // Aplica fade in para o botão
                    solicitarServicoBtn.classList.remove('hidden'); // Remove a classe que esconde o botão
                }
            } else {
                videoDescription.classList.remove('active'); // Esconde a descrição
                videoDescription.classList.add('hidden'); // Adiciona a classe que esconde a descrição
                if (solicitarServicoBtn) {
                    solicitarServicoBtn.classList.remove('active'); // Esconde o botão
                    solicitarServicoBtn.classList.add('hidden'); // Adiciona a classe que esconde o botão
                }
            }
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
                        abrirPopupSolicitacao(prestadorId);
                    }
                })
                .catch(error => {
                    console.error('Erro ao verificar o serviço:', error);
                    alert("Erro ao verificar o serviço. Tente novamente.");
                });
        }
        
        
        function abrirPopupSolicitacao(serviceId) {
            // Aqui você já tem o prestadorId, que pode ser usado ao confirmar a solicitação
        // Fazer uma requisição para o servidor buscando os detalhes do serviço pelo ID
        fetch(`/api/servico/${serviceId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao buscar os detalhes do serviço');
                }
                return response.json();
            })
            .then(service => {
                let tipoServicoLegivel = '';
                
                switch (service.service_name) {
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
    
                // Preencher os campos no popup com os dados recebidos
                document.getElementById('tipoServico').textContent = tipoServicoLegivel;
                document.getElementById('descricaoServico').textContent = service.descricao || 'Sem descrição disponível';  // Adicionando a descrição
                document.getElementById('orcamentoServico').value = service.orcamento;
                document.getElementById('urgenciaServico').value = service.urgencia;
                document.getElementById('dataContatoServico').value = service.data_contato;
    
                // Preencher os novos campos (localização, rua, bairro, etc.)
                document.getElementById('localizacaoServico').textContent = service.localizacao || 'N/A';
                document.getElementById('ruaServico').textContent = service.rua || 'N/A';
                document.getElementById('bairroServico').textContent = service.bairro || 'N/A';
                document.getElementById('cidadeServico').textContent = service.cidade || 'N/A';
                document.getElementById('estadoServico').textContent = service.estado || 'N/A';
                document.getElementById('metodoContatoServico').textContent = service.metodo_contato || 'N/A';
    
                // Exibir o popup
                document.getElementById('popupSolicitacao').style.display = 'flex';
                            // Passar o serviceId para a função de confirmação
            document.getElementById('confirmarBtn').onclick = function() {
                confirmarSolicitacao(serviceId);
            };
            })
            .catch(error => {
                console.error('Erro ao buscar os detalhes do serviço:', error);
            });
        }
        
        // Verificar se os botões de navegação existem antes de adicionar o evento
        const nextBtn = serviceElement.querySelector('.next');
        const prevBtn = serviceElement.querySelector('.prev');
        
        if (nextBtn && prevBtn) {
            nextBtn.addEventListener('click', showNext);
            prevBtn.addEventListener('click', showPrev);
        }
        
        // Esconder botões de navegação se for um dispositivo móvel
        hideNavigationButtonsIfMobile(serviceElement);
        
        // Adicionar suporte ao swipe no mobile para o carrossel horizontal
        if (isMobileDevice) {
            enableSwipeNavigation(gallery, showNext, showPrev); // Habilitar navegação por swipe
        }
    });
    
    if (data.has_more) {
        page++;
    }
    
    console.log(`Total de perfis carregados até agora: ${servicesElements.length}`);
    
    if (servicesElements.length > 0) {
        servicesElements[0].classList.add('active'); // Ativa o primeiro serviço carregado
        console.log(`Primeiro serviço ativado: ${servicesElements[0].querySelector('h3').textContent}`);
    }
    
    loading = false;
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
        // Função para fechar o popup de solicitação
        function fecharPopupSolicitacao() {
            document.getElementById('popupSolicitacao').style.display = 'none';
            document.body.classList.remove('no-scroll'); // Reativar o scroll do body
        }

        // Função para confirmar a solicitação de serviço
        function confirmarSolicitacao(serviceId) {
            const orcamento = document.getElementById('orcamentoServico').value;
            const urgencia = document.getElementById('urgenciaServico').value;
            const dataContato = document.getElementById('dataContatoServico').value;
            const horaContato = document.getElementById('horaContatoServico').value;
            const mensagemCliente = document.getElementById('mensagemCliente').value;
        
            // Dados adicionais não editáveis
            const tipoServico = document.getElementById('tipoServico').textContent;
            const descricao = document.getElementById('descricaoServico').textContent;
            const localizacao = document.getElementById('localizacaoServico').textContent;
            const rua = document.getElementById('ruaServico').textContent;
            const bairro = document.getElementById('bairroServico').textContent;
            const cidade = document.getElementById('cidadeServico').textContent;
            const estado = document.getElementById('estadoServico').textContent;
            const metodoContato = document.getElementById('metodoContatoServico').textContent;
        
            if (!serviceId) {
                alert("Erro: ID do serviço não encontrado!");
                return;
            }
        
            // Enviar a solicitação ao servidor
            fetch('/api/solicitar_servico_confirmar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    prestador_id: serviceId,  // Passando o serviceId corretamente
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
        

document.addEventListener('click', function(event) {
        if (event.target.classList.contains('read-more-btn')) {
            const btn = event.target;
            const descriptionContainer = btn.parentElement; // Obtém o contêiner pai
            const shortDescription = descriptionContainer.querySelector('.short-description');
            const fullDescription = descriptionContainer.querySelector('.full-description');
            
            if (fullDescription.style.display === 'none') {
                fullDescription.style.display = 'block'; // Mostra a descrição completa
                shortDescription.style.display = 'none'; // Esconde a descrição curta
                btn.textContent = 'Ler menos';
            } else {
                fullDescription.style.display = 'none'; // Esconde a descrição completa
                shortDescription.style.display = 'inline'; // Mostra a descrição curta
                btn.textContent = 'Ler mais';
            }
        }
    });


function resetHorizontalCarousel(serviceElement) {
    const gallery = serviceElement.querySelector('.gallery');
    const videoDescription = serviceElement.querySelector('.video-description');
    const nextButton = serviceElement.querySelector('.next'); // Botão próximo
    const prevButton = serviceElement.querySelector('.prev'); // Botão anterior
    const solicitarServicoBtn = serviceElement.querySelector('.solicitar-servico-btn');
    const toggleButton = document.getElementById('toggleViewBtn'); // Obtém o botão de alternância
    const descriptionContainers = serviceElement.querySelectorAll('.description-container'); // Contêineres de descrição
    let activeIndex = 0;

    // Capturar apenas imagens e vídeos, excluindo .perfil-foto
    const imagesAndVideos = gallery.querySelectorAll('img:not(.perfil-foto), video');

    // Resetar a posição do carrossel para o primeiro item
    imagesAndVideos.forEach((item, index) => {
        item.classList.remove('active', 'slide-left', 'slide-right');
        if (index === 0) {
            item.classList.add('active');
        }
    });

    // Resetar a descrição e o botão de solicitação
    if (videoDescription) {
        videoDescription.classList.add('active');
        videoDescription.classList.remove('hidden');
    }

    if (solicitarServicoBtn) {
        solicitarServicoBtn.classList.add('active');
        solicitarServicoBtn.classList.remove('hidden');
    }

    // Garantir que a galeria esteja no modo de visualização padrão (remover 'full-view')
    gallery.classList.remove('full-view');
    prevButton.classList.remove('full-view-prev');
    nextButton.classList.remove('full-view-next');

    // Resetar o texto do botão para "Ver Imagem Completa" com o ícone de zoom
    if (toggleButton) {
        const imagemCompletaIcon = `<img src="${zoomIconPath}" alt="Zoom Mais" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 5px;">`;
        toggleButton.innerHTML = `${imagemCompletaIcon} Ver Imagem Completa`;
    }

    // Remove os estilos de tamanho aplicados anteriormente para todas as mídias
    imagesAndVideos.forEach(media => {
        media.style.width = '';
        media.style.height = '';
        prevButton.style.top = '';
        prevButton.style.left = '';
        nextButton.style.top = '';
        nextButton.style.right = '';
    });

    // Resetar o estado do botão "Ler Mais" para todas as descrições
    descriptionContainers.forEach(container => {
        const shortDescription = container.querySelector('.short-description');
        const fullDescription = container.querySelector('.full-description');
        const readMoreButton = container.querySelector('.read-more-btn');

        if (shortDescription && fullDescription && readMoreButton) {
            shortDescription.style.display = 'inline'; // Exibe a descrição curta
            fullDescription.style.display = 'none'; // Esconde a descrição completa
            readMoreButton.textContent = 'Ler mais'; // Restaura o texto do botão
        }
    });
}
    


function showNextService() {
    if (isAnimating || servicesElements.length === 0) return; // Se a animação estiver em andamento ou se não houver serviços, sair da função
    isAnimating = true; // Marcar que a animação começou

    // Verificar se o índice atual é válido antes de remover a classe
    if (servicesElements[activeServiceIndex]) {
        // Esconder o serviço atual
        servicesElements[activeServiceIndex].classList.remove('active');
        servicesElements[activeServiceIndex].classList.add('hidden'); // Adiciona classe hidden para ocultar

        // Evento de transição para garantir que a próxima ação só ocorra após a transição terminar
        servicesElements[activeServiceIndex].addEventListener('transitionend', function handler() {
            servicesElements[activeServiceIndex].removeEventListener('transitionend', handler); // Remover o listener após a transição
            isAnimating = false; // Marcar que a animação terminou
        });
    }

    // Atualizar o índice do próximo serviço, garantindo que ele seja cíclico
    activeServiceIndex = (activeServiceIndex + 1) % servicesElements.length;

    // Verificar se o próximo índice é válido antes de adicionar a classe
    if (servicesElements[activeServiceIndex]) {
        // Mostrar o próximo serviço
        servicesElements[activeServiceIndex].classList.add('active');
        servicesElements[activeServiceIndex].classList.remove('hidden'); // Remove a classe hidden

        // Resetar o carrossel horizontal do novo serviço
        resetHorizontalCarousel(servicesElements[activeServiceIndex]);
    }
}


function showPrevService() {
    if (isAnimating || servicesElements.length === 0) return; // Se a animação estiver em andamento ou se não houver serviços, sair da função
    isAnimating = true; // Marcar que a animação começou

    // Verificar se o índice atual é válido antes de remover a classe
    if (servicesElements[activeServiceIndex]) {
        // Esconder o serviço atual
        servicesElements[activeServiceIndex].classList.remove('active');
        servicesElements[activeServiceIndex].classList.add('hidden'); // Adiciona classe hidden para ocultar

        // Evento de transição para garantir que a próxima ação só ocorra após a transição terminar
        servicesElements[activeServiceIndex].addEventListener('transitionend', function handler() {
            servicesElements[activeServiceIndex].removeEventListener('transitionend', handler); // Remover o listener após a transição
            isAnimating = false; // Marcar que a animação terminou
        });
    }

    // Atualizar o índice do serviço anterior, garantindo que ele seja cíclico
    activeServiceIndex = (activeServiceIndex - 1 + servicesElements.length) % servicesElements.length;

    // Verificar se o próximo índice é válido antes de adicionar a classe
    if (servicesElements[activeServiceIndex]) {
        // Mostrar o serviço anterior
        servicesElements[activeServiceIndex].classList.add('active');
        servicesElements[activeServiceIndex].classList.remove('hidden'); // Remove a classe hidden

        // Resetar o carrossel horizontal do serviço anterior
        resetHorizontalCarousel(servicesElements[activeServiceIndex]);
    }
}

let inactivityTimeout; // Variável para o temporizador de inatividade

function ajustarPosicaoBotoes() {
    const activeService = servicesElements[activeServiceIndex];
    const gallery = activeService.querySelector('.gallery');
    const nextButton = activeService.querySelector('.next');
    const prevButton = activeService.querySelector('.prev');
    const media = gallery.querySelector('img, video'); // Seleciona a mídia visível atual

    if (media) {
        const mediaHeight = media.offsetHeight;

        if (nextButton) {
            nextButton.style.top = `calc(50% - ${nextButton.offsetHeight / 2}px)`;
            nextButton.style.right = `-260px`; // Ajuste conforme necessário
            nextButton.classList.remove('invisible'); // Remove a invisibilidade
        }

        if (prevButton) {
            prevButton.style.top = `calc(50% - ${prevButton.offsetHeight / 2}px)`;
            prevButton.style.left = `-260px`; // Ajuste conforme necessário
            prevButton.classList.remove('invisible'); // Remove a invisibilidade
        }

        // Limpa o temporizador anterior e define um novo temporizador de 2,5 segundos
        clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(() => {
            if (nextButton) nextButton.classList.add('invisible');
            if (prevButton) prevButton.classList.add('invisible');
        }, 2500); // 2,5 segundos
    }
}


function toggleView() {
    const activeService = servicesElements[activeServiceIndex];
    const gallery = activeService.querySelector('.gallery');
    const mediaElements = gallery.querySelectorAll('img, video');
    const toggleButton = document.getElementById('toggleViewBtn');
    const nextButton = activeService.querySelector('.next');
    const prevButton = activeService.querySelector('.prev');

    if (!gallery || mediaElements.length === 0) return;

    gallery.classList.toggle('full-view');

    if (gallery.classList.contains('full-view')) {
        mediaElements.forEach(media => {
            media.style.width = 'auto';
            media.style.height = 'auto';
        });

        if (nextButton) nextButton.classList.add('full-view-next');
        if (prevButton) prevButton.classList.add('full-view-prev');

        setTimeout(() => ajustarPosicaoBotoes(), 100);

        const imagemPadraoIcon = `<img src="${zoomIconPathLess}" alt="Zoom Menos" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 5px;">`;
        toggleButton.innerHTML = `${imagemPadraoIcon} Ver Imagem Padrão`;
    } else {
        mediaElements.forEach(media => {
            media.style.width = '';
            media.style.height = '';
        });

        if (nextButton) {
            nextButton.classList.remove('full-view-next');
            nextButton.style.top = '';
            nextButton.style.right = '';
            nextButton.style.left = '220px';
        }
        if (prevButton) {
            prevButton.classList.remove('full-view-prev');
            prevButton.style.top = '';
            prevButton.style.left = '-144px';
        }
        const toggleButton = document.getElementById('toggleViewBtn');
        if (toggleButton) {
            const imagemCompletaIcon = `<img src="${zoomIconPath}" alt="Zoom Mais" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 5px;">`;
            toggleButton.innerHTML = `${imagemCompletaIcon} Ver Imagem Completa`;
        }
        
        
        
    }
}




window.onload = function() {
    carregarMaisServicos();

    // Verifica se é um dispositivo móvel e ativa o toque
    if (isMobileDevice) {
        enableTouchNavigation(); // Ativar navegação por toque em dispositivos móveis
    } else {
        enableScrollAndKeyboardNavigation(); // Ativar navegação por scroll e teclado em desktops

        // Adicionar navegação vertical ao clicar nas setas
        const nextBtn = document.querySelector('.vertical-next');
        const prevBtn = document.querySelector('.vertical-prev');

        if (nextBtn && prevBtn) { // Verifica se os botões existem antes de adicionar o evento
            nextBtn.addEventListener('click', showNextService);
            prevBtn.addEventListener('click', showPrevService);
        } else {
            console.log('Botões de navegação vertical não encontrados.');
        }
    }
};


function isModalOpen() {
    return document.getElementById('alterarDescricaoModal').classList.contains('show') ||
           document.getElementById('statusConvitePopup').style.display === "block" ||
           document.getElementById('popupSolicitacao').style.display === "flex" ||
           document.getElementById('popupAvaliacao').style.display === "flex";
}
// Função para navegação por scroll e teclado (para desktop)
function enableScrollAndKeyboardNavigation() {
    // Adicionar navegação por rotação do scroll do mouse
    window.addEventListener('wheel', function(event) {
        if (isModalOpen()) return; // Se o modal estiver aberto, ignorar o evento

        if (event.deltaY < 0) {
            showPrevService();
        } else if (event.deltaY > 0) {
            showNextService();
        }
    });

    // Adicionar navegação pelas teclas do teclado
    window.addEventListener('keydown', function(event) {
        if (isModalOpen()) return; // Se o modal estiver aberto, ignorar o evento

        if (event.key === 'ArrowUp') {
            showPrevService();
        } else if (event.key === 'ArrowDown') {
            showNextService();
        }
    });
}

// Chamar a função de navegação por scroll e teclado
enableScrollAndKeyboardNavigation();
// Função para navegação por toque (swipe) em dispositivos móveis
function enableTouchNavigation() {
    let startY = 0;

    // Detecta o início do toque
    window.addEventListener('touchstart', function(event) {
        startY = event.touches[0].clientY;
    });

    // Detecta o final do toque e verifica a direção do swipe
    window.addEventListener('touchend', function(event) {
        const endY = event.changedTouches[0].clientY;
        const deltaY = startY - endY;

        if (deltaY > 50) {
            // Swipe para cima (próximo serviço)
            showNextService();
        } else if (deltaY < -50) {
            // Swipe para baixo (serviço anterior)
            showPrevService();
        }
    });
}




