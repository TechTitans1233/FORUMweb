
---

## 🛰️ Hórus - Disaster Warning System

> [!IMPORTANT]
> Os códigos apresentados estão sendo rodados no Windows em seu WSL(Ubuntu).

![Windows](https://img.shields.io/badge/Windows-0078D6?logo=windows&logoColor=white&style=for-the-badge)
![WSL](https://img.shields.io/badge/WSL-4D4D4D?logo=linux&logoColor=white&style=for-the-badge)
![Ubuntu](https://img.shields.io/badge/Ubuntu-E95420?logo=ubuntu&logoColor=white&style=for-the-badge)

---

## ✨ Features

- Publicação de alertas em tempo real por usuários e autoridades locais
- Sistema de categorização por tipo de desastre (enchentes, incêndios, terremotos etc.)
- Interface simples e direta
- Geolocalização integrada para exibir alertas próximos ao usuário
- Fórum colaborativo com comentários, curtidas, publicação de imagens dos enventos por parte dos usuários

---

## ⚙️ Requisitos
> [!WARNING]
> Certifique-se de que as dependências estejam instaladas.
> ```shell
> sudo apt update && sudo apt upgrade && sudo apt install build-essential
> npm install
> npm install -g nightwatch jest
>```

| Pacote        | Função                                     |
|---------------|--------------------------------------------|
| `make`        |  Executar/criar o container/volume docker  |
| `docker`      |  Disponibilizar o uso da plataforma Hórus  |
| `nightwatch`  |           Executa testes E2E               |
|    `jest`     |        Executa testes INT e UNIT           |

---

## Instalação
```shell
git clone https://github.com/TechTitans1233/FORUMweb.git
cd FORUMWeb
make setup
```

## 🛠️ Como executar os testes:

1. Testes E2E:

```bash
nightwatch --config .\nightwatch.conf.cjs
```

2. Testes INT:

```bash
jest --config=jest.int.config.js
```

3. Testes UNIT:

```bash
jest --config=jest.unit.config.js
```

---
