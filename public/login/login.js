
function mostrarErro(mensagem) {
    const errorDiv = document.getElementById("error-message");
    const p = errorDiv.querySelector("p");
    p.textContent = mensagem;
    errorDiv.classList.add("show");
    setTimeout(() => {
        errorDiv.classList.remove("show");
        p.textContent = "";
    }, 4000); // some após 4 segundos

}

document.getElementById("userEmail").classList.add("error");
document.getElementById("userPassword").classList.add("error");


// Alternar para o login administrativo
document.getElementById('admin-toggle').addEventListener('click', function (e) {
    e.preventDefault();

    const userLogin = document.getElementById('userLogin');
    const adminLogin = document.getElementById('adminLogin');

    // Oculta o login comum e exibe o administrativo
    userLogin.style.display = 'none';
    adminLogin.style.display = 'block';
});

// Voltar ao login comum
document.getElementById('user-toggle').addEventListener('click', function (e) {
    e.preventDefault();

    const userLogin = document.getElementById('userLogin');
    const adminLogin = document.getElementById('adminLogin');

    // Oculta o login administrativo e exibe o login comum
    userLogin.style.display = 'block';
    adminLogin.style.display = 'none';
});

// Ação ao clicar em "Criar uma conta"
document.getElementById("register-toggle").addEventListener("click", function (event) {
    event.preventDefault();

    const userLogin = document.getElementById("userLogin");
    const registerForm = document.getElementById("registerForm");

    // Ocultar o login e mostrar o cadastro
    userLogin.style.display = "none";
    registerForm.style.display = "block";
});

// Ação ao clicar em "Clique aqui para fazer login"
document.getElementById("login-toggle").addEventListener("click", function (event) {
    event.preventDefault();

    const userLogin = document.getElementById("userLogin");
    const registerForm = document.getElementById("registerForm");

    // Ocultar o cadastro e mostrar o login
    registerForm.style.display = "none";
    userLogin.style.display = "block";
});

// Função para realizar login do usuário
document.getElementById("userLoginForm").addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.getElementById("userEmail").value.trim();
    const password = document.getElementById("userPassword").value.trim();
    const submitButton = event.target.querySelector("button");

    if (!email || !password) {
        mostrarErro("Por favor, preencha todos os campos.");
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        mostrarErro("Por favor, insira um email válido.");
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Entrando...";

    // Enviar login para o backend
    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error("Erro ao autenticar usuário: " + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            if (data.message === "Usuário autenticado com sucesso!") {
                //console.log(data)
                localStorage.setItem("userEmail", data.user.email);
                localStorage.setItem("userName", data.user.displayName);
                localStorage.setItem("userId", data.user.uid);

                window.location.href = "../forum";
            } else {
                throw new Error(data.message);
            }
        })
        .catch(error => {
            console.error(error);
            mostrarErro("Erro: " + error.message);
        })
        .finally(() => {
            submitButton.disabled = false;
            submitButton.textContent = "Entrar";
        });
});

// Função para realizar login administrativo
document.getElementById("adminLoginForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const password = document.getElementById("adminPassword").value;

    if (!password) {
        mostrarErro("Por favor, preencha todos os campos.");
        return;
    }

    try {
        // Enviar a senha para o backend para autenticação
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (!response.ok) {
            throw new Error("Erro ao autenticar administrador: " + response.statusText);
        }

        const data = await response.json();
        if (data.token) {
            // Armazena o token no localStorage
            //localStorage.setItem("adminToken", data.token);
            mostrarErro("Login administrativo realizado com sucesso!");
            window.location.href = "../admin"; // Redirecionar para o painel administrativo
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        mostrarErro("Erro: " + error.message);
    }
});


// Função para validar o formato do e-mail utilizando expressão regular
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}


// Evento de submit para o formulário de cadastro
document.getElementById("registerFormSubmit").addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = document.getElementById("registerName").value;
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("registerConfirmPassword").value;

    if (!name || !email || !password || !confirmPassword) {
        mostrarErro("Por favor, preencha todos os campos.");
        return;
    }

    if (!isValidEmail(email)) {
        mostrarErro("Formato de e-mail inválido.");
        return;
    }
    
    if (password !== confirmPassword) {
        mostrarErro("As senhas não coincidem. Tente novamente.");
        return;
    }

    // Enviar dados de cadastro para o backend
    try {
        const response = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });
        const data = await response.json();
        
        if (data.message === "Usuário criado com sucesso!") {
            mostrarErro("Usuário cadastrado com sucesso!");
            
            // Limpa os campos do formulário
            document.getElementById("registerName").value = "";
            document.getElementById("registerEmail").value = "";
            document.getElementById("registerPassword").value = "";
            document.getElementById("registerConfirmPassword").value = "";

            // Alterna para a tela de login
            document.getElementById("registerForm").style.display = "none";
            document.getElementById("userLogin").style.display = "block";
        } else {
            mostrarErro("Erro ao cadastrar o usuário: " + data.message);
        }
    } catch (error) {
        mostrarErro("Erro ao tentar cadastrar o usuário: " + error.message);
    }
});

  window.addEventListener('load', () => {
    const loader = document.getElementById('bg-loader');

  setTimeout(() => {
    loader.style.display = 'none';
  }, 3500); // igual à duração do fadeInOut
  });