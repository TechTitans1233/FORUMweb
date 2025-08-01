// Mock para o módulo utils.js

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

// Exportação padrão para compatibilidade
const utils = {
  toggleComentarios,
  curtirPublicacao
};

export default utils;
