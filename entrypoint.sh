#!/bin/sh

# Caminho do arquivo principal
MAIN_FILE="/usr/src/app/server.js"

# Verifica se o arquivo existe
if [ ! -f "$MAIN_FILE" ]; then
  echo "❌ Erro: Arquivo $MAIN_FILE não encontrado!"
  exit 1
fi

# Executa a aplicação
exec node "$MAIN_FILE"
