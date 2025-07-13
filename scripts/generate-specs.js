// scripts/generate-specs.js
const glob = require('glob');
const fs   = require('fs');
const path = require('path');

const SRC_GLOBS = [
  'server.js',
  'public/**/*.js'
];

SRC_GLOBS.forEach(pattern => {
  const files = glob.sync(pattern);   // <–– glob.sync retorna um array de paths
  files.forEach(srcPath => {
    // o resto do seu código permanece igual
    const rel     = path.relative('.', srcPath);
    const name    = rel.replace(/[\/\\]/g, '_').replace(/\.js$/, '');
    const testDir = path.join('test');
    const specFile= path.join(testDir, `${name}.spec.js`);
    if (fs.existsSync(specFile)) return;
    fs.mkdirSync(testDir, { recursive: true });
    const importPath = path.relative(testDir, srcPath).replace(/\\/g, '/');
    const content = `/**
 * Teste gerado automaticamente para \`${rel}\`
 */
const mod = require('../${importPath}');

describe('${path.basename(srcPath)}', () => {
  test('deve exportar algo definido', () => {
    expect(mod).toBeDefined();
  });
});
`;
    fs.writeFileSync(specFile, content, 'utf8');
    console.log(`Criado: ${specFile}`);
  });
});
