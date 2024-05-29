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


import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;

import com.samsung.android.service.health.tracking.ConnectionListener;
import com.samsung.android.service.health.tracking.HealthTracker;
import com.samsung.android.service.health.tracking.HealthTrackerException;
import com.samsung.android.service.health.tracking.HealthTrackingService;
import com.samsung.android.service.health.tracking.data.HealthTrackerType;

import java.util.List;

public class ConnectionManag {
    private final static String TAG = "Connection Manager";
    private final ConnectionObsv connectionObserver;
    private HealthTrackingService healthTrackingService = null;
    private final ConnectionListener connectionListener = new ConnectionListener() {
        @Override
        public void onConnectionSuccess() {
            Log.i(TAG, "Connected");
            connectionObserver.onConnectionResult(R.string.ConnectedToHs);

            if (!isHeartRateAvailable(healthTrackingService)) {
                Log.i(TAG, "Device does not support Heart Rate tracking");
                connectionObserver.onConnectionResult(R.string.NoHrSupport);
            }
            if (!isAccAvailable(healthTrackingService)) {
                Log.i(TAG, "Device does not support Accelerometer tracking");
                connectionObserver.onConnectionResult(1); //"Acc not supported"
            }
        }

        @Override
        public void onConnectionEnded() {
            Log.i(TAG, "Disconnected");
        }

        @Override
        public void onConnectionFailed(HealthTrackerException e) {
            connectionObserver.onError(e);
        }
    };

    ConnectionManag(ConnectionObsv observer) {
        connectionObserver = observer;
    }

    public void connect(Context context) {
        healthTrackingService = new HealthTrackingService(connectionListener, context);
        healthTrackingService.connectService();
    }

    public void disconnect() {
        if (healthTrackingService != null)
            healthTrackingService.disconnectService();
    }


    public void initHeartRate(HRVListener heartRateListener) {
        final HealthTracker healthTracker;
        healthTracker = healthTrackingService.getHealthTracker(HealthTrackerType.HEART_RATE);
        heartRateListener.setHealthTracker(healthTracker);
        setHandlerForBaseListener(heartRateListener);
    }

    public void initAcc(AccListener accListener) {
        final HealthTracker healthTracker;
        healthTracker = healthTrackingService.getHealthTracker(HealthTrackerType.ACCELEROMETER);
        accListener.setHealthTracker(healthTracker);
        setHandlerForBaseListener(accListener);
    }


    private void setHandlerForBaseListener(BaseListener baseListener) {
        baseListener.setHandler(new Handler(Looper.getMainLooper()));
    }

    private boolean isHeartRateAvailable(@NonNull HealthTrackingService healthTrackingService) {
        final List<HealthTrackerType> availableTrackers = healthTrackingService.getTrackingCapability().getSupportHealthTrackerTypes();
        return availableTrackers.contains(HealthTrackerType.HEART_RATE);
    }

    private boolean isAccAvailable(@NonNull HealthTrackingService healthTrackingService) {
        final List<HealthTrackerType> availableTrackers = healthTrackingService.getTrackingCapability().getSupportHealthTrackerTypes();
        return availableTrackers.contains(HealthTrackerType.ACCELEROMETER);


    }
}