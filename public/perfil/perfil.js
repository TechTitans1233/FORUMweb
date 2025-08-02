const userName = document.getElementById("userNameDisplay");
const userEmail = document.getElementById("userEMAIL");
const postCount = document.getElementById("postCount");
const followerCount = document.getElementById("followerCount");
const followingCount = document.getElementById("followingCount");
const imageElement = document.getElementById("foto-perfil");
const fileInput = document.getElementById("upload-foto");

// Quando clicar na imagem, abre o seletor de arquivos
imageElement.addEventListener("click", () => {
  fileInput.click();
});

// Quando escolher um arquivo, atualiza a imagem
fileInput.addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) return;

  // Atualiza visual da imagem localmente
  const reader = new FileReader();
  reader.onload = function (e) {
    imageElement.src = e.target.result;
  };
  reader.readAsDataURL(file);

  // Envia para o backend
  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await fetch("/api/images/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Erro no upload:", result);
      return;
    }

    const firebaseImageUrl = await fetch('/api/users/img', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(
        { imageUrl: result.signedUrl }
    )});
    if (!firebaseImageUrl.ok) {
      const errorData = await firebaseImageUrl.json();
      console.error("Erro ao atualizar imagem no Firebase:", errorData);
      return;
    }
  } catch (err) {
    console.error("Erro ao enviar imagem:", err);
  }
});


async function loadCurrentUserData() {
    try {
        const response = await fetch('/api/users/me', {
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error('Erro ao carregar dados do usuário atual');
        }
        const userData = await response.json();
        const cUserName = userData.name || "Usuário Desconhecido";
        const cUserEmail = userData.email || "Email Desconhecido";
        const cUserId = userData.uid || "ID Desconhecido";

        const getImageUrl = await fetch(`/api/users/img/${cUserId}`);
        if (!getImageUrl.ok) {
            throw new Error('Erro ao carregar imagem do usuário atual');
        }
        const imageData = await getImageUrl.json();

        const cUserImage = imageData.imageUrl || "https://www.gravatar.com/avatar/?d=mp&s=128"; // URL padrão se não houver imagem

        return {
            cUserName,
            cUserEmail,
            cUserId,
            cUserImage
        };
    } catch (error) {
        console.error('Erro ao carregar dados do usuário atual:', error);
        alert('Erro ao carregar dados do usuário atual. Por favor, tente novamente mais tarde.');
    }
}

async function loadUserData(id) {
    try {
        const response = await fetch(`/api/users/${id}`);
        if (!response.ok) {
            throw new Error('Erro ao carregar dados do usuário');
        }
        const cUserData = await response.json();
        const aUserName = cUserData.name || "Usuário Desconhecido";
        const aUserEmail = cUserData.email || "Email Desconhecido";
        const aUserId = cUserData.id || "ID Desconhecido";

        const getImageUrl = await fetch(`/api/users/img/${aUserId}`);
        if (!getImageUrl.ok) {
            throw new Error('Erro ao carregar imagem do usuário atual');
        }
        const imageData = await getImageUrl.json();

        const aUserImage = imageData.imageUrl || "https://www.gravatar.com/avatar/?d=mp&s=128"; // URL padrão se não houver imagem

        return {
            aUserName,
            aUserEmail,
            aUserId,
            aUserImage
        };
    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        alert('Erro ao carregar dados do usuário. Por favor, tente novamente mais tarde.');
    }
}

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

        return ({
            followers: followersData.quantidadeSeguidores,
            following: followingData.quantidadeSeguindo
        });
    } catch (error) {
        console.error('Erro ao carregar contagens de seguidores/seguindo:', error);
        document.getElementById("followerCount").innerText = 'Erro';
        document.getElementById("followingCount").innerText = 'Erro';
    }
}

 async function curtirPublicacao(postId, button) {
    const { userId } = loadCurrentUserData();
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
        curtidasCountSpan.innerText = parseInt(curtidasCountSpan.innerText) + 1;
        button.disabled = true;
        button.innerHTML = `Você curtiu (${curtidasCountSpan.innerText})`;
    } catch (error) {
        console.error(error.message);
        alert(error.message);
    }
}

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
                    <img src="https://www.gravatar.com/avatar/?d=mp&s=128" alt="Usuário Desconhecido" class="foto-usuario">
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

