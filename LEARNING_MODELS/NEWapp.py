
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import glob
import os
import json
import hashlib
import pandas as pd
import datetime
import random
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
import unicodedata
from turfpy.measurement import area
from geojson import Feature

app = Flask(__name__)
CORS(app)

# --- Configurações de Arquivos ---
REAL_POSTS_FILE = 'real_posts.json'
DATASET_REAL_COMBINED_PATH = 'dataset_real_coletado.csv'
JSON_CITIES_FILE = "brazil_states_cities_geocoded.json"

# --- Variáveis Globais para Publicações Reais ---
loaded_posts_set = set()
loaded_posts_list = []

# --- Configuração do Geocodificador ---
geolocator = Nominatim(user_agent="xai_environmental_api")

# --- Dados de Localização e Impacto ---
locations_data = []
impact_data = {
    "baixo impacto a pequena área": {
        "cor": "green",
        "area_km2_min": 1,
        "area_km2_max": 50,
        "sinonimos_intensidade": ["pequeno", "leve", "incipiente", "reduzido", "mínimo", "localizado", "controlado"]
    },
    "baixo impacto a média área": {
        "cor": "green",
        "area_km2_min": 51,
        "area_km2_max": 200,
        "sinonimos_intensidade": ["pequeno", "leve", "incipiente", "reduzido", "mínimo", "localizado", "controlado"]
    },
    "baixo impacto a grande área": {
        "cor": "green",
        "area_km2_min": 201,
        "area_km2_max": 5000,
        "sinonimos_intensidade": ["pequeno", "leve", "incipiente", "reduzido", "mínimo", "localizado", "controlado"]
    },
    "moderado impacto a pequena área": {
        "cor": "orange",
        "area_km2_min": 1,
        "area_km2_max": 50,
        "sinonimos_intensidade": ["moderado", "considerável", "significativo", "médio", "regular", "importante", "parcial"]
    },
    "moderado impacto a média área": {
        "cor": "orange",
        "area_km2_min": 51,
        "area_km2_max": 200,
        "sinonimos_intensidade": ["moderado", "considerável", "significativo", "médio", "regular", "importante", "parcial"]
    },
    "moderado impacto a grande área": {
        "cor": "orange",
        "area_km2_min": 201,
        "area_km2_max": 5000,
        "sinonimos_intensidade": ["moderado", "considerável", "significativo", "médio", "regular", "importante", "parcial"]
    },
    "alto impacto a pequena área": {
        "cor": "red",
        "area_km2_min": 1,
        "area_km2_max": 50,
        "sinonimos_intensidade": ["grande", "severo", "extremo", "grave", "intenso", "devastador", "crítico", "total", "generalizado"]
    },
    "alto impacto a média área": {
        "cor": "red",
        "area_km2_min": 51,
        "area_km2_max": 200,
        "sinonimos_intensidade": ["grande", "severo", "extremo", "grave", "intenso", "devastador", "crítico", "total", "generalizado"]
    },
    "alto impacto a grande área": {
        "cor": "red",
        "area_km2_min": 201,
        "area_km2_max": 5000,
        "sinonimos_intensidade": ["grande", "severo", "extremo", "grave", "intenso", "devastador", "crítico", "total", "generalizado"]
    },
    "indefinido": {
        "cor": "gray",
        "area_km2_min": 0,
        "area_km2_max": 0,
        "sinonimos_intensidade": ["indefinido", "desconhecido", "incerto"]
    }
}

# --- Sinônimos para Validação de Categoria ---
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
        "nível da água alto", "rios cheios", "situação de alagamento", "chuva", "chuvas",
        "alagamento", "inundação", "enchente"
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
        "granizo grande", "rajada de vento forte", "chuva", "chuvas"
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

# --- Categorias Improváveis por País ---
implausible_categories = {
    "vulcao": ["Brasil"]  # Vulcões são raros no Brasil
}

