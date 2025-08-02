const notificacoesButton = document.getElementById('notificacoes-button');
const notificacoesModal = document.getElementById('notificacoes-modal');
const closeButtonModal = document.querySelector('#notificacoes-modal .close-button');
const notificacoesList = document.getElementById('notificacoes-list');
const notificacoesCount = document.getElementById('notificacoes-count');

const carregarNotificacoes = async () => {
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("userToken"); // Precisa do token para a rota de notificações

    if (!userId || !token) {
        console.warn("userId ou token não encontrado para carregar notificações.");
        // Opcional: Redirecionar para login ou exibir mensagem
        return;
    }
    try {
        const response = await fetch(`/api/notificacoes/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const notificacoes = await response.json();
        notificacoesList.innerHTML = '';
        notificacoes.forEach(notificacao => {
            const notificacaoItem = document.createElement('div');
            const dataFormatada = notificacao.dataCriacao && notificacao.dataCriacao._seconds ?
                                        new Date(notificacao.dataCriacao._seconds * 1000).toLocaleString() :
                                        new Date(notificacao.dataCriacao).toLocaleString();
            notificacaoItem.textContent = `${notificacao.mensagem} - ${dataFormatada}`;
            notificacoesList.appendChild(notificacaoItem);
        });
        notificacoesCount.textContent = notificacoes.length;
        if (notificacoes.length > 0) {
            notificacoesCount.classList.remove('hidden');
        } else {
            notificacoesCount.classList.add('hidden');
        }
    } catch (error) {
        console.error('Erro ao carregar notificações:', error);
        notificacoesCount.classList.add('hidden');
    }
};

if (notificacoesButton && notificacoesModal && closeButtonModal && notificacoesList && notificacoesCount) {
    notificacoesButton.addEventListener('click', async (e) => {
        e.preventDefault();
        await carregarNotificacoes();
        notificacoesModal.classList.remove('hidden');
    });

    closeButtonModal.addEventListener('click', () => {
        notificacoesModal.classList.add('hidden');
    });

    window.addEventListener('click', (event) => {
        if (event.target === notificacoesModal) {
            notificacoesModal.classList.add('hidden');
        }
    });
} else {
    console.warn('Um ou mais elementos de notificação não encontrados. Funcionalidade de notificação desabilitada.');
}