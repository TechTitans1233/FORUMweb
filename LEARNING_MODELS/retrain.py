import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import joblib

def load_data(path="dataset_multilingue_localizado.csv"):
    """Carrega dados do CSV (ou substitua por código que busque do banco/API)."""
    df = pd.read_csv(path)
    return df

def train_models(df):
    """Treina os três modelos com o dataset atualizado."""
    X = df["mensagem"]
    y_categoria = df["categoria"]
    y_localizacao = df["localizacao"]
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

def save_models(pipeline_categoria, pipeline_localizacao, pipeline_impacto):
    """Salva os modelos treinados no disco."""
    joblib.dump(pipeline_categoria, "modelo_categoria.pkl")
    joblib.dump(pipeline_localizacao, "modelo_localizacao.pkl")
    joblib.dump(pipeline_impacto, "modelo_impacto.pkl")
    print("Modelos salvos com sucesso!")

def main():
    print("Carregando dados...")
    df = load_data()

    print("Iniciando treinamento dos modelos...")
    model_cat, model_loc, model_imp = train_models(df)

    print("Salvando modelos treinados...")
    save_models(model_cat, model_loc, model_imp)

    print("Treinamento e salvamento concluídos.")

if __name__ == "__main__":
    main()
