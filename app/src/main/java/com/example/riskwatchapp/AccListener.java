package com.example.riskwatchapp;

import android.util.Log;

import androidx.annotation.NonNull;

import com.samsung.android.service.health.tracking.HealthTracker;
import com.samsung.android.service.health.tracking.data.DataPoint;
import com.samsung.android.service.health.tracking.data.ValueKey;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class AccListener extends BaseListener {
    private final static String TAG = "MainActivity";

    AccListener() {
        final HealthTracker.TrackerEventListener trackerEventListener = new HealthTracker.TrackerEventListener() {
            @Override
            public void onDataReceived(@NonNull List<DataPoint> list) {
                //devuelve 300 datos or 13 segundos - 25 datos por segundo - downsample a  5 datos/segundo
                int vx = 0;
                int vy = 0;
                int vz = 0;

                int step = 5;
                int originalSize = list.size(); //300
                int targetSize = Math.round(originalSize / step); //300/5=60 datos cada 12 segundos
                // nos quedan 5 datos por segundo o 300 datos por minuto
                List<AccData> accList = new ArrayList<>(targetSize);

                if (list.size() != 0) {

        /*            for(DataPoint dataPoint : list) {
                        vx = dataPoint.getValue(ValueKey.AccelerometerSet.ACCELEROMETER_X);
                        Log.i(TAG, "value vx: "+vx);
                      vy = dataPoint.getValue(ValueKey.AccelerometerSet.ACCELEROMETER_Y);
                        vz = dataPoint.getValue(ValueKey.AccelerometerSet.ACCELEROMETER_Z);
                    }*/

                    SimpleDateFormat time_now = new SimpleDateFormat("HH_mm_ss");
                    String timestamp = time_now.format(new Date());

                    for (int i = 0; i < list.size(); i += step) { //devuelve 60 datos de 12 segundos
                        DataPoint dataPoint  = list.get(i);
                        vx = dataPoint.getValue(ValueKey.AccelerometerSet.ACCELEROMETER_X);
                        vy = dataPoint.getValue(ValueKey.AccelerometerSet.ACCELEROMETER_Y);
                        vz = dataPoint.getValue(ValueKey.AccelerometerSet.ACCELEROMETER_Z);

                        // Log.i(TAG, "value i: "+i);
                        // Log.i(TAG, "value vx: "+vx);

                        AccData accData = new AccData(0,vx,vy,vz,timestamp);
                        accList.add(accData);


                    }
                    readValuesFromDataPoint(accList);

                }


                else {
                    Log.i(TAG, "onDataReceived List is zero");
                }

/*                if (list.size() != 0) {
                    //El tamaño de la lista son 300 valores.
                    int sumX = 0;
                        int sumY = 0;
                        int sumZ = 0;
                        for(DataPoint dataPoint : list) {
                            sumX += dataPoint.getValue(ValueKey.AccelerometerSet.ACCELEROMETER_X);
                            sumY += dataPoint.getValue(ValueKey.AccelerometerSet.ACCELEROMETER_Y);
                            sumZ += dataPoint.getValue(ValueKey.AccelerometerSet.ACCELEROMETER_Z);
                        }
                         avgAccX = sumX/list.size();
                         avgAccY = sumY/list.size();
                         avgAccZ = sumZ/list.size();

                    } else {
                        Log.i(TAG, "onDataReceived List is zero");
                    }*/

            }

            @Override
            public void onFlushCompleted() {
                Log.i(TAG, " onFlushCompleted called");
            }

            @Override
            public void onError(HealthTracker.TrackerError trackerError) {
                Log.e(TAG, " onError called: " + trackerError);
                setHandlerRunning(false);
                if (trackerError == HealthTracker.TrackerError.PERMISSION_ERROR) {
                    TrackerDataNotifier.getInstance().notifyError(R.string.NoPermission);
                }
                if (trackerError == HealthTracker.TrackerError.SDK_POLICY_ERROR) {
                    TrackerDataNotifier.getInstance().notifyError(R.string.SdkPolicyError);
                }
            }
        };
        setTrackerEventListener(trackerEventListener);
    }

    public void readValuesFromDataPoint( List<AccData> accList) {
        TrackerDataNotifier.getInstance().notifyAccTrackerObservers(accList);

    }

    public static List<Double> downsample_avg(List<Double> original, int targetSize) {
        List<Double> downsampled = new ArrayList<>(targetSize);

        int originalSize = original.size();
        int step = originalSize / targetSize;

        for (int i = 0; i < targetSize; i++) {
            int start = i * step;
            int end = Math.min(start + step, originalSize);

            double sum = 0;
            for (int j = start; j < end; j++) {
                sum += original.get(j);
            }

            double average = sum / (end - start);
            downsampled.add(average);
        }

        return downsampled;
    }



    public static List<Double> downsample(List<Double> original, int targetSize) {
        List<Double> downsampled = new ArrayList<>(targetSize);

        int originalSize = original.size();
        int step = originalSize / targetSize;
        int offset = step / 2; // Offset for rounding to the nearest value

        for (int i = 0; i < targetSize; i++) {
            int index = i * step + offset;
            downsampled.add(original.get(index));
        }

        return downsampled;
    }


}
