module.exports = {
  'Fluxo: carregar página de mapa, verificar GeoJSON estático, eventos dinâmicos e interação de hover': function (browser) {
    const urlLogin = 'https://127.0.0.1:3000/login/'; // URL da página de login
    const urlMap = 'https://127.0.0.1:3000/map/'; // Ajuste conforme a URL real

    // --- 1. GERAÇÃO DE DADOS ALEATÓRIOS ---
    const ts = Date.now();
    const randomName = `User${ts}`;
    const randomEmail = `user${ts}@example.com`;
    const randomPassword = `Pass${ts}`;
    const randomPostTitle = `Event${ts}`;
    const randomPostContent = `Test event description ${ts}`;
    const randomLat = (Math.random() * 180 - 90).toFixed(6); // Latitude aleatória
    const randomLon = (Math.random() * 360 - 180).toFixed(6); // Longitude aleatória

    browser
      // --- 2. CRIAR USUÁRIO E FAZER LOGIN ---
      .url(urlLogin)
      .waitForElementVisible('body', 1000)
      .assert.titleEquals('Login')
      .assert.visible('#userLogin')
      .assert.hidden('#adminLogin')
      .assert.hidden('#registerForm')
      // Clica em "Não possui uma conta? Crie uma conta"
      .click('#register-toggle')
      .pause(500)
      .assert.hidden('#userLogin')
      .assert.hidden('#adminLogin')
      .assert.visible('#registerForm')
      // Preenche o formulário de cadastro
      .setValue('#registerName', randomName)
      .setValue('#registerEmail', randomEmail)
      .setValue('#registerPassword', randomPassword)
      .setValue('#registerConfirmPassword', randomPassword)
      .click('#registerFormSubmit button[type="submit"]')
      .pause(1000)
      // Volta ao formulário de login
      .assert.visible('#userLogin')
      .setValue('#userEmail', randomEmail)
      .setValue('#userPassword', randomPassword)
      .click('#userLoginForm button[type="submit"]')
      .pause(1000)

      // --- 3. NAVEGA PARA A PÁGINA DE MAPA ---
      .url(urlMap)
      .waitForElementVisible('body', 1000)
      .assert.titleEquals('Disaster Warning System – Mapa Híbrido')

      // --- 4. VERIFICA ESTADO INICIAL ---
      .assert.visible('#map')
      .assert.visible('#loading')
      .assert.visible('#info')
      .assert.containsText('#info', 'Passe o cursor sobre um evento para ver detalhes')

      // --- 5. VERIFICA A SIDEBAR ---
      .assert.visible('#user-menu .sidebar')
      .assert.visible('#user-menu .sidebar a[href="../forum/forum.html"]')
      .assert.visible('#user-menu .sidebar a[href="../perfil/perfil.html"]')
      .assert.visible('#user-menu .sidebar a[href="configuracoes.html"]')
      .assert.visible('#user-menu .sidebar a[href="notificacoes.html"]')
      .assert.visible('#user-menu .sidebar a[href="sair.html"]')

      // --- 6. TESTE 1: CARREGAMENTO DE GEOJSON ESTÁTICO ---
      .pause(2000) // Aguarda o carregamento do GeoJSON
      .assert.not.visible('#loading') // Verifica se o loading desapareceu

      // --- 7. TESTE 2: CARREGAMENTO DE EVENTOS DINÂMICOS ---
      .executeAsync(function (done) {
        fetch('/api/publicacoes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([{
            id: 'test' + Date.now(),
            titulo: 'Event' + Date.now(),
            conteudo: 'Test event description ' + Date.now(),
            lat: (Math.random() * 180 - 90).toFixed(6),
            lon: (Math.random() * 360 - 180).toFixed(6),
            marcacao: null
          }])
        }).then(() => done()).catch(err => done(err));
      }, [], function (result) {
        browser.assert.ok(!result.value, 'API de publicações aceitou o post de teste');
      })
      .pause(3000) // Aguarda o processamento dinâmico
      .assert.not.visible('#loading')

      // --- 8. TESTE 3: INTERAÇÃO DE HOVER ---
      .execute(function () {
        const marker = document.createElement('div');
        marker.setAttribute('data-eventname', 'Test Event');
        marker.setAttribute('data-eventtype', 'EQ');
        marker.setAttribute('data-description', 'Test Description');
        marker.setAttribute('data-alertlevel', 'Red');
        marker.setAttribute('data-localizacao', 'Test Location');
        document.body.appendChild(marker);
        const event = new Event('mouseover');
        marker.dispatchEvent(event);
        return document.getElementById('info').innerHTML;
      }, [], function (result) {
        browser.assert.ok(result.value.includes('Test Event'), 'Painel de info atualizado com nome do evento');
        browser.assert.ok(result.value.includes('EQ'), 'Painel de info atualizado com categoria');
        browser.assert.ok(result.value.includes('Test Description'), 'Painel de info atualizado com descrição');
      })

      // --- 9. FINALIZA O TESTE ---
      .end();
  }
};