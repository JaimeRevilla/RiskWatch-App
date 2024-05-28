package com.example.riskwatchapp;

public class AccData {

    int status = AccStatus.ACC_STATUS_NONE;
    int sumX = 0;
    int sumY = 0;
    int sumZ = 0;
    String timeStamp = "";

    AccData(){

    }
    AccData(int status, int sumX, int sumY, int sumZ, String timeStamp) {
        this.status = status;
        this.sumX = sumX;
        this.sumY = sumY;
        this.sumZ = sumZ;
        this.timeStamp = timeStamp;
    }
}
