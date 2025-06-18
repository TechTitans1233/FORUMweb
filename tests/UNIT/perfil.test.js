/**
 * @jest-environment jsdom
 */

import {
  toggleComentarios,
  updatePublicationsUserName,
  curtirPublicacao,
  updateUser,
  relacionarAmigos,
  carregarEstatisticas
} from '../../public/perfil/perfil.js';

beforeEach(() => {
  jest.clearAllMocks();

  // Mock básico de localStorage
  const store = {};
  global.localStorage = {
    getItem: jest.fn((key) => (key in store ? store[key] : null)),
    setItem: jest.fn((key, value) => { store[key] = value; }),
    removeItem: jest.fn((key) => { delete store[key]; }),
  };

  // Mock de alert
  global.alert = jest.fn();
  // Mock de fetch
  global.fetch = jest.fn();
  // Limpa o document.body antes de cada teste
  document.body.innerHTML = '';
});

// Helper para “esperar” o then(...) interno em funções que não retornam explicitamente a Promise
function flushPromises() {
  return new Promise(resolve => setImmediate(resolve));
}

describe('toggleComentarios(button)', () => {
  let button, lista;

  beforeEach(() => {
    document.body.innerHTML = `
      <div class="publicacao">
        <div class="lista-comentarios" style="display: none;"></div>
        <button class="toggle-btn">Mostrar Comentários</button>
      </div>
    `;
    button = document.querySelector('button.toggle-btn');
    lista = document.querySelector('.lista-comentarios');
  });

  test('quando oculto, exibe e troca texto', () => {
    expect(lista.style.display).toBe('none');
    expect(button.textContent).toBe('Mostrar Comentários');

    toggleComentarios(button);

    expect(lista.style.display).toBe('block');
    expect(button.textContent).toBe('Ocultar Comentários');
  });

  test('quando visível, oculta e troca texto', () => {
    lista.style.display = 'block';
    button.textContent = 'Ocultar Comentários';

    toggleComentarios(button);

    expect(lista.style.display).toBe('none');
    expect(button.textContent).toBe('Mostrar Comentários');
  });
});

describe('updatePublicationsUserName(newName)', () => {
  test('deve alterar o texto de .nome-usuario para todos os .publicacao', () => {
    document.body.innerHTML = `
      <div class="publicacao">
        <span class="nome-usuario">Alice</span>
      </div>
      <div class="publicacao">
        <span class="nome-usuario">Bob</span>
      </div>
      <div class="publicacao">
        <!-- sem .nome-usuario -->
        <span class="outro">Carlos</span>
      </div>
    `;

    updatePublicationsUserName('NovoNome');

    const spans = Array.from(document.querySelectorAll('.publicacao .nome-usuario'));
    expect(spans[0].innerText).toBe('NovoNome');
    expect(spans[1].innerText).toBe('NovoNome');
    // O terceiro .publicacao não tinha .nome-usuario, então não há erro
    expect(document.querySelectorAll('.publicacao .outro')[0].innerText).toBe('Carlos');
  });
});

