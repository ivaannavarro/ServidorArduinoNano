// Configuración
const API_URL = 'http://localhost:3000/api';
const UPDATE_INTERVAL = 5000; // 5 segundos
const MAX_DATA_POINTS = 20; // Máximo de puntos en las gráficas

// Variables globales
let charts = {};
let updateTimer;

// Inicializar gráficas
function initCharts() {
    const chartConfig = {
        temp: {
            canvas: 'tempChart',
            label: 'Temperatura (°C)',
            color: 'rgba(245, 87, 108, 1)',
            bgColor: 'rgba(245, 87, 108, 0.1)'
        },
        ldr: {
            canvas: 'ldrChart',
            label: 'Luminosidad',
            color: 'rgba(255, 193, 7, 1)',
            bgColor: 'rgba(255, 193, 7, 0.1)'
        },
        curr: {
            canvas: 'currChart',
            label: 'Corriente (A)',
            color: 'rgba(79, 172, 254, 1)',
            bgColor: 'rgba(79, 172, 254, 0.1)'
        },
        volt: {
            canvas: 'voltChart',
            label: 'Voltaje (V)',
            color: 'rgba(67, 233, 123, 1)',
            bgColor: 'rgba(67, 233, 123, 0.1)'
        }
    };

    Object.keys(chartConfig).forEach(key => {
        const config = chartConfig[key];
        const ctx = document.getElementById(config.canvas).getContext('2d');
        
        charts[key] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: config.label,
                    data: [],
                    borderColor: config.color,
                    backgroundColor: config.bgColor,
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: config.color,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: {
                            size: 14
                        },
                        bodyFont: {
                            size: 13
                        },
                        cornerRadius: 8
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: {
                                size: 12
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: {
                                size: 11
                            },
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    });
}

// Actualizar gráfica
function updateChart(chart, label, value) {
    if (chart.data.labels.length >= MAX_DATA_POINTS) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }
    
    chart.data.labels.push(label);
    chart.data.datasets[0].data.push(value);
    chart.update('none'); // Animación desactivada para mejor rendimiento
}

// Obtener datos en tiempo real
async function fetchRealtimeData() {
    try {
        const response = await fetch(`${API_URL}/datos/tiempo-real`);
        const data = await response.json();
        
        if (data.success && data.datos) {
            updateMetrics(data.datos);
            updateStatus(true);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error al obtener datos en tiempo real:', error);
        updateStatus(false);
        return false;
    }
}

// Obtener historial
async function fetchHistoricalData() {
    try {
        const response = await fetch(`${API_URL}/datos?limit=${MAX_DATA_POINTS}`);
        const data = await response.json();
        
        if (data.success && data.datos) {
            loadHistoricalData(data.datos);
        }
    } catch (error) {
        console.error('Error al obtener historial:', error);
    }
}

// Cargar datos históricos en las gráficas
function loadHistoricalData(datos) {
    // Convertir objeto a array y ordenar por timestamp
    const dataArray = Object.entries(datos).map(([key, value]) => ({
        id: key,
        ...value
    })).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    
    // Limpiar gráficas
    Object.values(charts).forEach(chart => {
        chart.data.labels = [];
        chart.data.datasets[0].data = [];
    });
    
    // Agregar datos históricos
    dataArray.forEach(item => {
        const time = item.timestamp ? 
            new Date(item.timestamp).toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            }) : '--';
        
        if (charts.temp && item.temp !== undefined) {
            updateChart(charts.temp, time, item.temp);
        }
        if (charts.ldr && item.ldr !== undefined) {
            updateChart(charts.ldr, time, item.ldr);
        }
        if (charts.curr && item.curr !== undefined) {
            updateChart(charts.curr, time, item.curr);
        }
        if (charts.volt && item.volt !== undefined) {
            updateChart(charts.volt, time, item.volt);
        }
    });
    
    // Actualizar todas las gráficas
    Object.values(charts).forEach(chart => chart.update());
}

// Actualizar métricas en las cards
function updateMetrics(datos) {
    const time = new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    // Actualizar valores
    document.getElementById('tempValue').textContent = 
        datos.temp !== undefined ? datos.temp.toFixed(2) : '--';
    document.getElementById('ldrValue').textContent = 
        datos.ldr !== undefined ? Math.round(datos.ldr) : '--';
    document.getElementById('currValue').textContent = 
        datos.curr !== undefined ? datos.curr.toFixed(2) : '--';
    document.getElementById('voltValue').textContent = 
        datos.volt !== undefined ? datos.volt.toFixed(2) : '--';
    
    // Actualizar gráficas
    if (datos.temp !== undefined) updateChart(charts.temp, time, datos.temp);
    if (datos.ldr !== undefined) updateChart(charts.ldr, time, datos.ldr);
    if (datos.curr !== undefined) updateChart(charts.curr, time, datos.curr);
    if (datos.volt !== undefined) updateChart(charts.volt, time, datos.volt);
    
    // Actualizar timestamp
    const lastUpdate = datos.ultima_actualizacion ? 
        new Date(datos.ultima_actualizacion).toLocaleString('es-ES') :
        new Date().toLocaleString('es-ES');
    document.getElementById('lastUpdate').textContent = `Última actualización: ${lastUpdate}`;
}

// Actualizar estado de conexión
function updateStatus(online) {
    const badge = document.getElementById('statusBadge');
    if (online) {
        badge.className = 'status-badge status-online';
        badge.innerHTML = '<i class="fas fa-circle"></i> En línea';
    } else {
        badge.className = 'status-badge status-offline';
        badge.innerHTML = '<i class="fas fa-circle"></i> Desconectado';
    }
}

// Actualización periódica
function startAutoUpdate() {
    updateTimer = setInterval(async () => {
        await fetchRealtimeData();
    }, UPDATE_INTERVAL);
}

// Inicialización
async function init() {
    console.log('Inicializando monitor...');
    
    // Inicializar gráficas
    initCharts();
    
    // Cargar datos históricos
    await fetchHistoricalData();
    
    // Obtener datos en tiempo real
    const success = await fetchRealtimeData();
    
    // Mostrar contenedor de métricas
    document.getElementById('loading').style.display = 'none';
    document.getElementById('metricsContainer').style.display = 'block';
    
    // Iniciar actualización automática
    if (success) {
        startAutoUpdate();
    }
    
    console.log('Monitor inicializado correctamente');
}

// Limpiar al cerrar
window.addEventListener('beforeunload', () => {
    if (updateTimer) {
        clearInterval(updateTimer);
    }
});

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);
