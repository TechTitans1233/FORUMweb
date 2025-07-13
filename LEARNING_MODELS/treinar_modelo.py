import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier
from sklearn.metrics import accuracy_score
import joblib

# --- Configurações ---
CHUNK_SIZE = 5000  # Tamanho do chunk para processamento incremental
MAX_FEATURES = 5000  # Limite de features para TfidfVectorizer no modelo de localização

# --- Carregar datasets ---
print("Carregando datasets...")
df_train = pd.read_csv("dataset_treinamento.csv")
df_validation = pd.read_csv("dataset_validacao.csv")

print("Colunas do DataFrame de Treinamento:", df_train.columns.tolist())
print("Colunas do DataFrame de Validação:", df_validation.columns.tolist())

# Verificar se os datasets não estão vazios
if df_train.empty or df_validation.empty:
    raise ValueError("Um ou ambos os datasets estão vazios. Verifique os arquivos CSV.")

# Separar features e targets
X_train = df_train["mensagem"]
y_evento_train = df_train["categoria"]
y_impacto_train = df_train["impacto"]
y_local_train = df_train["cidade"]

X_validation = df_validation["mensagem"]
y_evento_validation = df_validation["categoria"]
y_impacto_validation = df_validation["impacto"]
y_local_validation = df_validation["cidade"]

# --- Criar pipelines para evento e impacto ---
pipeline_evento = Pipeline([
    ("tfidf", TfidfVectorizer(max_features=10000)),
    ("clf", SGDClassifier(loss='log_loss', max_iter=1000, random_state=42))
])
pipeline_impacto = Pipeline([
    ("tfidf", TfidfVectorizer(max_features=5000)),
    ("clf", SGDClassifier(loss='log_loss', max_iter=1000, random_state=42))
])

# --- Treinamento e Validação para Categoria de Evento ---
print("\nTreinando modelo para Categoria de Evento...")
pipeline_evento.fit(X_train, y_evento_train)
score_evento = pipeline_evento.score(X_validation, y_evento_validation)
print(f"Desempenho no dataset de validação (Categoria de Evento): {score_evento:.4f}")

# --- Treinamento e Validação para Nível de Impacto ---
print("\nTreinando modelo para Nível de Impacto...")
pipeline_impacto.fit(X_train, y_impacto_train)
score_impacto = pipeline_impacto.score(X_validation, y_impacto_validation)
print(f"Desempenho no dataset de validação (Nível de Impacto): {score_impacto:.4f}")

# --- Treinamento e Validação para Localização (Cidade) com Chunks ---
print("\nTreinando modelo para Localização (Cidade)...")
all_cities = np.unique(np.concatenate([y_local_train.unique(), y_local_validation.unique()]))
print(f"Total de classes de localização (cidades) encontradas: {len(all_cities)}")

# Inicializar TfidfVectorizer separadamente
tfidf_local = TfidfVectorizer(max_features=MAX_FEATURES)
print("Ajustando TfidfVectorizer para localização...")
X_train_tfidf = tfidf_local.fit_transform(X_train)

# Inicializar SGDClassifier com partial_fit
clf_local = SGDClassifier(loss='log_loss', max_iter=1000, random_state=42, warm_start=True)

# Treinamento em chunks
print("Treinando SGDClassifier em chunks...")
for i in range(0, len(X_train), CHUNK_SIZE):
    end_idx = min(i + CHUNK_SIZE, len(X_train))
    X_chunk = X_train_tfidf[i:end_idx]
    y_chunk = y_local_train[i:end_idx]
    print(f"  Processando chunk {i//CHUNK_SIZE + 1} ({i} a {end_idx})...")
    clf_local.partial_fit(X_chunk, y_chunk, classes=all_cities)

# Validação em chunks
print("Validando modelo de localização em chunks...")
y_pred = []
for i in range(0, len(X_validation), CHUNK_SIZE):
    end_idx = min(i + CHUNK_SIZE, len(X_validation))
    X_chunk = tfidf_local.transform(X_validation[i:end_idx])
    print(f"  Validando chunk {i//CHUNK_SIZE + 1} ({i} a {end_idx})...")
    y_pred_chunk = clf_local.predict(X_chunk)
    y_pred.extend(y_pred_chunk)

score_local = accuracy_score(y_local_validation, y_pred)
print(f"Desempenho no dataset de validação (Localização): {score_local:.4f}")

# Criar pipeline para salvar (combinar tfidf e clf)
pipeline_local = Pipeline([
    ("tfidf", tfidf_local),
    ("clf", clf_local)
])

# --- Salvando Modelos ---
print("\nSalvando modelos...")
joblib.dump(pipeline_evento, "modelo_evento_final.pkl")
joblib.dump(pipeline_impacto, "modelo_impacto_final.pkl")
joblib.dump(pipeline_local, "modelo_local_final.pkl")
print("✅ Modelos salvos com sucesso.")