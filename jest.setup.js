// Configurações globais para os testes
import { TextEncoder, TextDecoder } from 'util';

// Polyfill para o setImmediate
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (callback) => {
    return setTimeout(callback, 0);
  };
}

// Polyfill para TextEncoder e TextDecoder
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock do localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

global.localStorage = localStorageMock;

// Mock do fetch
global.fetch = jest.fn();

// Mock do alert
global.alert = jest.fn();

// Mock do window.location
const mockLocation = new URL('http://localhost');
Object.defineProperty(window, 'location', {
  value: {
    ...mockLocation,
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    href: 'http://localhost',
  },
  writable: true,
});

// Mock do console para evitar poluição nos logs de teste
const originalConsole = { ...console };
global.console = {
  ...originalConsole,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Limpar todos os mocks antes de cada teste
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  document.body.innerHTML = '';
});
