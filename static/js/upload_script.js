let storedDocuments = [];  // Para armazenar as imagens/documentos previamente carregados
let storedVideo = null;  // Para armazenar o vídeo carregado
let landscapeCount = 0;  // Contador global para fotos deitadas

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

    // Verificar se o arquivo é do tipo 'File' antes de criar a URL
    if (file instanceof File) {
        img.src = URL.createObjectURL(file);
        img.classList.add('thumbnail');  // Classe 'thumbnail' é usada para prestador (dono do perfil)
    } else {
        console.error("Elemento não é do tipo File:", file);
        return; // Pula este item se não for um objeto File
    }

    fileElement.appendChild(img);

    const removeButton = document.createElement('button');
    removeButton.innerHTML = '&times;'; // Ícone de "X"
    removeButton.classList.add('remove-btn'); // Classe para estilização do botão "X"
    
    // Evento de clique para remover a mídia
    removeButton.addEventListener('click', function () {
        storedDocuments.splice(index, 1);  // Remove o arquivo da lista
        updateFileInput();  // Atualiza o input de arquivos
        updatePreview();  // Atualiza a pré-visualização
        validateImages();  // Verificar novamente o estado das imagens
        checkMediaLimit(); // Verifica a quantidade de mídias para ativar/desativar campos

    });
    
    // Adicionar o botão de remoção ao elemento do arquivo
    fileElement.appendChild(removeButton);
    preview.appendChild(fileElement);
     
});


const videoPreview = document.getElementById('video-preview');
videoPreview.innerHTML = ''; // Limpa a pré-visualização de vídeo

if (storedVideo) {
    console.log("Processando vídeo:", storedVideo.name || "Pré-visualização");

    const fileElement = document.createElement('div');
    fileElement.classList.add('file-preview');

    const videoElement = document.createElement('video');
    videoElement.src = storedVideo.url ? storedVideo.url : URL.createObjectURL(storedVideo); // Usa a URL salva ou cria uma URL para pré-visualização
    videoElement.controls = true;
    videoElement.classList.add('thumbnail');
    fileElement.appendChild(videoElement);

    const removeButton = document.createElement('button');
    removeButton.innerHTML = '&times;';
    removeButton.classList.add('remove-btn');
    removeButton.addEventListener('click', function () {
        storedVideo = null;  // Remove o vídeo
        document.getElementById('video').value = '';  // Limpa o campo de vídeo
        updatePreview();  // Atualiza a pré-visualização
        checkMediaLimit(); // Verifica a quantidade de mídias para ativar/desativar campos

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
    const uploadIcon = document.getElementById('upload-icon');
    const uploadVideoIcon = document.getElementById('upload-video-icon');
    // Checa se excedeu o limite de 4 arquivos
    if (getTotalMediaCount() === 4) {
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
        const saveButton = document.querySelector('.btn-save');
        if (saveButton) {
            saveButton.disabled = false; // Habilita o botão
            saveButton.style.opacity = '1'; // Restaura a opacidade original
            saveButton.style.cursor = 'pointer'; // Restaura o cursor padrão
        }
        // Caso o vídeo também deva ser marcado como inválido
        if (storedVideo && storedDocuments.length >= 4) {
            const videoPreviewElement = document.querySelector('.video-preview');  // Assumindo que o vídeo tenha uma classe 'video-preview'
            if (videoPreviewElement) {
                console.log("Marcando o vídeo como inválido:", videoPreviewElement);
                videoPreviewElement.classList.add('invalid');  // Adiciona classe vermelha no vídeo
            }
        }
    } else if (getTotalMediaCount() >= 5) {

        showTemporaryMessage("Você já enviou 4 mídias. Não é possível enviar mais. Por favor, remova uma mídia existente para continuar.");
        // Desabilitar o botão de salvar alterações
        const saveButton = document.querySelector('.btn-save');
        if (saveButton) {
            saveButton.disabled = true; // Desabilita o botão
            saveButton.style.opacity = '0.5'; // Reduz a opacidade para indicar desabilitado
            saveButton.style.cursor = 'not-allowed'; // Altera o cursor para indicar que está desabilitado
            uploadVideoIcon.classList.add('disabled'); // Adiciona a classe de desabilitado ao ícone de vídeo
            uploadIcon.classList.add('disabled'); // Adiciona a classe de desabilitado ao ícone de imagens
    
        }
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
        if (storedVideo && storedDocuments.length >= 5) {
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
                        previewItem.classList.add('invalid'); // Adiciona classe vermelha
                    
                        showTemporaryMessage_Novo("Você pode enviar no máximo 2 fotos deitadas.");
                        const responseMessage = document.getElementById('response');
                        if (responseMessage) {
                            responseMessage.textContent = ''; // Limpa o texto da mensagem
                            responseMessage.style.display = 'none'; // Oculta completamente a mensagem
                        }
                        // Desabilitar o botão de salvar alterações
                        const saveButton = document.querySelector('.btn-save');
                        if (saveButton) {
                            saveButton.disabled = true; // Desabilita o botão
                            saveButton.style.opacity = '0.5'; // Reduz a opacidade para indicar desabilitado
                            saveButton.style.cursor = 'not-allowed'; // Altera o cursor para indicar que está desabilitado
                        }
                    } else {
                        previewItem.classList.remove('invalid'); // Remove a classe vermelha se a imagem não for inválida
                    
                        // Remover o aviso e reabilitar o botão de salvar alterações
                        const responseMessage = document.getElementById('response-Novo');
                        if (responseMessage) {
                            responseMessage.textContent = ''; // Limpa o texto da mensagem
                            responseMessage.style.display = 'none'; // Oculta completamente a mensagem
                        }
                    
                        const saveButton = document.querySelector('.btn-save');
                        if (saveButton) {
                            saveButton.disabled = false; // Habilita o botão
                            saveButton.style.opacity = '1'; // Restaura a opacidade original
                            saveButton.style.cursor = 'pointer'; // Restaura o cursor padrão
                        }
                    }
                    
                });
            }
        };
    });
}