describe('curtirPublicacao(postId, button)', () => {
  let fakeButton, spanCount;

  beforeEach(() => {
    // Botão com uma <span class="curtidas-count">
    document.body.innerHTML = `<button class="curtir"><span class="curtidas-count">5</span></button>`;
    fakeButton = document.querySelector('button.curtir');
    spanCount = fakeButton.querySelector('.curtidas-count');
  });

  test('quando userId não existe, exibe alert e não faz fetch', async () => {
    localStorage.getItem.mockReturnValueOnce(null);

    await curtirPublicacao('post-1', fakeButton);

    expect(localStorage.getItem).toHaveBeenCalledWith('userId');
    expect(alert).toHaveBeenCalledWith('Você precisa estar logado para curtir uma publicação.');
    expect(fetch).not.toHaveBeenCalled();
  });

  test('quando sucesso, incrementa contagem, desabilita botão e troca texto', async () => {
    // Simula userId presente
    localStorage.getItem.mockReturnValueOnce('u-123');

    // Primeiro fetch => ok:true + json retorna { message: 'OK' }
    // Segundo fetch.json() => { message: 'OK' }
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Curtiu!' }),
    }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Curtiu!' }),
    });

    await curtirPublicacao('post-2', fakeButton);

    // Após o primeiro .json(), passamos para contagem
    expect(spanCount.innerText).toBe('6');
    expect(fakeButton.disabled).toBe(true);
    expect(fakeButton.textContent).toBe('Você curtiu esta publicação');
    expect(fetch).toHaveBeenCalledWith('/api/publicacoes/post-2/curtir', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'u-123' }),
    }));
  });

  test('se response.ok for false, cai no catch e não muda botão', async () => {
    localStorage.getItem.mockReturnValueOnce('u-456');

    fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: 'Erro' }),
    });

    // como o código faz try/catch, não haverá exceção não tratada
    await curtirPublicacao('post-3', fakeButton);

    // Nenhuma alteração no DOM neste caso
    expect(spanCount.innerText).toBe('5');
    expect(fakeButton.disabled).toBe(false);
    expect(fakeButton.textContent).toBe('5'); // o texto não muda (apenas span fica intacto)
  });
});

describe('updateUser(userId, newName, newEmail, password)', () => {
  let row1, row2;

  beforeEach(() => {
    // Prepara DOM com duas publicações genéricas
    document.body.innerHTML = `
      <div class="publicacao"><span class="nome-usuario">Alice</span></div>
      <div class="publicacao"><span class="nome-usuario">Bob</span></div>
    `;
    row1 = document.querySelectorAll('.publicacao .nome-usuario')[0];
    row2 = document.querySelectorAll('.publicacao .nome-usuario')[1];
  });

  test('quando PUT retorna ok:true, chama updatePublicationsUserName e retorna true', async () => {
    // Simula fetch PUT bem‐sucedido
    fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    const result = await updateUser('u-10', 'NovoAlice', 'novo@ex.com', 'senha123');

    expect(result).toBe(true);
    // Como updatePublicationsUserName foi chamado internamente, ambos os spans foram atualizados:
    expect(row1.innerText).toBe('NovoAlice');
    expect(row2.innerText).toBe('NovoAlice');
  });

  test('quando PUT retorna ok:false, exibe alert e retorna false', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: 'Falha ao atualizar' }),
    });

    const result = await updateUser('u-20', 'X', 'x@ex.com', '1234');

    expect(result).toBe(false);
    expect(alert).toHaveBeenCalledWith('Falha ao atualizar');
    // Como não foi bem‐sucedido, não deve alterar os spans
    expect(row1.innerText).toBe('Alice');
    expect(row2.innerText).toBe('Bob');
  });

  test('quando fetch lança exceção, alerta mensagem genérica e retorna false', async () => {
    fetch.mockRejectedValueOnce(new Error('Erro de rede'));

    const result = await updateUser('u-30', 'Y', 'y@ex.com', 'abcd');

    expect(result).toBe(false);
    expect(alert).toHaveBeenCalledWith('Erro de rede');
    // Não houve mudança no DOM
    expect(row1.innerText).toBe('Alice');
    expect(row2.innerText).toBe('Bob');
  });
});

