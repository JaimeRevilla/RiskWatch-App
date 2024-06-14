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
function fetchCSVFiles(directory, fileIdentifiers) {
    return storageRef.child(directory).listAll().then(function(result) {
        const csvFiles = result.items.filter(item => fileIdentifiers.some(identifier => item.name.includes(identifier)));
        if (csvFiles.length === 0) {
            throw new Error(`No se encontraron archivos CSV con los identificadores: ${fileIdentifiers}`);
        }

        // Ordenar los archivos por nombre (asumiendo que los nombres de archivo contienen fechas y se ordenan lexicográficamente)
        csvFiles.sort((a, b) => a.name.localeCompare(b.name));
        const fetchPromises = csvFiles.map(file => file.getDownloadURL().then(url => fetch(url).then(response => response.text())));
        return Promise.all(fetchPromises);
    });
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
function processLocationAndHRVData(locationDataArray, spO2DataArray, showAltitudeOnly = false, showHRVOnly = false, showHeatmap = false) {
    clearMap();
    
    const locationRegex = /(-?\d+,\d{6}),(-?\d+,\d{6}),(\d+)/;
    const points = [];

    locationDataArray.forEach((locationData, index) => {
        const rows = locationData.trim().split('\n');
        const spO2Data = spO2DataArray[index];
        const spO2Values = processSpO2Data(spO2Data);

        rows.forEach((row, rowIndex) => {
            const match = row.match(locationRegex);
            if (match) {
                const lat = parseFloat(match[1].replace(',', '.'));
                const lon = parseFloat(match[2].replace(',', '.'));
                const altitude = parseFloat(match[3]);
                const spO2 = spO2Values ? spO2Values[rowIndex] : null;
                if (!isNaN(lat) && !isNaN(lon) && !isNaN(altitude)) {
                    points.push({ lat, lon, altitude, spO2 });
                }
            }
        });
    });

    if (points.length > 0) {
        const latlngs = points.map(point => [point.lat, point.lon]);

        if (showHeatmap) {
            const heatData = points.map(point => {
                let intensity = point.spO2 > 115 ? 1 : point.spO2 / 115;
                return [point.lat, point.lon, intensity];
            });
            heatLayer = L.heatLayer(heatData, { radius: 25 }).addTo(map);
        } else {
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
                        const polyline = L.polyline([segment.latlng, altitudeLatLngs[index + 1].latlng], { color: segment.color }).addTo(map);
                        polylines.push(polyline);
                    }
                });

                // Añadir evento a la polilínea para mostrar solo la altitud
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
            } else if (showHRVOnly) {
                // Dibujar una línea basada solo en el SpO2 y cambiar el color si el SpO2 es mayor de 115
                const spO2LatLngs = latlngs.map((latlng, index) => {
                    const point = points[index];
                    return { 
                        latlng, 
                        color: point.spO2 > 115 ? 'red' : 'blue' 
                    };
                });

                spO2LatLngs.forEach((segment, index) => {
                    if (index < spO2LatLngs.length - 1) {
                        const polyline = L.polyline([segment.latlng, spO2LatLngs[index + 1].latlng], { color: segment.color }).addTo(map);
                        polylines.push(polyline);
                    }
                });

                // Añadir evento a la polilínea para mostrar solo el SpO2
                polylines.forEach(polyline => {
                    polyline.on('click', function(e) {
                        const nearestPoint = findNearestPoint(e.latlng, points);
                        if (nearestPoint) {
                            L.popup()
                                .setLatLng([nearestPoint.lat, nearestPoint.lon])
                                .setContent(`<b>SpO2:</b> ${nearestPoint.spO2}`)
                                .openOn(map);
                        }
                    });
                });
            } else {
                // Dibujar una línea que conecte todos los puntos sin cambiar el color basado en SpO2 o altitud
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

                // Añadir evento a la polilínea para mostrar solo latitud y longitud
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

            // Añadir marcador solo para el primer y último punto
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

            // Centrarse en el primer punto
            map.setView([firstPoint.lat, firstPoint.lon], 13); // Zoom al primer marcador
        }
    }
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

// Función para crear el gráfico de SpO2
function createSpO2Chart(spO2Values) {
    if (hrvChart) {
        hrvChart.destroy(); // Destruir el gráfico anterior si existe
    }

    const ctx = document.getElementById('hrv-chart').getContext('2d');
    const data = {
        labels: spO2Values.map((_, index) => index + 1),
        datasets: [{
            label: 'Saturación de Oxígeno en Sangre (SpO2)',
            data: spO2Values,
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
                    text: 'SpO2'
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
        const selectedDates = [...document.getElementById('date-selector').selectedOptions].map(option => option.value);
        if (selectedDates.length === 0) {
            alert('Por favor, seleccione al menos una fecha.');
            return;
        }

        // Obtener datos de ubicación
        const locationDataPromises = selectedDates.map(date => fetchCSVFiles('Datos_An', [`${date}_locationData.csv`]));
        const locationDataArray = await Promise.all(locationDataPromises);

        // Obtener datos de SpO2
        const spO2DataPromises = selectedDates.map(date => fetchCSVFiles('Datos_An', [`${date}_data_Sp02.csv`]));
        const spO2DataArray = await Promise.all(spO2DataPromises);

        const showAltitudeOnly = document.getElementById('altitude-only').checked;
        const showHRVOnly = document.getElementById('hrv-only').checked;
        const showHeatmap = document.getElementById('heatmap').checked;
        
        processLocationAndHRVData(locationDataArray.flat(), spO2DataArray.flat(), showAltitudeOnly, showHRVOnly, showHeatmap);

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

        // Procesar y mostrar datos de SpO2 en el gráfico
        const spO2Values = spO2DataArray.flat().map(data => processSpO2Data(data)).flat();
        if (spO2Values.length > 0) {
            createSpO2Chart(spO2Values);
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

// Ejecutar la función principal
document.getElementById('load-data-btn').addEventListener('click', loadDataAndDisplay);

// Añadir evento a las casillas de verificación
document.getElementById('altitude-only').addEventListener('change', loadDataAndDisplay);
document.getElementById('hrv-only').addEventListener('change', loadDataAndDisplay);
document.getElementById('heatmap').addEventListener('change', loadDataAndDisplay);