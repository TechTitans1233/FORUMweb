// Funções para buscar e exibir dados de usuários e publicações
function fetchUsers() {
    fetch('/api/users')
        .then(response => response.json())
        .then(data => {
            const usersTable = document.getElementById('users-table').getElementsByTagName('tbody')[0];
            usersTable.innerHTML = ''; // Limpa a tabela

            data.forEach(user => {
                const row = usersTable.insertRow();
                row.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                `;
            });
        })
        .catch(error => console.error('Erro ao buscar usuários:', error));
}

function fetchPosts() {
    fetch('/api/publicacoes')
        .then(response => response.json())
        .then(data => {
            const postsTable = document.getElementById('posts-table').getElementsByTagName('tbody')[0];
            postsTable.innerHTML = ''; // Limpa a tabela

            data.forEach(post => {
                const row = postsTable.insertRow();
                row.innerHTML = `
                    <td>${post.id}</td>
                    <td>${post.titulo}</td>
                    <td>${post.conteudo}</td>
                `;
            });
        })
        .catch(error => console.error('Erro ao buscar publicações:', error));
}

// Funções para excluir usuários e publicações
function deleteUser(userId) {
    if (confirm('Tem certeza de que deseja excluir este usuário?')) {
        fetch(`/api/users/${userId}`, { method: 'DELETE' })
            .then(() => fetchUsers()) // Recarrega a lista de usuários
            .catch(error => console.error('Erro ao excluir usuário:', error));
    }
}

function deletePost(postId) {
    if (confirm('Tem certeza de que deseja excluir esta publicação?')) {
        fetch(`/api/publicacoes/${postId}`, { method: 'DELETE' })
            .then(() => fetchPosts()) // Recarrega a lista de publicações
            .catch(error => console.error('Erro ao excluir publicação:', error));
    }
}

// Função para editar usuário
function editUser(userId) {
    fetch(`/api/users/${userId}`)
        .then(response => response.json())
        .then(user => {
            const name = prompt('Editar nome:', user.name);
            const email = prompt('Editar email:', user.email);

            if (name && email) {
                fetch(`/api/users/${userId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email })
                })
                    .then(() => fetchUsers()) // Recarrega a lista de usuários
                    .catch(error => console.error('Erro ao editar usuário:', error));
            }
        })
        .catch(error => console.error('Erro ao buscar dados do usuário:', error));
}

// Função para editar publicação
function editPost(postId) {
    fetch(`/api/publicacoes/${postId}`)
        .then(response => response.json())
        .then(post => {
            const titulo = prompt('Editar título:', post.titulo);
            const conteudo = prompt('Editar conteúdo:', post.conteudo);

            if (titulo && conteudo) {
                fetch(`/api/publicacoes/${postId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ titulo, conteudo })
                })
                    .then(() => fetchPosts()) // Recarrega a lista de publicações
                    .catch(error => console.error('Erro ao editar publicação:', error));
            }
        })
        .catch(error => console.error('Erro ao buscar dados da publicação:', error));
}

document.addEventListener("DOMContentLoaded", () => {
    fetchUsers();
    fetchPosts();
});

// Variável para armazenar a linha selecionada
let selectedRow = null;

// Função para selecionar uma linha ao clicar
document.querySelectorAll('table').forEach(table => {
    table.addEventListener('click', (event) => {
        const row = event.target.closest('tr'); // Seleciona a linha clicada
        if (!row) return; // Se não for uma linha, ignora

        // Remove a seleção de outras linhas
        document.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));

        // Marca a linha atual como selecionada
        row.classList.add('selected');
        selectedRow = row;
    });
});

// Função para editar a linha selecionada
function editSelected(tableId) {
    if (!selectedRow) {
        alert('Por favor, selecione uma linha para editar.');
        return;
    }

    const table = document.getElementById(tableId);
    if (!table.contains(selectedRow)) {
        alert('A linha selecionada não pertence a esta tabela.');
        return;
    }

    const id = selectedRow.querySelector('td').innerText;  // Obtém o ID da linha selecionada

    // Agora você pode verificar se é um usuário ou uma publicação e editar de acordo
    if (tableId === 'users-table') {
        editUser(id); // Chama a função de edição de usuário
    } else if (tableId === 'posts-table') {
        editPost(id); // Chama a função de edição de publicação
    }
}

// Função para excluir a linha selecionada
function deleteSelected(tableId) {
    if (!selectedRow) {
        alert('Por favor, selecione uma linha para excluir.');
        return;
    }

    const table = document.getElementById(tableId);
    if (!table.contains(selectedRow)) {
        alert('A linha selecionada não pertence a esta tabela.');
        return;
    }

    const id = selectedRow.querySelector('td').innerText;  // Obtém o ID da linha selecionada

    if (confirm(`Tem certeza de que deseja excluir o registro ID ${id}?`)) {
        if (tableId === 'users-table') {
            deleteUser(id); // Exclui o usuário
        } else if (tableId === 'posts-table') {
            deletePost(id); // Exclui a publicação
        }

        selectedRow.remove();  // Remove a linha da tabela
        selectedRow = null; // Reseta a linha selecionada
        alert(`Registro ID ${id} excluído com sucesso.`);
    }
}

// Funções de pesquisa
function searchUsers() {
    const searchValue = document.getElementById('search-users').value.toLowerCase();
    const rows = document.querySelectorAll('#users-table tbody tr');

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(searchValue) ? '' : 'none';
    });
}

function searchPosts() {
    const searchValue = document.getElementById('search-posts').value.toLowerCase();
    const rows = document.querySelectorAll('#posts-table tbody tr');

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(searchValue) ? '' : 'none';
    });
}
