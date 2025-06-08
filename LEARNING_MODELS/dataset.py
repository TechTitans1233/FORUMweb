import pandas as pd

# 1) Definição de sinônimos (em múltiplos idiomas) para cada categoria de desastre
disaster_synonyms = {
    "seca": [
        # Português
        "seca", "estiaje", "escassez", "aridez", "estio",
        # Inglês
        "drought", "dry spell", "aridity",
        # Espanhol
        "sequía", "seca extrema", "adicto al agua",
        # Francês
        "sécheresse", "étiolement",
        # Indonésio/Malaio
        "kekeringan", "kemarau"
    ],
    "ciclone": [
        # Português
        "ciclone", "tempestade tropical", "tufão", "furacão",
        # Inglês
        "cyclone", "tropical storm", "hurricane", "typhoon",
        # Espanhol
        "ciclón", "huracán", "tifón",
        # Francês
        "cyclone tropical", "ouragan", "typhon",
        # Indonésio/Malaio
        "siklon", "topan"
    ],
    "terremoto": [
        # Português
        "terremoto", "sismo", "tremor", "abalo sísmico",
        # Inglês
        "earthquake", "seismic shock", "tremor",
        # Espanhol
        "terremoto", "sismo fuerte", "temblor",
        # Francês
        "tremblement de terre", "séisme", "secousse",
        # Indonésio/Malaio
        "gempa bumi", "gempa", "guncangan"
    ],
    "enchente": [
        # Português
        "enchente", "alagamento", "inundação", "inundações",
        # Inglês
        "flood", "inundation", "flash flood",
        # Espanhol
        "inundación", "corriente de agua", "riada",
        # Francês
        "inondation", "crue", "dégringolade",
        # Indonésio/Malaio
        "banjir", "luapan air"
    ],
    "queimada": [
        # Português
        "queimada", "incêndio florestal", "fogo", "fogaréu",
        # Inglês
        "wildfire", "forest fire", "bushfire",
        # Espanhol
        "incendio forestal", "fuego descontrolado", "quemazón",
        # Francês
        "feu de forêt", "incendie", "brasier",
        # Indonésio/Malaio
        "kebakaran hutan", "kebakaran lahan"
    ],
    "vulcao": [
        # Português
        "vulcão", "erupção vulcânica", "explosão vulcânica",
        # Inglês
        "volcano", "volcanic eruption", "volcanic blast",
        # Espanhol
        "volcán", "erupción volcánica", "erupción",
        # Francês
        "volcan", "éruption volcanique", "explosion volcanique",
        # Indonésio/Malaio
        "gunung berapi", "erupsi"
    ]
}

# 2) Definição de uma lista abrangente de localidades (continente, país, estado/região, cidade e coordenadas)
#    Aqui, apenas como amostra, inclui-se uma seleção de cidades em vários continentes. Você pode
#    estender adicionando quantas quiser (países, estados, províncias, mais cidades etc.).

