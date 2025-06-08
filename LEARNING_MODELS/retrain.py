import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import joblib

# ----------------------------------------------------------
# 1) Definição de sinônimos (múltiplos idiomas) para cada categoria
# ----------------------------------------------------------
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
        "temblor", "sismo fuerte",
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

# ----------------------------------------------------------
# 2) Lista de localidades (continente, país, estado, cidade, lat/lon)
#    Acrescente outras cidades/regiões conforme necessidade.
# ----------------------------------------------------------
locations = [
    # América do Sul
    {"continente": "América do Sul", "pais": "Brasil",      "estado": "São Paulo",             "cidade": "São Paulo",       "latitude": -23.55052,  "longitude": -46.63331},
    {"continente": "América do Sul", "pais": "Brasil",      "estado": "Pernambuco",            "cidade": "Recife",          "latitude": -8.04756,    "longitude": -34.877},
    {"continente": "América do Sul", "pais": "Colômbia",    "estado": "Atlántico",             "cidade": "Barranquilla",    "latitude": 10.96854,    "longitude": -74.78132},
    {"continente": "América do Sul", "pais": "Argentina",   "estado": "Buenos Aires",          "cidade": "Buenos Aires",    "latitude": -34.60372,   "longitude": -58.38159},
    {"continente": "América do Sul", "pais": "Chile",       "estado": "Região Metropolitana",  "cidade": "Santiago",        "latitude": -33.44889,   "longitude": -70.66927},

    # América do Norte
    {"continente": "América do Norte", "pais": "Estados Unidos", "estado": "Califórnia",    "cidade": "Los Angeles",   "latitude": 34.05223,    "longitude": -118.24368},
    {"continente": "América do Norte", "pais": "Estados Unidos", "estado": "Arizona",       "cidade": "Phoenix",       "latitude": 33.44838,    "longitude": -112.07404},
    {"continente": "América do Norte", "pais": "México",         "estado": "Nuevo León",    "cidade": "Monterrey",     "latitude": 25.68661,    "longitude": -100.31612},
    {"continente": "América do Norte", "pais": "Canadá",         "estado": "Ontário",       "cidade": "Toronto",       "latitude": 43.65107,    "longitude": -79.347015},
    {"continente": "América do Norte", "pais": "Estados Unidos", "estado": "Texas",         "cidade": "Houston",       "latitude": 29.76043,    "longitude": -95.3698},

    # Europa
    {"continente": "Europa", "pais": "França",      "estado": "PACA",       "cidade": "Marselha",         "latitude": 43.29648,    "longitude": 5.36978},
    {"continente": "Europa", "pais": "França",      "estado": "Provence",   "cidade": "Nice",             "latitude": 43.71017,    "longitude": 7.26195},
    {"continente": "Europa", "pais": "Reunião",     "estado": "Reunião",    "cidade": "Saint-Denis",      "latitude": -20.87891,   "longitude": 55.44813},
    {"continente": "Europa", "pais": "Espanha",     "estado": "Ilhas Canárias", "cidade": "La Palma",      "latitude": 28.5700,     "longitude": -17.8400},
    {"continente": "Europa", "pais": "Reino Unido", "estado": "Inglaterra", "cidade": "Londres",          "latitude": 51.50735,    "longitude": -0.127758},

    # Ásia
    {"continente": "Ásia", "pais": "Índia",       "estado": "Gujarat",      "cidade": "Ahmedabad",        "latitude": 23.02251,    "longitude": 72.57136},
    {"continente": "Ásia", "pais": "Japão",       "estado": "Tóquio",       "cidade": "Tóquio",           "latitude": 35.68949,    "longitude": 139.69171},
    {"continente": "Ásia", "pais": "Indonésia",   "estado": "Oeste de Java", "cidade": "Jacarta",         "latitude": -6.20876,    "longitude": 106.8456},
    {"continente": "Ásia", "pais": "Filipinas",   "estado": "Luzon",       "cidade": "Manila",           "latitude": 14.59951,    "longitude": 120.98422},
    {"continente": "Ásia", "pais": "Nepal",       "estado": "Bagmati",      "cidade": "Kathmandu",        "latitude": 27.71725,    "longitude": 85.32396},

    # África
    {"continente": "África", "pais": "Nigéria",       "estado": "Lagos",         "cidade": "Lagos",         "latitude": 6.52438,     "longitude": 3.37921},
    {"continente": "África", "pais": "Níger",         "estado": "Niamey",        "cidade": "Niamey",        "latitude": 13.51253,    "longitude": 2.11265},
    {"continente": "África", "pais": "Quênia",        "estado": "Nairobi",       "cidade": "Nairobi",       "latitude": -1.29207,    "longitude": 36.82193},
    {"continente": "África", "pais": "África do Sul", "estado": "Gauteng",       "cidade": "Pretória",      "latitude": -25.74787,   "longitude": 28.22927},
    {"continente": "África", "pais": "Reunião",       "estado": "Reunião",       "cidade": "Piton de la Fournaise", "latitude": -21.2448, "longitude": 55.70889},  # Vulcão

    # Oceania
    {"continente": "Oceania", "pais": "Austrália",      "estado": "Nova Gales do Sul",   "cidade": "Sydney",      "latitude": -33.86882,   "longitude": 151.2093},
    {"continente": "Oceania", "pais": "Austrália",      "estado": "Queensland",          "cidade": "Brisbane",    "latitude": -27.46977,   "longitude": 153.02513},
    {"continente": "Oceania", "pais": "Fiji",           "estado": "Central",             "cidade": "Suva",        "latitude": -18.1248,    "longitude": 178.4501},
    {"continente": "Oceania", "pais": "Nova Zelândia",  "estado": "Wellington",          "cidade": "Wellington",  "latitude": -41.28646,   "longitude": 174.77623},
    {"continente": "Oceania", "pais": "Indonésia",      "estado": "Sulawesi do Norte",   "cidade": "Manado",      "latitude": 1.4748,      "longitude": 124.8428},
]

