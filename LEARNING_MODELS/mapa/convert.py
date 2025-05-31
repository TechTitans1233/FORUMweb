#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script único para gerar polígonos realistas de eventos de desastres a partir de pontos.
Para cada tipo de desastre (Floods, ForestFires, Earthquakes, Droughts, Cyclones, Volcanoes),
usa dados auxiliares (DEM, NDVI, placas tectônicas, bacias, precipitação) para construir uma área
aproximada do evento e exportar tudo em um único GeoJSON “all_disaster_areas.geojson”.

Requisitos de arquivos (ver lista ao final do script):
- Pasta “geojson_events/” contendo todos os GeoJSONs de eventos (Floods.geojson, Earthquakes.geojson, etc.).
- dem.tif                → Modelo digital de elevação (para inundações).
- ndvi.tif               → Raster NDVI (para queimadas).
- tectonic_plates.geojson→ Polígonos das placas tectônicas (para terremotos/tsunamis).
- basins.geojson         → Polígonos de bacias hidrográficas (para secas).
- prec_hist.tif          → Raster de precipitação histórica (opcional refinamento para secas).
- coastline.shp (+ arquivos .dbf, .shx etc.) → Linha costeira (para simulação de tsunamis a partir da placa).
"""

import os
import glob
import numpy as np
import rasterio
from rasterio.features import shapes
import geopandas as gpd
import pandas as pd
from shapely.geometry import shape, Point
from shapely.ops import unary_union
import pyproj
from scipy import ndimage

# ── Caminhos dos arquivos auxiliares ─────────────────────────────────────────
GEOJSON_DIR     = "geojson_events"              # pasta com os GeoJSONs originais de eventos

DEM_PATH        = "dem.tif"                      # DEM (EPSG projetado, ex. EPSG:3857)
NDVI_PATH       = "ndvi.tif"                     # Raster NDVI (EPSG projetado)
PLATES_PATH     = "tectonic_plates.geojson"      # Polígonos de placas tectônicas (EPSG:4326)
BASINS_PATH     = "basins.geojson"               # Polígonos de bacias hidrográficas (EPSG:4326)
PREC_RAST_PATH  = "prec_hist.tif"                # Raster de precipitação histórica (EPSG projetado)
COASTLINE_PATH  = "coastline.shp"                # Linha costeira (p.ex., ESRI Shapefile, EPSG:4326)

# ── Leitura prévia de arquivos que serão usados repetidamente ─────────────────
# 1) DEM (inundações)
dem = None
if os.path.exists(DEM_PATH):
    dem = rasterio.open(DEM_PATH)

# 2) NDVI (queimadas)
ndvi = None
if os.path.exists(NDVI_PATH):
    ndvi = rasterio.open(NDVI_PATH)

# 3) Placas tectônicas (terremotos/tsunamis)
plates_gdf = None
if os.path.exists(PLATES_PATH):
    plates_gdf = gpd.read_file(PLATES_PATH).to_crs("EPSG:4326")

# 4) Bacias hidrográficas (secas)
basins_gdf = None
if os.path.exists(BASINS_PATH):
    basins_gdf = gpd.read_file(BASINS_PATH).to_crs("EPSG:4326")

# 5) Precipitação histórica (refinamento de secas)
prec_raster = None
if os.path.exists(PREC_RAST_PATH):
    prec_raster = rasterio.open(PREC_RAST_PATH)

# 6) Linha costeira (simulação de tsunami)
coastline_gdf = None
if os.path.exists(COASTLINE_PATH):
    coastline_gdf = gpd.read_file(COASTLINE_PATH).to_crs("EPSG:3857")  # reprojecta para metros
    merged_coast = unary_union(coastline_gdf.geometry)

# ── Funções de geração de polígonos por tipo de desastre ────────────────────────

def generate_flood_polygon(lon, lat):
    """
    Gera o polígono de área de inundação conectada a partir do ponto (lon, lat),
    usando o DEM como referência. Threshold = altitude do ponto + 0 m.
    Retorna um objeto shapely Polygon em EPSG:4326.
    """
    if dem is None:
        return None

    # 1) Converte ponto para CRS do DEM
    transformer = pyproj.Transformer.from_crs("EPSG:4326", dem.crs, always_xy=True)
    x_dem, y_dem = transformer.transform(lon, lat)
    row, col = dem.index(x_dem, y_dem)

    # 2) Lê todo o array de elevações (pode ser pesado, mas funciona)
    elev_array = dem.read(1)
    elev_point = elev_array[row, col]
    threshold = elev_point + 0  # ou ajuste se quiser margem extra

    # 3) Máscara binária: 1 se <= threshold
    mask = (elev_array <= threshold).astype(np.uint8)

    # 4) Componentes conectados (8‐neighbors)
    structure = np.ones((3, 3), dtype=np.int)
    labeled, _ = ndimage.label(mask, structure=structure)
    label_point = labeled[row, col]
    component = (labeled == label_point).astype(np.uint8)

    # 5) Vetorizar
    transform = dem.transform
    polygons = []
    for geom, val in shapes(component, mask=component == 1, transform=transform):
        polygons.append(shape(geom))
    flood_poly_proj = unary_union(polygons)  # em CRS do DEM

    # 6) Reprojeta para EPSG:4326
    project_back = pyproj.Transformer.from_crs(dem.crs, "EPSG:4326", always_xy=True).transform
    flood_poly_geo = shapely_transform(project_back, flood_poly_proj)
    return flood_poly_geo


def generate_fire_polygon(lon, lat):
    """
    Gera o polígono de queimadas em torno do ponto (lon, lat), usando NDVI.
    Threshold NDVI >= 0.4, dentro de buffer de 1 km ao redor do ponto.
    Retorna shapely Polygon em EPSG:4326.
    """
    if ndvi is None:
        return None

    # 1) Converte ponto para CRS do NDVI
    transformer = pyproj.Transformer.from_crs("EPSG:4326", ndvi.crs, always_xy=True)
    x_ndvi, y_ndvi = transformer.transform(lon, lat)
    row, col = ndvi.index(x_ndvi, y_ndvi)

    # 2) Calcula buffer em pixels (~1 km)
    res_m = abs(ndvi.transform.a)
    rad_m = 1000  # 1 km
    rad_px = int(rad_m / res_m) + 1

    row_min = max(0, row - rad_px)
    row_max = min(ndvi.height, row + rad_px)
    col_min = max(0, col - rad_px)
    col_max = min(ndvi.width, col + rad_px)

    window = ndvi.read(1, window=((row_min, row_max), (col_min, col_max)))
    mask = (window >= 0.4).astype(np.uint8)

    # 3) Conectividade
    labelled, _ = ndimage.label(mask)
    row_loc = row - row_min
    col_loc = col - col_min
    label_point = labelled[row_loc, col_loc]
    component = (labelled == label_point).astype(np.uint8)

    # 4) Vetorizar dentro da janela
    win_transform = rasterio.windows.transform(
        ((row_min, row_max), (col_min, col_max)), ndvi.transform
    )
    polygons = []
    for geom, val in shapes(component, mask=component == 1, transform=win_transform):
        polygons.append(shape(geom))
    fire_poly_proj = unary_union(polygons)

    # 5) Reprojetar para EPSG:4326
    project_back = pyproj.Transformer.from_crs(ndvi.crs, "EPSG:4326", always_xy=True).transform
    fire_poly_geo = shapely_transform(project_back, fire_poly_proj)
    return fire_poly_geo


def get_plate_polygon(lon, lat):
    """
    Identifica a placa tectônica em que o ponto (lon, lat) cai
    e retorna o polígono daquela placa (EPSG:4326). Se for necessário
    simular tsunami, intersecta o buffer costeiro de 50 km.
    """
    if plates_gdf is None:
        return None

    pt = Point(lon, lat)
    # Spatial join para encontrar a placa que contém o ponto
    matches = plates_gdf[plates_gdf.contains(pt)]
    if not matches.empty:
        plate_poly = matches.geometry.unary_union
    else:
        # Se não encontrar, retorna buffer genérico
        return pt.buffer(0.1)  # ~10 km em graus

    # Se tiver linha costeira, simula zona costeira de 50 km para tsunami
    if coastline_gdf is not None:
        # Trasnforma placa para EPSG:3857
        plate_proj = gpd.GeoSeries([plate_poly], crs="EPSG:4326").to_crs("EPSG:3857").iloc[0]
        ocean_buffer = merged_coast.buffer(50000)  # 50 km em metros
        coastal_zone = plate_proj.intersection(ocean_buffer)
        # Reprojeta de volta a 4326
        project_back = pyproj.Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True).transform
        return shapely_transform(project_back, coastal_zone)
    else:
        return plate_poly


def get_basin_polygon(lon, lat):
    """
    Identifica a bacia hidrográfica em que o ponto (lon, lat) cai e retorna
    o polígono da bacia (EPSG:4326). Se houver o raster de precipitação,
    faz refinamento interno filtrando pixels de precip < 50 mm.
    """
    if basins_gdf is None:
        return None

    pt = Point(lon, lat)
    matches = basins_gdf[basins_gdf.contains(pt)]
    if matches.empty:
        return pt.buffer(0.1)  # buffer genérico 10 km
    basin_poly = matches.geometry.unary_union

    # Se existir precipitação, filtra área de seca mais intensa
    if prec_raster is not None:
        # Reprojeta bacia para CRS do raster
        basin_proj = gpd.GeoSeries([basin_poly], crs="EPSG:4326").to_crs(prec_raster.crs).iloc[0]
        out_image, out_transform = rasterio.mask.mask(prec_raster, [basin_proj], crop=True)
        arr = out_image[0]
        # Máscara de precip < 50 mm
        mask = (arr < 50).astype(np.uint8)

        labeled, _ = ndimage.label(mask)
        # Pega centro do polígono (aprox) para raster index
        centroid = basin_proj.centroid
        col_cen, row_cen = prec_raster.index(centroid.x, centroid.y)
        label_point = labeled[row_cen, col_cen]
        component = (labeled == label_point).astype(np.uint8)

        polygons = []
        for geom, val in shapes(component, mask=component == 1, transform=out_transform):
            polygons.append(shape(geom))
        dry_poly_proj = unary_union(polygons)

        # Reprojeta para EPSG:4326
        project_back = pyproj.Transformer.from_crs(prec_raster.crs, "EPSG:4326", always_xy=True).transform
        dry_poly_geo = shapely_transform(project_back, dry_poly_proj)
        return dry_poly_geo
    else:
        return basin_poly


def generate_generic_buffer(lon, lat, properties):
    """
    Buffer circular genérico em torno do ponto (lon, lat). Usa a propriedade
    mais relevante (magnitude, alertscore, severitydata) para definir raio.
    Retorna polygon em EPSG:4326.
    """
    pt = Point(lon, lat)
    raio = 10000  # padrão: 10 km

    # Tenta extrair magnitude, alertscore, severitydata ou tamanho humano afetado
    for key in ("magnitude", "alertscore", "severitydata", "Total Affected", "No. Affected"):
        if key in properties and properties[key] is not None:
            try:
                val = float(properties[key])
                raio = val * 1000  # valor × 1 km
                break
            except:
                continue
    # Converte raio (em metros) para graus aproximados (~1° ≈ 111 km)
    raio_deg = raio / 111000.0
    return pt.buffer(raio_deg)


# Função auxiliar para reprojeção de geometria shapely
from functools import partial
from shapely.ops import transform as shapely_transform


# ── Loop principal: percorrer todos os GeoJSONs e gerar polígonos ──────────────

areas = []  # lista de dicionários para montar GeoDataFrame final

for fpath in glob.glob(os.path.join(GEOJSON_DIR, "*.geojson")):
    gdf = gpd.read_file(fpath).to_crs("EPSG:4326")
    dtype = os.path.splitext(os.path.basename(fpath))[0]  # ex.: "Floods", "Earthquakes"
    print(f"Processando {os.path.basename(fpath)} → tipo: {dtype}")

    for idx, row in gdf.iterrows():
        lon = row.geometry.x
        lat = row.geometry.y
        eventid = row.get("eventid", None)
        props = row  # contém todas as colunas originais

        if dtype == "Floods":
            poly = generate_flood_polygon(lon, lat)
        elif dtype == "ForestFires":
            poly = generate_fire_polygon(lon, lat)
        elif dtype == "Earthquakes":
            poly = get_plate_polygon(lon, lat)
        elif dtype == "Droughts":
            poly = get_basin_polygon(lon, lat)
        elif dtype == "Cyclones":
            # Para ciclones, fazemos buffer genérico baseado em alertscore
            poly = generate_generic_buffer(lon, lat, props)
        elif dtype == "Volcanoes":
            poly = generate_generic_buffer(lon, lat, props)
        else:
            poly = generate_generic_buffer(lon, lat, props)

        if poly is not None:
            areas.append({
                "eventid": eventid,
                "disaster_type": dtype,
                "geometry": poly
            })

# Monta GeoDataFrame com todas as áreas geradas
gdf_areas = gpd.GeoDataFrame(areas, crs="EPSG:4326")

# Exporta para GeoJSON único
OUT_GEOJSON = "all_disaster_areas.geojson"
gdf_areas.to_file(OUT_GEOJSON, driver="GeoJSON")
print(f"\nGeoJSON de saída gerado: {OUT_GEOJSON}")
