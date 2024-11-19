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
    removeButton.addEventListener('click', function (event) {
        event.preventDefault(); // Previne comportamento padrão
        event.stopPropagation(); // Evita propagação do evento
    
        // Verificar se o arquivo e a URL estão disponíveis
        if (!file) {
            console.error("Arquivo não definido.");
            alert("Erro: Não foi possível identificar o arquivo a ser removido.");
            return;
        }
    
        // Extrair o ID da URL usando expressão regular, se houver uma URL associada
        let imageID = null;
        if (file.url) {
            const idMatch = file.url.match(/\/(\d+)(?!.*\d)/);
            imageID = idMatch ? idMatch[1] : null;
        }
    
        if (!imageID || imageID === "preview") {
            // Remover arquivo localmente se for uma pré-visualização
            console.log(`Removendo arquivo em pré-visualização: ${file.name || "Sem Nome"}`);
            const fileIndex = storedDocuments.indexOf(file);
            if (fileIndex > -1) {
                storedDocuments.splice(fileIndex, 1); // Remove do array local
            }
            updateFileInput(); // Atualiza o input de arquivos
            updatePreview(); // Atualiza a pré-visualização
            checkMediaLimit(); // Atualiza limites de mídia
            fileElement.remove(); // Remove o elemento visual
        } else {
            console.log(`Removendo arquivo salvo no banco: ID ${imageID}`);
    
            // Adiciona mensagem de carregamento
            const loadingMessage = document.createElement('span');
            loadingMessage.textContent = 'Removendo...';
            fileElement.appendChild(loadingMessage);
    
            // Enviar requisição para o backend para remover a mídia
            fetch('/api/remover_midia', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    image_id: imageID,
                }),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.success) {
                        console.log(data.message);
    
                        // Remove o arquivo da lista e atualiza a visualização
                        const fileIndex = storedDocuments.indexOf(file);
                        if (fileIndex > -1) {
                            storedDocuments.splice(fileIndex, 1); // Remove do array local
                        }
                        updateFileInput(); // Atualiza o input de arquivos
                        updatePreview(); // Atualiza a pré-visualização
                        checkMediaLimit(); // Atualiza limites de mídia
                        fileElement.remove(); // Remove o elemento visual
                    } else {
                        console.error(data.message);
                        alert("Erro ao remover mídia: " + data.message); // Feedback ao usuário
                    }
                })
                .catch((error) => {
                    console.error("Erro ao remover mídia:", error);
                    alert("Erro ao remover mídia. Tente novamente.");
                })
                .finally(() => {
                    // Remove mensagem de carregamento
                    loadingMessage.remove();
                });
        }
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
        // Verificar se o vídeo é uma pré-visualização ou está salvo no banco
        let videoID = null;
        if (storedVideo.url) {
            const idMatch = storedVideo.url.match(/\/(\d+)(?!.*\d)/); // Extrair o ID da URL
            videoID = idMatch ? idMatch[1] : null;
        }

        if (!videoID || videoID === "preview") {
            // Remover vídeo localmente se for uma pré-visualização
            console.log(`Removendo vídeo em pré-visualização: ${storedVideo.name || "Sem Nome"}`);
            storedVideo = null; // Limpa a variável armazenada
            document.getElementById('video').value = ''; // Limpa o campo de vídeo
            fileElement.remove(); // Remove o elemento visual
            checkMediaLimit(); // Revalida o limite de mídia
        } else {
            console.log(`Removendo vídeo salvo no banco: ID ${videoID}`);

            // Adiciona mensagem de carregamento
            const loadingMessage = document.createElement('span');
            loadingMessage.textContent = 'Removendo...';
            fileElement.appendChild(loadingMessage);

            // Enviar requisição para o backend para remover o vídeo
            fetch('/api/remover_midia', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    image_id: videoID, // 'image_id' usado como parâmetro para vídeos e imagens
                }),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.success) {
                        console.log(data.message);
                        // Remove o vídeo da variável e atualiza a visualização
                        storedVideo = null; // Limpa a variável armazenada
                        document.getElementById('video').value = ''; // Limpa o campo de vídeo
                        fileElement.remove(); // Remove o elemento visual
                        checkMediaLimit(); // Revalida o limite de mídia
                    } else {
                        console.error(data.message);
                        alert("Erro ao remover vídeo: " + data.message); // Feedback ao usuário
                    }
                })
                .catch((error) => {
                    console.error("Erro ao remover vídeo:", error);
                    alert("Erro ao remover vídeo. Tente novamente.");
                })
                .finally(() => {
                    // Remove mensagem de carregamento
                    loadingMessage.remove();
                });
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

