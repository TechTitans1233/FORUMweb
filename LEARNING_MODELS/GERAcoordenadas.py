import json
import requests
import time
import sys

# Nome do arquivo JSON de entrada e saída
INPUT_FILENAME = 'brazil_states_cities.json'
OUTPUT_FILENAME = 'brazil_states_cities_geocoded.json'

# URL da API do Nominatim
NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

# Headers para a requisição (inclua um User-Agent para boas práticas)
HEADERS = {
    'User-Agent': 'MeuAplicativoDeGeocodificacao/1.0 (seu_email@example.com)'
}

# Atraso entre as requisições para respeitar os limites do Nominatim (1 requisição/segundo é a recomendação)
REQUEST_DELAY = 1.5 # segundos

def geocode_city(city_name, state_name):
    """
    Realiza a geocodificação de uma cidade usando a API do Nominatim.
    """
    query = f"{city_name}, {state_name}, Brasil"
    params = {
        'q': query,
        'format': 'json',
        'limit': 1
    }
    
    try:
        response = requests.get(NOMINATIM_URL, params=params, headers=HEADERS, timeout=10)
        response.raise_for_status()  # Levanta um erro para códigos de status HTTP ruins (4xx ou 5xx)
        data = response.json()
        
        if data and len(data) > 0:
            lat = data[0].get('lat')
            lon = data[0].get('lon')
            print(f"Geocodificado: {query} -> Lat: {lat}, Lon: {lon}")
            return lat, lon
        else:
            print(f"Não encontrado: {query}")
            return None, None
    except requests.exceptions.RequestException as e:
        print(f"Erro na requisição para '{query}': {e}")
        return None, None
    except json.JSONDecodeError as e:
        print(f"Erro ao decodificar JSON para '{query}': {e}")
        return None, None

def main():
    try:
        with open(INPUT_FILENAME, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Erro: O arquivo '{INPUT_FILENAME}' não foi encontrado.")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"Erro: O arquivo '{INPUT_FILENAME}' não é um JSON válido.")
        sys.exit(1)

    brazil_data = data.get('Brazil')
    if not brazil_data:
        print("Estrutura JSON inesperada: 'Brazil' não encontrado no nível raiz.")
        sys.exit(1)

    states_data = brazil_data.get('states')
    if not states_data:
        print("Estrutura JSON inesperada: 'states' não encontrado dentro de 'Brazil'.")
        sys.exit(1)

    total_cities = sum(len(state_info.get('cities', {})) for state_info in states_data.values())
    processed_cities = 0

    for state_name, state_info in states_data.items():
        cities = state_info.get('cities')
        if cities:
            for city_name, city_info in cities.items():
                if not city_info.get('lat') or not city_info.get('lon'): # Apenas geocodifica se lat/lon estiverem vazios
                    lat, lon = geocode_city(city_name, state_name)
                    if lat and lon:
                        city_info['lat'] = lat
                        city_info['lon'] = lon
                    
                    processed_cities += 1
                    print(f"Progresso: {processed_cities}/{total_cities} cidades processadas. (Próxima requisição em {REQUEST_DELAY}s)")
                    time.sleep(REQUEST_DELAY) # Atraso entre as requisições para evitar rate limiting

    with open(OUTPUT_FILENAME, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"\nGeocodificação concluída! O arquivo atualizado foi salvo como '{OUTPUT_FILENAME}'.")

if __name__ == "__main__":
    main()