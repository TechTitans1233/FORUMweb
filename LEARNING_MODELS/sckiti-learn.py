import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
import joblib

# Carregar dataset
df = pd.read_csv("dataset_multilingue_localizado_expandido.csv")

print(df.columns.tolist())  # ['mensagem', 'categoria', 'localizacao', 'latitude', 'longitude', 'impacto']

X = df["mensagem"]
y_evento = df["categoria"]
y_local = df["localizacao"]
y_impacto = df["impacto"]

# Separar em treino/teste para cada target
X_train, X_test, y_evento_train, y_evento_test = train_test_split(X, y_evento, test_size=0.2, random_state=42)
_, _, y_local_train, y_local_test = train_test_split(X, y_local, test_size=0.2, random_state=42)
_, _, y_impacto_train, y_impacto_test = train_test_split(X, y_impacto, test_size=0.2, random_state=42)

# Criar pipelines
pipeline_evento = Pipeline([
    ("tfidf", TfidfVectorizer()),
    ("clf", LogisticRegression(max_iter=1000))
])
pipeline_local = Pipeline([
    ("tfidf", TfidfVectorizer()),
    ("clf", LogisticRegression(max_iter=1000))
])
pipeline_impacto = Pipeline([
    ("tfidf", TfidfVectorizer()),
    ("clf", LogisticRegression(max_iter=1000))
])

# Treinar modelos
pipeline_evento.fit(X_train, y_evento_train)
pipeline_local.fit(X_train, y_local_train)
pipeline_impacto.fit(X_train, y_impacto_train)

# Salvar modelos
joblib.dump(pipeline_evento, "modelo_evento.pkl")
joblib.dump(pipeline_local, "modelo_local.pkl")
joblib.dump(pipeline_impacto, "modelo_impacto.pkl")
