import pandas as pd

# Lista de exemplos multilingues com localização real e impacto
exemplos = {
    "seca": [
        {
            "mensagem": "Não chove há semanas, tudo seco.",
            "localizacao": "Petrolina, PE, Brasil",
            "latitude": -9.3891,
            "longitude": -40.5027,
            "impacto": "moderado"
        },
        {
            "mensagem": "The crops are dying due to drought.",
            "localizacao": "Phoenix, AZ, USA",
            "latitude": 33.4484,
            "longitude": -112.0740,
            "impacto": "alto"
        },
        {
            "mensagem": "Las plantas se están muriendo por la sequía.",
            "localizacao": "Monterrey, México",
            "latitude": 25.6866,
            "longitude": -100.3161,
            "impacto": "alto"
        },
        {
            "mensagem": "Nous subissons une grave sécheresse.",
            "localizacao": "Marselha, França",
            "latitude": 43.2965,
            "longitude": 5.3698,
            "impacto": "moderado"
        },
        {
            "mensagem": "Tanaman mati karena kekeringan.",
            "localizacao": "Kupang, Indonésia",
            "latitude": -10.1772,
            "longitude": 123.6070,
            "impacto": "moderado"
        }
    ],
    "ciclone": [
        {
            "mensagem": "Um ciclone se aproxima da costa.",
            "localizacao": "Florianópolis, SC, Brasil",
            "latitude": -27.5954,
            "longitude": -48.5480,
            "impacto": "alto"
        },
        {
            "mensagem": "Tropical cyclone approaching with force.",
            "localizacao": "Suva, Fiji",
            "latitude": -18.1416,
            "longitude": 178.4419,
            "impacto": "alto"
        },
        {
            "mensagem": "Ciclón tropical llegando con fuerza.",
            "localizacao": "Santo Domingo, República Dominicana",
            "latitude": 18.4861,
            "longitude": -69.9312,
            "impacto": "alto"
        },
        {
            "mensagem": "Cyclone tropical en approche.",
            "localizacao": "Saint-Denis, Reunião",
            "latitude": -20.8789,
            "longitude": 55.4481,
            "impacto": "moderado"
        },
        {
            "mensagem": "Siklon tropis mendekat dengan kekuatan.",
            "localizacao": "Manado, Indonésia",
            "latitude": 1.4748,
            "longitude": 124.8428,
            "impacto": "alto"
        }
    ],
    "terremoto": [
        {
            "mensagem": "Sentimos um forte abalo sísmico.",
            "localizacao": "São Paulo, SP, Brasil",
            "latitude": -23.5505,
            "longitude": -46.6333,
            "impacto": "baixo"
        },
        {
            "mensagem": "We felt a strong earthquake.",
            "localizacao": "Los Angeles, CA, USA",
            "latitude": 34.0522,
            "longitude": -118.2437,
            "impacto": "alto"
        },
        {
            "mensagem": "Un fuerte sismo se sintió.",
            "localizacao": "Cidade da Guatemala, Guatemala",
            "latitude": 14.6349,
            "longitude": -90.5069,
            "impacto": "alto"
        },
        {
            "mensagem": "Nous avons ressenti un tremblement de terre.",
            "localizacao": "Nice, França",
            "latitude": 43.7102,
            "longitude": 7.2620,
            "impacto": "moderado"
        },
        {
            "mensagem": "Kami merasakan gempa bumi yang kuat.",
            "localizacao": "Padang, Indonésia",
            "latitude": -0.9471,
            "longitude": 100.4172,
            "impacto": "alto"
        }
    ],
    "enchente": [
        {
            "mensagem": "As ruas estão completamente alagadas.",
            "localizacao": "Belém, PA, Brasil",
            "latitude": -1.4558,
            "longitude": -48.4902,
            "impacto": "alto"
        },
        {
            "mensagem": "Streets are completely flooded.",
            "localizacao": "Houston, TX, USA",
            "latitude": 29.7604,
            "longitude": -95.3698,
            "impacto": "alto"
        },
        {
            "mensagem": "Calles totalmente inundadas.",
            "localizacao": "Barranquilla, Colômbia",
            "latitude": 10.9878,
            "longitude": -74.7889,
            "impacto": "moderado"
        },
        {
            "mensagem": "Les rues sont complètement inondées.",
            "localizacao": "Lyon, França",
            "latitude": 45.7640,
            "longitude": 4.8357,
            "impacto": "moderado"
        },
        {
            "mensagem": "Jalanan tergenang air sepenuhnya.",
            "localizacao": "Jakarta, Indonésia",
            "latitude": -6.2088,
            "longitude": 106.8456,
            "impacto": "alto"
        }
    ],
    "queimada": [
        {
            "mensagem": "Fogo avança rapidamente.",
            "localizacao": "Cuiabá, MT, Brasil",
            "latitude": -15.6014,
            "longitude": -56.0979,
            "impacto": "alto"
        },
        {
            "mensagem": "Fire spreading fast.",
            "localizacao": "California, USA",
            "latitude": 36.7783,
            "longitude": -119.4179,
            "impacto": "alto"
        },
        {
            "mensagem": "El fuego avanza muy rápido.",
            "localizacao": "Santa Cruz, Bolívia",
            "latitude": -17.7833,
            "longitude": -63.1821,
            "impacto": "alto"
        },
        {
            "mensagem": "Le feu se propage rapidement.",
            "localizacao": "Marselha, França",
            "latitude": 43.2965,
            "longitude": 5.3698,
            "impacto": "moderado"
        },
        {
            "mensagem": "Api menyebar dengan cepat.",
            "localizacao": "Pontianak, Indonésia",
            "latitude": -0.0263,
            "longitude": 109.3425,
            "impacto": "alto"
        }
    ],
    "vulcao": [
        {
            "mensagem": "O vulcão entrou em erupção.",
            "localizacao": "Cumbre Vieja, La Palma, Espanha",
            "latitude": 28.5700,
            "longitude": -17.8400,
            "impacto": "alto"
        },
        {
            "mensagem": "The volcano has erupted.",
            "localizacao": "Mount St. Helens, WA, USA",
            "latitude": 46.1912,
            "longitude": -122.1944,
            "impacto": "alto"
        },
        {
            "mensagem": "El volcán hizo erupción.",
            "localizacao": "Popocatépetl, México",
            "latitude": 19.0236,
            "longitude": -98.6226,
            "impacto": "alto"
        },
        {
            "mensagem": "Le volcan est entré en éruption.",
            "localizacao": "Piton de la Fournaise, Reunião",
            "latitude": -21.2448,
            "longitude": 55.7089,
            "impacto": "alto"
        },
        {
            "mensagem": "Gunung berapi meletus.",
            "localizacao": "Merapi, Indonésia",
            "latitude": -7.5407,
            "longitude": 110.4462,
            "impacto": "alto"
        }
    ]
}

