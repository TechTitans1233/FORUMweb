#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Protótipo único: ingestão (XLSX → CSV, GeoJSONs),
pré-processamento, treinamento de modelo e visualização via Leaflet.
"""

import os
import glob
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point, box
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import xgboost as xgb
import folium

# === 1) XLSX → CSV ===
xlsx_path = "dados_climaticos.xlsx"
csv_path  = "dados_climaticos.csv"

print("Convertendo XLSX para CSV...")
df_tab = pd.read_excel(xlsx_path)
df_tab.to_csv(csv_path, index=False)
print(f"  Gerado: {csv_path}\n")

# === 2) Leitura e união de GeoJSONs ===
geojson_dir = "geojson_events"  # pasta contendo, por exemplo, "floods.geojson", "fires.geojson", etc.
print("Lendo GeoJSONs de desastres...")
gdfs = []
for fpath in glob.glob(os.path.join(geojson_dir, "*.geojson")):
    print(f"  → {os.path.basename(fpath)}")
    gdf = gpd.read_file(fpath).to_crs(epsg=4326)
    # opcional: adicionar coluna com tipo extraída do nome do arquivo
    dtype = os.path.splitext(os.path.basename(fpath))[0]
    gdf["disaster_type"] = dtype
    gdfs.append(gdf)

gdf_events = gpd.GeoDataFrame(pd.concat(gdfs, ignore_index=True), crs="epsg:4326")
print(f"  Total de eventos carregados: {len(gdf_events)}\n")

# === 3) Conversão de pontos tabulares em GeoDataFrame e spatial join ===
print("Criando GeoDataFrame dos dados tabulares...")
df_tab = pd.read_csv(csv_path)
df_tab["geometry"] = df_tab.apply(
    lambda row: Point(row.Longitude, row.Latitude), axis=1
)
gdf_meta = gpd.GeoDataFrame(df_tab, geometry="geometry", crs="epsg:4326")
print(f"  Pontos tabulares: {len(gdf_meta)}")

print("Executando spatial join...")
gdf_joined = gpd.sjoin(
    gdf_meta,
    gdf_events[["eventid","geometry"]],
    how="inner",
    predicate="within"
)
print(f"  Registros após join: {len(gdf_joined)}\n")

# === 4) Feature Engineering ===
print("Gerando features por evento...")
# Exemplo: agregações de precipitação, magnitude, alertscore
# Ajuste os nomes de colunas conforme seu XSLX/CSV real
features = (
    gdf_joined
    .groupby("eventid")
    .agg({
        "precipitacao": "mean",
        "temperatura":   "mean",
        "Magnitude":     "max",
        "alertscore":    "max"
    })
    .reset_index()
)

# Área histórica do polígono
gdf_events["area_hist"] = gdf_events.geometry.area
features = features.merge(
    gdf_events[["eventid","area_hist"]],
    on="eventid"
)
print(f"  Features dimension: {features.shape}\n")

# === 5) Treinamento do Modelo ===
print("Treinando modelo XGBoost para regressão de área...")
X = features.drop(["eventid","area_hist"], axis=1)
y = features["area_hist"]
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
model = xgb.XGBRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)
y_pred = model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
print(f"  MAE no teste: {mae:.4f}\n")

# === 6) Predição e geração de bounding boxes ===
print("Gerando bounding boxes simplificadas para novas previsões...")
# Aqui reaproveitamos gdf_meta e features para dados futuros simulados
# No protótipo, usamos os mesmos pontos de testes
features_novos = features.drop(["area_hist"], axis=1).drop("eventid", axis=1)
areas_pred = model.predict(features_novos)

def bbox_from_point(pt: Point, area: float) -> box:
    # ~ 1 grau ≈ 111km; área em unidades² do CRS (graus² para WGS84)
    delta = (area ** 0.5) / 111000
    return box(pt.x - delta, pt.y - delta, pt.x + delta, pt.y + delta)

geoms = [
    bbox_from_point(pt, a)
    for pt, a in zip(gdf_meta.geometry, areas_pred)
]
gdf_pred = gpd.GeoDataFrame(features_novos, geometry=geoms, crs="epsg:4326")
print(f"  Bounding boxes criadas: {len(gdf_pred)}\n")

# === 7) Exportação GeoJSON ===
out_geojson = "predicao_areas.geojson"
gdf_pred.to_file(out_geojson, driver="GeoJSON")
print(f"GeoJSON de saída gerado: {out_geojson}\n")

# === 8) Visualização com Folium ===
print("Criando mapa interativo com Folium...")
center = [gdf_meta.geometry.y.mean(), gdf_meta.geometry.x.mean()]
m = folium.Map(location=center, zoom_start=5)
folium.GeoJson(out_geojson, name="Área Predita").add_to(m)

html_out = "mapa_predicao.html"
m.save(html_out)
print(f"Mapa salvo em: {html_out}")

# Fim do protótipo
print("\nPipeline concluído com sucesso.")