package com.example.riskwatchapp;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.util.Log;
import android.view.WindowManager;
import android.widget.TextView;
import android.widget.Toast;

import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.firebase.storage.FirebaseStorage;
import com.google.firebase.storage.StorageReference;
import com.google.firebase.storage.UploadTask;

import java.io.File;
import java.util.Arrays;
import java.util.Comparator;
import java.util.Objects;

public class FirebaseActivity extends AppCompatActivity {
    FirebaseStorage storage = FirebaseStorage.getInstance();
    StorageReference storageRef = storage.getReference();
    private final static String APP_TAG = "ActPrincp";
    public  int nfiles_sent = 0;
    public  int nfiles_2send = 0;
    TextView nfiles_tv;
    private static final String TAG = "FirebaseActivity";


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_firebase);
        nfiles_tv = findViewById(R.id.nfiles);
        uploadFilesToFirebase();


    }

    @Override
    protected void onResume() {
        super.onResume();

        nfiles_sent = 0;
        nfiles_2send = 0;
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        if (checkInternetConnection()){
            iterateOverFolderFiles(this);
        }
        else{
            nfiles_tv.setText("CONECTA EL RELOJ A INTERNET");
        }



    }

    private boolean checkInternetConnection(){
        ConnectivityManager connectivityManager = (ConnectivityManager) this.getSystemService(Context.CONNECTIVITY_SERVICE);

        if (connectivityManager != null) {
            Network network = connectivityManager.getActiveNetwork();
            if (network != null) {
                NetworkCapabilities capabilities = connectivityManager.getNetworkCapabilities(network);
                if (capabilities != null) {
                    return capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI);
                }
            }
        }
        return false;
    }


    private void iterateOverFolderFiles(FirebaseActivity context) {
        String path =  Objects.requireNonNull(this.getExternalFilesDir(null)).getAbsolutePath() + "/StressData/";

        File directory = new File(path);
        File[] files = directory.listFiles();
        nfiles_2send = files != null ? files.length : 0;
        nfiles_tv.setText("ENVIADOS: "+nfiles_sent + " de "+nfiles_2send);

        if (files != null) {
            for (File file : files) {
                if (file.getAbsolutePath().endsWith(".csv")) {
                    String filename = file.getName();
                    uploadFile(file,filename);

                }
            }

        }
        else {
            nfiles_tv.setText("NODA QUE ENVIAR");

        }


    }


    public void uploadFile(File file,String filename){
        StorageReference storageRef = storage.getReference();
        StorageReference sleepRef = storageRef.child("Datos_An/"+filename);
        Uri file_uri = Uri.fromFile(file);
        UploadTask uploadTask = sleepRef.putFile(file_uri);

        Log.i(APP_TAG,filename);

        uploadTask.addOnFailureListener(new OnFailureListener() {
            @Override
            public void onFailure(@NonNull Exception exception) {
                Log.i(APP_TAG, "FIREBASE SENT ERROR");
                CharSequence textW = "ERROR EN ENVIO";
                String tipo = exception.getMessage();
                int duration = Toast.LENGTH_LONG;
                Toast toast = Toast.makeText(FirebaseActivity.this /* MyActivity */, textW, duration);
                toast.show();

                Toast toast2 = Toast.makeText(FirebaseActivity.this /* MyActivity */, tipo, duration);
                toast2.show();

            }
        }).addOnSuccessListener(new OnSuccessListener<UploadTask.TaskSnapshot>() {
            @Override
            public void onSuccess(UploadTask.TaskSnapshot taskSnapshot) {
                // taskSnapshot.getMetadata() contains file metadata such as size, content-type, etc.
                String filename = taskSnapshot.getMetadata().getName();
                String path =  "/storage/emulated/0/Android/data/com.example.riskwatchapp/files/StressData/";
                File file2remove = new File(path+filename);
                file2remove.delete();

                nfiles_sent =nfiles_sent+1;
                nfiles_tv.setText("ENVIADOS: "+nfiles_sent + " de "+nfiles_2send);
                Log.i(APP_TAG, file + "-  FIREBASE SENT");


                if (nfiles_sent == nfiles_2send){
                    nfiles_tv.setText("ENVIO COMPLETADO");
                }


            }
        });

    }
    private void uploadFilesToFirebase() {
        // Obtén las referencias de los directorios
        File altitudeDir = new File(Environment.getExternalStorageDirectory() + "/Android/data/com.example.riskwatchapp/files/heightData");
        File locationDir = new File(Environment.getExternalStorageDirectory() + "/Android/data/com.example.riskwatchapp/files/locationData");

        // Encuentra el archivo más reciente en cada directorio
        File altitudeDataFile = getLatestFile(altitudeDir);
        File locationDataFile = getLatestFile(locationDir);

        // Obtén la referencia del almacenamiento de Firebase
        FirebaseStorage storage = FirebaseStorage.getInstance();
        StorageReference storageRef = storage.getReference();

        // Subir el archivo de datos de altitud
        if (altitudeDataFile != null) {
            StorageReference altitudeRef = storageRef.child("Datos_An/" + altitudeDataFile.getName());
            uploadFile(altitudeRef, altitudeDataFile);
        } else {
            Log.e(TAG, "No se encontró un archivo de altitud en: " + altitudeDir.getAbsolutePath());
        }

        // Subir el archivo de datos de ubicación
        if (locationDataFile != null) {
            StorageReference locationRef = storageRef.child("Datos_An/" + locationDataFile.getName());
            uploadFile(locationRef, locationDataFile);
        } else {
            Log.e(TAG, "No se encontró un archivo de ubicación en: " + locationDir.getAbsolutePath());
        }
    }
    private File getLatestFile(File directory) {
        if (directory.exists() && directory.isDirectory()) {
            File[] files = directory.listFiles();
            if (files != null && files.length > 0) {
                Arrays.sort(files, new Comparator<File>() {
                    @Override
                    public int compare(File o1, File o2) {
                        return Long.compare(o2.lastModified(), o1.lastModified());
                    }
                });
                return files[0]; // Devuelve el archivo más reciente
            }
        }
        return null;
    }

    private void uploadFile(StorageReference storageRef, File file) {
        UploadTask uploadTask = storageRef.putFile(Uri.fromFile(file));

        // Registra los listeners para saber el resultado de la subida
        uploadTask.addOnSuccessListener(new OnSuccessListener<UploadTask.TaskSnapshot>() {
            @Override
            public void onSuccess(UploadTask.TaskSnapshot taskSnapshot) {
                Log.d(TAG, "Archivo subido con éxito: " + file.getName());
            }
        }).addOnFailureListener(new OnFailureListener() {
            @Override
            public void onFailure(@NonNull Exception exception) {
                Log.e(TAG, "Error al subir el archivo: " + file.getName(), exception);
            }
        });
    }


}
