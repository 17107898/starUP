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

    // Obter filtros da URL
    const urlParams = new URLSearchParams(window.location.search);
    const serviceType = urlParams.get('serviceType');
    const cep = urlParams.get('cep');
    const street = urlParams.get('street');
    const neighborhood = urlParams.get('neighborhood');
    const city = urlParams.get('city');
    const state = urlParams.get('state');
    const urgency = urlParams.get('urgency');

    console.log(`Buscando serviços com os filtros: serviceType=${serviceType}, cep=${cep}, neighborhood=${neighborhood}, city=${city}, state=${state}, urgency=${urgency}`);

    // Fazer a requisição para pegar os serviços paginados com os filtros aplicados
    const response = await fetch(`/get_services?page=${page}&per_page=5&serviceType=${serviceType}&cep=${cep}&neighborhood=${neighborhood}&city=${city}&state=${state}&urgency=${urgency}`);
    const data = await response.json();

    console.log(`Número de serviços encontrados: ${data.services.length}`);

    const container = document.getElementById('services-container');

    // Verificar se há serviços retornados
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
            <h3>${service.service_name}</h3>
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
        // Adicionando o evento de clique na foto e no nome para abrir o perfil do prestador
        const responsavelInfo = serviceElement.querySelector(`#responsavel-${service.id}`);

        // Verificação se o elemento foi encontrado
        if (responsavelInfo) {
            responsavelInfo.addEventListener('click', () => {
                window.location.href = `/perfil_prestador?prestador_id=${service.id}`;
            });
        } else {
            // Adiciona log para verificar se o ID está correto
            console.log(`Elemento #responsavel-${service.id} não encontrado. Verifique o DOM.`);
        }

        
        // Verificar se o elemento foi adicionado corretamente
        console.log(`Serviço adicionado ao container: ${service.person_name}, ID do elemento: ${serviceElement.id}`);

        // Configurar os botões e navegação (conforme seu código original)
        const solicitarServicoBtn = serviceElement.querySelector('.solicitar-servico-btn');
        if (solicitarServicoBtn) {
            solicitarServicoBtn.addEventListener('click', () => {
                alert(`Solicitando o serviço: ${service.name}`);
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


document.addEventListener('click', function(event) {
    if (event.target.classList.contains('read-more-btn')) {
        const btn = event.target;
        const shortDescription = btn.previousElementSibling.previousElementSibling;
        const fullDescription = btn.previousElementSibling;
        
        if (fullDescription.style.display === 'none') {
            fullDescription.style.display = 'inline';
            shortDescription.style.display = 'none';
            btn.textContent = 'Ler menos';
        } else {
            fullDescription.style.display = 'none';
            shortDescription.style.display = 'inline';
            btn.textContent = 'Ler mais';
        }
    }
});

function resetHorizontalCarousel(serviceElement) {
    const gallery = serviceElement.querySelector('.gallery');
    const videoDescription = serviceElement.querySelector('.video-description');
    const solicitarServicoBtn = serviceElement.querySelector('.solicitar-servico-btn');
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


// Função para navegação por scroll e teclado (para desktop)
function enableScrollAndKeyboardNavigation() {
    // Adicionar navegação por rotação do scroll do mouse
    window.addEventListener('wheel', function(event) {
        if (event.deltaY < 0) {
            // Rolagem para cima, chamar função para serviço anterior
            showPrevService();
        } else if (event.deltaY > 0) {
            // Rolagem para baixo, chamar função para próximo serviço
            showNextService();
        }
    });

    // Adicionar navegação pelas teclas do teclado
    window.addEventListener('keydown', function(event) {
        if (event.key === 'ArrowUp') {
            // Seta para cima, chamar função para serviço anterior
            showPrevService();
        } else if (event.key === 'ArrowDown') {
            // Seta para baixo, chamar função para próximo serviço
            showNextService();
        }
    });
}

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