const express = require('express');
const { execSync } = require('child_process');

const app = express();
const PORT = 3000;
const DOOR_OPEN_TIME_MS = 60000; // 1 minuto

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Al iniciar: configurar GPIO 18 como salida y ponerlo abajo
try {
  console.log('Configurando GPIO 18 como salida y bajo...');
  execSync('pinctrl set 18 op dl');
  console.log('✓ GPIO 18 inicializado como salida en bajo');
} catch (error) {
  console.error('✗ Error al inicializar GPIO:', error.message);
}

// Endpoint: abrir puerta
app.post('/open-door', (req, res) => {
  try {
    console.log('Abriendo puerta - GPIO 18 a alto (dh)...');
    execSync('pinctrl set 18 dh');
    console.log('✓ Puerta abierta');

    setTimeout(() => {
      try {
        console.log('Cerrando puerta - GPIO 18 a bajo (dl)...');
        execSync('pinctrl set 18 dl');
        console.log('✓ Puerta cerrada');
      } catch (error) {
        console.error('✗ Error al cerrar GPIO:', error.message);
      }
    }, DOOR_OPEN_TIME_MS);

    res.json({
      success: true,
      message: 'Puerta abierta durante 1 minuto'
    });

  } catch (error) {
    console.error('✗ Error al activar GPIO:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor GPIO en http://127.0.0.1:${PORT}`);
});