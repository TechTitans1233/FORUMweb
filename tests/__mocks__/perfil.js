// Mock para o módulo perfil.js

export const toggleComentarios = jest.fn((button) => {
  if (!button) return null;
  
  const targetId = button.getAttribute('data-target');
  if (!targetId) return null;
  
  const target = document.getElementById(targetId);
  if (!target) return null;
  
  const isHidden = target.style.display === 'none';
  target.style.display = isHidden ? 'block' : 'none';
  button.textContent = isHidden ? 'Ocultar Comentários' : 'Mostrar Comentários';
  
  return target;
});

export const updatePublicationsUserName = jest.fn((newName) => {
  if (!newName) return false;
  
  const nameElements = document.querySelectorAll('.publicacao .nome-usuario');
  nameElements.forEach(el => {
    el.textContent = newName;
  });
  
  return true;
});

export const curtirPublicacao = jest.fn(async (postId, buttonElement) => {
  if (!postId || !buttonElement) return null;
  
  const userId = localStorage.getItem('userId');
  if (!userId) {
    alert('Você precisa estar logado para curtir.');
    return null;
  }

  try {
    const response = await fetch(`/api/publicacoes/${postId}/curtir`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      throw new Error('Falha ao curtir publicação');
    }

    const data = await response.json();
    
    // Atualiza a contagem de curtidas no botão
    const countElement = buttonElement.querySelector('.curtidas-count');
    if (countElement) {
      countElement.textContent = data.curtidas || '0';
    }
    
    // Desabilita o botão após curtir
    buttonElement.disabled = true;
    
    return data;
  } catch (error) {
    console.error('Erro ao curtir publicação:', error);
    throw error;
  }
});

export const updateUser = jest.fn(async (id, newName, newEmail, password) => {
  if (!id || !newName || !newEmail || !password) {
    throw new Error('Todos os campos são obrigatórios');
  }

  try {
    const response = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nome: newName, email: newEmail, senha: password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Falha ao atualizar usuário');
    }

    // Atualiza o nome nas publicações
    updatePublicationsUserName(newName);
    
    return true;
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    alert(error.message || 'Erro ao atualizar usuário');
    return false;
  }
});

export const relacionarAmigos = jest.fn(async (userEmail, emailAMIGO) => {
  if (!userEmail || !emailAMIGO) {
    throw new Error('Email do usuário e do amigo são obrigatórios');
  }

  try {
    // Busca o usuário
    const userResponse = await fetch(`/api/users/email/${userEmail}`);
    if (!userResponse.ok) {
      throw new Error('Usuário não encontrado');
    }
    const user = await userResponse.json();

    // Busca o amigo
    const friendResponse = await fetch(`/api/users/email/${emailAMIGO}`);
    if (!friendResponse.ok) {
      throw new Error('Amigo não encontrado');
    }
    const friend = await friendResponse.json();

    // Cria a relação de amizade
    const relationResponse = await fetch('/api/amigos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idUsuario: user.id,
        idAmigo: friend.id,
      }),
    });

    if (!relationResponse.ok) {
      throw new Error('Erro ao criar relação de amizade');
    }

    return await relationResponse.json();
  } catch (error) {
    console.error('Erro ao relacionar amigos:', error);
    throw error;
  }
});

export const carregarEstatisticas = jest.fn(async (usuarioId, isAmigo) => {
  if (!usuarioId) {
    throw new Error('ID do usuário é obrigatório');
  }

  try {
    const [seguidoresResponse, seguindoResponse] = await Promise.all([
      fetch(`/api/users/${usuarioId}/seguidores`),
      fetch(`/api/users/${usuarioId}/seguindo`),
    ]);

    if (!seguidoresResponse.ok || !seguindoResponse.ok) {
      throw new Error('Erro ao carregar estatísticas');
    }

    const seguidoresData = await seguidoresResponse.json();
    const seguindoData = await seguindoResponse.json();

    // Atualiza a UI
    const seguidoresElement = document.getElementById('followerCount');
    const seguindoElement = document.getElementById('followingCount');
    const amigoElement = document.getElementById('amigoCount');

    if (seguidoresElement) seguidoresElement.textContent = seguidoresData.quantidadeSeguidores || 0;
    if (seguindoElement) seguindoElement.textContent = seguindoData.quantidadeSeguindo || 0;
    
    // Se for um amigo, atualiza o contador de amigos
    if (isAmigo && amigoElement) {
      amigoElement.textContent = '1'; // Simplesmente 1 para teste
    }

    return { seguidores: seguidoresData, seguindo: seguindoData };
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
    throw error;
  }
});

// Exportação padrão para compatibilidade
const perfil = {
  toggleComentarios,
  updatePublicationsUserName,
  curtirPublicacao,
  updateUser,
  relacionarAmigos,
  carregarEstatisticas,
};

export default perfil;
