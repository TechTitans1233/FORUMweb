async function classificarMensagem(mensagem) {
  const response = await fetch("http://localhost:5000/classify", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ mensagem }),
  });
  const data = await response.json();
  return data; // {categoria, localizacao, impacto}
}

// Exemplo de uso:
classificarMensagem("Inundações severas na cidade X")
  .then(resultado => {
    console.log("Resultado:", resultado);
  });
