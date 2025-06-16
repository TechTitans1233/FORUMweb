from flask import Flask, request, jsonify
from flask_cors import CORS
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
CORS(app, origins=["http://localhost:3000"])

# === Função atualizada para carregar modelo, considerando “prefixo.pkl” ou “prefixo_timestamp.pkl” ===
def carregar_modelo_mais_recente(prefixo):
    # 1) Se existir “prefixo.pkl”, carrega direto
    nome_simples = f"{prefixo}.pkl"
    if os.path.isfile(nome_simples):
        print(f"🔁 Carregando modelo (sem timestamp): {nome_simples}")
        return joblib.load(nome_simples)

    # 2) Senão, procura “prefixo_*.pkl”
    arquivos = glob.glob(f"{prefixo}_*.pkl")
    if not arquivos:
        return None

    arquivos.sort()
    print(f"🔁 Carregando modelo (com timestamp): {arquivos[-1]}")
    return joblib.load(arquivos[-1])

# === Carregar os modelos ao iniciar o app ===
modelo_categoria   = carregar_modelo_mais_recente("modelo_categoria")
modelo_localizacao = carregar_modelo_mais_recente("modelo_localizacao")
modelo_impacto     = carregar_modelo_mais_recente("modelo_impacto")

# Se algum for None, treina imediatamente antes de aceitar requisições:
if modelo_categoria is None or modelo_localizacao is None or modelo_impacto is None:
    print("⚠️ Nenhum modelo encontrado em disco. Treinando agora...")
    def treinar_modelos():
        print("📥 Carregando dados...")
        df = pd.read_csv("dataset_multilingue_localizado_expandido.csv")
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
        joblib.dump(pipeline_loc,    f"modelo_localizacao_{timestamp}.pkl")
        joblib.dump(pipeline_imp,    f"modelo_impacto_{timestamp}.pkl")
        print(f"✅ Modelos salvos com timestamp {timestamp}")

        # Atualiza variáveis globais
        global modelo_categoria, modelo_localizacao, modelo_impacto
        modelo_categoria   = pipeline_cat
        modelo_localizacao = pipeline_loc
        modelo_impacto     = pipeline_imp

    # Chama de forma síncrona antes de aceitar /predict
    treinar_modelos()

# === Endpoint para predição ===
@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    mensagem = data.get("mensagem", "").strip()
    if not mensagem:
        return jsonify({"erro": "Mensagem vazia"}), 400

    # Agora, modelo_categoria nunca será None
    pred_cat = modelo_categoria.predict([mensagem])[0]
    pred_loc = modelo_localizacao.predict([mensagem])[0]
    pred_imp = modelo_impacto.predict([mensagem])[0]

    return jsonify({
        "categoria": pred_cat,
        "localizacao": pred_loc,
        "impacto": pred_imp
    })

# === Endpoint para retreinamento (em background) ===
@app.route("/retrain", methods=["POST"])
def retrain():
    threading.Thread(target=treinar_modelos).start()
    return jsonify({"status": "Treinamento iniciado em segundo plano"}), 202

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({"status": "API Python funcionando!", "timestamp": datetime.datetime.now().isoformat()})

if __name__ == "__main__":
    # IMPORTANTE: host='0.0.0.0' para aceitar conexões externas no container
    app.run(host='0.0.0.0', port=5000, debug=True)
