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
      <div id="loginError" class="error-message"></div>
    </form>
    <a id="admin-toggle" href="#">Login Administrativo</a>
    <a id="register-toggle" href="#">Criar uma conta</a>
  </div>
  <div id="adminLogin" style="display: none">
    <form id="adminLoginForm">
      <input id="adminPassword" type="password" />
      <button type="submit">Entrar</button>
      <div id="adminError" class="error-message"></div>
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
      <div id="registerError" class="error-message"></div>
    </form>
    <a id="login-toggle" href="#">Clique aqui para fazer login</a>
  </div>
</body>
</html>
`;

describe('Testes do Módulo de Login', () => {
  let dom, window, document;
  const mockUser = {
    email: 'usuario@teste.com',
    password: 'Senha123!',
    name: 'Usuário Teste'
  };

  beforeEach(() => {
    // Configuração do DOM
    dom = new JSDOM(html, { runScripts: 'dangerously' });
    window = dom.window;
    document = window.document;
    
    // Mocks globais
    global.document = document;
    global.window = window;
    global.fetch = jest.fn();
    global.alert = jest.fn();
    global.localStorage = {
      setItem: jest.fn(),
      getItem: jest.fn(),
      removeItem: jest.fn(),
    };
    global.window.location = { 
      href: '',
      assign: jest.fn(),
      replace: jest.fn()
    };

    // Executa o código do login.js
    const scriptEl = document.createElement('script');
    scriptEl.textContent = loginJs;
    document.body.appendChild(scriptEl);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Testes para alternância entre formulários
  describe('Alternância entre formulários', () => {
    test('deve alternar para o login administrativo', () => {
      document.getElementById('admin-toggle').click();
      expect(document.getElementById('userLogin').style.display).toBe('none');
      expect(document.getElementById('adminLogin').style.display).toBe('block');
    });

    test('deve voltar ao login comum', () => {
      document.getElementById('admin-toggle').click();
      document.getElementById('user-toggle').click();
      expect(document.getElementById('userLogin').style.display).toBe('block');
      expect(document.getElementById('adminLogin').style.display).toBe('none');
    });
  });

  // Testes de validação de formulário
  describe('Validação de formulário de login', () => {
    test('deve exibir erro quando email estiver vazio', () => {
      const form = document.getElementById('userLoginForm');
      const submitEvent = new window.Event('submit');
      
      form.dispatchEvent(submitEvent);
      
      const errorElement = document.getElementById('loginError');
      expect(errorElement.textContent).toContain('Por favor, preencha todos os campos');
      expect(submitEvent.defaultPrevented).toBe(true);
    });

    test('deve exibir erro quando senha estiver vazia', () => {
      const form = document.getElementById('userLoginForm');
      const submitEvent = new window.Event('submit');
      
      document.getElementById('userEmail').value = 'teste@exemplo.com';
      form.dispatchEvent(submitEvent);
      
      const errorElement = document.getElementById('loginError');
      expect(errorElement.textContent).toContain('Por favor, preencha todos os campos');
      expect(submitEvent.defaultPrevented).toBe(true);
    });
  });

  // Testes de autenticação
  describe('Autenticação de usuário', () => {
    test('deve fazer login com sucesso', async () => {
      // Mock da resposta da API
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'fake-jwt-token',
          user: { id: '1', email: mockUser.email, name: mockUser.name }
        })
      });

      // Preenche e submete o formulário
      document.getElementById('userEmail').value = mockUser.email;
      document.getElementById('userPassword').value = mockUser.password;
      
      const form = document.getElementById('userLoginForm');
      const submitEvent = new window.Event('submit');
      await form.dispatchEvent(submitEvent);

      // Verificações
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/login'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: mockUser.email,
            password: mockUser.password
          })
        })
      );
      
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'fake-jwt-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('user', expect.any(String));
      expect(window.location.href).toContain('forum.html');
    });

    test('deve exibir mensagem de erro quando as credenciais forem inválidas', async () => {
      // Mock de erro de autenticação
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          message: 'Credenciais inválidas'
        })
      });

      // Preenche e submete o formulário
      document.getElementById('userEmail').value = 'email@invalido.com';
      document.getElementById('userPassword').value = 'senhainvalida';
      
      const form = document.getElementById('userLoginForm');
      const submitEvent = new window.Event('submit');
      await form.dispatchEvent(submitEvent);

      // Verifica se a mensagem de erro é exibida
      const errorElement = document.getElementById('loginError');
      expect(errorElement.textContent).toContain('Credenciais inválidas');
    });
  });

  // Testes de registro de usuário
  describe('Registro de usuário', () => {
    test('deve validar confirmação de senha', () => {
      document.getElementById('registerPassword').value = 'senha123';
      document.getElementById('registerConfirmPassword').value = 'senha456';
      
      const form = document.getElementById('registerFormSubmit');
      const submitEvent = new window.Event('submit');
      form.dispatchEvent(submitEvent);
      
      const errorElement = document.getElementById('registerError');
      expect(errorElement.textContent).toContain('As senhas não conferem');
      expect(submitEvent.defaultPrevented).toBe(true);
    });

    test('deve registrar um novo usuário com sucesso', async () => {
      // Mock da resposta da API
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'new-user-123',
          email: mockUser.email,
          name: mockUser.name
        })
      });

      // Preenche o formulário de registro
      document.getElementById('registerName').value = mockUser.name;
      document.getElementById('registerEmail').value = mockUser.email;
      document.getElementById('registerPassword').value = mockUser.password;
      document.getElementById('registerConfirmPassword').value = mockUser.password;
      
      const form = document.getElementById('registerFormSubmit');
      const submitEvent = new window.Event('submit');
      await form.dispatchEvent(submitEvent);

      // Verifica se a requisição foi feita corretamente
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/register'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: mockUser.name,
            email: mockUser.email,
            password: mockUser.password
          })
        })
      );

      // Verifica se o usuário foi redirecionado após o registro
      expect(window.location.href).toContain('login.html?registered=true');
    });
  });

  // Testes de login administrativo
  describe('Login Administrativo', () => {
    test('deve fazer login administrativo com sucesso', async () => {
      // Mock da resposta da API
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'admin-jwt-token',
          isAdmin: true
        })
      });

      // Preenche e submete o formulário administrativo
      document.getElementById('adminPassword').value = 'senha-admin';
      
      const form = document.getElementById('adminLoginForm');
      const submitEvent = new window.Event('submit');
      await form.dispatchEvent(submitEvent);

      // Verificações
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/login'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: 'senha-admin'
          })
        })
      );
      
      expect(localStorage.setItem).toHaveBeenCalledWith('adminToken', 'admin-jwt-token');
      expect(window.location.href).toContain('admin/dashboard.html');
    });
  });
});