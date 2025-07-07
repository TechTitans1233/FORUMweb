// tests/E2E/admin-with-dashboard.cjs
module.exports = {
    'Login administrativo e validação da página de administração': function (browser) {
      const loginUrl      = 'http://127.0.0.1:3000/login/login.html';
      const adminPassword = 'suaSenhaAdministrativa';
      // Supondo que o HTML de admin esteja em:
      const adminUrlPart  = 'http://127.0.0.1:3000/admin/admin.html';
  
      browser
        // 1) Abre a página de login
        .url(loginUrl)
        .waitForElementVisible('body', 1000)
        .assert.titleEquals('Login')
  
        // 2) Verifica estado inicial (apenas form de usuário)
        .assert.visible('#userLogin')
        .assert.hidden('#adminLogin')
        .assert.hidden('#registerForm')
  
        // 3) Alterna para o formulário administrativo
        .click('#admin-toggle')
        .pause(500)
        .assert.hidden('#userLogin')
        .assert.visible('#adminLogin')
        .assert.hidden('#registerForm')
  
        // 4) Preenche a senha administrativa e envia
        .setValue('#adminPassword', adminPassword)
        .click('#adminLoginForm button[type="submit"]')
        .acceptAlert()
        .pause(1500)
  
        // 5) Verifica que houve redirecionamento para a página de administração
        .assert.urlContains(adminUrlPart)
  
        // 6) A partir do HTML fornecido, checa os principais elementos:
        // (a) Header principal
        .assert.visible('header h1')
        .assert.containsText('header h1', 'Administração')
        .assert.visible('header h2')
        .assert.containsText('header h2', 'Disaster Warning System')
  
        // (b) Seção “Gerenciar Usuários”
        .assert.visible('section:nth-of-type(1) h2')
        .assert.containsText('section:nth-of-type(1) h2', 'Gerenciar Usuários')
  
        // – Campo de busca de usuários
        .assert.visible('#search-users')
        .assert.attributeEquals('#search-users', 'placeholder', 'Pesquisar usuários...')
  
        // – Tabela de usuários (#users-table)
        .assert.visible('#users-table')
        .assert.elementPresent('#users-table thead tr th:nth-child(1)')
        .assert.containsText('#users-table thead tr th:nth-child(1)', 'ID')
        .assert.containsText('#users-table thead tr th:nth-child(2)', 'Nome')
        .assert.containsText('#users-table thead tr th:nth-child(3)', 'Email')
        // – Botões de ação em “Gerenciar Usuários”
        .assert.visible('section:nth-of-type(1) .action-buttons button:nth-child(1)')
        .assert.containsText('section:nth-of-type(1) .action-buttons button:nth-child(1)', 'Editar Selecionado')
        .assert.visible('section:nth-of-type(1) .action-buttons button:nth-child(2)')
        .assert.containsText('section:nth-of-type(1) .action-buttons button:nth-child(2)', 'Excluir Selecionado')
        .assert.visible('section:nth-of-type(1) button[onclick*="selectAllRows(\'users-table\')"]')
        .assert.containsText('section:nth-of-type(1) button[onclick*="selectAllRows(\'users-table\')"]', 'Selecionar Todos (Usuários)')
  
        // (c) Seção “Gerenciar Publicações”
        .assert.visible('section:nth-of-type(2) h2')
        .assert.containsText('section:nth-of-type(2) h2', 'Gerenciar Publicações')
  
        // – Campo de busca de publicações
        .assert.visible('#search-posts')
        .assert.attributeEquals('#search-posts', 'placeholder', 'Pesquisar publicações...')
  
        // – Tabela de publicações (#posts-table)
        .assert.visible('#posts-table')
        .assert.elementPresent('#posts-table thead tr th:nth-child(1)')
        .assert.containsText('#posts-table thead tr th:nth-child(1)', 'ID')
        .assert.containsText('#posts-table thead tr th:nth-child(2)', 'Título')
        .assert.containsText('#posts-table thead tr th:nth-child(3)', 'Conteúdo')
        // – Botões de ação em “Gerenciar Publicações”
        .assert.visible('section:nth-of-type(2) .action-buttons button:nth-child(1)')
        .assert.containsText('section:nth-of-type(2) .action-buttons button:nth-child(1)', 'Editar Selecionado')
        .assert.visible('section:nth-of-type(2) .action-buttons button:nth-child(2)')
        .assert.containsText('section:nth-of-type(2) .action-buttons button:nth-child(2)', 'Excluir Selecionado')
        .assert.visible('section:nth-of-type(2) button[onclick*="selectAllRows(\'posts-table\')"]')
        .assert.containsText('section:nth-of-type(2) button[onclick*="selectAllRows(\'posts-table\')"]', 'Selecionar Todos (Publicações)')
  
        // 7) Finaliza o teste
        .end();
    }
  };
  