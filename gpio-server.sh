#!/bin/bash

# Script de control GPIO para la Raspberry Pi
# Este script espera peticiones HTTP en localhost:3000

PORT=3000
GPIO_PIN=18

# Función para activar/desactivar GPIO
control_gpio() {
    local state=$1
    case $state in
        "HIGH"|"dh")
            echo "Activando GPIO pin $GPIO_PIN al estado alto..."
            raspi-gpio set $GPIO_PIN dh
            ;;
        "LOW"|"dl")
            echo "Desactivando GPIO pin $GPIO_PIN al estado bajo..."
            raspi-gpio set $GPIO_PIN dl
            ;;
    esac
}

# Inicializar GPIO - primero configurar como salida, luego poner en LOW
echo "Configurando GPIO pin $GPIO_PIN como salida..."
raspi-gpio set $GPIO_PIN op

echo "Inicializando GPIO pin $GPIO_PIN al estado bajo..."
control_gpio LOW

# Crear servidor HTTP simple usando nc (netcat)
echo "Servidor HTTP escuchando en http://127.0.0.1:$PORT"

while true; do
    {
        read -r method path protocol
        
        # Leer headers hasta línea vacía
        while read -r line; do
            [[ "$line" == $'\r' ]] && break
        done
        
        if [[ "$method" == "POST" && "$path" == "/open-door" ]]; then
            control_gpio HIGH
            echo -ne "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: 56\r\n\r\n"
            echo -n '{"success":true,"message":"Puerta abierta"}'
        elif [[ "$method" == "OPTIONS" ]]; then
            echo -ne "HTTP/1.1 200 OK\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\nContent-Length: 0\r\n\r\n"
        elif [[ "$method" == "GET" && "$path" == "/health" ]]; then
            echo -ne "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: 26\r\n\r\n"
            echo -n '{"status":"ok"}'
        else
            echo -ne "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n"
        fi
    } | nc -l -p $PORT -q 1
done
