// perfil.js

document.addEventListener('DOMContentLoaded', async () => {
    // Inicialização de variáveis do usuário logado
    const userName = localStorage.getItem("userName") || "Nome do Usuário";
    const userEmail = localStorage.getItem("userEmail") || "usuario@email.com";
    const userId = localStorage.getItem("userId");

    // Verifica se o ID do usuário está presente
    if (!userId) {
        console.error("ID do usuário não encontrado no localStorage. Certifique-se de que o usuário está logado.");
        alert("Parece que você não está logado. Por favor, faça o login novamente.");
        window.location.href = '/login.html'; // Redireciona para a página de login
        return;
    }

    // Atualiza as informações básicas do perfil
    document.getElementById("userNameDisplay").innerText = userName;
    document.getElementById("userEMAIL").innerText = userEmail;
    document.getElementById("postCount").innerText = 0;
    document.getElementById("followerCount").innerText = 0;
    document.getElementById("followingCount").innerText = 0;

    // --- Funções de Carregamento e Manipulação ---

    /**
     * Carrega as contagens de seguidores e seguindo para o usuário.
     * @param {string} id O ID do usuário.
     */
    async function loadFollowCounts(id) {
        try {
            const [followersResponse, followingResponse] = await Promise.all([
                fetch(`/api/users/${id}/seguidores`),
                fetch(`/api/users/${id}/seguindo`)
            ]);

            if (!followersResponse.ok) throw new Error('Erro ao carregar seguidores.');
            if (!followingResponse.ok) throw new Error('Erro ao carregar seguindo.');

            const followersData = await followersResponse.json();
            const followingData = await followingResponse.json();

            document.getElementById("followerCount").innerText = followersData.quantidadeSeguidores;
            document.getElementById("followingCount").innerText = followingData.quantidadeSeguindo;

        } catch (error) {
            console.error('Erro ao carregar contagens de seguidores/seguindo:', error);
            document.getElementById("followerCount").innerText = 'Erro';
            document.getElementById("followingCount").innerText = 'Erro';
        }
    }

    /**
     * Carrega e renderiza as publicações do usuário.
     */
    async function loadUserPublications() {
        try {
            const response = await fetch(`/api/users/${userId}/publications`);
            if (!response.ok) {
                throw new Error('Erro ao carregar publicações do usuário.');
            }
            const data = await response.json();
            const publicacoes = data.publications;
            const publicationsContainer = document.getElementById('publications');
            publicationsContainer.innerHTML = ''; // Limpa o conteúdo anterior
            document.getElementById("postCount").innerText = publicacoes.length;

            if (publicacoes.length === 0) {
                publicationsContainer.innerHTML = '<p>Nenhuma publicação encontrada.</p>';
                return;
            }

            for (const post of publicacoes) {
                const publicationHTML = document.createElement('div');
                publicationHTML.classList.add('publicacao');
                publicationHTML.dataset.userId = post.userId; // Útil para verificar a autoria

                // Certifique-se de que post.dataCriacao é um objeto Date
                const dataCriacao = post.dataCriacao instanceof Date ? post.dataCriacao : new Date(post.dataCriacao);

                publicationHTML.innerHTML = `
                    <div class="cabecalho">
                        <img src="foto_usuario.jpg" alt="Foto do Usuário" class="foto-usuario">
                        <div class="info-usuario">
                            <span class="nome-usuario">${post.usuario || 'Nome Desconhecido'}</span>
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

                // Inicializa o mapa Leaflet
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

                // Configura o botão de curtir
                const curtirButton = publicationHTML.querySelector('.curtir');
                const hasLiked = post.usersWhoLiked && post.usersWhoLiked.includes(userId);
                if (hasLiked) {
                    curtirButton.disabled = true;
                    curtirButton.innerHTML = `Você curtiu (${post.curtidas || 0})`;
                }
                curtirButton.addEventListener('click', () => {
                    curtirPublicacao(post.id, curtirButton);
                });

                // Carrega os comentários para a publicação
                await loadCommentsForPublication(post.id, publicationHTML.querySelector('.lista-comentarios'));
            }
        } catch (error) {
            console.error('Erro ao carregar publicações:', error);
            document.getElementById("publications").innerHTML = '<p>Erro ao carregar publicações.</p>';
            document.getElementById("postCount").innerText = 'Erro';
        }
    }

    /**
     * Carrega os comentários para uma publicação específica.
     * @param {string} postId O ID da publicação.
     * @param {HTMLElement} commentsListElement O elemento HTML onde os comentários serão listados.
     */
    async function loadCommentsForPublication(postId, commentsListElement) {
        try {
            const response = await fetch(`/api/publicacoes/${postId}/comentarios`);
            if (!response.ok) {
                throw new Error('Erro ao carregar comentários.');
            }
            const comentarios = await response.json();
            commentsListElement.innerHTML = '';
            comentarios.forEach(comentario => {
                const dataComentario = comentario.dataCriacao instanceof Date ? comentario.dataCriacao : new Date(comentario.dataCriacao);
                const comentarioHTML = `
                    <div class="comentario">
                        <img src="foto_usuario.jpg" alt="Foto do Usuário" class="foto-usuario">
                        <div class="info-comentario">
                            <span class="nome-usuario">${comentario.usuario || 'Nome Desconhecido'}</span>
                            <span class="tempo-comentario">${dataComentario.toLocaleString()}</span>
                            <div class="texto-comentario">${comentario.comentario}</div>
                        </div>
                    </div>`;
                commentsListElement.innerHTML += comentarioHTML;
            });
        } catch (error) {
            console.error('Erro ao carregar comentários:', error);
        }
    }

    /**
     * Envia uma curtida para uma publicação.
     * @param {string} postId O ID da publicação.
     * @param {HTMLElement} button O botão de curtir clicado.
     */
    async function curtirPublicacao(postId, button) {
        if (!userId) {
            alert("Você precisa estar logado para curtir uma publicação.");
            return;
        }
        try {
            const response = await fetch(`/api/publicacoes/${postId}/curtir`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao curtir a publicação');
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

    /**
     * Atualiza os dados do usuário no backend.
     * @param {string} id O ID do usuário.
     * @param {string} newName O novo nome do usuário.
     * @param {string} newEmail O novo email do usuário.
     * @param {string} password A senha para autenticação.
     * @returns {Promise<boolean>} True se a atualização for bem-sucedida, false caso contrário.
     */
    const updateUser = async (id, newName, newEmail, password) => {
        try {
            const response = await fetch(`/admin/usuarios/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newName, newEmail, password })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao atualizar os dados no banco de dados');
            }
            return true;
        } catch (error) {
            console.error('Erro:', error);
            alert(error.message);
            return false;
        }
    };

    /**
     * Deleta a conta do usuário.
     * @param {string} userIdToDelete O ID do usuário a ser deletado.
     */
    const deleteUser = async (userIdToDelete) => {
        try {
            const response = await fetch(`/admin/usuarios/${userIdToDelete}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao deletar a conta');
            }

            alert('Conta deletada com sucesso.');
            localStorage.clear();
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao deletar a conta: ' + error.message);
        }
    };

    /**
     * Atualiza o nome do usuário nas publicações já renderizadas na página.
     * @param {string} newName O novo nome a ser exibido.
     */
    const updatePublicationsUserName = (newName) => {
        const publications = document.querySelectorAll('.publicacao[data-user-id="' + userId + '"] .nome-usuario');
        publications.forEach(userNameElement => {
            userNameElement.innerText = newName;
        });
    };

    // --- Funções Auxiliares para Event Listeners ---

    // Define os manipuladores de evento para serem reutilizados e removidos/adicionados
    const searchInputHandler = async (e) => {
        const query = e.target.value.trim();
        const usuariosEncontrados = document.getElementById('usuariosEncontrados');
        if (query.length > 0) {
            try {
                const response = await fetch(`/api/users/name/${encodeURIComponent(query)}`);
                if (!response.ok) {
                    if (response.status === 404) {
                        usuariosEncontrados.innerHTML = '<p>Nenhum usuário encontrado.</p>';
                        return;
                    }
                    throw new Error('Erro na busca de usuários.');
                }
                const users = await response.json();
                usuariosEncontrados.innerHTML = '';
                if (users.length === 0) {
                    usuariosEncontrados.innerHTML = '<p>Nenhum usuário encontrado.</p>';
                    return;
                }
                users.forEach(user => {
                    // Evita mostrar o próprio usuário logado nos resultados da busca
                    if (user.id === userId) {
                        return;
                    }
                    const userHTML = `
                        <div class="perfil">
                            <img src="foto_usuario.jpg" alt="Foto de ${user.name}" class="foto-perfil">
                            <div class="info-perfil">
                                <h1 class="nome">${user.name}</h1>
                                <a href="#" class="ver-perfil" data-id="${user.id}" data-name="${user.name}" data-email="${user.email}">Ver perfil</a>
                            </div>
                        </div>`;
                    usuariosEncontrados.innerHTML += userHTML;
                });

                // Anexa listeners aos links "Ver perfil" recém-criados
                document.querySelectorAll('.ver-perfil').forEach(link => {
                    link.addEventListener('click', (event) => {
                        event.preventDefault();
                        localStorage.setItem('amigoId', link.dataset.id);
                        localStorage.setItem('amigoName', link.dataset.name);
                        localStorage.setItem('amigoEmail', link.dataset.email);
                        window.location.href = '../perfil/perfilAMIGO.html';
                    });
                });
            } catch (error) {
                console.error('Erro ao buscar usuários:', error);
                usuariosEncontrados.innerHTML = '<p>Erro ao buscar usuários.</p>';
            }
        } else {
            usuariosEncontrados.innerHTML = '';
        }
    };

    const btnOcultarHandler = () => {
        const usuariosOcultos = document.getElementById('usuariosOcultos');
        const btnOcultar = document.getElementById('btnOcultar');
        if (usuariosOcultos.style.display === 'none' || usuariosOcultos.style.display === '') {
            usuariosOcultos.style.display = 'block';
            btnOcultar.innerText = 'Ocultar usuários';
        } else {
            usuariosOcultos.style.display = 'none';
            btnOcultar.innerText = 'Mostrar mais usuários';
        }
    };

    const deleteUserButtonHandler = async function () {
        if (confirm('Tem certeza que deseja deletar sua conta? Esta ação é irreversível.')) {
            await deleteUser(userId);
        }
    };

    // --- Gerenciamento da Edição de Perfil ---

    let originalContent; // Armazenará o HTML original do main

    const createEditProfileForm = (nome, email) => {
        return `
            <h2>Editar Perfil</h2>
            <section class="user-header">
                <div class="user-photo-container">
                    <div class="user-photo">
                        <img src="sua-foto.jpg" alt="Foto do Usuário">
                    </div>
                    <div class="user-name">
                        <p id="userNameDisplayEdit">${nome}</p>
                    </div>
                    <button id="substituirFotoBtn">Substituir Imagem</button>
                </div>
            </section>
            <section class="edit-profile-form">
                <form id="profile-form">
                    <div class="form-group">
                        <label for="nome">Nome:</label>
                        <input type="text" id="nome" placeholder="Novo Nome" value="${nome}" required>
                    </div>
                    <div class="form-group">
                        <label for="email">Email:</label>
                        <input type="email" id="email" placeholder="Novo Email" value="${email}" required>
                    </div>
                    <div class="form-group">
                        <label for="senha">Senha:</label>
                        <input type="password" id="senha" placeholder="Senha para confirmar" required>
                    </div>
                    <button type="submit" class="save-btn">Salvar Alterações</button>
                    <button type="button" id="cancelEditBtn" class="cancel-btn">Cancelar</button>
                </form>
            </section>
        `;
    };

    const editarPerfilBtn = document.getElementById("editProfileButton");

    if (editarPerfilBtn) {
        editarPerfilBtn.addEventListener("click", () => {
            originalContent = document.querySelector('main').innerHTML; // Salva o conteúdo original
            document.querySelector('main').innerHTML = createEditProfileForm(userName, userEmail);

            // Anexa listeners aos botões do formulário de edição (que foram recém-criados)
            document.getElementById("cancelEditBtn").addEventListener("click", () => {
                document.querySelector('main').innerHTML = originalContent; // Restaura o conteúdo original
                setupInitialListeners(); // Re-anexa todos os listeners iniciais
            });

            document.getElementById("profile-form").addEventListener("submit", async function (event) {
                event.preventDefault();
                const newName = document.getElementById("nome").value;
                const newEmail = document.getElementById("email").value;
                const password = document.getElementById("senha").value;

                const result = await updateUser(userId, newName, newEmail, password);
                if (result) {
                    localStorage.setItem('userName', newName);
                    localStorage.setItem('userEmail', newEmail);
                    document.getElementById('userNameDisplay').innerText = newName;
                    document.getElementById('userEMAIL').innerText = newEmail;
                    updatePublicationsUserName(newName); // Atualiza o nome nas publicações existentes
                    document.querySelector('main').innerHTML = originalContent; // Restaura o conteúdo original
                    alert('Perfil atualizado com sucesso!');
                    setupInitialListeners(); // Re-anexa todos os listeners iniciais e recarrega dados
                } else {
                    alert('Erro ao atualizar os dados. Tente novamente.');
                }
            });
        });
    }

    // --- Event Listeners Globais ---
    // Estes listeners são anexados uma vez e delegam os eventos para elementos dinâmicos
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('enviar-comentario')) {
            const publicacaoId = e.target.dataset.id;
            const comentarioInput = e.target.closest('.publicacao').querySelector('.comentario-input');
            const comentario = comentarioInput.value.trim();

            if (!comentario) {
                alert("Por favor, escreva um comentário.");
                return;
            }
            if (!userId || !userName) {
                alert("Você precisa estar logado para comentar.");
                return;
            }

            try {
                const response = await fetch('/api/comentarios', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ publicacaoId, comentario, usuario: userName, usuarioId: userId })
                });

                if (!response.ok) {
                    throw new Error('Erro ao enviar comentário.');
                }
                const data = await response.json();
                console.log('Comentário adicionado:', data);

                const listaComentarios = e.target.closest('.publicacao').querySelector('.lista-comentarios');
                const novoComentarioHTML = `
                    <div class="comentario">
                        <img src="foto_usuario.jpg" alt="Foto do Usuário" class="foto-usuario">
                        <div class="info-comentario">
                            <span class="nome-usuario">${data.usuario || 'Nome Desconhecido'}</span>
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

    // Função global para alternar a exibição de comentários
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

    // --- Configuração Inicial e Re-configuração (para quando o DOM é alterado) ---

    // Esta função será responsável por re-anexar os listeners após a edição do perfil
    function setupInitialListeners() {
        loadFollowCounts(userId); // Recarrega as contagens (elas não são afetadas pela alteração do 'main' em si)
        loadUserPublications();   // Recarrega as publicações (pois o container foi limpo e recriado)

        // Re-anexa listeners para elementos que podem ter sido removidos/re-criados
        // É importante re-selecionar os elementos após a restauração do 'originalContent'
        const currentSearchInput = document.getElementById('searchInput');
        if (currentSearchInput) {
            // Remove o listener anterior para evitar duplicações se já existia um
            currentSearchInput.removeEventListener('input', searchInputHandler);
            currentSearchInput.addEventListener('input', searchInputHandler);
        }

        const currentBtnOcultar = document.getElementById('btnOcultar');
        if (currentBtnOcultar) {
            currentBtnOcultar.removeEventListener('click', btnOcultarHandler);
            currentBtnOcultar.addEventListener('click', btnOcultarHandler);
        }

        const currentDeleteUserButton = document.getElementById('deleteUserButton');
        if (currentDeleteUserButton) {
            currentDeleteUserButton.removeEventListener('click', deleteUserButtonHandler);
            currentDeleteUserButton.addEventListener('click', deleteUserButtonHandler);
        }
    }

    // Chama a configuração inicial quando a página carrega
    setupInitialListeners();
});