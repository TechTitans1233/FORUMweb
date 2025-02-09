// Função para curtir uma publicação
async function curtirPublicacao(postId) {
    const userId = 'ID_DO_USUARIO'; // Substitua pelo ID do usuário autenticado
  
    try {
      const response = await fetch(`/api/publicacoes/${postId}/curtir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }), // Envia o ID do usuário no corpo da requisição
      });
  
      if (!response.ok) {
        throw new Error('Erro ao curtir a publicação');
      }
  
      const data = await response.json();
      console.log(data.message); // Mensagem de sucesso
  
      // Atualiza a contagem de curtidas na interface
      const button = document.querySelector(`.curtir[data-id="${postId}"]`);
      const curtidasCountSpan = button.querySelector('.curtidas-count');
      curtidasCountSpan.textContent = parseInt(curtidasCountSpan.textContent) + 1; // Incrementa a contagem de curtidas
    } catch (error) {
      console.error(error.message);
    }
  }
  
  // Adiciona o evento de clique a todos os botões de curtir
  document.querySelectorAll('.curtir').forEach(button => {
    button.addEventListener('click', () => {
      const postId = button.getAttribute('data-id');
      curtirPublicacao(postId);
    });
  });