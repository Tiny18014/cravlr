package com.lovable.cravlr;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.FirebaseApp;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Try to initialize Firebase - gracefully handle if google-services.json is missing
        try {
            if (FirebaseApp.getApps(this).isEmpty()) {
                FirebaseApp.initializeApp(this);
                Log.d(TAG, "Firebase initialized successfully");
            }
        } catch (Exception e) {
            Log.w(TAG, "Firebase initialization skipped - google-services.json may be missing: " + e.getMessage());
        }
        super.onCreate(savedInstanceState);
    }
}