function abrirSeletorArquivos() {
    document.getElementById('documents').click();
}
function abrirSeletorVideo() {
    document.getElementById('video').click();
}
// Função para ativar o seletor de arquivos ao clicar no ícone
function ativarUploadCertificados() {
    document.getElementById('certificados').click(); // Simula o clique no input de arquivos
}

// Lista para armazenar os arquivos carregados
let certificadosCarregados = [];

document.getElementById('certificados').addEventListener('change', function () {
    const files = Array.from(this.files); // Converte os arquivos carregados em um array
    const messageDiv = document.getElementById('certificados-message');

    // Adiciona os novos arquivos à lista cumulativa
    files.forEach(file => {
        if (!certificadosCarregados.some(c => c.name === file.name && c.size === file.size)) {
            certificadosCarregados.push(file); // Evita duplicatas
        }
    });

    // Exibe a mensagem de sucesso com a contagem total de arquivos carregados
    if (certificadosCarregados.length > 0) {
        messageDiv.textContent = `${certificadosCarregados.length} certificado(s) carregado(s) no total.`;
        messageDiv.style.display = 'block'; // Torna a mensagem visível
    } else {
        // Oculta a mensagem caso nenhum arquivo esteja na lista cumulativa
        messageDiv.style.display = 'none';
    }

    console.log("Certificados carregados:", certificadosCarregados);
});