describe('relacionarAmigos(userEmail, emailAMIGO)', () => {
  const user = { id: 'u-1', name: 'Alice' };
  const amigo = { id: 'u-2', name: 'Bob' };

  test('fluxo de sucesso: deve passar por três fetches e exibir alert final', async () => {
    // 1ª chamada: busca usuário pelo email
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(user) })
      // 2ª chamada: busca amigo pelo email
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(amigo) })
      // 3ª chamada: cria relação
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'rel-1' }) });

    await expect(relacionarAmigos('alice@ex.com', 'bob@ex.com')).resolves.toEqual({ id: 'rel-1' });

    // Verifica que cada fetch tenha sido chamado na ordem correta:
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      '/api/users/email/alice%40ex.com'
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      '/api/users/email/bob%40ex.com'
    );
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      '/api/amigos',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId: 'u-1', amigoId: 'u-2' }),
      })
    );
    expect(alert).toHaveBeenCalledWith('Você agora está seguindo bob');
  });

  test('se a busca do usuário retorna !ok, deve chamar alert e rejeitar', async () => {
    fetch.mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) });

    await expect(relacionarAmigos('x@ex.com', 'y@ex.com')).rejects.toThrow('Usuário não encontrado');
    expect(alert).toHaveBeenCalledWith('Erro ao seguir o amigo: Usuário não encontrado');
  });

  test('se a busca do amigo retorna !ok, deve alertar e rejeitar', async () => {
    // 1ª chamada bem‐sucedida, mas 2ª não
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(user) })
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) });

    await expect(relacionarAmigos('alice@ex.com', 'zz@ex.com')).rejects.toThrow('Amigo não encontrado');
    expect(alert).toHaveBeenCalledWith('Erro ao seguir o amigo: Amigo não encontrado');
  });

  test('se o POST /api/amigos retorna !ok, deve alertar e rejeitar', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(user) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(amigo) })
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({}) });

    await expect(relacionarAmigos('alice@ex.com', 'bob@ex.com')).rejects.toThrow('Erro ao criar relação de amizade');
    expect(alert).toHaveBeenCalledWith('Erro ao seguir o amigo: Erro ao criar relação de amizade');
  });
});

describe('carregarEstatisticas(usuarioId, isAmigo)', () => {
  beforeEach(() => {
    // Prepara DOM com os contadores:
    document.body.innerHTML = `
      <span id="followerCount"></span>
      <span id="followingCount"></span>
      <span id="followerCountAMIGO"></span>
      <span id="followingCountAMIGO"></span>
    `;
  });

  test('preenche elementos padrão (isAmigo=false)', async () => {
    // 1ª chamada /seguidores
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ quantidadeSeguidores: 42 }) })
      // 2ª chamada /seguindo
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ quantidadeSeguindo: 15 }) });

    await carregarEstatisticas('user-123', false);

    expect(fetch).toHaveBeenNthCalledWith(1, '/api/users/user-123/seguidores');
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/users/user-123/seguindo');

    expect(document.getElementById('followerCount').innerText).toBe('42');
    expect(document.getElementById('followingCount').innerText).toBe('15');
    // Os campos de AMIGO não devem ter sido preenchidos
    expect(document.getElementById('followerCountAMIGO').innerText).toBe('');
    expect(document.getElementById('followingCountAMIGO').innerText).toBe('');
  });

  test('preenche elementos de AMIGO (isAmigo=true)', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ quantidadeSeguidores: 7 }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ quantidadeSeguindo: 3 }) });

    await carregarEstatisticas('user-999', true);

    expect(fetch).toHaveBeenNthCalledWith(1, '/api/users/user-999/seguidores');
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/users/user-999/seguindo');

    expect(document.getElementById('followerCountAMIGO').innerText).toBe('7');
    expect(document.getElementById('followingCountAMIGO').innerText).toBe('3');
    // Os campos de “não-amigo” devem ficar vazios
    expect(document.getElementById('followerCount').innerText).toBe('');
    expect(document.getElementById('followingCount').innerText).toBe('');
  });

  test('se algum fetch falhar, propaga o erro e não altera os spans', async () => {
    fetch.mockRejectedValueOnce(new Error('Falha na rede'));
    await expect(carregarEstatisticas('x', false)).rejects.toThrow('Falha na rede');

    // Como rejeitou, não deve preencher nenhum conteúdo
    expect(document.getElementById('followerCount').innerText).toBe('');
    expect(document.getElementById('followingCount').innerText).toBe('');
  });
});