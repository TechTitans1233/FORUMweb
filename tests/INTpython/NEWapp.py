import pytest
from unittest.mock import patch, MagicMock
from flask import json
from NEWapp import app, validate_text_quality, determine_impact_level_with_area, loaded_posts_list, loaded_posts_set, save_real_posts, impact_data
# Configuração do cliente de teste Flask
@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

# Fixture para mockar dependências globais
@pytest.fixture
def mock_dependencies():
    # Mockar modelos de machine learning
    with patch('your_server_file.modelo_categoria') as mock_categoria, \
         patch('your_server_file.modelo_localizacao') as mock_localizacao, \
         patch('your_server_file.modelo_impacto') as mock_impacto, \
         patch('your_server_file.geolocator') as mock_geolocator, \
         patch('your_server_file.save_real_posts') as mock_save_real_posts, \
         patch('your_server_file.hashlib.sha256') as mock_hashlib:
        
        # Configurar mocks para modelos
        mock_categoria.predict.return_value = ['desastre_hidrico']
        mock_localizacao.predict.return_value = ['São Paulo']
        mock_impacto.predict.return_value = ['moderado']
        
        # Mockar geolocator
        mock_location = MagicMock()
        mock_location.raw = {'address': {'city': 'São Paulo'}}
        mock_geolocator.reverse.return_value = mock_location
        
        # Mockar hashlib
        mock_hash = MagicMock()
        mock_hash.hexdigest.return_value = 'mocked_hash'
        mock_hashlib.return_value = mock_hash
        
        yield {
            'mock_categoria': mock_categoria,
            'mock_localizacao': mock_localizacao,
            'mock_impacto': mock_impacto,
            'mock_geolocator': mock_geolocator,
            'mock_save_real_posts': mock_save_real_posts,
            'mock_hashlib': mock_hashlib
        }

# Fixture para limpar loaded_posts_list e loaded_posts_set antes de cada teste
@pytest.fixture(autouse=True)
def reset_posts():
    loaded_posts_list.clear()
    loaded_posts_set.clear()

# Testes para funções auxiliares
def test_validate_text_quality_valid():
    text = "Inundação grave na cidade, ruas alagadas e casas destruídas."
    is_valid, reason = validate_text_quality(text)
    assert is_valid is True
    assert reason == "válido"

def test_validate_text_quality_too_short():
    text = "Alagamento"
    is_valid, reason = validate_text_quality(text)
    assert is_valid is False
    assert reason == "texto muito curto"

def test_validate_text_quality_irrelevant():
    text = "teste n/a ok"
    is_valid, reason = validate_text_quality(text)
    assert is_valid is False
    assert reason == "contém palavras irrelevantes"

def test_determine_impact_level_with_area_moderado_media_area():
    pred_imp = "moderado"
    area_km2 = 100
    impact_level = determine_impact_level_with_area(pred_imp, area_km2)
    assert impact_level == "moderado impacto a média área"
    assert impact_data[impact_level]["cor"] == "orange"

def test_determine_impact_level_with_area_invalid_area():
    pred_imp = "alto"
    area_km2 = "invalid"
    impact_level = determine_impact_level_with_area(pred_imp, area_km2)
    assert impact_level == "indefinido"

# Testes para endpoints
def test_publicar_success(client, mock_dependencies):
    data = {
        "titulo": "Inundação em São Paulo",
        "conteudo": "Ruas alagadas na zona sul.",
        "lat": -23.5505,
        "lon": -46.6333,
        "marcacao": '{"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [[[1,1],[2,2],[3,3],[1,1]]]}}'
    }
    response = client.post('/publicar', json=data)
    assert response.status_code == 201
    assert response.json['status'] == 'success'
    assert response.json['message'] == 'Publicação recebida e armazenada.'
    assert response.json['REALcidade'] == 'São Paulo'
    assert len(loaded_posts_list) == 1
    assert loaded_posts_list[0]['id_hash'] == 'mocked_hash'

def test_publicar_missing_content(client):
    data = {
        "titulo": "",
        "conteudo": ""
    }
    response = client.post('/publicar', json=data)
    assert response.status_code == 400
    assert response.json['status'] == 'error'
    assert response.json['message'] == 'Título ou conteúdo deve ser fornecido'

def test_publicar_duplicate(client, mock_dependencies):
    # Adicionar uma publicação mockada
    loaded_posts_set.add('mocked_hash')
    data = {
        "titulo": "Inundação em São Paulo",
        "conteudo": "Ruas alagadas na zona sul.",
        "lat": -23.5505,
        "lon": -46.6333
    }
    response = client.post('/publicar', json=data)
    assert response.status_code == 200
    assert response.json['status'] == 'ignored'
    assert response.json['message'] == 'Publicação já existe.'
    assert len(loaded_posts_list) == 0

def test_predict_success(client, mock_dependencies):
    data = {
        "titulo": "Enchente em São Paulo",
        "conteudo": "Chuvas fortes causaram alagamentos.",
        "lat": -23.5505,
        "lon": -46.6333,
        "areaDemarcada": 100
    }
    response = client.post('/predict', json=data)
    assert response.status_code == 200
    assert response.json['categoria'] == 'desastre_hidrico'
    assert response.json['cidade'] == 'São Paulo'
    assert response.json['impacto'] == 'moderado impacto a média área'

def test_predict_missing_text(client):
    data = {
        "titulo": "",
        "conteudo": ""
    }
    response = client.post('/predict', json=data)
    assert response.status_code == 400
    assert response.json['erro'] == 'Pelo menos título ou conteúdo deve ser fornecido'

def test_get_posts_success(client, mock_dependencies):
    # Adicionar uma publicação mockada
    loaded_posts_list.append({
        "id_hash": "test_post",
        "titulo": "Teste",
        "conteudo": "Conteúdo teste",
        "lat": -1,
        "lon": -2,
        "marcacao": "teste",
        "REALcidade": "Testeudo"
    })
    response = client.get('/publicações')
    assert response.status_code == 200
    assert len(response.json) == 1
    assert response.json[0]['id'] == 'teste_post'
    assert response.json[0]['titulo'] == 'Teste'
    assert response.json[0]['REALcidade'] == 'Testeudo'