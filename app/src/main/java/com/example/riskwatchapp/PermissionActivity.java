package com.example.riskwatchapp;

/*
 * Copyright (C) 2021 Samsung Electronics Co., Ltd. All rights reserved.
 *
 * Mobile Communication Division,
 * IT & Mobile Communications, Samsung Electronics Co., Ltd.
 *
 * This software and its documentation are confidential and proprietary
 * information of Samsung Electronics Co., Ltd.  No part of the software and
 * documents may be copied, reproduced, transmitted, translated, or reduced to
 * any electronic medium or machine-readable form without the prior written
 * consent of Samsung Electronics.
 *
 * Samsung Electronics makes no representations with respect to the contents,
 * and assumes no responsibility for any errors that might appear in the
 * software and documents. This publication and the contents hereof are subject
 * to change without notice.
 */



import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.fragment.app.FragmentActivity;

import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;

public class PermissionActivity extends FragmentActivity {
    private ArrayList<String> mPermissions;
    private static final String TAG = PermissionActivity.class.getSimpleName();
    private static final String PERMISSION_KEY = "permissions";
    private static final int PERMISSION_REQ_TAG = 1;

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        finish();
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (savedInstanceState != null) {
            mPermissions = savedInstanceState.getStringArrayList(PERMISSION_KEY);
        } else {
            mPermissions = new ArrayList<>(Arrays.asList(getIntent().getStringArrayExtra(PERMISSION_KEY)));
        }
        Log.i(TAG, "onCreate()");
        requestPermission();
    }

    public void requestPermission() {
        Iterator<String> it = mPermissions.iterator();
        while (it.hasNext()){
            if (ActivityCompat.checkSelfPermission(this,
                    it.next()) == PackageManager.PERMISSION_GRANTED) {
                it.remove();
            }
        }

        if (mPermissions.isEmpty()) { // all allowed
            setResult(RESULT_OK);
            Log.i(TAG, "finished");
            finish();
        } else {
            String[] permissions = new String[mPermissions.size()];
            permissions = mPermissions.toArray(permissions);
            ActivityCompat.requestPermissions(this, permissions, PERMISSION_REQ_TAG);
            Log.i(TAG, "requestPermissions");
        }
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        outState.putStringArrayList(PERMISSION_KEY, mPermissions);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        Log.i(TAG, "onRequestPermissionsResult() requestCode = " + "requestCode");
        if (requestCode == PERMISSION_REQ_TAG) {
            if (permissions.length == 0) {
                Log.i(TAG, "onRequestPermissionsResult : permission is 0");
                return;
            }
            for (int p : grantResults) {
                if (p == PackageManager.PERMISSION_DENIED) {
                    Log.i(TAG, "onRequestPermissionsResult : permission denied");
                    finish();
                    return;
                }
            }
            setResult(RESULT_OK);
            finish();
        }
    }

    public static boolean checkPermission(@Nullable Context context,@NonNull String[] permissions) {
        for(String permission:permissions) {
            if (context == null || ActivityCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_DENIED) {
                Log.i(TAG, "checkPermission : PERMISSION_DENIED : " + "permission");
                return false;
            } else {
                Log.i(TAG, "checkPermission : PERMISSION_GRANTED : " + "permission");
            }
        }
        return true;
    }

    public static void showPermissionPrompt(@NotNull Activity callingActivity, int requestCode, @NotNull String[] permissions) {
        Intent intent = new Intent(callingActivity, PermissionActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.addFlags(Intent.FLAG_ACTIVITY_NO_ANIMATION);
        intent.putExtra(PERMISSION_KEY, permissions);
        callingActivity.startActivityForResult(intent, requestCode);
    }

}