# ----------------------------------------------------------
# 3) Função auxiliar para gerar mensagem de exemplo em cada idioma
# ----------------------------------------------------------
def gerar_mensagem(sinonimo: str, cidade: str, pais: str, idioma: str) -> str:
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

# ----------------------------------------------------------
# 4) Mapeamento simples de sinônimo → idioma
# ----------------------------------------------------------
idioma_por_sinonimo = {}
for cat, sinonimos in disaster_synonyms.items():
    for s in sinonimos:
        s_lower = s.lower()
        if any(x in s_lower for x in ["sécher", "inond", "ouragan", "typhon"]):
            idioma_por_sinonimo[s] = "fr"
        elif any(x in s_lower for x in ["drought", "cyclone", "hurricane", "flood", "earthquake", "wildfire", "volcano"]):
            idioma_por_sinonimo[s] = "en"
        elif any(x in s_lower for x in ["sequía", "huracán", "inundación", "temblor", "incendio", "volcán"]):
            idioma_por_sinonimo[s] = "es"
        elif any(x in s_lower for x in ["kekeringan", "siklon", "gempa", "banjir", "kebakaran", "gunung"]):
            idioma_por_sinonimo[s] = "id"
        else:
            idioma_por_sinonimo[s] = "pt"

# ----------------------------------------------------------
# 5) Lista de níveis de impacto
# ----------------------------------------------------------
impact_levels = ["baixo", "moderado", "alto", "catastrófico"]

# ----------------------------------------------------------
# 6) Função para expandir o dataset original antes do treinamento
# ----------------------------------------------------------
def expandir_dataset(df_original: pd.DataFrame) -> pd.DataFrame:
    """
    Recebe um DataFrame original (com colunas possivelmente 'mensagem', 'categoria',
    'localizacao', 'latitude', 'longitude', 'impacto') e retorna um DataFrame expandido
    combinando sinônimos e localidades definidas.
    """
    registros_expandidos = []

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

                # Monta a mensagem no idioma adequado
                mensagem = gerar_mensagem(sinonimo, cidade, pais, idioma)
                # Determina impacto de forma pseudo-aleatória (baseado em hash)
                impacto = impact_levels[(hash(sinonimo + cidade) % len(impact_levels))]

                registros_expandidos.append({
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
                })

    # Converte em DataFrame e retorna
    df_exp = pd.DataFrame(registros_expandidos)

    # Se desejar manter também o dataset original (por exemplo, com exemplos reais),
    # basta concatenar:
    # df_exp = pd.concat([df_original, df_exp], ignore_index=True)

    return df_exp

