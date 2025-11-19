require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Inicializar Firebase Admin
const serviceAccount = require('./firebase-credentials.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();

// Ruta principal
app.get('/', (req, res) => {
  res.json({
    message: 'Servidor Arduino - Firebase Realtime Database',
    status: 'online',
    endpoints: {
      POST: '/api/datos - Guardar datos en Firebase',
      GET: '/api/datos - Obtener todos los datos',
      GET: '/api/datos/:id - Obtener datos por ID'
    }
  });
});

// Ruta para guardar datos en Firebase
app.post('/api/datos', async (req, res) => {
  try {
    const datos = req.body;
    
    // Agregar timestamp
    datos.timestamp = admin.database.ServerValue.TIMESTAMP;
    
    // Guardar en Firebase
    const ref = db.ref('sensores');
    const newDataRef = await ref.push(datos);
    
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

// Ruta para obtener todos los datos
app.get('/api/led', async (req, res) => {
  try {
    const ref = db.ref('led');
    const snapshot = await ref.once('value');
    const datos = snapshot.val();
    
    res.json({
      success: true,
      datos: datos || {}
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
    const ref = db.ref(`sensores/${id}`);
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

// Ruta para eliminar datos por ID
app.delete('/api/datos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const ref = db.ref(`sensores/${id}`);
    await ref.remove();
    
    res.json({
      success: true,
      message: 'Datos eliminados correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar datos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar datos',
      error: error.message
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Conectado a Firebase Realtime Database`);
});