// Função para ativar o seletor de upload ao clicar no ícone de carregar
function ativarUpload() {
    document.getElementById('perfil_foto').click();
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

    if (totalMedia >= 4) {
        // Mensagem de limite atingido
        responseMessage.textContent = "Você já enviou 4 arquivos, não pode enviar mais mídias.";
        responseMessage.style.display = 'block'; // Exibe a mensagem
        responseMessage.classList.add('visible'); // Adiciona a classe visível

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


// Função para exibir o aviso temporariamente
function showTemporaryMessage(message) {
    const responseMessage = document.getElementById('response');
    responseMessage.textContent = message;
    responseMessage.style.display = 'block'; // Mostra o aviso
    responseMessage.classList.add('visible'); // Adiciona a classe para estilização

    // setTimeout(() => {
    //     responseMessage.style.display = 'none'; // Oculta completamente após 2 segundos
    //     responseMessage.textContent = ''; // Limpa o conteúdo da mensagem
    //     responseMessage.classList.remove('visible'); // Remove a classe para estilização
    // }, 2000);
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
        
                // Verifica se o arquivo já foi adicionado usando o nome
                if (!storedDocuments.some(doc => doc.name === fileName)) {
                    fetch(imageUrl)
                        .then(res => res.blob())
                        .then(blob => {
                            const file = new File([blob], fileName, { type: blob.type });
        
                            // Adiciona a URL como uma propriedade ao objeto File
                            Object.defineProperty(file, 'url', {
                                value: imageUrl,
                                writable: false,  // Torna a propriedade não mutável (opcional)
                                configurable: true,  // Permite que seja removida se necessário
                                enumerable: true  // Permite que apareça ao exibir o objeto
                            });
        
                            // Armazena o arquivo diretamente no array storedDocuments
                            storedDocuments.push(file);
                            updatePreview(true);  // Indica que é um arquivo existente
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
                            // Cria um objeto File para o vídeo
                            const videoFile = new File([blob], fileName, { type: blob.type });
                
                            // Adiciona a URL como uma propriedade ao objeto File
                            Object.defineProperty(videoFile, 'url', {
                                value: videoUrl,
                                writable: false,  // Torna a propriedade não mutável (opcional)
                                configurable: true,  // Permite que seja removida se necessário
                                enumerable: true  // Permite que apareça ao exibir o objeto
                            });
                
                            // Armazena o arquivo diretamente na variável storedVideo
                            storedVideo = videoFile;
                            updatePreview(true);  // Indica que é um arquivo existente
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
// Função para exibir o campo de contato baseado na escolha do método
document.getElementById('contactMethod').addEventListener('change', function () {
    const selectedMethod = this.value;
    const contactDetailDiv = document.getElementById('contactDetail');
    const contactLabel = document.getElementById('contactLabel');
    const contactInput = document.getElementById('contactInput');
    const currentContactDiv = document.getElementById('currentContact');

    // Limpa o valor do campo de entrada
    contactInput.value = ''; // Limpa o campo

    // Atualiza o label e o placeholder conforme o método escolhido
    if (selectedMethod === 'email') {
        contactLabel.innerHTML = 'Por favor, insira seu email:';
        contactInput.placeholder = 'Digite seu email';
        contactInput.type = 'email';
        contactDetailDiv.style.display = 'block';
        currentContactDiv.style.display = 'none';  // Esconde o contato atual
    } else if (selectedMethod === 'telefone') {
        contactLabel.innerHTML = 'Por favor, insira seu número de telefone:';
        contactInput.placeholder = 'Digite seu número de telefone';
        contactInput.type = 'tel';
        contactDetailDiv.style.display = 'block';
        currentContactDiv.style.display = 'none';  // Esconde o contato atual
    } else if (selectedMethod === 'whatsapp') {
        contactLabel.innerHTML = 'Por favor, insira seu número do WhatsApp:';
        contactInput.placeholder = 'Digite seu número do WhatsApp';
        contactInput.type = 'tel';
        contactDetailDiv.style.display = 'block';
        currentContactDiv.style.display = 'none';  // Esconde o contato atual
    } else {
        contactDetailDiv.style.display = 'none';  // Oculta o campo se nenhum método for selecionado
        currentContactDiv.style.display = 'block';  // Exibe o contato atual
    }

    // Função de rolagem suave até o campo de contato
    contactDetailDiv.scrollIntoView({ behavior: 'smooth' });

    // Adiciona a animação de destaque ao label
    contactLabel.classList.add('focus-highlight');  // Adiciona a classe de destaque

    // Remove o destaque após 2 segundos
    setTimeout(() => {
        contactLabel.classList.remove('focus-highlight');  // Remove a classe de destaque após o tempo
    }, 2000);
});

// No carregamento da página, exibe o contato atual sem alterar nada
window.onload = function () {
    const contactDetailDiv = document.getElementById('contactDetail');
    const currentContactDiv = document.getElementById('currentContact');
    contactDetailDiv.style.display = 'none';  // Não exibe o campo de contato
    currentContactDiv.style.display = 'block'; // Exibe o campo de contato atual
};


// Função para formatar o CEP enquanto o usuário digita
function formatarCEP(cep) {
    // Remove todos os caracteres que não sejam números
    cep = cep.replace(/\D/g, '');
    
    // Formata o CEP para o padrão 'XXXXX-XXX'
    if (cep.length > 5) {
        cep = cep.replace(/^(\d{5})(\d)/, '$1-$2');
    }
    
    return cep;
}

// Função para buscar o endereço via API do ViaCEP
function buscarEndereco(cep) {
    // Remover caracteres não numéricos do CEP
    cep = cep.replace(/\D/g, '');

    // Verificar se o CEP tem 8 dígitos
    if (cep.length !== 8) {
        document.getElementById('response').textContent = 'CEP inválido!';
        return;
    }

    // Fazer a requisição para a API ViaCEP
    fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao buscar CEP');
            }
            return response.json();
        })
        .then(data => {
            if (data.erro) {
                document.getElementById('response').textContent = 'CEP não encontrado!';
                return;
            }

            // Preencher os campos com os dados retornados pela API
            document.getElementById('street').value = data.logradouro || '';
            document.getElementById('neighborhood').value = data.bairro || '';
            document.getElementById('city').value = data.localidade || '';
            document.getElementById('state').value = data.uf || '';
            document.getElementById('response').textContent = '';  // Limpa mensagens de erro, se houver
        })
        .catch(error => {
            console.error('Erro:', error);
            document.getElementById('response').textContent = 'Erro ao buscar CEP.';
        });
}

// Adicionar evento ao campo de CEP para formatar enquanto o usuário digita e buscar o endereço automaticamente ao completar 8 dígitos
document.getElementById('location').addEventListener('input', function () {
    const cepInput = document.getElementById('location');
    cepInput.value = formatarCEP(cepInput.value);
    
    // Se o CEP tiver 8 dígitos, buscar o endereço automaticamente
    const cepLimpo = cepInput.value.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
        buscarEndereco(cepLimpo);
    }
});


// Função para exibir mensagem de sucesso
function mostrarMensagemSucesso(mensagem) {
    const responseMessage = document.getElementById('response-message');
    const saveButton = document.querySelector('.btn-save');

    // Verifica se o botão está flutuando
    if (saveButton.classList.contains('floating')) {
        // Exibe um alerta se o botão estiver flutuando
        alert(mensagem);
    } else {
        // Exibe a mensagem no local original, se o botão estiver fixo
        responseMessage.textContent = mensagem;
        responseMessage.classList.remove('error'); // Remove a classe de erro, caso ela tenha sido adicionada
        responseMessage.classList.add('success'); // Adiciona uma classe de sucesso para estilizar a mensagem
        responseMessage.style.display = 'block'; // Garante que a mensagem seja visível

        // Remove a mensagem automaticamente após 2 segundos
        setTimeout(() => {
            responseMessage.style.display = 'none'; // Oculta a mensagem
        }, 2000); // 2000 ms = 2 segundos
    }
}

// Adicionar os certificados cumulativos ao FormData
function adicionarCertificadosAoFormData(formData) {
    certificadosCarregados.forEach(certificado => {
        formData.append('certificados', certificado);
    });
}


// Evento de submissão do formulário
document.getElementById('uploadForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const totalMidias = getTotalMediaCount();

    // Verificar se o usuário carregou pelo menos 4 mídias
    if (totalMidias < 4) {
        const responseMessage = document.getElementById('response-message');
        responseMessage.textContent = 'Você deve carregar pelo menos 4 mídias (excluindo foto de perfil e certificados).';
        responseMessage.classList.add('error'); // Adiciona a classe de erro para estilizar a mensagem
        responseMessage.style.display = 'block';
        setTimeout(() => {
            responseMessage.style.display = 'none'; // Oculta a mensagem após 2 segundos
        }, 2000);
        return; // Impede o envio do formulário
    }

    const formData = new FormData(this);
    const perfilFoto = document.getElementById('perfil_foto').files[0];
    const video = document.getElementById('video').files[0];
    const certificados = document.getElementById('certificados').files;

    // Adicionar a foto de perfil ao FormData
    if (perfilFoto) {
        formData.append('perfil_foto', perfilFoto);
    }


    // Adicionar todos os documentos em `storedDocuments` ao FormData
    storedDocuments.forEach((file) => {
        formData.append('documents', file);
    });

    // Adicionar o vídeo ao FormData
    if (video) {
        formData.append('video', video);
    }

    // Adiciona os certificados acumulados ao FormData
    adicionarCertificadosAoFormData(formData);

    // Fazer o upload via fetch
    fetch('/api/editar_prestador', { 
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        mostrarMensagemSucesso(data.message); // Usa a função mostrarMensagemSucesso
    })
    .catch(error => {
        console.error('Erro:', error);
        const responseMessage = document.getElementById('response-message');
        responseMessage.textContent = 'Erro ao fazer o upload das mídias.';
        responseMessage.classList.add('error'); // Adiciona a classe de erro para estilizar a mensagem
        responseMessage.style.display = 'block';
        setTimeout(() => {
            responseMessage.style.display = 'none'; // Oculta a mensagem após 2 segundos
        }, 2000);
    });
});


// Função para remover certificado
function removerCertificado(certificadoId, certificadoNome) {
    const confirmacao = confirm('Tem certeza que deseja remover este certificado?');
    if (!confirmacao) {
        return;  // Se o usuário cancelar, não faz nada
    }

    // Faz a requisição POST para remover o certificado
    fetch('/api/remover_certificado', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            certificado_id: certificadoId,
            certificado_nome: certificadoNome,
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            alert(data.message);
            // Atualizar a página ou remover o certificado da UI
            location.reload();  // Atualiza a página para refletir a remoção
        }
    })
    .catch(error => {
        console.error('Erro ao remover o certificado:', error);
        alert('Ocorreu um erro ao remover o certificado.');
    });
}

