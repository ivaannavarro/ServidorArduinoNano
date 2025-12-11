require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (página web)
app.use(express.static('public'));

// Inicializar Firebase Admin
const serviceAccount = require('./firebase-credentials.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();

// Referencias a Firebase
const refHistorial = db.ref('sensores_historial'); // Historial de todas las lecturas
const refTiempoReal = db.ref('sensores_tiempo_real'); // Solo el dato más actual
const refRiego = db.ref('riego'); // Datos de riego

// --- CONFIGURACIÓN DE PUERTO SERIAL ---
// Configurar el puerto serial del Arduino
const SERIAL_PORT = process.env.SERIAL_PORT || 'COM4'; // Cambiar según tu puerto
const BAUD_RATE = parseInt(process.env.BAUD_RATE) || 9600;
const SAVE_INTERVAL = parseInt(process.env.SAVE_INTERVAL) || 5000; // Intervalo de guardado en ms (default: 5 segundos)

let serialPort;
let parser;
let lecturas = {
  ldr: 0,
  temp: 0,
  curr: 0,
  volt: 0
};

// Control de guardado con throttle
let ultimoGuardado = 0;
let datosCompletos = false;

// Función para inicializar el puerto serial
function inicializarSerial() {
  try {
    serialPort = new SerialPort({ 
      path: SERIAL_PORT, 
      baudRate: BAUD_RATE 
    });
    
    parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));
    
    serialPort.on('open', () => {
      console.log(` Puerto serial ${SERIAL_PORT} conectado (${BAUD_RATE} baud)`);
    });
    
    parser.on('data', manejarDatosSerial);
    
    serialPort.on('error', (err) => {
      console.error(' Error en puerto serial:', err.message);
    });
    
    serialPort.on('close', () => {
      console.log(' Puerto serial cerrado');
    });
    
  } catch (error) {
    console.error(' No se pudo abrir el puerto serial:', error.message);
    console.log(' El servidor funcionará solo con API REST');
  }
}

// Función para manejar datos del serial
function manejarDatosSerial(linea) {
  const partes = linea.trim().split('=');
  
  if (partes.length === 2) {
    const clave = partes[0];
    const valor = parseFloat(partes[1]);
    
    switch(clave) {
      case 'LDR':
        lecturas.ldr = valor;
        break;
      case 'TEMP':
        lecturas.temp = valor;
        break;
      case 'CURR':
        lecturas.curr = valor;
        break;
      case 'VOLT':
        lecturas.volt = valor;
        datosCompletos = true;
        // Intentar guardar solo si ha pasado el intervalo
        intentarGuardarDatos();
        break;
    }
  }
}

// Función para intentar guardar con throttle (limitación de tiempo)
function intentarGuardarDatos() {
  const ahora = Date.now();
  const tiempoTranscurrido = ahora - ultimoGuardado;
  
  if (datosCompletos && tiempoTranscurrido >= SAVE_INTERVAL) {
    enviarAFirebaseDesdeSerial();
    ultimoGuardado = ahora;
    datosCompletos = false;
  } else if (tiempoTranscurrido < SAVE_INTERVAL) {
    const tiempoRestante = Math.ceil((SAVE_INTERVAL - tiempoTranscurrido) / 1000);
  }
}

// Función para enviar datos del serial a Firebase
function enviarAFirebaseDesdeSerial() {
  const timestamp = Date.now();
  
  // Guardar en historial
  refHistorial.push({
    ...lecturas,
    timestamp: timestamp,
    fuente: 'serial'
  });
  
  // Actualizar estado en tiempo real
  refTiempoReal.set({
    ...lecturas,
    ultima_actualizacion: timestamp,
    fuente: 'serial'
  });
  
  console.log(' Datos guardados en Firebase desde Serial:', lecturas);
}

// Inicializar puerto serial al arrancar
if (process.env.ENABLE_SERIAL !== 'false') {
  inicializarSerial();
}

// Ruta principal
app.get('/', (req, res) => {
  res.json({
    message: 'Servidor Arduino - Firebase Realtime Database',
    status: 'online',
    serial: {
      habilitado: !!serialPort,
      puerto: SERIAL_PORT,
      baudRate: BAUD_RATE,
      conectado: serialPort ? serialPort.isOpen : false
    },
    endpoints: {
      POST: '/api/datos - Guardar datos en Firebase',
      GET: '/api/datos - Obtener todos los datos',
      GET: '/api/datos/:id - Obtener datos por ID',
      GET: '/api/riego - Obtener todos los datos de riego',
      GET: '/api/riego/tiempo-real - Obtener último dato de riego'
    }
  });
});

