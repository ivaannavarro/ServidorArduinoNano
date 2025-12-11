// Configuración
const API_URL = 'http://localhost:3000/api';
const UPDATE_INTERVAL = 5000; // 5 segundos
const MAX_DATA_POINTS = 50; // Máximo de puntos en las gráficas

// Variables globales
let charts = {};
let updateTimer;
let allData = [];
let humidityData = [];
let temperatureData = [];

// Inicializar gráficas
function initCharts() {
    // Gráfico de Humedad
    try {
        const humidityCanvas = document.getElementById('humidityChart');
        if (humidityCanvas) {
            const humidityCtx = humidityCanvas.getContext('2d');
            charts.humidity = new Chart(humidityCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Humedad (%)',
                data: [],
                borderColor: 'rgba(59, 130, 246, 1)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: { size: 14, weight: 'bold' },
                        color: '#1f2937'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return context.raw.toFixed(1) + ' %';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    ticks: {
                        font: { size: 12 },
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 12 } }
                }
            }
        }
    });
    
        }
    } catch (err) {
        console.warn('No se pudo inicializar gráfico de humedad:', err.message);
    }

    // Gráfico de Temperatura
    try {
        const temperatureCanvas = document.getElementById('temperatureChart');
        if (temperatureCanvas) {
            const temperatureCtx = temperatureCanvas.getContext('2d');
            charts.temperature = new Chart(temperatureCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Temperatura (°C)',
                data: [],
                borderColor: 'rgba(245, 158, 11, 1)',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: 'rgba(245, 158, 11, 1)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: { size: 14, weight: 'bold' },
                        color: '#1f2937'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return context.raw.toFixed(1) + ' °C';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    ticks: {
                        font: { size: 12 },
                        callback: function(value) {
                            return value + '°C';
                        }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 12 } }
                }
            }
        }
            });
        }
    } catch (err) {
        console.warn('No se pudo inicializar gráfico de temperatura:', err.message);
    }
}

// Cargar datos del servidor
async function cargarDatos() {
    try {
        console.log('Iniciando carga de datos desde:', `${API_URL}/riego`);
        const response = await fetch(`${API_URL}/riego`);
        
        console.log('Respuesta del servidor:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Datos recibidos:', result);
        
        if (result.success && result.datos) {
            allData = Object.entries(result.datos).map(([id, data]) => {
                // Convertir timestamp a milisegundos si está en segundos
                let timestamp = data.timestamp;
                if (timestamp < 10000000000) { // Si es menor a este valor, probablemente esté en segundos
                    timestamp = timestamp * 1000;
                }
                return {
                    id,
                    ...data,
                    timestamp: timestamp
                };
            }).sort((a, b) => a.timestamp - b.timestamp);
            
            console.log('Datos procesados:', allData.length, 'registros');
            procesarDatos();
            actualizarGraficos();
            actualizarTabla();
            ocultarErrores();
        } else {
            console.warn('Respuesta sin datos:', result);
            mostrarError('No se encontraron datos en la respuesta del servidor');
        }
    } catch (error) {
        console.error('Error completo:', error);
        mostrarError('Error al cargar datos: ' + error.message);
    }
}

