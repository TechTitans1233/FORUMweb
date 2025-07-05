import pandas as pd
import random
import json
import os

# 1. Carregar as localidades do arquivo JSON
def load_brazilian_cities_from_json(json_file_path):
    cities_data = []
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        brazil_data = data.get("Brazil", {})
        continent = brazil_data.get("continent", "América do Sul")
        country = "Brasil"

        for state_name, state_info in brazil_data.get("states", {}).items():
            state_cities = state_info.get("cities", {})
            
            for city_name, city_info in state_cities.items():
                lat_str = city_info.get("lat")
                lon_str = city_info.get("lon")

                final_lat = None
                final_lon = None

                # Tenta converter as coordenadas, se existirem e forem válidas
                if lat_str and lon_str:
                    try:
                        final_lat = float(lat_str)
                        final_lon = float(lon_str)
                    except ValueError:
                        # Se não puder converter para float, assume que são inválidas
                        pass 
                
                # Adiciona a cidade, mesmo que as coordenadas sejam None (ausentes/inválidas)
                cities_data.append({
                    "cidade": city_name,
                    "estado": state_name,
                    "latitude": final_lat,  # Pode ser None
                    "longitude": final_lon, # Pode ser None
                    "continente": continent,
                    "pais": country
                })

        print(f"✅ Carregadas {len(cities_data)} localidades do arquivo '{json_file_path}'.")
        # Filtrar apenas cidades com coordenadas válidas para uma contagem mais precisa
        # para o propósito de geração de volume se você for manter a lógica de multiplicação
        # baseada em cidades COM COORDENADAS.
        # Mas para o seu pedido, vamos contar todas as cidades carregadas.
        return cities_data

    except FileNotFoundError:
        print(f"❌ Erro: O arquivo '{json_file_path}' não foi encontrado. Por favor, certifique-se de que ele está no mesmo diretório do script.")
        print("Usando uma lista reduzida de locais de exemplo como fallback.")
        return [
            {"continente": "América do Sul", "pais": "Brasil", "estado": "São Paulo", "cidade": "São Paulo", "latitude": -23.55052, "longitude": -46.63331},
            {"continente": "América do Sul", "pais": "Brasil", "estado": "Rio de Janeiro", "cidade": "Rio de Janeiro", "latitude": -22.906847, "longitude": -43.172897},
            {"continente": "América do Sul", "pais": "Brasil", "estado": "Minas Gerais", "cidade": "Belo Horizonte", "latitude": -19.91667, "longitude": -43.93444},
        ]
    except json.JSONDecodeError:
        print(f"❌ Erro: Não foi possível decodificar o arquivo JSON '{json_file_path}'. Verifique se o formato está correto.")
        return []
    except Exception as e:
        print(f"❌ Ocorreu um erro inesperado ao carregar o JSON: {e}")
        return []

# Definição de sinônimos (permanece a mesma)
disaster_synonyms = {
    "seca": [
        "seca", "estiagem", "escassez hídrica", "aridez", "período de seca",
        "falta d'água", "desidratação do solo", "crise hídrica", "secagem",
        "terra seca", "verão rigoroso", "longa estiagem", "escassez pluviométrica",
        "deterioração agrícola por seca", "seca severa", "seca extrema",
        "estio prolongado", "déficit hídrico"
    ],
    "ciclone": [
        "ciclone", "tempestade tropical", "tufão", "furacão", "ciclone extratropical",
        "depressão tropical", "ciclone subtropical", "vendaval", "temporal",
        "ciclone intenso", "ciclone devastador", "ciclone violento", "ciclone destrutivo",
        "ciclone marinho", "ciclone costeiro", "ventos fortes", "vendos ciclônicos"
    ],
    "terremoto": [
        "terremoto", "sismo", "tremor de terra", "abalo sísmico", "movimento telúrico",
        "terremoto forte", "terremoto intenso", "terremoto devastador", "terremoto moderado",
        "ruptura sísmica", "atividade sísmica", "abalos sísmicos", "crise sísmica",
        "vibração do solo", "tremor de chão", "tremores de terra"
    ],
    "desastre_hidrico": [ # Nova categoria para agrupar desastres de água
        "enchente", "alagamento", "inundação", "cheia", "inundações",
        "subida do nível da água", "transbordamento de rio", "alagamento urbano",
        "córrego transbordando", "águas altas", "inundação repentina", "enxurrada",
        "chuvas torrenciais", "transbordo", "situação de enchente", "dilúvio",
        "massa d'água", "onda gigante", "tsunami", "ressaca marítima", "maré alta",
        "inundação costeira", "inundação fluvial", "rompimento de barragem",
        "ondas fortes", "ondas anômalas", "cabeça d'água"
    ],
    "queimada": [
        "queimada", "incêndio florestal", "fogo", "incêndio em mata", "queima",
        "fogo descontrolado", "foco de incêndio", "incêndio em vegetação",
        "chamas em floresta", "queimada ilegal",
        "fumaça intensa", "destruição por fogo", "incêndio rural", "incêndio de grandes proporções",
        "incêndio ambiental", "incêndio em lavoura"
    ],
    "vulcao": [
        "vulcão", "erupção vulcânica", "explosão vulcânica", "atividade vulcânica",
        "cinzas vulcânicas", "lava", "fluxo piroclástico", "erupção de vulcão",
        "vulcão ativo", "vulcão em erupção", "montanha de fogo", "desabamento vulcânico",
        "gases vulcânicos", "atividade sísmica vulcânica", "erupção de cinzas"
    ],
    "deslizamento": [
        "deslizamento", "desmoronamento", "queda de barreira", "movimento de massa",
        "deslizamento de terra", "erosão", "encosta cedendo", "soterramento",
        "risco de deslizamento", "solo instável", "barreira caindo", "terra cedendo",
        "fluxo de detritos", "massa de solo", "deslizamento rochoso"
    ],
    "tempestade": [
        "tempestade", "temporal", "chuva forte", "chuva intensa", "vendaval",
        "granizo", "raios", "trovoada", "tempestade severa", "vento forte",
        "chuva com vento", "tempestade elétrica", "chuva de granizo",
        "microexplosão", "vento ciclônico"
    ]
}

