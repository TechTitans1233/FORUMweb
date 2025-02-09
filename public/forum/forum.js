// Configuração inicial do mapa principal
const mainMap = L.map('map').setView([-23.55052, -46.633308], 20);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(mainMap);

// Grupo de camadas para os desenhos no mapa principal
const drawnItems = new L.FeatureGroup();
mainMap.addLayer(drawnItems);

// Controles de desenho no mapa principal
const drawControl = new L.Control.Draw({
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

// Geocodificação do endereço ao perder o foco no campo
document.getElementById('endereco').addEventListener('blur', function () {
    const address = this.value;
    if (!address) return;
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    fetch(geocodeUrl)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const { lat, lon } = data[0];
                mainMap.setView([lat, lon], 13);
                L.marker([lat, lon]).addTo(mainMap).bindPopup(`Localização: ${address}`).openPopup();
            } else {
                alert("Endereço não encontrado.");
            }
        })
        .catch(error => console.error("Erro ao buscar endereço:", error));
});

// Armazena o desenho em formato GeoJSON ao concluí-lo
mainMap.on('draw:created', function (event) {
    const layer = event.layer;
    drawnItems.addLayer(layer);
    document.getElementById('publicar').dataset.shape = JSON.stringify(layer.toGeoJSON());
});

// Função para adicionar uma publicação (no lado do cliente) e enviar para o backend
document.getElementById('publicar').addEventListener('click', (e) => {
    e.preventDefault();

    // Valores do formulário
    const titulo = document.querySelector('#titulo').value.trim();
    const conteudo = document.querySelector('#conteudo').value.trim();
    const endereco = document.querySelector('#endereco').value.trim();
    
    // Recuperando o nome do usuário do localStorage
    const userName = localStorage.getItem("userName");

    // Geocodificação do endereço
    const geocodeUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(endereco)}&apiKey=526703722e01495ebde57e4393f8aa68`;
    fetch(geocodeUrl)
        .then(response => response.json())
        .then(data => {
            if (!data.features.length) {
                document.getElementById('feedback').textContent = 'Endereço não encontrado.';
                return;
            }

            const [lon, lat] = data.features[0].geometry.coordinates;

            // Enviar a publicação para o backend
            return fetch('/api/publicacoes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    titulo,
                    conteudo,
                    endereco,
                    lat,
                    lon,
                    usuario: userName // Incluindo o nome do usuário na publicação
                })
            });
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao enviar a publicação');
            }
            return response.json(); // Retorna a publicação criada
        })
        .then(publicacao => {
            // Criar a notificação
            return fetch('/api/notificacoes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    usuarioId: localStorage.getItem("userId"), // ID do usuário que está recebendo a notificação
                    mensagem: `${userName} fez uma nova publicação: "${titulo}"`
                })
            })
            .then(notificationResponse => {
                if (!notificationResponse.ok) {
                    throw new Error('Erro ao criar notificação');
                }
                return notificationResponse.json(); // Retorna a notificação criada
            })
            .then(notification => {
                console.log('Notificação criada:', notification);
            })
            .catch(error => {
                console.error("Erro ao criar notificação:", error);
            })
            .finally(() => {
                // Recarregar a página após a publicação ser enviada com sucesso
                window.location.reload();
            });
        })
        .catch(error => {
            console.error("Erro ao enviar a publicação:", error);
            document.getElementById('feedback').textContent = 'Erro ao publicar.';
        });
});
// Função para enviar comentários
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('enviar-comentario')) {
        const publicacaoId = e.target.dataset.id;
        const comentarioInput = e.target.previousElementSibling;
        const comentario = comentarioInput.value.trim();

        if (!comentario) {
            alert("Por favor, escreva um comentário.");
            return;
        }

        // Enviar o comentário para o backend
        fetch('/api/comentarios', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                publicacaoId,
                comentario,
                usuario: localStorage.getItem("userName") // Incluindo o nome do usuário
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Comentário adicionado:', data);
            // Adicionar o comentário à lista de comentários
            const listaComentarios = e.target.closest('.publicacao').querySelector('.lista-comentarios');
            const novoComentarioHTML = `
                <div class="comentario">
                    <img src="foto_usuario.jpg" alt="Foto do Usuário" class="foto-usuario">
                    <div class="info-comentario">
                        <span class="nome-usuario">${data.usuario}</span>
                        <span class="tempo-comentario">${new Date(data.dataCriacao).toLocaleString()}</span>
                        <div class="texto-comentario">${data.comentario}</div>
                    </div>
                </div>`;
            listaComentarios.innerHTML += novoComentarioHTML;
            listaComentarios.style.display = 'block'; // Mostrar comentários
            comentarioInput.value = ''; // Limpar o campo de comentário
        })
        .catch(error => {
            console.error("Erro ao enviar comentário:", error);
        });
    }
});
// Função para curtir uma publicação
async function curtirPublicacao(postId, button) {
    const userId = localStorage.getItem("userId"); // Obtém o ID do usuário do localStorage

    if (!userId) {
        alert("Você precisa estar logado para curtir uma publicação.");
        return;
    }

    try {
        const response = await fetch(`/api/publicacoes/${postId}/curtir`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId }), // Envia o ID do usuário no corpo da requisição
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao curtir a publicação');
        }

        const data = await response.json();
        console.log(data.message); // Mensagem de sucesso

        // Criar a notificação
        fetch('/api/notificacoes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                usuarioId: localStorage.getItem("postOwnerId"), // ID do usuário que é o dono da publicação
                mensagem: `${localStorage.getItem("userName")} curtiu sua publicação: "${postId}"`
            })
        })
        .then(notificationResponse => {
            if (!notificationResponse.ok) {
                throw new Error('Erro ao criar notificação');
            }
            return notificationResponse.json();
        })
        .then(notification => {
            console.log('Notificação criada:', notification);
        })
        .catch(error => {
            console.error("Erro ao criar notificação:", error);
        });

        // O restante do código para atualizar a contagem de curtidas na interface...
    } catch (error) {
        console.error(error.message);
    }
}
// Exibir publicações já existentes (carregar do backend)
document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/publicacoes')
        .then(response => response.json())
        .then(publicacoes => {
            publicacoes.forEach(post => {
                const publicationHTML = document.createElement('div');
                publicationHTML.classList.add('publicacao');
                publicationHTML.innerHTML = `
                    <div class="cabecalho">
                        <img src="foto_usuario.jpg" alt="Foto do Usuário" class="foto-usuario">
                        <div class="info-usuario">
                            <span class="nome-usuario">${post.usuario}</span>
                            <span class="tempo-postagem">${new Date(post.dataCriacao).toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="titulo-publicacao">${post.titulo}</div>
                    <div class="location-section">
                        <div id="map-${post.id}" class="map-box" style="height: 200px;"></div>
                    </div>
                    <div class="acoes">
                        <button class="curtir" data-id="${post.id}">Curtir <span class="curtidas-count">${post.curtidas || 0}</span></button>
                        <div class="comentarios">
                            <input type="text" placeholder="Escreva um comentário..." class="comentario-input">
                            <button class="enviar-comentario" data-id="${post.id}">Comentar</button>
                        </div>
                    </div>
                    <div class="toggle-comentarios" onclick="toggleComentarios(this)">Mostrar Comentários</div>
                    <div class="lista-comentarios" style="display: none;">
                        <!-- Comentários serão adicionados aqui -->
                    </div>`;

                const publicationsContainer = document.querySelector('#publications');
                publicationsContainer.appendChild(publicationHTML);

                // Criar o mapa para a publicação
                const newMap = L.map(`map-${post.id}`).setView([post.lat, post.lon], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors'
                }).addTo(newMap);

                L.marker([post.lat, post.lon]).addTo(newMap).bindPopup(`<b>${post.titulo}</b><br>${post.endereco}`).openPopup();

                // Adicionar a marcação geométrica, se houver
                if (post.marcacao) {
                    try {
                        const marcacaoGeoJSON = JSON.parse(post.marcacao); // Certifique-se de que a marcacao é um JSON válido

                        if (marcacaoGeoJSON && marcacaoGeoJSON.geometry && marcacaoGeoJSON.geometry.coordinates.length > 0) {
                            if (marcacaoGeoJSON.type === "Feature" && marcacaoGeoJSON.geometry.type === "Polygon") {
                                const latLngs = marcacaoGeoJSON.geometry.coordinates[0].map(coord => [coord[1], coord[0]]); // Inverte a ordem de lat/lon
                                L.polygon(latLngs, {
                                    color: 'green',
                                    weight: 3,
                                    opacity: 0.5,
                                    fillColor: 'yellow',
                                    fillOpacity: 0.2
                                }).addTo(newMap);
                            } else {
                                L.geoJSON(marcacaoGeoJSON, {
                                    onEachFeature: (feature, layer) => {
                                        layer.bindPopup(`<b>${post.titulo}</b><br>${post.endereco}`);
                                    }
                                }).addTo(newMap);
                            }
                        } else {
                            console.warn("GeoJSON vazio ou inválido:", marcacaoGeoJSON);
                        }
                    } catch (error) {
                        console.error("Erro ao analisar a marcação:", error);
                    }
                }

                // Adicionar evento de clique ao botão de curtir
                const curtirButton = publicationHTML.querySelector('.curtir');
                curtirButton.addEventListener('click', () => {
                    curtirPublicacao(post.id, curtirButton); // Passa o ID da publicação e o botão
                });

                // Carregar comentários para a publicação
                fetch(`/api/publicacoes/${post.id}/comentarios`)
                    .then(response => response.json())
                    .then(comentarios => {
                        const listaComentarios = publicationHTML.querySelector('.lista-comentarios');
                        comentarios.forEach(comentario => {
                            const comentarioHTML = `
                                <div class="comentario">
                                    <img src="foto_usuario.jpg" alt="Foto do Usuário" class="foto-usuario">
                                    <div class="info-comentario">
                                        <span class="nome-usuario">${comentario.usuario}</span>
                                        <span class="tempo-comentario">${new Date(comentario.dataCriacao).toLocaleString()}</span>
                                        <div class="texto-comentario">${comentario.comentario}</div>
                                    </div>
                                </div>`;
                            listaComentarios.innerHTML += comentarioHTML;
                        });
                    })
                    .catch(error => console.error('Erro ao carregar comentários:', error));
            });
        })
        .catch(error => console.error('Erro ao carregar publicações:', error));
});
//localstorage
document.addEventListener('DOMContentLoaded', () => {
    // Recuperar os dados do localStorage
    const userName = localStorage.getItem("userName");

    // Verificar se o nome do usuário está presente no localStorage
    if (userName) {
        // Exibir o nome do usuário no HTML
        document.getElementById("userNameDisplay").innerText = "Bem-vindo, " + userName;
    }

    
   

    // Lidar com o logout
        document.getElementById('logout-link').addEventListener('click', (event) => {
        event.preventDefault();
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userName");
        window.location.href = "login/login.html"; // Redireciona para a página de login
    });
});
// Função para alternar a exibição dos comentários
function toggleComentarios(button) {
    const listaComentarios = button.closest('.publicacao').querySelector('.lista-comentarios');
    if (listaComentarios.style.display === 'none' || listaComentarios.style.display === '') {
        listaComentarios.style.display = 'block';
        button.textContent = 'Ocultar Comentários';
    } else {
        listaComentarios.style.display = 'none';
        button.textContent = 'Mostrar Comentários';
    }
}
//localstorage
document.addEventListener('DOMContentLoaded', () => {
    // Recuperar os dados do localStorage
    const userName = localStorage.getItem("userName");

    // Verificar se o nome do usuário está presente no localStorage
    if (userName) {
        // Exibir o nome do usuário no HTML
        document.getElementById("userNameDisplay").innerText = "Bem-vindo, " + userName;
    }

    // Lidar com o logout
    document.getElementById('logout-link').addEventListener('click', (event) => {
        event.preventDefault();
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userName");
        window.location.href = "login/login.html"; // Redireciona para a página de login
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('.search-input');
    const usuariosOcultos = document.getElementById('usuariosOcultos');

    // Função para carregar usuários
    async function carregarUsuarios() {
        try {
            const response = await fetch('/api/users'); // Altere para a URL correta da sua API
            if (!response.ok) {
                throw new Error('Erro ao buscar usuários');
            }
            const users = await response.json();
            exibirUsuarios(users);
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
        }
    }

    // Função para exibir usuários
    function exibirUsuarios(users) {
        usuariosOcultos.innerHTML = ''; // Limpa a lista de usuários

        users.forEach(user => {
            const userBlock = document.createElement('div');
            userBlock.className = 'perfil';
            userBlock.innerHTML = `
                <img src="foto-usuario.jpg" alt="Foto de ${user.nome}" class="foto-perfil">
                <div class="info-perfil">
                    <h1 class="nome">${user.nome}</h1>
                    <a href="#" class="ver-perfil">Ver perfil</a>
                </div>
            `;
            usuariosOcultos.appendChild(userBlock);
        });
    }

    // Função para filtrar usuários
    function filtrarUsuarios(users) {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredUsers = users.filter(user => user.nome.toLowerCase().includes(searchTerm));
        exibirUsuarios(filteredUsers);
    }

    // Carregar usuários ao iniciar
    carregarUsuarios();

    // Adicionar evento de input para a barra de pesquisa
    searchInput.addEventListener('input', () => {
        // Chama a função de filtrar usuários
        filtrarUsuarios(users);
    });
});

//oculta a seccao de nova publicacao
document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('toggle-visibility');
    const newPostContent = document.querySelector('.new-post-content');

    toggleButton.addEventListener('click', () => {
        if (newPostContent.classList.contains('hidden')) {
            // Mostra a seção de nova publicação
            newPostContent.classList.remove('hidden');
            toggleButton.textContent = 'Ocultar';

            // Aguarda um pequeno tempo e força o Leaflet a recalcular o mapa
            setTimeout(() => {
                mainMap.invalidateSize();
            }, 300);
        } else {
            // Oculta a seção de nova publicação
            newPostContent.classList.add('hidden');
            toggleButton.textContent = 'Exibir';
        }
    });
});

// Funcionalidade de pesquisa de usuários
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim();
    if (query.length > 0) {
        fetch(`/api/users/name/${encodeURIComponent(query)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Nenhum usuário encontrado');
                }
                return response.json();
            })
            .then(users => {
                const usuariosEncontrados = document.getElementById('usuariosEncontrados');
                usuariosEncontrados.innerHTML = ''; // Limpar resultados anteriores
                users.forEach(user => {
                    const userHTML = `
                        <div class="perfil">
                            <img src="foto_usuario.jpg" alt="Foto de ${user.name}" class="foto-perfil">
                            <div class="info-perfil">
                                <h1 class="nome">${user.name}</h1>
                                <a href="#" class="ver-perfil" data-id="${user.id}" data-name="${user.name}" data-email="${user.email}">Ver perfil</a>
                            </div>
                        </div>`;
                    usuariosEncontrados.innerHTML += userHTML;
                });

                // Adicionar evento de clique para cada link "Ver perfil"
                const verPerfilLinks = document.querySelectorAll('.ver-perfil');
                verPerfilLinks.forEach(link => {
                    link.addEventListener('click', (event) => {
                        event.preventDefault(); // Prevenir o comportamento padrão do link
                        const userId = link.getAttribute('data-id');
                        const userName = link.getAttribute('data-name');
                        const userEmail = link.getAttribute('data-email');

                        // Salvar informações do usuário em localStorage
                        localStorage.setItem('amigoId', userId);
                        localStorage.setItem('amigoName', userName);
                        localStorage.setItem('amigoEmail', userEmail);

                        console.log('Informações do amigo salvas no localStorage:', {
                            id: userId,
                            name: userName,
                            email: userEmail
                        });

                        
                        window.location.href = '../perfil/perfilAMIGO.html';
                    });
                });
            })
            .catch(error => {
                console.error('Erro ao buscar usuários:', error);
                document.getElementById('usuariosEncontrados').innerHTML = '<p>Nenhum usuário encontrado.</p>';
            });
    } else {
        document.getElementById('usuariosEncontrados').innerHTML = ''; // Limpar resultados se a pesquisa estiver vazia
    }
});

