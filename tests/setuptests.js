// Mock do localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

// Adiciona o mock do localStorage ao objeto global
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock do fetch global
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock do alert global
global.alert = jest.fn();

// Mock para módulos CSS
jest.mock('identity-obj-proxy', () => ({
  __esModule: true,
  default: new Proxy(
    {},
    {
      get: function (target, property) {
        return property;
      },
    }
  ),
}));

// Limpar todos os mocks entre os testes
afterEach(() => {
  jest.clearAllMocks();
  // Limpa o localStorage mockado
  localStorageMock.clear();
});

// Configuração global para os testes
global.matchMedia = global.matchMedia || function() {
  return {
    matches: false,
    addListener: jest.fn(),
    removeListener: jest.fn(),
  };
};

// Adiciona o objeto window para testes
global.window = Object.create(window);
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost/',
    assign: jest.fn(),
    replace: jest.fn(),
  },
  writable: true,
});