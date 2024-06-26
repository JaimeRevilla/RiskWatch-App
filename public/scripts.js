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

let heatLayer;
let markers = [];
let polylines = [];
let hrvChart = null;
let accChart = null;

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

// Función para obtener la lista de archivos en el directorio y poblar el selector de fechas
async function populateDateSelector() {
    try {
        const directoryRef = storageRef.child('Datos_An');
        const result = await directoryRef.listAll();

        const dateSelector = document.getElementById('date-selector');
        result.items.forEach(item => {
            const date = item.name.split('_')[0];
            if (![...dateSelector.options].some(option => option.value === date)) {
                const option = document.createElement('option');
                option.value = date;
                option.textContent = date;
                dateSelector.appendChild(option);
            }
        });
    } catch (error) {
        console.error('Error al obtener la lista de archivos:', error);
    }
}

// Llamar a la función para poblar el selector de fechas al cargar la página
populateDateSelector();

// Función para obtener la URL de descarga del archivo CSV más reciente en un directorio específico
async function fetchCSVFiles(directory, fileIdentifiers) {
    const directoryRef = storageRef.child(directory);
    const result = await directoryRef.listAll();
    const csvFiles = result.items.filter(item => fileIdentifiers.some(identifier => item.name.includes(identifier)));

    if (csvFiles.length === 0) {
        throw new Error(`No se encontraron archivos CSV con los identificadores: ${fileIdentifiers}`);
    }

    // Ordenar los archivos por nombre (asumiendo que los nombres de archivo contienen fechas y se ordenan lexicográficamente)
    csvFiles.sort((a, b) => a.name.localeCompare(b.name));

    const fetchPromises = csvFiles.map(file => file.getDownloadURL().then(url => fetch(url).then(response => response.text())));
    return Promise.all(fetchPromises);
}

// Función para eliminar las capas anteriores del mapa
function clearMap() {
    if (heatLayer) {
        map.removeLayer(heatLayer);
    }
    markers.forEach(marker => {
        map.removeLayer(marker);
    });
    markers = [];
    polylines.forEach(polyline => {
        map.removeLayer(polyline);
    });
    polylines = [];
}

