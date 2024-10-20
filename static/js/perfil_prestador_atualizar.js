let storedDocuments = [];  // Para armazenar as imagens/documentos previamente carregados
let storedVideo = null;  // Para armazenar o vídeo carregado
let loadedFromHTML = false;  // Variável para marcar se os arquivos HTML já foram carregados
// Atualiza a pré-visualização e validação após a remoção de mídia
function updatePreview(isExistingFile = false) {
    console.log("Iniciando a pré-visualização");
    console.log("Arquivos armazenados:", storedDocuments);

    const preview = document.getElementById('preview');
    preview.innerHTML = '';  // Limpa a pré-visualização de imagens

    // Mostrar pré-visualização dos documentos
    storedDocuments.forEach((file, index) => {
        console.log("Processando documento:", file.name);

        const fileElement = document.createElement('div');
        fileElement.classList.add('file-preview');

        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.classList.add('thumbnail');  // Classe 'thumbnail' é usada para prestador (dono do perfil)
        fileElement.appendChild(img);

        const removeButton = document.createElement('button');
        removeButton.innerHTML = '&times;';  // Ícone de "X"
        removeButton.classList.add('remove-btn');  // Classe para estilização do botão "X"
        removeButton.addEventListener('click', function () {
            console.log("Removendo documento:", file.name);
            storedDocuments.splice(index, 1);
            updateFileInput();  // Atualiza o input de arquivos
            updatePreview();  // Atualiza a pré-visualização
            checkMediaLimit();
        });

        fileElement.appendChild(removeButton);
        preview.appendChild(fileElement);
    });

    const videoPreview = document.getElementById('video-preview');
    videoPreview.innerHTML = '';  // Limpa a pré-visualização de vídeo

    if (storedVideo) {
        console.log("Processando vídeo:", storedVideo.name);

        const fileElement = document.createElement('div');
        fileElement.classList.add('file-preview');

        const videoElement = document.createElement('video');
        videoElement.src = URL.createObjectURL(storedVideo);
        videoElement.controls = true;
        videoElement.classList.add('thumbnail');
        fileElement.appendChild(videoElement);

        const removeButton = document.createElement('button');
        removeButton.innerHTML = '&times;';
        removeButton.classList.add('remove-btn');
        removeButton.addEventListener('click', function () {
            if (storedVideo) {
                console.log("Removendo vídeo:", storedVideo.name);  // Primeiro faz o log
                storedVideo = null;  // Depois seta o valor como null
                document.getElementById('video').value = '';  // Limpa o campo de vídeo
                updatePreview();  // Atualiza a pré-visualização
                checkMediaLimit();  // Revalida o limite de mídia
            }
        });
        

        fileElement.appendChild(removeButton);
        videoPreview.appendChild(fileElement);
    }

    console.log("Finalizando pré-visualização");
    
    if (!isExistingFile) {
        validateImages();  // Só valida se os arquivos não forem carregados automaticamente pelo HTML
    }
    checkMediaLimit();
}
function validateImages() {

    // Limpar as classes 'invalid' de todas as imagens antes de aplicar a validação
    document.querySelectorAll('.file-preview').forEach((previewItem) => {
        previewItem.classList.remove('invalid');
    });

    console.log("Stored Documents:", storedDocuments.length);
    console.log("Stored Video:", storedVideo);
    console.log("Total Media Count:", getTotalMediaCount());

    // Checa se excedeu o limite de 4 arquivos
    if (getTotalMediaCount() >= 4) {
        showTemporaryMessage("Você já enviou 4 arquivos, não pode enviar mais mídias.");

        // Itera sobre todas as pré-visualizações de arquivos (imagens e vídeos)
        storedDocuments.forEach((file, index) => {
            const previewElement = document.querySelectorAll('.file-preview')[index];
            if (previewElement) {
                if (index >= 4 - (storedVideo ? 1 : 0)) {  // Ajusta a lógica para considerar o vídeo
                    console.log("Marcando como inválido:", previewElement);
                    previewElement.classList.add('invalid');  // Adiciona classe vermelha
                }
            } else {
                console.log("Elemento .file-preview não encontrado para o index:", index);
            }
        });

        // Caso o vídeo também deva ser marcado como inválido
        if (storedVideo && storedDocuments.length >= 4) {
            const videoPreviewElement = document.querySelector('.video-preview');  // Assumindo que o vídeo tenha uma classe 'video-preview'
            if (videoPreviewElement) {
                console.log("Marcando o vídeo como inválido:", videoPreviewElement);
                videoPreviewElement.classList.add('invalid');  // Adiciona classe vermelha no vídeo
            }
        }
    }

    // Validação de imagens deitadas (paisagem), será chamada sempre
    landscapeCount = 0;  // Reseta o contador de fotos deitadas
    let landscapeImages = []; // Lista para armazenar os índices de fotos paisagens
    let imagesProcessed = 0;

    // Verificar a orientação das fotos antes de aplicar a classe de invalidez
    storedDocuments.forEach((file, index) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);

        img.onload = function () {
            imagesProcessed++;

            // Verifica se a imagem é deitada (paisagem)
            if (img.width > img.height) {
                landscapeCount++;
                landscapeImages.push(index); // Adiciona o índice da foto paisagem
                console.log(`Imagem deitada identificada: Index ${index}, Total de imagens deitadas até agora: ${landscapeCount}`);
            }

            // Após todas as imagens serem processadas, aplicar validação
            if (imagesProcessed === storedDocuments.length) {
                console.log(`Total de imagens deitadas identificadas: ${landscapeCount}`);
                
                landscapeImages.forEach((idx, pos) => {
                    const previewItem = document.querySelectorAll('.file-preview')[idx];
                    // Se houver mais de 2 fotos deitadas, a partir da terceira será marcada como inválida
                    if (pos >= 2) {
                        console.log(`Marcando imagem deitada como inválida: Index ${idx}`);
                        previewItem.classList.add('invalid');  // Adiciona classe vermelha
                        showTemporaryMessage("Você pode enviar no máximo 2 fotos deitadas.");
                    } else {
                        previewItem.classList.remove('invalid');  // Remove a classe vermelha se a imagem não for inválida
                    }
                });
            }
        };
    });
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
    const total = storedDocuments.length + (storedVideo ? 1 : 0);
    console.log("Total media count:", total);  // Log para verificar o valor retornado
    return total;
}

