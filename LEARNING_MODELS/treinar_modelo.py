import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier
import joblib
import json
import random
from scipy.spatial import cKDTree
from tqdm import tqdm
from collections import defaultdict

# --- Configurações ---
CHUNK_SIZE = 50000
MAX_FEATURES_EVENT_IMPACT = 10000
MAX_FEATURES_LOCATION = 20000

# --- Função para carregar cidades do JSON ---
def load_brazilian_cities_from_json(json_file_path):
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        cities_data = []
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
        print(f"❌ Erro: O arquivo '{json_file_path}' não foi encontrado.")
        return []
    except json.JSONDecodeError:
        print(f"❌ Erro: Não foi possível decodificar o arquivo JSON '{json_file_path}'.")
        return []
    except Exception as e:
        print(f"❌ Ocorreu um erro inesperado ao carregar o JSON: {e}")
        return []

# --- Função para gerar mensagens sintéticas ---
def generate_dynamic_template_synthetic(location_message_type: str) -> str:
    blocks = {
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
            random.choice(blocks["cidade_estado"]),
            random.choice(blocks["latlon"]),
            random.choice(blocks["filler"])
        ]
    elif location_message_type == "city_only":
        selected_blocks = [
            random.choice(blocks["cidade_estado"]),
            random.choice(blocks["filler"])
        ]
    elif location_message_type == "latlon_only":
        selected_blocks = [
            random.choice(blocks["latlon"]),
            random.choice(blocks["filler"])
        ]

    random.shuffle(selected_blocks)
    filler = selected_blocks.pop() if selected_blocks[-1] else ""
    if filler and random.random() < 0.5:
        template = f"{filler} {' '.join(selected_blocks)}"
    else:
        template = f"{' '.join(selected_blocks)} {filler}".strip()
    
    return template

def generate_synthetic_city_messages(cities_data, num_samples_per_city=20):
    messages = []
    city_labels = []
    state_labels = []
    for city_info in cities_data:
        city = city_info["cidade"]
        state = city_info["estado"]
        lat = city_info["latitude"]
        lon = city_info["longitude"]
        for _ in range(num_samples_per_city):
            location_message_type = random.choice(["both_present", "city_only", "latlon_only"])
            template = generate_dynamic_template_synthetic(location_message_type)
            lat_str = f"{lat:.4f}" if lat is not None else "desconhecida"
            lon_str = f"{lon:.4f}" if lon is not None else "desconhecida"
            try:
                message = template.format(
                    cidade=city,
                    estado=state,
                    latitude=lat_str,
                    longitude=lon_str
                )
            except KeyError:
                message = f"{city}, {state}"
            messages.append(message)
            city_labels.append(city)
            state_labels.append(state)
    return messages, city_labels, state_labels

# --- Carregar datasets ---
print("Carregando datasets...")
df_train = pd.read_csv("dataset_treinamento.csv")
print("Colunas do DataFrame de Treinamento:", df_train.columns.tolist())

if df_train.empty:
    raise ValueError("O dataset de treinamento está vazio. Verifique o arquivo CSV.")

# --- Carregar dados do JSON ---
json_file = "brazil_states_cities_geocoded.json"
cities_data = load_brazilian_cities_from_json(json_file)
if not cities_data:
    raise ValueError("Nenhuma localidade carregada do arquivo JSON.")

# --- Separar features e targets ---
X_train = df_train["mensagem"]
y_evento_train = df_train["categoria"]
y_impacto_train = df_train["impacto_nivel"]
y_local_train = df_train["cidade"].fillna("desconhecido")
y_estado_train = df_train["estado"].fillna("desconhecido")

# --- Criar pipelines ---
pipeline_evento = Pipeline([
    ("tfidf", TfidfVectorizer(max_features=MAX_FEATURES_EVENT_IMPACT, ngram_range=(1, 2))),
    ("clf", SGDClassifier(loss='log_loss', max_iter=1000, random_state=42))
])
pipeline_impacto = Pipeline([
    ("tfidf", TfidfVectorizer(max_features=MAX_FEATURES_EVENT_IMPACT, ngram_range=(1, 2))),
    ("clf", SGDClassifier(loss='log_loss', max_iter=1000, random_state=42))
])
pipeline_local = Pipeline([
    ("tfidf", TfidfVectorizer(max_features=MAX_FEATURES_LOCATION, ngram_range=(1, 2))),
    ("clf", SGDClassifier(loss='log_loss', max_iter=1000, random_state=42, warm_start=True))
])
pipeline_estado = Pipeline([
    ("tfidf", TfidfVectorizer(max_features=MAX_FEATURES_LOCATION, ngram_range=(1, 2))),
    ("clf", SGDClassifier(loss='log_loss', max_iter=1000, random_state=42, warm_start=True))
])

# --- Treinamento para Evento e Impacto ---
print("\n--- Treinando Modelo para Categoria de Evento ---")
pipeline_evento.fit(X_train, y_evento_train)

