package com.example.riskwatchapp;


import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.os.Handler;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;


import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.text.DecimalFormat;
import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.Objects;




public class StartAct extends AppCompatActivity implements LocationListener, SensorEventListener {

    private final static String APP_TAG = "MainActivity";

    // Initializing thetextView
    TextView textView;
    Button but_enviar;
    Button but_relax;
    //Button but_web;
    File logs_start;
    String fileString_log_start="";
    public int npulse = 0;

    private Handler handler;
    private Runnable runnable;
    private LocationManager locationManager;
    private SensorManager sensorManager;
    private Sensor pressureSensor;
    private Sensor accelerometer;
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 1;
    private static final int STORAGE_PERMISSION_REQUEST_CODE = 2;

    private static final double SEA_LEVEL_PRESSURE = 1013.25; // hPa
    private static final double TEMPERATURE_CELSIUS = 20.0; // Temperatura fija en Celsius
    private static final double TEMPERATURE_KELVIN = TEMPERATURE_CELSIUS + 273.15; // Convertir a Kelvin

    private Double latitude = null;
    private Double longitude = null;
    private Double height = null;
    private File accFile;
    private FileWriter accWriter;

    private float[] acceleration = new float[3];


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_main);
        textView = findViewById (R.id.stressMeterText);
        but_relax = findViewById(R.id.relaxButton);
        but_enviar = findViewById(R.id.sendDataButton);
        //but_web = findViewById(R.id.webButton);
        //but_web.setOnClickListener(v -> openWebPage());
        //but_web.setEnabled(false);
        Log.i(APP_TAG, "ON CREATE START ACTIVITY");

        createFile();

        SimpleDateFormat time_now = new SimpleDateFormat("HH_mm_ss");
        String timestamp = time_now.format(new Date());
        fileString_log_start = fileString_log_start + timestamp+", "+"onCreate() START ACTIVITY"+"\n";
        FileWriters(fileString_log_start,logs_start);
        fileString_log_start = "";

        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        pressureSensor = sensorManager.getDefaultSensor(Sensor.TYPE_PRESSURE);
        accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);

        if (pressureSensor != null) {
            sensorManager.registerListener(this, pressureSensor, SensorManager.SENSOR_DELAY_NORMAL);
        }

        if (accelerometer != null) {
            sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_NORMAL);
        }


        checkPermissions();
        initializeFiles();
        setupPeriodicUpdates();


    }

    private void checkPermissions() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED
                || ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED
                || ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED
                || ContextCompat.checkSelfPermission(this, Manifest.permission.BODY_SENSORS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.WRITE_EXTERNAL_STORAGE,
                    Manifest.permission.READ_EXTERNAL_STORAGE,
                    Manifest.permission.BODY_SENSORS
            }, LOCATION_PERMISSION_REQUEST_CODE);
        } else {
            startLocationUpdates();
        }
    }

    private void startLocationUpdates() {
        // Inicia las actualizaciones de ubicación
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                && ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 0, 0, this);
        }
    }

    @Override
    public void onLocationChanged(@NonNull Location location) {
        latitude = location.getLatitude();
        longitude = location.getLongitude();
    }

    private void saveDataToCSV(double latitude, double longitude, double height, float[] acceleration) {
        File externalFilesDir = getExternalFilesDir(null);
        if (externalFilesDir != null) {
            // Guardar datos de ubicación y altura
            File dataFilePath = new File(externalFilesDir, "locationData");
            if (!dataFilePath.exists()) {
                dataFilePath.mkdirs();
            }
            String dataFileName = new SimpleDateFormat("yyyyMMdd", Locale.getDefault()).format(new Date()) + "_locationData.csv";
            File dataFile = new File(dataFilePath, dataFileName);
            try (BufferedWriter writer = new BufferedWriter(new FileWriter(dataFile, true))) {
                writer.append(String.format(Locale.getDefault(), "%.6f,%.6f,%.2f\n", latitude, longitude, height));
            } catch (IOException e) {
                e.printStackTrace();
            }

            // Guardar datos de aceleración
            File accFilePath = new File(externalFilesDir, "AccData");
            if (!accFilePath.exists()) {
                accFilePath.mkdirs();
            }
            String accFileName = new SimpleDateFormat("yyyyMMdd", Locale.getDefault()).format(new Date()) + "_accData.csv";
            File accFile = new File(accFilePath, accFileName);
            try (BufferedWriter writer = new BufferedWriter(new FileWriter(accFile, true))) {
                writer.append(String.format(Locale.getDefault(), "%.6f,%.6f,%.6f\n", acceleration[0], acceleration[1], acceleration[2]));
            } catch (IOException e) {
                e.printStackTrace();
            }
        } else {
            System.err.println("Error: External storage not available");
        }
    }

    private void setupPeriodicUpdates() {
        handler = new Handler();
        runnable = new Runnable() {
            @Override
            public void run() {
                if (latitude != null && longitude != null && height != null) {
                    saveDataToCSV(latitude, longitude, height, acceleration);
                }
                handler.postDelayed(this, 7000); // 7 segundos
            }
        };
        handler.post(runnable);
    }

    private void initializeFiles() {
        File dir = new File(getExternalFilesDir(null), "AccData");
        if (!dir.exists()) {
            dir.mkdirs();
        }

        String currentDate = new SimpleDateFormat("yyyyMMdd", Locale.getDefault()).format(new Date());
        accFile = new File(dir, currentDate + "_accData.csv");
        try {
            accWriter = new FileWriter(accFile);
            accWriter.append("timestamp,x,y,z\n");
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        // No es necesario implementar este método para este proyecto
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() == Sensor.TYPE_PRESSURE) {
            float pressure = event.values[0];
            height = calculateHeight(pressure, TEMPERATURE_KELVIN);
        } else if (event.sensor.getType() == Sensor.TYPE_ACCELEROMETER) {
            acceleration[0] = event.values[0];
            acceleration[1] = event.values[1];
            acceleration[2] = event.values[2];
        }
    }

    private double calculateHeight(float pressure, double temperature) {
        return Math.abs((1 - Math.pow(pressure / SEA_LEVEL_PRESSURE, 0.190284)) * (temperature / 0.0065));
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == LOCATION_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startLocationUpdates();
            }
        }
        if (requestCode == STORAGE_PERMISSION_REQUEST_CODE) {
            // Manejar los permisos de almacenamiento si es necesario
        }
    }

    public void sendData(View v){
        npulse  = npulse +1;
        Log.i(APP_TAG, "BOTON SEND DATA  " + npulse);


        if (npulse ==1){

            counterSend= new CountDownTimer(3000, 3000) {
                public void onTick(long millisUntilFinished) {


                }
                // When the task is over it will print 00:00:00 there
                public void onFinish() {
                    Log.i(APP_TAG, "timer end ACTIVITY");


                    SimpleDateFormat time_now = new SimpleDateFormat("HH_mm_ss");
                    String timestamp = time_now.format(new Date());
                    fileString_log_start = fileString_log_start + timestamp+", "+"start"+", "+"timerEnd()"+"\n";

                    if(npulse >= 1) {
                        Intent mainIntent = new Intent(StartAct.this, FirebaseActivity.class);
                        startActivity(mainIntent);
                    }
                    npulse = 0;

                }
            }.start();
        }


    }

    public void startSleep(View v){
        textView.setText("activa Water Lock");
        but_relax.setEnabled(false);
        but_enviar.setEnabled(false);
        //but_web.setEnabled(false);
        setTimer();
    }


    public void FileWriters(String str, File file){
        try {
            if(!file.exists()){
                file.createNewFile();
                FileOutputStream fOut = new FileOutputStream(file, true);
                fOut.write(" timestamp, activity, event \n".getBytes());
//                fOut.flush();
                fOut.close();
            }
            FileOutputStream fOut = new FileOutputStream(file, true);
            fOut.write(str.getBytes());
            fOut.flush();
            fOut.close();

        } catch (IOException e){
            Log.e("Exception", "File write failed");
            SimpleDateFormat time_now = new SimpleDateFormat("HH_mm_ss");
            String timestamp = time_now.format(new Date());
            fileString_log_start = fileString_log_start + timestamp+", "+"start"+", "+"file write exception"+"\n";
            FileWriters(fileString_log_start,logs_start);
            fileString_log_start = "";
        }
    }

    @Override
    protected void onStart() {
        super.onStart();
        SimpleDateFormat time_now = new SimpleDateFormat("HH_mm_ss");
        String timestamp = time_now.format(new Date());
        fileString_log_start = fileString_log_start + timestamp+", "+"start"+", "+"onStart()"+"\n";
        FileWriters(fileString_log_start,logs_start);
        fileString_log_start = "";

    }
    @Override
    protected void onResume() {
        super.onResume();

        npulse=0;

        SimpleDateFormat time_now = new SimpleDateFormat("HH_mm_ss");
        String timestamp = time_now.format(new Date());
        fileString_log_start = fileString_log_start + timestamp+", "+"start"+", "+"onResume()"+"\n";
        FileWriters(fileString_log_start,logs_start);
        fileString_log_start = "";

        but_enviar.setText("Enviar");
        but_relax.setText("Relaja");
        //but_web.setText("Web");
        textView.setText("Medidor de estrés");
        but_enviar.setEnabled(true);
        but_relax.setEnabled(true);
        //but_web.setEnabled(true);

    }

    @Override
    protected void onPause() {
        super.onPause();
        SimpleDateFormat time_now = new SimpleDateFormat("HH_mm_ss");
        String timestamp = time_now.format(new Date());
        fileString_log_start = fileString_log_start + timestamp+", "+"start"+", "+"onPause()"+"\n";
        FileWriters(fileString_log_start,logs_start);
        fileString_log_start = "";

    }

    @Override
    protected void onStop() {
        super.onStop();
        SimpleDateFormat time_now = new SimpleDateFormat("HH_mm_ss");
        String timestamp = time_now.format(new Date());
        fileString_log_start = fileString_log_start + timestamp+", "+"start"+", "+"onStop()"+"\n";
        FileWriters(fileString_log_start,logs_start);
        fileString_log_start = "";

        if(counterStart != null) {
            counterStart.cancel();
        }
    }

    public CountDownTimer counterStart;
    public CountDownTimer counterSend;

    public void setTimer(){
        counterStart= new CountDownTimer(15000, 1000) {
            public void onTick(long millisUntilFinished) {
                // Used for formatting digit to be in 2 digits only
                NumberFormat f = new DecimalFormat("00");
                long hour = (millisUntilFinished / 3600000) % 24;
                long min = (millisUntilFinished / 60000) % 60;
                long sec = (millisUntilFinished / 1000) % 60;

                but_enviar.setText(f.format(hour) + ":" + f.format(min) + ":" + f.format(sec));

            }
            // When the task is over it will print 00:00:00 there
            public void onFinish() {
                Log.i(APP_TAG, "timer end ACTIVITY");
                try {
                    Uri notification = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                    Ringtone r = RingtoneManager.getRingtone(getApplicationContext(), notification);
                    r.play();
                } catch (Exception e) {
                    e.printStackTrace();
                }


                SimpleDateFormat time_now = new SimpleDateFormat("HH_mm_ss");
                String timestamp = time_now.format(new Date());
                fileString_log_start = fileString_log_start + timestamp+", "+"start"+", "+"timerEnd()"+"\n";

                textView.setText("00:00:00");

                Intent mainIntent = new Intent(StartAct.this, ActPrincp.class);
                startActivity(mainIntent);

            }
        }.start();

    }

    private void createFile() {
        SimpleDateFormat sdf_filename = new SimpleDateFormat("dd_MM_yyyy_HH_mm_ss");
        String file_name = sdf_filename.format(new Date());

        File path = new File( Objects.requireNonNull(this.getExternalFilesDir(null)).getAbsolutePath() + "/StressData");

        if (!path.exists()){
            path.mkdirs();
        }
        logs_start = new File(path, "LOGS_START_"+file_name+".csv");
        SimpleDateFormat time_now = new SimpleDateFormat("HH_mm_ss");
        String timestamp = time_now.format(new Date());
        fileString_log_start = fileString_log_start + timestamp+", "+"start"+", "+"file created"+"\n";


    }

    //private void openWebPage() {
    //    String url = "https://riskwatchapp-5ec8b.web.app";
    //    Intent intent = new Intent(Intent.ACTION_VIEW);
    //    intent.setData(Uri.parse(url));
    //    startActivity(intent);
    //}

}
