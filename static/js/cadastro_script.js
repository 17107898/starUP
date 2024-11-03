// Selecionar elementos
const initialScreen = document.getElementById('initialScreen');
const loginScreen = document.getElementById('loginScreen');
const registerScreen = document.getElementById('registerScreen');

// Botões de navegação
const loginButton = document.getElementById('loginButton');
const registerButton = document.getElementById('registerButton');
const registerClientButton = document.getElementById('registerClientButton');
const registerProviderButton = document.getElementById('registerProviderButton');

// Mostrar a tela de login
loginButton.addEventListener('click', () => {
    initialScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
});

// Mostrar a tela de cadastro
registerButton.addEventListener('click', () => {
    initialScreen.classList.add('hidden');
    registerScreen.classList.remove('hidden');
});

// Redirecionar para a página de cadastro de cliente
registerClientButton.addEventListener('click', () => {
    window.location.href = "/cadastro_cliente"; // Rota da página de cadastro de cliente
});

// Redirecionar para a página de cadastro de prestador
registerProviderButton.addEventListener('click', () => {
    window.location.href = "/cadastro_prestador"; // Rota da página de cadastro de prestador
});



document.addEventListener('DOMContentLoaded', function () {
    const images = document.querySelectorAll('.carousel-image');
    let currentIndex = 0;

    function showNextImage() {
        images[currentIndex].classList.remove('active');
        currentIndex = (currentIndex + 1) % images.length;
        images[currentIndex].classList.add('active');
    }

    // Inicializa o carrossel
    images[currentIndex].classList.add('active');

    // Define a mudança de imagem a cada 5 segundos
    setInterval(showNextImage, 5000);
});



document.addEventListener('DOMContentLoaded', function () {
    const clientes = document.querySelector('.clientes');
    const prestadores = document.querySelector('.prestadores');

    // Função para verificar se o elemento está visível na tela
    function isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
            rect.bottom > 0
        );
    }

    // Função para aplicar a animação
    function checkScroll() {
        if (isElementInViewport(clientes)) {
            clientes.classList.add('animate-left');
        } else {
            clientes.classList.remove('animate-left'); // Remove animação ao rolar para cima
        }

        if (isElementInViewport(prestadores)) {
            prestadores.classList.add('animate-right');
        } else {
            prestadores.classList.remove('animate-right'); // Remove animação ao rolar para cima
        }
    }

    // Verificar o scroll sempre que o usuário rolar a página
    window.addEventListener('scroll', checkScroll);

    // Executa uma verificação inicial para ver se os elementos já estão na viewport
    checkScroll();
});
