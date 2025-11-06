from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

@app.route("/")
def status():
    return {"status": True}

@app.route("/guardar", methods=['POST'])
def guardar():
    try:
        # Recibir objeto del cliente
        data = request.get_json()

        # Datos principales
        ancho = data.get('ancho')
        alto = data.get('alto')
        modoCanvas = data.get('modoCanvas')
        datos = data.get('datos')
    
        # Formato: ancho,alto|x1,y1,x2,y2|x3,y3,x4,y4|...
        string_data = f"{ancho},{alto},{modoCanvas}"

        for dato in datos:
            string_data += "|"
            string_data += ",".join([str(elemento) for elemento in dato])

        # Datos de identificación
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
            'message': f'Datos guardados como {filename}',
            'filepath': filepath,
            'size': f'{file_size} bytes'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

@app.route("/listar/<path:ruta>", methods=['GET'])
def listar(ruta):
    try:
        carpeta = f'datos/{ruta}'
        if not os.path.exists(carpeta):
            return jsonify({'datos': []}), 200
        
        files = [f for f in os.listdir(carpeta) if f.endswith('.txt')]
        files.sort(key=lambda x: os.path.getmtime(os.path.join(carpeta, x)), reverse=True)
        
        return jsonify({'datos': files}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

@app.route("/cargar/<path:ruta>", methods=['GET'])
def cargar(ruta):
    try:
        if not os.path.exists(ruta):
            return jsonify({'error': 'Archivo no encontrado'}), 404
        
        # Extraer información de la ruta: datos/{planta}/{pregunta}_{id}{_corregido}.txt
        partes_ruta = ruta.split('/')
        planta = partes_ruta[1]  # Asumiendo estructura datos/planta/archivo.txt
        
        # Extraer información del nombre del archivo
        nombre_archivo = partes_ruta[-1].replace('.txt', '')
        
        # Verificar si está corregido
        corregido = nombre_archivo.endswith('_corregido')
        if corregido:
            nombre_archivo = nombre_archivo.replace('_corregido', '')
        
        # Separar pregunta e id: pregunta_id
        partes_nombre = nombre_archivo.split('_')
        pregunta = partes_nombre[0]
        id = partes_nombre[1]
        
        # Leer el archivo
        with open(ruta, 'r') as f:
            string_data = f.read()
        
        # Separar por "|" para obtener las secciones
        partes = string_data.split('|')
        
        # La primera parte contiene: ancho,alto,modoCanvas
        metadata = partes[0].split(',')
        ancho = int(metadata[0])
        alto = int(metadata[1])
        modoCanvas = metadata[2]
        
        # Las demás partes son los datos
        datos = []
        for i in range(1, len(partes)):
            elementos = partes[i].split(',')
            fila = []
            for elemento in elementos:
                try:
                    fila.append(float(elemento))  # Intenta convertir a número
                except ValueError:
                    fila.append(elemento)  # Si falla, mantiene el string
            datos.append(fila)
        
        # Reconstruir el objeto original completo
        objeto = {
            'id': id,
            'planta': planta,
            'pregunta': pregunta,
            'corregido': corregido,
            'ancho': ancho,
            'alto': alto,
            'datos': datos,
            'modoCanvas': modoCanvas
        }
        
        return jsonify(objeto), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run()