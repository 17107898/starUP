let storedDocuments = [];  // Para armazenar as imagens/documentos previamente carregados
let storedVideo = null;  // Para armazenar o vídeo carregado
let landscapeCount = 0;  // Contador global para fotos deitadas

// Atualiza a pré-visualização e validação após a remoção de mídia
function updatePreview() {
    const preview = document.getElementById('preview');
    preview.innerHTML = '';  // Limpa a pré-visualização

    // Mostrar pré-visualização dos documentos
    storedDocuments.forEach((file, index) => {
        const fileElement = document.createElement('div');
        fileElement.classList.add('file-preview');

        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.classList.add('thumbnail');
        fileElement.appendChild(img);

        const removeButton = document.createElement('button');
        removeButton.innerHTML = '&times;';  // Ícone de "X"
        removeButton.addEventListener('click', function () {
            storedDocuments.splice(index, 1);  // Remove o arquivo da lista
            updateFileInput();  // Atualiza o input de arquivos
            updatePreview();  // Atualiza a pré-visualização
            validateImages();  // Verificar novamente o estado das imagens
            checkMediaLimit(); // Verifica a quantidade de mídias para ativar/desativar campos
        });

        fileElement.appendChild(removeButton);
        preview.appendChild(fileElement);
    });

// Mostrar vídeo, se houver
if (storedVideo) {
    const fileElement = document.createElement('div');
    fileElement.classList.add('file-preview');  // Usar o mesmo contêiner para o vídeo

    const videoElement = document.createElement('video');
    videoElement.src = URL.createObjectURL(storedVideo);
    videoElement.controls = true;
    videoElement.classList.add('thumbnail');
    fileElement.appendChild(videoElement);

    const removeButton = document.createElement('button');
    removeButton.innerHTML = '&times;';  // Ícone de "X"
    removeButton.addEventListener('click', function () {
        storedVideo = null;  // Remove o vídeo
        document.getElementById('video').value = '';  // Limpa o campo de vídeo
        updatePreview();  // Atualiza a pré-visualização
        checkMediaLimit(); // Verifica a quantidade de mídias para ativar/desativar campos
    });

    fileElement.appendChild(removeButton);
    preview.appendChild(fileElement);
}


    checkMediaLimit();  // Verifica a quantidade de mídias após atualizar a visualização
}

// Função para validar as imagens
function validateImages() {
    landscapeCount = 0;  // Reseta o contador de fotos deitadas
    let invalidImages = [];
    let extraFiles = storedDocuments.length > 4 ? storedDocuments.slice(4) : [];  // Arquivos excedentes

    // Se houver mais de 4 mídias (documentos + vídeo), mostrar a mensagem de erro e destacar as imagens extras
    if (getTotalMediaCount() > 4) {
        showTemporaryMessage("Você já enviou 4 arquivos, não pode enviar mais mídias.");
        storedDocuments.forEach((file, index) => {
            if (index >= 4) {
                document.querySelectorAll('.file-preview')[index].classList.add('invalid');  // Adiciona classe vermelha
            }
        });
    } else {
        // Se a quantidade de arquivos for válida, verificar a orientação das fotos
        storedDocuments.forEach((file, index) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);

            img.onload = function () {
                if (img.width > img.height) {
                    landscapeCount++;
                }

                if (landscapeCount > 2) {
                    showTemporaryMessage("Você pode enviar no máximo 2 fotos deitadas.");
                    document.querySelectorAll('.file-preview')[index].classList.add('invalid');  // Adiciona classe vermelha
                    invalidImages.push(file);  // Adiciona a imagem à lista de inválidas
                } else {
                    document.querySelectorAll('.file-preview')[index].classList.remove('invalid');  // Remove o destaque vermelho
                }
            };
        });
    }
}

// Função para atualizar o campo de input de arquivos com base nos arquivos armazenados
function updateFileInput() {
    const input = document.getElementById('documents');
    const dataTransfer = new DataTransfer();

    storedDocuments.forEach(file => {
        dataTransfer.items.add(file);
    });

    input.files = dataTransfer.files;  // Atualiza o campo de arquivos
}

// Função para obter a contagem total de mídias (imagens + vídeo)
function getTotalMediaCount() {
    return storedDocuments.length + (storedVideo ? 1 : 0);
}

