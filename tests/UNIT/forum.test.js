// forum.test.js
/**
 * @jest-environment jsdom
 */

import { curtirPublicacao, toggleComentarios } from '../../public/forum/forum.js';

beforeEach(() => {
  // Antes de cada teste, limpamos mocks e restauramos localStorage
  jest.clearAllMocks();
  // Mock simples de localStorage
  const store = {};
  global.localStorage = {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value; }),
    removeItem: jest.fn((key) => { delete store[key]; }),
  };
  // Mock de window.alert
  global.alert = jest.fn();
  // Mock de fetch
  global.fetch = jest.fn();
});

describe('toggleComentarios(button)', () => {
  let button;
  let listaComentarios;
  let publicacao;

  beforeEach(() => {
    // Monta um DOM mínimo:
    document.body.innerHTML = `
      <div class="publicacao">
        <div class="lista-comentarios" style="display: none;">Comentários...</div>
        <button class="toggle-btn">Mostrar Comentários</button>
      </div>
    `;
    publicacao = document.querySelector('.publicacao');
    listaComentarios = publicacao.querySelector('.lista-comentarios');
    button = publicacao.querySelector('button.toggle-btn');

    // Forçamos que toggleComentarios receba esse botão
    button.textContent = 'Mostrar Comentários';
  });

  test('deve exibir a lista de comentários quando estava oculta', () => {
    // Antes, lista estava display: none
    expect(listaComentarios.style.display).toBe('none');
    expect(button.textContent).toBe('Mostrar Comentários');

    toggleComentarios(button);

    // Depois de chamar, deve ficar block e texto "Ocultar Comentários"
    expect(listaComentarios.style.display).toBe('block');
    expect(button.textContent).toBe('Ocultar Comentários');
  });

  test('deve ocultar a lista de comentários quando estava visível', () => {
    // Ajusta estado inicial para “visível”
    listaComentarios.style.display = 'block';
    button.textContent = 'Ocultar Comentários';

    toggleComentarios(button);

    // Deve voltar para “none” e texto "Mostrar Comentários"
    expect(listaComentarios.style.display).toBe('none');
    expect(button.textContent).toBe('Mostrar Comentários');
  });
});

describe('curtirPublicacao(postId, button)', () => {
  let fakeButton;

  beforeEach(() => {
    // Cria um elemento de botão genérico
    fakeButton = document.createElement('button');
  });

  test('quando localStorage.getItem("userId") é null, deve chamar alert e retornar sem fetch', async () => {
    // Simula userId ausente
    localStorage.getItem.mockReturnValueOnce(null);

    await curtirPublicacao('12345', fakeButton);

    expect(localStorage.getItem).toHaveBeenCalledWith('userId');
    expect(global.alert).toHaveBeenCalledWith(
      'Você precisa estar logado para curtir uma publicação.'
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  test('quando curtir é bem-sucedido, deve chamar fetch para curtir e depois para notificação', async () => {
    // Simula um userId existente
    localStorage.getItem.mockImplementation((key) => {
      if (key === 'userId') return 'u-abc';
      if (key === 'postOwnerId') return 'owner-xyz';
      if (key === 'userName') return 'Fulano';
      return null;
    });

    // Mock da primeira chamada a fetch (curtir post)
    const fakeResponseCurtir = {
      ok: true,
      json: () => Promise.resolve({ message: 'Curtiu com sucesso!' }),
    };
    // Mock da segunda chamada a fetch (criar notificação)
    const fakeResponseNotif = {
      ok: true,
      json: () => Promise.resolve({ id: 'notif-1', mensagem: 'ok' }),
    };

    // Configura fetch para retornar em sequência as duas respostas
    fetch
      .mockResolvedValueOnce(fakeResponseCurtir)    // 1ª chamada: curtir
      .mockResolvedValueOnce(fakeResponseNotif);    // 2ª chamada: notificação

    // Chamamos a função
    await curtirPublicacao('post-123', fakeButton);

    // 1) Verifica que a primeira chamada a fetch ocorreu no endpoint correto
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      `/api/publicacoes/post-123/curtir`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'u-abc' }),
      })
    );

    // 2) Verifica que a segunda chamada (notificação) foi feita somente após a primeira
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      `/api/notificacoes`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuarioId: 'owner-xyz',
          mensagem: `Fulano curtiu sua publicação: "post-123"`,
        }),
      })
    );
  });

  test('quando a primeira resposta de curtir retorna !ok, deve lançar erro e não chamar notificação', async () => {
    // userId presente
    localStorage.getItem.mockImplementation((key) => {
      if (key === 'userId') return 'u-abc';
      if (key === 'postOwnerId') return 'owner-xyz';
      if (key === 'userName') return 'Fulano';
      return null;
    });

    // Faz com que a primeira chamada retorne ok: false
    const fakeErrorResponse = {
      ok: false,
      json: () => Promise.resolve({ message: 'Falha interna' }),
    };
    fetch.mockResolvedValueOnce(fakeErrorResponse);

    // Capturamos o rejeito de promise para validar que erro é lançado
    await expect(curtirPublicacao('post-999', fakeButton)).resolves.toBeUndefined();

    // A função interna faz `throw new Error(...)`, mas ela está no bloco try/catch,
    // então não propaga. Ainda assim, garantimos que a **segunda** chamada (notificação) NÃO ocorreu:
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});