// Función para procesar los datos de ubicación y añadirlos al mapa
function processLocationAndHRVData(locationDataArray, hrvDataArray, spO2DataArray, showAltitudeOnly = false, showHeatmap = false, showStressOnly = false) {
    clearMap();
    
    const locationRegex = /(-?\d+,\d{6}),(-?\d+,\d{6}),(\d+)/;
    const points = [];

    locationDataArray.forEach((locationData, index) => {
        const rows = locationData.trim().split('\n');
        const hrvData = hrvDataArray[index];
        const spO2Data = spO2DataArray[index];
        const hrvValues = processHRVData(hrvData);
        const spO2Values = processSpO2Data(spO2Data);

        rows.forEach((row, rowIndex) => {
            const match = row.match(locationRegex);
            if (match) {
                const lat = parseFloat(match[1].replace(',', '.'));
                const lon = parseFloat(match[2].replace(',', '.'));
                const altitude = parseFloat(match[3]);
                const hrv = hrvValues ? hrvValues[rowIndex] : null;
                const spO2 = spO2Values ? spO2Values[rowIndex] : null;
                if (!isNaN(lat) && !isNaN(lon) && !isNaN(altitude)) {
                    points.push({ lat, lon, altitude, hrv, spO2 });
                }
            }
        });
    });

    if (points.length > 0) {
        const latlngs = points.map(point => [point.lat, point.lon]);

        if (showHeatmap) {
            const heatData = points.map(point => {
                let intensity = point.hrv > 115 ? 1 : point.hrv / 115;
                return [point.lat, point.lon, intensity];
            });
            heatLayer = L.heatLayer(heatData, { radius: 25 }).addTo(map);
        } else if (showStressOnly) {
            const stressValues = points.map(point => {
                const stress = point.hrv / point.spO2; // Usando SpO2 para calcular el estrés
                return { ...point, stress };
            });

            stressValues.forEach((point, index) => {
                const color = point.stress > 0.950 ? 'red' : 'blue';
                if (index < stressValues.length - 1) {
                    const nextPoint = stressValues[index + 1];
                    const polyline = L.polyline([[point.lat, point.lon], [nextPoint.lat, nextPoint.lon]], { color }).addTo(map);
                    polylines.push(polyline);
                }
            });

            polylines.forEach(polyline => {
                polyline.on('click', function(e) {
                    const nearestPoint = findNearestPoint(e.latlng, stressValues);
                    if (nearestPoint) {
                        L.popup()
                            .setLatLng([nearestPoint.lat, nearestPoint.lon])
                            .setContent(`<b>Nivel de Estrés:</b> ${nearestPoint.stress.toFixed(3)}`)
                            .openOn(map);
                    }
                });
            });

        } else {
            if (showAltitudeOnly) {
                const altitudeLatLngs = latlngs.map((latlng, index) => {
                    const point = points[index];
                    return { 
                        latlng, 
                        color: point.altitude < 685 ? 'red' : 'blue' 
                    };
                });

                altitudeLatLngs.forEach((segment, index) => {
                    if (index < altitudeLatLngs.length - 1) {
                        const polyline = L.polyline([segment.latlng, altitudeLatLngs[index + 1].latlng], { color: segment.color }).addTo(map);
                        polylines.push(polyline);
                    }
                });

                polylines.forEach(polyline => {
                    polyline.on('click', function(e) {
                        const nearestPoint = findNearestPoint(e.latlng, points);
                        if (nearestPoint) {
                            L.popup()
                                .setLatLng([nearestPoint.lat, nearestPoint.lon])
                                .setContent(`<b>Altura:</b> ${nearestPoint.altitude} metros`)
                                .openOn(map);
                        }
                    });
                });
            } else {
                const defaultLatLngs = latlngs.map((latlng) => {
                    return { 
                        latlng, 
                        color: 'blue' 
                    };
                });

                defaultLatLngs.forEach((segment, index) => {
                    if (index < defaultLatLngs.length - 1) {
                        const polyline = L.polyline([segment.latlng, defaultLatLngs[index + 1].latlng], { color: segment.color }).addTo(map);
                        polylines.push(polyline);
                    }
                });

                polylines.forEach(polyline => {
                    polyline.on('click', function(e) {
                        const nearestPoint = findNearestPoint(e.latlng, points);
                        if (nearestPoint) {
                            L.popup()
                                .setLatLng([nearestPoint.lat, nearestPoint.lon])
                                .setContent(`<b>Latitud:</b> ${nearestPoint.lat}, <b>Longitud:</b> ${nearestPoint.lon}`)
                                .openOn(map);
                        }
                    });
                });
            }

            const firstPoint = points[0];
            const lastPoint = points[points.length - 1];

            if (firstPoint) {
                const marker = L.marker([firstPoint.lat, firstPoint.lon]).addTo(map);
                marker.bindPopup(`<b>Latitud:</b> ${firstPoint.lat}, <b>Longitud:</b> ${firstPoint.lon}`);
                markers.push(marker);
            }

            if (lastPoint) {
                const marker = L.marker([lastPoint.lat, lastPoint.lon]).addTo(map);
                marker.bindPopup(`<b>Latitud:</b> ${lastPoint.lat}, <b>Longitud:</b> ${lastPoint.lon}`);
                markers.push(marker);
            }

            map.setView([firstPoint.lat, firstPoint.lon], 13);
        }
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

// Función para procesar los datos de SpO2
function processSpO2Data(data) {
    const rows = data.trim().split('\n');
    const spO2Values = [];

    rows.forEach(row => {
        const value = parseFloat(row);
        if (!isNaN(value)) {
            spO2Values.push(value);
        }
    });

    return spO2Values.length > 0 ? spO2Values : null;
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

// Función para crear el gráfico de aceleración
function createAccChart(accValues) {
    if (accChart) {
        accChart.destroy(); // Destruir el gráfico anterior si existe
    }

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

    accChart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: options
    });
}

// Función principal para cargar y mostrar los datos en el mapa y gráfico de líneas
async function loadDataAndDisplay() {
    try {
        const selectedDates = [...document.getElementById('date-selector').selectedOptions].map(option => option.value);
        if (selectedDates.length === 0) {
            alert('Por favor, seleccione al menos una fecha.');
            return;
        }

        // Obtener datos de ubicación
        const locationDataPromises = selectedDates.map(date => fetchCSVFiles('Datos_An', [`${date}_locationData.csv`]));
        const locationDataArray = await Promise.all(locationDataPromises);

        // Obtener datos de HRV
        const hrvDataPromises = selectedDates.map(date => fetchCSVFiles('Datos_An', [`${date}_data_stress.csv`]));
        const hrvDataArray = await Promise.all(hrvDataPromises);

        // Obtener datos de SpO2
        const spO2DataPromises = selectedDates.map(date => fetchCSVFiles('Datos_An', [`${date}_data_Spo2.csv`]));
        const spO2DataArray = await Promise.all(spO2DataPromises);

        const showAltitudeOnly = document.getElementById('altitude-only').checked;
        const showStressLevel = document.getElementById('stress-level').checked;
        const showHeatmap = document.getElementById('heatmap').checked;
        
        processLocationAndHRVData(locationDataArray.flat(), hrvDataArray.flat(), spO2DataArray.flat(), showAltitudeOnly, showHeatmap, showStressLevel);

        // Obtener y procesar datos de aceleración
        const accDataPromises = selectedDates.map(date => fetchCSVFiles('Datos_An', [`${date}_accData.csv`]));
        const accDataArray = await Promise.all(accDataPromises);
        const accValues = accDataArray.flat().map(data => processAccData(data)).flat();
        if (accValues.length > 0) {
            createAccChart(accValues);
            checkRunningStatus(accValues); // Comprobar si el dispositivo está corriendo
        } else if (accChart) {
            accChart.destroy();
            accChart = null; // Destruir el gráfico si no hay datos
        }

        // Procesar y mostrar datos de HRV y SpO2 en el gráfico
        const hrvValues = hrvDataArray.flat().map(data => processHRVData(data)).flat();
        const spO2Values = spO2DataArray.flat().map(data => processSpO2Data(data)).flat();

        // Limitar la cantidad de datos a mostrar
        const limit = 30; // Número máximo de puntos a mostrar
        const limitedHRVValues = hrvValues.slice(-limit);
        const limitedSpO2Values = spO2Values.slice(-limit);

        if (limitedHRVValues.length > 0 || limitedSpO2Values.length > 0) {
            createSpO2AndHRVChart(limitedSpO2Values, limitedHRVValues);
        } else if (hrvChart) {
            hrvChart.destroy();
            hrvChart = null; // Destruir el gráfico si no hay datos
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

function createSpO2AndHRVChart(spO2Values, hrvValues) {
    if (hrvChart) {
        hrvChart.destroy(); // Destruir el gráfico anterior si existe
    }

    const ctx = document.getElementById('hrv-chart').getContext('2d');
    const labels = Array.from({ length: Math.max(spO2Values.length, hrvValues.length) }, (_, i) => i + 1);
    const data = {
        labels: labels,
        datasets: [
            {
                label: 'Saturación de Oxígeno en Sangre (SpO2)',
                data: spO2Values,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                pointBorderColor: 'rgba(75, 192, 192, 1)',
                pointRadius: 5,
                fill: true,
                tension: 0.4,
                yAxisID: 'y',
            },
            {
                label: 'Variabilidad de la Frecuencia Cardíaca (HRV)',
                data: hrvValues,
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(255, 99, 132, 1)',
                pointBorderColor: 'rgba(255, 99, 132, 1)',
                pointRadius: 5,
                fill: true,
                tension: 0.4,
                yAxisID: 'y1',
            }
        ]
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
                    text: 'SpO2',
                    color: 'rgba(75, 192, 192, 1)',
                },
                position: 'left',
            },
            y1: {
                title: {
                    display: true,
                    text: 'HRV',
                    color: 'rgba(255, 99, 132, 1)',
                },
                position: 'right',
                grid: {
                    drawOnChartArea: false,
                }
            }
        }
    };

    hrvChart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: options
    });
}

// Ejecutar la función principal
document.getElementById('load-data-btn').addEventListener('click', loadDataAndDisplay);

// Añadir evento a las casillas de verificación
document.getElementById('altitude-only').addEventListener('change', loadDataAndDisplay);
document.getElementById('stress-level').addEventListener('change', loadDataAndDisplay);
document.getElementById('heatmap').addEventListener('change', loadDataAndDisplay);