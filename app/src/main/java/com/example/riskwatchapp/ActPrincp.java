package com.example.riskwatchapp;
/*
 * Copyright 2022 Samsung Electronics Co., Ltd. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;

import android.os.PowerManager;

import android.util.Log;
import android.view.WindowManager;
import android.widget.Toast;

import androidx.core.app.ActivityCompat;
import androidx.fragment.app.FragmentActivity;

import com.samsung.android.service.health.tracking.HealthTrackerException;
import com.samsung.android.service.health.tracking.HealthTrackingService;
import com.example.riskwatchapp.databinding.ActivityReadBinding;
import org.jetbrains.annotations.Nullable;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Objects;
import java.util.Timer;
import java.util.TimerTask;

public class ActPrincp extends FragmentActivity {

    private final static String APP_TAG = "MainActivity";
    private final String[] permissions = {"android.permission.ACTIVITY_RECOGNITION, android.permission.BODY_SENSORS_BACKGROUND,android.permission.BODY_SENSORS"};
    public boolean isMeasurementRunning = false;
    private ConnectionManag connectionManager;
    private HRVListener heartRateListener = null;
    private Sp02Listener spO2Listener = null;

    private int previousStatus = Sp02Status.INITIAL_STATUS;

    public String hr_value = "";

    public String hribi_value = "";

    public String spo2_value = "";


    public int flag =0;
    public int flag2 =0;


    public int data_counter = 0;


    String fileString = "";
    SimpleDateFormat sdf_filename;

    File path;
    File file_stress;
    File file_spo2;
    File logs;
    String fileString_log="";
    private HealthTrackingService healthTrackingService = null;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.i(APP_TAG, "MAIN ACTIVITY oncreate ");


        final ActivityReadBinding binding = ActivityReadBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());


        createFile();

        SimpleDateFormat time_now = new SimpleDateFormat("HH_mm_ss");
        String timestamp = time_now.format(new Date());
        fileString_log= fileString_log + timestamp+", "+"main"+", "+"onCreate"+"\n";
        FileWritersLog(fileString_log,logs);
        fileString_log = "";

        isMeasurementRunning = false;


        if (ActivityCompat.checkSelfPermission(getApplicationContext(), "android.permissions.BODY_SENSORS") == PackageManager.PERMISSION_DENIED)
            requestPermissions(new String[]{Manifest.permission.BODY_SENSORS}, 0);

        if (ActivityCompat.checkSelfPermission(getApplicationContext(), "android.permissions.ACTIVITY_RECOGNITION") == PackageManager.PERMISSION_DENIED)
            requestPermissions(new String[]{Manifest.permission.ACTIVITY_RECOGNITION}, 0);

    }






    public void startSleep(){
        createConnectionManager();
        final PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);

    }


    public void FileWritersLog(String str, File file){
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

        }


    }
    public void FileWriters(String str, File file) {
        try {
            if (!file.exists()) {
                boolean fileCreated = file.createNewFile();
                Log.i(APP_TAG, "File created: " + fileCreated);
                FileOutputStream fOut = new FileOutputStream(file, true);
                fOut.write("timestamp, hr, ibi, spo2, sensor\n".getBytes());
                fOut.close();
            }
            FileOutputStream fOut = new FileOutputStream(file, true);
            fOut.write(str.getBytes());
            fOut.flush();
            fOut.close();
            Log.i(APP_TAG, "Data written to file: " + file.getAbsolutePath());
        } catch (IOException e) {
            Log.e("Exception", "File write failed: " + e.getMessage());
            SimpleDateFormat time_now = new SimpleDateFormat("HH_mm_ss");
            String timestamp = time_now.format(new Date());
            fileString_log = fileString_log + timestamp + ", " + "main" + ", " + "file write exception" + "\n";
            FileWritersLog(fileString_log, logs);
            fileString_log = "";
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        //  Log.i("TAG", "onActivityResult requestCode = " + requestCode + " resultCode = " + resultCode);
        if (requestCode == 100) {
            if (resultCode == -1) {
                //setUp();

            } else {
                finish();
            }
        }
    }

    private void createFile() {
        sdf_filename = new SimpleDateFormat("yyyyMMdd");
        String file_name = sdf_filename.format(new Date());

        path = new File(Objects.requireNonNull(this.getExternalFilesDir(null)).getAbsolutePath() + "/StressData");

        if (!path.exists()) {
            boolean dirsCreated = path.mkdirs();
            Log.i(APP_TAG, "Directories created: " + dirsCreated);
        }

        file_stress = new File(path, file_name + "_data_stress.csv");
        file_spo2 = new File(path, file_name + "_data_spo2.csv");
        logs = new File(path, "LOGS_" + file_name + ".csv");

        try {
            if (!file_stress.exists()) {
                boolean fileStressCreated = file_stress.createNewFile();
                Log.i(APP_TAG, "file_stress created: " + fileStressCreated);
            }
            if (!file_spo2.exists()) {
                boolean fileSpo2Created = file_spo2.createNewFile();
                Log.i(APP_TAG, "file_spo2 created: " + fileSpo2Created);
            }
            if (!logs.exists()) {
                boolean logsCreated = logs.createNewFile();
                Log.i(APP_TAG, "logs created: " + logsCreated);
            }
        } catch (IOException e) {
            Log.e(APP_TAG, "File creation failed: " + e.getMessage());
        }
    }


    public void closeApplication() {
        stopTrackers();
        // Finalmente, cierra la actividad
        //finish();
    }

    public void restart_spo2tracker(){
        if (spO2Listener!=null) {
            spO2Listener.stopTracker();
        }

        previousStatus = Sp02Status.INITIAL_STATUS;
        Log.i(APP_TAG, "SP02 - START TRACKER");
        connectionManager.initSpO2(spO2Listener);

        spO2Listener.startTracker();
    }


    private Timer timer;

    public void startTimer() {
        // Create a Timer object
        timer = new Timer();

        Log.i(APP_TAG, "-----START TIMER ------");

        // Create a TimerTask to define the task you want to perform
        TimerTask timerTask = new TimerTask() {
            @Override
            public void run() {
                Log.i(APP_TAG, "-----TIMER 60 sec EXPIRED------");


                restart_spo2tracker();
                // This code will be executed every 60 seconds

            }
        };

        // Schedule the TimerTask to run every 60 seconds (1000 milliseconds * 60 seconds)
        timer.schedule(timerTask, 0, 1000 * 60);
    }





    final TrackerDataObserver trackerDataObserver = new TrackerDataObserver() {


        @Override
        public void onHeartRateTrackerDataChanged(HRVData hrData) {

            hr_value = String.valueOf(hrData.hr);
            hribi_value = String.valueOf(hrData.ibi);
            String timestamp = hrData.timeStamp;
            //Log.i(APP_TAG, "hr recibido: ");
            //Discard write data if both variables are 0
            if (hrData.hr!=0 || hrData.ibi!=0) {


                fileString = fileString+ timestamp+ ", " + hr_value + ", " + hribi_value  + ","+ 0 +"," + "H"+"\n";

                //Log.i(APP_TAG, "HR: "+hrData.hr+", "+ hrData.ibi);

                FileWriters(fileString,file_stress);
                fileString = "";
                //Log.i(APP_TAG, "FILE WRITTEN: ");
            }

        }

        @Override
        public void onSpO2TrackerDataChanged(int status, int spO2Value, String timestamp) {
            Log.i(APP_TAG, "--- SPO2 - status: " + status);
            if (status == previousStatus) {
                return;
            }
            Log.i(APP_TAG, "Spo2 recibido: ");
            previousStatus = status;
            switch (status) {
                case Sp02Status.CALCULATING:
                    Log.i(APP_TAG, "SPO2 - Calculating measurement");
                    break;
                case Sp02Status.DEVICE_MOVING:
                    Log.i(APP_TAG, "SPO2 Device is moving");
                    break;
                case Sp02Status.LOW_SIGNAL:
                    Log.i(APP_TAG, "SPO2 Low signal quality");
                    stop_sp02tracker();
                    break;
                case Sp02Status.MEASUREMENT_COMPLETED:
                    Log.i(APP_TAG, "*********** SPO2 Measurement completed *******************");
                    String spo2_value = String.valueOf(spO2Value);
                    Log.i(APP_TAG, "SPO2 value " + spo2_value);
                    String fileString = timestamp + ", " + 0 + ", " + 0 + ", " + spo2_value + "S" + "\n";
                    Log.i(APP_TAG, "Data to write: " + fileString);
                    FileWriters(fileString, file_spo2);
                    Log.i(APP_TAG, "Data written to file_spo2: " + file_spo2.getAbsolutePath());
                    stop_sp02tracker();
                    break;
                default:
                    Log.i(APP_TAG, "--------SPO2 TIMEOUT--------");
                    stop_sp02tracker();
                    break;
            }
        }

        public void stop_sp02tracker(){
            if (spO2Listener!=null) {
                spO2Listener.stopTracker();
            }

            Log.i(APP_TAG, "SP02 - STOP TRACKER");

        }




        @Override
        public void onError(int errorResourceId) {
            runOnUiThread(() ->
                    Toast.makeText(getApplicationContext(), getString(errorResourceId), Toast.LENGTH_LONG));
        }
    };

    private final ConnectionObsv connectionObserver = new ConnectionObsv() {
        @Override
        public void onConnectionResult(int stringResourceId) {


            if (stringResourceId != R.string.ConnectedToHs) {
                finish();
            }

            TrackerDataNotifier.getInstance().addObserver(trackerDataObserver);

            heartRateListener = new HRVListener();
            spO2Listener = new Sp02Listener();

            connectionManager.initHeartRate(heartRateListener);
            connectionManager.initSpO2(spO2Listener);

            startTimer();

            measure();


        }

        @Override
        public void onError(HealthTrackerException e) {
            if (e.getErrorCode() == HealthTrackerException.OLD_PLATFORM_VERSION || e.getErrorCode() == HealthTrackerException.PACKAGE_NOT_INSTALLED)
                runOnUiThread(() -> Toast.makeText(getApplicationContext()
                        , getString(R.string.HealthPlatformVersionIsOutdated), Toast.LENGTH_LONG).show());
            if (e.hasResolution()) {
                e.resolve(ActPrincp.this);
            } else {
                runOnUiThread(() -> Toast.makeText(getApplicationContext(), getString(R.string.ConnectionError)
                        , Toast.LENGTH_LONG).show());
                Log.e(APP_TAG, "Could not connect to Health Tracking Service: " + e.getMessage());
            }
            finish();
        }
    };



    @Override
    protected void onResume() {
        super.onResume();

        if (!isMeasurementRunning){
            isMeasurementRunning = true;

            data_counter = 0;
            startSleep();
        }

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        flag= flag+1;
        SimpleDateFormat time_now = new SimpleDateFormat("HH_mm_ss");
        String timestamp = time_now.format(new Date());
        fileString_log= fileString_log + timestamp+", "+"main"+", "+"onResume()1"+"\n";
        FileWritersLog(fileString_log, logs);
        fileString_log = "";
        Log.i(APP_TAG, "ENTERING  ON-RESUME 1");


        if (flag >=2) {
            flag= 0;
            fileString_log= fileString_log + timestamp+", "+"main"+", "+"onResume()2"+"\n";
            FileWritersLog(fileString_log, logs);
            fileString_log = "";
            Log.i(APP_TAG, "ENTERING  ON-RESUME 2");


        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        // Acquire wake lock

        SimpleDateFormat time_now = new SimpleDateFormat("HH_mm_ss");
        String timestamp = time_now.format(new Date());
        fileString_log= fileString_log + timestamp+", "+"main"+", "+"onPause()"+"\n";
        FileWritersLog(fileString_log,logs);
        fileString_log = "";
        Log.i(APP_TAG,"ENTERING  ON-PAUSE");

    }

    @Override
    protected void onStop() {
        super.onStop();

        flag2= flag2+1;
        SimpleDateFormat time_now = new SimpleDateFormat("HH_mm_ss");
        String timestamp = time_now.format(new Date());
        fileString_log= fileString_log + timestamp+", "+"main"+", "+"onStop()1"+"\n";
        FileWritersLog(fileString_log, logs);
        fileString_log = "";
        Log.i(APP_TAG, "ENTERING  STOP 1");


        if (flag2 >=2) {
            flag2= 0;
            fileString_log= fileString_log + timestamp+", "+"main"+", "+"onStop()2"+"\n";
            FileWritersLog(fileString_log, logs);
            fileString_log = "";
            Log.i(APP_TAG, "ENTERING STOP 2");


            stopTrackers();
            finish();

        }


    }

    @Override
    protected void onStart() {
        super.onStart();

        SimpleDateFormat time_now = new SimpleDateFormat("HH_mm_ss");
        String timestamp = time_now.format(new Date());
        fileString_log= fileString_log + timestamp+", "+"main"+", "+"onStart()"+"\n";
        FileWritersLog(fileString_log,logs);
        fileString_log = "";
        Log.i(APP_TAG,"ENTERING  ON-START");

    }


    @Override
    protected void onDestroy() {



        super.onDestroy();
        SimpleDateFormat time_now = new SimpleDateFormat("HH_mm_ss");
        String timestamp = time_now.format(new Date());
        fileString_log= fileString_log + timestamp+", "+"main"+", "+"onDestroy()"+"\n";
        FileWritersLog(fileString_log,logs);
        fileString_log = "";
        Log.i(APP_TAG,"ENTERING  ON-DESTROY");

        closeApplication();


    }

    void createConnectionManager() {
        try {
            connectionManager = new ConnectionManag(connectionObserver);
            connectionManager.connect(getApplicationContext());
            isMeasurementRunning = true;


        } catch (Throwable t) {
            Log.e(APP_TAG, t.getMessage());
        }
    }




    public void stopTrackers(){
        isMeasurementRunning = false;

        Log.i(APP_TAG, "Stop all trackers");

        timer.cancel(); //cancel sp02 measurement

        if (heartRateListener != null) {
            heartRateListener.stopTracker();
        }

        if (spO2Listener != null) {
            spO2Listener.stopTracker();
        }

        TrackerDataNotifier.getInstance().removeObserver(trackerDataObserver);
        if (connectionManager != null) {
            connectionManager.disconnect();
        }
    }


    public void measure() {

        heartRateListener.startTracker();
        Log.i(APP_TAG, "HR tracker ON");

        spO2Listener.startTracker();
        Log.i(APP_TAG, "SPO2 tracker ON");

    }
    static final float ALPHA = 0.25f; // if ALPHA = 1 OR 0, no filter applies.

    protected float[] lowPass( float[] input, float[] output ) {
        if ( output == null ) return input;

        for ( int i=0; i<input.length; i++ ) {
            output[i] = output[i] + ALPHA * (input[i] - output[i]);
        }
        return output;
    }

}


