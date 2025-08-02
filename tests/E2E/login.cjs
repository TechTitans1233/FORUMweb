// tests/E2E/login.cjs
module.exports = {
  'Fluxo: login inválido, login admin inválido, criar usuário e login válido': function (browser) {
    const urlLogin = 'https://127.0.0.1:3000/login/'; // ajuste conforme necessário

    // --- 1. GERAÇÃO DE DADOS ALEATÓRIOS ---
    // usamos timestamp para garantir unicidade
    const ts = Date.now();
    const randomName     = `User${ts}`;
    const randomEmail    = `user${ts}@example.com`;
    const randomPassword = `Pass${ts}`;        // ex.: “Pass1623456789012”
    const randomAdminPwd = `Admin${ts}`;       // senha administrativa inválida

    browser
      // 2. ABRE A PÁGINA DE LOGIN E VERIFICA TÍTULO
      .url(urlLogin)
      .waitForElementVisible('body', 1000)
      .assert.titleEquals('Login')

      // 3. ESTADO INICIAL: FORMULÁRIO DE USUÁRIO VISÍVEL, OS OUTROS OCULTOS
      .assert.visible('#userLogin')
      .assert.hidden('#adminLogin')
      .assert.hidden('#registerForm')

      // ----------- TESTE 1: LOGIN DE USUÁRIO INVÁLIDO -----------
      // 4. TENTA FAZER LOGIN DE USUÁRIO COM EMAIL/SENHA ALEATÓRIOS
      .assert.visible('#userEmail')
      .assert.visible('#userPassword')
      .setValue('#userEmail', randomEmail)
      .setValue('#userPassword', randomPassword)
      .click('#userLoginForm button[type="submit"]')
      .pause(1000)
      // Observação: como o front está usando alert() em caso de erro, não conseguimos capturar facilmente o texto do alert.
      // Basta pausar para que a requisição seja enviada, mas não temos uma asserção URL, pois deve ficar na mesma página.

      // ----------- TESTE 2: LOGIN ADMINISTRATIVO INVÁLIDO -----------
      // 5. CLICA EM “Login administrativo? Clique aqui” para mostrar o form admin
      .click('#admin-toggle')
      .pause(500)
      .assert.hidden('#userLogin')
      .assert.visible('#adminLogin')
      .assert.hidden('#registerForm')

      // 6. TENTA FAZER LOGIN ADMINISTRATIVO COM SENHA ALEATÓRIA
      .assert.visible('#adminPassword')
      .setValue('#adminPassword', randomAdminPwd)
      .click('#adminLoginForm button[type="submit"]')
      .pause(1000)
      // Mesma observação: um alert() deve aparecer via front em caso de senha errada.
      // Só pausamos e seguimos.

      // ----------- TESTE 3: CRIAR NOVO USUÁRIO -----------
      // 7. VOLTA PARA O FORM DE USUÁRIO (clicando em “Voltar ao login de usuário? Clique aqui”)
      .click('#user-toggle')
      .pause(500)
      .assert.visible('#userLogin')
      .assert.hidden('#adminLogin')
      .assert.hidden('#registerForm')

      // 8. CLICA EM “Não possui uma conta? Crie uma conta”
      .click('#register-toggle')
      .pause(500)
      .assert.hidden('#userLogin')
      .assert.hidden('#adminLogin')
      .assert.visible('#registerForm')

      // 9. PREENCHA O FORMULÁRIO DE CADASTRO COM DADOS ALEATÓRIOS
      .assert.visible('#registerName')
      .assert.visible('#registerEmail')
      .assert.visible('#registerPassword')
      .assert.visible('#registerConfirmPassword')
      .setValue('#registerName', randomName)
      .setValue('#registerEmail', randomEmail)
      .setValue('#registerPassword', randomPassword)
      .setValue('#registerConfirmPassword', randomPassword)
      .click('#registerFormSubmit button[type="submit"]')
      .pause(1000)
      // O front exibe alert("Cadastro realizado com sucesso!") e chama showUserLogin() em seguida.
      
      // ----------- TESTE 4: LOGIN COM O NOVO USUÁRIO -----------
      // 10. Depois do cadastro, deve voltar ao form de usuário
      .assert.visible('#userLogin')
      .assert.hidden('#adminLogin')
      .assert.hidden('#registerForm')

      // 11. PREENCHA COM O MESMO EMAIL/SENHA QUE ACABAMOS DE CADASTRAR
      .clearValue('#userEmail')      // limpa qualquer texto remanescente
      .clearValue('#userPassword')
      .setValue('#userEmail', randomEmail)
      .setValue('#userPassword', randomPassword)
      .click('#userLoginForm button[type="submit"]')
      .pause(1500)

      // 12. FINALIZA O TESTE
      .end();
  }
};
