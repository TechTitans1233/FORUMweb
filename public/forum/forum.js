// forum.js
console.log('forum.js está carregando e executando!');

// Variáveis globais (ou acessíveis) para o mapa,
// para que possam ser acessadas em diferentes funções e listeners
let mainMap;
let drawnItems;
let drawControl;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded disparado. Iniciando configurações do fórum.');

    // --- 1. Inicialização do Mapa Principal (Movido para dentro do DOMContentLoaded) ---
    const mapElement = document.getElementById('map');
    if (mapElement) {
        try {
            mainMap = L.map('map').setView([-23.55052, -46.633308], 20);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(mainMap);

            drawnItems = new L.FeatureGroup();
            mainMap.addLayer(drawnItems);

            drawControl = new L.Control.Draw({
                edit: { featureGroup: drawnItems },
                draw: {
                    polygon: true,
                    polyline: true,
                    rectangle: true,
                    circle: true,
                    marker: true
                }
            });
            mainMap.addControl(drawControl);

            console.log('Mapa Leaflet principal inicializado.');

            mainMap.on('draw:created', function (event) {
                const layer = event.layer;
                drawnItems.addLayer(layer);
                const publicarButton = document.getElementById('publicar');
                if (publicarButton) {
                    publicarButton.dataset.shape = JSON.stringify(layer.toGeoJSON());
                    console.log('Forma desenhada e armazenada no botão Publicar.');
                }
            });

            mainMap.on('draw:drawstart', function () {
                const publicarButton = document.getElementById('publicar');
                if (publicarButton && publicarButton.dataset.shape) {
                    delete publicarButton.dataset.shape;
                    console.log('Desenho anterior limpo do botão Publicar.');
                }
            });

        } catch (error) {
            console.error('Erro ao inicializar o mapa Leaflet principal:', error);
        }
    } else {
        console.warn('Elemento #map para o mapa principal não encontrado. O mapa não será inicializado.');
    }

    // --- 2. Lógica do Botão Toggle "Nova Publicação" ---
    const toggleButton = document.getElementById('toggle-visibility');
    const newPostContent = document.querySelector('.new-post-content');

    if (toggleButton && newPostContent) {
        toggleButton.textContent = 'Ocultar';

        toggleButton.addEventListener('click', () => {
            const isHidden = newPostContent.classList.toggle('hidden');
            toggleButton.textContent = isHidden ? 'Exibir' : 'Ocultar';

            if (!isHidden && mainMap && typeof mainMap.invalidateSize === 'function') {
                setTimeout(() => {
                    mainMap.invalidateSize();
                }, 100);
            }
        });
    } else {
        console.error('Elemento toggleButton ou newPostContent não encontrado. Funcionalidade de toggle desabilitada.');
    }

    // --- 3. Geocodificação do endereço ao perder o foco no campo ---
    const enderecoInput = document.getElementById('endereco');
    if (enderecoInput) {
        enderecoInput.addEventListener('blur', function () {
            const address = this.value.trim();
            if (!address) return;

            const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
            fetch(geocodeUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.length > 0) {
                        const { lat, lon } = data[0];
                        if (mainMap) {
                            mainMap.setView([lat, lon], 13);
                            mainMap.eachLayer(function (layer) {
                                if (layer instanceof L.Marker && layer !== drawnItems) {
                                    mainMap.removeLayer(layer);
                                }
                            });
                            L.marker([lat, lon]).addTo(mainMap).bindPopup(`Localização: ${address}`).openPopup();
                        }
                    } else {
                        alert("Endereço não encontrado.");
                    }
                })
                .catch(error => console.error("Erro ao buscar endereço:", error));
        });
    } else {
        console.warn('Elemento #endereco não encontrado. Geocodificação desabilitada.');
    }

    // --- 4. Função para adicionar uma publicação (no lado do cliente) e enviar para o backend ---
    const publicarButton = document.getElementById('publicar');
    if (publicarButton) {
        publicarButton.addEventListener('click', async (e) => {
            e.preventDefault();

            const titulo = document.querySelector('#titulo').value.trim();
            const conteudo = document.querySelector('#conteudo').value.trim();
            const endereco = document.querySelector('#endereco').value.trim();
            const feedbackElement = document.getElementById('feedback');

            const userName = localStorage.getItem("userName");
            const userId = localStorage.getItem("userId");
            const userToken = localStorage.getItem("userToken");

            if (!userName || !userId || !userToken) {
                alert("Você precisa estar logado para publicar.");
                return;
            }

            if (!titulo || !conteudo || !endereco) {
                feedbackElement.textContent = 'Por favor, preencha todos os campos.';
                feedbackElement.style.color = 'red';
                return;
            }

            let lat, lon;
            try {
                const geocodeUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(endereco)}&apiKey=526703722e01495ebde57e4393f8aa68`;
                const geoapifyResponse = await fetch(geocodeUrl);
                const geoapifyData = await geoapifyResponse.json();

                if (!geoapifyData.features || geoapifyData.features.length === 0) {
                    feedbackElement.textContent = 'Endereço não encontrado ou inválido pela Geoapify.';
                    feedbackElement.style.color = 'red';
                    return;
                }
                [lon, lat] = geoapifyData.features[0].geometry.coordinates;
            } catch (error) {
                console.error("Erro ao geocodificar endereço com Geoapify:", error);
                feedbackElement.textContent = 'Erro ao geocodificar endereço.';
                feedbackElement.style.color = 'red';
                return;
            }

            const postData = {
                titulo,
                conteudo,
                endereco,
                lat,
                lon,
                // userId e userName serão pegos do token no backend
            };

            if (publicarButton.dataset.shape) {
                postData.marcacao = publicarButton.dataset.shape;
            }

            try {
                const response = await fetch('/api/publicacoes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${userToken}`
                    },
                    body: JSON.stringify(postData)
                });

                const data = await response.json();
                if (response.ok) {
                    feedbackElement.textContent = 'Publicação criada com sucesso!';
                    feedbackElement.style.color = 'green';
                    document.getElementById('publicacao-form').reset();
                    drawnItems.clearLayers();
                    delete publicarButton.dataset.shape;

                    await carregarPublicacoes();
                } else {
                    feedbackElement.textContent = data.message || 'Erro ao criar publicação.';
                    feedbackElement.style.color = 'red';
                }
            } catch (error) {
                console.error("Erro ao enviar a publicação:", error);
                feedbackElement.textContent = 'Erro de rede ao enviar publicação.';
                feedbackElement.style.color = 'red';
            }
        });
    } else {
        console.warn('Elemento #publicar não encontrado. Funcionalidade de publicação desabilitada.');
    }

    // --- 5. Funcionalidade para enviar comentários (Delegate Event) ---
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('enviar-comentario')) {
            const publicacaoId = e.target.dataset.id;
            const comentarioInput = e.target.previousElementSibling;
            const comentario = comentarioInput.value.trim();

            const userName = localStorage.getItem("userName");
            const userToken = localStorage.getItem("userToken");

            if (!comentario) {
                alert("Por favor, escreva um comentário.");
                return;
            }
            if (!userToken) {
                alert("Você precisa estar logado para comentar.");
                return;
            }

            try {
                const response = await fetch('/api/comentarios', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${userToken}`
                    },
                    body: JSON.stringify({
                        publicacaoId,
                        comentario,
                        // usuario e userId serão pegos do token no backend
                    })
                });

                const data = await response.json();
                if (response.ok) {
                    const listaComentarios = e.target.closest('.publicacao').querySelector('.lista-comentarios');
                    const dataComentario = data.dataCriacao && data.dataCriacao._seconds ?
                                            new Date(data.dataCriacao._seconds * 1000).toLocaleString() :
                                            new Date().toLocaleString(); // Fallback para data atual se não houver timestamp

                    const novoComentarioHTML = `
                        <div class="comentario">
                            <img src="https://www.gravatar.com/avatar/?d=mp&s=128" alt="Usuário Desconhecido" class="foto-perfil-comentario">
                            <!--<img src="foto_usuario.jpg" class="foto-perfil-comentario">-->
                            <div class="info-comentario">
                                <span class="nome-usuario">${data.usuario || userName}</span>
                                <span class="tempo-comentario">${dataComentario}</span>
                                <div class="texto-comentario">${data.comentario}</div>
                            </div>
                        </div>`;
                    const noCommentsMessage = listaComentarios.querySelector('.no-comments-message');
                    if (noCommentsMessage) {
                        noCommentsMessage.remove();
                    }
                    listaComentarios.innerHTML += novoComentarioHTML;
                    listaComentarios.style.display = 'block';
                    comentarioInput.value = '';
                } else {
                    alert(`Erro ao enviar comentário: ${data.message || 'Erro desconhecido'}`);
                }
            } catch (error) {
                console.error("Erro ao enviar comentário (rede):", error);
                alert("Erro de rede ao enviar comentário.");
            }
        }
    });

    // --- Lógica para Curtir/Descurtir (Delegando Eventos) ---
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('curtir')) {
            const publicacaoId = e.target.dataset.id;
            const curtidasCountElement = e.target.querySelector('.curtidas-count');
            const token = localStorage.getItem('userToken');

            if (!token) {
                alert("Você precisa estar logado para curtir ou descurtir.");
                return;
            }

            const jaCurtiu = e.target.classList.contains('curtido-por-mim');

            if (jaCurtiu) {
                try {
                    const response = await fetch(`/api/publicacoes/${publicacaoId}/descurtir`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
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
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
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

    // --- 6. Função para carregar publicações existentes (Melhorada e encapsulada) ---
    async function carregarPublicacoes() {
        const currentUserId = localStorage.getItem("userId");
        const userToken = localStorage.getItem("userToken"); // Pega o token para enviar na requisição

        try {
            // Inclui o token no cabeçalho para que o backend possa verificar as curtidas do usuário
            const response = await fetch('/api/publicacoes', {
                headers: {
                    'Authorization': `Bearer ${userToken}`
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const publicacoes = await response.json();
            const publicationsContainer = document.querySelector('#publications');
            if (!publicationsContainer) {
                console.error('Contêiner de publicações #publications não encontrado.');
                return;
            }
            publicationsContainer.innerHTML = '';

            for (const post of publicacoes) {
                const publicationHTML = document.createElement('div');
                publicationHTML.classList.add('publicacao');

                // Usa isLikedByMe diretamente do backend (se implementado)
                // Caso contrário, use a lógica com curtidasPorUsuarios se o backend enviar os IDs
                const isLikedByMe = post.isLikedByMe || (post.curtidasPorUsuarios && post.curtidasPorUsuarios.includes(currentUserId));
                const buttonText = isLikedByMe ? `Descurtir <span class="curtidas-count">${post.curtidas || 0}</span>` : `Curtir <span class="curtidas-count">${post.curtidas || 0}</span>`;
                const buttonClass = isLikedByMe ? 'curtir curtido-por-mim' : 'curtir';

                publicationHTML.innerHTML = `
                    <div class="cabecalho">
                        <img src="https://www.gravatar.com/avatar/?d=mp&s=128" alt="Usuário Desconhecido" class="foto-usuario">
                        <!--<img src="foto_usuario.jpg" class="foto-usuario">-->
                        <div class="info-usuario">
                            <span class="nome-usuario">${post.usuario}</span> <span class="tempo-postagem">${new Date(post.dataCriacao).toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="titulo-publicacao">${post.titulo}</div>
                    <div class="conteudo-publicacao">${post.conteudo}</div>
                    <div class="location-section">
                        <div id="map-${post.id}" class="map-box" style="height: 200px;"></div>
                    </div>
                    <div class="acoes">
                        <button class="${buttonClass}" data-id="${post.id}">${buttonText}</button>
                        <div class="comentarios">
                            <input type="text" placeholder="Escreva um comentário..." class="comentario-input">
                            <button class="enviar-comentario" data-id="${post.id}">Comentar</button>
                        </div>
                    </div>
                    <button class="toggle-comentarios-btn">Mostrar Comentários</button>
                    <div class="lista-comentarios" style="display: none;">
                    </div>`;

                publicationsContainer.appendChild(publicationHTML);
                const divider = document.createElement('hr');
                divider.className = 'post-divider';
                publicationsContainer.appendChild(divider);


                const newMapId = `map-${post.id}`;
                const postMapElement = document.getElementById(newMapId);
                if (postMapElement) {
                    try {
                        const newPostMap = L.map(newMapId).setView([post.lat, post.lon], 13);
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            attribution: '&copy; OpenStreetMap contributors'
                        }).addTo(newPostMap);

                        L.marker([post.lat, post.lon]).addTo(newPostMap).bindPopup(`<b>${post.titulo}</b><br>${post.endereco}`).openPopup();

                        if (post.marcacao) {
                            try {
                                const marcacaoGeoJSON = JSON.parse(post.marcacao);
                                if (marcacaoGeoJSON && marcacaoGeoJSON.geometry && marcacaoGeoJSON.geometry.coordinates) {
                                    if (marcacaoGeoJSON.type === "Feature" && marcacaoGeoJSON.geometry.type === "Polygon") {
                                        const latLngs = marcacaoGeoJSON.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
                                        L.polygon(latLngs, {
                                            color: 'green',
                                            weight: 3,
                                            opacity: 0.5,
                                            fillColor: 'yellow',
                                            fillOpacity: 0.2
                                        }).addTo(newPostMap);
                                    } else {
                                        L.geoJSON(marcacaoGeoJSON, {
                                            onEachFeature: (feature, layer) => {
                                                layer.bindPopup(`<b>${post.titulo}</b><br>${post.endereco}`);
                                            }
                                        }).addTo(newPostMap);
                                    }
                                }
                            } catch (error) {
                                console.error(`Erro ao analisar marcação para ${newMapId}:`, error);
                            }
                        }
                    } catch (mapError) {
                        console.error(`Erro ao inicializar mapa para publicação ${post.id}:`, mapError);
                    }
                }

                // Carregar comentários para a publicação (USANDO A ROTA /api/publicacoes/:id/comentarios)
                try {
                    const comentariosResponse = await fetch(`/api/publicacoes/${post.id}/comentarios`);
                    if (!comentariosResponse.ok) {
                        throw new Error(`HTTP error! status: ${comentariosResponse.status}`);
                    }
                    const comentarios = await comentariosResponse.json();
                    const listaComentarios = publicationHTML.querySelector('.lista-comentarios');
                    listaComentarios.innerHTML = '';

                    if (comentarios.length === 0) {
                        listaComentarios.innerHTML = '<p class="no-comments-message">Nenhum comentário ainda.</p>';
                    } else {
                        comentarios.forEach(comentario => {
                            // dataCriacao pode vir como Timestamp do Firebase Admin SDK (_seconds)
                            const dataComentario = comentario.dataCriacao && comentario.dataCriacao._seconds ?
                                                    new Date(comentario.dataCriacao._seconds * 1000).toLocaleString() :
                                                    new Date(comentario.dataCriacao).toLocaleString(); // Fallback para string de data

                            const comentarioHTML = `
                                <div class="comentario">
                                    <img src="https://www.gravatar.com/avatar/?d=mp&s=128" alt="Usuário Desconhecido" class="foto-perfil-comentario">
                                    <!--<img src="foto_usuario.jpg" class="foto-perfil-comentario">-->
                                    <div class="info-comentario">
                                        <span class="nome-usuario">${comentario.usuario}</span>
                                        <span class="tempo-comentario">${dataComentario}</span>
                                        <div class="texto-comentario">${comentario.comentario}</div>
                                    </div>
                                </div>`;
                            listaComentarios.innerHTML += comentarioHTML;
                        });
                    }
                } catch (error) {
                    console.error(`Erro ao carregar comentários para publicação ${post.id}:`, error);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar publicações:', error);
        }
    }
    carregarPublicacoes();

    // --- 7. Logout (Unificado) ---
    const logoutButton = document.getElementById("logoutButton");
    const logoutLink = document.getElementById('logout-link');

    const handleLogout = (event) => {
        event.preventDefault();
        localStorage.removeItem("userToken");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userName");
        localStorage.removeItem("userId");
        localStorage.removeItem("amigoId");
        localStorage.removeItem("amigoName");
        localStorage.removeItem("amigoEmail");
        window.location.href = "../api/logout";
    };

    if (logoutButton) {
        logoutButton.addEventListener("click", handleLogout);
    }
    if (logoutLink) {
        logoutLink.addEventListener("click", handleLogout);
    }

    // --- 9. Funcionalidade de pesquisa de usuários (Consolidada e Corrigida) ---
    const searchInput = document.getElementById('searchInput');
    const usuariosEncontradosContainer = document.getElementById('usuariosEncontrados');
    const usuariosOcultosContainer = document.getElementById('usuariosOcultos');

    let allUsers = [];

    async function carregarTodosUsuarios() {
        try {
            const response = await fetch('/api/users');
            if (!response.ok) {
                throw new Error('Erro ao buscar usuários');
            }
            allUsers = await response.json();
            exibirUsuarios(allUsers, usuariosOcultosContainer);
        } catch (error) {
            console.error('Erro ao carregar todos os usuários:', error);
        }
    }

    function exibirUsuarios(users, container) {
        if (!container) {
            console.error('Contêiner de usuários não encontrado.');
            return;
        }
        container.innerHTML = '';
        users.forEach(user => {
            const userBlock = document.createElement('div');
            userBlock.className = 'perfil';
            userBlock.innerHTML = `
                <img src="https://www.gravatar.com/avatar/?d=mp&s=128" alt="Usuário Desconhecido" class="foto-perfil">
                <!--<img src="foto-usuario.jpg" alt="Foto de ${user.name}" class="foto-perfil">-->
                <div class="info-perfil">
                    <a href="#" class="ver-perfil" data-id="${user.id}" data-name="${user.name}" data-email="${user.email}">
                        <h1 class="nome">${user.name}</h1>
                    </a>
                </div>
            `;
            container.appendChild(userBlock);
        });

        const verPerfilLinks = container.querySelectorAll('.ver-perfil');
        verPerfilLinks.forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const userId = link.getAttribute('data-id');
                const userName = link.getAttribute('data-name');
                const userEmail = link.getAttribute('data-email');

                localStorage.setItem('amigoId', userId);
                localStorage.setItem('amigoName', userName);
                localStorage.setItem('amigoEmail', userEmail);

                window.location.href = '../perfil/perfilAMIGO.html';
            });
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim().toLowerCase();
            if (query.length > 0) {
                const filteredUsers = allUsers.filter(user => user.name.toLowerCase().includes(query));
                if (usuariosOcultosContainer) usuariosOcultosContainer.style.display = 'none';
                exibirUsuarios(filteredUsers, usuariosEncontradosContainer);
                if (usuariosEncontradosContainer) {
                    usuariosEncontradosContainer.style.display = 'block';
                }
            } else {
                if (usuariosEncontradosContainer) usuariosEncontradosContainer.innerHTML = '';
                if (usuariosOcultosContainer) usuariosOcultosContainer.style.display = 'block';
                exibirUsuarios(allUsers, usuariosOcultosContainer);
            }
        });
        carregarTodosUsuarios();
    } else {
        console.warn('Elemento #searchInput não encontrado. Funcionalidade de pesquisa desabilitada.');
    }

    const btnOcultar = document.getElementById('btnOcultar');
    if (btnOcultar && usuariosOcultosContainer) {
        btnOcultar.addEventListener('click', () => {
            if (usuariosOcultosContainer.style.display === 'none') {
                usuariosOcultosContainer.style.display = 'block';
                btnOcultar.textContent = 'Ocultar usuários';
            } else {
                usuariosOcultosContainer.style.display = 'none';
                btnOcultar.textContent = 'Mostrar mais usuários';
            }
        });
    } else {
        console.warn('Botão #btnOcultar ou contêiner #usuariosOcultos não encontrado.');
    }

    // --- 10. Funcionalidade de Notificações (Consolidada) ---
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
}); // Fim do grande DOMContentLoaded

// --- Delegate event para o botão 'toggle-comentarios-btn' ---
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('toggle-comentarios-btn')) {
        const button = e.target;
        const listaComentarios = button.nextElementSibling;

        if (listaComentarios) {
            if (listaComentarios.style.display === 'none') {
                listaComentarios.style.display = 'block';
                button.textContent = 'Ocultar Comentários';
            } else {
                listaComentarios.style.display = 'none';
                button.textContent = 'Mostrar Comentários';
            }
        }
    }
});

// forum.js (adicionar isso para efeito visual)
document.querySelectorAll("#divisions div").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll("#divisions div").forEach(el => el.classList.remove("active"));
        tab.classList.add("active");
        // lógica de carregar o conteúdo correspondente aqui
    });
});
