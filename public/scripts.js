// Configura Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDIJorV_JDC03nbKYBR7wkeKjBJLcHcxo",
    authDomain: "riskwatchapp-5ec8b.firebaseapp.com",
    databaseURL: "https://riskwatchapp-5ec8b-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "riskwatchapp-5ec8b",
    storageBucket: "riskwatchapp-5ec8b.appspot.com",
    messagingSenderId: "162678165225",
    appId: "1:162678165225:web:3c28dd0d756ade7742a78"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();
const storageRef = storage.ref();

// Inicializa el mapa
const map = L.map('map').setView([43.263008, -2.934244], 13); // Coordenadas iniciales y zoom

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Coordenadas de las paradas de metro
const metroStations = [
    { lat: 43.270514, lon: -2.949449, name: "Deusto" },
    { lat: 43.262668, lon: -2.946009, name: "San Mames" },
    { lat: 43.260841, lon: -2.940002, name: "Indautxu" },
    { lat: 43.263008, lon: -2.934244, name: "Moyua" },
    { lat: 43.261320, lon: -2.927671, name: "Abando" }
];

// Añadir círculos para las paradas de metro
metroStations.forEach(station => {
    L.circle([station.lat, station.lon], {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.5,
        radius: 100
    }).bindPopup(`<b>Parada de Metro:</b> ${station.name}`).addTo(map);
});

// Función para obtener la URL de descarga del archivo CSV más reciente en un directorio específico
function fetchLatestCSV(directory, fileIdentifier) {
    return storageRef.child(directory).listAll().then(function(result) {
        const csvFiles = result.items.filter(item => item.name.includes(fileIdentifier));
        if (csvFiles.length === 0) {
            throw new Error(`No se encontraron archivos CSV con el identificador: ${fileIdentifier}`);
        }

        // Ordenar los archivos por nombre (asumiendo que los nombres de archivo contienen fechas y se ordenan lexicográficamente)
        csvFiles.sort((a, b) => b.name.localeCompare(a.name));
        console.log(`Archivo CSV más reciente para ${fileIdentifier}:`, csvFiles[0].name);
        return csvFiles[0].getDownloadURL().then(function(url) {
            return fetch(url).then(response => response.text());
        });
    });
}