// Ruta de prueba para verificar que el servidor responde
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor funcionando correctamente',
    timestamp: Date.now()
  });
});

// Ruta para guardar datos en Firebase
app.post('/api/datos', async (req, res) => {
  try {
    const datos = req.body;
    
    // Agregar timestamp y fuente
    datos.timestamp = admin.database.ServerValue.TIMESTAMP;
    datos.fuente = 'api';
    
    // Guardar en historial
    const newDataRef = await refHistorial.push(datos);
    
    // Actualizar tiempo real
    await refTiempoReal.set({
      ...datos,
      ultima_actualizacion: Date.now()
    });
    
    res.status(201).json({
      success: true,
      message: 'Datos guardados correctamente',
      id: newDataRef.key,
      datos: datos
    });
  } catch (error) {
    console.error('Error al guardar datos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar datos',
      error: error.message
    });
  }
});

// Ruta para obtener el estado en tiempo real
app.get('/api/datos/tiempo-real', async (req, res) => {
  try {
    const snapshot = await refTiempoReal.once('value');
    const datos = snapshot.val();
    
    res.json({
      success: true,
      datos: datos || {}
    });
  } catch (error) {
    console.error('Error al obtener datos en tiempo real:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos',
      error: error.message
    });
  }
});

// Ruta para obtener todo el historial
app.get('/api/datos', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const snapshot = await refHistorial.limitToLast(limit).once('value');
    const datos = snapshot.val();
    
    res.json({
      success: true,
      datos: datos || {},
      total: datos ? Object.keys(datos).length : 0
    });
  } catch (error) {
    console.error('Error al obtener datos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos',
      error: error.message
    });
  }
});

// Ruta para obtener datos por ID
app.get('/api/datos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ref = db.ref(`sensores_historial/${id}`);
    const snapshot = await ref.once('value');
    const datos = snapshot.val();
    
    if (datos) {
      res.json({
        success: true,
        datos: datos
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Datos no encontrados'
      });
    }
  } catch (error) {
    console.error('Error al obtener datos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos',
      error: error.message
    });
  }
});

// Ruta para eliminar TODO el historial
app.get('/api/delete-all', async (req, res) => {
  try {
    const ref = db.ref('sensores_historial');
    await ref.remove();
    
    res.json({
      success: true,
      message: 'Todo el historial fue eliminado correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar historial:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar historial',
      error: error.message
    });
  }
});

// Ruta para eliminar un dato específico por ID
app.delete('/api/datos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ref = db.ref(`sensores_historial/${id}`);
    await ref.remove();
    
    res.json({
      success: true,
      message: 'Dato eliminado correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar dato:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar dato',
      error: error.message
    });
  }
});

// Ruta para obtener todos los datos de riego
app.get('/api/riego', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const snapshot = await refRiego.limitToLast(limit).once('value');
    const datos = snapshot.val();
    
    res.json({
      success: true,
      datos: datos || {},
      total: datos ? Object.keys(datos).length : 0
    });
  } catch (error) {
    console.error('Error al obtener datos de riego:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos de riego',
      error: error.message
    });
  }
});

// Ruta para obtener el estado en tiempo real de riego
app.get('/api/riego/tiempo-real', async (req, res) => {
  try {
    const snapshot = await refRiego.limitToLast(1).once('value');
    const datos = snapshot.val();
    const ultimoDato = datos ? Object.values(datos)[0] : null;
    
    res.json({
      success: true,
      datos: ultimoDato || {}
    });
  } catch (error) {
    console.error('Error al obtener datos en tiempo real de riego:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos',
      error: error.message
    });
  }
});

// Cerrar puerto serial al cerrar el servidor
process.on('SIGINT', () => {
  console.log('\n Cerrando servidor...');
  if (serialPort && serialPort.isOpen) {
    serialPort.close(() => {
      console.log('Puerto serial cerrado');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Conectado a Firebase Realtime Database`);
  console.log(`Intervalo de guardado: ${SAVE_INTERVAL / 1000}s`);
  if (serialPort) {
    console.log(`Puerto serial: ${SERIAL_PORT} @ ${BAUD_RATE} baud`);
  }
});
