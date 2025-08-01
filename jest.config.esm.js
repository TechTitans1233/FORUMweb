// Configuração estendida do Jest para suporte a módulos ES
const config = {
  // Herda a configuração base
  ...require('./jest.unit.config.js'),
  
  // Configurações específicas para módulos ES
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(your-esm-dependencies)/)',
  ],
  extensionsToTreatAsEsm: ['.js'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
};

module.exports = config;