// Procesar datos para las métricas
function procesarDatos() {
    if (allData.length === 0) return;
    
    humidityData = allData.map(d => d.humedad_pct || d.humidity || 0);
    temperatureData = allData.map(d => d.temp_c || d.temperature || 0);
    
    // Actualizar tarjetas de información
    const ultimoDato = allData[allData.length - 1];
    
    // Estado (basado en si hay riego activo)
    const tiempoRiego = ultimoDato.tiempo_riego_pid || ultimoDato.duration || 0;
    const estado = tiempoRiego > 0 ? 'Activo' : 'Inactivo';
    const badgeClass = tiempoRiego > 0 ? 'badge-active' : 'badge-inactive';
    const statusEl = document.getElementById('statusValue');
    if (statusEl) statusEl.innerHTML = `<span class="badge ${badgeClass}">${estado}</span>`;
    const statusTimeEl = document.getElementById('statusTime');
    if (statusTimeEl) statusTimeEl.textContent = `Última actualización: ${formatearFecha(ultimoDato.timestamp)}`;
    
    // Humedad
    const humidadActual = ultimoDato.humedad_pct || ultimoDato.humidity || '-';
    const humidadPromedio = (humidityData.reduce((a, b) => a + b) / humidityData.length).toFixed(1);
    const humidityEl = document.getElementById('humidityValue');
    if (humidityEl) humidityEl.textContent = humidadActual;
    const humidityStatusEl = document.getElementById('humidityStatus');
    if (humidityStatusEl) humidityStatusEl.textContent = `Promedio: ${humidadPromedio}%`;
    
    // Temperatura
    const tempActual = ultimoDato.temp_c || ultimoDato.temperature || '-';
    const tempPromedio = (temperatureData.reduce((a, b) => a + b) / temperatureData.length).toFixed(1);
    const tempEl = document.getElementById('temperatureValue');
    if (tempEl) tempEl.textContent = typeof tempActual === 'number' ? tempActual.toFixed(1) : tempActual;
    const tempStatusEl = document.getElementById('temperatureStatus');
    if (tempStatusEl) tempStatusEl.textContent = `Promedio: ${tempPromedio}°C`;
    
    // Duración
    const duracion = ultimoDato.tiempo_riego_pid || ultimoDato.duration || 0;
    const durationEl = document.getElementById('durationValue');
    if (durationEl) durationEl.textContent = (duracion / 60).toFixed(0);
    const durationTimeEl = document.getElementById('durationTime');
    if (durationTimeEl) durationTimeEl.textContent = `Hace: ${formatearTiempoTranscurrido(ultimoDato.timestamp)}`;
    
    // Distancia
    const distancia = ultimoDato.distancia_cm || '-';
    const distanceEl = document.getElementById('distanceValue');
    if (distanceEl) distanceEl.textContent = typeof distancia === 'number' ? distancia.toFixed(2) : distancia;
    const distanceStatusEl = document.getElementById('distanceStatus');
    if (distanceStatusEl) distanceStatusEl.textContent = `Última lectura: ${formatearTiempoTranscurrido(ultimoDato.timestamp)} atrás`;
}

// Actualizar gráficos
function actualizarGraficos() {
    // Obtener últimos N puntos
    const ultimosPuntos = allData.slice(-MAX_DATA_POINTS);

    const labels = ultimosPuntos.map(d => {
        try { return formatearFecha(d.timestamp).split(' ')[1]; }
        catch(e) { return '' }
    });

    // Actualizar gráfico de humedad
    if (charts.humidity) {
        charts.humidity.data.labels = labels;
        charts.humidity.data.datasets[0].data = ultimosPuntos.map(d => d.humedad_pct || d.humidity || 0);
        charts.humidity.update();
    }

    // Actualizar gráfico de temperatura
    if (charts.temperature) {
        charts.temperature.data.labels = labels;
        charts.temperature.data.datasets[0].data = ultimosPuntos.map(d => d.temp_c || d.temperature || 0);
        charts.temperature.update();
    }

    // Ocultar loading
    const humidityLoading = document.getElementById('humidityLoading');
    const humidityWrapper = document.getElementById('humidityChartWrapper');
    const temperatureLoading = document.getElementById('temperatureLoading');
    const temperatureWrapper = document.getElementById('temperatureChartWrapper');

    if (humidityLoading) humidityLoading.style.display = 'none';
    if (humidityWrapper) humidityWrapper.style.display = 'block';
    if (temperatureLoading) temperatureLoading.style.display = 'none';
    if (temperatureWrapper) temperatureWrapper.style.display = 'block';
}

// Actualizar tabla
function actualizarTabla() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const ultimosPuntos = allData.slice(-30).reverse();

    ultimosPuntos.forEach(dato => {
        const fila = document.createElement('tr');
        const tiempoRiego = dato.tiempo_riego_pid || dato.duration || 0;
        const estado = tiempoRiego > 0 ? 'Activo' : 'Inactivo';
        const badgeClass = tiempoRiego > 0 ? 'badge-active' : 'badge-inactive';

        const humedad = dato.humedad_pct !== undefined ? dato.humedad_pct : (dato.humidity || 0);
        const temperatura = dato.temp_c !== undefined ? dato.temp_c : (dato.temperature || 0);

        fila.innerHTML = `
            <td>${formatearFecha(dato.timestamp)}</td>
            <td>${typeof humedad === 'number' ? humedad.toFixed(1) : humedad}%</td>
            <td>${typeof temperatura === 'number' ? temperatura.toFixed(1) : temperatura}°C</td>
            <td><span class="badge ${badgeClass}">${estado}</span></td>
            <td>${((tiempoRiego || 0) / 60).toFixed(1)}</td>
        `;
        tbody.appendChild(fila);
    });

    const tableLoading = document.getElementById('tableLoading');
    const tableContent = document.getElementById('tableContent');
    if (tableLoading) tableLoading.style.display = 'none';
    if (tableContent) tableContent.style.display = 'block';
}

