document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('curtir')) {
        const publicacaoId = e.target.dataset.id;
        const curtidasCountElement = e.target.querySelector('.curtidas-count');

        const jaCurtiu = e.target.classList.contains('curtido-por-mim');

        if (jaCurtiu) {
            try {
                const response = await fetch(`/api/publicacoes/${publicacaoId}/descurtir`, {
                    method: 'DELETE'
                });
                const data = await response.json();
                if (response.ok) {
                    e.target.classList.remove('curtido-por-mim');
                    if (curtidasCountElement) {
                        curtidasCountElement.textContent = parseInt(curtidasCountElement.textContent) - 1;
                    }
                    e.target.innerHTML = `Curtir <span class="curtidas-count">${curtidasCountElement ? curtidasCountElement.textContent : 0}</span>`;

                } else {
                    alert(`Erro ao descurtir: ${data.message}`);
                }
            } catch (error) {
                console.error('Erro de rede ao descurtir publicação:', error);
                alert('Erro de rede ao descurtir publicação.');
            }
        } else {
            try {
                const response = await fetch(`/api/publicacoes/${publicacaoId}/curtir`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                const data = await response.json();
                if (response.ok) {
                    e.target.classList.add('curtido-por-mim');
                    if (curtidasCountElement) {
                        curtidasCountElement.textContent = parseInt(curtidasCountElement.textContent) + 1;
                    }
                    e.target.innerHTML = `Descurtir <span class="curtidas-count">${curtidasCountElement ? curtidasCountElement.textContent : 0}</span>`;

                } else {
                    alert(`Erro ao curtir: ${data.message}`);
                }
            } catch (error) {
                console.error('Erro de rede ao curtir publicação:', error);
                alert('Erro de rede ao curtir publicação.');
            }
        }
    }
});