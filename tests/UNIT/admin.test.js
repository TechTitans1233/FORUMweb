/**
 * @jest-environment jsdom
 */

import * as adminModule from '../../public/admin/admin.js'; // Importa tudo para podermos espiar (spyOn) funções internas

describe('admin.js — testes unitários com Jest', () => {
  beforeEach(() => {
    // Limpa mocks entre cada teste
    jest.clearAllMocks();
    // Mock básico de localStorage
    const store = {};
    global.localStorage = {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => {
        store[key] = value;
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
    };
    // Mock de alert, confirm e prompt
    global.alert = jest.fn();
    global.confirm = jest.fn();
    global.prompt = jest.fn();
    // Mock de fetch
    global.fetch = jest.fn();
    // Limpa o document.body
    document.body.innerHTML = '';
  });

  //
  // Helper para “esperar” o then(...) em funções que NÃO retornam a promise diretamente
  //
  function flushPromises() {
    return new Promise((resolve) => setImmediate(resolve));
  }

  //
  // 1) fetchUsers()
  //
  describe('fetchUsers()', () => {
    test('deve preencher o tbody de #users-table com linhas vindas da API', async () => {
      // 1. Setup mínimo de DOM: cria uma tabela com id="users-table" e tbody vazio
      document.body.innerHTML = `
        <table id="users-table">
          <thead><tr><th>ID</th><th>Nome</th><th>Email</th></tr></thead>
          <tbody></tbody>
        </table>
      `;
      const fakeUsers = [
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { id: '2', name: 'Bob', email: 'bob@example.com' },
      ];
      // 2. Mock de fetch retornando fakeUsers
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(fakeUsers),
      });

      // 3. Chama a função
      adminModule.fetchUsers();

      // 4. Aguarda o then(...) interno ser concluído
      await flushPromises();

      // 5. Verifica quantas linhas foram adicionadas e seus conteúdos
      const tbody = document.querySelector('#users-table tbody');
      const linhas = Array.from(tbody.querySelectorAll('tr'));
      expect(linhas).toHaveLength(2);

      // Conteúdo da 1ª linha
      expect(linhas[0].cells[0].innerText).toBe('1');
      expect(linhas[0].cells[1].innerText).toBe('Alice');
      expect(linhas[0].cells[2].innerText).toBe('alice@example.com');

      // Conteúdo da 2ª linha
      expect(linhas[1].cells[0].innerText).toBe('2');
      expect(linhas[1].cells[1].innerText).toBe('Bob');
      expect(linhas[1].cells[2].innerText).toBe('bob@example.com');

      // 6. Verifica que a URL certa foi chamada
      expect(fetch).toHaveBeenCalledWith('/api/users');
    });

    test('se a chamada falhar, apenas loga o erro e não quebra', async () => {
      // Prepara DOM
      document.body.innerHTML = `
        <table id="users-table"><tbody></tbody></table>
      `;
      // Faz fetch rejeitar
      fetch.mockRejectedValueOnce(new Error('Erro de rede'));

      // Não deve lançar, mas sim capturar no console.error
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      adminModule.fetchUsers();
      await flushPromises();

      expect(spyError).toHaveBeenCalledWith(
        'Erro ao buscar usuários:',
        expect.any(Error)
      );
      spyError.mockRestore();
    });
  });

  //
  // 2) fetchPosts()
  //
  describe('fetchPosts()', () => {
    test('deve preencher o tbody de #posts-table com linhas vindas da API', async () => {
      document.body.innerHTML = `
        <table id="posts-table">
          <thead><tr><th>ID</th><th>Título</th><th>Conteúdo</th></tr></thead>
          <tbody></tbody>
        </table>
      `;
      const fakePosts = [
        { id: '10', titulo: 'Post X', conteudo: 'Conteúdo X' },
        { id: '20', titulo: 'Post Y', conteudo: 'Conteúdo Y' },
      ];
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(fakePosts),
      });

      adminModule.fetchPosts();
      await flushPromises();

      const tbody = document.querySelector('#posts-table tbody');
      const linhas = Array.from(tbody.querySelectorAll('tr'));
      expect(linhas).toHaveLength(2);

      expect(linhas[0].cells[0].innerText).toBe('10');
      expect(linhas[0].cells[1].innerText).toBe('Post X');
      expect(linhas[0].cells[2].innerText).toBe('Conteúdo X');

      expect(linhas[1].cells[0].innerText).toBe('20');
      expect(linhas[1].cells[1].innerText).toBe('Post Y');
      expect(linhas[1].cells[2].innerText).toBe('Conteúdo Y');

      expect(fetch).toHaveBeenCalledWith('/api/publicacoes');
    });

    test('se a chamada falhar, apenas loga o erro e não quebra', async () => {
      document.body.innerHTML = `<table id="posts-table"><tbody></tbody></table>`;
      fetch.mockRejectedValueOnce(new Error('Erro de rede'));
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      adminModule.fetchPosts();
      await flushPromises();

      expect(spyError).toHaveBeenCalledWith(
        'Erro ao buscar publicações:',
        expect.any(Error)
      );
      spyError.mockRestore();
    });
  });

  //
  // 3) deleteUser(userId)
  //
  describe('deleteUser(userId)', () => {
    beforeEach(() => {
      // Substitui fetchUsers por um spy, para não efetuar requisição real
      jest.spyOn(adminModule, 'fetchUsers').mockImplementation(() => {});
    });

    test('se confirm retornar false, não deve chamar fetch nem fetchUsers', () => {
      global.confirm.mockReturnValueOnce(false);

      adminModule.deleteUser('abc123');
      expect(global.confirm).toHaveBeenCalledWith(
        'Tem certeza de que deseja excluir este usuário?'
      );
      expect(fetch).not.toHaveBeenCalled();
      expect(adminModule.fetchUsers).not.toHaveBeenCalled();
    });

    test('se confirm retornar true, chama DELETE na URL correta e depois fetchUsers()', async () => {
      global.confirm.mockReturnValueOnce(true);
      fetch.mockResolvedValueOnce({ ok: true });

      // Como deleteUser() não devolve promise, aguardamos o flushPromises()
      adminModule.deleteUser('u-5');
      await flushPromises();

      expect(fetch).toHaveBeenCalledWith('/api/users/u-5', { method: 'DELETE' });
      expect(adminModule.fetchUsers).toHaveBeenCalled();
    });

    test('se o fetch falhar, apenas loga o erro', async () => {
      global.confirm.mockReturnValueOnce(true);
      fetch.mockRejectedValueOnce(new Error('Falha DELETE'));
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      adminModule.deleteUser('u-99');
      await flushPromises();

      expect(spyError).toHaveBeenCalledWith(
        'Erro ao excluir usuário:',
        expect.any(Error)
      );
      spyError.mockRestore();
    });
  });

  //
  // 4) deletePost(postId)
  //
  describe('deletePost(postId)', () => {
    beforeEach(() => {
      jest.spyOn(adminModule, 'fetchPosts').mockImplementation(() => {});
    });

    test('se confirm retornar false, não chama fetch nem fetchPosts()', () => {
      global.confirm.mockReturnValueOnce(false);

      adminModule.deletePost('p-10');
      expect(global.confirm).toHaveBeenCalledWith(
        'Tem certeza de que deseja excluir esta publicação?'
      );
      expect(fetch).not.toHaveBeenCalled();
      expect(adminModule.fetchPosts).not.toHaveBeenCalled();
    });

    test('se confirm retornar true, chama DELETE em /api/publicacoes/:id e depois fetchPosts()', async () => {
      global.confirm.mockReturnValueOnce(true);
      fetch.mockResolvedValueOnce({ ok: true });

      adminModule.deletePost('p-10');
      await flushPromises();

      expect(fetch).toHaveBeenCalledWith('/api/publicacoes/p-10', { method: 'DELETE' });
      expect(adminModule.fetchPosts).toHaveBeenCalled();
    });

    test('se o fetch falhar, apenas loga o erro', async () => {
      global.confirm.mockReturnValueOnce(true);
      fetch.mockRejectedValueOnce(new Error('Falha DELETE'));
      const spyError = jest.spyOn(console, 'error').mockImplementation(() => {});

      adminModule.deletePost('p-20');
      await flushPromises();

      expect(spyError).toHaveBeenCalledWith(
        'Erro ao excluir publicação:',
        expect.any(Error)
      );
      spyError.mockRestore();
    });
  });

  //
  // 5) selectAllRows(tableId)
  //
  describe('selectAllRows(tableId)', () => {
    beforeEach(() => {
      // Monta uma tabela genérica com 3 linhas em <tbody>
      document.body.innerHTML = `
        <table id="minha-tabela">
          <thead><tr><th>ID</th><th>Algo</th></tr></thead>
          <tbody>
            <tr><td>1</td><td>A</td></tr>
            <tr><td>2</td><td>B</td></tr>
            <tr><td>3</td><td>C</td></tr>
          </tbody>
        </table>
      `;
      // Zera selectedRows antes de cada teste
      adminModule.selectedRows = [];
    });

    test('se nenhuma linha estiver selecionada, marca todas e popula selectedRows', () => {
      // Inicialmente, nenhuma classe “selected” existe
      adminModule.selectAllRows('minha-tabela');

      const linhas = Array.from(
        document.querySelectorAll('#minha-tabela tbody tr')
      );
      // Todas devem conter “selected”
      expect(linhas.every((tr) => tr.classList.contains('selected'))).toBe(true);
      // selectedRows deve ter 3 elementos e cada um é o <tr> correto
      expect(adminModule.selectedRows).toHaveLength(3);
      expect(adminModule.selectedRows).toEqual(expect.arrayContaining(linhas));
    });

    test('se todas as linhas já estiverem selecionadas, desmarca todas', () => {
      // Primeiro, marca todas manualmente
      const linhas = Array.from(
        document.querySelectorAll('#minha-tabela tbody tr')
      );
      linhas.forEach((tr) => tr.classList.add('selected'));
      adminModule.selectedRows = [...linhas];

      // Agora chama selectAllRows de novo
      adminModule.selectAllRows('minha-tabela');

      linhas.forEach((tr) => {
        expect(tr.classList.contains('selected')).toBe(false);
      });
      expect(adminModule.selectedRows).toHaveLength(0);
    });
  });

  //
  // 6) deleteSelected(tableId)
  //
  describe('deleteSelected(tableId)', () => {
    beforeEach(() => {
      // Prepara duas tabelas ID diferentes ― users e posts
      document.body.innerHTML = `
        <table id="users-table">
          <tbody>
            <tr class="selected"><td>u1</td><td>Nome1</td><td>email1</td></tr>
            <tr><td>u2</td><td>Nome2</td><td>email2</td></tr>
          </tbody>
        </table>
        <table id="posts-table">
          <tbody>
            <tr class="selected"><td>p1</td><td>Titulo1</td><td>Conteudo1</td></tr>
            <tr class="selected"><td>p2</td><td>Titulo2</td><td>Conteudo2</td></tr>
          </tbody>
        </table>
      `;
      // Zera selectedRows
      adminModule.selectedRows = [];
      // Faz com que selectedRows contenha as linhas selecionadas do DOM
      const selUsers = Array.from(
        document.querySelectorAll('#users-table tbody tr.selected')
      );
      const selPosts = Array.from(
        document.querySelectorAll('#posts-table tbody tr.selected')
      );
      adminModule.selectedRows.push(...selUsers, ...selPosts);

      // Substitui deleteUser e deletePost por spies para não chamar fetch real
      jest.spyOn(adminModule, 'deleteUser').mockImplementation(() => {});
      jest.spyOn(adminModule, 'deletePost').mockImplementation(() => {});
    });

    test('se não houver linhas com classe "selected", chama alert e retorna sem deletar', () => {
      // Prepara situação sem nenhuma linha “selected”
      document.querySelectorAll('tr.selected').forEach((tr) => {
        tr.classList.remove('selected');
      });
      adminModule.selectedRows = [];

      adminModule.deleteSelected('users-table');
      expect(global.alert).toHaveBeenCalledWith(
        'Por favor, selecione ao menos uma linha para excluir.'
      );
      // Não deve chamar deleteUser nem deletePost
      expect(adminModule.deleteUser).not.toHaveBeenCalled();
      expect(adminModule.deletePost).not.toHaveBeenCalled();
    });

    test('se houver linhas selecionadas em users-table, chama deleteUser, remove e alerta', () => {
      // Faz com que confirm retorne true em cada linha selecionada
      global.confirm.mockReturnValue(true);

      adminModule.deleteSelected('users-table');

      // Temos apenas 1 linha selecionada em users-table: ID = 'u1'
      expect(adminModule.deleteUser).toHaveBeenCalledWith('u1');
      // A linha deve ter sido removida do DOM
      expect(
        document.querySelector('#users-table tbody tr[data-removed-dummy]') === null
      ).toBe(true); // verificamos de outro modo logo abaixo

      // Como no código original ele faz row.remove(), basta checar que não existe mais tr com innerText 'u1':
      expect(
        Array.from(
          document.querySelectorAll('#users-table tbody tr')
        ).map((tr) => tr.cells[0].innerText)
      ).not.toContain('u1');

      expect(global.alert).toHaveBeenCalledWith('Registro ID u1 excluído com sucesso.');
    });

    test('se houver linhas selecionadas em posts-table, chama deletePost, remove e alerta para cada linha', () => {
      // confirm() true para cada linha
      global.confirm.mockReturnValue(true);

      adminModule.deleteSelected('posts-table');

      // Chamou deletePost para 'p1' e 'p2'
      expect(adminModule.deletePost).toHaveBeenCalledWith('p1');
      expect(adminModule.deletePost).toHaveBeenCalledWith('p2');

      // As duas linhas devem ter sido removidas:
      const restos = Array.from(
        document.querySelectorAll('#posts-table tbody tr')
      );
      expect(restos).toHaveLength(0);

      expect(global.alert).toHaveBeenCalledWith('Registro ID p1 excluído com sucesso.');
      expect(global.alert).toHaveBeenCalledWith('Registro ID p2 excluído com sucesso.');
    });
  });

  //
  // 7) searchUsers()
  //
  describe('searchUsers()', () => {
    beforeEach(() => {
      // Prepara DOM com 3 linhas em #users-table e um input com id="search-users"
      document.body.innerHTML = `
        <input type="text" id="search-users" />
        <table id="users-table">
          <thead><tr><th>ID</th><th>Nome</th><th>Email</th></tr></thead>
          <tbody>
            <tr><td>1</td><td>Alice</td><td>alice@ex.com</td></tr>
            <tr><td>2</td><td>Bob</td><td>bob@ex.com</td></tr>
            <tr><td>3</td><td>Carol</td><td>carol@ex.com</td></tr>
          </tbody>
        </table>
      `;
    });

    test('ao digitar “bo” no input, exibe apenas a linha de Bob', () => {
      const input = document.getElementById('search-users');
      input.value = 'bo';

      adminModule.searchUsers();

      const linhas = Array.from(
        document.querySelectorAll('#users-table tbody tr')
      );
      // Alice → não casa → display = 'none'
      expect(linhas[0].style.display).toBe('none');
      // Bob → casa → display = ''
      expect(linhas[1].style.display).toBe('');
      // Carol → não casa → display = 'none'
      expect(linhas[2].style.display).toBe('none');
    });

    test('ao deixar campo vazio, exibe todas as linhas', () => {
      const input = document.getElementById('search-users');
      input.value = '';

      adminModule.searchUsers();

      const linhas = Array.from(
        document.querySelectorAll('#users-table tbody tr')
      );
      expect(linhas.every((tr) => tr.style.display === '')).toBe(true);
    });
  });

  //
  // 8) searchPosts()
  //
  describe('searchPosts()', () => {
    beforeEach(() => {
      // Prepara DOM com 3 linhas em #posts-table e um input com id="search-posts"
      document.body.innerHTML = `
        <input type="text" id="search-posts" />
        <table id="posts-table">
          <thead><tr><th>ID</th><th>Título</th><th>Conteúdo</th></tr></thead>
          <tbody>
            <tr><td>10</td><td>Olá Mundo</td><td>Conteúdo A</td></tr>
            <tr><td>20</td><td>Teste XYZ</td><td>Conteúdo B</td></tr>
            <tr><td>30</td><td>Outro Post</td><td>Conteúdo C</td></tr>
          </tbody>
        </table>
      `;
    });

    test('ao digitar “xyz” no input, exibe apenas a linha com “Teste XYZ”', () => {
      const input = document.getElementById('search-posts');
      input.value = 'xyz';

      adminModule.searchPosts();

      const linhas = Array.from(
        document.querySelectorAll('#posts-table tbody tr')
      );
      expect(linhas[0].style.display).toBe('none');
      expect(linhas[1].style.display).toBe('');     // “Teste XYZ”
      expect(linhas[2].style.display).toBe('none');
    });

    test('ao digitar parte de conteúdo ou ID, filtra corretamente', () => {
      const input = document.getElementById('search-posts');
      input.value = 'conteúdo c';

      adminModule.searchPosts();

      const linhas = Array.from(
        document.querySelectorAll('#posts-table tbody tr')
      );
      expect(linhas[0].style.display).toBe('none');
      expect(linhas[1].style.display).toBe('none');
      expect(linhas[2].style.display).toBe(''); // “Outro Post” → conteudo C
    });
  });
});