async function loadUserPublications(userId) {
    try {
        const response = await fetch(`/api/users/${userId}/publications`);
        if (!response.ok) {
            throw new Error('Erro ao carregar publicações do usuário.');
        }
        const data = await response.json();
        const publicacoes = data.publications;
        const publicationsContainer = document.getElementById('publications');
        publicationsContainer.innerHTML = ''; // Limpa o conteúdo anterior
        postCount.innerText = publicacoes.length;

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
                    <img src="https://www.gravatar.com/avatar/?d=mp&s=128" alt="Usuário Desconhecido" class="foto-usuario">
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
                <div class="toggle-comentarios-btn" onclick="toggleComentarios(this)">Mostrar Comentários</div>
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
            curtirButton.addEventListener('click', async () => {
                await curtirPublicacao(post.id, curtirButton);
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

async function checkIfFollowingAndSetButton(amigoId, button) {
    try {
        const response = await fetch(`/api/amigos/check/${amigoId}`, {
            method: 'GET',
            credentials: 'include'
        });

        const result = await response.json();

        if (response.ok) {
            button.classList.add('btn-follow');
            if (result.existe) {
                button.innerText = 'Deixar de Seguir';
                button.dataset.status = 'seguindo';
                button.classList.add('active'); // Estilo para quem já está seguindo
                button.classList.remove('inactive');
            } else {
                button.innerText = 'Seguir';
                button.dataset.status = 'naoSeguindo';
                button.classList.remove('active');
                button.classList.add('inactive'); 
            }
            button.disabled = false;
        } else {
            button.innerText = 'Erro';
            button.disabled = true;
            console.warn('Erro ao verificar status de amizade:', result.message);
        }
    } catch (error) {
        console.error('Erro ao verificar amizade:', error);
        button.innerText = 'Erro';
        button.disabled = true;
    }
}

function createEditProfileModal(userData) {
    // Remove modal anterior, se existir
    const existingModal = document.querySelector('.edit-profile-form');
    if (existingModal) existingModal.remove();

    // Cria o fundo escurecido
    const overlay = document.createElement('div');
    overlay.classList.add('modal-overlay');

    // Cria o modal
    const modal = document.createElement('div');
    modal.classList.add('edit-profile-form'); // Usa sua classe CSS

    // Título
    const title = document.createElement('h2');
    title.innerText = 'Editar Perfil';

    // Botão de fechar
    const closeBtn = document.createElement('span');
    closeBtn.innerText = '×';
    closeBtn.classList.add('close-btn');
    closeBtn.onclick = () => overlay.remove();

    // Formulário
    const form = document.createElement('form');

    // Nome
    const nameLabel = document.createElement('label');
    nameLabel.innerText = 'Nome:';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.name = 'newName';
    nameInput.required = true;
    nameInput.value = userData.name || '';

    // Email
    const emailLabel = document.createElement('label');
    emailLabel.innerText = 'Email:';
    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.name = 'newEmail';
    emailInput.required = true;
    emailInput.value = userData.email || '';

    // Senha
    const passwordLabel = document.createElement('label');
    passwordLabel.innerText = 'Senha atual:';
    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.name = 'password';
    passwordInput.required = true;

    // Botão de envio
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.innerText = 'Salvar';

    // Evento de envio
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newName = nameInput.value;
        const newEmail = emailInput.value;
        const password = passwordInput.value;

        try {
            const response = await fetch('/api/users/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ newName, newEmail, password })
            });

            const result = await response.json();

            if (response.ok) {
                alert('Perfil atualizado com sucesso!');
                overlay.remove();
                window.location.reload();
            } else {
                alert(`Erro: ${result.message}`);
            }
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            alert('Erro inesperado. Tente novamente.');
        }
    });

    // Monta o formulário
    form.appendChild(nameLabel);
    form.appendChild(nameInput);
    form.appendChild(emailLabel);
    form.appendChild(emailInput);
    form.appendChild(passwordLabel);
    form.appendChild(passwordInput);
    form.appendChild(submitBtn);

    // Monta o modal
    modal.appendChild(closeBtn);
    modal.appendChild(title);
    modal.appendChild(form);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

async function openEditProfileModal() {
    try {
        const response = await fetch('/api/users/me', {
            method: 'GET',
            credentials: 'include'
        });

        const userData = await response.json();

        if (response.ok) {
            createEditProfileModal(userData);
        } else {
            alert('Erro ao carregar dados do perfil.');
        }
    } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        alert('Erro inesperado ao carregar perfil.');
    }
}

function createEditProfileButtons(container) {
    const editBtn = document.createElement('button');
    editBtn.innerText = 'Editar Perfil';
    editBtn.classList.add('btn-edit');
    editBtn.onclick = () => {
        openEditProfileModal();
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.innerText = 'Deletar Perfil';
    deleteBtn.classList.add('btn-delete');
    deleteBtn.onclick = async () => {
        const confirmacao = confirm('Tem certeza que deseja deletar seu perfil? Essa ação é irreversível.');
        if (!confirmacao) return;

        try {
            const response = await fetch('/api/users/me', {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                alert('Conta deletada com sucesso!');
                window.location.href = '/logout';
            } else {
                const errorData = await response.json();
                alert(`Erro ao deletar conta: ${errorData.message}`);
            }
        } catch (error) {
            console.error('Erro ao deletar conta:', error);
            alert('Erro inesperado ao deletar conta. Tente novamente mais tarde.');
        }
    };

    container.appendChild(editBtn);
    container.appendChild(deleteBtn);
}

function createFollowButton(container, amigoId) {
    const button = document.createElement('button');
    button.innerText = 'Carregando...';
    button.disabled = true;

    button.addEventListener('click', async () => {
        const status = button.dataset.status;

        const endpoint = status === 'seguindo' ? '/api/amigos/unfollow' : '/api/amigos';
        const method = status === 'seguindo' ? 'DELETE' : 'POST';

        try {
            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ amigoId })
            });

            const result = await response.json();

            if (response.ok) {
                // Atualiza o botão com base no novo estado
                await checkIfFollowingAndSetButton(amigoId, button);
            } else {
                alert(`Erro: ${result.message}`);
            }
        } catch (error) {
            console.error('Erro ao seguir/deixar de seguir:', error);
            alert('Erro inesperado. Tente novamente.');
        }
    });

    container.appendChild(button);
    return button;
}