# 2. Carregar as localidades
json_file = "brazil_states_cities.json"
locations = load_brazilian_cities_from_json(json_file)

# 3. Geração de mensagens de exemplo automáticas (mais templates em português)
def gerar_mensagem(sinonimo: str, cidade: str, estado: str, pais: str) -> str:
    templates = [
        f"Alerta de {sinonimo} em {cidade}, {estado}, {pais}.",
        f"Atenção: {sinonimo} detectada em {cidade}, {estado}, {pais}.",
        f"Emergência: {sinonimo} atingiu {cidade}, {estado}, {pais}.",
        f"Notificação de {sinonimo} para {cidade}, {estado}, {pais}.",
        f"Previsão de {sinonimo} em {cidade}, {estado}, {pais}.",
        f"Risco de {sinonimo} iminente em {cidade}, {estado}, {pais}.",
        f"Situação de {sinonimo} em {cidade}, {estado}, {pais}.",
        f"Defesa Civil alerta sobre {sinonimo} em {cidade}/{estado}.",
        f"Registrado {sinonimo} em {cidade}, {estado}.",
        f"Grande {sinonimo} em {cidade}, {estado}.",
        f"Comunicação de {sinonimo} na região de {cidade}, {estado}.",
        f"Autoridades reportam {sinonimo} em {cidade}, {estado}."
    ]
    return random.choice(templates)

# 4. Possíveis níveis de impacto
impact_levels = ["baixo", "moderado", "alto", "catastrófico", "gravíssimo", "extremo"]

# 5. Montagem do dataset final
dataset_expanded = []

# Calcular o número total de sinônimos
total_synonyms = sum(len(syns) for syns in disaster_synonyms.values())
# Calcular o número de localidades (TODAS as carregadas, mesmo sem coord)
total_locations = len(locations)

# Definir o número mínimo de exemplos que você deseja
min_examples_target = 40000

# Se a combinação direta de sinônimos x localidades já atingir o alvo, não precisamos de multiplicador
if total_synonyms * total_locations >= min_examples_target:
    multiplier_for_volume = 1
    print(f"Volume alvo ({min_examples_target}) atingido com {total_synonyms * total_locations} combinações diretas.")
else:
    # Caso contrário, calcular o multiplicador necessário
    # Adicionando 1 para arredondar para cima e garantir que o alvo seja atingido
    # Isso garante que todas as cidades sejam repetidas um número X de vezes por sinônimo.
    multiplier_for_volume = (min_examples_target // (total_synonyms * total_locations)) + 1
    print(f"Volume alvo ({min_examples_target}) não atingido. Usando multiplicador: {multiplier_for_volume}")

# Iterar sobre CADA CIDADE e CADA SINÔNIMO para garantir que todas as cidades sejam usadas.
# Isso é mais robusto do que random.choice(locations) para garantir o uso de TODAS as cidades.
for loc in locations:
    cidade = loc["cidade"]
    estado = loc["estado"]
    pais = loc["pais"]
    lat = loc["latitude"]
    lon = loc["longitude"]
    continente = loc["continente"]

    for categoria, sinonimos in disaster_synonyms.items():
        for sinonimo in sinonimos:
            for _ in range(multiplier_for_volume): # Repetir para atingir o volume desejado
                mensagem = gerar_mensagem(sinonimo, cidade, estado, pais)
                impacto = random.choice(impact_levels)

                registro = {
                    "mensagem": mensagem,
                    "categoria": categoria,
                    "sinonimo": sinonimo,
                    "idioma": "pt",
                    "continente": continente,
                    "pais": pais,
                    "estado": estado,
                    "cidade": cidade,
                    "latitude": lat, # Pode ser None
                    "longitude": lon, # Pode ser None
                    "impacto": impacto
                }
                dataset_expanded.append(registro)

# 6. Criação do DataFrame e salvamento em CSV (UTF-8)
df_expanded = pd.DataFrame(dataset_expanded)

# Ordenar colunas para facilitar leitura
colunas_ordenadas = [
    "mensagem",
    "categoria",
    "sinonimo",
    "idioma",
    "continente",
    "pais",
    "estado",
    "cidade",
    "latitude",
    "longitude",
    "impacto"
]
df_expanded = df_expanded[colunas_ordenadas]

# Opcional: mostrar quantas linhas geramos
print(f"✅ Dataset expandido gerado com {len(df_expanded)} registros.")

# Salvar em CSV
df_expanded.to_csv("dataset_portugues_brasil_expandido.csv", index=False, encoding="utf-8")
print("✅ Arquivo 'dataset_portugues_brasil_expandido.csv' salvo com sucesso.")