print("\n--- Treinando Modelo para Nível de Impacto ---")
pipeline_impacto.fit(X_train, y_impacto_train)

# --- Treinamento para Localização ---
print("\n--- Treinando Modelo para Localização (Cidade e Estado) ---")
all_cities = np.unique(np.concatenate([y_local_train.unique(), [city["cidade"] for city in cities_data], ["desconhecido"]]))
all_states = np.unique(np.concatenate([y_estado_train.unique(), [city["estado"] for city in cities_data], ["desconhecido"]]))
print(f"Total de classes de localização (cidades): {len(all_cities)}")
print(f"Total de classes de localização (estados): {len(all_states)}")

# Pré-treinamento com mensagens sintéticas
print("Gerando mensagens sintéticas para pré-treinamento...")
X_json, y_json_city, y_json_state = generate_synthetic_city_messages(cities_data, num_samples_per_city=20)

# Pré-treinamento para Cidade
tfidf_local = pipeline_local.named_steps['tfidf']
clf_local = pipeline_local.named_steps['clf']
X_json_tfidf = tfidf_local.fit_transform(X_json)
print("Iniciando pré-treinamento do SGDClassifier (Cidade) com dados do JSON...")
for i in range(0, len(X_json), CHUNK_SIZE):
    end_idx = min(i + CHUNK_SIZE, len(X_json))
    X_chunk = X_json_tfidf[i:end_idx]
    y_chunk = y_json_city[i:end_idx]
    print(f"    Processando chunk {i//CHUNK_SIZE + 1} de {len(X_json)//CHUNK_SIZE + (1 if len(X_json) % CHUNK_SIZE != 0 else 0)} ({i} a {end_idx})...")
    clf_local.partial_fit(X_chunk, y_chunk, classes=all_cities)

# Pré-treinamento para Estado
tfidf_estado = pipeline_estado.named_steps['tfidf']
clf_estado = pipeline_estado.named_steps['clf']
X_json_tfidf_estado = tfidf_estado.fit_transform(X_json)
print("Iniciando pré-treinamento do SGDClassifier (Estado) com dados do JSON...")
for i in range(0, len(X_json), CHUNK_SIZE):
    end_idx = min(i + CHUNK_SIZE, len(X_json))
    X_chunk = X_json_tfidf_estado[i:end_idx]
    y_chunk = y_json_state[i:end_idx]
    print(f"    Processando chunk {i//CHUNK_SIZE + 1} de {len(X_json)//CHUNK_SIZE + (1 if len(X_json) % CHUNK_SIZE != 0 else 0)} ({i} a {end_idx})...")
    clf_estado.partial_fit(X_chunk, y_chunk, classes=all_states)

# Treinamento com mensagens do dataset
print("Ajustando TfidfVectorizer para mensagens do dataset de treinamento...")
X_train_tfidf = tfidf_local.transform(X_train)
X_train_tfidf_estado = tfidf_estado.transform(X_train)

print("Iniciando treinamento do SGDClassifier (Cidade) com mensagens do dataset...")
for i in range(0, X_train_tfidf.shape[0], CHUNK_SIZE):
    end_idx = min(i + CHUNK_SIZE, X_train_tfidf.shape[0])
    X_chunk = X_train_tfidf[i:end_idx]
    y_chunk = y_local_train[i:end_idx]
    print(f"    Processando chunk {i//CHUNK_SIZE + 1} de {X_train_tfidf.shape[0]//CHUNK_SIZE + (1 if X_train_tfidf.shape[0] % CHUNK_SIZE != 0 else 0)} ({i} a {end_idx})...")
    clf_local.partial_fit(X_chunk, y_chunk, classes=all_cities)

print("Iniciando treinamento do SGDClassifier (Estado) com mensagens do dataset...")
for i in range(0, X_train_tfidf_estado.shape[0], CHUNK_SIZE):
    end_idx = min(i + CHUNK_SIZE, X_train_tfidf_estado.shape[0])
    X_chunk = X_train_tfidf_estado[i:end_idx]
    y_chunk = y_estado_train[i:end_idx]
    print(f"    Processando chunk {i//CHUNK_SIZE + 1} de {X_train_tfidf_estado.shape[0]//CHUNK_SIZE + (1 if X_train_tfidf_estado.shape[0] % CHUNK_SIZE != 0 else 0)} ({i} a {end_idx})...")
    clf_estado.partial_fit(X_chunk, y_chunk, classes=all_states)

# --- Salvando Modelos ---
print("\n--- Salvando Modelos ---")
joblib.dump(pipeline_evento, "modelo_evento_final.pkl")
joblib.dump(pipeline_impacto, "modelo_impacto_final.pkl")
joblib.dump(pipeline_local, "modelo_local_final.pkl")
joblib.dump(pipeline_estado, "modelo_estado_final.pkl")
print("✅ Modelos salvos com sucesso.")