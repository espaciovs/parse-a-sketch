from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

def string_to_json(string_data):
    """Convierte string compacto a JSON de dibujo"""
    parts = string_data.split("|")
    if len(parts) == 0:
        return None
    
    # Extraer dimensiones
    dimensions = parts[0].split(",")
    width = int(dimensions[0])
    height = int(dimensions[1])
    
    # Extraer trazos
    strokes = []
    for i in range(1, len(parts)):
        coords = list(map(float, parts[i].split(",")))
        stroke = []
        for j in range(0, len(coords), 2):
            stroke.append([coords[j], coords[j + 1]])
        strokes.append(stroke)
    
    return {
        'width': width,
        'height': height,
        'strokes': strokes
    }

@app.route("/")
def status():
    return {"status": True}

@app.route("/guardar-animacion", methods=['POST'])
def guardar_animacion():
    try:
        # Recibir JSON del cliente
        data = request.get_json()

        ancho = data.get('ancho')
        alto = data.get('alto')
        datos = data.get('datos')
        modoCanvas = data.get('modoCanvas')
    
        # Formato: ancho,alto|x1,y1,x2,y2|x3,y3,x4,y4|...
        string_data = f"{ancho},{alto},{modoCanvas}"
    
        for dato in datos:
            string_data += "|"
            string_data += ",".join([str(elemento) for elemento in dato])

        planta = str(data.get('planta'))
        carpeta = f'datos/{planta}'
        os.makedirs(carpeta, exist_ok=True)
        
        pregunta = str(data.get('pregunta'))
        id = str(data.get('id'))
        corregido_valor = data.get('corregido')
        corregido = "_corregido" if corregido_valor else ""
        
        filename = f'{pregunta}_{id}{corregido}.txt'
        filepath = os.path.join(carpeta, filename)
        
        # Guardar como texto plano
        with open(filepath, 'w') as f:
            f.write(string_data)
        
        file_size = os.path.getsize(filepath)
        
        return jsonify({
            'message': f'Animación guardada como {filename}',
            'filepath': filepath,
            'size': f'{file_size} bytes'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route("/listar-animaciones", methods=['GET'])
def listar_animaciones():
    try:
        carpeta = 'datos/planta-1'
        if not os.path.exists(carpeta):
            return jsonify({'animations': []}), 200
        
        files = [f for f in os.listdir(carpeta) if f.endswith('.txt')]
        files.sort(key=lambda x: os.path.getmtime(os.path.join(carpeta, x)), reverse=True)
        
        return jsonify({'animations': files}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route("/cargar-animacion/<path:ruta>")
def cargar_animacion(ruta):
    """Endpoint que carga el archivo y devuelve JSON"""
    try:
        filepath = os.path.join('datos', ruta)
        
        # Leer el archivo de texto
        with open(filepath, 'r') as f:
            string_data = f.read()
        
        # Convertir string a JSON
        json_data = string_to_json(string_data)
        
        if json_data is None:
            return jsonify({'error': 'Formato de archivo inválido'}), 400
        
        return jsonify(json_data), 200
        
    except FileNotFoundError:
        return jsonify({'error': 'Archivo no encontrado'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Mantener el endpoint antiguo por compatibilidad
@app.route("/datos/<path:ruta>")
def servir_archivo(ruta):
    return send_from_directory('datos', ruta)

if __name__ == '__main__':
    app.run(debug=True)