// tests/E2E/forum-click-profile.cjs
module.exports = {
    'Fluxo: criar usuário, login, acessar fórum e clicar em Perfil': function (browser) {
      // URLs
      const loginUrl       = 'http://127.0.0.1:3000/login/login.html';
      const forumUrl       = 'http://127.0.0.1:3000/forum/forum.html';
      const perfilUrlPart  = '/perfil/perfil.html';
  
      // Gera dados únicos para cadastro
      const ts             = Date.now();
      const randomName     = `User${ts}`;
      const randomEmail    = `user${ts}@example.com`;
      const randomPassword = `Pass${ts}`;
  
      browser
        // 1) Abre a página de login
        .url(loginUrl)
        .waitForElementVisible('body', 1000)
        .assert.titleEquals('Login')
  
        // 2) Exibe o formulário de cadastro
        .click('#register-toggle')
        .pause(500)
        .assert.visible('#registerForm')
  
        // 3) Preenche e submete o cadastro
        .setValue('#registerName', randomName)
        .setValue('#registerEmail', randomEmail)
        .setValue('#registerPassword', randomPassword)
        .setValue('#registerConfirmPassword', randomPassword)
        .click('#registerFormSubmit button[type="submit"]')
        .pause(1000)
  
        // 4) Volta manualmente ao formulário de login
        .click('#login-toggle')
        .pause(500)
        .assert.visible('#userLogin')
  
        // 5) Faz login com o usuário recém-criado
        .setValue('#userEmail', randomEmail)
        .setValue('#userPassword', randomPassword)
        .click('#userLoginForm button[type="submit"]')
        .pause(1500)
  
        // 6) Navega para a página do fórum
        .url(forumUrl)
        .waitForElementVisible('body', 1000)
        .assert.urlContains('/forum/forum.html')
  
        // 7) Verifica que o botão “Perfil” está visível no menu lateral
        .assert.visible('aside#user-menu a.button[href="../perfil/perfil.html"]')
  
        // 8) Clica no botão “Perfil”
        .click('aside#user-menu a.button[href="../perfil/perfil.html"]')
        .pause(1000)
  
        // 9) Verifica que foi redirecionado para a URL de perfil
        .assert.urlContains(perfilUrlPart)
  
        // 10) Verifica elementos principais da página de perfil
        .assert.visible('header h1')
        .assert.containsText('header h1', 'Perfil do Usuário')
  
        // Verifica se o nome e email exibidos correspondem ao cadastro
        .assert.visible('#userNameDisplay')
        .assert.containsText('#userNameDisplay', randomName)
        .assert.visible('#userEMAIL')
        .assert.containsText('#userEMAIL', randomEmail)
  
        // Verifica presença dos botões “Editar Perfil” e “Deletar Conta”
        .assert.visible('#editProfileButton')
        .assert.visible('#deleteUser\\.\\ Button') // escape do espaço no id
  
        // 11) Encerra o teste
        .end();
    }
  };
  