# Gerar dataset
dataset = []
for categoria, eventos in exemplos.items():
    for evento in eventos:
        dataset.append({
            "mensagem": evento["mensagem"],
            "categoria": categoria,
            "localizacao": evento["localizacao"],
            "latitude": evento["latitude"],
            "longitude": evento["longitude"],
            "impacto": evento["impacto"]
        })

df = pd.DataFrame(dataset)
df.to_csv("dataset_multilingue_localizado.csv", index=False, encoding='utf-8')
print("✅ Dataset salvo com sucesso com", len(df), "linhas.")
import pandas as pd

# Lista de exemplos multilingues com localização real e impacto
exemplos = {
    "seca": [
        {
            "mensagem": "Não chove há semanas, tudo seco.",
            "localizacao": "Petrolina, PE, Brasil",
            "latitude": -9.3891,
            "longitude": -40.5027,
            "impacto": "moderado"
        },
        {
            "mensagem": "The crops are dying due to drought.",
            "localizacao": "Phoenix, AZ, USA",
            "latitude": 33.4484,
            "longitude": -112.0740,
            "impacto": "alto"
        },
        {
            "mensagem": "Las plantas se están muriendo por la sequía.",
            "localizacao": "Monterrey, México",
            "latitude": 25.6866,
            "longitude": -100.3161,
            "impacto": "alto"
        },
        {
            "mensagem": "Nous subissons une grave sécheresse.",
            "localizacao": "Marselha, França",
            "latitude": 43.2965,
            "longitude": 5.3698,
            "impacto": "moderado"
        },
        {
            "mensagem": "Tanaman mati karena kekeringan.",
            "localizacao": "Kupang, Indonésia",
            "latitude": -10.1772,
            "longitude": 123.6070,
            "impacto": "moderado"
        }
    ],
    "ciclone": [
        {
            "mensagem": "Um ciclone se aproxima da costa.",
            "localizacao": "Florianópolis, SC, Brasil",
            "latitude": -27.5954,
            "longitude": -48.5480,
            "impacto": "alto"
        },
        {
            "mensagem": "Tropical cyclone approaching with force.",
            "localizacao": "Suva, Fiji",
            "latitude": -18.1416,
            "longitude": 178.4419,
            "impacto": "alto"
        },
        {
            "mensagem": "Ciclón tropical llegando con fuerza.",
            "localizacao": "Santo Domingo, República Dominicana",
            "latitude": 18.4861,
            "longitude": -69.9312,
            "impacto": "alto"
        },
        {
            "mensagem": "Cyclone tropical en approche.",
            "localizacao": "Saint-Denis, Reunião",
            "latitude": -20.8789,
            "longitude": 55.4481,
            "impacto": "moderado"
        },
        {
            "mensagem": "Siklon tropis mendekat dengan kekuatan.",
            "localizacao": "Manado, Indonésia",
            "latitude": 1.4748,
            "longitude": 124.8428,
            "impacto": "alto"
        }
    ],
    "terremoto": [
        {
            "mensagem": "Sentimos um forte abalo sísmico.",
            "localizacao": "São Paulo, SP, Brasil",
            "latitude": -23.5505,
            "longitude": -46.6333,
            "impacto": "baixo"
        },
        {
            "mensagem": "We felt a strong earthquake.",
            "localizacao": "Los Angeles, CA, USA",
            "latitude": 34.0522,
            "longitude": -118.2437,
            "impacto": "alto"
        },
        {
            "mensagem": "Un fuerte sismo se sintió.",
            "localizacao": "Cidade da Guatemala, Guatemala",
            "latitude": 14.6349,
            "longitude": -90.5069,
            "impacto": "alto"
        },
        {
            "mensagem": "Nous avons ressenti un tremblement de terre.",
            "localizacao": "Nice, França",
            "latitude": 43.7102,
            "longitude": 7.2620,
            "impacto": "moderado"
        },
        {
            "mensagem": "Kami merasakan gempa bumi yang kuat.",
            "localizacao": "Padang, Indonésia",
            "latitude": -0.9471,
            "longitude": 100.4172,
            "impacto": "alto"
        }
    ],
    "enchente": [
        {
            "mensagem": "As ruas estão completamente alagadas.",
            "localizacao": "Belém, PA, Brasil",
            "latitude": -1.4558,
            "longitude": -48.4902,
            "impacto": "alto"
        },
        {
            "mensagem": "Streets are completely flooded.",
            "localizacao": "Houston, TX, USA",
            "latitude": 29.7604,
            "longitude": -95.3698,
            "impacto": "alto"
        },
        {
            "mensagem": "Calles totalmente inundadas.",
            "localizacao": "Barranquilla, Colômbia",
            "latitude": 10.9878,
            "longitude": -74.7889,
            "impacto": "moderado"
        },
        {
            "mensagem": "Les rues sont complètement inondées.",
            "localizacao": "Lyon, França",
            "latitude": 45.7640,
            "longitude": 4.8357,
            "impacto": "moderado"
        },
        {
            "mensagem": "Jalanan tergenang air sepenuhnya.",
            "localizacao": "Jakarta, Indonésia",
            "latitude": -6.2088,
            "longitude": 106.8456,
            "impacto": "alto"
        }
    ],
    "queimada": [
        {
            "mensagem": "Fogo avança rapidamente.",
            "localizacao": "Cuiabá, MT, Brasil",
            "latitude": -15.6014,
            "longitude": -56.0979,
            "impacto": "alto"
        },
        {
            "mensagem": "Fire spreading fast.",
            "localizacao": "California, USA",
            "latitude": 36.7783,
            "longitude": -119.4179,
            "impacto": "alto"
        },
        {
            "mensagem": "El fuego avanza muy rápido.",
            "localizacao": "Santa Cruz, Bolívia",
            "latitude": -17.7833,
            "longitude": -63.1821,
            "impacto": "alto"
        },
        {
            "mensagem": "Le feu se propage rapidement.",
            "localizacao": "Marselha, França",
            "latitude": 43.2965,
            "longitude": 5.3698,
            "impacto": "moderado"
        },
        {
            "mensagem": "Api menyebar dengan cepat.",
            "localizacao": "Pontianak, Indonésia",
            "latitude": -0.0263,
            "longitude": 109.3425,
            "impacto": "alto"
        }
    ],
    "vulcao": [
        {
            "mensagem": "O vulcão entrou em erupção.",
            "localizacao": "Cumbre Vieja, La Palma, Espanha",
            "latitude": 28.5700,
            "longitude": -17.8400,
            "impacto": "alto"
        },
        {
            "mensagem": "The volcano has erupted.",
            "localizacao": "Mount St. Helens, WA, USA",
            "latitude": 46.1912,
            "longitude": -122.1944,
            "impacto": "alto"
        },
        {
            "mensagem": "El volcán hizo erupción.",
            "localizacao": "Popocatépetl, México",
            "latitude": 19.0236,
            "longitude": -98.6226,
            "impacto": "alto"
        },
        {
            "mensagem": "Le volcan est entré en éruption.",
            "localizacao": "Piton de la Fournaise, Reunião",
            "latitude": -21.2448,
            "longitude": 55.7089,
            "impacto": "alto"
        },
        {
            "mensagem": "Gunung berapi meletus.",
            "localizacao": "Merapi, Indonésia",
            "latitude": -7.5407,
            "longitude": 110.4462,
            "impacto": "alto"
        }
    ]
}

# Gerar dataset
dataset = []
for categoria, eventos in exemplos.items():
    for evento in eventos:
        dataset.append({
            "mensagem": evento["mensagem"],
            "categoria": categoria,
            "localizacao": evento["localizacao"],
            "latitude": evento["latitude"],
            "longitude": evento["longitude"],
            "impacto": evento["impacto"]
        })

df = pd.DataFrame(dataset)
df.to_csv("dataset_multilingue_localizado.csv", index=False, encoding='utf-8')
print("✅ Dataset salvo com sucesso com", len(df), "linhas.")