# ----------------------------------------------------------
# 7) Função para carregar dados (CSV) e expandir
# ----------------------------------------------------------
def load_and_expand_data(path="dataset_multilingue_localizado_expandido.csv"):
    """
    Carrega os dados originais do CSV e, em seguida, expande o dataset usando
    a função expandir_dataset. Retorna um DataFrame combinado.
    """
    # Carrega o CSV original (caso exista)
    try:
        df_original = pd.read_csv(path, encoding="utf-8")
        print(f"✅ Dataset original carregado com {len(df_original)} linhas.")
    except FileNotFoundError:
        print("⚠️ Arquivo não encontrado. Criando apenas a base expandida.")
        df_original = pd.DataFrame(columns=[
            "mensagem", "categoria", "sinonimo", "idioma",
            "continente", "pais", "estado", "cidade",
            "latitude", "longitude", "impacto"
        ])

    # Expande o dataset
    df_expandido = expandir_dataset(df_original)
    print(f"✅ Dataset expandido gerado com {len(df_expandido)} registros.")

    # Caso queira concatenar original + expandido, descomente a linha abaixo:
    # df_final = pd.concat([df_original, df_expandido], ignore_index=True)
    # Para treinar somente com o expandido, faça:
    df_final = df_expandido.reset_index(drop=True)

    # (Opcional) salva o expandido em arquivo
    df_final.to_csv("dataset_muito_expandido.csv", index=False, encoding="utf-8")
    print("✅ Arquivo 'dataset_muito_expandido.csv' salvo com sucesso.")

    return df_final

# ----------------------------------------------------------
# 8) Função de treinamento de modelos
# ----------------------------------------------------------
def train_models(df: pd.DataFrame):
    """
    Recebe DataFrame já expandido e treina pipelines de categoria, localização e impacto.
    """
    # Para este exemplo, usamos:
    # - X: coluna 'mensagem'
    # - y_categoria: coluna 'categoria'
    # - y_localizacao: combinaremos país + estado + cidade em uma string única
    # - y_impacto: coluna 'impacto'
    X = df["mensagem"]
    y_categoria = df["categoria"]

    # Concatena localização completa para treino de subtarefa de localização
    df["localizacao_full"] = df["cidade"] + ", " + df["estado"] + ", " + df["pais"]
    y_localizacao = df["localizacao_full"]

    y_impacto = df["impacto"]

    pipeline_categoria = Pipeline([
        ("tfidf", TfidfVectorizer()),
        ("clf", LogisticRegression(max_iter=1000))
    ])

    pipeline_localizacao = Pipeline([
        ("tfidf", TfidfVectorizer()),
        ("clf", LogisticRegression(max_iter=1000))
    ])

    pipeline_impacto = Pipeline([
        ("tfidf", TfidfVectorizer()),
        ("clf", LogisticRegression(max_iter=1000))
    ])

    print("Treinando modelo de categoria...")
    pipeline_categoria.fit(X, y_categoria)

    print("Treinando modelo de localização...")
    pipeline_localizacao.fit(X, y_localizacao)

    print("Treinando modelo de impacto...")
    pipeline_impacto.fit(X, y_impacto)

    return pipeline_categoria, pipeline_localizacao, pipeline_impacto

# ----------------------------------------------------------
# 9) Função para salvar os pipelines treinados
# ----------------------------------------------------------
def save_models(pipeline_categoria, pipeline_localizacao, pipeline_impacto):
    joblib.dump(pipeline_categoria, "modelo_categoria.pkl")
    joblib.dump(pipeline_localizacao, "modelo_localizacao.pkl")
    joblib.dump(pipeline_impacto, "modelo_impacto.pkl")
    print("✅ Modelos salvos com sucesso!")

# ----------------------------------------------------------
# 10) Função principal
# ----------------------------------------------------------
def main():
    print("🔄 Iniciando carregamento e expansão do dataset...")
    df_final = load_and_expand_data("dataset_multilingue_localizado_expandido.csv")

    print("🔄 Iniciando treinamento dos modelos com o dataset expandido...")
    model_cat, model_loc, model_imp = train_models(df_final)

    print("🔄 Salvando modelos treinados...")
    save_models(model_cat, model_loc, model_imp)

    print("🏁 Treinamento e salvamento concluídos.")

if __name__ == "__main__":
    main()
