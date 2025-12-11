# Monitor de Riego - Interfaz Web

## Descripción

He creado una interfaz web completa para graficar los datos de riego que se cargan en tu Firebase Realtime Database. La aplicación muestra en tiempo real:

- **Gráficos de humedad y temperatura** con actualizaciones automáticas
- **Tarjetas informativas** con métricas clave
- **Tabla de historial** con todos los datos registrados
- **Exportación a CSV** de los datos
- **Diseño responsive** que funciona en móvil y escritorio

## Archivos Creados

### 1. `public/riego.html`
Página principal del monitor de riego con:
- Interfaz moderna con diseño gradiente
- Tarjetas informativas (Estado, Humedad, Temperatura, Duración)
- Dos gráficos interactivos (Humedad y Temperatura)
- Tabla de historial de datos
- Botones de control (Actualizar, Exportar, Limpiar)

### 2. `public/riego.js`
Lógica JavaScript que:
- Conecta con el endpoint `/api/riego` del servidor
- Actualiza automáticamente cada 5 segundos
- Maneja gráficos con Chart.js
- Formatea fechas y tiempos
- Exporta datos a CSV
- Muestra errores y mensajes de éxito

### 3. `server.js` (Actualizado)
Se agregaron dos nuevas rutas:
- `GET /api/riego` - Obtiene todos los datos de riego con límite configurable
- `GET /api/riego/tiempo-real` - Obtiene el último dato de riego en tiempo real

### 4. `index.html` (Actualizado)
Se agregó un botón para acceder al monitor de riego

## Cómo Usar

### 1. Iniciar el servidor
```bash
cd ServidorArduinoNano
npm start
```

### 2. Acceder a las páginas

**Monitor de Sensores (página original):**
```
http://localhost:3000
```

**Monitor de Riego (nueva página):**
```
http://localhost:3000/riego.html
```

## Estructura de Datos Esperada

El endpoint `/api/riego` debe retornar datos con la siguiente estructura:

```json
{
  "id1": {
    "timestamp": 1702324800000,
    "humidity": 65.5,
    "temperature": 25.3,
    "status": true,
    "duration": 300
  },
  "id2": {
    "timestamp": 1702324900000,
    "humidity": 68.2,
    "temperature": 26.1,
    "status": false,
    "duration": 250
  }
}
```

### Campos esperados:
- **timestamp**: Marca de tiempo en milisegundos
- **humidity**: Porcentaje de humedad (0-100)
- **temperature**: Temperatura en °C
- **status**: Estado del riego (true/false)
- **duration**: Duración en segundos

## Características

### 🎨 Diseño
- Interfaz moderna con gradientes
- Animaciones suaves
- Responsivo (funciona en móvil, tablet y desktop)
- Colores intuitivos por sensor

### 📊 Gráficos
- Líneas interactivas con Chart.js
- Máximo 50 puntos por gráfico
- Tooltips con información detallada
- Escalas adaptativas

### 📋 Tabla de Datos
- Historial de últimos 30 registros
- Ordenados de más reciente a más antiguo
- Badges de estado (Activo/Inactivo)

### 🔄 Actualizaciones
- Auto-actualización cada 5 segundos
- Se detiene al cerrar la pestaña
- Botón de actualización manual
- Indicador de última actualización

### 📥 Exportación
- Descarga de datos en formato CSV
- Incluye todos los campos
- Nombres de archivo con timestamp

### 🎯 Información en Tiempo Real
- Valor actual de cada sensor
- Promedios calculados
- Tiempo transcurrido desde última actualización
- Estado del sistema

## Personalización

### Cambiar intervalo de actualización
En `riego.js`, línea 9:
```javascript
const UPDATE_INTERVAL = 5000; // en milisegundos
```

### Cambiar cantidad máxima de puntos en gráficos
En `riego.js`, línea 10:
```javascript
const MAX_DATA_POINTS = 50; // número de puntos
```

### Cambiar límite de datos en tabla
En `riego.js`, función `actualizarTabla()`, línea 137:
```javascript
const ultimosPuntos = allData.slice(-30).reverse(); // últimos 30 registros
```

## Requisitos

- Node.js con Express
- Firebase Admin SDK (ya configurado en tu servidor)
- Navegador moderno (Chrome, Firefox, Safari, Edge)
- Conexión a Firebase Realtime Database

## API Endpoints

### Obtener todos los datos de riego
```
GET /api/riego?limit=100
```

**Parámetros:**
- `limit` (opcional): Número máximo de registros a retornar (default: 100)

**Respuesta:**
```json
{
  "success": true,
  "datos": { ... },
  "total": 45
}
```

### Obtener último dato en tiempo real
```
GET /api/riego/tiempo-real
```

**Respuesta:**
```json
{
  "success": true,
  "datos": { ... }
}
```

## Solución de Problemas

### Los gráficos no se cargan
- Verifica que el servidor esté corriendo en `http://localhost:3000`
- Abre la consola del navegador (F12) para ver errores
- Verifica que haya datos en Firebase en la ruta `/riego`

### Los datos no se actualizan
- Comprueba la conexión a Firebase
- Revisa que el endpoint `/api/riego` retorne datos
- Verifica que los datos tengan los campos esperados

### CORS errors
- Asegúrate de que CORS está habilitado en `server.js` (ya está configurado)

## Próximas Mejoras Sugeridas

1. **WebSockets**: Usar socket.io para actualizaciones en tiempo real
2. **Base de datos local**: Guardar datos con IndexedDB para acceso offline
3. **Alertas**: Notificaciones cuando se cumplen condiciones
4. **Filtros**: Por rango de fechas, estado, etc.
5. **Comparativas**: Gráficos de días anteriores para comparación
6. **Reportes**: Generación de reportes PDF automáticos

¡La interfaz está lista para usar! 🎉
