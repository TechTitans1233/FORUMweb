from flask import Flask, request, jsonify
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import pandas as pd
import joblib
import glob
import datetime
import threading
import os

app = Flask(__name__)

# === Função para carregar o modelo mais recente baseado no prefixo ===
def carregar_modelo_mais_recente(prefixo):
    arquivos = glob.glob(f"{prefixo}_*.pkl")
    if not arquivos:
        return None
    arquivos.sort()
    print(f"🔁 Carregando modelo: {arquivos[-1]}")
    return joblib.load(arquivos[-1])

# === Carregar os modelos atuais ao iniciar o app ===
modelo_categoria = carregar_modelo_mais_recente("modelo_categoria")
modelo_localizacao = carregar_modelo_mais_recente("modelo_localizacao")
modelo_impacto = carregar_modelo_mais_recente("modelo_impacto")

# === Função para treinar os modelos ===
def treinar_modelos():
    print("📥 Carregando dados...")
    df = pd.read_csv("dataset_multilingue_localizado.csv")
    X = df["mensagem"]
    y_cat = df["categoria"]
    y_loc = df["localizacao"]
    y_imp = df["impacto"]

    print("⚙️ Iniciando treino...")
    pipeline_cat = Pipeline([
        ("tfidf", TfidfVectorizer()),
        ("clf", LogisticRegression(max_iter=1000))
    ])
    pipeline_loc = Pipeline([
        ("tfidf", TfidfVectorizer()),
        ("clf", LogisticRegression(max_iter=1000))
    ])
    pipeline_imp = Pipeline([
        ("tfidf", TfidfVectorizer()),
        ("clf", LogisticRegression(max_iter=1000))
    ])

    pipeline_cat.fit(X, y_cat)
    pipeline_loc.fit(X, y_loc)
    pipeline_imp.fit(X, y_imp)

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    joblib.dump(pipeline_cat, f"modelo_categoria_{timestamp}.pkl")
    joblib.dump(pipeline_loc, f"modelo_localizacao_{timestamp}.pkl")
    joblib.dump(pipeline_imp, f"modelo_impacto_{timestamp}.pkl")
    print(f"✅ Modelos salvos com timestamp {timestamp}")

    # Atualiza os modelos carregados
    global modelo_categoria, modelo_localizacao, modelo_impacto
    modelo_categoria = pipeline_cat
    modelo_localizacao = pipeline_loc
    modelo_impacto = pipeline_imp

# === Endpoint para predição ===
@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    mensagem = data.get("mensagem", "")

    if not mensagem.strip():
        return jsonify({"erro": "Mensagem vazia"}), 400

    pred_cat = modelo_categoria.predict([mensagem])[0]
    pred_loc = modelo_localizacao.predict([mensagem])[0]
    pred_imp = modelo_impacto.predict([mensagem])[0]

    return jsonify({
        "categoria": pred_cat,
        "localizacao": pred_loc,
        "impacto": pred_imp
    })

# === Endpoint para retreinamento ===
@app.route("/retrain", methods=["POST"])
def retrain():
    threading.Thread(target=treinar_modelos).start()
    return jsonify({"status": "Treinamento iniciado em segundo plano"}), 202

# === Rodar o app ===
if __name__ == "__main__":
    app.run(debug=True)
