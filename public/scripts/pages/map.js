let mainMap, drawnItems, drawControl;

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