document.addEventListener('DOMContentLoaded', () => {
    // Carregar informações do usuário
    const userName = localStorage.getItem("userName");
    const userEmail = localStorage.getItem("userEmail");
    const userId = localStorage.getItem("userId"); // Certifique-se de que o userId está sendo armazenado
    const postCount = 0; // Inicialmente 0, você pode buscar isso do backend
    const followerCount = 0; // Inicialmente 0
    const followingCount = 0; // Inicialmente 0

    document.getElementById("userNameDisplay").innerText = userName;
    document.getElementById("userEMAIL").innerText = userEmail;
    document.getElementById("postCount").innerText = postCount;
    document.getElementById("followerCount").innerText = followerCount;
    document.getElementById("followingCount").innerText = followingCount;

    // Carregar publicações do usuário
    fetch('/api/publicacoes') // Substitua pela sua API
    .then(response => response.json())
    .then(publicacoes => {
        const publicationsContainer = document.getElementById('publications');
        publicationsContainer.innerHTML = ''; // Limpar publicações anteriores
        let postCount = 0; // Inicializa a contagem de posts

        publicacoes.forEach(post => {
            if (post.usuario === userName) {
                postCount++; // Incrementar a contagem de posts
                const publicationHTML = document.createElement('div');
                publicationHTML.classList.add('publicacao');
                publicationHTML.innerHTML = `
                    <div class="cabecalho">
                        <img src="foto_usuario.jpg" alt="Foto do Usuário" class="foto-usuario">
                        <div class="info-usuario">
                            <span class="nome-usuario">${post.usuario}</span>
                            <span class="tempo-postagem">${new Date(post.dataCriacao).toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="titulo-publicacao">${post.titulo}</div>
                    <div class="location-section">
                        <div id="map-${post.id}" class="map-box" style="height: 200px;"></div>
                    </div>
                    <div class="acoes">
                        <button class="curtir" data-id="${post.id}">Curtir <span class="curtidas-count">${post.curtidas || 0}</span></button>
                        <div class="comentarios">
                            <input type="text" placeholder="Escreva um comentário..." class="comentario-input">
                            <button class="enviar-comentario" data-id="${post.id}">Comentar</button>
                        </div>
                    </div>
                    <div class="toggle-comentarios" onclick="toggleComentarios(this)">Mostrar Comentários</div>
                    <div class="lista-comentarios" style="display: none;"></div>`;

                publicationsContainer.appendChild(publicationHTML);

                // Criar o mapa para a publicação
                const newMap = L.map(`map-${post.id}`).setView([post.lat, post.lon], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors'
                }).addTo(newMap);

                L.marker([post.lat, post.lon]).addTo(newMap)
                    .bindPopup(`<b>${post.titulo}</b><br>${post.endereco}`).openPopup();

                // Adicionar evento de clique ao botão de curtir
                const curtirButton = publicationHTML.querySelector('.curtir');
                curtirButton.addEventListener('click', () => {
                    curtirPublicacao(post.id, curtirButton); // Passa o botão como argumento
                });

                // Carregar comentários para a publicação
                fetch(`/api/publicacoes/${post.id}/comentarios`)
                    .then(response => response.json())
                    .then(comentarios => {
                        const listaComentarios = publicationHTML.querySelector('.lista-comentarios');
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
                            listaComentarios.innerHTML += comentarioHTML;
                        });
                    })
                    .catch(error => console.error('Erro ao carregar comentários:', error));
            }
        });

        // Atualizar a contagem de posts após carregar as publicações
        document.getElementById("postCount").innerText = postCount;
    })
    .catch(error => console.error('Erro ao carregar publicações:', error));

    // Evento para enviar comentários ao clicar no botão "Comentar"
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('enviar-comentario')) {
            const publicacaoId = e.target.dataset.id;
            const comentarioInput = e.target.closest('.publicacao').querySelector('.comentario-input');
            const comentario = comentarioInput.value.trim();

            if (!comentario) {
                alert("Por favor, escreva um comentário.");
                return;
            }

            // Enviar o comentário para o backend
            fetch('/api/comentarios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    publicacaoId,
                    comentario,
                    usuario: userName // Incluindo o nome do usuário
                })
            })
            .then(response => response.json())
            .then(data => {
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
                listaComentarios.style.display = 'block'; // Mostrar comentários
                comentarioInput.value = ''; // Limpar o campo de comentário
            })
            .catch(error => {
                console.error("Erro ao enviar comentário:", error);
            });
        }
    });


    // Função para curtir uma publicação
    async function curtirPublicacao(postId, button) {
        const userId = localStorage.getItem("userId"); // Obtém o ID do usuário do localStorage

        if (!userId) {
            alert("Você precisa estar logado para curtir uma publicação.");
            return;
        }

        try {
            const response = await fetch(`/api/publicacoes/${postId}/curtir`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }), // Envia o ID do usuário no corpo da requisição
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao curtir a publicação');
            }

            const data = await response.json();
            console.log(data.message); // Mensagem de sucesso

            // Atualiza a contagem de curtidas na interface
            const curtidasCountSpan = button.querySelector('.curtidas-count');
            curtidasCountSpan.textContent = parseInt(curtidasCountSpan.textContent) + 1; // Incrementa a contagem de curtidas

            // Desabilita o botão de curtir e muda o texto
            button.disabled = true;
            button.textContent = 'Você curtiu esta publicação';
        } catch (error) {
            console.error(error.message);
        }
    }

    // Funcionalidade de pesquisa de usuários
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        if (query.length > 0) {
            fetch(`/api/users/name/${encodeURIComponent(query)}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Nenhum usuário encontrado');
                    }
                    return response.json();
                })
                .then(users => {
                    const usuariosEncontrados = document.getElementById('usuariosEncontrados');
                    usuariosEncontrados.innerHTML = ''; // Limpar resultados anteriores
                    users.forEach(user => {
                        const userHTML = `
                            <div class="perfil">
                                <img src="foto_usuario.jpg" alt="Foto de ${user.name }" class="foto-perfil">
                                <div class="info-perfil">
                                    <h1 class="nome">${user.name}</h1>
                                    <a href="#" class="ver-perfil" data-id="${user.id}" data-name="${user.name}" data-email="${user.email}">Ver perfil</a>
                                </div>
                            </div>`;
                        usuariosEncontrados.innerHTML += userHTML;
                    });

                    // Adicionar evento de clique para cada link "Ver perfil"
                    const verPerfilLinks = document.querySelectorAll('.ver-perfil');
                    verPerfilLinks.forEach(link => {
                        link.addEventListener('click', (event) => {
                            event.preventDefault(); // Prevenir o comportamento padrão do link
                            const userId = link.getAttribute('data-id');
                            const userName = link.getAttribute('data-name');
                            const userEmail = link.getAttribute('data-email');

                            // Salvar informações do usuário em localStorage
                            localStorage.setItem('amigoId', userId);
                            localStorage.setItem('amigoName', userName);
                            localStorage.setItem('amigoEmail', userEmail);

                            console.log('Informações do amigo salvas no localStorage:', {
                                id: userId,
                                name: userName,
                                email: userEmail
                            });

                            window.location.href = '../perfil/perfilAMIGO.html';
                        });
                    });
                })
                .catch(error => {
                    console.error('Erro ao buscar usuários:', error);
                    document.getElementById('usuariosEncontrados').innerHTML = '<p>Nenhum usuário encontrado.</p>';
                });
        } else {
            document.getElementById('usuariosEncontrados').innerHTML = ''; // Limpar resultados se a pesquisa estiver vazia
        }
    });

    // Ocultar/Mostrar usuários
    document.getElementById('btnOcultar').addEventListener('click', () => {
        const usuariosOcultos = document.getElementById('usuariosOcultos');
        if (usuariosOcultos.style.display === 'none' || usuariosOcultos.style.display === '') {
            usuariosOcultos.style.display = 'block';
            document.getElementById('btnOcultar').innerText = 'Ocultar usuários';
        } else {
            usuariosOcultos.style.display = 'none';
            document.getElementById('btnOcultar').innerText = 'Mostrar mais usuários';
        }
    });

    // Código para editar perfil
    let originalContent; // Variável para armazenar o conteúdo original do main

    const editarPerfilBtn = document.getElementById("editProfileButton");
    const editProfileContainer = document.getElementById("editProfileContainer");

    // Função para criar o bloco de edição de perfil
    const createEditProfileForm = (nome, email) => {
        return `
            <h2>Editar Perfil</h2>
            <section class="user-header">
                <div class="user-photo-container">
                    <div class="user-photo">
                        <img src="sua-foto.jpg" alt="Foto do Usuário">
                    </div>
                    <div class="user-name">
                        <p id="userNameDisplay">${nome}</p>
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
                    <button type="button" id="cancelBtn" class="cancel-btn">Cancelar</button>
                </form>
            </section>
        `;
    };

    // Adiciona o evento de clique ao botão de editar perfil
    editarPerfilBtn.addEventListener("click", () => {
        // Armazena o conteúdo original
        originalContent = editProfileContainer.innerHTML;
        // Cria o formulário de edição de perfil
        editProfileContainer.innerHTML = createEditProfileForm("Nome Exemplo", "email@exemplo.com");

        // Adiciona o evento de clique ao botão de cancelar
        const cancelBtn = document.getElementById("cancelBtn");
        cancelBtn.addEventListener("click", () => {
            // Remove o formulário e restaura o conteúdo original
            editProfileContainer.innerHTML = originalContent;
        });
    });

    // Evento para editar perfil
    editarPerfilBtn.addEventListener("click", async (event) => {
        event.preventDefault();

        // Armazenar o conteúdo original
        originalContent = editProfileContainer.innerHTML;

        // Obter nome e email do usuário
        const userName = document.getElementById("userNameDisplay").innerText;
        const userEmail = document.getElementById("userEMAIL").innerText;

        // Criar e exibir o formulário de edição
        editProfileContainer.innerHTML = createEditProfileForm(userName, userEmail);
        editProfileContainer.classList.remove("hidden");

        // Adicionar evento para o formulário de edição
        document .getElementById("profile-form").addEventListener("submit", async function(event) {
            event.preventDefault();
            const newName = document.getElementById("nome").value;
            const newEmail = document.getElementById("email").value;
            const password = document.getElementById("senha").value;

            // Atualizar os dados do usuário
            const result = await updateUser (userId, newName, newEmail, password);
            if (result) {
                // Atualizar o localStorage com os novos dados
                localStorage.setItem('userName', newName);
                localStorage.setItem('userEmail', newEmail);

                // Atualizar a interface com os novos dados
                document.getElementById('userNameDisplay').innerText = newName;
                document.getElementById('userEMAIL').innerText = newEmail;

                // Restaurar o conteúdo original
                editProfileContainer.classList.add("hidden");
                editProfileContainer.innerHTML = originalContent;
            } else {
                alert('Erro ao atualizar os dados. Tente novamente.');
            }
        });
    });

    // Função para atualizar os dados do usuário
    const updateUser  = async (userId, newName, newEmail, password) => {
        try {
            const response = await fetch(`/admin/usuarios/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    newName,
                    newEmail,
                    password // Enviando a senha para verificação
                })
            });

            if (!response.ok) {
                const errorData = await response.json(); // Captura a resposta de erro
                throw new Error(errorData.message || 'Erro ao atualizar os dados no banco de dados');
            }

            // Atualizar o nome nas publicações no frontend
            updatePublicationsUserName(newName); // Chamada correta da função

            return true; // Retorna verdadeiro se a atualização for bem-sucedida
        } catch (error) {
            console.error('Erro:', error);
            alert(error.message); // Exibe a mensagem de erro para o usuário
            return false; // Retorna falso se houver um erro
        }
    };

    // Função para atualizar o nome do usuário nas publicações
    const updatePublicationsUserName = (newName) => {
        const publications = document.querySelectorAll('.publicacao');
        publications.forEach(publication => {
            const userNameElement = publication.querySelector('.nome-usuario');
            if (userNameElement) {
                userNameElement.innerText = newName; // Atualiza o nome exibido
            }
        });
    };

    // Evento para deletar usuário
    document.getElementById('deleteUserButton').addEventListener('click', async function() {
        if (confirm('Tem certeza que deseja deletar sua conta?')) {
            await deleteUser (userId);
        }
    });

    // Função para deletar usuário
    const deleteUser  = async (userId) => {
        try {
            const response = await fetch(`/admin/usuarios/${userId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Erro ao deletar a conta');
            }

            alert('Conta deletada com sucesso.');
            // Redirecionar ou atualizar a interface após a exclusão
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao deletar a conta. Tente novamente.');
        }
    };
});

// Função para alternar a exibição dos comentários
function toggleComentarios(button) {
    const listaComentarios = button.closest('.publicacao').querySelector('.lista-comentarios');
    if (listaComentarios.style.display === 'none' || listaComentarios.style.display === '') {
        listaComentarios.style.display = 'block';
        button.textContent = 'Ocultar Comentários';
    } else {
        listaComentarios.style.display = 'none';
        button.textContent = 'Mostrar Comentários';
    }
}
document.addEventListener('DOMContentLoaded', () => {
    // Carregar informações do amigo do localStorage
    const amigoId = localStorage.getItem('amigoId');
    const amigoName = localStorage.getItem('amigoName');
    const amigoEmail = localStorage.getItem('amigoEmail');

    // Exibir informações do amigo na página
    document.getElementById('userNameDisplayAMIGO').innerText = amigoName || "Nome do AMIGO não encontrado";
    document.getElementById('userEMAILamigo').innerText = amigoEmail || "Email do AMIGO não encontrado";

    // Carregar publicações do amigo
    fetch('/api/publicacoes') // Substitua pela sua API
        .then(response => response.json())
        .then(publicacoes => {
            const publicationsContainer = document.getElementById('publications');
            publicationsContainer.innerHTML = ''; // Limpar publicações anteriores
            let postCountAMIGO = 0; // Inicializa a contagem de posts do amigo

            publicacoes.forEach(post => {
                // Verificar se o nome do usuário da publicação corresponde ao amigoName
                if (post.usuario === amigoName) {
                    postCountAMIGO++; // Incrementar a contagem de posts do amigo
                    const publicationHTML = document.createElement('div');
                    publicationHTML.classList.add('publicacao');
                    publicationHTML.innerHTML = `
                        <div class="cabecalho">
                            <img src="foto_usuario.jpg" alt="Foto do Usuário" class="foto-usuario">
                            <div class="info-usuario">
                                <span class="nome-usuario">${post.usuario}</span>
                                <span class="tempo-postagem">${new Date(post.dataCriacao).toLocaleString()}</span>
                            </div>
                        </div>
                        <div class="titulo-publicacao">${post.titulo}</div>
                        <div class="location-section">
                            <div id="map-${post.id}" class="map-box" style="height: 200px;"></div>
                        </div>
                        <div class="acoes">
                            <button class="curtir" data-id="${post.id}">Curtir <span class="curtidas-count">${post.curtidas || 0}</span></button>
                            <button class="comentar" data-id="${post.id}">Comentar</button>
                        </div>
                        <div class="comentarios">
                            <input type="text" placeholder="Escreva um comentário..." class="comentario-input">
                        </div>
                        <div class="toggle-comentarios" onclick="toggleComentarios(this)">Mostrar Comentários</div>
                        <div class="lista-comentarios" style="display: none;">
                            <!-- Comentários serão adicionados aqui -->
                        </div>`;

                    publicationsContainer.appendChild(publicationHTML);

                    // Criar o mapa para a publicação
                    const newMap = L.map(`map-${post.id}`).setView([post.lat, post.lon], 13);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; OpenStreetMap contributors'
                    }).addTo(newMap);

                    L.marker([post.lat, post.lon]).addTo(newMap)
                        .bindPopup(`<b>${post.titulo}</b><br>${post.endereco}`).openPopup();

                    // Carregar comentários para a publicação
                    fetch(`/api/publicacoes/${post.id}/comentarios`)
                        .then(response => response.json())
                        .then(comentarios => {
                            const listaComentarios = publicationHTML.querySelector('.lista-comentarios');
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
                                listaComentarios.innerHTML += comentarioHTML;
                            });
                        })
                        .catch(error => console.error('Erro ao carregar comentários:', error));
                }
            });

            // Atualizar a contagem de publicações do amigo
            document.getElementById("postCountAMIGO").innerText = postCountAMIGO;
        })
        .catch(error => console.error('Erro ao carregar publicações:', error));

    // Evento para enviar comentários ao clicar no botão "Comentar"
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('comentar')) {
            const publicacaoId = e.target.dataset.id;
            const comentarioInput = e.target.closest('.publicacao').querySelector('.comentario-input');
            const comentario = comentarioInput.value.trim();

            if (!comentario) {
                alert("Por favor, escreva um comentário.");
                return;
            }

            // Enviar o comentário para o backend
            fetch('/api/comentarios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    publicacaoId,
                    comentario,
                    usuario: amigoName // Incluindo o nome do amigo
                })
            })
            .then(response => response.json())
            .then(data => {
                console.log('Comentário adicionado:', data);
                // Adicionar o comentário à lista de comentários
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
                listaComentarios.style.display = 'block'; // Mostrar comentários
                comentarioInput.value = ''; // Limpar o campo de comentário
            })
            .catch(error => {
                console.error("Erro ao enviar comentário:", error);
            });
        }
    });
});

//tenta2
document.addEventListener('DOMContentLoaded', () => {
    // Carregar informações do amigo do localStorage
    const amigoId = localStorage.getItem('amigoId');
    const amigoName = localStorage.getItem('amigoName');
    const amigoEmail = localStorage.getItem('amigoEmail');

    // Exibir informações do amigo na página
    document.getElementById('userNameDisplayAMIGO').innerText = amigoName || "Nome do AMIGO não encontrado";
    document.getElementById('userEMAILamigo').innerText = amigoEmail || "Email do AMIGO não encontrado";

    // Adicionar o botão "Seguir" na seção de informações do amigo
    const seguirBtn = document.createElement('button');
    seguirBtn.id = 'seguirBtn';
    seguirBtn.innerText = 'Seguir';
    seguirBtn.style.marginTop = '10px'; // Adiciona um pouco de espaço acima do botão
    document.querySelector('.info-perfil').appendChild(seguirBtn); // Adiciona o botão à seção de informações do amigo

    // Adicionar evento de clique ao botão "Seguir"
    seguirBtn.addEventListener('click', () => {
        const userEmail = localStorage.getItem("userEmail");
        if (userEmail && amigoEmail) {
            relacionarAmigos(userEmail, amigoEmail);
        } else {
            alert("Erro ao seguir o amigo. Verifique se você está logado.");
        }
    });

    // Função para relacionar amigos
    function relacionarAmigos(userEmail, emailAMIGO) {
        // Buscar o usuário pelo userEmail
        fetch(`/api/users/email/${encodeURIComponent(userEmail)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Usuário não encontrado');
                }
                return response.json();
            })
            .then(user => {
                // Buscar o amigo pelo emailAMIGO
                return fetch(`/api/users/email/${encodeURIComponent(emailAMIGO)}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Amigo não encontrado');
                        }
                        return response.json();
                    })
                    .then(amigo => {
                        // Criar a relação de amizade
                        return fetch('/api/amigos', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                usuarioId: user.id,
                                amigoId: amigo.id
                            })
                        });
                    });
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao criar relação de amizade');
                }
                return response.json();
            })
            .then(data => {
                console.log('Relação de amizade criada com sucesso:', data);
                alert("Você agora está seguindo " + amigoName);
            })
            .catch(error => {
                console.error('Erro:', error);
                alert("Erro ao seguir o amigo: " + error.message);
            });
    }

    
});

//Variaveis estatisticas amigo.
document.addEventListener('DOMContentLoaded', () => {
    // Carregar informações do usuário
    const userName = localStorage.getItem("userName") || "Nome do Usuário";
    const userEmail = localStorage.getItem("userEmail") || "usuario@email.com";
    
    // Carregar informações do amigo
    const amigoName = localStorage.getItem('amigoName');
    const amigoEmail = localStorage.getItem('amigoEmail');

    // Função para obter o ID do usuário pelo email
    async function obterUsuarioIdPorEmail(email) {
        const response = await fetch(`/api/users/email/${encodeURIComponent(email)}`);
        if (!response.ok) {
            throw new Error('Usuário não encontrado');
        }
        const user = await response.json();
        return user.id; // Retorna o ID do usuário
    }

    // Função para obter o ID do usuário pelo nome
    async function obterUsuarioIdPorNome(name) {
        const response = await fetch(`/api/users/name/${encodeURIComponent(name)}`);
        if (!response.ok) {
            throw new Error('Usuário não encontrado');
        }
        const users = await response.json();
        return users[0].id; // Retorna o ID do primeiro usuário encontrado
    }

    // Função para obter a quantidade de seguidores e seguindo
    async function carregarEstatisticas(usuarioId, isAmigo = false) {
        try {
            // Obter quantidade de seguidores
            const seguidoresResponse = await fetch(`/api/users/${usuarioId}/seguidores`);
            const seguidoresData = await seguidoresResponse.json();
            
            // Atualizar o elemento correto com base no parâmetro isAmigo
            if (isAmigo) {
                document.getElementById('followerCountAMIGO').innerText = seguidoresData.quantidadeSeguidores;
            } else {
                document.getElementById('followerCount').innerText = seguidoresData.quantidadeSeguidores;
            }

            // Obter quantidade de seguindo
            const seguindoResponse = await fetch(`/api/users/${usuarioId}/seguindo`);
            const seguindoData = await seguindoResponse.json();
            
            // Atualizar o elemento correto com base no parâmetro isAmigo
            if (isAmigo) {
                document.getElementById('followingCountAMIGO').innerText = seguindoData.quantidadeSeguindo;
            } else {
                document.getElementById('followingCount').innerText = seguindoData.quantidadeSeguindo;
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }

    // Chamar as funções para obter os IDs e carregar as estatísticas
    async function carregarDados() {
        try {
            // Obter ID do usuário atual
            const userId = await obterUsuarioIdPorEmail(userEmail);
            // Obter ID do amigo
            const amigoId = await obterUsuarioIdPorEmail(amigoEmail);

            // Carregar estatísticas para o amigo
            carregarEstatisticas(amigoId, true);
            // Carregar estatísticas para o usuário atual
            carregarEstatisticas(userId, false);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        }
    }



    // Chamar a função para carregar os dados
    carregarDados();
});

//botao ocultar feed
document.addEventListener('DOMContentLoaded', () => {
    // Seleciona o botão e a seção de publicações
    const btnOcultar1 = document.getElementById('btnOcultar1');
    const publications = document.getElementById('publications');

    // Adiciona um evento de clique ao botão
    btnOcultar1.addEventListener('click', () => {
        // Verifica se a seção de publicações está oculta
        if (publications.classList.contains('hidden')) {
            // Mostra a seção de publicações
            publications.classList.remove('hidden');
            btnOcultar1.textContent = 'Ocultar Feed'; // Atualiza o texto do botão
        } else {
            // Oculta a seção de publicações
            publications.classList.add('hidden');
            btnOcultar1.textContent = 'Mostrar Feed'; // Atualiza o texto do botão
        }
    });
});

//LOGOUT
document.addEventListener("DOMContentLoaded", function () {
    const logoutButton = document.getElementById("logoutButton");

    // Função de logout
    function logout() {
        // Limpa o token do armazenamento local
        localStorage.removeItem("userToken");

        // Redireciona para a página de login
        window.location.href = "../login/login.html";
    }

    // Adiciona o evento de clique ao botão "Sair"
    logoutButton.addEventListener("click", function (event) {
        event.preventDefault(); // Impede o comportamento padrão de navegação
        logout();
    });
});

//RECUPERA TOKEN USUARIO
const token = localStorage.getItem("userToken");

if (!token) {
    // Redireciona para a página de login se o token não estiver presente
    window.location.href = "../login/login.html";
} else {
    // Validar o token com o backend se necessário
    fetch('/api/validate-token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("Token inválido ou expirado.");
        }
        return response.json();
    })
    .then(data => {
        console.log("Token válido:", data);
    })
    .catch(error => {
        console.error("Erro ao validar token:", error);
        alert("Sessão expirada. Faça login novamente.");
        localStorage.removeItem("userToken");
        window.location.href = "../login/login.html";
    });
}

// perfil.test.js
/*export {
  toggleComentarios,
  updatePublicationsUserName,
  curtirPublicacao,
  updateUser,
  relacionarAmigos,
  carregarEstatisticas,
};*/