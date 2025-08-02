// GEOCODIFICACAO
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


// LOGOUT 
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