// Formatear fecha
function formatearFecha(timestamp) {
    const fecha = new Date(timestamp);
    return fecha.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Formatear tiempo transcurrido
function formatearTiempoTranscurrido(timestamp) {
    const ahora = Date.now();
    const diferencia = ahora - timestamp;
    const minutos = Math.floor(diferencia / 60000);
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);
    
    if (dias > 0) return `${dias}d`;
    if (horas > 0) return `${horas}h`;
    if (minutos > 0) return `${minutos}m`;
    return 'ahora';
}

// Mostrar mensaje de éxito
function mostrarExito(mensaje) {
    const element = document.getElementById('successMessage');
    const text = document.getElementById('successText');
    if (text) text.textContent = mensaje;
    if (element) {
        element.style.display = 'flex';
        setTimeout(() => { element.style.display = 'none'; }, 3000);
    }
}
// Mostrar error
function mostrarError(mensaje) {
    const element = document.getElementById('errorMessage');
    const text = document.getElementById('errorText');
    if (text) text.textContent = mensaje;
    if (element) element.style.display = 'flex';
}

// Ocultar errores y mensajes
function ocultarErrores() {
    const errEl = document.getElementById('errorMessage');
    const errText = document.getElementById('errorText');
    const succEl = document.getElementById('successMessage');
    const succText = document.getElementById('successText');
    if (errEl) errEl.style.display = 'none';
    if (errText) errText.textContent = '';
    if (succEl) succEl.style.display = 'none';
    if (succText) succText.textContent = '';
}

// Exportar datos a CSV
function exportarDatos() {
    if (allData.length === 0) {
        mostrarError('No hay datos para exportar');
        return;
    }

    let csv = 'Timestamp,Humedad (%),Temperatura (°C),Distancia (cm),Luz (raw),Tiempo Riego (s),Humedad Raw,Temp Raw\n';

    allData.forEach(dato => {
        const tiempoRiego = dato.tiempo_riego_pid || dato.duration || 0;
        const humedad = dato.humedad_pct !== undefined ? dato.humedad_pct : (dato.humidity || 0);
        const temperatura = dato.temp_c !== undefined ? dato.temp_c : (dato.temperature || 0);
        const distancia = dato.distancia_cm || 'N/A';
        const luz = dato.luz_raw || 'N/A';
        const humRaw = dato.humedad_raw || 'N/A';
        const tempRaw = dato.temp_raw || 'N/A';

        csv += `"${formatearFecha(dato.timestamp)}",${humedad},${temperatura},${distancia},${luz},${tiempoRiego},${humRaw},${tempRaw}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `riego_${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    mostrarExito('Datos exportados correctamente');
}

// Limpiar datos (confirmación)
function limpiarDatos() {
    if (confirm('¿Estás seguro de que deseas eliminar todos los datos de riego? Esta acción no se puede deshacer.')) {
        // Aquí puedes agregar la lógica para limpiar datos
        mostrarError('Función de limpieza no está implementada en el servidor');
    }
}

// Configurar auto-actualización
function configurarAutoActualizacion() {
    cargarDatos(); // Carga inicial
    updateTimer = setInterval(cargarDatos, UPDATE_INTERVAL);
}

// Detener auto-actualización
function detenerAutoActualizacion() {
    if (updateTimer) {
        clearInterval(updateTimer);
    }
}

// Inicialización cuando carga la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('Página cargada, inicializando...');
    console.log('API URL:', API_URL);
    initCharts();
    console.log('Gráficos inicializados');
    configurarAutoActualizacion();
    console.log('Auto-actualización configurada');
    
    // Detener actualización cuando se cierra la pestaña
    window.addEventListener('beforeunload', detenerAutoActualizacion);
});
