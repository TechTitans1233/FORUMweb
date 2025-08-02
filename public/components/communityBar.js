function criarCommunityBar() {
    const aside = document.createElement("aside");
    aside.id = "community";

    aside.innerHTML = `
        <div class="container">
            <div class="search-container">
                <input type="text" class="search-input" placeholder="Pesquisar usuários..." id="searchInput">
            </div>
            <div id="usuariosEncontrados"></div>
            <div id="usuariosOcultos" style="display: none;"></div><!--
            <button class="btn-ocultar" id="btnOcultar">Mostrar mais usuários</button>-->
        </div>
    `;

    // Inserir antes do main-content para respeitar a estrutura do grid
    //document.getElementById("app").insertBefore(aside, document.getElementById("main-content"));
    const app = document.getElementById("app");
    app.appendChild(aside); // insere depois do main-content
}

// Executar função ao carregar a página
//document.addEventListener("DOMContentLoaded", criarCommunityBar);
criarCommunityBar();