const express = require('express');
const { execSync } = require('child_process');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') res.sendStatus(200);
  else next();
});

// Al iniciar: poner GPIO 18 en bajo
try {
  console.log('Inicializando GPIO 18 a bajo (dl)...');
  execSync('pinctrl set 18 dl');
  console.log('✓ GPIO 18 inicializado en bajo');
} catch (error) {
  console.error('✗ Error al inicializar GPIO:', error.message);
}

// Endpoint: poner GPIO 18 en alto cuando contraseña es correcta
app.post('/open-door', (req, res) => {
  try {
    console.log('Abriendo puerta - GPIO 18 a alto (dh)...');
    execSync('pinctrl set 18 dh');
    console.log('✓ Puerta abierta');
    res.json({ success: true, message: 'Puerta abierta' });
  } catch (error) {
    console.error('✗ Error al activar GPIO:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor GPIO en http://127.0.0.1:${PORT}`);
});
