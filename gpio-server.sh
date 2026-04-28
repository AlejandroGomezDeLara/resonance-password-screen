#!/usr/bin/env python3

import subprocess
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
import json

PORT = 3000
GPIO_PIN = 18

class GPIOHTTPHandler(BaseHTTPRequestHandler):
    
    def do_POST(self):
        if self.path == '/open-door':
            print(f'[POST] Abriendo puerta - Activando GPIO pin {GPIO_PIN} a estado alto (dh)...')
            try:
                subprocess.run(['raspi-gpio', 'set', str(GPIO_PIN), 'dh'], check=True)
                response = {'success': True, 'message': 'Puerta abierta'}
                self.send_response(200)
            except subprocess.CalledProcessError as e:
                print(f'Error al activar GPIO: {e}')
                response = {'success': False, 'message': 'Error al activar GPIO'}
                self.send_response(500)
        else:
            response = {'success': False, 'message': 'Ruta no encontrada'}
            self.send_response(404)
        
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(response).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        if self.path == '/health':
            response = {'status': 'ok'}
            self.send_response(200)
        else:
            response = {'status': 'not found'}
            self.send_response(404)
        
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(response).encode())
    
    def log_message(self, format, *args):
        # Log personalizado
        print(f'[{self.client_address[0]}] {format % args}')

def initialize_gpio():
    try:
        print(f'Configurando GPIO pin {GPIO_PIN} como salida...')
        subprocess.run(['raspi-gpio', 'set', str(GPIO_PIN), 'op'], check=True)
        print(f'Inicializando GPIO pin {GPIO_PIN} al estado bajo (dl)...')
        subprocess.run(['raspi-gpio', 'set', str(GPIO_PIN), 'dl'], check=True)
        print('GPIO inicializado correctamente')
    except subprocess.CalledProcessError as e:
        print(f'Error al inicializar GPIO: {e}')
        print('Nota: Asegúrate de ejecutar este programa con permisos de root (sudo)')
        sys.exit(1)

if __name__ == '__main__':
    initialize_gpio()
    
    server_address = ('127.0.0.1', PORT)
    httpd = HTTPServer(server_address, GPIOHTTPHandler)
    
    print(f'Servidor GPIO escuchando en http://127.0.0.1:{PORT}')
    print('Presiona Ctrl+C para detener')
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nCerrando servidor...')
        try:
            print(f'Desactivando GPIO pin {GPIO_PIN} al estado bajo (dl)...')
            subprocess.run(['raspi-gpio', 'set', str(GPIO_PIN), 'dl'], check=True)
        except subprocess.CalledProcessError as e:
            print(f'Error al desactivar GPIO: {e}')
        sys.exit(0)