document.addEventListener('DOMContentLoaded', async () => {

    const pathParts = window.location.pathname.split('perfil/');
    const amigoId = pathParts[pathParts.length - 1].trim();
    console.log("Amigo ID:", amigoId);

    const { cUserName, cUserEmail, cUserId, cUserImage } = await loadCurrentUserData();
    const { aUserName, aUserEmail, aUserId, aUserImage } = await loadUserData(amigoId);
    const actionContainer = document.getElementById('info-perfil');
    console.log("Current User ID:", cUserId);
    console.log("Amigo User ID:", aUserId);
    if (cUserId == aUserId) {
        userName.innerText = cUserName;
        userEmail.innerText = cUserEmail;
        imageElement.src = cUserImage; // Atualiza a imagem do perfil
        //imageElement.alt = cUserName || "Foto de Perfil";
        const { followers, following } = await loadFollowCounts(cUserId);
        postCount.innerText = '0';
        followerCount.innerText = followers || '0';
        followingCount.innerText = following || '0';
        await loadUserPublications(cUserId).then(() => {
            console.log("Publicações carregadas para o usuário atual.");
        }).catch(error => {
            console.error("Erro ao carregar publicações do usuário atual:", error);
        });
        createEditProfileButtons(actionContainer);
        return;
    } else {
        // Se não for o mesmo, exibe os dados do outro usuário
        userName.innerText = aUserName;
        userEmail.innerText = aUserEmail;
        imageElement.src = aUserImage; // Atualiza a imagem do perfil
        //imageElement.alt = aUserName || "Foto de Perfil";
        const { followers, following } = await loadFollowCounts(amigoId);
        postCount.innerText = '0';
        followerCount.innerText = followers || '0';
        followingCount.innerText = following || '0';
        await loadUserPublications(amigoId).then(() => {
            console.log("Publicações carregadas para o amigo.");
        }).catch(error => {
            console.error("Erro ao carregar publicações do amigo:", error);
        });
        const followButton = createFollowButton(actionContainer, amigoId);
        await checkIfFollowingAndSetButton(amigoId, followButton);
    }
});