# === Funções de Carregamento ===
def load_brazilian_cities_from_json(json_file_path):
    cities_data_local = []
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
                cities_data_local.append({
                    "cidade": city_name,
                    "estado": state_name,
                    "latitude": final_lat,
                    "longitude": final_lon,
                    "continente": continent,
                    "pais": country
                })
        print(f"✅ Carregadas {len(cities_data_local)} localidades do arquivo '{json_file_path}'.")
        return cities_data_local
    except FileNotFoundError:
        print(f"❌ Erro: O arquivo '{json_file_path}' não foi encontrado. Usando lista reduzida de locais de exemplo como fallback.")
        return [
            {"continente": "América do Sul", "pais": "Brasil", "estado": "São Paulo", "cidade": "São Paulo", "latitude": -23.5505, "longitude": -46.6333},
            {"continente": "América do Sul", "pais": "Brasil", "estado": "Rio de Janeiro", "cidade": "Rio de Janeiro", "latitude": -22.9068, "longitude": -43.1729},
            {"continente": "América do Sul", "pais": "Brasil", "estado": "Minas Gerais", "cidade": "Belo Horizonte", "latitude": -19.9167, "longitude": -43.9344},
            {"continente": "América do Sul", "pais": "Brasil", "estado": "Pernambuco", "cidade": "Garanhuns", "latitude": -8.8803, "longitude": -36.4795}
        ]
    except json.JSONDecodeError:
        print(f"❌ Erro: Não foi possível decodificar o arquivo JSON '{json_file_path}'. Verifique se o formato está correto.")
        return []
    except Exception as e:
        print(f"❌ Ocorreu um erro inesperado ao carregar o JSON: {e}")
        return []

locations_data = load_brazilian_cities_from_json(JSON_CITIES_FILE)

def carregar_modelo_mais_recente(prefixo):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    nome_simples = os.path.join(base_dir, f"{prefixo}.pkl")
    try:
        if os.path.isfile(nome_simples):
            print(f"🔁 Carregando modelo (sem timestamp): {nome_simples}")
            return joblib.load(nome_simples)
        arquivos = glob.glob(os.path.join(base_dir, f"{prefixo}_*.pkl"))
        if not arquivos:
            print(f"⚠️ Nenhum arquivo encontrado para o prefixo: {prefixo} no diretório {base_dir}")
            return None
        arquivos.sort()
        print(f"🔁 Carregando modelo (com timestamp): {arquivos[-1]}")
        return joblib.load(arquivos[-1])
    except Exception as e:
        print(f"❌ Erro ao carregar modelo {prefixo}: {e}")
        return None

modelo_categoria = carregar_modelo_mais_recente("modelo_evento_final")
modelo_localizacao = carregar_modelo_mais_recente("modelo_local_final")
modelo_impacto = carregar_modelo_mais_recente("modelo_impacto_final")

