/**
 * @jest-environment jsdom
 */

// Importa os mocks em vez do módulo real
import {
  toggleComentarios,
  updatePublicationsUserName,
  curtirPublicacao,
  updateUser,
  relacionarAmigos,
  carregarEstatisticas
} from '../../public/perfil/perfil.js';

// Configura os mocks antes de cada teste
beforeEach(() => {
  // Limpa todos os mocks
  jest.clearAllMocks();
  
  // Configura o mock do localStorage
  const store = {};
  global.localStorage = {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = String(value); }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { Object.keys(store).forEach(key => delete store[key]); })
  };

  // Configura o mock do fetch
  global.fetch = jest.fn();
  
  // Configura o mock do alert
  global.alert = jest.fn();
  
  // Limpa o conteúdo do body
  document.body.innerHTML = '';
});

// Helper para aguardar promises
const flushPromises = () => new Promise(setImmediate);

describe('toggleComentarios(button)', () => {
  let button, listaComentarios;

  beforeEach(() => {
    // Configura o DOM para o teste
    document.body.innerHTML = `
      <div class="publicacao">
        <div id="comentarios-1" class="lista-comentarios" style="display: none;">
          <div class="comentario">Comentário de teste</div>
        </div>
        <button class="toggle-btn" data-target="comentarios-1">Mostrar Comentários</button>
      </div>
    `;
    
    button = document.querySelector('.toggle-btn');
    listaComentarios = document.getElementById('comentarios-1');
  });

  test('deve alternar a visibilidade dos comentários', () => {
    // Estado inicial: oculto
    expect(listaComentarios.style.display).toBe('none');
    expect(button.textContent).toBe('Mostrar Comentários');
    
    // Primeiro clique: mostra os comentários
    toggleComentarios(button);
    expect(listaComentarios.style.display).toBe('block');
    expect(button.textContent).toBe('Ocultar Comentários');
    
    // Segundo clique: oculta os comentários
    toggleComentarios(button);
    expect(listaComentarios.style.display).toBe('none');
    expect(button.textContent).toBe('Mostrar Comentários');
  });

  test('deve retornar null se o botão for inválido', () => {
    const resultado = toggleComentarios(null);
    expect(resultado).toBeNull();
  });
});

describe('curtirPublicacao(postId, button)', () => {
  let button;
  
  beforeEach(() => {
    // Configura o botão de like
    document.body.innerHTML = `
      <button class="curtir">
        <span class="curtidas-count">0</span> Curtir
      </button>
    `;
    button = document.querySelector('.curtir');
    
    // Configura o localStorage
    localStorage.setItem('userId', 'user-123');
  });
  
  test('deve curtir uma publicação com sucesso', async () => {
    // Configura o mock do fetch para retornar sucesso
    const mockResponse = { curtidas: 5 };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });
    
    // Executa a função
    await curtirPublicacao('post-1', button);
    
    // Verifica se o fetch foi chamado corretamente
    expect(fetch).toHaveBeenCalledWith(
      '/api/publicacoes/post-1/curtir',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-123' })
      }
    );
    
    // Verifica se o botão foi atualizado
    const countElement = button.querySelector('.curtidas-count');
    expect(countElement.textContent).toBe('5');
    expect(button.disabled).toBe(true);
  });
  
  test('deve exibir alerta se o usuário não estiver logado', async () => {
    // Remove o userId do localStorage
    localStorage.removeItem('userId');
    
    // Executa a função
    await curtirPublicacao('post-1', button);
    
    // Verifica se o alerta foi exibido
    expect(alert).toHaveBeenCalledWith('Você precisa estar logado para curtir.');
    
    // Verifica se o fetch não foi chamado
    expect(fetch).not.toHaveBeenCalled();
  });
  
  test('deve lidar com erro na requisição', async () => {
    // Configura o mock do fetch para retornar erro
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });
    
    // Configura o console.error para não poluir os logs
    const originalError = console.error;
    console.error = jest.fn();
    
    // Executa a função e espera que ela lance um erro
    await expect(curtirPublicacao('post-1', button)).rejects.toThrow('Falha ao curtir publicação');
    
    // Restaura o console.error
    console.error = originalError;
  });
});