// Función para procesar los datos de ubicación y añadirlos al mapa
function processLocationAndHRVData(locationData, hrvData, showAltitudeOnly = false, showHRVOnly = false) {
    const locationRegex = /(-?\d+,\d{6}),(-?\d+,\d{6}),(\d+)/;
    const rows = locationData.trim().split('\n');
    const points = [];

    // Parsear los datos de HRV
    const hrvValues = processHRVData(hrvData);

    // Unir datos de ubicación y HRV
    rows.forEach((row, index) => {
        const match = row.match(locationRegex);
        if (match) {
            const lat = parseFloat(match[1].replace(',', '.'));
            const lon = parseFloat(match[2].replace(',', '.'));
            const altitude = parseFloat(match[3]);
            const hrv = hrvValues ? hrvValues[index] : null;
            if (!isNaN(lat) && !isNaN(lon) && !isNaN(altitude)) {
                points.push({ lat, lon, altitude, hrv });
            }
        }
    });

    if (points.length > 0) {
        const latlngs = points.map(point => [point.lat, point.lon]);

        if (showAltitudeOnly) {
            // Dibujar una línea basada solo en la altitud y cambiar el color si la altura es menor de 685
            const altitudeLatLngs = latlngs.map((latlng, index) => {
                const point = points[index];
                return { 
                    latlng, 
                    color: point.altitude < 685 ? 'red' : 'blue' 
                };
            });

            altitudeLatLngs.forEach((segment, index) => {
                if (index < altitudeLatLngs.length - 1) {
                    L.polyline([segment.latlng, altitudeLatLngs[index + 1].latlng], { color: segment.color }).addTo(map);
                }
            });

            // Añadir evento a la polilínea para mostrar solo la altitud
            map.eachLayer(layer => {
                if (layer instanceof L.Polyline) {
                    layer.on('click', function(e) {
                        const nearestPoint = findNearestPoint(e.latlng, points);
                        if (nearestPoint) {
                            L.popup()
                                .setLatLng([nearestPoint.lat, nearestPoint.lon])
                                .setContent(`<b>Altura:</b> ${nearestPoint.altitude} metros`)
                                .openOn(map);
                        }
                    });
                }
            });
        } else if (showHRVOnly) {
            // Dibujar una línea basada solo en el HRV y cambiar el color si el HRV es mayor de 115
            const hrvLatLngs = latlngs.map((latlng, index) => {
                const point = points[index];
                return { 
                    latlng, 
                    color: point.hrv > 115 ? 'red' : 'blue' 
                };
            });

            hrvLatLngs.forEach((segment, index) => {
                if (index < hrvLatLngs.length - 1) {
                    L.polyline([segment.latlng, hrvLatLngs[index + 1].latlng], { color: segment.color }).addTo(map);
                }
            });

            // Añadir evento a la polilínea para mostrar solo el HRV
            map.eachLayer(layer => {
                if (layer instanceof L.Polyline) {
                    layer.on('click', function(e) {
                        const nearestPoint = findNearestPoint(e.latlng, points);
                        if (nearestPoint) {
                            L.popup()
                                .setLatLng([nearestPoint.lat, nearestPoint.lon])
                                .setContent(`<b>HRV:</b> ${nearestPoint.hrv}`)
                                .openOn(map);
                        }
                    });
                }
            });
        } else {
            // Dibujar una línea que conecte todos los puntos sin cambiar el color basado en HRV o altitud
            const defaultLatLngs = latlngs.map((latlng) => {
                return { 
                    latlng, 
                    color: 'blue' 
                };
            });

            defaultLatLngs.forEach((segment, index) => {
                if (index < defaultLatLngs.length - 1) {
                    L.polyline([segment.latlng, defaultLatLngs[index + 1].latlng], { color: segment.color }).addTo(map);
                }
            });

            // Añadir evento a la polilínea para mostrar solo latitud y longitud
            map.eachLayer(layer => {
                if (layer instanceof L.Polyline) {
                    layer.on('click', function(e) {
                        const nearestPoint = findNearestPoint(e.latlng, points);
                        if (nearestPoint) {
                            L.popup()
                                .setLatLng([nearestPoint.lat, nearestPoint.lon])
                                .setContent(`<b>Latitud:</b> ${nearestPoint.lat}, <b>Longitud:</b> ${nearestPoint.lon}`)
                                .openOn(map);
                        }
                    });
                }
            });
        }

        // Añadir marcador solo para el primer y último punto
        const firstPoint = points[0];
        const lastPoint = points[points.length - 1];

        if (firstPoint) {
            const marker = L.marker([firstPoint.lat, firstPoint.lon]).addTo(map);
            marker.bindPopup(`<b>Latitud:</b> ${firstPoint.lat}, <b>Longitud:</b> ${firstPoint.lon}`);
        }

        if (lastPoint) {
            const marker = L.marker([lastPoint.lat, lastPoint.lon]).addTo(map);
            marker.bindPopup(`<b>Latitud:</b> ${lastPoint.lat}, <b>Longitud:</b> ${lastPoint.lon}`);
        }

        // Centrarse en el primer punto
        map.setView([firstPoint.lat, firstPoint.lon], 13); // Zoom al primer marcador
    }
}

// Función para procesar los datos de HRV (Stress)
function processHRVData(data) {
    const rows = data.trim().split('\n');
    const hrvValues = [];

    rows.forEach(row => {
        const columns = row.split(',');
        if (columns.length > 1) {
            const hrv = parseFloat(columns[1]);
            if (hrv !== 0 && !isNaN(hrv)) {
                hrvValues.push(hrv);
            }
        }
    });

    return hrvValues.length > 0 ? hrvValues : null;
}

// Función para procesar los datos de Acc
function processAccData(data) {
    const regex = /(-?\d,\d{6}),(-?\d,\d{6}),(-?\d,\d{6})/;
    const rows = data.trim().split('\n');
    const accValues = [];

    rows.forEach(row => {
        const match = row.match(regex);
        if (match) {
            const x = parseFloat(match[1].replace(',', '.'));
            const y = parseFloat(match[2].replace(',', '.'));
            const z = parseFloat(match[3].replace(',', '.'));
            const magnitude = Math.sqrt(x * x + y * y + z * z);
            if (!isNaN(magnitude)) {
                accValues.push(magnitude);
            }
        }
    });

    return accValues.length > 0 ? accValues : null;
}

