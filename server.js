const express = require('express');
const { execSync } = require('child_process');

const app = express();
const PORT = 3000;
const GPIO_PIN = 18;

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

function runPinCtrl(command, successMessage) {
  execSync(command, { stdio: 'pipe' });
  console.log(successMessage);
}

function setPinModeOutput() {
  runPinCtrl(`pinctrl set ${GPIO_PIN} op`, `✓ GPIO ${GPIO_PIN} configurado como salida`);
}

function setPinLow() {
  runPinCtrl(`pinctrl set ${GPIO_PIN} dl`, `✓ GPIO ${GPIO_PIN} en bajo`);
}

function setPinHigh() {
  runPinCtrl(`pinctrl set ${GPIO_PIN} dh`, `✓ GPIO ${GPIO_PIN} en alto`);
}

function initializeGpio() {
  console.log(`Configurando GPIO ${GPIO_PIN} como salida y bajo...`);
  setPinModeOutput();
  setPinLow();
}

try {
  initializeGpio();
} catch (error) {
  console.error(`✗ Error al inicializar GPIO ${GPIO_PIN}:`, error.message);
}

// Endpoint: abrir puerta
app.post('/open-door', (req, res) => {
  try {
    console.log(`Peticion recibida en /open-door. Configurando GPIO ${GPIO_PIN} como salida...`);
    setPinModeOutput();
    console.log(`Abriendo puerta - GPIO ${GPIO_PIN} a alto (dh)...`);
    setPinHigh();

    res.json({
      success: true,
      message: 'Puerta abierta sin cierre automatico'
    });

  } catch (error) {
    console.error(`✗ Error al activar GPIO ${GPIO_PIN}:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor GPIO en http://127.0.0.1:${PORT}`);
});
