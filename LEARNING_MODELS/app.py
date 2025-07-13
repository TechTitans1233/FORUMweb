from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import glob
import os

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

# === Função para carregar modelo mais recente ===
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

# === Carregar os modelos ao iniciar o app ===
modelo_categoria = carregar_modelo_mais_recente("modelo_evento_final")
modelo_localizacao = carregar_modelo_mais_recente("modelo_local_final")
modelo_impacto = carregar_modelo_mais_recente("modelo_impacto_final")

# === Endpoint para predição ===
@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    mensagem = data.get("mensagem", "").strip()
    if not mensagem:
        return jsonify({"erro": "Mensagem vazia"}), 400

    pred_cat = modelo_categoria.predict([mensagem])[0] if modelo_categoria else "Modelo não carregado"
    pred_loc = modelo_localizacao.predict([mensagem])[0] if modelo_localizacao else "Modelo não carregado"
    pred_imp = modelo_impacto.predict([mensagem])[0] if modelo_impacto else "Modelo não carregado"

    return jsonify({
        "categoria": pred_cat,
        "cidade": pred_loc,
        "impacto": pred_imp
    })

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({"status": "API Python funcionando!", "timestamp": datetime.datetime.now().isoformat()})

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)