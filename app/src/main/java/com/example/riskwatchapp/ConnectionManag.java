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
        }

        /**
         *
         */
        @Override
        public void onConnectionEnded() {

        }

        @Override
        public void onConnectionFailed(HealthTrackerException e) {

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


    private void setHandlerForBaseListener(BaseListener baseListener) {
        baseListener.setHandler(new Handler(Looper.getMainLooper()));
    }

    private boolean isHeartRateAvailable(@NonNull HealthTrackingService healthTrackingService) {
        final List<HealthTrackerType> availableTrackers = healthTrackingService.getTrackingCapability().getSupportHealthTrackerTypes();
        return availableTrackers.contains(HealthTrackerType.HEART_RATE);
    }

}