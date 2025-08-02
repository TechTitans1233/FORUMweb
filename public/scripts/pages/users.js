const searchInput = document.getElementById('searchInput');
const usuariosEncontradosContainer = document.getElementById('usuariosEncontrados');
const usuariosOcultosContainer = document.getElementById('usuariosOcultos');

let allUsers = [];

async function carregarTodosUsuarios() {
    try {
        const response = await fetch('/api/users');
        if (!response.ok) {
            throw new Error('Erro ao buscar usuários');
        }
        allUsers = await response.json();
        exibirUsuarios(allUsers, usuariosOcultosContainer);
    } catch (error) {
        console.error('Erro ao carregar todos os usuários:', error);
    }
}

function exibirUsuarios(users, container) {
    if (!container) {
        console.error('Contêiner de usuários não encontrado.');
        return;
    }
    container.innerHTML = '';
    users.forEach(user => {
        const userBlock = document.createElement('div');
        userBlock.className = 'perfil';
        userBlock.innerHTML = `
            <img src="https://www.gravatar.com/avatar/?d=mp&s=128" alt="Usuário Desconhecido" class="foto-perfil">
            <!--<img src="foto-usuario.jpg" alt="Foto de ${user.name}" class="foto-perfil">-->
            <div class="info-perfil">
                <a href="#" class="ver-perfil" data-id="${user.id}" data-name="${user.name}" data-email="${user.email}">
                    <h1 class="nome">${user.name}</h1>
                </a>
            </div>
        `;
        container.appendChild(userBlock);
    });

    const verPerfilLinks = container.querySelectorAll('.ver-perfil');
    verPerfilLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const userId = link.getAttribute('data-id');
            const userName = link.getAttribute('data-name');
            const userEmail = link.getAttribute('data-email');

            localStorage.setItem('amigoId', userId);
            localStorage.setItem('amigoName', userName);
            localStorage.setItem('amigoEmail', userEmail);

            //window.location.href = '../perfil/perfilAMIGO.html';
            window.location.href = `../perfil/${userId}`;
        });
    });
}

if (searchInput) {
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();
        if (query.length > 0) {
            const filteredUsers = allUsers.filter(user => user.name.toLowerCase().includes(query));
            if (usuariosOcultosContainer) usuariosOcultosContainer.style.display = 'none';
            exibirUsuarios(filteredUsers, usuariosEncontradosContainer);
            if (usuariosEncontradosContainer) {
                usuariosEncontradosContainer.style.display = 'block';
            }
        } else {
            if (usuariosEncontradosContainer) usuariosEncontradosContainer.innerHTML = '';
            if (usuariosOcultosContainer) usuariosOcultosContainer.style.display = 'none';
        }
    });
    carregarTodosUsuarios();
} else {
    console.warn('Elemento #searchInput não encontrado. Funcionalidade de pesquisa desabilitada.');
}