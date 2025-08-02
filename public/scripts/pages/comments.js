 document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('enviar-comentario')) {
        const publicacaoId = e.target.dataset.id;
        const comentarioInput = e.target.previousElementSibling;
        const comentario = comentarioInput.value.trim();

        const userName = localStorage.getItem("userName");

        if (!comentario) {
            alert("Por favor, escreva um comentário.");
            return;
        }

        try {
            const response = await fetch('/api/comentarios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    publicacaoId,
                    comentario
                })
            });

            const data = await response.json();
            if (response.ok) {
                const listaComentarios = e.target.closest('.publicacao').querySelector('.lista-comentarios');
                const dataComentario = data.dataCriacao && data.dataCriacao._seconds ?
                                        new Date(data.dataCriacao._seconds * 1000).toLocaleString() :
                                        new Date().toLocaleString(); // Fallback para data atual se não houver timestamp

                const novoComentarioHTML = `
                    <div class="comentario">
                        <img src="https://www.gravatar.com/avatar/?d=mp&s=128" alt="Usuário Desconhecido" class="foto-perfil-comentario">
                        <div class="info-comentario">
                            <span class="nome-usuario">${data.usuario || userName}</span>
                            <span class="tempo-comentario">${dataComentario}</span>
                            <div class="texto-comentario">${data.comentario}</div>
                        </div>
                    </div>`;
                const noCommentsMessage = listaComentarios.querySelector('.no-comments-message');
                if (noCommentsMessage) {
                    noCommentsMessage.remove();
                }
                listaComentarios.innerHTML += novoComentarioHTML;
                listaComentarios.style.display = 'block';
                comentarioInput.value = '';
            } else {
                alert(`Erro ao enviar comentário: ${data.message || 'Erro desconhecido'}`);
            }
        } catch (error) {
            console.error("Erro ao enviar comentário (rede):", error);
            alert("Erro de rede ao enviar comentário.");
        }
    }
});

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('toggle-comentarios-btn')) {
        const button = e.target;
        const listaComentarios = button.nextElementSibling;

        if (listaComentarios) {
            if (listaComentarios.style.display === 'none') {
                listaComentarios.style.display = 'block';
                button.textContent = 'Ocultar Comentários';
            } else {
                listaComentarios.style.display = 'none';
                button.textContent = 'Mostrar Comentários';
            }
        }
    }
});