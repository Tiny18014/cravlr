package com.lovable.cravlr;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.FirebaseApp;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Initialize Firebase before super.onCreate() to ensure it's ready for push notification plugins
        FirebaseApp.initializeApp(this);
        super.onCreate(savedInstanceState);
    }
}
