#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_polygons_vectors.py

Fetches latest GDACS events and:
- Points with icons (as before)
- Polygons: computes area and shades them
- LineStrings: draws hurricane tracks with arrows
"""

from gdacs.api import GDACSAPIReader, GDACSAPIError
import folium
from folium.plugins import PolyLineTextPath
from shapely.geometry import shape
from shapely.ops import transform
from osgeo import osr

# Helper: compute geodesic area of a GeoJSON polygon
def compute_area(feat):
    geom = shape(feat['geometry'])
    # CRS: WGS84 (EPSG:4326)
    src = osr.SpatialReference()
    src.ImportFromEPSG(4326)
    # Equal-area projection (Lambert Azimuthal) centered on feature centroid
    centroid = geom.centroid
    dst = osr.SpatialReference()
    dst.ImportFromProj4(
        f"+proj=aeqd +lat_0={centroid.y} +lon_0={centroid.x} +units=m"
    )
    # Create coordinate transformation
    transformer = osr.CoordinateTransformation(src, dst)

    # Project function for shapely.ops.transform
    def project(x, y, z=None):
        x2, y2, _ = transformer.TransformPoint(x, y)
        return (x2, y2)

    # Apply transformation and compute area in m²
    area_m2 = transform(project, geom).area
    return area_m2


def add_event_to_map(m, feat, props, label, color):
    geom = feat.get('geometry', {})
    gtype = geom.get('type')
    coords = geom.get('coordinates')
    tooltip = folium.GeoJsonTooltip(
        fields=list(props.keys()),
        aliases=[k.replace('_',' ').capitalize()+':' for k in props.keys()],
        sticky=False
    )
    
    # 1) Point with icon or GeoJson as before…
    if gtype == 'Point':
        # …existing icon logic…
        pass

    # 2) Polygon / MultiPolygon → style + area popup
    elif gtype in ('Polygon','MultiPolygon'):
        # compute area (in km²)
        area_m2 = compute_area(feat)
        area_km2 = area_m2 / 1e6
        folium.GeoJson(
            data={"type":"FeatureCollection","features":[feat]},
            name=f"{label} (area ≈ {area_km2:.1f} km²)",
            style_function=lambda f, col=color: {
                'color': col,
                'weight': 2,
                'fillOpacity': 0.2
            },
            tooltip=tooltip,
            highlight_function=lambda f: {'weight':3,'fillOpacity':0.4},
            popup=folium.Popup(f"{label} – Área: {area_km2:.1f} km²")
        ).add_to(m)

    # 3) LineString → track polyline with arrows
    elif gtype == 'LineString':
        # Draw the track
        folium.PolyLine(
            locations=[(pt[1],pt[0]) for pt in coords],
            weight=3,
            color=color,
            opacity=0.8
        ).add_to(m)
        # Add arrowheads along the line:
        PolyLineTextPath(
            folium.PolyLine(
                locations=[(pt[1],pt[0]) for pt in coords],
                weight=0
            ),
            '   ▶️   ',  # arrow symbol
            repeat=True,
            offset=12,
            attributes={'font-size':'12','fill':color}
        ).add_to(m)

    # 4) Fallback for any other geometry
    else:
        folium.GeoJson(
            data={"type":"FeatureCollection","features":[feat]},
            name=label,
            style_function=lambda f, col=color: {
                'color': col, 'weight': 2, 'fillOpacity': 0.3
            },
            tooltip=tooltip
        ).add_to(m)


def main():
    client = GDACSAPIReader()
    event_types = {
        'TC': ('Tropical Cyclone', '#FF6633'),
        'EQ': ('Earthquake',      '#FF33FF'),
        'FL': ('Flood',           '#33FF66'),
        'VO': ('Volcano',         '#FF3333'),
        'WF': ('Wild Fire',       '#FF9933'),
        'DR': ('Drought',         '#3366FF'),
    }

    m = folium.Map(location=[0,0], zoom_start=2, tiles='CartoDB positron')

    for code,(label,color) in event_types.items():
        try:
            feed = client.latest_events(event_type=code, limit=1, full_detail=True)
            feats = feed.dict().get('features',[])
            if not feats: continue
            feat  = feats[0]
            props = feat.get('properties',{})
            add_event_to_map(m, feat, props, label, color)
        except GDACSAPIError as e:
            print(f"Error {label}: {e}")

    folium.LayerControl().add_to(m)
    m.save('gdacs_map_polygons_tracks.html')
    print("Map with polygons & tracks saved.")

if __name__ == "__main__":
    main()