// Función para crear el gráfico de HRV
function createHRVChart(hrvValues) {
    const ctx = document.getElementById('hrv-chart').getContext('2d');
    const data = {
        labels: hrvValues.map((_, index) => index + 1),
        datasets: [{
            label: 'Variabilidad de la Frecuencia Cardíaca (HRV)',
            data: hrvValues,
            borderColor: hrvValues.map(value => value > 115 ? 'rgba(255, 0, 0, 1)' : 'rgba(75, 192, 192, 1)'),
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderWidth: 2,
            pointBackgroundColor: hrvValues.map(value => value > 115 ? 'rgba(255, 0, 0, 1)' : 'rgba(75, 192, 192, 1)'),
            pointBorderColor: hrvValues.map(value => value > 115 ? 'rgba(255, 0, 0, 1)' : 'rgba(75, 192, 192, 1)'),
            pointRadius: 5,
            fill: true,
            tension: 0.4
        }]
    };

    const options = {
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Tiempo'
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'HRV'
                }
            }
        },
        plugins: {
            annotation: {
                annotations: {
                    line1: {
                        type: 'line',
                        yMin: 115,
                        yMax: 115,
                        borderColor: 'rgb(255, 99, 132)',
                        borderWidth: 2,
                        label: {
                            enabled: true,
                            content: 'Alerta HRV > 115',
                            position: 'end'
                        }
                    }
                }
            }
        }
    };

    new Chart(ctx, {
        type: 'line',
        data: data,
        options: options
    });
}

// Función para crear el gráfico de aceleración
function createAccChart(accValues) {
    const ctx = document.getElementById('acc-chart').getContext('2d');
    const data = {
        labels: accValues.map((_, index) => index + 1),
        datasets: [{
            label: 'Magnitud de la Aceleración',
            data: accValues,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(75, 192, 192, 1)',
            pointBorderColor: 'rgba(75, 192, 192, 1)',
            pointRadius: 5,
            fill: true,
            tension: 0.4
        }]
    };

    const options = {
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Tiempo'
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Magnitud de Aceleración'
                }
            }
        }
    };

    new Chart(ctx, {
        type: 'line',
        data: data,
        options: options
    });
}

// Función para comprobar si la ubicación está dentro de algún círculo
function checkProximity(location) {
    let inProximity = false;
    metroStations.forEach(station => {
        const distance = map.distance([location.lat, location.lon], [station.lat, station.lon]);
        if (distance <= 100) {
            inProximity = true;
        }
    });
    if (inProximity) {
        showModal();
    } else {
        closeModal();
    }
}

// Función para mostrar el modal de alerta
function showModal() {
    document.getElementById('alert-modal').style.display = 'block';
}

// Función para cerrar el modal de alerta
function closeModal() {
    document.getElementById('alert-modal').style.display = 'none';
}

// Función principal para cargar y mostrar los datos en el mapa y gráfico de líneas
async function loadDataAndDisplay() {
    try {
        // Obtener datos de ubicación
        const locationData = await fetchLatestCSV('Datos_An', '_locationData.csv');
        // Obtener datos de HRV
        const hrvData = await fetchLatestCSV('Datos_An', '_data_stress.csv');
        
        const showAltitudeOnly = document.getElementById('altitude-only').checked;
        const showHRVOnly = document.getElementById('hrv-only').checked;
        
        processLocationAndHRVData(locationData, hrvData, showAltitudeOnly, showHRVOnly);

        // Obtener y procesar datos de aceleración
        const accData = await fetchLatestCSV('Datos_An', '_accData.csv');
        const accValues = processAccData(accData);
        if (accValues) {
            createAccChart(accValues);
            checkRunningStatus(accValues); // Comprobar si el dispositivo está corriendo
        }
    } catch (error) {
        console.error('Error al cargar y mostrar los datos:', error);
    }
}

// Función para comprobar si el dispositivo está corriendo
function checkRunningStatus(accValues) {
    const runningThreshold = 12; // Definir un umbral de aceleración para correr
    const runningStatus = accValues.some(value => value > runningThreshold);

    const statusIndicator = document.getElementById('running-status');
    if (runningStatus) {
        statusIndicator.textContent = 'Corriendo';
        statusIndicator.style.color = 'red';
    } else {
        statusIndicator.textContent = 'No Corriendo';
        statusIndicator.style.color = 'green';
    }
}

// Función para encontrar el punto más cercano en la polilínea
function findNearestPoint(latlng, points) {
    let nearestPoint = null;
    let minDistance = Infinity;

    points.forEach(point => {
        const distance = map.distance(latlng, [point.lat, point.lon]);
        if (distance < minDistance) {
            minDistance = distance;
            nearestPoint = point;
        }
    });

    return nearestPoint;
}

// Ejecutar la función principal
loadDataAndDisplay();

// Añadir evento a las casillas de verificación
document.getElementById('altitude-only').addEventListener('change', loadDataAndDisplay);
document.getElementById('hrv-only').addEventListener('change', loadDataAndDisplay);