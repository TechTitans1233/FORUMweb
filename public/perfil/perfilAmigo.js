// perfilAMIGO.js

document.addEventListener('DOMContentLoaded', async () => {
    const amigoId = localStorage.getItem('amigoId');
    const amigoName = localStorage.getItem('amigoName'); // Pode ser útil para fallbacks
    const amigoEmail = localStorage.getItem('amigoEmail'); // Pode ser útil para fallbacks
    const currentUserName = localStorage.getItem("userName");
    const currentUserId = localStorage.getItem("userId");
    const token = localStorage.getItem('token'); // Adicionado para enviar em headers

    if (!amigoId) {
        console.error("ID do amigo não encontrado no localStorage.");
        alert("Não foi possível carregar o perfil do amigo. Retornando para o perfil principal.");
        window.location.href = '../perfil/perfil.html';
        return;
    }
    if (!currentUserId) {
        console.warn("ID do usuário logado não encontrado. Algumas funcionalidades podem não funcionar.");
    }
    if (!token) {
        console.warn("Token de autenticação não encontrado. Algumas funcionalidades (curtir, comentar, seguir) podem não funcionar.");
    }

    async function loadAmigoProfileData() {
        try {
            const response = await fetch(`/api/users/${amigoId}`);
            if (!response.ok) {
                throw new Error('Erro ao carregar dados do amigo.');
            }
            const amigoData = await response.json();
            document.getElementById('userNameDisplayAMIGO').innerText = amigoData.name;
            document.getElementById('userEMAILamigo').innerText = amigoData.email;
        } catch (error) {
            console.error('Erro ao carregar dados do perfil do amigo:', error);
            document.getElementById('userNameDisplayAMIGO').innerText = amigoName || "Nome do AMIGO (erro)";
            document.getElementById('userEMAILamigo').innerText = amigoEmail || "Email do AMIGO (erro)";
        }
    }
    await loadAmigoProfileData();

    async function loadAmigoFollowCounts(id) {
        try {
            const [followersResponse, followingResponse] = await Promise.all([
                fetch(`/api/users/${id}/seguidores`),
                fetch(`/api/users/${id}/seguindo`)
            ]);

            if (!followersResponse.ok) throw new Error('Erro ao carregar seguidores do amigo.');
            if (!followingResponse.ok) throw new Error('Erro ao carregar seguindo do amigo.');

            const followersData = await followersResponse.json();
            const followingData = await followingResponse.json();

            document.getElementById("followerCountAMIGO").innerText = followersData.quantidadeSeguidores;
            document.getElementById("followingCountAMIGO").innerText = followingData.quantidadeSeguindo;

        } catch (error) {
            console.error('Erro ao carregar contagens de seguidores/seguindo do amigo:', error);
            document.getElementById("followerCountAMIGO").innerText = 'Erro';
            document.getElementById("followingCountAMIGO").innerText = 'Erro';
        }
    }
    await loadAmigoFollowCounts(amigoId);

    const infoPerfilContainer = document.querySelector('.info-perfil');
    if (infoPerfilContainer && currentUserId && amigoId && currentUserId !== amigoId) {
        const seguirBtn = document.createElement('button');
        seguirBtn.id = 'seguirBtn';
        seguirBtn.innerText = 'Carregando...';
        seguirBtn.classList.add('action-button');
        infoPerfilContainer.appendChild(seguirBtn);

        async function checkIfFollowingAndSetButton(currentUserId, targetAmigoId, button) {
            if (!token) { // Verifica a presença do token antes de fazer a chamada
                button.innerText = 'Login para seguir';
                button.disabled = true;
                return;
            }
            try {
                const response = await fetch(`/api/amigos/check/${currentUserId}/${targetAmigoId}`, {
                    headers: { 'Authorization': `Bearer ${token}` } // Adiciona o token
                });
                if (response.ok) {
                    const { isFollowing } = await response.json();
                    if (isFollowing) {
                        button.innerText = 'Deixar de Seguir';
                        button.dataset.status = 'seguindo';
                    } else {
                        button.innerText = 'Seguir';
                        button.dataset.status = 'naoSeguindo';
                    }
                    button.disabled = false;
                } else {
                    button.innerText = 'Erro';
                    button.disabled = true;
                    console.error('Erro ao verificar status de seguir.');
                }
            } catch (error) {
                console.error('Erro ao verificar status de seguir:', error);
                button.innerText = 'Erro';
                button.disabled = true;
            }
        }

        await checkIfFollowingAndSetButton(currentUserId, amigoId, seguirBtn);

        seguirBtn.addEventListener('click', async () => {
            const currentStatus = seguirBtn.dataset.status;
            seguirBtn.disabled = true;

            if (!token) {
                alert("Você precisa estar logado para seguir/deixar de seguir.");
                seguirBtn.disabled = false;
                return;
            }

            try {
                if (currentStatus === 'naoSeguindo') {
                    const response = await fetch('/api/amigos', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}` // Adiciona o token
                        },
                        body: JSON.stringify({ amigoId: amigoId }), // A API espera apenas 'amigoId', 'usuarioId' vem do token
                    });
                    const data = await response.json();
                    if (response.ok) {
                        alert(data.message);
                        seguirBtn.innerText = 'Deixar de Seguir';
                        seguirBtn.dataset.status = 'seguindo';
                        await loadAmigoFollowCounts(amigoId);
                    } else {
                        alert(`Erro ao seguir: ${data.message}`);
                    }
                } else {
                    const response = await fetch(`/api/amigos/${currentUserId}/${amigoId}`, { // Presumo que você tenha uma rota DELETE para amigos
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` } // Adiciona o token
                    });
                    const data = await response.json();
                    if (response.ok) {
                        alert(data.message);
                        seguirBtn.innerText = 'Seguir';
                        seguirBtn.dataset.status = 'naoSeguindo';
                        await loadAmigoFollowCounts(amigoId);
                    } else {
                        alert(`Erro ao deixar de seguir: ${data.message}`);
                    }
                }
            } catch (error) {
                console.error('Erro na operação de seguir/deixar de seguir:', error);
                alert('Ocorreu um erro. Tente novamente.');
            } finally {
                seguirBtn.disabled = false;
            }
        });
    } else if (currentUserId === amigoId) {
        const editProfileBtn = document.createElement('button');
        editProfileBtn.id = 'editProfileBtn';
        editProfileBtn.innerText = 'Editar Meu Perfil';
        editProfileBtn.classList.add('action-button');
        infoPerfilContainer.appendChild(editProfileBtn);
        editProfileBtn.addEventListener('click', () => {
            window.location.href = '../perfil/perfil.html';
        });
    }

    // --- Carregar publicações do amigo ---
    async function loadAmigoPublications() {
        try {
            const response = await fetch(`/api/users/${amigoId}/publications`);
            if (!response.ok) {
                throw new Error('Erro ao carregar publicações do amigo.');
            }
            const data = await response.json();
            const publicacoes = data.publications;

            const publicationsContainer = document.getElementById('publications');
            publicationsContainer.innerHTML = '';
            document.getElementById("postCountAMIGO").innerText = publicacoes.length;

            if (publicacoes.length === 0) {
                publicationsContainer.innerHTML = '<p>Nenhuma publicação encontrada para este usuário.</p>';
                return;
            }

            for (const post of publicacoes) {
                const publicationHTML = document.createElement('div');
                publicationHTML.classList.add('publicacao');
                // Adicione o data-user-id para facilitar o rastreamento, se necessário
                publicationHTML.dataset.userId = post.userId; 

                const dataCriacao = post.dataCriacao instanceof Date ? post.dataCriacao : new Date(post.dataCriacao);

                publicationHTML.innerHTML = `
                    <div class="cabecalho">
                        <img src="foto_usuario.jpg" alt="Foto do Usuário" class="foto-usuario">
                        <div class="info-usuario">
                            <span class="nome-usuario">${post.usuario || data.user.name || 'Nome Desconhecido'}</span>
                            <span class="tempo-postagem">${dataCriacao.toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="titulo-publicacao">${post.titulo}</div>
                    <div class="location-section">
                        <div id="map-${post.id}" class="map-box" style="height: 200px;"></div>
                    </div>
                    <div class="acoes">
                        <button class="curtir" data-id="${post.id}">Curtir <span class="curtidas-count">${post.curtidas || 0}</span></button>
                        <div class="comentarios-section">
                            <input type="text" placeholder="Escreva um comentário..." class="comentario-input">
                            <button class="enviar-comentario" data-id="${post.id}">Comentar</button>
                        </div>
                    </div>
                    <div class="toggle-comentarios" onclick="toggleComentarios(this)">Mostrar Comentários</div>
                    <div class="lista-comentarios" style="display: none;"></div>`;

                publicationsContainer.appendChild(publicationHTML);

                // Inicialização do mapa
                if (typeof L !== 'undefined' && post.lat && post.lon) {
                    const newMap = L.map(`map-${post.id}`).setView([post.lat, post.lon], 13);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; OpenStreetMap contributors'
                    }).addTo(newMap);
                    L.marker([post.lat, post.lon]).addTo(newMap)
                        .bindPopup(`<b>${post.titulo}</b><br>${post.endereco}`).openPopup();
                } else {
                    console.warn("Leaflet (L) não está carregado ou coordenadas inválidas. O mapa não será exibido para o post:", post.id);
                    publicationHTML.querySelector(`#map-${post.id}`).style.display = 'none';
                }

                // Lógica do botão Curtir
                const curtirButton = publicationHTML.querySelector('.curtir');
                // Verifica se o usuário logado já curtiu esta publicação (requer 'usersWhoLiked' no backend, ou consulta separada)
                // Nota: Seu backend não retorna 'usersWhoLiked' diretamente na rota de publicações do usuário.
                // Isso exigiria uma chamada adicional ou modificação do backend para incluir essa informação.
                // Por enquanto, o `hasLiked` abaixo não funcionará sem essa info.
                // Como alternativa, você pode verificar no backend quando a requisição de curtir é feita.
                // hasLiked será sempre falso aqui a menos que você adicione 'usersWhoLiked' ao objeto 'post' vindo da API.
                const hasLiked = false; // Placeholder, pois o backend atual não fornece 'usersWhoLiked' aqui.
                
                // Se a API de publicações não retornar 'usersWhoLiked', você pode precisar fazer uma verificação adicional.
                // Ou, se a contagem 'curtidas' for suficiente, remova a lógica de `hasLiked` do frontend aqui.
                // Para uma verificação real de "você curtiu", a API de publicações precisaria retornar `usersWhoLiked`
                // ou uma flag `isLikedByCurrentUser`.

                // A lógica abaixo para desabilitar o botão e mudar o texto só funcionará se `hasLiked` for verdadeiro.
                // Se o `hasLiked` for sempre falso, esta parte não terá efeito.
                if (hasLiked) {
                    curtirButton.disabled = true;
                    curtirButton.innerHTML = `Você curtiu (${post.curtidas || 0})`;
                }
                curtirButton.addEventListener('click', () => {
                    curtirPublicacaoAmigo(post.id, curtirButton, currentUserId);
                });

                await loadCommentsForPublicationAmigo(post.id, publicationHTML.querySelector('.lista-comentarios'));
            }
        } catch (error) {
            console.error('Erro ao carregar publicações do amigo:', error);
            document.getElementById("publications").innerHTML = '<p>Erro ao carregar publicações do amigo.</p>';
            document.getElementById("postCountAMIGO").innerText = 'Erro';
        }
    }

    loadAmigoPublications();

    async function loadCommentsForPublicationAmigo(postId, commentsListElement) {
        try {
            const response = await fetch(`/api/publicacoes/${postId}/comentarios`);
            if (!response.ok) {
                throw new Error('Erro ao carregar comentários do amigo.');
            }
            const comentarios = await response.json();
            commentsListElement.innerHTML = '';
            comentarios.forEach(comentario => {
                const comentarioHTML = `
                    <div class="comentario">
                        <img src="foto_usuario.jpg" alt="Foto do Usuário" class="foto-usuario">
                        <div class="info-comentario">
                            <span class="nome-usuario">${comentario.usuario}</span>
                            <span class="tempo-comentario">${new Date(comentario.dataCriacao).toLocaleString()}</span>
                            <div class="texto-comentario">${comentario.comentario}</div>
                        </div>
                    </div>`;
                commentsListElement.innerHTML += comentarioHTML;
            });
        } catch (error) {
            console.error('Erro ao carregar comentários do amigo:', error);
        }
    }

    async function curtirPublicacaoAmigo(postId, button, userId) {
        if (!userId || !token) { // Verifica userId e token
            alert("Você precisa estar logado para curtir uma publicação.");
            return;
        }
        try {
            const response = await fetch(`/api/publicacoes/${postId}/curtir`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Envia o token
                },
                body: JSON.stringify({ userId }), // O userId é enviado no corpo, mas o backend pega do token
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao curtir a publicação do amigo');
            }

            const data = await response.json();
            console.log(data.message);

            const curtidasCountSpan = button.querySelector('.curtidas-count');
            curtidasCountSpan.textContent = parseInt(curtidasCountSpan.textContent) + 1;
            button.disabled = true;
            button.innerHTML = `Você curtiu (${curtidasCountSpan.textContent})`;
        } catch (error) {
            console.error(error.message);
            alert(error.message);
        }
    }

    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('enviar-comentario')) {
            const publicacaoId = e.target.dataset.id;
            const comentarioInput = e.target.closest('.publicacao').querySelector('.comentario-input');
            const comentario = comentarioInput.value.trim();

            if (!comentario) {
                alert("Por favor, escreva um comentário.");
                return;
            }
            if (!currentUserId || !currentUserName || !token) { // Verifica tudo
                alert("Você precisa estar logado para comentar.");
                return;
            }

            try {
                const response = await fetch('/api/comentarios', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` // Envia o token
                    },
                    // O backend já pega usuario e usuarioId do token, então não precisa enviar no body.
                    body: JSON.stringify({ publicacaoId, comentario })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Erro ao enviar comentário.');
                }
                const data = await response.json();
                console.log('Comentário adicionado:', data);

                const listaComentarios = e.target.closest('.publicacao').querySelector('.lista-comentarios');
                const novoComentarioHTML = `
                    <div class="comentario">
                        <img src="foto_usuario.jpg" alt="Foto do Usuário" class="foto-usuario">
                        <div class="info-comentario">
                            <span class="nome-usuario">${data.usuario}</span>
                            <span class="tempo-comentario">${new Date(data.dataCriacao).toLocaleString()}</span>
                            <div class="texto-comentario">${data.comentario}</div>
                        </div>
                    </div>`;
                listaComentarios.innerHTML += novoComentarioHTML;
                listaComentarios.style.display = 'block';
                comentarioInput.value = '';
            } catch (error) {
                console.error("Erro ao enviar comentário:", error);
                alert("Erro ao enviar comentário: " + error.message);
            }
        }
    });

    // Função global para alternar comentários
    window.toggleComentarios = (button) => {
        const listaComentarios = button.closest('.publicacao').querySelector('.lista-comentarios');
        if (listaComentarios.style.display === 'none' || listaComentarios.style.display === '') {
            listaComentarios.style.display = 'block';
            button.textContent = 'Ocultar Comentários';
        } else {
            listaComentarios.style.display = 'none';
            button.textContent = 'Mostrar Comentários';
        }
    };
});