# Configuración para Raspberry Pi - Kiosk Automático

## Pasos de setup (ejecutar UNA SOLA VEZ en la Raspberry Pi):

### 1. Configurar el GPIO 18 como output permanente al arrancar la Raspberry Pi
En Raspberry Pi OS actual suele ser `/boot/firmware/config.txt`. En algunas instalaciones antiguas puede ser `/boot/config.txt`.

Añade esta línea:

```ini
gpio=18=op,dl
```

Eso hace que el pin 18 arranque ya como salida y en nivel bajo.

### 2. Copiar el servicio systemd
```bash
sudo cp gpio-control.service /etc/systemd/system/
sudo systemctl daemon-reload
```

### 3. Habilitar el servicio para que inicie automáticamente
```bash
sudo systemctl enable gpio-control
```

### 4. Iniciar el servicio (o esperar a que se inicie con el próximo reinicio)
```bash
sudo systemctl start gpio-control
```

### 5. Verificar que está corriendo
```bash
sudo systemctl status gpio-control
```

## Lo que pasa automáticamente:

1. **Al encender la Raspberry Pi**:
   - El pin 18 GPIO ya nace como salida por `config.txt`
   - El servicio `gpio-control` inicia automáticamente en background
   - El proceso vuelve a forzar el pin 18 a salida y LOW (`dl`)
   - El servidor HTTP escucha en `http://127.0.0.1:3000`

2. **Al abrir Angular en Chromium kiosk**:
   - Está listo para recibir la contraseña
   - Angular ya puede hacer peticiones HTTP al GPIO server

3. **Al ingresar la contraseña correcta**:
   - Angular hace POST a `http://127.0.0.1:3000/open-door`
   - El GPIO pin 18 se pone en estado HIGH (`dh`)

## Comandos útiles:

**Ver logs del servicio:**
```bash
sudo journalctl -u gpio-control -f
```

**Detener el servicio:**
```bash
sudo systemctl stop gpio-control
```

**Reiniciar el servicio:**
```bash
sudo systemctl restart gpio-control
```

**Desactivar el autostart (pero mantener el servicio instalado):**
```bash
sudo systemctl disable gpio-control
```

## Nota importante:
- El archivo `gpio-server.sh` debe estar en `/home/pi/resonance-password-screen/`
- Asegúrate de que tiene permisos de ejecución: `chmod +x gpio-server.sh`