// Função para verificar o limite de mídias e ativar/desativar os campos de upload
function checkMediaLimit() {
    const totalMedia = storedDocuments.length + (storedVideo ? 1 : 0); // Mídias somam os documentos e o vídeo (se existir)
    const excessMedia = totalMedia - 4;


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


// Função para exibir o aviso temporariamente
function showTemporaryMessage(message) {
    document.getElementById('response').textContent = message;
    setTimeout(() => {
        document.getElementById('response').textContent = '';  // Limpa o aviso após 5 segundos
    }, 5000);
}


document.addEventListener('DOMContentLoaded', function() { 
    console.log("DOM carregado");

    console.log("É o dono do perfil?", isOwner);

    const documentsElement = document.getElementById('documents');
    const videoElement = document.getElementById('video');

    if (isOwner === true) {
        console.log("Ativando funcionalidades de upload para o dono do perfil");

        // Carregar arquivos existentes via HTML apenas uma vez
        if (!loadedFromHTML) {
            const existingImages = document.querySelectorAll('#preview .gallery-item img');
            existingImages.forEach((img) => {
                const imageUrl = img.src;
                const fileName = img.alt;
                console.log("Adicionando imagem existente:", fileName);

                // Verifica se o arquivo já foi adicionado
                if (!storedDocuments.some(doc => doc.name === fileName)) {
                    fetch(imageUrl)
                        .then(res => res.blob())
                        .then(blob => {
                            const file = new File([blob], fileName, { type: blob.type });
                            storedDocuments.push(file);
                            updatePreview(true);  // Indicar que é um arquivo existente
                        });
                }
            });

            const existingVideo = document.querySelector('#video-preview video');
            if (existingVideo) {
                const videoUrl = existingVideo.querySelector('source').src;
                const fileName = "video.mp4";
                console.log("Adicionando vídeo existente:", fileName);

                // Verifica se o vídeo já foi adicionado
                if (!storedVideo) {
                    fetch(videoUrl)
                        .then(res => res.blob())
                        .then(blob => {
                            storedVideo = new File([blob], fileName, { type: blob.type });
                            updatePreview(true);  // Indicar que é um arquivo existente
                        });
                }
            }

            loadedFromHTML = true;  // Marca que os arquivos já foram carregados do HTML
        }

        // Adicionar novos arquivos ao clicar em "Escolher arquivo"
        if (documentsElement) {
            documentsElement.addEventListener('change', function () {
                const newFiles = Array.from(this.files);
                console.log("Novos arquivos adicionados:", newFiles);

                // Verifica se algum arquivo já foi adicionado para evitar duplicação
                newFiles.forEach(newFile => {
                    if (!storedDocuments.some(doc => doc.name === newFile.name)) {
                        storedDocuments.push(newFile);
                    }
                });

                updatePreview(false);  // Indicar que é um novo upload
            });
        }

        if (videoElement) {
            videoElement.addEventListener('change', function () {
                if (this.files.length > 0) {
                    storedVideo = this.files[0];
                    console.log("Novo vídeo adicionado:", storedVideo);
                    updatePreview(false);  // Indicar que é um novo upload
                }
            });
        }
    }
});

// Lógica para remoção da foto de perfil
document.getElementById('remove-foto').addEventListener('click', function () {
    document.querySelector('.profile-photo').style.backgroundImage = 'none';  // Remove a foto de perfil
    document.getElementById('perfil_foto').value = '';  // Limpa o campo de upload
});
// // Evento de mudança no input de arquivos (imagens/documentos)
// document.getElementById('documents').addEventListener('change', function () {
//     const newFiles = Array.from(this.files);

//     // Adicionando novos arquivos à lista armazenada
//     storedDocuments = storedDocuments.concat(newFiles);

//     // Atualiza a pré-visualização e validação
//     updatePreview();
//     validateImages();
//     checkMediaLimit();  // Verifica se o limite de mídias foi atingido
// });

// // Evento de mudança no input de vídeo
// document.getElementById('video').addEventListener('change', function () {
//     if (this.files.length > 0) {
//         storedVideo = this.files[0];  // Armazena o vídeo
//     }

//     // Validação da duração do vídeo (1 minuto no máximo)
//     const videoElement = document.createElement('video');
//     videoElement.src = URL.createObjectURL(storedVideo);
//     videoElement.onloadedmetadata = function () {
//         if (videoElement.duration > 60) {
//             showTemporaryMessage("O vídeo pode ter no máximo 1 minuto.");
//             storedVideo = null;  // Limpa o vídeo armazenado
//             document.getElementById('video').value = '';  // Limpa o campo de vídeo
//         } else {
//             updatePreview();  // Atualiza a pré-visualização com o vídeo
//         }
//     };

//     checkMediaLimit();  // Verifica se o limite de mídias foi atingido
// });
