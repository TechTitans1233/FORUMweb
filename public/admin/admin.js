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

// Função de pesquisa para usuários
function searchUsers() {
    const searchValue = document.getElementById('search-users').value.toLowerCase();
    const rows = document.querySelectorAll('#users-table tbody tr');

    rows.forEach(row => {
        const id = row.cells[0].innerText.toLowerCase();
        const name = row.cells[1].innerText.toLowerCase();
        const email = row.cells[2].innerText.toLowerCase();

        // Verifica se o valor pesquisado está em ID, nome ou email
        const isMatch = id.includes(searchValue) || name.includes(searchValue) || email.includes(searchValue);

        row.style.display = isMatch ? '' : 'none';
    });
}

// Função de pesquisa para publicações
function searchPosts() {
    const searchValue = document.getElementById('search-posts').value.toLowerCase();
    const rows = document.querySelectorAll('#posts-table tbody tr');

    rows.forEach(row => {
        const id = row.cells[0].innerText.toLowerCase();
        const title = row.cells[1].innerText.toLowerCase();
        const content = row.cells[2].innerText.toLowerCase();

        // Verifica se o valor pesquisado está em ID, título ou conteúdo
        const isMatch = id.includes(searchValue) || title.includes(searchValue) || content.includes(searchValue);

        row.style.display = isMatch ? '' : 'none';
    });
}

//funcoes para editar
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

    // Para editar o usuário
    if (tableId === 'users-table') {
        const name = selectedRow.cells[1].innerText;
        const email = selectedRow.cells[2].innerText;

        const newName = prompt('Digite o novo nome:', name);
        const newEmail = prompt('Digite o novo email:', email);
        

        if (newName && newEmail ) {
            editUser(id, name, email, newName, newEmail);
        }
    } 
    // Para editar a publicação
    else if (tableId === 'posts-table') {
        const title = selectedRow.cells[1].innerText;
        const content = selectedRow.cells[2].innerText;

        const newTitle = prompt('Digite o novo título:', title);
        const newContent = prompt('Digite o novo conteúdo:', content);
       

        if (newTitle && newContent ) {
            editPost(id, newTitle, newContent );
        }
    }
}


// Função para editar usuário
function editUser(userId, oldName, oldEmail, newName, newEmail, newPassword) {
    const data = { oldName, oldEmail, newName, newEmail, newPassword };
    fetch(`/admin/usuarios/${userId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => response.json())
    .then(data => {
        alert('Usuário atualizado com sucesso!');
        fetchUsers(); // Recarrega a lista de usuários
    })
    .catch(error => console.error('Erro ao editar usuário:', error));
}

// Função para editar publicação
function editPost(postId, endereco, titulo, conteudo, marcacao, lat, lon) {
    const data = { endereco, titulo, conteudo, marcacao, lat, lon };
    fetch(`/api/publicacoes/${postId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => response.json())
    .then(data => {
        alert('Publicação atualizada com sucesso!');
        fetchPosts(); // Recarrega a lista de publicações
    })
    .catch(error => console.error('Erro ao editar publicação:', error));
}


document.addEventListener("DOMContentLoaded", () => {
    fetchUsers();
    fetchPosts();
});
