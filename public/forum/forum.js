// Função para alternar visibilidade do formulário e mapa
document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('toggle-new-post-content');
    const newPostContent = document.querySelector('.new-post-content');
    const mapContainer = document.getElementById('map');

    toggleButton.addEventListener('click', () => {
        if (newPostContent.classList.contains('hidden')) {
            newPostContent.classList.remove('hidden');
            mapContainer.classList.remove('hidden');
            toggleButton.textContent = 'Ocultar';
        } else {
            newPostContent.classList.add('hidden');
            mapContainer.classList.add('hidden');
            toggleButton.textContent = 'Exibir';
        }
    });
});

// Configuração inicial do mapa principal
const mainMap = L.map('map').setView([-23.55052, -46.633308], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(mainMap);

// Grupo de camadas para os desenhos no mapa principal
const drawnItems = new L.FeatureGroup();
mainMap.addLayer(drawnItems);

// Controles de desenho no mapa principal
const drawControl = new L.Control.Draw({
    edit: { featureGroup: drawnItems },
    draw: {
        polygon: true,
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false
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
    const marcacao = JSON.parse(document.getElementById('publicar').dataset.shape || null);

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
            fetch('/api/publicacoes', {
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
                    marcacao
                })
            })
            .then(response => response.json())
            .then(data => {
                // Criar a publicação e adicionar no HTML
                const publicationHTML = document.createElement('section');
                publicationHTML.innerHTML = `
                    <section class="publication-wrapper">
                        <div class="publication-content">
                            <section class="user-section">
                                <div class="user-avatar">
                                    <img src="profile-picture.jpg" alt="Foto do Usuário">
                                </div>
                                <div class="user-details-container">
                                    <div class="publication-metadata">
                                        <p><b>Usuário:</b> Desconhecido</p>
                                        <p><b>Data:</b> ${new Date().toLocaleString()}</p>
                                    </div>
                                    <div class="info-content">
                                        <h3>Informações</h3>
                                        <h2>${titulo}</h2>
                                        <p>${conteudo}</p>
                                        <p><b>Endereço:</b> ${endereco}</p>
                                    </div>
                                </div>
                            </section>
                            <div class="location-section">
                                <h3>Mapa</h3>
                                <div id="map-${titulo.replace(/\s+/g, '-').toLowerCase()}" class="map-box" style="height: 200px;"></div>
                            </div>
                        </div>
                    </section>`;

                const publicationsContainer = document.querySelector('#publications');
                publicationsContainer.appendChild(publicationHTML);

                // Criar o mapa para a nova publicação
                const newMapId = `map-${titulo.replace(/\s+/g, '-').toLowerCase()}`;
                const newMap = L.map(newMapId).setView([lat, lon], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors'
                }).addTo(newMap);

                L.marker([lat, lon]).addTo(newMap).bindPopup(`<b>${titulo}</b><br>${endereco}`).openPopup();

                if (marcacao) {
                    L.geoJSON(marcacao).addTo(newMap);
                }

                document.getElementById('feedback').textContent = 'Publicação realizada com sucesso!';
            })
            .catch(error => {
                console.error("Erro ao enviar a publicação:", error);
                document.getElementById('feedback').textContent = 'Erro ao publicar.';
            });
        })
        .catch(error => {
            console.error("Erro ao geocodificar o endereço:", error);
            document.getElementById('feedback').textContent = 'Erro ao geocodificar o endereço.';
        });
});

// Exibir publicações já existentes (carregar do backend)
document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/publicacoes')
        .then(response => response.json())
        .then(publicacoes => {
            publicacoes.forEach(post => {
                const publicationHTML = document.createElement('section');
                publicationHTML.innerHTML = `
                    <section class="publication-wrapper">
                        <div class="publication-content">
                            <section class="user-section">
                                <div class="user-avatar">
                                    <img src="profile-picture.jpg" alt="Foto do Usuário">
                                </div>
                                <div class="user-details-container">
                                    <div class="publication-metadata">
                                        <p><b>Usuário:</b> Desconhecido</p>
                                        <p><b>Data:</b> ${new Date().toLocaleString()}</p>
                                    </div>
                                    <div class="info-content">
                                        <h3>Informações</h3>
                                        <h2>${post.titulo}</h2>
                                        <p>${post.conteudo}</p>
                                        <p><b>Endereço:</b> ${post.endereco}</p>
                                    </div>
                                </div>
                            </section>
                            <div class="location-section">
                                <h3>Mapa</h3>
                                <div id="map-${post.id}" class="map-box" style="height: 200px;"></div>
                            </div>
                        </div>
                    </section>`;

                const publicationsContainer = document.querySelector('#publications');
                publicationsContainer.appendChild(publicationHTML);

                // Criar o mapa para a publicação
                const newMap = L.map(`map-${post.id}`).setView([post.lat, post.lon], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors'
                }).addTo(newMap);

                L.marker([post.lat, post.lon]).addTo(newMap).bindPopup(`<b>${post.titulo}</b><br>${post.endereco}`).openPopup();

                if (post.shape) {
                    L.geoJSON(post.shape).addTo(newMap);
                }
            });
        })
        .catch(error => console.error('Erro ao carregar publicações:', error));
});
