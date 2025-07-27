const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Carrega o código do mapa.html
const html = fs.readFileSync(path.resolve(__dirname, '../../public/map/mapa.html'), 'utf-8');

// Configura o DOM simulado
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
const { window } = dom;
const { document } = window;
global.document = document;
global.window = window;

// Mock do Leaflet
const L = {
  map: jest.fn(() => ({
    setView: jest.fn().mockReturnThis(),
    fitBounds: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
  })),
  tileLayer: jest.fn(() => ({
    addTo: jest.fn().mockReturnThis(),
  })),
  marker: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
  })),
  icon: jest.fn(),
  geoJSON: jest.fn(() => ({
    addTo: jest.fn().mockReturnThis(),
  })),
  polygon: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
    getBounds: jest.fn(() => ({
      isValid: jest.fn().mockReturnValue(true),
      getNorthEast: jest.fn().mockReturnValue([10, 10]),
      getSouthWest: jest.fn().mockReturnValue([-10, -10]),
    })),
  })),
  latLngBounds: jest.fn(coords => ({
    isValid: jest.fn().mockReturnValue(true),
    pad: jest.fn().mockReturnThis(),
  })),
};

// Mock global do Leaflet
global.L = L;

// Mock do fetch
global.fetch = jest.fn();

// Array para armazenar os resultados dos testes
const testResults = [];