// Função para abrir o popup de solicitações
function abrirSolicitacoes() {
    // Fazer uma requisição para obter as solicitações
    fetch('/api/solicitacoes')
        .then(response => response.json())
        .then(data => {
            if (data.solicitacoes) {
                carregarSolicitacoes(data.solicitacoes);  // Carregar as solicitações no popup
                atualizarContadorSolicitacoes(data.solicitacoes.filter(s => !s.lido).length);  // Atualizar o contador com solicitações não lidas
            } else {
                console.error('Erro ao carregar as solicitações:', data.error);
            }
        })
        .catch(error => console.error('Erro na requisição:', error));

    document.getElementById("popupSolicitacoes").style.display = "block";
}

// Função para fechar o popup de solicitações
function fecharSolicitacoes() {
    document.getElementById("popupSolicitacoes").style.display = "none";
}

// Função para atualizar o contador de notificações
function atualizarContadorSolicitacoes(count) {
    const notificationCountElement = document.getElementById('notificationCount');
    notificationCountElement.textContent = count;

    // Atualiza a visibilidade do ícone de notificação
    if (count > 0) {
        notificationCountElement.style.display = 'inline-block';
        document.querySelector('.notification-icon').style.backgroundColor = 'red';
    } else {
        notificationCountElement.style.display = 'none';
        document.querySelector('.notification-icon').style.backgroundColor = 'transparent';
    }
}

