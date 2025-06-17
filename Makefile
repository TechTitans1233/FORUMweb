.PHONY: help setup start stop restart test logs clean rebuild status shell python-shell install-node install-python

.DEFAULT_GOAL := help

help: ## Mostrar ajuda
	@echo "Comandos disponíveis:"
	@grep -E '^[a-zA-Z_-]+:.*?## .+' $(firstword $(MAKEFILE_LIST)) | sort | \
	awk 'BEGIN {FS=":.*## "} {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
	
setup: ## Configuração inicial
	@echo "🚀 Configurando ambiente..."
	@cp -n .env.example .env 2>/dev/null || true
	@docker-compose build
	@docker-compose up -d
	@echo "✅ Setup concluído! Acesse http://localhost:3000 e http://localhost:5000"

start: ## Iniciar serviços
	@echo "🟢 Iniciando serviços..."
	@docker-compose up -d

stop: ## Parar serviços
	@echo "🔴 Parando serviços..."
	@docker-compose down

restart: ## Reiniciar serviços
	@echo "🔄 Reiniciando..."
	@docker-compose restart

test: ## Executar testes E2E
	@echo "🧪 Executando testes..."
	@docker-compose up -d web
	@sleep 10
	@docker-compose --profile testing up --build --abort-on-container-exit e2e-tests
	@docker-compose --profile testing down

logs: ## Mostrar logs
	@docker-compose logs -f --tail=100

clean: ## Limpar ambiente
	@echo "🧹 Limpando..."
	@docker-compose down -v --remove-orphans
	@docker system prune -f

rebuild: ## Rebuild completo
	@echo "🔄 Rebuild..."
	@docker-compose down
	@docker-compose build --no-cache
	@docker-compose up -d

status: ## Status dos containers
	@docker-compose ps

shell: ## Shell no container web
	@docker-compose exec web sh

python-shell: ## Shell no container python
	@docker-compose exec python-app bash

dev: ## Modo desenvolvimento com logs
	@docker-compose up

install-node: ## Instalar nova dependência Node.js
	@echo "Uso: make install-node PACKAGE=nome-do-pacote"
	@docker-compose exec web npm install $(PACKAGE)

install-python: ## Instalar nova dependência Python
	@echo "Uso: make install-python PACKAGE=nome-do-pacote"
	@docker-compose exec python-app pip install $(PACKAGE)