function showTemporaryMessage_Novo(message) {
    const responseMessage = document.getElementById('response-Novo');
    responseMessage.textContent = message;
    responseMessage.style.display = 'block'; // Mostra o aviso
    responseMessage.classList.add('visible'); // Adiciona a classe para estilização

    // setTimeout(() => {
    //     responseMessage.style.display = 'none'; // Oculta completamente após 2 segundos
    //     responseMessage.textContent = ''; // Limpa o conteúdo da mensagem
    //     responseMessage.classList.remove('visible'); // Remove a classe para estilização
    // }, 2000);
}


// Função para garantir que o campo de input reflita corretamente os arquivos no array
function updateFileInput() {
    const input = document.getElementById('documents');
    const dataTransfer = new DataTransfer();

    storedDocuments.forEach((file) => {
        dataTransfer.items.add(file);
    });

    input.files = dataTransfer.files; // Atualiza o campo de arquivos
}

// Função para obter a contagem total de mídias (imagens + vídeo)
function getTotalMediaCount() {
    const total = storedDocuments.length + (storedVideo ? 1 : 0);
    console.log("Total media count:", total);  // Log para verificar o valor retornado
    return total;
}

// Função para verificar o limite de mídias e ativar/desativar os campos de upload
function checkMediaLimit() {
    const totalMedia = storedDocuments.length + (storedVideo ? 1 : 0); // Soma os documentos e o vídeo (se existir)
    const uploadIcon = document.getElementById('upload-icon');
    const videoInput = document.getElementById('video');
    const documentsInput = document.getElementById('documents');
    const responseMessage = document.getElementById('response'); // Elemento para exibir mensagem
    const uploadVideoIcon = document.getElementById('upload-video-icon');
    const saveButton = document.querySelector('.btn-save'); // Captura o botão de salvar

    if (totalMedia === 4) {
        // Mensagem de limite atingido
        responseMessage.textContent = "Você já enviou 4 arquivos, não pode enviar mais mídias.";
        responseMessage.style.display = 'block'; // Exibe a mensagem
        responseMessage.classList.add('visible'); // Adiciona a classe visível
        const saveButton = document.querySelector('.btn-save');
        if (saveButton) {
            saveButton.disabled = false; // Habilita o botão
            saveButton.style.opacity = '1'; // Restaura a opacidade original
            saveButton.style.cursor = 'pointer'; // Restaura o cursor padrão
        }
        // Desabilitar campos e botões
        videoInput.disabled = true; // Desabilita o campo de vídeo
        documentsInput.disabled = true; // Desabilita o campo de imagens
        uploadVideoIcon.classList.add('disabled'); // Adiciona a classe de desabilitado ao ícone de vídeo
        uploadIcon.classList.add('disabled'); // Adiciona a classe de desabilitado ao ícone de imagens
        // if (saveButton) {
        //     saveButton.disabled = true; // Desabilita o botão de salvar
        //     saveButton.style.opacity = '0.5'; // Reduz a opacidade para indicar desabilitado
        //     saveButton.style.cursor = 'not-allowed'; // Altera o cursor para indicar que está desabilitado
        // }

        // Marca pré-visualizações adicionais como inválidas
        storedDocuments.forEach((file, index) => {
            const previewElement = document.querySelectorAll('.file-preview')[index];
            if (previewElement && index >= 4 - (storedVideo ? 1 : 0)) {
                previewElement.classList.add('invalid'); // Adiciona classe vermelha
            }
        });
    } else if (getTotalMediaCount() >= 5) {

    showTemporaryMessage("Você já enviou 4 mídias ou mais. Não é possível enviar mais. Por favor, remova uma ou mais mídia(as) existente(es) para continuar.");
    // Desabilitar o botão de salvar alterações
    const saveButton = document.querySelector('.btn-save');
    if (saveButton) {
        saveButton.disabled = true; // Desabilita o botão
        saveButton.style.opacity = '0.5'; // Reduz a opacidade para indicar desabilitado
        saveButton.style.cursor = 'not-allowed'; // Altera o cursor para indicar que está desabilitado
        uploadVideoIcon.classList.add('disabled'); // Adiciona a classe de desabilitado ao ícone de vídeo
        uploadIcon.classList.add('disabled'); // Adiciona a classe de desabilitado ao ícone de imagens

    }
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
    if (storedVideo && storedDocuments.length >= 5) {
        const videoPreviewElement = document.querySelector('.video-preview');  // Assumindo que o vídeo tenha uma classe 'video-preview'
        if (videoPreviewElement) {
            console.log("Marcando o vídeo como inválido:", videoPreviewElement);
            videoPreviewElement.classList.add('invalid');  // Adiciona classe vermelha no vídeo
        }
    }
} else {
        // Remove mensagem e reabilita campos e botões
        responseMessage.textContent = ""; // Limpa a mensagem
        responseMessage.style.display = 'none'; // Oculta a mensagem
        responseMessage.classList.remove('visible'); // Remove a classe visível

        videoInput.disabled = false; // Habilita o campo de vídeo
        documentsInput.disabled = false; // Habilita o campo de imagens
        uploadVideoIcon.classList.remove('disabled'); // Remove a classe de desabilitado no ícone de vídeo
        uploadIcon.classList.remove('disabled'); // Remove a classe de desabilitado no ícone de imagens
        if (saveButton) {
            saveButton.disabled = false; // Habilita o botão de salvar
            saveButton.style.opacity = '1'; // Restaura a opacidade original
            saveButton.style.cursor = 'pointer'; // Restaura o cursor padrão
        }

        // Remove a classe de inválido das pré-visualizações
        storedDocuments.forEach((file, index) => {
            const previewElement = document.querySelectorAll('.file-preview')[index];
            if (previewElement) {
                previewElement.classList.remove('invalid'); // Remove a classe vermelha
            }
        });
    }
}