locations = [
    # América do Sul
    {"continente": "América do Sul", "pais": "Brasil",          "estado": "São Paulo",     "cidade": "São Paulo",        "latitude": -23.55052, "longitude": -46.63331},
    {"continente": "América do Sul", "pais": "Brasil",          "estado": "Pernambuco",    "cidade": "Recife",           "latitude": -8.04756,  "longitude": -34.877},
    {"continente": "América do Sul", "pais": "Colômbia",        "estado": "Atlántico",     "cidade": "Barranquilla",     "latitude": 10.96854,  "longitude": -74.78132},
    {"continente": "América do Sul", "pais": "Argentina",       "estado": "Buenos Aires",  "cidade": "Buenos Aires",     "latitude": -34.60372, "longitude": -58.38159},
    {"continente": "América do Sul", "pais": "Chile",           "estado": "Região Metropolitana", "cidade": "Santiago",    "latitude": -33.44889, "longitude": -70.66927},

    # América do Norte
    {"continente": "América do Norte", "pais": "Estados Unidos", "estado": "Califórnia",    "cidade": "Los Angeles",     "latitude": 34.05223,  "longitude": -118.24368},
    {"continente": "América do Norte", "pais": "Estados Unidos", "estado": "Arizona",       "cidade": "Phoenix",         "latitude": 33.44838,  "longitude": -112.07404},
    {"continente": "América do Norte", "pais": "México",         "estado": "Nuevo León",    "cidade": "Monterrey",       "latitude": 25.68661,  "longitude": -100.31612},
    {"continente": "América do Norte", "pais": "Canadá",         "estado": "Ontário",       "cidade": "Toronto",         "latitude": 43.65107,  "longitude": -79.347015},
    {"continente": "América do Norte", "pais": "Estados Unidos", "estado": "Texas",         "cidade": "Houston",         "latitude": 29.76043,  "longitude": -95.3698},

    # Europa
    {"continente": "Europa",          "pais": "França",         "estado": "Provence-Alpes-Côte d'Azur", "cidade": "Marselha",   "latitude": 43.29648,  "longitude": 5.36978},
    {"continente": "Europa",          "pais": "França",         "estado": "Provence-Alpes-Côte d'Azur", "cidade": "Nice",       "latitude": 43.71017,  "longitude": 7.26195},
    {"continente": "Europa",          "pais": "Reunião",        "estado": "Reunião",       "cidade": "Saint-Denis",      "latitude": -20.87891, "longitude": 55.44813},
    {"continente": "Europa",          "pais": "Espanha",        "estado": "Ilhas Canárias", "cidade": "La Palma (Cumbre Vieja)", "latitude": 28.5700, "longitude": -17.8400},
    {"continente": "Europa",          "pais": "Reino Unido",    "estado": "Inglaterra",    "cidade": "Londres",         "latitude": 51.50735,  "longitude": -0.127758},

    # Ásia
    {"continente": "Ásia",            "pais": "Índia",          "estado": "Gujarat",       "cidade": "Ahmedabad",       "latitude": 23.02251,  "longitude": 72.57136},
    {"continente": "Ásia",            "pais": "Japão",          "estado": "Tóquio",        "cidade": "Tóquio",          "latitude": 35.68949,  "longitude": 139.69171},
    {"continente": "Ásia",            "pais": "Indonésia",      "estado": "Oeste de Java", "cidade": "Jacarta",         "latitude": -6.20876,  "longitude": 106.8456},
    {"continente": "Ásia",            "pais": "Filipinas",      "estado": "Luzon",         "cidade": "Manila",          "latitude": 14.59951,  "longitude": 120.98422},
    {"continente": "Ásia",            "pais": "Nepal",          "estado": "Bagmati",       "cidade": "Kathmandu",       "latitude": 27.71725,  "longitude": 85.32396},

    # África
    {"continente": "África",          "pais": "Nigéria",        "estado": "Lagos",         "cidade": "Lagos",           "latitude": 6.52438,   "longitude": 3.37921},
    {"continente": "África",          "pais": "Níger",          "estado": "Niamey",        "cidade": "Niamey",          "latitude": 13.51253,  "longitude": 2.11265},
    {"continente": "África",          "pais": "Quênia",         "estado": "Nairobi",       "cidade": "Nairobi",         "latitude": -1.29207,  "longitude": 36.82193},
    {"continente": "África",          "pais": "África do Sul",  "estado": "Gauteng",       "cidade": "Pretória",        "latitude": -25.74787, "longitude": 28.22927},
    {"continente": "África",          "pais": "Indonésia",      "estado": "Reunião",       "cidade": "Piton de la Fournaise", "latitude": -21.2448, "longitude": 55.70889},  # Vulcão

    # Oceania
    {"continente": "Oceania",         "pais": "Austrália",      "estado": "Nova Gales do Sul", "cidade": "Sydney",      "latitude": -33.86882, "longitude": 151.2093},
    {"continente": "Oceania",         "pais": "Austrália",      "estado": "Colúmbia Britânica", "cidade": "Brisbane",    "latitude": -27.46977, "longitude": 153.02513},
    {"continente": "Oceania",         "pais": "Fiji",           "estado": "Central",       "cidade": "Suva",           "latitude": -18.1248,  "longitude": 178.4501},
    {"continente": "Oceania",         "pais": "Nova Zelândia",  "estado": "Wellington",    "cidade": "Wellington",     "latitude": -41.28646, "longitude": 174.77623},
    {"continente": "Oceania",         "pais": "Indonésia",      "estado": "Sulawesi do Norte", "cidade": "Manado",     "latitude": 1.4748,    "longitude": 124.8428},
]

