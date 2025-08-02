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

const publicarButton = document.getElementById('publicar');
if (publicarButton) {
    publicarButton.addEventListener('click', async (e) => {
        e.preventDefault();

        const titulo = document.querySelector('#titulo').value.trim();
        const conteudo = document.querySelector('#conteudo').value.trim();
        const endereco = document.querySelector('#endereco').value.trim();
        const feedbackElement = document.getElementById('feedback');
        const imageInput = document.querySelector('#image');

        let imageUrl = null;

        if (!titulo || !conteudo || !endereco) {
            feedbackElement.textContent = 'Por favor, preencha todos os campos.';
            feedbackElement.style.color = 'red';
            return;
        }

        if (imageInput && imageInput.files.length > 0) {
            const imageFile = imageInput.files[0];
            const formData = new FormData();
            formData.append('image', imageFile);

            try {
                const imagemResponse = await fetch('/api/images/upload', {
                    method: 'POST',
                    body: formData
                });

                const imagemData = await imagemResponse.json();
                if (imagemResponse.ok) {
                    imageUrl = imagemData.signedUrl;
                } else {
                    feedbackElement.textContent = imagemData.message || 'Erro ao enviar imagem.';
                    feedbackElement.style.color = 'red';
                    return;
                }
            } catch (error) {
                console.error("Erro ao enviar imagem:", error);
                feedbackElement.textContent = 'Erro de rede ao enviar imagem.';
                feedbackElement.style.color = 'red';
                return;
            }
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
            imageUrl
        };

        if (publicarButton.dataset.shape) {
            postData.marcacao = publicarButton.dataset.shape;
        }

        try {
            const response = await fetch('/api/publicacoes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
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
        carregarPublicacoes();
    });
} else {
    console.warn('Elemento #publicar não encontrado. Funcionalidade de publicação desabilitada.');
}


async function carregarPublicacoes() {
    try {
        const response = await fetch('/api/publicacoes');
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
            const isLikedByMe = post.isLikedByMe
            const buttonText = isLikedByMe ? `Descurtir <span class="curtidas-count">${post.curtidas || 0}</span>` : `Curtir <span class="curtidas-count">${post.curtidas || 0}</span>`;
            const buttonClass = isLikedByMe ? 'curtir curtido-por-mim' : 'curtir';

            publicationHTML.innerHTML = `
                <div class="cabecalho">
                    <img src="https://www.gravatar.com/avatar/?d=mp&s=128" alt="Usuário Desconhecido" class="foto-usuario">
                    <div class="info-usuario">
                        <span class="nome-usuario">${post.usuario}</span> <span class="tempo-postagem">${new Date(post.dataCriacao).toLocaleString()}</span>
                    </div>
                </div>
                <div class="titulo-publicacao">${post.titulo}</div>
                <div class="conteudo-publicacao">${post.conteudo}</div>

                ${post.imageUrl ? `
                    <div class="imagem-publicacao">
                        <img src="${post.imageUrl}" alt="Imagem da publicação" class="imagem-postagem" />
                    </div>
                ` : ''}

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

            // Carregar comentários para a publicação
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