//Funcionalidade para popup de notificacoes.
document.addEventListener('DOMContentLoaded', () => {
    const notificacoesButton = document.getElementById('notificacoes-button');
    const notificacoesModal = document.getElementById('notificacoes-modal');
    const closeButton = document.querySelector('.close-button');
    const notificacoesList = document.getElementById('notificacoes-list');
    const notificacoesCount = document.getElementById('notificacoes-count');

    // Função para carregar notificações
    const carregarNotificacoes = async () => {
        const userId = localStorage.getItem("userId"); // Obtém o ID do usuário logado
        const response = await fetch(`/api/notificacoes/${userId}`); // Chama a API para buscar notificações
        const notificacoes = await response.json();

        // Limpa a lista de notificações
        notificacoesList.innerHTML = '';

        // Adiciona cada notificação à lista
        notificacoes.forEach(notificacao => {
            const notificacaoItem = document.createElement('div');
            notificacaoItem.textContent = `${notificacao.mensagem} - ${new Date(notificacao.dataCriacao.toDate()).toLocaleString()}`;
            notificacoesList.appendChild(notificacaoItem);
        });

        // Atualiza o contador de notificações
        notificacoesCount.textContent = notificacoes.length;
        if (notificacoes.length > 0) {
            notificacoesCount.classList.remove('hidden');
        } else {
            notificacoesCount.classList.add('hidden');
        }
    };

    // Abre o modal e carrega as notificações
    notificacoesButton.addEventListener('click', (e) => {
        e.preventDefault();
        carregarNotificacoes();
        notificacoesModal.classList.remove('hidden');
    });

    // Fecha o modal
    closeButton.addEventListener('click', () => {
        notificacoesModal.classList.add('hidden');
    });

    // Fecha o modal ao clicar fora dele
    window.addEventListener('click', (event) => {
        if (event.target === notificacoesModal) {
            notificacoesModal.classList.add('hidden');
        }
    });
});