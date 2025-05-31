#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Protótipo único: ingestão (XLSX → CSV, GeoJSONs),
pré-processamento avançado por tipo de desastre,
treinamento de modelo e visualização via Leaflet.

Cada tipo de desastre terá features ambientais específicas (quando disponíveis):
- Floods: altitude média (DEM).
- Earthquakes: magnitude (já presente).
- ForestFires: NDVI médio (se ndvi.tif existir).
- Droughts: anomalia de precipitação (se prec_hist.tif existir).
- Cyclones: distância ao litoral (se coastline.shp existir).
- Volcanoes: altitude do cume (usando DEM se disponível).

Na visualização final, cada polígono previsto é colorido de acordo com
o seu tipo de desastre e exibe um popup com as informações.
"""

import os
import glob
import math
import random
import numpy as np
import pandas as pd
import geopandas as gpd
import rasterio
import rasterio.mask
from shapely.geometry import Point, Polygon
from shapely.ops import unary_union
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import xgboost as xgb
import folium

# =============================================================================
# 1) XLSX → CSV
# =============================================================================
xlsx_path = "public_emdat_custom_request_2025-05-16_5caa0c10-5497-43c0-a9c5-86466dcbdca0.xlsx"
csv_path  = "dados_climaticos.csv"

print("Convertendo XLSX para CSV...")
df_tab = pd.read_excel(xlsx_path)
df_tab.to_csv(csv_path, index=False)
print(f"  Gerado: {csv_path}\n")

# =============================================================================
# 2) Leitura e união de GeoJSONs de desastres
# =============================================================================
geojson_dir = "geojson_events"
print("Lendo GeoJSONs de desastres...")
gdfs = []
for fpath in glob.glob(os.path.join(geojson_dir, "*.geojson")):
    print(f"  → {os.path.basename(fpath)}")
    gdf = gpd.read_file(fpath).to_crs(epsg=4326)  # mantemos em WGS84 para união
    dtype = os.path.splitext(os.path.basename(fpath))[0]  # ex: "Floods", "Earthquakes", etc.
    gdf["disaster_type"] = dtype
    gdfs.append(gdf)

gdf_events = gpd.GeoDataFrame(pd.concat(gdfs, ignore_index=True), crs="epsg:4326")
print(f"  Total de eventos carregados: {len(gdf_events)}\n")

# =============================================================================
# 3) Conversão de pontos tabulares em GeoDataFrame e spatial join
# =============================================================================
print("Criando GeoDataFrame dos dados tabulares...")
df_tab = pd.read_csv(csv_path)

print("Colunas disponíveis no CSV:")
print(list(df_tab.columns))

expected_cols = {"Longitude", "Latitude", "Magnitude"}
optional_cols = {"precipitacao", "temperatura", "alertscore"}

missing_expected = expected_cols - set(df_tab.columns)
if missing_expected:
    raise KeyError(f"As colunas esperadas não estão presentes: {missing_expected}")

for col in optional_cols:
    if col not in df_tab.columns:
        print(f"A coluna opcional '{col}' não foi encontrada. Adicionando com NaN.")
        df_tab[col] = pd.NA

df_tab["geometry"] = df_tab.apply(lambda row: Point(row.Longitude, row.Latitude), axis=1)
gdf_meta = gpd.GeoDataFrame(df_tab, geometry="geometry", crs="epsg:4326")
print(f"  Pontos tabulares: {len(gdf_meta)}")

print("Executando spatial join entre eventos e dados tabulares...")
gdf_joined = gpd.sjoin(
    gdf_events,
    gdf_meta[["geometry", "precipitacao", "temperatura", "Magnitude", "alertscore"]],
    how="left",
    predicate="intersects"
)
print(f"  Registros após join: {len(gdf_joined)}\n")

for col in optional_cols:
    if col not in gdf_joined.columns:
        gdf_joined[col] = pd.NA

# =============================================================================
# 4) Feature Engineering AVANÇADO POR TIPO DE DESASTRE
# =============================================================================
print("Iniciando feature engineering condicional por tipo de desastre...")

# 4.1) Converter colunas básicas
for col in optional_cols:
    gdf_joined[col] = pd.to_numeric(gdf_joined[col], errors='coerce')
gdf_joined[list(optional_cols)] = gdf_joined[list(optional_cols)].fillna(0)

# 4.2) Calcular área real dos eventos (m²) preparando target
gdf_events_proj = gdf_events.to_crs(epsg=3857)
gdf_events["area_hist"] = gdf_events_proj.geometry.area  # em m²

# Copiar 'area_hist' para gdf_events_proj antes de reprojetar de volta
gdf_events_proj["area_hist"] = gdf_events["area_hist"]

# 4.3) Tentar abrir DEM para altimetria
dem_path = "dem.tif"
if os.path.exists(dem_path):
    dem = rasterio.open(dem_path)

    def elevar_polygon_mean(polygon, raster):
        """
        Recebe um shapely Polygon em EPSG:4326 ou EPSG:3857,
        amostra o raster e retorna a média dos pixels dentro do polígono.
        Assume que o raster está em EPSG:3857.
        """
        # Reprojeta polígono para CRS do raster se necessário
        if polygon.crs != raster.crs:
            tmp = gpd.GeoDataFrame(geometry=[polygon], crs=polygon.crs)
            tmp = tmp.to_crs(raster.crs)
            poly_proj = tmp.iloc[0].geometry
        else:
            poly_proj = polygon

        try:
            out_image, _ = rasterio.mask.mask(raster, [poly_proj], crop=True)
            arr = out_image[0]
            arr = arr[arr != raster.nodata]
            if arr.size == 0:
                return np.nan
            return float(arr.mean())
        except Exception:
            return np.nan

    gdf_events_proj["elev_media"] = gdf_events_proj.geometry.apply(lambda geom: elevar_polygon_mean(geom, dem))
else:
    print("dem.tif não encontrado. Altimetria será definida como NaN.")
    gdf_events_proj["elev_media"] = np.nan

# 4.4) Tentar abrir NDVI para ForestFires
ndvi_path = "ndvi.tif"
if os.path.exists(ndvi_path):
    ndvi_raster = rasterio.open(ndvi_path)
    gdf_events_proj["ndvi_media"] = gdf_events_proj.geometry.apply(
        lambda geom: elevar_polygon_mean(geom, ndvi_raster)
    )
else:
    print("ndvi.tif não encontrado. NDVI será definido como NaN.")
    gdf_events_proj["ndvi_media"] = np.nan

# 4.5) Tentar abrir precipitação histórica para Droughts
prec_hist_path = "prec_hist.tif"
if os.path.exists(prec_hist_path):
    prec_raster = rasterio.open(prec_hist_path)
    gdf_events_proj["prec_hist_media"] = gdf_events_proj.geometry.apply(
        lambda geom: elevar_polygon_mean(geom, prec_raster)
    )
else:
    print("prec_hist.tif não encontrado. Precipitação histórica será definida como NaN.")
    gdf_events_proj["prec_hist_media"] = np.nan

# 4.6) Tentar calcular distância ao litoral para Cyclones
coast_shp = "coastline.shp"
if os.path.exists(coast_shp):
    coast = gpd.read_file(coast_shp).to_crs(epsg=3857)
    merged_coast = unary_union(coast.geometry)
    gdf_events_proj["distancia_litoral"] = gdf_events_proj.geometry.apply(
        lambda geom: float(geom.distance(merged_coast))
    )
else:
    print("coastline.shp não encontrado. Distância ao litoral será definida como NaN.")
    gdf_events_proj["distancia_litoral"] = np.nan

# =============================================================================
# 4.7) Construir DataFrame final de features
# =============================================================================
# Reprojetar gdf_events_proj (que já tem area_hist) de volta para EPSG:4326
gdf_events_full = gdf_events_proj.to_crs(epsg=4326)

# Unir informações básicas (de gdf_joined) e ambientais (de gdf_events_full)
basic_cols = ["eventid", "precipitacao", "temperatura", "Magnitude", "alertscore"]
gdf_basic = gdf_joined[basic_cols].drop_duplicates(subset=["eventid"])

env_cols = ["eventid", "elev_media", "ndvi_media", "prec_hist_media", "distancia_litoral", "area_hist"]
gdf_env = gdf_events_full[env_cols]

df_features = pd.merge(gdf_basic, gdf_env, on="eventid", how="inner")
df_features = df_features.groupby("eventid").agg({
    "precipitacao":      "mean",
    "temperatura":       "mean",
    "Magnitude":         "max",
    "alertscore":        "max",
    "elev_media":        "mean",
    "ndvi_media":        "mean",
    "prec_hist_media":   "mean",
    "distancia_litoral": "mean",
    "area_hist":         "first"
}).reset_index()

print(f"Features finais construídas: {df_features.shape}\n")

# =============================================================================
# 5) Treinamento do Modelo
# =============================================================================
print("Treinando modelo XGBoost usando features temáticas...")
feature_columns = [
    "precipitacao", "temperatura", "Magnitude", "alertscore",
    "elev_media", "ndvi_media", "prec_hist_media", "distancia_litoral"
]
X = df_features[feature_columns].fillna(0)
y = df_features["area_hist"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model = xgb.XGBRegressor(
    n_estimators=150,
    random_state=42,
    objective='reg:squarederror'
)
model.fit(X_train, y_train)
y_pred = model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
print(f"  MAE no teste: {mae:.4f}\n")

# =============================================================================
# 6) Predição de novas áreas e geração de polígonos irregulares
# =============================================================================
print("Gerando polígonos irregulares para novas previsões...")

# Preparar pontos para métricas ambientais (reprojetando para EPSG:3857)
gdf_meta_proj = gdf_meta.to_crs(epsg=3857)

# Recalcular features ambientais nos pontos, se rasters existirem
if os.path.exists(dem_path):
    gdf_meta_proj["elev_media"] = gdf_meta_proj.geometry.buffer(1).apply(lambda g: elevar_polygon_mean(g, dem))
else:
    gdf_meta_proj["elev_media"] = 0

if os.path.exists(ndvi_path):
    gdf_meta_proj["ndvi_media"] = gdf_meta_proj.geometry.buffer(1).apply(lambda g: elevar_polygon_mean(g, ndvi_raster))
else:
    gdf_meta_proj["ndvi_media"] = 0

if os.path.exists(prec_hist_path):
    gdf_meta_proj["prec_hist_media"] = gdf_meta_proj.geometry.buffer(1).apply(lambda g: elevar_polygon_mean(g, prec_raster))
else:
    gdf_meta_proj["prec_hist_media"] = 0

if os.path.exists(coast_shp):
    gdf_meta_proj["distancia_litoral"] = gdf_meta_proj.geometry.apply(lambda g: float(g.distance(merged_coast)))
else:
    gdf_meta_proj["distancia_litoral"] = 0

# Copiar colunas básicas de 'gdf_joined' para 'gdf_meta_proj'
# Aqui supomos que a ordem em gdf_meta coincida com a de gdf_joined (caso contrário, ajustaria com merge por índice)
for col in ["precipitacao", "temperatura", "Magnitude", "alertscore"]:
    gdf_meta_proj[col] = gdf_meta_proj[col].fillna(0)

df_new_features = gdf_meta_proj[feature_columns].fillna(0)
areas_new_pred = model.predict(df_new_features)

def polygon_irregular_from_point(pt_m: Point, area_m2: float, num_vertices: int = 16, alpha: float = 0.4) -> Polygon:
    try:
        if area_m2 is None or math.isnan(area_m2) or area_m2 <= 0:
            radius_base = 100.0
        else:
            radius_base = math.sqrt(area_m2 / math.pi)
            if radius_base <= 0:
                radius_base = 100.0
    except Exception:
        radius_base = 100.0

    coords = []
    for i in range(num_vertices):
        theta = 2 * math.pi * i / num_vertices
        delta_i = (random.random() * 2.0) - 1.0
        r_i = radius_base * (1.0 + alpha * delta_i)
        x_i = pt_m.x + (r_i * math.cos(theta))
        y_i = pt_m.y + (r_i * math.sin(theta))
        coords.append((x_i, y_i))
    coords.append(coords[0])
    try:
        poly = Polygon(coords)
        if not poly.is_valid or poly.area <= 0:
            raise ValueError("Polígono inválido")
        return poly
    except Exception:
        return pt_m.buffer(100.0)

irregular_geoms_m = []
for pt_m, area_m2 in zip(gdf_meta_proj.geometry, areas_new_pred):
    poly_m = polygon_irregular_from_point(pt_m, area_m2, num_vertices=16, alpha=0.4)
    irregular_geoms_m.append(poly_m)

# Montar GeoDataFrame de polígonos métricos (EPSG:3857)
gdf_pred_irregular = gpd.GeoDataFrame(
    df_new_features.reset_index(drop=True),
    geometry=irregular_geoms_m,
    crs="epsg:3857"
).to_crs(epsg=4326)

# =============================================================================
# 6.1) Atribuir 'eventid' e 'disaster_type' a cada polígono previsto
# =============================================================================
# Fazer spatial join entre gdf_pred_irregular e gdf_events (cada evento tem disaster_type)
# Isso vai anexar 'eventid' e 'disaster_type' ao polígono previsto mais próximo (ou contido).
gdf_pred_irregular = gpd.sjoin(
    gdf_pred_irregular,
    gdf_events[["eventid", "disaster_type", "geometry"]],
    how="left",
    predicate="within"
)[["eventid", "disaster_type", "geometry"]].reset_index(drop=True)

print(f"  Polígonos irregulares gerados (com tipo de desastre): {len(gdf_pred_irregular)}\n")

# =============================================================================
# 7) Exportação GeoJSON
# =============================================================================
out_geojson = "predicao_areas.geojson"
gdf_pred_irregular.to_file(out_geojson, driver="GeoJSON")
print(f"GeoJSON de saída gerado: {out_geojson}\n")

# =============================================================================
# 8) Visualização com Folium
# =============================================================================
print("Criando mapa interativo com Folium...")

# Definir cores para cada tipo de desastre
color_dict = {
    "Floods":      "blue",
    "Earthquakes": "red",
    "ForestFires": "orange",
    "Droughts":    "brown",
    "Cyclones":    "purple",
    "Volcanoes":   "darkgray"
}

# Função de estilo para cada polígono, pegando 'disaster_type' de properties
def style_function(feature):
    dt = feature["properties"]["disaster_type"]
    return {
        "fillColor":   color_dict.get(dt, "black"),
        "color":       color_dict.get(dt, "black"),
        "weight":      1,
        "fillOpacity": 0.5
    }

# Função para popup: exibe tipo de desastre e estimativa de área (aproximada, em km²)
def popup_function(feature):
    dt = feature["properties"]["disaster_type"]
    # Se quiser exibir área estimada, seria preciso tê-la em uma coluna. 
    # Como não armazenamos a área exata no GeoDataFrame final, 
    # podemos apenas exibir o tipo. Se desejar área, acrescente antes no gdf_pred_irregular.
    html = f"<b>Tipo de Desastre:</b> {dt}"
    return html

# Construir o mapa centrado na média das latitudes e longitudes originais
center = [gdf_meta.geometry.y.mean(), gdf_meta.geometry.x.mean()]
m = folium.Map(location=center, zoom_start=5)

# Adicionar cada polígono com estilo e popup
folium.GeoJson(
    gdf_pred_irregular,
    name="Área Predita",
    style_function=style_function,
    tooltip=folium.GeoJsonTooltip(fields=["disaster_type"], aliases=["Desastre:"]),
    popup=folium.GeoJsonPopup(fields=["disaster_type"], aliases=["Tipo de Desastre:"])
).add_to(m)

# Adicionar legenda manual (folium não tem legenda automática para GeoJson colorido)
legend_html = """
<div style="
    position: fixed; 
    bottom: 50px; left: 50px; width: 180px; height: 200px; 
    border:2px solid grey; z-index:9999; font-size:14px;
    background-color: white;
    ">
    &nbsp;<b>Legenda dos Desastres</b><br>
    &nbsp;<i class="fa fa-square" style="color:blue"></i>&nbsp;Floods<br>
    &nbsp;<i class="fa fa-square" style="color:red"></i>&nbsp;Earthquakes<br>
    &nbsp;<i class="fa fa-square" style="color:orange"></i>&nbsp;ForestFires<br>
    &nbsp;<i class="fa fa-square" style="color:brown"></i>&nbsp;Droughts<br>
    &nbsp;<i class="fa fa-square" style="color:purple"></i>&nbsp;Cyclones<br>
    &nbsp;<i class="fa fa-square" style="color:darkgray"></i>&nbsp;Volcanoes<br>
</div>
"""
m.get_root().html.add_child(folium.Element(legend_html))

# Salvar o mapa em HTML
html_out = "mapa_predicao.html"
m.save(html_out)
print(f"Mapa salvo em: {html_out}")

print("\nPipeline concluído com sucesso.")
