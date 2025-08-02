import pandas as pd
import random
import json
import os
import string
import re

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

# 2. Função para gerar mensagens de ruído para "nao_classificado"
def generate_random_noise_message():
    message_types = [
        "single_words",
        "numbers_only",
        "repetitions",
        "vowels_consonants",
        "nonsensical_phrases",
        "mixed_garbage"
    ]
    chosen_type = random.choice(message_types)

    if chosen_type == "single_words":
        words = ["casa", "carro", "azul", "velocidade", "flor", "montanha", "livro", "computador", "sol", "lua", "água", "vento", "verde", "grande", "pequeno", "papel", "caneta", "telefone", "cadeira", "mesa", "janela", "porta", "nuvem", "estrela", "campo", "cidade"]
        return " ".join(random.choices(words, k=random.randint(1, 5)))
    elif chosen_type == "numbers_only":
        return "".join(random.choices(string.digits, k=random.randint(5, 15)))
    elif chosen_type == "repetitions":
        word = random.choice(["alerta", "perigo", "chuva", "fogo", "tremer", "vento", "problema", "cuidado", "risco", "ajuda"])
        return " ".join([word] * random.randint(2, 5))
    elif chosen_type == "vowels_consonants":
        chars = random.choices("aeiou", k=random.randint(3, 7)) + random.choices("bcdfghjklmnpqrstvwxyz", k=random.randint(3, 7))
        random.shuffle(chars)
        return "".join(chars)
    elif chosen_type == "nonsensical_phrases":
        starts = ["O céu", "A rua", "O vento", "A terra", "Um alerta", "A nuvem", "A árvore", "O prédio", "A luz", "O som"]
        middles = ["cantou", "dançou", "explodiu", "desapareceu", "flutuou", "brilhou", "correu", "parou", "gritou", "silenciou"]
        ends = ["silenciosamente.", "com cores.", "no vazio.", "sem motivo.", "de repente.", "para sempre.", "muito rápido.", "devagar demais.", "no ar.", "no chão."]
        return f"{random.choice(starts)} {random.choice(middles)} {random.choice(ends)}"
    elif chosen_type == "mixed_garbage":
        parts = [
            "".join(random.choices(string.ascii_letters, k=random.randint(3, 8))),
            "".join(random.choices(string.digits, k=random.randint(2, 7))),
            random.choice(string.punctuation),
            " ".join(random.choices(string.ascii_letters, k=random.randint(1, 3)))
        ]
        random.shuffle(parts)
        return " ".join(parts)
    return "entrada aleatória desconhecida"

