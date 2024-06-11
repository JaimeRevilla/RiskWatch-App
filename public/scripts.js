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
function processLocationData(data) {
    const regex = /(-?\d+,\d{6}),(-?\d+,\d{6}),(\d+)/;
    const rows = data.trim().split('\n');
    const points = [];

    rows.forEach(row => {
        const match = row.match(regex);
        if (match) {
            const lat = parseFloat(match[1].replace(',', '.'));
            const lon = parseFloat(match[2].replace(',', '.'));
            const altitude = parseFloat(match[3]);
            if (!isNaN(lat) && !isNaN(lon) && !isNaN(altitude)) {
                points.push([lat, lon]);
            }
        }
    });

    if (points.length > 0) {
        // Dibujar una línea que conecte todos los puntos
        L.polyline(points, { color: 'blue' }).addTo(map);

        // Añadir un marcador para cada punto
        points.forEach(point => {
            const marker = L.marker(point).addTo(map);
            marker.bindPopup(`<b>Latitud:</b> ${point[0]}, <b>Longitud:</b> ${point[1]}`);
        });

        // Centrarse en el primer punto
        map.setView(points[0], 13); // Zoom al primer marcador
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
            borderColor: hrvValues.map(value => value > 110 ? 'rgba(255, 0, 0, 1)' : 'rgba(75, 192, 192, 1)'),
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderWidth: 2,
            pointBackgroundColor: hrvValues.map(value => value > 110 ? 'rgba(255, 0, 0, 1)' : 'rgba(75, 192, 192, 1)'),
            pointBorderColor: hrvValues.map(value => value > 110 ? 'rgba(255, 0, 0, 1)' : 'rgba(75, 192, 192, 1)'),
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
                        yMin: 110,
                        yMax: 110,
                        borderColor: 'rgb(255, 99, 132)',
                        borderWidth: 2,
                        label: {
                            enabled: true,
                            content: 'Alerta HRV > 110',
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


// Función principal para cargar y mostrar los datos en el mapa y gráfico de líneas
async function loadDataAndDisplay() {
    try {
        // Obtener datos de ubicación
        const locationData = await fetchLatestCSV('Datos_An', '_locationData.csv');
        processLocationData(locationData);

        // Obtener datos de HRV
        const hrvData = await fetchLatestCSV('Datos_An', '_data_stress.csv');
        const hrvValues = processHRVData(hrvData);
        if (hrvValues) {
            createHRVChart(hrvValues);
        }

        // Obtener datos de aceleración
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

// Ejecutar la función principal
loadDataAndDisplay();