# RiskWatchApp 

Este proyecto permite visualizar los datos de ubicación, HRV, SpO2, aceleración y Estrés recogidos por un smartwatch y almacenados en Firebase. La visualización incluye un mapa interactivo y gráficos permitiendo identificar situaciones de estrés para usuarios vulnerables de la vía, tales como peatones, ciclistas o usuarios de vehículos de movilidad personal. A su vez permite el envio de retroalimentaciones para su mejora.

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
Copia la configuración de Firebase de el proyecto en la consola de Firebase y reemplaza la configuración en scripts.js:
```bash
const firebaseConfig = {
    apiKey: "AIzaSyDIJorV_JDC03nbKYBR7wkeKjBJLcHcxo",
    authDomain: "riskwatchapp-5ec8b.firebaseapp.com",
    databaseURL: "https://riskwatchapp-5ec8b-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "riskwatchapp-5ec8b",
    storageBucket: "riskwatchapp-5ec8b.appspot.com",
    messagingSenderId: "162678165225",
    appId: "1:162678165225:web:3c28dd0d756ade7742a78"
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

### Página web 
![image](https://github.com/JaimeRevilla/RiskWatch-App/assets/90686026/f91df491-aeed-42c3-a9e3-158b4e8e70dc)

