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
        alert("Por favor, preencha todos os campos.");
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert("Por favor, insira um email válido.");
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Entrando...";

    // Enviar login para o backend
    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error("Erro ao autenticar usuário: " + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            if (data.message === "Usuário autenticado com sucesso!") {
                // Login bem-sucedido, buscar dados do usuário
                return fetch(`/api/users/email/${email}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error("Erro ao obter dados do usuário.");
                        }
                        return response.json();
                    })
                    .then(userData => {
                        // Armazenar dados do usuário no localStorage
                        localStorage.setItem("userEmail", userData.email);
                        localStorage.setItem("userName", userData.name);
                        localStorage.setItem("userId", userData.id);
                        // Redirecionar para a página do fórum
                        window.location.href = "../forum/forum.html";
                    });
            } else {
                throw new Error(data.message);
            }
        })
        .catch(error => {
            console.error(error);
            alert("Erro: " + error.message);
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
        alert("Por favor, preencha todos os campos.");
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
            localStorage.setItem("adminToken", data.token);
            alert("Login administrativo realizado com sucesso!");
            window.location.href = "../admin/admin.html"; // Redirecionar para o painel administrativo
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        alert("Erro: " + error.message);
    }
});


// Função para cadastrar usuário
document.getElementById("registerFormSubmit").addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = document.getElementById("registerName").value;
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("registerConfirmPassword").value;

    if (!name || !email || !password || !confirmPassword) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    if (password !== confirmPassword) {
        alert("As senhas não coincidem. Tente novamente.");
        return;
    }

    // Enviar dados de cadastro para o backend
    fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
    })
    .then((response) => response.json())
    .then((data) => {
        if (data.message === "Usuário criado com sucesso!") {
            alert("Usuário cadastrado com sucesso!");
            document.getElementById("registerName").value = "";
            document.getElementById("registerEmail").value = "";
            document.getElementById("registerPassword").value = "";
            document.getElementById("registerConfirmPassword").value = "";

            // Voltar ao login
            const registerForm = document.getElementById("registerForm");
            const userLogin = document.getElementById("userLogin");
            registerForm.style.display = "none";
            userLogin.style.display = "block";
        } else {
            alert("Erro ao cadastrar o usuário: " + data.message);
        }
    })
    .catch((error) => {
        alert("Erro ao tentar cadastrar o usuário: " + error.message);
    });
});

