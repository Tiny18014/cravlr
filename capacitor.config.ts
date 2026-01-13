import { CapacitorConfig } from '@capacitor/cli';

console.log('[Capacitor Config] Loading configuration...');

const config: CapacitorConfig = {
  appId: 'com.lovable.cravlr',
  appName: 'Cravlr',
  webDir: 'dist',
  server: {
    // Use HTTPS scheme for Android (required for Android 9+)
    androidScheme: 'https',
    // Set the hostname for web view
    hostname: 'cravlr.lovable.app',
    // Allow cleartext traffic for development
    cleartext: true,
    // For development: connect to Lovable preview
    // Uncomment the line below for hot-reload during development
    // url: 'https://cb92860e-6c58-406c-a5fe-a11539c7bcb3.lovableproject.com?forceHideBadge=true',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    App: {
      // Enable deep linking
      // Deep links will be handled via appUrlOpen event
    }
  },
  // Android-specific configuration
  android: {
    // Allow mixed content (HTTP and HTTPS)
    allowMixedContent: true,
    // Capture all links matching our domain
    appendUrlPathQueryString: true
  },
  // iOS-specific configuration
  ios: {
    // Content inset adjustment behavior
    contentInset: 'automatic',
    // Allow inline media playback
    allowsInlineMediaPlayback: true
  }
};

console.log('[Capacitor Config] Configuration loaded:', {
  appId: config.appId,
  appName: config.appName,
  webDir: config.webDir
});

export default config;
