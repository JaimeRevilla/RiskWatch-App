# RiskWatchApp Web

Este proyecto permite visualizar los datos de ubicación, HRV, SpO2 y aceleración recogidos por un smartwatch y almacenados en Firebase. La visualización incluye un mapa interactivo y gráficos generados con Chart.js.

## Requisitos

- Node.js
- Firebase CLI
- Cuenta de Firebase
- Cuenta de Google Cloud para configurar la política de CORS

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/riskwatchapp-web.git
cd riskwatchapp-web
```

### 2. Instalar Node.js y Firebase CLI
Si no tienes Node.js y Firebase CLI instalados, sigue estos pasos:

Instalación de Node.js
[Descarga e instala Node.js desde su página oficial.](https://nodejs.org/en)

Instalación de Firebase CLI
```bash
npm install -g firebase-tools
```

### 3. Inicializar Firebase
Accede a la consola de Firebase y crea un nuevo proyecto.
En el directorio del proyecto, ejecuta:
```bash
firebase login
firebase init
```
Selecciona Hosting y sigue las instrucciones para configurar el proyecto. Usa build como el directorio público.
### 4. Configurar Firebase
Copia la configuración de Firebase desde tu proyecto en la consola de Firebase y reemplaza la configuración en scripts.js:
```bash
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "YOUR_DATABASE_URL",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```
### 5. Configurar CORS en Google Cloud
Instala la herramienta de línea de comandos de Google Cloud:
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```
Autoriza la CLI de Google Cloud:
```bash
gcloud auth login
```
Configura la política de CORS para tu bucket de Firebase Storage:
```bash
gsutil cors set cors.json gs://YOUR_STORAGE_BUCKET
```
Asegúrate de tener un archivo cors.json en tu directorio de trabajo con el siguiente contenido:
```bash
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```
### 6. Desplegar en Firebase Hosting
```bash
firebase deploy
```
