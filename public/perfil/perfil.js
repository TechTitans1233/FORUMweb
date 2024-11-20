document.addEventListener("DOMContentLoaded", () => {
    const editarPerfilBtn = document.getElementById("editarPerfilBtn");
    const mainContent = document.getElementById("main-content");

    const createProfileBlock = (nome, email) => {
        const profileContainer = document.createElement("div");
        profileContainer.className = "profile-container";
        profileContainer.innerHTML = `
            <h2>Editar Perfil</h2>
            
            <!-- Bloco com imagem do usuário, nome e botão -->
            <section class="user-header">
                <div class="user-photo-container">
                    <div class="user-photo">
                        <img src="profile-picture.jpg" alt="Foto do Usuário">
                    </div>
                    <div class="user-name">
                        <p>${nome}</p>
                    </div>
                    <button id="substituirFotoBtn">Substituir Imagem</button>
                </div>
            </section>

            <!-- Formulário de edição -->
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
                        <input type="password" id="senha" placeholder="Nova Senha" required>
                    </div>

                    <div class="form-group">
                        <label for="confirmarSenha">Confirmar Senha:</label>
                        <input type="password" id="confirmarSenha" placeholder="Confirmar Senha" required>
                    </div>

                    <button type="submit" class="save-btn">Salvar Alterações</button>
                </form>
            </section>
        `;
        return profileContainer;
    };

    const validatePassword = () => {
        const senha = document.getElementById("senha").value;
        const confirmarSenha = document.getElementById("confirmarSenha").value;
        
        if (senha !== confirmarSenha) {
            alert("As senhas não coincidem!");
            return false;
        }
        return true;
    };

    editarPerfilBtn.addEventListener("click", (event) => {
        event.preventDefault();

        // Limpar conteúdo atual
        mainContent.innerHTML = "";

        // Adicionar bloco de perfil
        mainContent.appendChild(createProfileBlock("João da Silva", "joao.silva@example.com"));

        // Exibir formulário de edição de perfil e validar antes de salvar
        const profileForm = document.getElementById("profile-form");
        profileForm.addEventListener("submit", (formEvent) => {
            formEvent.preventDefault();

            // Validar senhas
            if (!validatePassword()) {
                return;
            }

            // Caso as senhas coincidam, salvar alterações
            alert("Alterações salvas com sucesso!");
        });

        // Mostrar seção de amigos, se existir
        const communitySection = document.getElementById("community");
        if (communitySection) {
            communitySection.style.display = "block";
        }
    });
});

// Lista de amigos com foto e nome
const friends = [
    {
        name: "Amigo 1",
        photo: "friend1.jpg",
        alt: "Amigo 1"
    },
    {
        name: "Amigo 2",
        photo: "friend2.jpg",
        alt: "Amigo 2"
    },
    // Adicione mais amigos conforme necessário
];

// Função para preencher a lista de amigos dinamicamente
function populateFriendsList() {
    const userList = document.getElementById('user-list');
    userList.innerHTML = ''; // Limpa a lista antes de adicionar novos itens

    friends.forEach(friend => {
        const listItem = document.createElement('li');
        listItem.classList.add('user-item');

        // Cria a foto do amigo
        const userPhoto = document.createElement('div');
        userPhoto.classList.add('user-photo');
        const img = document.createElement('img');
        img.src = friend.photo;
        img.alt = friend.alt;
        userPhoto.appendChild(img);

        // Cria o nome do amigo
        const userName = document.createElement('div');
        userName.classList.add('user-name');
        const name = document.createElement('p');
        name.textContent = friend.name;
        userName.appendChild(name);

        // Adiciona o item à lista
        listItem.appendChild(userPhoto);
        listItem.appendChild(userName);
        userList.appendChild(listItem);
    });
}

// exemplo----------------------------
// Simulação de dados do usuário
const userData = {
    name: "João Silva",
    email: "joao.silva@example.com",
    photo: "user-photo.jpg",
    activities: {
        lastPost: { title: "Meu novo post", date: "17/11/2024" },
        lastComment: { text: "Comentário importante", date: "16/11/2024" },
        lastShare: { text: "Compartilhou um artigo", date: "15/11/2024" }
    },
    posts: [
        { title: "Primeiro Post", summary: "Resumo do primeiro post" },
        { title: "Segundo Post", summary: "Resumo do segundo post" }
    ],
    stats: { posts: 10, followers: 250, following: 180 },
    friends: ["Maria", "Carlos", "Ana"]
};

// Função para preencher dados dinâmicos
function populateUserProfile(data) {
    document.getElementById("user-photo").src = data.photo;
    document.getElementById("user-name").textContent = data.name;
    document.getElementById("display-name").textContent = data.name;
    document.getElementById("display-email").textContent = data.email;

    document.getElementById("last-post").textContent = data.activities.lastPost.title;
    document.getElementById("last-post-date").textContent = data.activities.lastPost.date;

    document.getElementById("last-comment").textContent = data.activities.lastComment.text;
    document.getElementById("last-comment-date").textContent = data.activities.lastComment.date;

    document.getElementById("last-share").textContent = data.activities.lastShare.text;
    document.getElementById("last-share-date").textContent = data.activities.lastShare.date;

    document.getElementById("post-title-1").textContent = data.posts[0].title;
    document.getElementById("post-summary-1").textContent = data.posts[0].summary;

    document.getElementById("post-title-2").textContent = data.posts[1].title;
    document.getElementById("post-summary-2").textContent = data.posts[1].summary;

    document.getElementById("posts-count").textContent = data.stats.posts;
    document.getElementById("followers-count").textContent = data.stats.followers;
    document.getElementById("following-count").textContent = data.stats.following;

    const userList = document.getElementById("user-list");
    userList.innerHTML = ""; // Limpa a lista existente
    data.friends.forEach(friend => {
        const li = document.createElement("li");
        li.textContent = friend;
        userList.appendChild(li);
    });
}

// Chama a função ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
    populateUserProfile(userData);
});

// Chama a função para preencher a lista
populateFriendsList();
