const express = require('express');
const { execSync } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Initialize GPIO pin 18 to LOW (dl) on startup
function initializeGPIO() {
  try {
    console.log('Inicializando pin 18 GPIO a estado bajo (dl)...');
    execSync('raspi-gpio set 18 dl', { stdio: 'inherit' });
    console.log('Pin 18 GPIO inicializado correctamente');
  } catch (error) {
    console.error('Error al inicializar GPIO:', error.message);
    console.warn('Nota: Asegúrate de ejecutar este programa con permisos de root (sudo)');
  }
}

// Endpoint to open door - sets GPIO pin 18 to HIGH (dh)
app.post('/open-door', (req, res) => {
  try {
    console.log('Abriendo puerta - Activando pin 18 GPIO a estado alto (dh)...');
    execSync('raspi-gpio set 18 dh', { stdio: 'inherit' });
    console.log('Pin 18 GPIO activado correctamente');
    res.json({ success: true, message: 'Puerta abierta - Pin 18 GPIO activado' });
  } catch (error) {
    console.error('Error al activar GPIO:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error al activar puerta',
      error: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor de control de puerta activo' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Servidor de control de puerta escuchando en puerto ${PORT}`);
  console.log(`Endpoint: POST http://127.0.0.1:${PORT}/open-door`);
  
  // Initialize GPIO on startup
  initializeGPIO();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nCerrando servidor...');
  try {
    console.log('Desactivando pin 18 GPIO a estado bajo (dl) al cerrar...');
    execSync('raspi-gpio set 18 dl', { stdio: 'inherit' });
  } catch (error) {
    console.error('Error al desactivar GPIO:', error.message);
  }
  process.exit(0);
});
