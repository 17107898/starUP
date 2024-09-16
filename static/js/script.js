let page = 1;
let loading = false;
let activeServiceIndex = 0; // Índice do serviço ativo no carrossel vertical
let servicesElements = []; // Para armazenar os serviços carregados
let isAnimating = false; // Variável para controlar se a animação está em andamento

async function carregarMaisServicos() {
    if (loading) return;
    loading = true;

    const response = await fetch(`/get_services?page=${page}&per_page=5`);
    const data = await response.json();

    const container = document.getElementById('services-container');
    
    data.services.forEach(service => {
        const serviceElement = document.createElement('div');
        serviceElement.classList.add('service');
        
        // Criar a galeria de imagens e vídeos com navegação
        let galleryItems = '';
        let itemIndex = 0;

        // Montar galeria com imagens
        galleryItems += service.images.map(img => `<img src="/static/${img}" alt="${service.name}" class="${itemIndex++ === 0 ? 'active' : ''}">`).join('');

        // Montar galeria com vídeos
        galleryItems += service.videos.map(vid => `<video src="/static/${vid}" controls class="${itemIndex++ === 0 ? 'active' : ''}"></video>`).join('');

        // Montar elemento de navegação horizontal e vertical
        serviceElement.innerHTML = `
            <h3>${service.name}</h3>
            <p>${service.description}</p>
            <div class="gallery">
                ${galleryItems}
                <div class="navigation-buttons-horizontal">
                    <button class="prev">&laquo;</button>
                    <button class="next">&raquo;</button>
                </div>
            </div>
        `;
        
        container.appendChild(serviceElement);
        servicesElements.push(serviceElement); // Adiciona o serviço à lista de serviços

        // Adicionar evento de navegação à galeria horizontal
        const gallery = serviceElement.querySelector('.gallery');
        let activeIndex = 0;
        const imagesAndVideos = gallery.querySelectorAll('img, video');

        function showNext() {
            const currentItem = imagesAndVideos[activeIndex];
            currentItem.classList.remove('active');
            currentItem.classList.add('slide-left'); // Adiciona a animação para sair pela esquerda
        
            // Atualiza o índice ativo e reinicia se for o último item
            activeIndex = (activeIndex + 1) % imagesAndVideos.length;
        
            const nextItem = imagesAndVideos[activeIndex];
            nextItem.classList.remove('slide-left', 'slide-right'); // Remover as classes de animação, se existirem
            nextItem.classList.add('active'); // Ativa o próximo item
        }
        
        function showPrev() {
            const currentItem = imagesAndVideos[activeIndex];
            currentItem.classList.remove('active');
            currentItem.classList.add('slide-right'); // Adiciona a animação para sair pela direita
        
            // Atualiza o índice ativo e volta ao primeiro se for o primeiro item
            activeIndex = (activeIndex - 1 + imagesAndVideos.length) % imagesAndVideos.length;
        
            const prevItem = imagesAndVideos[activeIndex];
            prevItem.classList.remove('slide-left', 'slide-right'); // Remover as classes de animação, se existirem
            prevItem.classList.add('active'); // Ativa o item anterior
        }
        

        gallery.querySelector('.next').addEventListener('click', showNext);
        gallery.querySelector('.prev').addEventListener('click', showPrev);
    });

    if (data.has_more) {
        page++;
    }

    // Mostrar o primeiro serviço se ainda não houver nenhum serviço visível
    if (servicesElements.length === data.services.length) {
        servicesElements[0].classList.add('active'); // Ativa o primeiro serviço carregado
    }

    loading = false;
}



// Função para exibir o próximo serviço (carrossel vertical)
function showNextService() {
    if (isAnimating) return; // Se a animação estiver em andamento, sair da função
    isAnimating = true; // Marcar que a animação começou

    // Esconder o serviço atual
    servicesElements[activeServiceIndex].classList.remove('active');

    // Evento de transição para garantir que a próxima ação só ocorra após a transição terminar
    servicesElements[activeServiceIndex].addEventListener('transitionend', function handler() {
        servicesElements[activeServiceIndex].removeEventListener('transitionend', handler); // Remover o listener após a transição
        isAnimating = false; // Marcar que a animação terminou
    });

    activeServiceIndex = (activeServiceIndex + 1) % servicesElements.length;
    servicesElements[activeServiceIndex].classList.add('active'); // Mostrar o próximo serviço
}


function showPrevService() {
    if (isAnimating) return; // Se a animação estiver em andamento, sair da função
    isAnimating = true; // Marcar que a animação começou

    // Esconder o serviço atual
    servicesElements[activeServiceIndex].classList.remove('active');

    // Evento de transição para garantir que a próxima ação só ocorra após a transição terminar
    servicesElements[activeServiceIndex].addEventListener('transitionend', function handler() {
        servicesElements[activeServiceIndex].removeEventListener('transitionend', handler); // Remover o listener após a transição
        isAnimating = false; // Marcar que a animação terminou
    });

    activeServiceIndex = (activeServiceIndex - 1 + servicesElements.length) % servicesElements.length;
    servicesElements[activeServiceIndex].classList.add('active'); // Mostrar o serviço anterior
}

// Função que identifica a rotação do scroll do mouse e simula o clique
window.onload = function() {
    carregarMaisServicos();

    // Adicionar navegação vertical ao clicar nas setas
    document.querySelector('.vertical-next').addEventListener('click', showNextService);
    document.querySelector('.vertical-prev').addEventListener('click', showPrevService);
};

// Função que identifica a rotação do scroll do mouse e chama as funções diretamente
window.addEventListener('wheel', function(event) {
    if (event.deltaY < 0) {
        // Rolagem para cima, chamar função para serviço anterior
        showPrevService();
    } else if (event.deltaY > 0) {
        // Rolagem para baixo, chamar função para próximo serviço
        showNextService();
    }
});

// Função que identifica a navegação pelas teclas do teclado
window.addEventListener('keydown', function(event) {
    // Verificar se a tecla pressionada é a seta para cima (keyCode 38) ou seta para baixo (keyCode 40)
    if (event.key === 'ArrowUp') {
        // Seta para cima, chamar função para serviço anterior
        showPrevService();
    } else if (event.key === 'ArrowDown') {
        // Seta para baixo, chamar função para próximo serviço
        showNextService();
    }
});