# 3. Função para aplicar ruído na mensagem final
def apply_message_noise(message: str, noise_level: float = 0.15) -> str:
    if random.random() < noise_level * 0.7:
        chars = list(message)
        num_errors = random.randint(1, min(3, len(chars) // 10))
        for _ in range(num_errors):
            error_type = random.choice(["substitute", "insert", "omit"])
            idx = random.randint(0, len(chars) - 1)
            if error_type == "substitute" and len(chars) > 0:
                chars[idx] = random.choice(string.ascii_lowercase + string.digits)
            elif error_type == "insert":
                chars.insert(idx, random.choice(string.ascii_lowercase + string.digits))
            elif error_type == "omit" and len(chars) > 1:
                del chars[idx]
        message = "".join(chars)

    if random.random() < noise_level * 0.5:
        message = "".join(random.choice([c.upper(), c.lower()]) for c in message)

    if random.random() < noise_level * 0.6:
        if random.random() < 0.5:
            message = message + random.choice(["!!!", "???", "...", "!?!", "!!!!", "?????"])
        else:
            message = re.sub(r'[.!?]+$', '', message)

    if random.random() < noise_level * 0.8:
        emojis_relevant = ["⚠️", "🚨", "🌧️", "🔥", "💨", "🆘", "📉", "⬆️", "⛔", "🌊"]
        emojis_irrelevant = ["😊", "👍", "🍕", "😂", "🎉", "🐶", "❤️", "👍", "🤔", "🤷"]
        symbols = ["#", "$", "&", "*", "@"]
        insert_count = random.randint(0, 2)
        for _ in range(insert_count):
            pos = random.randint(0, len(message))
            if random.random() < 0.7:
                item_to_insert = random.choice(emojis_relevant + emojis_irrelevant)
            else:
                item_to_insert = random.choice(symbols)
            message = message[:pos] + item_to_insert + message[pos:]

    if random.random() < noise_level * 0.4:
        fillers_start = [
            "Oi, tudo bem? ", "Bom dia! ", "Gente, vejam isso: ", "Atenção a uma coisa aqui: ",
            "Acabei de saber que ", "Por favor, fiquem sabendo que ", "Galera, ", "E aí, ", "Me ajudem! ",
            "Vi algo estranho. "
        ]
        fillers_end = [
            " Fiquem ligados!", " É isso, gente.", " Cuidado aí!", " Abraço.", " Abs.",
            " Se puderem ajudar, agradeço.", " É sério!", " Compartilhem!", " É preocupante.",
            " Pelo amor de Deus!", " Que situação."
        ]
        if random.random() < 0.5:
            message = random.choice(fillers_start) + message
        else:
            message = message + random.choice(fillers_end)

    message = message.replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u')
    message = message.replace('ã', 'a').replace('õ', 'o').replace('ç', 'c')

    if random.random() < noise_level * 0.3:
        message = message.replace("Rio de Janeiro", random.choice(["RJ", "Rio", "Rio d Janeiro"]))
        message = message.replace("São Paulo", random.choice(["SP", "Sampa", "Sao Paulo"]))
        message = message.replace("Minas Gerais", random.choice(["MG", "Minas", "Minas Gerias"]))
        message = message.replace("Brasília", random.choice(["DF", "Brasilia"]))

    return message

# 4. Definição de sinônimos para o dataset de treinamento
disaster_synonyms_train = {
    "seca": [
        "seca", "estiagem", "escassez hídrica", "aridez", "período de seca",
        "falta d'água", "desidratação do solo", "crise hídrica", "secagem",
        "terra seca", "verão rigoroso", "longa estiagem", "escassez pluviométrica",
        "deterioração agrícola por seca", "seca severa", "seca extrema",
        "estio prolongado", "déficit hídrico", "secura braba", "torrão", 
        "tempo seco", "falta de água feia", "clima árido", "terra rachada",
        "deserto na roça", "água sumiu", "poço seco", "chuva que não vem",
        "sol rachando", "calorão seco", "terra virou pó", "plantas morrendo",
        "reservatórios baixos", "crise de abastecimento", "perda de safra",
        "seca feia demais", "choveu nadica", "céu azul demais", "rios secos", "água zero"
    ],
    "ciclone": [
        "ciclone", "tempestade tropical", "tufão", "furacão", "ciclone extratropical",
        "depressão tropical", "ciclone subtropical", "vendaval", "temporal",
        "ciclone intenso", "ciclone devastador", "ciclone violento", "ciclone destrutivo",
        "ciclone marinho", "ciclone costeiro", "ventos fortes", "ventos ciclônicos",
        "ventania doida", "temporal com tudo", "vento forte demais", "vendaval sinistro", 
        "furacãozinho", "vento que derruba", "tormenta ciclônica", "vento furioso",
        "tempestade giratória", "redemoinho gigante", "ar rodopiando", "ciclone brabo",
        "vendaval com força", "ventos uivantes", "vento arranca-tudo", "tormenta pesada",
        "furacão de vento", "rajadas intensas", "vento quebra-tudo", "rodopio de vento"
    ],
    "terremoto": [
        "terremoto", "sismo", "tremor de terra", "abalo sísmico", "movimento telúrico",
        "terremoto forte", "terremoto intenso", "terremoto devastador", "terremoto moderado",
        "ruptura sísmica", "atividade sísmica", "abalos sísmicos", "crise sísmica",
        "vibração do solo", "tremor de chão", "tremores de terra", "chão tremendo", 
        "terra balançando", "abalou tudo", "tremorzinho", "sacudida forte", "terra tremeu",
        "chão mexendo", "solo instável", "tremedeira", "abalo grande", "terremoto sentido",
        "choque no solo", "estrutura balançando", "sismo inesperado", "rachaduras no chão",
        "terra sacudindo", "abalo sísmico severo", "chacoalhada forte", "subsolo instável"
    ],
    "desastre_hidrico": [
        "enchente", "alagamento", "inundação", "cheia", "inundações",
        "subida do nível da água", "transbordamento de rio", "alagamento urbano",
        "córrego transbordando", "águas altas", "inundação repentina", "enxurrada",
        "chuvas torrenciais", "transbordo", "situação de enchente", "dilúvio",
        "massa d'água", "onda gigante", "tsunami", "ressaca marítima", "maré alta",
        "inundação costeira", "inundação fluvial", "rompimento de barragem",
        "ondas fortes", "ondas anômalas", "cabeça d'água", "água batendo", 
        "tudo alagado", "rio estourou", "enchente braba", "córrego cheio", 
        "cheia monstra", "tsunami caseiro", "bairro debaixo d'água", "rua virou rio",
        "água invadindo", "casa molhada", "ponte submersa", "rio transbordou",
        "água até o telhado", "calamidade hídrica", "desastre de água", "barragem rompeu",
        "área submersa", "riacho transbordou", "volume de água alto", "cheia histórica"
    ],
    "queimada": [
        "queimada", "incêndio florestal", "fogo", "incêndio em mata", "queima",
        "fogo descontrolado", "foco de incêndio", "incêndio em vegetação",
        "chamas em floresta", "queimada ilegal",
        "fumaça intensa", "destruição por fogo", "incêndio rural", "incêndio de grandes proporções",
        "incêndio ambiental", "incêndio em lavoura", "fogo pegando", "incêndio bravo", 
        "fumaça pra todo lado", "mato pegando fogo", "incêndiozão", "floresta em chamas",
        "terra queimada", "chamas altas", "fogo na mata", "incêndio criminoso",
        "fumaça sufocante", "mata em chamas", "fogo alastrando", "incêndio de grandes proporções",
        "vegetação pegando fogo", "cheiro de queimado", "fogo em pastagem", "incêndio em reserva"
    ],
    "vulcao": [
        "vulcão", "erupção vulcânica", "explosão vulcânica", "atividade vulcânica",
        "cinzas vulcânicas", "lava", "fluxo piroclástico", "erupção de vulcão",
        "vulcão ativo", "vulcão em erupção", "montanha de fogo", "desabamento vulcânico",
        "gases vulcânicos", "atividade sísmica vulcânica", "erupção de cinzas",
        "vulcão soltando fumaça", "montanha cuspindo fogo", "lava descendo", "vulcão tá bravo", 
        "vulcão acordou", "caldeira borbulhando", "montanha explodindo", "fumaça do vulcão",
        "lava escorrendo", "cinzas caindo", "vulcão ativo", "barulho do vulcão",
        "gigante adormecido despertou", "cratera em fúria", "nuvem de cinzas", "monte vulcânico"
    ],
    "deslizamento": [
        "deslizamento", "desmoronamento", "queda de barreira", "movimento de massa",
        "deslizamento de terra", "erosão", "encosta cedendo", "soterramento",
        "risco de deslizamento", "solo instável", "barreira caindo", "terra cedendo",
        "fluxo de detritos", "massa de solo", "deslizamento rochoso", "terra caindo", 
        "barranco desabando", "morro descendo", "lama escorregando", "terra rolando", 
        "solo instável", "pedra rolando", "encosta desabando", "lamaçal", "terra movediça",
        "soterramento de residências", "talude caindo", "pedras rolando", "terra engolindo",
        "risco de soterramento", "movimento do solo"
    ],
    "tempestade": [
        "tempestade", "temporal", "chuva forte", "chuva intensa", "vendaval",
        "granizo", "raios", "trovoada", "tempestade severa", "vento forte",
        "chuva com vento", "tempestade elétrica", "chuva de granizo",
        "microexplosão", "vento ciclônico", "chuvarada", "pau d'água", 
        "temporalzão", "muita chuva", "chuva com vento forte", "granizo pra valer", 
        "raios e trovões", "céu desabou", "chuva torrencial", "chuva violenta",
        "chuva sem parar", "vento uivante", "trovão alto", "relâmpago forte",
        "tempestade de verão", "vendaval que arranca telhado", "chuva de granito",
        "trovoada pesada", "céu caindo", "vento arrasador", "chuva de vento e raio"
    ],
    "nao_classificado": [
        "evento desconhecido", "problema geral", "situação atípica", 
        "alerta genérico", "ocorrência não especificada", "incidente diverso",
        "algo estranho acontecendo", "bagunça", "b.o.", "perigo", "situação indefinida",
        "alerta sem detalhes", "acontecimento estranho", "coisa ruim", "problema na área",
        "situação esquisita", "alerta geral", "confusão", "problema inesperado",
        "situação complicada", "evento incerto", "alerta misterioso", "algo fora do normal",
        "situação sem explicação", "coisa estranha", "alerta bizarro", "problema de difícil identificação",
        "sem informações precisas", "desconhecido na área", "incidente sem categoria",
        "situação incomum", "alerta não especificado", "evento sem descrição",
        "fenômeno sem nome", "anomalia detectada", "informação incompleta"
    ]
}

# 5. Definição de sinônimos para o dataset de validação
disaster_synonyms_validation = {
    "seca": [
        "estiagem prolongada", "falta de chuva", "crise de água", "aridez extrema",
        "solo seco", "período árido", "escassez de água", "déficit pluviométrico",
        "terra árida", "clima seco", "estiagem severa", "falta de umidade",
        "seca brava", "estiagem sem fim", "terra rachada de vez", "sem gota d'água",
        "seca desgraçada", "rio seco", "planta morrendo", "choveu nada",
        "reservatório vazio", "situação hídrica crítica", "água sumindo", "seca de lascar",
        "terras áridas", "verão muito seco"
    ],
    "ciclone": [
        "tempestade ciclônica", "furacão tropical", "tufão violento", "ciclone marítimo",
        "ventos intensos", "tormenta", "ciclone costeiro", "tempestade", "ventania",
        "ciclone extremo", "sistema ciclônico", "ventos devastadores",
        "ventania absurda", "ciclone pesado", "vento que varre", "furacão da pesada",
        "vento louco", "vendaval terrível", "ciclone doido", "destruição pelo vento",
        "rajadas de vento fortíssimas", "vento de arrancar", "tempestade de vento",
        "vortex gigante", "ciclone assustador"
    ],
    "terremoto": [
        "abalo terrestre", "sismo forte", "tremor sísmico", "movimento sísmico",
        "terremoto violento", "sismo devastador", "tremor intenso", "choque sísmico",
        "atividade telúrica", "sismo moderado", "ruptura do solo",
        "chão balançando muito", "terra tremeu forte", "sacudida geral", "abalo gigante",
        "tremedeira forte", "casa tremendo", "paredes rachando", "sismo violento",
        "tremor no chão", "abalo sísmico grave", "terra treme", "solo sacudindo",
        "sismo profundo", "vibração terrestre"
    ],
    "desastre_hidrico": [
        "inundação urbana", "cheia de rio", "alagamento severo", "enchente forte",
        "transbordo de córrego", "inundação costeira", "chuva torrencial", "maré de tempestade",
        "alagamento repentino", "enxurrada forte", "rio transborda", "inundação grave",
        "rua submersa", "água até o pescoço", "alagou tudo", "rio passando do limite",
        "cidade debaixo d'água", "alagamento monstro", "chuva sem fim", "barragem estourou",
        "dilúvio na cidade", "água subindo rápido", "bairro alagado", "corredeira na rua",
        "nível da água alto", "rios cheios", "situação de alagamento"
    ],
    "queimada": [
        "fogo florestal", "incêndio em floresta", "queima descontrolada", "fogo em vegetação",
        "incêndio de mata", "chamas intensas", "fogo rural", "queimada de grandes proporções",
        "incêndio em área verde", "fumaça densa", "destruição florestal",
        "incêndio fora de controle", "fogo com força", "mato em chamas", "floresta virando cinza",
        "fogo incontrolável", "incêndio gigante", "cheiro de fumaça", "cinzas voando",
        "chamas consumindo", "mata em chamas", "incêndio em lavoura", "fogo desgovernado",
        "incêndio devastador", "fumaça tóxica"
    ],
    "vulcao": [
        "erupção de lava", "vulcão em atividade", "explosão de cinzas", "atividade vulcânica intensa",
        "vulcão explosivo", "fluxo de lava", "erupção violenta", "cinzas vulcânicas densas",
        "vulcão em erupção", "montanha vulcânica", "gases de erupção",
        "vulcão cuspindo lava", "montanha explodindo", "muita fumaça do vulcão", "vulcão em fúria",
        "lava escorrendo", "cinzas caindo", "vulcão ativo", "barulho do vulcão",
        "montanha de fogo despertando", "fluxo piroclástico avança", "vulcão soltando rocha",
        "cinzas vulcânicas", "erupção de proporções"
    ],
    "deslizamento": [
        "desmoronamento de encosta", "queda de terra", "deslizamento de solo", "soterramento de área",
        "movimento de terra", "desabamento de barreira", "erosão de encosta", "deslizamento grave",
        "instabilidade de solo", "desmoronamento rochoso", "fluxo de lama",
        "terra desabando", "morro caindo", "barranco veio abaixo", "lama pra todo lado",
        "encosta caindo", "pedra desprendendo", "casa soterrada", "terreno cedendo",
        "terra deslizando", "desmoronamento de rochas", "lama escorrendo", "barranco ruindo",
        "encosta perigosa", "risco de movimento de massa"
    ],
    "tempestade": [
        "chuva violenta", "temporal forte", "vendaval intenso", "trovoada severa",
        "tempestade com raios", "chuva de granizo forte", "ventania severa", "tormenta elétrica",
        "tempestade intensa", "ventos fortes", "chuva pesada",
        "temporal de rachar", "chuva que não para", "vendaval assustador", "muita trovoada",
        "chuva de balde", "vento destruidor", "raios e trovões", "céu escuro",
        "chuva torrencial", "vento que derruba árvores", "trovões e relâmpagos", "clima adverso",
        "granizo grande", "rajada de vento forte"
    ],
    "nao_classificado": [
        "problema não identificado", "alerta genérico", "situação estranha",
        "incidente sem detalhes", "ocorrência indefinida", "algo aconteceu",
        "não sei o que é", "confusão", "perigo geral", "alerta de algo",
        "situação bizarra", "alerta vago", "coisa doida", "problema de difícil identificação",
        "sem informações precisas", "desconhecido na área", "incidente sem categoria",
        "situação incomum", "alerta não especificado", "evento sem descrição",
        "fenômeno estranho", "coisa sem nexo", "informação ruim"
    ]
}

# 6. Função para gerar templates dinâmicos com posições aleatórias
def generate_dynamic_template(location_message_type: str) -> str:
    """
    Gera um template de mensagem com ordem aleatória dos elementos.
    Args:
        location_message_type: 'both_present', 'city_only', 'latlon_only', 'neither_present'
    Returns:
        str: Template com placeholders para {sinonimo}, {intensidade}, {cidade}, {estado}, {pais}, {latitude}, {longitude}, {area_km2}
    """
    blocks = {
        "sinonimo": [
            "Alerta de {sinonimo}",
            "Ocorrência de {sinonimo}",
            "{sinonimo} detectado",
            "Evento: {sinonimo}",
            "Cuidado com {sinonimo}",
            "Aviso de {sinonimo}",
            "Registrado {sinonimo}",
            "Notificação: {sinonimo}",
            "Emergência por {sinonimo}",
            "{sinonimo} em curso"
        ],
        "intensidade": [
            "{intensidade}",
            "com intensidade {intensidade}",
            "de nível {intensidade}",
            "{intensidade} impacto",
            "nível {intensidade}",
            "classificado como {intensidade}"
        ],
        "cidade_estado": [
            "em {cidade}, {estado}",
            "na cidade de {cidade}/{estado}",
            "localizado em {cidade}, {estado}",
            "{cidade}, {estado}",
            "em {cidade}, no estado de {estado}",
            "região de {cidade}, {estado}"
        ],
        "latlon": [
            "(Lat: {latitude}, Lon: {longitude})",
            "coordenadas {latitude}/{longitude}",
            "em {latitude}, {longitude}",
            "ponto {latitude}, {longitude}",
            "lat/lon: {latitude}/{longitude}",
            "posição: {latitude}, {longitude}"
        ],
        "area": [
            "Área afetada: {area_km2} km²",
            "Impacto em {area_km2} km²",
            "Abrangência: {area_km2} km²",
            "{area_km2} km² afetados",
            "Área de {area_km2} km²",
            "Extensão: {area_km2} km²"
        ],
        "filler": [
            "Atenção!",
            "Urgente!",
            "Defesa Civil informa:",
            "⚠️ Alerta máximo!",
            "Comunicado oficial:",
            "Cuidado!",
            "Fiquem atentos:",
            "Notícia importante:",
            "Emergência declarada:",
            ""
        ]
    }

    selected_blocks = []
    if location_message_type == "both_present":
        selected_blocks = [
            random.choice(blocks["sinonimo"]),
            random.choice(blocks["intensidade"]),
            random.choice(blocks["cidade_estado"]),
            random.choice(blocks["latlon"]),
            random.choice(blocks["area"]),
            random.choice(blocks["filler"])
        ]
    elif location_message_type == "city_only":
        selected_blocks = [
            random.choice(blocks["sinonimo"]),
            random.choice(blocks["intensidade"]),
            random.choice(blocks["cidade_estado"]),
            random.choice(blocks["area"]),
            random.choice(blocks["filler"])
        ]
    elif location_message_type == "latlon_only":
        selected_blocks = [
            random.choice(blocks["sinonimo"]),
            random.choice(blocks["intensidade"]),
            random.choice(blocks["latlon"]),
            random.choice(blocks["area"]),
            random.choice(blocks["filler"])
        ]
    elif location_message_type == "neither_present":
        selected_blocks = [
            random.choice(blocks["sinonimo"]),
            random.choice(blocks["intensidade"]),
            random.choice(blocks["area"]),
            random.choice(blocks["filler"])
        ]

    random.shuffle(selected_blocks)
    filler = selected_blocks.pop() if selected_blocks[-1] else ""
    if filler and random.random() < 0.5:
        template = f"{filler} {' '.join(selected_blocks)}"
    else:
        template = f"{' '.join(selected_blocks)} {filler}".strip()
    
    return template

# 7. Função para gerar a mensagem com base no tipo de localização
def gerar_mensagem(sinonimo: str, cidade: str, estado: str, pais: str, latitude: float, longitude: float, 
                   intensidade: str, area_km2: int, location_message_type: str) -> str:
    """
    Gera uma mensagem com base em um template dinâmico.
    Args:
        sinonimo, cidade, estado, pais, latitude, longitude, intensidade, area_km2: Valores para preencher o template
        location_message_type: 'both_present', 'city_only', 'latlon_only', 'neither_present'
    Returns:
        str: Mensagem formatada
    """
    lat_str = f"{latitude:.4f}" if latitude is not None else "desconhecida"
    lon_str = f"{longitude:.4f}" if longitude is not None else "desconhecida"
    
    template = generate_dynamic_template(location_message_type)
    
    try:
        mensagem = template.format(
            sinonimo=sinonimo,
            cidade=cidade,
            estado=estado,
            pais=pais,
            latitude=lat_str,
            longitude=lon_str,
            intensidade=intensidade,
            area_km2=area_km2
        )
    except KeyError:
        mensagem = f"Evento {sinonimo} {intensidade}. Área: {area_km2} km²."
    
    return mensagem

# 8. Possíveis níveis de impacto com cores, área e sinônimos de intensidade
impact_data = {
    "baixo": {
        "cor": "green",
        "area_km2_min": 1,
        "area_km2_max": 10,
        "sinonimos_intensidade": ["pequeno", "leve", "incipiente", "reduzido", "baixo", "mínimo", "localizado", "controlado", "suave", "discreto", "pouco", "fraco", "ínfimo"]
    },
    "moderado": {
        "cor": "orange",
        "area_km2_min": 11,
        "area_km2_max": 100,
        "sinonimos_intensidade": ["moderado", "considerável", "significativo", "médio", "regular", "importante", "parcial", "notável", "apreciável", "médio", "razoável", "contido", "perceptível"]
    },
    "alto": {
        "cor": "red",
        "area_km2_min": 101,
        "area_km2_max": 5000,
        "sinonimos_intensidade": ["grande", "severo", "extremo", "grave", "intenso", "devastador", "crítico", "total", "generalizado", "alarmante", "urgente", "massivo", "forte", "extensa", "violento"]
    }
}

# 9. Função auxiliar para gerar dataset
def generate_dataset(
    target_examples: int, 
    use_synonyms: dict, 
    dataset_name: str = "Dataset", 
    inconsistency_chance: float = 0.08, 
    unclassified_chance: float = 0.05,
    missing_latlon_chance: float = 0.02,
    both_present_chance: float = 0.60,
    city_only_chance: float = 0.15,
    latlon_only_chance: float = 0.15,
    neither_present_chance: float = 0.10,
    message_noise_chance: float = 0.15
) -> list:
    dataset = []
    
    if not locations:
        print(f"⚠️ Aviso: Nenhuma localidade disponível para gerar o {dataset_name}. Retornando dataset vazio.")
        return []
    
    real_disaster_categories = [k for k in use_synonyms.keys() if k != "nao_classificado"]
    unclassified_synonyms_exist = "nao_classificado" in use_synonyms and use_synonyms["nao_classificado"]

    print(f"Gerando {dataset_name} com {target_examples} registros esperados.")

    num_unclassified = int(target_examples * unclassified_chance)
    num_real_disasters = target_examples - num_unclassified

    real_category_counts = {}
    if real_disaster_categories:
        base_per_category = num_real_disasters // len(real_disaster_categories)
        remainder = num_real_disasters % len(real_disaster_categories)
        for i, category in enumerate(real_disaster_categories):
            real_category_counts[category] = base_per_category + (1 if i < remainder else 0)

    current_unclassified_count = 0
    current_real_disaster_counts = {cat: 0 for cat in real_disaster_categories}
    
    while len(dataset) < target_examples:
        loc = random.choice(locations)
        
        cidade = loc["cidade"]
        estado = loc["estado"]
        pais = loc["pais"]
        continente = loc["continente"]

        record_lat = loc["latitude"]
        record_lon = loc["longitude"]
        if random.random() < missing_latlon_chance:
            record_lat = None
            record_lon = None

        rand_loc_type = random.random()
        location_message_type = "both_present"
        if rand_loc_type < neither_present_chance:
            location_message_type = "neither_present"
        elif rand_loc_type < (neither_present_chance + latlon_only_chance):
            location_message_type = "latlon_only"
        elif rand_loc_type < (neither_present_chance + latlon_only_chance + city_only_chance):
            location_message_type = "city_only"

        is_unclassified_example = False
        if unclassified_synonyms_exist and current_unclassified_count < num_unclassified:
            is_unclassified_example = True
        elif real_disaster_categories:
            available_real_categories = [
                cat for cat in real_disaster_categories 
                if current_real_disaster_counts[cat] < real_category_counts[cat]
            ]
            if not available_real_categories:
                if unclassified_synonyms_exist and current_unclassified_count < num_unclassified:
                    is_unclassified_example = True
                else:
                    categoria = random.choice(real_disaster_categories)
            else:
                categoria = random.choice(available_real_categories)
        else:
            print("❌ Erro: Não há categorias de desastre para gerar dados.")
            break

        if is_unclassified_example:
            categoria = "nao_classificado"
            if random.random() < 0.6:
                sinonimo = generate_random_noise_message()
            else:
                sinonimo = random.choice(use_synonyms["nao_classificado"])
            
            impacto_nivel = random.choice(["baixo", "moderado"])
            dados_impacto = impact_data[impacto_nivel]
            cor_impacto = dados_impacto["cor"]
            area_km2 = random.randint(dados_impacto["area_km2_min"], dados_impacto["area_km2_max"])
            sinonimo_intensidade = random.choice(dados_impacto["sinonimos_intensidade"])
            current_unclassified_count += 1
        else:
            categoria = random.choice(real_disaster_categories)
            sinonimo = random.choice(use_synonyms[categoria])
            impacto_nivel = random.choice(list(impact_data.keys()))
            dados_impacto = impact_data[impacto_nivel]
            cor_impacto = dados_impacto["cor"]
            area_km2 = random.randint(dados_impacto["area_km2_min"], dados_impacto["area_km2_max"])
            sinonimo_intensidade = random.choice(dados_impacto["sinonimos_intensidade"])
            if random.random() < inconsistency_chance:
                other_levels = [n for n in impact_data.keys() if n != impacto_nivel]
                if other_levels:
                    inconsistent_level_for_synonym = random.choice(other_levels)
                    sinonimo_intensidade = random.choice(impact_data[inconsistent_level_for_synonym]["sinonimos_intensidade"])
            current_real_disaster_counts[categoria] += 1

        mensagem = gerar_mensagem(sinonimo, cidade, estado, pais, record_lat, record_lon, 
                                  sinonimo_intensidade, area_km2, location_message_type)
        
        if random.random() < message_noise_chance:
            mensagem = apply_message_noise(mensagem)

        registro = {
            "mensagem": mensagem,
            "categoria": categoria,
            "sinonimo_disparador": sinonimo,
            "idioma": "pt",
            "continente": continente,
            "pais": pais,
            "estado": estado,
            "cidade": cidade,
            "latitude": record_lat,
            "longitude": record_lon,
            "impacto_nivel": impacto_nivel,
            "impacto_cor": cor_impacto,
            "impacto_area_km2": area_km2,
            "impacto_sinonimo_intensidade": sinonimo_intensidade
        }
        dataset.append(registro)
    
    return dataset[:target_examples]

# 10. Carregar as localidades
json_file = "brazil_states_cities_geocoded.json"
locations = load_brazilian_cities_from_json(json_file)

# 11. Parâmetros de volume
TARGET_TRAIN_EXAMPLES = 3200000
TARGET_VALIDATION_EXAMPLES = 1550000

# 12. Gerar o dataset de treinamento
print("\n--- Gerando Dataset de Treinamento ---")
dataset_train_raw = generate_dataset(
    TARGET_TRAIN_EXAMPLES,
    disaster_synonyms_train,
    dataset_name="Dataset de Treinamento",
    inconsistency_chance=0.08,
    unclassified_chance=0.05,
    missing_latlon_chance=0.02,
    both_present_chance=0.60,
    city_only_chance=0.15,
    latlon_only_chance=0.15,
    neither_present_chance=0.10,
    message_noise_chance=0.15
)
df_train = pd.DataFrame(dataset_train_raw)

# 13. Gerar o dataset de validação
print("\n--- Gerando Dataset de Validação ---")
dataset_validation_raw = generate_dataset(
    TARGET_VALIDATION_EXAMPLES,
    disaster_synonyms_validation,
    dataset_name="Dataset de Validação",
    inconsistency_chance=0.12,
    unclassified_chance=0.10,
    missing_latlon_chance=0.05,
    both_present_chance=0.50,
    city_only_chance=0.20,
    latlon_only_chance=0.20,
    neither_present_chance=0.10,
    message_noise_chance=0.25
)
df_validation = pd.DataFrame(dataset_validation_raw)

# 14. Ordenar colunas
colunas_ordenadas = [
    "mensagem",
    "categoria",
    "sinonimo_disparador",
    "idioma",
    "continente",
    "pais",
    "estado",
    "cidade",
    "latitude",
    "longitude",
    "impacto_nivel",
    "impacto_cor",
    "impacto_area_km2",
    "impacto_sinonimo_intensidade"
]

# 15. Salvando Datasets
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