function exibirStatusTempo(statusTimestamp, tipoStatus) {
    // Verificar se o timestamp é válido e tratar como UTC
    const statusDate = new Date(Date.parse(statusTimestamp));
    
    // Caso o statusTimestamp não esteja em um formato correto, o statusDate será "Invalid Date"
    if (isNaN(statusDate)) {
        console.error(`Data inválida recebida: ${statusTimestamp}`);
        return `${tipoStatus}: data inválida`;
    }

    const now = new Date();
    const diffInSeconds = Math.floor((now - statusDate) / 1000);

    let message = "";

    if (diffInSeconds < 60) {
        message = `${tipoStatus} a poucos segundos.`;
    } else if (diffInSeconds < 600) { // menos de 10 minutos
        message = `${tipoStatus} a poucos minutos.`;
    } else if (diffInSeconds < 3600) { // menos de 1 hora
        const minutes = Math.floor(diffInSeconds / 60);
        message = `${tipoStatus} há ${minutes} minutos.`;
    } else if (statusDate.toDateString() === now.toDateString()) { // mesmo dia
        const timeString = statusDate.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'UTC'
        });
        message = `${tipoStatus} hoje às ${timeString}.`;
    } else if (now.getDate() - statusDate.getDate() === 1 && now.getMonth() === statusDate.getMonth() && now.getFullYear() === statusDate.getFullYear()) {
        // Foi ontem
        const timeString = statusDate.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'UTC'
        });
        message = `${tipoStatus} ontem às ${timeString}.`;
    } else {
        const dateFormatted = statusDate.toLocaleDateString('pt-BR');
        const timeString = statusDate.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'UTC'
        });
        message = `${tipoStatus} no dia ${dateFormatted} às ${timeString}.`;
    }

    return message;
}


