document.addEventListener("DOMContentLoaded", function() {
    var modal = document.getElementById("modal");
    var openModalBtn = document.getElementById("open-modal-btn");
    var closeModal = document.getElementsByClassName("close")[0];
    var modalFeedbacks = document.getElementById("modal-feedbacks");

    if (modal && closeModal && modalFeedbacks) {
        // Verifica se o botão existe e adiciona o evento de clique
        if (openModalBtn) {
            openModalBtn.onclick = function() {
                // Limpa o conteúdo do modal antes de carregá-lo
                modalFeedbacks.innerHTML = "";

                // Carrega **todos** os feedbacks do array JSON no modal
                feedbacks.forEach(function(feedback) {
                    modalFeedbacks.innerHTML += `
                        <div class="feedback-item">
                            <p><strong>Cliente:</strong> ${feedback.nome_cliente}</p>
                            <p><strong>Comentário:</strong> ${feedback.comentario}</p>
                            <p><strong>Nota:</strong> ${feedback.nota}</p>
                        </div>
                    `;
                });

                // Exibir o modal
                modal.style.display = "block";
                document.body.classList.add("no-scroll");  // Desativa o scroll
            };
        }

        // Fechar o modal e reativar o scroll da página
        closeModal.onclick = function() {
            modal.style.display = "none";  // Esconde o modal
            document.body.classList.remove("no-scroll");  // Ativa o scroll
        };

        // Fechar o modal clicando fora dele
        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = "none";  // Esconde o modal
                document.body.classList.remove("no-scroll");  // Ativa o scroll
            }
        };
    }
});
