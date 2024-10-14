// Variável global para indicar se é um dispositivo móvel
let isMobileDevice = false;

document.addEventListener("DOMContentLoaded", function() {
    function isMobile() {
        isMobileDevice = /Mobi|Android|iPhone/i.test(navigator.userAgent);

        if (isMobileDevice) {
            console.log('Dispositivo móvel detectado.');

            // Remover os botões de navegação vertical diretamente pelo container pai
            const verticalNav = document.querySelector('.navigation-buttons-vertical');
            if (verticalNav) {
                const buttons = verticalNav.querySelectorAll('button');  // Seleciona todos os botões dentro do container
                buttons.forEach(button => button.remove());  // Remove cada botão
                console.log('Botões de navegação vertical removidos.');
            }

            // Remover todas as classes e estilos inline (só depois da remoção dos botões)
            const allElements = document.querySelectorAll('*');
            allElements.forEach(element => {
                element.className = '';  // Remove todas as classes
                element.removeAttribute('style');  // Remove todos os estilos inline
            });

            console.log('Estilos e classes removidos para dispositivos móveis.');

            // Carregar o CSS específico para mobile
            const mobileStyle = document.createElement('link');
            mobileStyle.rel = 'stylesheet';
            mobileStyle.href = '/static/css/css_mobile.css';  // Certifique-se que o caminho está correto
            document.head.appendChild(mobileStyle);
            console.log('CSS para mobile carregado.');

            // Aplicar zoom máximo por padrão
            document.body.classList.add('zoom-max');

            // Adicionar os botões de zoom in e zoom out
            const zoomButtonsContainer = document.createElement('div');
            zoomButtonsContainer.classList.add('zoom-buttons');

            const zoomInButton = document.createElement('button');
            zoomInButton.innerText = '+';
            const zoomOutButton = document.createElement('button');
            zoomOutButton.innerText = '-';

            zoomButtonsContainer.appendChild(zoomInButton);
            zoomButtonsContainer.appendChild(zoomOutButton);
            document.body.appendChild(zoomButtonsContainer);

            // Função para aplicar zoom máximo
            zoomInButton.addEventListener('click', function() {
                document.body.classList.remove('zoom-min');
                document.body.classList.add('zoom-max');
            });

            // Função para aplicar zoom mínimo
            zoomOutButton.addEventListener('click', function() {
                document.body.classList.remove('zoom-max');
                document.body.classList.add('zoom-min');
            });

            console.log('Funções de zoom adicionadas.');
        }

        return isMobileDevice;
    }

    // Chama a função quando o DOM estiver pronto
    isMobile();
});
