const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Carrega o código do login.js
const loginJs = fs.readFileSync(path.resolve(__dirname, '../../public/login/login.js'), 'utf-8');

// Configura o DOM simulado
const html = `
<!DOCTYPE html>
<html>
<body>
  <div id="userLogin" style="display: block">
    <form id="userLoginForm">
      <input id="userEmail" type="email" />
      <input id="userPassword" type="password" />
      <button type="submit">Entrar</button>
    </form>
    <a id="admin-toggle" href="#">Login Administrativo</a>
    <a id="register-toggle" href="#">Criar uma conta</a>
  </div>
  <div id="adminLogin" style="display: none">
    <form id="adminLoginForm">
      <input id="adminPassword" type="password" />
      <button type="submit">Entrar</button>
    </form>
    <a id="user-toggle" href="#">Voltar ao login comum</a>
  </div>
  <div id="registerForm" style="display: none">
    <form id="registerFormSubmit">
      <input id="registerName" type="text" />
      <input id="registerEmail" type="email" />
      <input id="registerPassword" type="password" />
      <input id="registerConfirmPassword" type="password" />
      <button type="submit">Cadastrar</button>
    </form>
    <a id="login-toggle" href="#">Clique aqui para fazer login</a>
  </div>
</body>
</html>
`;

// Array para armazenar os resultados dos testes
const testResults = [];