// Função para verificar o limite de mídias e ativar/desativar os campos de upload
function checkMediaLimit() {
    const totalMedia = storedDocuments.length + (storedVideo ? 1 : 0); // Mídias somam os documentos e o vídeo (se existir)

    // Verifica se atingiu o limite de 4 mídias (documentos + vídeo)
    if (totalMedia >= 4) {
        document.getElementById('video').disabled = true;  // Desabilita o campo de vídeo
        document.getElementById('documents').disabled = true;  // Desabilita o campo de imagens
        document.getElementById('response').textContent = "Você já enviou 4 arquivos, não pode enviar mais mídias."; // Exibe o aviso de limite
    } else {
        // Se houver espaço para mais mídias, habilita os campos de upload
        document.getElementById('video').disabled = false;  
        document.getElementById('documents').disabled = false;
        document.getElementById('response').textContent = '';  // Limpa a mensagem de erro
    }
}


// Evento de mudança no input de arquivos (imagens/documentos)
document.getElementById('documents').addEventListener('change', function () {
    const newFiles = Array.from(this.files);

    // Adicionando novos arquivos à lista armazenada
    storedDocuments = storedDocuments.concat(newFiles);

    // Atualiza a pré-visualização e validação
    updatePreview();
    validateImages();
    checkMediaLimit();  // Verifica se o limite de mídias foi atingido
});

// Evento de mudança no input de vídeo
document.getElementById('video').addEventListener('change', function () {
    if (this.files.length > 0) {
        storedVideo = this.files[0];  // Armazena o vídeo
    }

    // Verifica se já há 4 mídias
    checkMediaLimit();

    // Validação da duração do vídeo (1 minuto no máximo)
    const videoElement = document.createElement('video');
    videoElement.src = URL.createObjectURL(storedVideo);
    videoElement.onloadedmetadata = function () {
        if (videoElement.duration > 60) {
            showTemporaryMessage("O vídeo pode ter no máximo 1 minuto.");

            // Marcar o vídeo como inválido sem removê-lo
            const videoPreview = document.getElementById('video-preview');
            videoPreview.innerHTML = '';  // Limpa a pré-visualização atual

            const fileElement = document.createElement('div');
            fileElement.classList.add('file-preview', 'invalid');  // Adiciona a classe 'invalid' para o contorno vermelho

            const videoElement = document.createElement('video');
            videoElement.src = URL.createObjectURL(storedVideo);
            videoElement.controls = true;
            videoElement.classList.add('thumbnail');
            fileElement.appendChild(videoElement);

            const removeButton = document.createElement('button');
            removeButton.innerHTML = '&times;';
            removeButton.classList.add('remove-btn');
            removeButton.addEventListener('click', function () {
                console.log("Removendo vídeo:", storedVideo.name);
                storedVideo = null;
                document.getElementById('video').value = '';
                updatePreview();
                checkMediaLimit();
            });

            fileElement.appendChild(removeButton);
            videoPreview.appendChild(fileElement);
        } else {
            updatePreview();  // Atualiza a pré-visualização com o vídeo
        }
    };

    checkMediaLimit();  // Verifica se o limite de mídias foi atingido
});

function abrirSeletorArquivos() {
    document.getElementById('documents').click();
}
function abrirSeletorVideo() {
    document.getElementById('video').click();
}
// Função para exibir o aviso temporariamente
function showTemporaryMessage(message) {
    document.getElementById('response').textContent = message;
    setTimeout(() => {
        document.getElementById('response').textContent = '';  // Limpa o aviso após 5 segundos
    }, 5000);
}

// Evento de submissão do formulário
document.getElementById('uploadForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const formData = new FormData();
    const perfilFoto = document.getElementById('perfil_foto').files[0];
    const documents = document.getElementById('documents').files;
    const video = document.getElementById('video').files[0];

    // Adicionar a foto de perfil ao FormData
    if (perfilFoto) {
        formData.append('perfil_foto', perfilFoto);
    }

    // Adicionar os documentos ao FormData
    for (let i = 0; i < documents.length; i++) {
        formData.append('documents', documents[i]);
    }

    // Adicionar o vídeo ao FormData
    if (video) {
        formData.append('video', video);
    }

    // Fazer o upload via fetch
    fetch('/api/upload-midia', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('response').textContent = data.message;

        // Verifica se a resposta inclui um redirecionamento
        if (data.redirect) {
            window.location.href = data.redirect; // Redireciona para a página de login
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        document.getElementById('response').textContent = 'Erro ao fazer o upload das mídias.';
    });
});