function carregarSolicitacoes(solicitacoes) {
    const lista = document.getElementById('solicitacoesList');
    lista.innerHTML = '';  // Limpar a lista antes de adicionar novos itens

    solicitacoes.forEach(solicitacao => {
        const li = document.createElement('li');

        // Informações principais da solicitação
        let statusVisto = '';
        let statusAceito = '';

        if (solicitacao.lido) {
            statusVisto = exibirStatusTempo(solicitacao.data_visto, "Visto");
        }

        if (solicitacao.status === 'aceito') {
            statusAceito = exibirStatusTempo(solicitacao.data_aceito, "Aceito");
        }

        // Conteúdo do HTML para o item da lista
        let detalhesHtml = `
            <p><strong>Orçamento:</strong> ${solicitacao.orcamento}</p>
            <p><strong>Urgência:</strong> ${solicitacao.urgencia}</p>
            <p><strong>Data de Contato:</strong> ${solicitacao.data_contato}</p>
            <p><strong>Hora de Contato:</strong> ${solicitacao.hora_contato}</p>
            <p><strong>Contato Cliente:</strong> ${solicitacao.contato_cliente}</p>
        `;

        // Condicional para exibir os botões ou a mensagem "Resposta já dada"
        if (solicitacao.status === 'aceito' || solicitacao.status === 'não aceito') {
            detalhesHtml += `<p><strong>Resposta:</strong> Resposta já dada</p>`;
        } else {
            detalhesHtml += `
            <button onclick="aceitarServico(${solicitacao.id})" style="background: none; border: none; cursor: pointer;">
                <img src="/static/images/verifica_aceitar.png" alt="Aceitar" style="width: 24px; height: 24px; vertical-align: middle;">
            </button>
            <button onclick="recusarServico(${solicitacao.id})" style="background: none; border: none; cursor: pointer;">
                <img src="/static/images/recusar.png" alt="Recusar" style="width: 24px; height: 24px; vertical-align: middle;">
            </button>
            `;
        }

        // Exibir as informações da solicitação
        li.innerHTML = `
        <strong>Solicitação de ${solicitacao.nome_cliente}:</strong> ${solicitacao.mensagem}
        <br><small>${exibirStatusTempo(solicitacao.data_solicitacao_cliente, "Solicitado")}</small>
        <button onclick="toggleDetalhes(${solicitacao.id})" style="background: none; border: none; cursor: pointer;">
            <img src="/static/images/ver-mais.png" alt="Ver Mais" style="width: 33px; height: 33px; vertical-align: middle;">
        </button>
        <div id="detalhes-${solicitacao.id}" style="display:none; margin-top:10px;">
            ${detalhesHtml}
        </div>
    `;
    
    

        lista.appendChild(li);
    });
}

// Função para aceitar o serviço
function aceitarServico(solicitacaoId) {
    fetch(`/api/aceitar_servico/${solicitacaoId}`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            alert('Serviço aceito com sucesso!');
            // Aqui você pode fechar o modal ou atualizar o status da solicitação
        } else {
            console.error('Erro ao aceitar o serviço:', data.error);
        }
    })
    .catch(error => console.error('Erro na requisição:', error));
}

