import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
import joblib

# Carregar dataset
# ATUALIZADO: Usando o nome do arquivo CSV gerado anteriormente
df = pd.read_csv("dataset_portugues_brasil_expandido.csv")

# Exibir as colunas para verificar (serão: ['mensagem', 'categoria', 'sinonimo', 'idioma', 'continente', 'pais', 'estado', 'cidade', 'latitude', 'longitude', 'impacto'])
print("Colunas do DataFrame:", df.columns.tolist())

X = df["mensagem"]
y_evento = df["categoria"]
# ATUALIZADO: Usando 'cidade' para a localização, conforme o novo dataset
y_local = df["cidade"] 
y_impacto = df["impacto"]

# Separar em treino/teste para cada target
X_train, X_test, y_evento_train, y_evento_test = train_test_split(X, y_evento, test_size=0.2, random_state=42)
# Re-dividindo X para y_local_train/test e y_impacto_train/test para garantir consistência
# (embora no seu código original os X_train, X_test fossem os mesmos, é bom manter clareza)
X_train_local, X_test_local, y_local_train, y_local_test = train_test_split(X, y_local, test_size=0.2, random_state=42)
X_train_impacto, X_test_impacto, y_impacto_train, y_impacto_test = train_test_split(X, y_impacto, test_size=0.2, random_state=42)


# Criar pipelines
pipeline_evento = Pipeline([
    ("tfidf", TfidfVectorizer()),
    ("clf", LogisticRegression(max_iter=1000)) # Aumentei max_iter para evitar warnings em datasets grandes
])
pipeline_local = Pipeline([
    ("tfidf", TfidfVectorizer()),
    ("clf", LogisticRegression(max_iter=1000)) # Aumentei max_iter
])
pipeline_impacto = Pipeline([
    ("tfidf", TfidfVectorizer()),
    ("clf", LogisticRegression(max_iter=1000)) # Aumentei max_iter
])

print("\nIniciando o treinamento dos modelos...")

# Treinar modelos
print("Treinando modelo para Categoria de Evento...")
pipeline_evento.fit(X_train, y_evento_train)
print("✅ Modelo de Categoria de Evento treinado.")

print("Treinando modelo para Localização (Cidade)...")
pipeline_local.fit(X_train_local, y_local_train) # Usando X_train_local
print("✅ Modelo de Localização (Cidade) treinado.")

print("Treinando modelo para Nível de Impacto...")
pipeline_impacto.fit(X_train_impacto, y_impacto_train) # Usando X_train_impacto
print("✅ Modelo de Nível de Impacto treinado.")

# Salvar modelos
print("\nSalvando modelos treinados...")
joblib.dump(pipeline_evento, "modelo_evento.pkl")
joblib.dump(pipeline_local, "modelo_local.pkl")
joblib.dump(pipeline_impacto, "modelo_impacto.pkl")
print("✅ Modelos salvos com sucesso: modelo_evento.pkl, modelo_local.pkl, modelo_impacto.pkl")