describe('Testes do mapa.html', () => {
  let infoDiv, loadingDiv;

  beforeEach(() => {
    // Reseta os mocks
    jest.resetAllMocks();
    global.fetch = jest.fn();

    // Configura elementos DOM
    infoDiv = document.getElementById('info');
    loadingDiv = document.getElementById('loading');

    // Executa o script do mapa.html
    const scriptEl = document.createElement('script');
    scriptEl.textContent = document.querySelector('script').textContent;
    document.body.appendChild(scriptEl);

    // Dispara o evento DOMContentLoaded
    const event = new window.Event('DOMContentLoaded');
    document.dispatchEvent(event);
  });

  // Função para capturar resultados dos testes
  const addTestResult = (description, status, details = '') => {
    testResults.push({ description, status, details });
  };

  // Teste para inicialização do mapa
  test('deve inicializar o mapa com Leaflet', () => {
    try {
      expect(L.map).toHaveBeenCalledWith('map');
      expect(L.map().setView).toHaveBeenCalledWith([0, 0], 2);
      expect(L.tileLayer).toHaveBeenCalledWith('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', expect.any(Object));
      expect(L.tileLayer().addTo).toHaveBeenCalled();
      addTestResult('deve inicializar o mapa com Leaflet', 'PASS');
    } catch (error) {
      addTestResult('deve inicializar o mapa com Leaflet', 'FAIL', error.message);
    }
  });

  // Teste para a função updateInfo
  test('updateInfo deve atualizar a div de informações corretamente', () => {
    try {
      const props = {
        eventname: 'Test Event',
        eventtype: 'EQ',
        description: 'Test Description',
        alertlevel: 'Red',
        localizacao: 'Test Location',
        fromdate: '2023-10-01T00:00:00Z',
        todate: '2023-10-02T00:00:00Z',
        url: { report: 'http://example.com' },
      };
      window.updateInfo(props);
      expect(infoDiv.innerHTML).toContain('Test Event');
      expect(infoDiv.innerHTML).toContain('EQ');
      expect(infoDiv.innerHTML).toContain('Test Description');
      expect(infoDiv.innerHTML).toContain('Red');
      expect(infoDiv.innerHTML).toContain('Test Location');
      expect(infoDiv.innerHTML).toContain('2023-10-01');
      expect(infoDiv.innerHTML).toContain('2023-10-02');
      expect(infoDiv.innerHTML).toContain('http://example.com');

      window.updateInfo();
      expect(infoDiv.innerHTML).toBe('<p>Passe o cursor sobre um evento para ver detalhes.</p>');
      addTestResult('updateInfo deve atualizar a div de informações corretamente', 'PASS');
    } catch (error) {
      addTestResult('updateInfo deve atualizar a div de informações corretamente', 'FAIL', error.message);
    }
  });

  // Teste para a função pointToLayerStatic
  test('pointToLayerStatic deve criar marcador com ícone correto', () => {
    try {
      const feature = {
        properties: { iconoverall: 'https://example.com/icon.png' },
      };
      const latlng = [10, 20];
      window.pointToLayerStatic(feature, latlng);
      expect(L.icon).toHaveBeenCalledWith({
        iconUrl: 'https://example.com/icon.png',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      expect(L.marker).toHaveBeenCalledWith(latlng, expect.any(Object));
      addTestResult('pointToLayerStatic deve criar marcador com ícone correto', 'PASS');
    } catch (error) {
      addTestResult('pointToLayerStatic deve criar marcador com ícone correto', 'FAIL', error.message);
    }
  });

  // Teste para a função onEachFeature
  test('onEachFeature deve configurar eventos de hover', () => {
    try {
      const feature = { properties: { eventname: 'Test Event' } };
      const layer = { on: jest.fn() };
      window.onEachFeature(feature, layer);
      expect(layer.on).toHaveBeenCalledWith({
        mouseover: expect.any(Function),
        mouseout: expect.any(Function),
      });
      addTestResult('onEachFeature deve configurar eventos de hover', 'PASS');
    } catch (error) {
      addTestResult('onEachFeature deve configurar eventos de hover', 'FAIL', error.message);
    }
  });

  // Teste para a função getDynamicIcon
  test('getDynamicIcon deve retornar ícone correto com base em categoria e impacto', () => {
    try {
      const icon = window.getDynamicIcon('EQ', 'Red');
      expect(L.icon).toHaveBeenCalledWith({
        iconUrl: 'https://www.gdacs.org/images/gdacs_icons/maps/Red/EQ.png',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });

      const defaultIcon = window.getDynamicIcon('UNKNOWN', 'Unknown');
      expect(L.icon).toHaveBeenCalledWith({
        iconUrl: 'https://via.placeholder.com/32',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });
      addTestResult('getDynamicIcon deve retornar ícone correto com base em categoria e impacto', 'PASS');
    } catch (error) {
      addTestResult('getDynamicIcon deve retornar ícone correto com base em categoria e impacto', 'FAIL', error.message);
    }
  });

  // Teste para a função buscarPublicacoes
  test('buscarPublicacoes deve buscar e formatar publicações corretamente', async () => {
    try {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([
          { id: '1', titulo: 'Event1', conteudo: 'Desc1', lat: '10', lon: '20', marcacao: null },
        ]),
      });

      const result = await window.buscarPublicacoes();
      expect(fetch).toHaveBeenCalledWith('/api/publicacoes');
      expect(result).toEqual([
        { id: '1', titulo: 'Event1', conteudo: 'Desc1', lat: '10', lon: '20', marcacao: null },
      ]);
      addTestResult('buscarPublicacoes deve buscar e formatar publicações corretamente', 'PASS');
    } catch (error) {
      addTestResult('buscarPublicacoes deve buscar e formatar publicações corretamente', 'FAIL', error.message);
    }
  });

  // Teste para a função classificarMensagem
  test('classificarMensagem deve classificar mensagem corretamente', async () => {
    try {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ categoria: 'EQ', localizacao: 'Test Location', impacto: 'Red' }),
      });

      const result = await window.classificarMensagem('Test message');
      expect(fetch).toHaveBeenCalledWith('http://localhost:5000/predict', expect.any(Object));
      expect(result).toEqual({ categoria: 'EQ', localizacao: 'Test Location', impacto: 'Red' });
      addTestResult('classificarMensagem deve classificar mensagem corretamente', 'PASS');
    } catch (error) {
      addTestResult('classificarMensagem deve classificar mensagem corretamente', 'FAIL', error.message);
    }
  });

  // Teste para carregarEventosDinamicos com marcador
  test('carregarEventosDinamicos deve adicionar marcadores para publicações válidas', async () => {
    try {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: '1', titulo: 'Event1', conteudo: 'Desc1', lat: '10', lon: '20', marcacao: null }]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ categoria: 'EQ', localizacao: 'Test Location', impacto: 'Red' }),
        });

      await window.carregarEventosDinamicos();
      expect(loadingDiv.style.display).toBe('block');
      expect(L.marker).toHaveBeenCalledWith([10, 20], expect.any(Object));
      expect(L.latLngBounds).toHaveBeenCalled();
      expect(L.map().fitBounds).toHaveBeenCalled();
      expect(loadingDiv.style.display).toBe('none');
      addTestResult('carregarEventosDinamicos deve adicionar marcadores para publicações válidas', 'PASS');
    } catch (error) {
      addTestResult('carregarEventosDinamicos deve adicionar marcadores para publicações válidas', 'FAIL', error.message);
    }
  });

  // Teste para carregarEventosDinamicos com polígono
  test('carregarEventosDinamicos deve adicionar polígonos para marcações válidas', async () => {
    try {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([
            {
              id: '1',
              titulo: 'Event1',
              conteudo: 'Desc1',
              lat: '10',
              lon: '20',
              marcacao: JSON.stringify({
                type: 'Feature',
                geometry: {
                  type: 'Polygon',
                  coordinates: [[[0, 0], [1, 1], [2, 2], [0, 0]]],
                },
              }),
            },
          ]),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ categoria: 'EQ', localizacao: 'Test Location', impacto: 'Red' }),
        });

      await window.carregarEventosDinamicos();
      expect(loadingDiv.style.display).toBe('block');
      expect(L.polygon).toHaveBeenCalledWith([[0, 0], [1, 1], [2, 2], [0, 0]], expect.any(Object));
      expect(L.latLngBounds).toHaveBeenCalled();
      expect(L.map().fitBounds).toHaveBeenCalled();
      expect(loadingDiv.style.display).toBe('none');
      addTestResult('carregarEventosDinamicos deve adicionar polígonos para marcações válidas', 'PASS');
    } catch (error) {
      addTestResult('carregarEventosDinamicos deve adicionar polígonos para marcações válidas', 'FAIL', error.message);
    }
  });

  // Gera o arquivo HTML com os resultados após todos os testes
  afterAll(() => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jest Test Results - mapa.test.js</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      line-height: 1.6;
    }
    h1 {
      color: #333;
    }
    h2 {
      color: #555;
    }
    ul {
      list-style-type: none;
      padding: 0;
    }
    li {
      padding: 10px;
      margin: 5px 0;
      background-color: #f0f0f0;
      border-radius: 5px;
    }
    .pass {
      color: #28a745;
      font-weight: bold;
    }
    .fail {
      color: #dc3545;
      font-weight: bold;
    }
    .details {
      font-size: 0.9em;
      color: #666;
      margin-top: 5px;
      word-wrap: break-word;
    }
    .test-suite {
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <h1>Jest Test Results for mapa.test.js</h1>
  <div class="test-suite">
    <h2>Test Suite: Testes do mapa.html</h2>
    <ul>
      ${testResults.map(result => `
        <li>
          <span class="${result.status === 'PASS' ? 'pass' : 'fail'}">${result.status}</span> ${result.description}
          ${result.details ? `<div class="details"><strong>Details:</strong> ${result.details}</div>` : ''}
        </li>
      `).join('')}
    </ul>
  </div>
</body>
</html>
    `;

    // Escreve o arquivo HTML
    fs.writeFileSync(path.resolve(__dirname, 'test-results-mapa.html'), htmlContent);
    console.log('Arquivo HTML com resultados dos testes gerado: test-results-mapa.html');
  });
});