describe('updateUser(id, newName, newEmail, password)', () => {
  beforeEach(() => {
    // Configura o mock do fetch
    fetch.mockReset();
    
    // Configura o DOM para o teste de atualização de nome nas publicações
    document.body.innerHTML = `
      <div class="publicacao">
        <span class="nome-usuario">Nome Antigo</span>
      </div>
    `;
  });
  
  test('deve atualizar os dados do usuário com sucesso', async () => {
    // Configura o mock do fetch para retornar sucesso
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Usuário atualizado com sucesso' })
    });
    
    // Executa a função
    const result = await updateUser('user-123', 'Novo Nome', 'novo@email.com', 'senha123');
    
    // Verifica o resultado
    expect(result).toBe(true);
    
    // Verifica se o fetch foi chamado corretamente
    expect(fetch).toHaveBeenCalledWith(
      '/api/users/user-123',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: 'Novo Nome',
          email: 'novo@email.com',
          senha: 'senha123'
        })
      }
    );
    
    // Verifica se o nome foi atualizado nas publicações
    const nomeElement = document.querySelector('.nome-usuario');
    expect(nomeElement.textContent).toBe('Novo Nome');
  });
  
  test('deve lidar com erro na atualização', async () => {
    // Configura o mock do fetch para retornar erro
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Erro ao atualizar usuário' })
    });
    
    // Executa a função
    const result = await updateUser('user-123', 'Novo Nome', 'novo@email.com', 'senha123');
    
    // Verifica o resultado
    expect(result).toBe(false);
    
    // Verifica se o alerta foi exibido
    expect(alert).toHaveBeenCalledWith('Erro ao atualizar usuário');
  });
});

describe('carregarEstatisticas(usuarioId, isAmigo)', () => {
  beforeEach(() => {
    // Configura o DOM para o teste
    document.body.innerHTML = `
      <div id="followerCount"></div>
      <div id="followingCount"></div>
      <div id="amigoCount"></div>
    `;
  });
  
  test('deve carregar as estatísticas corretamente para um usuário normal', async () => {
    // Configura o mock do fetch para retornar sucesso
    fetch.mockImplementation((url) => {
      if (url.includes('seguidores')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ quantidadeSeguidores: 10 })
        });
      } else if (url.includes('seguindo')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ quantidadeSeguindo: 5 })
        });
      }
      return Promise.reject(new Error('URL não mapeada'));
    });
    
    // Executa a função
    await carregarEstatisticas('user-123', false);
    
    // Verifica se os elementos foram atualizados corretamente
    expect(document.getElementById('followerCount').textContent).toBe('10');
    expect(document.getElementById('followingCount').textContent).toBe('5');
    expect(document.getElementById('amigoCount').textContent).toBe('');
  });
  
  test('deve carregar as estatísticas corretamente para um amigo', async () => {
    // Configura o mock do fetch para retornar sucesso
    fetch.mockImplementation((url) => {
      if (url.includes('seguidores')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ quantidadeSeguidores: 20 })
        });
      } else if (url.includes('seguindo')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ quantidadeSeguindo: 10 })
        });
      }
      return Promise.reject(new Error('URL não mapeada'));
    });
    
    // Executa a função para um amigo
    await carregarEstatisticas('user-456', true);
    
    // Verifica se os elementos foram atualizados corretamente
    expect(document.getElementById('followerCount').textContent).toBe('20');
    expect(document.getElementById('followingCount').textContent).toBe('10');
    expect(document.getElementById('amigoCount').textContent).toBe('1');
  });
  
  test('deve lidar com erro ao carregar estatísticas', async () => {
    // Configura o mock do fetch para retornar erro
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });
    
    // Configura o console.error para não poluir os logs
    const originalError = console.error;
    console.error = jest.fn();
    
    // Executa a função e espera que ela lance um erro
    await expect(carregarEstatisticas('user-123', false)).rejects.toThrow('Erro ao carregar estatísticas');
    
    // Restaura o console.error
    console.error = originalError;
  });
});