function recusarServico(solicitacaoId) {
    fetch(`/api/nao_aceitar_servico/${solicitacaoId}`, {
        method: 'POST'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.message) {
            alert('Serviço recusado com sucesso!');
        } else {
            console.error('Erro ao recusar o serviço:', data.error);
        }
    })
    .catch(error => console.error('Erro na requisição:', error));
}


// Função para exibir/esconder os detalhes de uma solicitação e marcar como lida
function toggleDetalhes(solicitacaoId) {
    const detalhes = document.getElementById(`detalhes-${solicitacaoId}`);
    if (detalhes.style.display === "none") {
        detalhes.style.display = "block";

        // Marcar a solicitação como lida
        fetch(`/api/marcar_lido/${solicitacaoId}`, {
            method: 'POST'
        }).then(response => response.json())
        .then(data => {
            if (data.message) {
                console.log('Solicitação marcada como lida.');
            } else {
                console.error('Erro ao marcar a solicitação como lida:', data.error);
            }
        })
        .catch(error => console.error('Erro na requisição:', error));
    } else {
        detalhes.style.display = "none";
    }
}


// Função para verificar novas solicitações a cada intervalo de tempo
function verificarNovasSolicitacoes() {
    fetch('/api/verificar_solicitacoes')  // Rota para retornar o número de novas solicitações
        .then(response => response.json())
        .then(data => {
            const count = data.count;  // data.count contém o número de novas solicitações
            atualizarContadorSolicitacoes(count);
        })
        .catch(error => {
            console.error('Erro ao verificar novas solicitações:', error);
        });
}

// Chamar a função para verificar solicitações a cada 10 segundos
setInterval(verificarNovasSolicitacoes, 10000);  // 10 segundos

// Inicializar a contagem de solicitações ao carregar a página
verificarNovasSolicitacoes();


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
    const prestadorId = prestador.prestador_id;
    const fotoId = document.querySelector('.profile-photo').getAttribute('data-id');

    if (!fotoId || fotoId === 'None' || fotoId === '404') {
        console.error('ID da foto de perfil inválido.');
        return;
    }

    fetch('/api/remover_foto_perfil', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            'prestador_id': prestadorId,
            'foto_id': fotoId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.querySelector('.profile-photo').style.backgroundImage = 'none';
            document.getElementById('perfil_foto').value = '';
            alternarParaIconeCarregar();  // Alterna para o ícone de carregar
            console.log(data.message);
        } else {
            console.error(data.message);
        }
    })
    .catch(error => console.error('Erro ao remover a foto de perfil:', error));
});

document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.querySelector('.btn-save');
    const buttonContainer = document.querySelector('#button-container');

    // Função para alternar a posição do botão
    function toggleButtonPosition() {
        const containerBottom = buttonContainer.getBoundingClientRect().bottom;
        const viewportHeight = window.innerHeight;

        if (containerBottom > viewportHeight) {
            // Aplica classe de flutuação com animação de entrada
            saveButton.classList.add('floating');
            saveButton.classList.add('slide-up');
            saveButton.classList.remove('slide-in'); // Remove animação de entrada no lugar original
        } else {
            // Remove a flutuação e aplica a animação de entrada ao retornar ao local original
            saveButton.classList.remove('floating');
            saveButton.classList.remove('slide-up');
            saveButton.classList.add('slide-in');
        }
    }

    // Função debounce para limitar a execução da função
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // Chama a função imediatamente ao carregar a página
    toggleButtonPosition();

    // Adiciona o evento scroll com debounce
    window.addEventListener('scroll', debounce(toggleButtonPosition, 100));
});

function logoutUser() {
    // Redirecionar para a página de login
    window.location.href = '/login';
}