# 3) Geração de mensagens de exemplo automáticas
#    Para cada combinação [categoria → cada sinônimo] × [cada localidade da lista], monta-se uma mensagem genérica.
#    Você pode customizar esse template de "mensagem" para incluir construções em diferentes línguas, se desejar.

def gerar_mensagem(sinonimo: str, cidade: str, pais: str, idioma: str) -> str:
    """
    Retorna uma mensagem de exemplo combinando sinônimo de desastre + localização.
    Se quiser suportar mais idiomas, inclua condições adicionais aqui.
    """
    # Detectar idioma básico pela presença de acentos ou pelas listas de sinônimos (simplifica o exemplo)
    if idioma == "pt":
        return f"Alerta: {sinonimo} em {cidade}, {pais}."
    elif idioma == "en":
        return f"Alert: {sinonimo} in {cidade}, {pais}."
    elif idioma == "es":
        return f"Alerta: {sinonimo} en {cidade}, {pais}."
    elif idioma == "fr":
        return f"Alerte : {sinonimo} à {cidade}, {pais}."
    elif idioma == "id":
        return f"Peringatan: {sinonimo} di {cidade}, {pais}."
    else:
        return f"{sinonimo} em {cidade}, {pais}."

# 4) Mapeamento de sinônimos para idioma (bastante simplificado, mas você pode estender)
#    O objetivo é ter uma forma de saber em qual idioma está cada sinônimo.
idioma_por_sinonimo = {}
for category, sinonimos in disaster_synonyms.items():
    for s in sinonimos:
        s_lower = s.lower()
        # Heurística bem simples: se contém acentos agudos comuns em português ou espanhol → pt/es; 
        # se tiver 'drought', 'hurricane' → en; 'sécheresse','inondation' → fr; etc.
        if any(x in s_lower for x in ["sécher", "inond", "ouragan", "typhon"]):
            idioma_por_sinonimo[s] = "fr"
        elif any(x in s_lower for x in ["drought", "cyclone", "hurricane", "flood", "earthquake", "wildfire", "volcano"]):
            idioma_por_sinonimo[s] = "en"
        elif any(x in s_lower for x in ["sequía", "huracán", "inundación", "temblor", "incendio", "volcán"]):
            idioma_por_sinonimo[s] = "es"
        elif any(x in s_lower for x in ["kekeringan", "siklon", "gempa", "banjir", "kebakaran", "gunung"]):
            idioma_por_sinonimo[s] = "id"
        else:
            # Por padrão, assume português se não identificou outro
            idioma_por_sinonimo[s] = "pt"

# 5) Possíveis níveis de impacto (pode ser aleatório ou ciclar)
impact_levels = ["baixo", "moderado", "alto", "catastrófico"]

# 6) Montagem do dataset final
dataset_expanded = []
for categoria, sinonimos in disaster_synonyms.items():
    for sinonimo in sinonimos:
        idioma = idioma_por_sinonimo.get(sinonimo, "pt")
        for loc in locations:
            cidade = loc["cidade"]
            pais = loc["pais"]
            lat = loc["latitude"]
            lon = loc["longitude"]
            continente = loc["continente"]
            estado = loc["estado"]
            # Gera a mensagem no idioma adequado
            mensagem = gerar_mensagem(sinonimo, cidade, pais, idioma)
            # Para variar um pouco, simplesmente escolhemos impacto baseado em posição de índice
            # (por exemplo, ciclo pelos níveis de impacto conforme combinamos itens)
            impacto = impact_levels[(hash(sinonimo + cidade) % len(impact_levels))]

            registro = {
                "mensagem": mensagem,
                "categoria": categoria,
                "sinonimo": sinonimo,
                "idioma": idioma,
                "continente": continente,
                "pais": pais,
                "estado": estado,
                "cidade": cidade,
                "latitude": lat,
                "longitude": lon,
                "impacto": impacto
            }
            dataset_expanded.append(registro)

# 7) Criação do DataFrame e salvamento em CSV (UTF-8)
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
df_expanded.to_csv("dataset_multilingue_localizado_expandido.csv", index=False, encoding="utf-8")
print("✅ Arquivo 'dataset_multilingue_localizado_expandido.csv' salvo com sucesso.")