// Evento de mudança no input de arquivos (imagens/documentos)
document.getElementById('documents').addEventListener('change', function () {
    const newFiles = Array.from(this.files);

    // Adiciona apenas arquivos únicos ao array `storedDocuments`
    newFiles.forEach((file) => {
        if (!storedDocuments.some((storedFile) => storedFile.name === file.name && storedFile.size === file.size)) {
            storedDocuments.push(file);
        }
    });

    // Atualiza a pré-visualização e validação
    updatePreview();
    validateImages();
    checkMediaLimit();
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
        if (videoElement.duration > 61) {
            showTemporaryMessage("O vídeo pode ter no máximo 1 minuto.");
            // Desabilitar o botão de salvar alterações
            const saveButton = document.querySelector('.btn-save');
            if (saveButton) {
                saveButton.disabled = true; // Desabilita o botão
                saveButton.style.opacity = '0.5'; // Reduz a opacidade para indicar desabilitado
                saveButton.style.cursor = 'not-allowed'; // Altera o cursor para indicar que está desabilitado
            }
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
            // Remover o aviso e reabilitar o botão de salvar alterações
            const responseMessage = document.getElementById('response-Novo');
            if (responseMessage) {
                responseMessage.textContent = ''; // Limpa o texto da mensagem
                responseMessage.style.display = 'none'; // Oculta completamente a mensagem
            }
        
            const saveButton = document.querySelector('.btn-save');
            if (saveButton) {
                saveButton.disabled = false; // Habilita o botão
                saveButton.style.opacity = '1'; // Restaura a opacidade original
                saveButton.style.cursor = 'pointer'; // Restaura o cursor padrão
            }
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

function ativarUpload() {
    document.getElementById('perfil_foto').click();
}


// Função para verificar se a foto de perfil está ausente e exibir o ícone de carregar ou o botão de remover se necessário
function verificarFotoInicial() {
    const profilePhoto = document.querySelector('.profile-photo');
    const carregarIcon = document.getElementById('carregar-icon');
    const removeFotoButton = document.getElementById('remove-foto');
    const fotoId = profilePhoto.getAttribute('data-id');
    const backgroundImage = profilePhoto.style.backgroundImage;

    console.log("Verificando foto inicial:");
    console.log("Foto ID:", fotoId);
    console.log("Background Image:", backgroundImage);

    if (!fotoId || fotoId === 'None' || backgroundImage.includes('/uploads/img/None')) {
        carregarIcon.style.display = 'block';  // Exibe o ícone de carregar
        if (removeFotoButton) removeFotoButton.style.display = 'none';  // Oculta o botão de remover se ele existir
        console.log("Ícone de carregar exibido. Botão de remover ocultado.");
    } else {
        carregarIcon.style.display = 'none';  // Oculta o ícone de carregar
        if (removeFotoButton) removeFotoButton.style.display = 'block';  // Exibe o botão de remover se ele existir
        console.log("Ícone de carregar ocultado. Botão de remover exibido.");
    }
}

// Chamar a função de verificação inicial ao carregar a página
verificarFotoInicial();

// Função para carregar nova foto
function carregarNovaFoto(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const profilePhoto = document.querySelector('.profile-photo');
            profilePhoto.style.backgroundImage = `url(${e.target.result})`;
            document.getElementById('carregar-icon').style.display = 'none'; // Oculta o ícone de carregar
            document.getElementById('remove-foto').style.display = 'block'; // Exibe o botão de remover
            console.log("Nova foto carregada e exibida como fundo da foto de perfil.");
        };
        reader.readAsDataURL(file);
    }
}

// Função para alternar entre o ícone de carregar e o botão de remover após remoção da foto
function alternarParaIconeCarregar() {
    const carregarIcon = document.getElementById('carregar-icon');
    const removeFotoButton = document.getElementById('remove-foto');
    carregarIcon.style.display = 'block';  // Exibe o ícone de carregar
    if (removeFotoButton) removeFotoButton.style.display = 'none';  // Oculta o botão de remover
}

// Evento de clique para o botão de remover foto
document.getElementById('remove-foto').addEventListener('click', function () {
    // const prestadorId = prestador.prestador_id;
    const fotoId = document.querySelector('.profile-photo').getAttribute('data-id');
    document.querySelector('.profile-photo').style.backgroundImage = 'none';
    document.getElementById('perfil_foto').value = '';
    alternarParaIconeCarregar();  // Alterna para o ícone de carregar

    })

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

    const totalMidias = getTotalMediaCount();

    // Verificar se o usuário carregou pelo menos 4 mídias
    if (totalMidias < 4) {
        const responseMessage = document.getElementById('response-message');
        responseMessage.textContent = 'Você deve carregar pelo menos 4 mídias.';
        responseMessage.classList.add('error'); // Adiciona a classe de erro para estilizar a mensagem
        responseMessage.style.display = 'block';
        setTimeout(() => {
            responseMessage.style.display = 'none'; // Oculta a mensagem após 2 segundos
        }, 2000);
        return; // Impede o envio do formulário
    }

    const formData = new FormData();
    const perfilFoto = document.getElementById('perfil_foto').files[0];
    // const documents = document.getElementById('documents').files;
    const video = document.getElementById('video').files[0];

    // Adicionar a foto de perfil ao FormData
    if (perfilFoto) {
        formData.append('perfil_foto', perfilFoto);
    } else {
        const responseMessage = document.getElementById('response-message');
        if (responseMessage) { // Verifica se o elemento existe
            responseMessage.textContent = 'Você deve adicionar uma foto de perfil.';
            responseMessage.classList.add('error'); // Adiciona a classe de erro para estilizar a mensagem
            responseMessage.style.display = 'block'; // Exibe a mensagem de erro
            setTimeout(() => {
                responseMessage.style.display = 'none'; // Oculta a mensagem após 2 segundos
            }, 2000);
        } else {
            console.error('Elemento response-message não encontrado no DOM.');
        }
        return; // Impede o envio do formulário
    }

    // Adicionar todos os documentos em `storedDocuments` ao FormData
    storedDocuments.forEach((file) => {
        formData.append('documents', file);
    });
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

