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

// Array para armazenar as linhas selecionadas
let selectedRows = [];

// Função para selecionar ou desmarcar uma linha ao clicar
document.querySelectorAll('table').forEach(table => {
    table.addEventListener('click', (event) => {
        const row = event.target.closest('tr');
        if (!row) return; // Ignora cliques fora de uma linha
        // Garante que apenas linhas do corpo (tbody) sejam consideradas (evita cabeçalhos)
        if (row.parentNode.tagName !== 'TBODY') return;

        // Alterna a classe 'selected' na linha
        if (row.classList.contains('selected')) {
            row.classList.remove('selected');
            selectedRows = selectedRows.filter(r => r !== row);
        } else {
            row.classList.add('selected');
            selectedRows.push(row);
        }
    });
});

// Função para selecionar ou desmarcar todas as linhas de uma tabela específica
function selectAllRows(tableId) {
    const table = document.getElementById(tableId);
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const allSelected = rows.every(row => row.classList.contains('selected'));

    if (allSelected) {
        // Se todas já estiverem selecionadas, desmarca todas
        rows.forEach(row => {
            row.classList.remove('selected');
            selectedRows = selectedRows.filter(r => r !== row);
        });
    } else {
        // Caso contrário, marca todas as linhas não selecionadas
        rows.forEach(row => {
            if (!row.classList.contains('selected')) {
                row.classList.add('selected');
                selectedRows.push(row);
            }
        });
    }
}

// Função para excluir as linhas selecionadas de uma tabela específica
function deleteSelected(tableId) {
    const table = document.getElementById(tableId);
    // Seleciona apenas as linhas marcadas que pertencem à tabela
    const selectedRowsInTable = Array.from(table.querySelectorAll('tbody tr.selected'));

    if (selectedRowsInTable.length === 0) {
        alert('Por favor, selecione ao menos uma linha para excluir.');
        return;
    }

    selectedRowsInTable.forEach(row => {
        const id = row.querySelector('td').innerText;  // Obtém o ID da linha
        if (confirm(`Tem certeza de que deseja excluir o registro ID ${id}?`)) {
            if (tableId === 'users-table') {
                deleteUser(id); // Exclui o usuário
            } else if (tableId === 'posts-table') {
                deletePost(id); // Exclui a publicação
            }
            row.remove();  // Remove a linha da tabela
            selectedRows = selectedRows.filter(r => r !== row);
            alert(`Registro ID ${id} excluído com sucesso.`);
        }
    });
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

// Funções para editar
// Atualização na função que edita linhas selecionadas para a tabela de publicações
function editSelected(tableId) {
    const table = document.getElementById(tableId);
    const selectedRowsInTable = Array.from(table.querySelectorAll('tbody tr.selected'));

    if (selectedRowsInTable.length === 0) {
        alert('Por favor, selecione uma linha para editar.');
        return;
    }

    selectedRowsInTable.forEach(row => {
        const id = row.querySelector('td').innerText;

        if (tableId === 'users-table') {
            const name = row.cells[1].innerText;
            const email = row.cells[2].innerText;

            const newName = prompt('Digite o novo nome:', name);
            const newEmail = prompt('Digite o novo email:', email);

            if (newName && newEmail) {
                editUser(id, name, email, newName, newEmail);
            }
        } else if (tableId === 'posts-table') {
            // Para publicações, agora solicitamos: título e comentário
            const titulo = row.cells[1].innerText;
            const comentario = row.cells[2].innerText;

            const newTitulo = prompt('Digite o novo título:', titulo);
            const newComentario = prompt('Digite o novo comentário:', comentario);

            if (newTitulo && newComentario) {
                editPost(id, newTitulo, newComentario);
            }
        }
    });
}

// Função para enviar a atualização da publicação ao backend
function editPost(postId,newTitulo, newComentario) {
    const data = {  
        titulo: newTitulo, 
        comentario: newComentario 
    };

    fetch(`/api/publicacoes/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        alert('Publicação atualizada com sucesso!');
        fetchPosts(); // Atualiza a lista de publicações
    })
    .catch(error => console.error('Erro ao editar publicação:', error));
}

function editUser(userId, oldName, oldEmail, newName, newEmail, newPassword) {
    const data = { oldName, oldEmail, newName, newEmail, newPassword };
    fetch(`/admin/usuarios/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        alert('Usuário atualizado com sucesso!');
        fetchUsers(); // Recarrega a lista de usuários
    })
    .catch(error => console.error('Erro ao editar usuário:', error));
}


document.addEventListener("DOMContentLoaded", () => {
    fetchUsers();
    fetchPosts();
});

// TOKEN
// RECUPERA TOKEN E VALIDA
document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("adminToken");

    if (!token) {
        alert("Acesso não autorizado. Faça login como administrador.");
        window.location.href = "../login/login.html";
        return;
    }

    // Valida o token no backend
    fetch("/api/admin/validate-token", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
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
        localStorage.removeItem("adminToken");
        window.location.href = "../login/login.html";
    });
});