# --- Funções para Gerenciar Publicações Reais ---
def load_real_posts():
    global loaded_posts_set, loaded_posts_list
    if os.path.exists(REAL_POSTS_FILE):
        with open(REAL_POSTS_FILE, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
                loaded_posts_list = data
                for post in loaded_posts_list:
                    if 'id_hash' in post:
                        loaded_posts_set.add(post['id_hash'])
                    else:
                        message_hash = hashlib.sha256(
                            f"{post.get('titulo', '')}{post.get('conteudo', '')}".encode('utf-8')
                        ).hexdigest()
                        loaded_posts_set.add(message_hash)
                        post['id_hash'] = message_hash
            except json.JSONDecodeError:
                print(f"⚠️ Aviso: Arquivo {REAL_POSTS_FILE} corrompido ou vazio. Iniciando com lista vazia.")
                loaded_posts_set = set()
                loaded_posts_list = []
    print(f"✅ Carregadas {len(loaded_posts_list)} publicações existentes para deduplicação.")

def save_real_posts():
    with open(REAL_POSTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(loaded_posts_list, f, ensure_ascii=False, indent=4)
    print(f"💾 Salvas {len(loaded_posts_list)} publicações em {REAL_POSTS_FILE}.")

load_real_posts()

# === Função Auxiliar para Correspondência de Coordenadas ===
def find_closest_city(lat, lon, max_distance_km=100):
    try:
        lat = round(float(lat), 4)
        lon = round(float(lon), 4)
        closest_city = None
        min_distance = float('inf')
        for loc in locations_data:
            if loc["latitude"] is not None and loc["longitude"] is not None:
                distance = ((lat - loc["latitude"]) ** 2 + (lon - loc["longitude"]) ** 2) ** 0.5 * 111
                if distance < min_distance:
                    min_distance = distance
                    closest_city = loc["cidade"]
        if closest_city and min_distance <= max_distance_km:
            return closest_city
        return None
    except (ValueError, TypeError):
        return None

# === Função Auxiliar para Geocodificação ===
def get_city_from_coordinates(lat, lon):
    try:
        location = geolocator.reverse((lat, lon), language='pt')
        if location and location.raw.get('address'):
            city = location.raw['address'].get('city') or location.raw['address'].get('town') or location.raw['address'].get('village')
            return city if city else None
        return None
    except Exception as e:
        print(f"❌ Erro ao geocodificar coordenadas ({lat}, {lon}): {e}")
        return None

# === Função Auxiliar para Determinar Nível de Impacto com Área ===
def determine_impact_level_with_area(pred_imp, area_km2):
    try:
        area_km2 = float(area_km2)
        if area_km2 > 200:
            area_category = "grande área"
        elif area_km2 > 50:
            area_category = "média área"
        else:
            area_category = "pequena área"
        base_impact = pred_imp if pred_imp in ["baixo", "moderado", "alto"] else "indefinido"
        impact_key = f"{base_impact} impacto a {area_category}" if base_impact != "indefinido" else "indefinido"
        return impact_key if impact_key in impact_data else "indefinido"
    except (ValueError, TypeError):
        return "indefinido"

# === Função Auxiliar para Normalizar Nomes de Cidades e Textos ===
def normalize_text(text):
    if not text:
        return ""
    text = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('ASCII')
    return text.lower().strip()

# === Funções de Validação ===
def validate_text_quality(text):
    MIN_LENGTH = 50  # Aumentado para exigir mais conteúdo
    MIN_WORDS = 5    # Exige pelo menos 5 palavras
    IRRELEVANT_WORDS = ["ok", "teste", "n/a", "nada", "aa", "bb", "teste 4k+"]
    if len(text) < MIN_LENGTH:
        return False, "texto muito curto"
    words = text.split()
    if len(words) < MIN_WORDS:
        return False, "poucas palavras"
    if any(word.lower() in IRRELEVANT_WORDS for word in words):
        return False, "contém palavras irrelevantes"
    # Verifica se o texto é apenas repetição de caracteres ou nonsense
    if len(set(words)) < 2 or all(len(word) <= 2 for word in words):
        return False, "texto sem sentido ou repetitivo"
    return True, "válido"

def validate_timestamp(timestamp, max_days=30):
    try:
        post_date = datetime.datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        return (datetime.datetime.now() - post_date).days <= max_days, "válido"
    except:
        return False, "timestamp inválido"

def validate_category(text, predicted_category):
    text = normalize_text(text) or ""
    synonyms = disaster_synonyms_validation.get(predicted_category, [])
    # Inclui a própria categoria como sinônimo válido
    synonyms = synonyms + [predicted_category]
    # Exige pelo menos uma palavra-chave relevante no texto
    has_relevant_term = any(synonym in text for synonym in synonyms)
    if not has_relevant_term:
        return False, f"categoria {predicted_category} não corresponde aos sinônimos ou à própria categoria"
    # Verifica coerência semântica: exige um mínimo de contexto descritivo
    words = text.split()
    if len(words) < 5 or len(set(words)) < 3:
        return False, "texto sem contexto suficiente para a categoria"
    return True, "válido"

def validate_impact(text, impact_level):
    text = normalize_text(text) or ""
    impact_details = impact_data.get(impact_level, impact_data["indefinido"])
    synonyms = impact_details["sinonimos_intensidade"]
    return any(synonym in text for synonym in synonyms), f"impacto {impact_level} {'válido' if any(synonym in text for synonym in synonyms) else 'não corresponde ao texto'}"

def validate_geographic_proximity(lat, lon, predicted_city, max_distance_km=100):
    if lat is None or lon is None:
        return False, "coordenadas ausentes"
    city_data = next((loc for loc in locations_data if loc["cidade"] == predicted_city), None)
    if not city_data or city_data["latitude"] is None or city_data["longitude"] is None:
        return False, f"cidade {predicted_city} não encontrada ou sem coordenadas"
    distance = geodesic((lat, lon), (city_data["latitude"], city_data["longitude"])).km
    return distance <= max_distance_km, f"distância {'válida' if distance <= max_distance_km else f'excede {max_distance_km} km'}"

def validate_model_confidence(model, text, predicted_label, min_confidence=0.7):
    if hasattr(model, 'predict_proba'):
        try:
            proba = model.predict_proba([text])[0]
            label_idx = model.classes_.tolist().index(predicted_label)
            confidence = proba[label_idx]
            return confidence >= min_confidence, f"confiança {confidence:.2f} {'válida' if confidence >= min_confidence else 'abaixo do mínimo'}"
        except Exception as e:
            print(f"⚠️ Erro ao verificar confiança do modelo: {e}")
            return False, f"erro na confiança do modelo: {e}"
    return True, "confiança não verificada (modelo sem predict_proba)"

def validate_area_consistency(area_km2, impact_level):
    details = impact_data.get(impact_level, impact_data["indefinido"])
    return details["area_km2_min"] <= area_km2 <= details["area_km2_max"], f"área {area_km2} {'válida' if details['area_km2_min'] <= area_km2 <= details['area_km2_max'] else 'inconsistente com impacto'}"

def validate_regional_context(category, real_cidade):
    if real_cidade:
        city_data = next((loc for loc in locations_data if normalize_text(loc["cidade"]) == normalize_text(real_cidade)), None)
        if city_data and category in implausible_categories:
            return city_data["pais"] not in implausible_categories[category], f"categoria {category} {'válida' if city_data['pais'] not in implausible_categories[category] else 'improvável para o país'}"
    return True, "contexto regional válido"

# === Endpoints da API ===
@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    if not data:
        return jsonify({"erro": "Nenhum dado fornecido"}), 400
    titulo = data.get("titulo", "")
    conteudo = data.get("conteudo", "")
    lat = data.get("lat")
    lon = data.get("lon")
    area_demarcada = data.get("areaDemarcada", "N/A")
    if not (titulo.strip() or conteudo.strip()):
        return jsonify({"erro": "Pelo menos título ou conteúdo deve ser fornecido"}), 400
    text_input = f"{titulo.strip()} {conteudo.strip()}".strip()
    try:
        pred_cat = modelo_categoria.predict([text_input])[0] if modelo_categoria else "Modelo de Categoria não carregado"
        pred_loc = modelo_localizacao.predict([text_input])[0] if modelo_localizacao else "Modelo de Localização não carregado"
        pred_imp = modelo_impacto.predict([text_input])[0] if modelo_impacto else "Modelo de Impacto não carregado"
        cidade = pred_loc
        if lat is not None and lon is not None:
            closest_city = find_closest_city(lat, lon, max_distance_km=100)
            if closest_city:
                cidade = closest_city
        impact_level = determine_impact_level_with_area(pred_imp, area_demarcada if area_demarcada != "N/A" else 0)
        return jsonify({
            "categoria": pred_cat,
            "cidade": cidade,
            "impacto": impact_level
        })
    except Exception as e:
        print(f"Erro no endpoint /predict: {str(e)}")
        return jsonify({"erro": str(e)}), 500

@app.route('/publicar', methods=['POST'])
def receive_post():
    data = request.get_json()
    if not data or not (data.get('titulo') or data.get('conteudo')):
        return jsonify({"status": "error", "message": "Título ou conteúdo deve ser fornecido"}), 400
    titulo = data.get('titulo', '')
    conteudo = data.get('conteudo', '')
    lat = data.get('lat')
    lon = data.get('lon')
    marcacao = data.get('marcacao')
    message_hash = hashlib.sha256(f"{titulo}{conteudo}".encode('utf-8')).hexdigest()
    if message_hash in loaded_posts_set:
        print(f"⏩ Publicação duplicada recebida (hash: {message_hash[:8]}...). Ignorando.")
        return jsonify({"status": "ignored", "message": "Publicação já existe."}), 200
    real_cidade = None
    if lat is not None and lon is not None:
        real_cidade = get_city_from_coordinates(lat, lon)
    new_post_entry = {
        "id_hash": message_hash,
        "titulo": titulo,
        "conteudo": conteudo,
        "lat": lat,
        "lon": lon,
        "marcacao": marcacao,
        "REALcidade": real_cidade,
        "timestamp": datetime.datetime.now().isoformat()
    }
    loaded_posts_list.append(new_post_entry)
    loaded_posts_set.add(message_hash)
    save_real_posts()
    print(f"✨ Nova publicação recebida e salva (hash: {message_hash[:8]}..., REALcidade: {real_cidade}). Total: {len(loaded_posts_list)}.")
    return jsonify({"status": "success", "message": "Publicação recebida e armazenada.", "REALcidade": real_cidade}), 201

@app.route('/publicacoes', methods=['GET'])
def get_posts():
    try:
        posts = [
            {
                "id": post.get("id_hash"),
                "titulo": post.get("titulo", ""),
                "conteudo": post.get("conteudo", ""),
                "lat": post.get("lat"),
                "lon": post.get("lon"),
                "endereco": "",
                "marcacao": post.get("marcacao"),
                "REALcidade": post.get("REALcidade")
            } for post in loaded_posts_list
        ]
        return jsonify(posts), 200
    except Exception as e:
        print(f"Erro no endpoint /publicacoes: {str(e)}")
        return jsonify({"erro": str(e)}), 500

@app.route('/gerar_dataset_real', methods=['POST'])
def generate_real_dataset():
    global loaded_posts_list
    if not loaded_posts_list:
        return jsonify({"status": "error", "message": "Nenhuma publicação encontrada em real_posts.json."}), 400
    if not (modelo_categoria and modelo_localizacao and modelo_impacto):
        return jsonify({"status": "error", "message": "Um ou mais modelos não foram carregados."}), 500
    print(f"\nIniciando geração do dataset a partir de {len(loaded_posts_list)} publicações de real_posts.json...")
    try:
        df_existing_real = pd.read_csv(DATASET_REAL_COMBINED_PATH) if os.path.exists(DATASET_REAL_COMBINED_PATH) else pd.DataFrame(columns=[
            "titulo", "conteudo", "categoria", "sinonimo_disparador", "idioma",
            "continente", "pais", "estado", "cidade", "latitude", "longitude",
            "impacto_nivel", "impacto_cor", "impacto_area_km2", "impacto_sinonimo_intensidade", "REALcidade"
        ])
        print(f"Dataset de publicações reais existente carregado com {len(df_existing_real)} registros.")
    except Exception as e:
        print(f"Erro ao carregar dataset existente: {e}")
        df_existing_real = pd.DataFrame(columns=[
            "titulo", "conteudo", "categoria", "sinonimo_disparador", "idioma",
            "continente", "pais", "estado", "cidade", "latitude", "longitude",
            "impacto_nivel", "impacto_cor", "impacto_area_km2", "impacto_sinonimo_intensidade", "REALcidade"
        ])
    processed_hashes = set((df_existing_real['titulo'] + df_existing_real['conteudo']).map(lambda x: hashlib.sha256(x.encode('utf-8')).hexdigest()))
    new_data_for_df = []
    processed_count = 0
    for post in loaded_posts_list:
        titulo = post.get('titulo', '')
        conteudo = post.get('conteudo', '')
        lat = post.get('lat')
        lon = post.get('lon')
        marcacao = post.get('marcacao')
        real_cidade = post.get('REALcidade')
        timestamp = post.get('timestamp')
        message_hash = hashlib.sha256(f"{titulo}{conteudo}".encode('utf-8')).hexdigest()
        if message_hash in processed_hashes:
            print(f"⏩ Publicação duplicada (hash: {message_hash[:8]}...). Ignorando.")
            continue
        text_input = f"{titulo} {conteudo}".strip()
        if not text_input:
            print(f"⚠️ Publicação ignorada: texto vazio.")
            continue
        # Validação de qualidade do texto
        is_valid_text, text_reason = validate_text_quality(text_input)
        if not is_valid_text:
            print(f"⚠️ Publicação '{text_input[:50]}...' ignorada: {text_reason}.")
            continue
        # Validação de timestamp
        is_valid_timestamp, timestamp_reason = validate_timestamp(timestamp)
        if not is_valid_timestamp:
            print(f"⚠️ Publicação '{text_input[:50]}...' ignorada: {timestamp_reason}.")
            continue
        # Inferência dos modelos
        try:
            predicted_category = modelo_categoria.predict([text_input])[0]
            predicted_impact_level = modelo_impacto.predict([text_input])[0]
            predicted_city = modelo_localizacao.predict([text_input])[0]
        except Exception as e:
            print(f"❌ Erro na inferência para a mensagem '{text_input[:50]}...': {e}")
            continue
        # Validação da categoria
        is_valid_category, category_reason = validate_category(text_input, predicted_category)
        if not is_valid_category:
            print(f"⚠️ Publicação '{text_input[:50]}...' ignorada: {category_reason}.")
            continue
        # Validação da confiança do modelo
        is_valid_confidence, confidence_reason = validate_model_confidence(modelo_categoria, text_input, predicted_category)
        if not is_valid_confidence:
            print(f"⚠️ Publicação '{text_input[:50]}...' ignorada: {confidence_reason}.")
            continue
        # Cálculo da área
        predicted_area = 0
        try:
            if marcacao:
                marcacao_geojson = json.loads(marcacao)
                if marcacao_geojson.get('type') == 'Feature' and marcacao_geojson.get('geometry', {}).get('type') == 'Polygon':
                    predicted_area = area(Feature(geometry=marcacao_geojson['geometry'])) / 1_000_000
                    predicted_area = round(predicted_area, 2)
        except Exception as e:
            print(f"Erro ao calcular área para marcacao: {e}")
        impact_level = determine_impact_level_with_area(predicted_impact_level, predicted_area)
        # Validação do impacto
        is_valid_impact, impact_reason = validate_impact(text_input, impact_level)
        if not is_valid_impact:
            print(f"⚠️ Publicação '{text_input[:50]}...' ignorada: {impact_reason}.")
            continue
        # Validação de consistência de cidade
        if real_cidade and predicted_city:
            normalized_real_cidade = normalize_text(real_cidade)
            normalized_predicted_city = normalize_text(predicted_city)
            if normalized_real_cidade != normalized_predicted_city:
                print(f"⚠️ Publicação '{text_input[:50]}...' ignorada: REALcidade ({real_cidade}) != cidade predita ({predicted_city})")
                continue
        else:
            print(f"⚠️ Publicação '{text_input[:50]}...' ignorada: REALcidade ou cidade predita ausente.")
            continue
        # Validação de proximidade geográfica
        is_valid_geo, geo_reason = validate_geographic_proximity(lat, lon, predicted_city)
        if not is_valid_geo:
            print(f"⚠️ Publicação '{text_input[:50]}...' ignorada: {geo_reason}.")
            continue
        # Validação de consistência de área
        if marcacao:
            is_valid_area, area_reason = validate_area_consistency(predicted_area, impact_level)
            if not is_valid_area:
                print(f"⚠️ Publicação '{text_input[:50]}...' ignorada: {area_reason}.")
                continue
        # Validação de contexto regional
        is_valid_context, context_reason = validate_regional_context(predicted_category, real_cidade)
        if not is_valid_context:
            print(f"⚠️ Publicação '{text_input[:50]}...' ignorada: {context_reason}.")
            continue
        processed_hashes.add(message_hash)
        processed_count += 1
        predicted_lat = round(float(lat), 4) if lat is not None else None
        predicted_lon = round(float(lon), 4) if lon is not None else None
        predicted_state = "Desconhecido"
        if real_cidade:
            predicted_city = real_cidade
            found_city_data = next((loc for loc in locations_data if loc["cidade"] == predicted_city), None)
            if found_city_data:
                predicted_state = found_city_data["estado"]
                if predicted_lat is None:
                    predicted_lat = found_city_data["latitude"]
                if predicted_lon is None:
                    predicted_lon = found_city_data["longitude"]
        elif lat is not None and lon is not None:
            closest_city = find_closest_city(lat, lon, max_distance_km=100)
            if closest_city:
                predicted_city = closest_city
                found_city_data = next((loc for loc in locations_data if loc["cidade"] == predicted_city), None)
                if found_city_data:
                    predicted_state = found_city_data["estado"]
                    if predicted_lat is None:
                        predicted_lat = found_city_data["latitude"]
                    if predicted_lon is None:
                        predicted_lon = found_city_data["longitude"]
        impact_details = impact_data.get(impact_level, impact_data["indefinido"])
        predicted_impact_intensity = random.choice(impact_details["sinonimos_intensidade"])
        new_data_for_df.append({
            "titulo": titulo,
            "conteudo": conteudo,
            "categoria": predicted_category,
            "sinonimo_disparador": "publicacao_real_inferida",
            "idioma": "pt",
            "continente": "América do Sul",
            "pais": "Brasil",
            "estado": predicted_state,
            "cidade": predicted_city,
            "latitude": predicted_lat,
            "longitude": predicted_lon,
            "impacto_nivel": impact_level,
            "impacto_cor": impact_details["cor"],
            "impacto_area_km2": predicted_area,
            "impacto_sinonimo_intensidade": predicted_impact_intensity,
            "REALcidade": real_cidade
        })
    df_new_posts = pd.DataFrame(new_data_for_df)
    df_combined_final = pd.concat([df_existing_real, df_new_posts], ignore_index=True)
    df_combined_final = df_combined_final.drop_duplicates(subset=['titulo', 'conteudo']).reset_index(drop=True)
    df_combined_final.to_csv(DATASET_REAL_COMBINED_PATH, index=False, encoding='utf-8')
    print(f"📊 Dataset de publicações reais salvo em '{DATASET_REAL_COMBINED_PATH}'. Total de registros: {len(df_combined_final)}.")
    return jsonify({
        "status": "success",
        "message": f"Dataset de publicações reais atualizado com {processed_count} novas publicações inferidas.",
        "total_processed": processed_count,
        "total_received": len(loaded_posts_list)
    }), 200

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({"status": "API Python funcionando!", "timestamp": datetime.datetime.now().isoformat()})

@app.route('/api/dataset_real', methods=['GET'])
def get_real_dataset():
    try:
        if not os.path.exists(DATASET_REAL_COMBINED_PATH):
            return jsonify({"status": "error", "message": "Dataset não encontrado."}), 404
        with open(DATASET_REAL_COMBINED_PATH, 'r', encoding='utf-8') as f:
            return f.read(), 200, {'Content-Type': 'text/csv; charset=utf-8'}
    except Exception as e:
        print(f"Erro no endpoint /api/dataset_real: {str(e)}")
        return jsonify({"erro": str(e)}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