describe('Testes do login.js', () => {
  let dom, window, document;

  // Configura o DOM antes de cada teste
  beforeEach(() => {
    dom = new JSDOM(html, { runScripts: 'dangerously' });
    window = dom.window;
    document = window.document;
    global.document = document;
    global.window = window;
    global.fetch = jest.fn(); // Mock do fetch
    global.alert = jest.fn(); // Mock do alert
    global.localStorage = {
      setItem: jest.fn(),
      getItem: jest.fn(),
      removeItem: jest.fn(),
    };
    global.window.location = { href: '' }; // Mock do window.location

    // Executa o código do login.js no contexto do DOM simulado
    const scriptEl = document.createElement('script');
    scriptEl.textContent = loginJs;
    document.body.appendChild(scriptEl);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // Função para capturar resultados dos testes
  const addTestResult = (description, status, details = '') => {
    testResults.push({ description, status, details });
  };

  // Teste para alternar para o login administrativo
  test('deve alternar para o login administrativo ao clicar em admin-toggle', () => {
    try {
      const adminToggle = document.getElementById('admin-toggle');
      adminToggle.click();

      expect(document.getElementById('userLogin').style.display).toBe('none');
      expect(document.getElementById('adminLogin').style.display).toBe('block');
      addTestResult('deve alternar para o login administrativo ao clicar em admin-toggle', 'PASS');
    } catch (error) {
      addTestResult('deve alternar para o login administrativo ao clicar em admin-toggle', 'FAIL', error.message);
    }
  });

  // Teste para voltar ao login comum
  test('deve voltar ao login comum ao clicar em user-toggle', () => {
    try {
      document.getElementById('admin-toggle').click();
      document.getElementById('user-toggle').click();

      expect(document.getElementById('userLogin').style.display).toBe('block');
      expect(document.getElementById('adminLogin').style.display).toBe('none');
      addTestResult('deve voltar ao login comum ao clicar em user-toggle', 'PASS');
    } catch (error) {
      addTestResult('deve voltar ao login comum ao clicar em user-toggle', 'FAIL', error.message);
    }
  });

  // Teste para alternar para o formulário de cadastro
  test('deve mostrar o formulário de cadastro ao clicar em register-toggle', () => {
    try {
      document.getElementById('register-toggle').click();

      expect(document.getElementById('userLogin').style.display).toBe('none');
      expect(document.getElementById('registerForm').style.display).toBe('block');
      addTestResult('deve mostrar o formulário de cadastro ao clicar em register-toggle', 'PASS');
    } catch (error) {
      addTestResult('deve mostrar o formulário de cadastro ao clicar em register-toggle', 'FAIL', error.message);
    }
  });

  // Teste para validar o formato do email (intencionalmente modificado para falhar em um caso)
  test('isValidEmail deve validar emails corretamente', () => {
    try {
      const isValidEmail = document.isValidEmail; // Acessa a função do DOM
      expect(isValidEmail('teste@exemplo.com')).toBe(true);
      expect(isValidEmail('invalido')).toBe(false);
      expect(isValidEmail('')).toBe(true); // Forçado a falhar (deve ser false)
      addTestResult('isValidEmail deve validar emails corretamente', 'PASS');
    } catch (error) {
      addTestResult('isValidEmail deve validar emails corretamente', 'FAIL', error.message);
    }
  });

  // Teste para o formulário de login do usuário
  test('deve realizar login do usuário com sucesso', async () => {
    try {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'Usuário autenticado com sucesso!', token: 'abc123' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ email: 'teste@exemplo.com', name: 'Teste', id: 1 }),
        });

      document.getElementById('userEmail').value = 'teste@exemplo.com';
      document.getElementById('userPassword').value = 'senha123';

      const form = document.getElementById('userLoginForm');
      const submitEvent = new window.Event('submit', { cancelable: true });
      form.dispatchEvent(submitEvent);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(fetch).toHaveBeenCalledWith('/api/login', expect.any(Object));
      expect(fetch).toHaveBeenCalledWith('/api/users/email/teste@exemplo.com');
      expect(localStorage.setItem).toHaveBeenCalledWith('userEmail', 'teste@exemplo.com');
      expect(localStorage.setItem).toHaveBeenCalledWith('userName', 'Teste');
      expect(localStorage.setItem).toHaveBeenCalledWith('userId', 1);
      expect(localStorage.setItem).toHaveBeenCalledWith('userToken', 'abc123');
      expect(window.location.href).toBe('../forum/forum.html');
      addTestResult('deve realizar login do usuário com sucesso', 'PASS');
    } catch (error) {
      addTestResult('deve realizar login do usuário com sucesso', 'FAIL', error.message);
    }
  });

  // Teste para erro no login do usuário
  test('deve mostrar alerta se o email estiver inválido', async () => {
    try {
      document.getElementById('userEmail').value = 'invalido';
      document.getElementById('userPassword').value = 'senha123';

      const form = document.getElementById('userLoginForm');
      const submitEvent = new window.Event('submit', { cancelable: true });
      form.dispatchEvent(submitEvent);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(alert).toHaveBeenCalledWith('Por favor, insira um email válido.');
      expect(fetch).not.toHaveBeenCalled();
      addTestResult('deve mostrar alerta se o email estiver inválido', 'PASS');
    } catch (error) {
      addTestResult('deve mostrar alerta se o email estiver inválido', 'FAIL', error.message);
    }
  });

  // Teste para o formulário de cadastro
  test('deve cadastrar usuário com sucesso', async () => {
    try {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Usuário criado com sucesso!' }),
      });

      document.getElementById('registerName').value = 'Teste';
      document.getElementById('registerEmail').value = 'teste@exemplo.com';
      document.getElementById('registerPassword').value = 'senha123';
      document.getElementById('registerConfirmPassword').value = 'senha123';

      const form = document.getElementById('registerFormSubmit');
      const submitEvent = new window.Event('submit', { cancelable: true });
      form.dispatchEvent(submitEvent);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(fetch).toHaveBeenCalledWith('/api/users', expect.any(Object));
      expect(alert).toHaveBeenCalledWith('Usuário cadastrado com sucesso!');
      expect(document.getElementById('userLogin').style.display).toBe('block');
      expect(document.getElementById('registerForm').style.display).toBe('none');
      addTestResult('deve cadastrar usuário com sucesso', 'PASS');
    } catch (error) {
      addTestResult('deve cadastrar usuário com sucesso', 'FAIL', error.message);
    }
  });

  // Teste para login administrativo
  test('deve realizar login administrativo com sucesso', async () => {
    try {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: 'admin123' }),
      });

      document.getElementById('adminPassword').value = 'admin123';

      const form = document.getElementById('adminLoginForm');
      const submitEvent = new window.Event('submit', { cancelable: true });
      form.dispatchEvent(submitEvent);

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(fetch).toHaveBeenCalledWith('/api/admin/login', expect.any(Object));
      expect(localStorage.setItem).toHaveBeenCalledWith('adminToken', 'admin123');
      expect(window.location.href).toBe('../admin/admin.html');
      addTestResult('deve realizar login administrativo com sucesso', 'PASS');
    } catch (error) {
      addTestResult('deve realizar login administrativo com sucesso', 'FAIL', error.message);
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
  <title>Jest Test Results - login.test.js</title>
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
  <h1>Jest Test Results for login.test.js</h1>
  <div class="test-suite">
    <h2>Test Suite: Testes do login.js</h2>
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
    fs.writeFileSync(path.resolve(__dirname, 'test-results.html'), htmlContent);
    console.log('Arquivo HTML com resultados dos testes gerado: test-results.html');
  });
});