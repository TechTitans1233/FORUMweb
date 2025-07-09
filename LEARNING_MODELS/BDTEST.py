import pandas as pd
import random
import json
import os

# 1. Carregar as localidades do arquivo JSON (mantido o mesmo)
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

                if lat_str and lon_str:
                    try:
                        final_lat = float(lat_str)
                        final_lon = float(lon_str)
                    except ValueError:
                        pass 
                
                cities_data.append({
                    "cidade": city_name,
                    "estado": state_name,
                    "latitude": final_lat,
                    "longitude": final_lon,
                    "continente": continent,
                    "pais": country
                })

        print(f"✅ Carregadas {len(cities_data)} localidades do arquivo '{json_file_path}'.")
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

# 2. Definição de sinônimos para o dataset de treinamento (mantido o mesmo)
disaster_synonyms_train = {
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
    "desastre_hidrico": [
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

# 3. Novos sinônimos para o dataset de validação
disaster_synonyms_validation = {
    "seca": [
        "estiagem prolongada", "falta de chuva", "crise de água", "aridez extrema",
        "solo seco", "período árido", "escassez de água", "déficit pluviométrico",
        "terra árida", "clima seco", "estiagem severa", "falta de umidade"
    ],
    "ciclone": [
        "tempestade ciclônica", "furacão tropical", "tufão violento", "ciclone marítimo",
        "ventos intensos", "tormenta", "ciclone costeiro", "tempestade", "ventania",
        "ciclone extremo", "sistema ciclônico", "ventos devastadores"
    ],
    "terremoto": [
        "abalo terrestre", "sismo forte", "tremor sísmico", "movimento sísmico",
        "terremoto violento", "sismo devastador", "tremor intenso", "choque sísmico",
        "atividade telúrica", "sismo moderado", "ruptura do solo"
    ],
    "desastre_hidrico": [
        "inundação urbana", "cheia de rio", "alagamento severo", "enchente forte",
        "transbordo de córrego", "inundação costeira", "chuva torrencial", "maré de tempestade",
        "alagamento repentino", "enxurrada forte", "rio transborda", "inundação grave"
    ],
    "queimada": [
        "fogo florestal", "incêndio em floresta", "queima descontrolada", "fogo em vegetação",
        "incêndio de mata", "chamas intensas", "fogo rural", "queimada de grandes proporções",
        "incêndio em área verde", "fumaça densa", "destruição florestal"
    ],
    "vulcao": [
        "erupção de lava", "vulcão em atividade", "explosão de cinzas", "atividade vulcânica intensa",
        "vulcão explosivo", "fluxo de lava", "erupção violenta", "cinzas vulcânicas densas",
        "vulcão em erupção", "montanha vulcânica", "gases de erupção"
    ],
    "deslizamento": [
        "desmoronamento de encosta", "queda de terra", "deslizamento de solo", "soterramento de área",
        "movimento de terra", "desabamento de barreira", "erosão de encosta", "deslizamento grave",
        "instabilidade de solo", "desmoronamento rochoso", "fluxo de lama"
    ],
    "tempestade": [
        "chuva violenta", "temporal forte", "vendaval intenso", "trovoada severa",
        "tempestade com raios", "chuva de granizo forte", "ventania severa", "tormenta elétrica",
        "tempestade intensa", "ventos fortes", "chuva pesada"
    ]
}

# 4. Carregar as localidades
json_file = "brazil_states_cities.json"
locations = load_brazilian_cities_from_json(json_file)

# 5. Geração de mensagens de exemplo automáticas
# --- Templates de Mensagem para TREINO (mantido o mesmo) ---
templates_train = [
    "Alerta de {sinonimo} em {cidade}, {estado}, {pais}.",
    "Atenção: {sinonimo} detectada em {cidade}, {estado}, {pais}.",
    "Emergência: {sinonimo} atingiu {cidade}, {estado}, {pais}.",
    "Notificação de {sinonimo} para {cidade}, {estado}, {pais}.",
    "Previsão de {sinonimo} em {cidade}, {estado}, {pais}.",
    "Risco de {sinonimo} iminente em {cidade}, {estado}, {pais}.",
    "Situação de {sinonimo} em {cidade}, {estado}, {pais}.",
    "Defesa Civil alerta sobre {sinonimo} em {cidade}/{estado}.",
    "Registrado {sinonimo} em {cidade}, {estado}.",
    "Grande {sinonimo} em {cidade}, {estado}.",
    "Comunicação de {sinonimo} na região de {cidade}, {estado}.",
    "Autoridades reportam {sinonimo} em {cidade}, {estado}."
]

# --- Novos Templates de Mensagem para VALIDAÇÃO ---
templates_validation = [
    "⚠️ Atenção: {sinonimo} registrado(a) em {cidade}, {estado}.",
    "URGENTE: {sinonimo} impacta {cidade} ({estado}), Brasil.",
    "Aviso: {sinonimo} em curso na cidade de {cidade}, {estado}.",
    "Relato de {sinonimo} na região de {cidade}/{estado}.",
    "Moradores de {cidade}, {estado}, enfrentam {sinonimo}.",
    "Confirmação de {sinonimo} em {cidade}, {estado}, Brasil.",
    "Autoridades monitoram {sinonimo} em {cidade} ({estado}).",
    "Emergência declarada devido a {sinonimo} em {cidade}, {estado}."
]

def gerar_mensagem(sinonimo: str, cidade: str, estado: str, pais: str, templates: list) -> str:
    chosen_template = random.choice(templates)
    return chosen_template.format(sinonimo=sinonimo, cidade=cidade, estado=estado, pais=pais)

# 6. Possíveis níveis de impacto (mantido o mesmo)
impact_levels = ["baixo", "moderado", "alto", "catastrófico", "gravíssimo", "extremo"]

# 7. Função auxiliar para gerar dataset (usada para ambos, treinamento e validação)
def generate_dataset(target_examples, use_templates, use_synonyms, dataset_name="Dataset"):
    dataset = []
    
    total_synonyms = sum(len(syns) for syns in use_synonyms.values())
    total_locations = len(locations)

    if total_locations == 0:
        print(f"⚠️ Aviso: Não há localidades para gerar o {dataset_name}. Retornando dataset vazio.")
        return []

    # Calcular o multiplicador para atingir o target desejado
    multiplier_for_volume = (target_examples // (total_synonyms * total_locations)) + 1
    
    print(f"Gerando {dataset_name} com multiplicador: {multiplier_for_volume}")

    for loc in locations:
        cidade = loc["cidade"]
        estado = loc["estado"]
        pais = loc["pais"]
        lat = loc["latitude"]
        lon = loc["longitude"]
        continente = loc["continente"]

        for categoria, sinonimos in use_synonyms.items():
            for sinonimo in sinonimos:
                for _ in range(multiplier_for_volume):
                    mensagem = gerar_mensagem(sinonimo, cidade, estado, pais, use_templates)
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
                        "latitude": lat,
                        "longitude": lon,
                        "impacto": impacto
                    }
                    dataset.append(registro)
    return dataset

# 8. Parâmetros de volume
TARGET_TRAIN_EXAMPLES = 40000
TARGET_VALIDATION_EXAMPLES = 10000

# 9. Gerar o dataset de treinamento
print("\n--- Gerando Dataset de Treinamento ---")
dataset_train_raw = generate_dataset(
    TARGET_TRAIN_EXAMPLES,
    templates_train,
    disaster_synonyms_train,
    dataset_name="Dataset de Treinamento"
)
df_train = pd.DataFrame(dataset_train_raw)

# 10. Gerar o dataset de validação
print("\n--- Gerando Dataset de Validação ---")
dataset_validation_raw = generate_dataset(
    TARGET_VALIDATION_EXAMPLES,
    templates_validation,
    disaster_synonyms_validation,
    dataset_name="Dataset de Validação"
)
df_validation = pd.DataFrame(dataset_validation_raw)

# 11. Ordenar colunas para facilitar leitura
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

# 12. Salvando Datasets
try:
    if not df_train.empty:
        df_train = df_train[colunas_ordenadas]
        print(f"✅ Dataset de Treinamento gerado com {len(df_train)} registros.")
        df_train.to_csv("dataset_treinamento.csv", index=False, encoding="utf-8")
        print("✅ Arquivo 'dataset_treinamento.csv' salvo com sucesso.")
    else:
        print("❌ Não foi possível gerar o dataset de treinamento.")

    if not df_validation.empty:
        df_validation = df_validation[colunas_ordenadas]
        print(f"✅ Dataset de Validação gerado com {len(df_validation)} registros.")
        df_validation.to_csv("dataset_validacao.csv", index=False, encoding="utf-8")
        print("✅ Arquivo 'dataset_validacao.csv' salvo com sucesso.")
    else:
        print("❌ Não foi possível gerar o dataset de validação.")

except Exception as e:
    print(f"❌ Erro ao salvar os datasets: {e}")