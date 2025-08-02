// tests/E2E/forum.cjs
module.exports = {
    'Fluxo: criar usuário, login, publicar no fórum, curtir, comentar, buscar usuário e logout': function (browser) {
      // URLs das páginas
      const loginUrl    = 'https://127.0.0.1:3000/login/';
      const forumUrl    = 'https://127.0.0.1:3000/forum/';
  
      // Gera dados de usuário únicos
      const ts             = Date.now();
      const randomName     = `User${ts}`;
      const randomEmail    = `user${ts}@example.com`;
      const randomPassword = `Pass${ts}`;
  
      // Dados da publicação
      const postTitle      = `Título ${ts}`;
      const postContent    = `Conteúdo de teste ${ts}`;
      const postAddress    = `Endereço ${ts}`;
  
      browser
        // 1) Abre a página de login
        .url(loginUrl)
        .waitForElementVisible('body', 1000)
        .assert.titleEquals('Login')
  
        // 2) Abre formulário de cadastro
        .click('#register-toggle')
        .pause(500)
        .assert.visible('#registerForm')
  
        // 3) Preenche formulário de cadastro e envia
        .setValue('#registerName', randomName)
        .setValue('#registerEmail', randomEmail)
        .setValue('#registerPassword', randomPassword)
        .setValue('#registerConfirmPassword', randomPassword)
        .click('#registerFormSubmit button[type="submit"]')
        .pause(1000)
  
        // 4) Verifica que voltou ao formulário de login de usuário
        .assert.visible('#userLogin')
  
        // 5) Faz login com o usuário recém-cadastrado
        .setValue('#userEmail', randomEmail)
        .setValue('#userPassword', randomPassword)
        .click('#userLoginForm button[type="submit"]')
        .pause(1500)
  
        // 6) Navega para a página do fórum
        .url(forumUrl)
        .waitForElementVisible('body', 1000)
        .assert.urlContains('/forum/forum.html')
  
        // 7) Exibe o formulário de nova publicação
        .assert.visible('#toggle-visibility')
        .click('#toggle-visibility')
        .pause(500)
        .assert.visible('#publicacao-form')
  
        // 8) Preenche e submete a nova publicação
        .setValue('#titulo', postTitle)
        .setValue('#conteudo', postContent)
        .setValue('#endereco', postAddress)
        .click('#publicar')
        .pause(1500)
  
        // 9) Verifica que a publicação apareceu no feed
        //    (assume-se que cada nova publicação seja inserida em #publications
        //     dentro de um elemento que contenha o título exato)
        .assert.containsText('#publications', postTitle)
  
        // 10) Encontra o container da publicação recém-criada e interage com ela
        //     (assumindo que cada post fique num elemento com a classe .post e,
        //     dentro dele, haja botões para curtir e comentar com classes conhecidas)
  
        // Seleciona o primeiro .post que contenha o título
        .useXpath()
        .waitForElementVisible(`//div[@id="publications"]//div[contains(@class, "post") and .//h3[text()="${postTitle}"]]`, 2000)
        .click(`//div[@id="publications"]//div[contains(@class, "post") and .//h3[text()="${postTitle}"]]//button[contains(@class, "like-button")]`)
        .pause(500)
  
        // 11) Verifica que o contador de curtidas aumentou
        //     (assume-se que exista um elemento .like-count dentro do post que mudou para “1”)
        .assert.containsText(
          `//div[@id="publications"]//div[contains(@class, "post") and .//h3[text()="${postTitle}"]]//span[contains(@class, "like-count")]`,
          '1'
        )
  
        // 12) Adiciona um comentário à própria publicação
        .setValue(
          `//div[@id="publications"]//div[contains(@class, "post") and .//h3[text()="${postTitle}"]]//input[contains(@class, "comment-input")]`,
          'Comentário de teste'
        )
        .click(`//div[@id="publications"]//div[contains(@class, "post") and .//h3[text()="${postTitle}"]]//button[contains(@class, "comment-button")]`)
        .pause(500)
  
        // 13) Verifica que o comentário apareceu
        .assert.containsText(
          `//div[@id="publications"]//div[contains(@class, "post") and .//h3[text()="${postTitle}"]]//div[contains(@class, "comments")]`,
          'Comentário de teste'
        )
  
        // Volta para CSS selectors
        .useCss()
  
        // 14) Faz busca por usuários no painel lateral
        .assert.visible('#searchInput')
        .setValue('#searchInput', randomName)
        .pause(1000)
        // Assume-se que o resultado apareça em #usuariosEncontrados como um <div> contendo o nome
        .assert.containsText('#usuariosEncontrados', randomName)
  
        // 15) Clica no botão “Mostrar mais usuários” (se visível)
        .assert.visible('#btnOcultar')
        .click('#btnOcultar')
        .pause(500)
  
        // 16) Clica no botão “Sair” para finalizar a sessão
        .assert.visible('#logoutButton')
        .click('#logoutButton')
        .pause(1000)
  
        // 17) Verifica que foi redirecionado de volta ao login
        .assert.urlContains('/login/login.html')
  
        // 18) Encerra o navegador
        .end();
    }
  };
  