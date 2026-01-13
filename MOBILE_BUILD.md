# Cravlr Mobile App Build Guide

This guide explains how to build the Cravlr app for Android and iOS using Capacitor.

## Prerequisites

### For Android Development
- [Android Studio](https://developer.android.com/studio) installed
- Android SDK installed (via Android Studio)
- Java 17+ installed
- ADB (Android Debug Bridge) for testing on physical devices

### For iOS Development
- macOS with [Xcode](https://developer.apple.com/xcode/) installed
- Xcode Command Line Tools: `xcode-select --install`
- CocoaPods: `sudo gem install cocoapods`
- Apple Developer Account (for device testing and App Store distribution)

## Initial Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd cravlr

# Install npm dependencies
npm install
```

### 2. Add Native Platforms

```bash
# Add Android platform
npx cap add android

# Add iOS platform (macOS only)
npx cap add ios
```

### 3. Build and Sync

```bash
# Build the web app
npm run build

# Sync web assets to native platforms
npx cap sync
```

## Development Workflow

### Hot Reload (Development Mode)

For development with hot reload, uncomment the `url` line in `capacitor.config.ts`:

```typescript
server: {
  // Uncomment for hot-reload during development
  url: 'https://cb92860e-6c58-406c-a5fe-a11539c7bcb3.lovableproject.com?forceHideBadge=true',
}
```

Then run:
```bash
npx cap run android  # For Android
npx cap run ios      # For iOS
```

### Production Build

For production builds, keep the `url` line commented out:

```bash
npm run build
npx cap sync
```

## Android Specific Setup

### Opening in Android Studio

```bash
npx cap open android
```

### Getting SHA-256 Fingerprint (for App Links)

The SHA-256 fingerprint is required for the `assetlinks.json` file to verify your app for deep linking.

#### Debug Fingerprint
```bash
# Navigate to Android project
cd android

# Get debug keystore fingerprint
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

#### Release Fingerprint
```bash
# Get release keystore fingerprint (replace with your keystore path)
keytool -list -v -keystore /path/to/your/release.keystore -alias your-alias
```

Copy the SHA-256 fingerprint and update `public/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.lovable.cravlr",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT_HERE"]
  }
}]
```

### Building Release APK

1. Open project in Android Studio: `npx cap open android`
2. Go to `Build` → `Generate Signed Bundle / APK`
3. Select `APK` and click `Next`
4. Create or select your keystore
5. Select `release` build variant
6. Click `Finish`

The APK will be in `android/app/build/outputs/apk/release/`

### Building Release AAB (for Play Store)

1. Open project in Android Studio
2. Go to `Build` → `Generate Signed Bundle / APK`
3. Select `Android App Bundle`
4. Follow the signing wizard
5. Upload to Google Play Console

## iOS Specific Setup

### Opening in Xcode

```bash
npx cap open ios
```

### Configuring Associated Domains

1. Open `ios/App/App.xcworkspace` in Xcode
2. Select the `App` target
3. Go to `Signing & Capabilities`
4. Click `+ Capability` and add `Associated Domains`
5. Add: `applinks:cravlr.lovable.app`

### Configuring App Group (for Push Notifications)

1. In Xcode, go to `Signing & Capabilities`
2. Add `App Groups` capability
3. Create a group: `group.com.lovable.cravlr`

### Building for TestFlight / App Store

1. Open project in Xcode: `npx cap open ios`
2. Select `Any iOS Device` as the build target
3. Go to `Product` → `Archive`
4. Once archived, click `Distribute App`
5. Follow the App Store Connect workflow

## Deep Linking Configuration

### Verifying Deep Links Work

#### Android
```bash
# Test a deep link via ADB
adb shell am start -W -a android.intent.action.VIEW -d "https://cravlr.lovable.app/dashboard" com.lovable.cravlr
```

#### iOS
```bash
# Test via Safari on simulator
# Open Safari and navigate to: https://cravlr.lovable.app/dashboard
```

### Supported Deep Link Patterns

| Pattern | Description |
|---------|-------------|
| `/dashboard` | User dashboard |
| `/browse-requests` | Browse food requests |
| `/requests/{id}/results` | View request results |
| `/recommend/{id}` | Send recommendation |
| `/feedback/{id}` | Submit feedback |

## Version Management

### Updating App Version

#### Android (`android/app/build.gradle`)
```gradle
android {
    defaultConfig {
        versionCode 2  // Increment for each release
        versionName "1.1.0"
    }
}
```

#### iOS
1. Open Xcode
2. Select the `App` target
3. Go to `General` tab
4. Update `Version` and `Build` numbers

## Troubleshooting

### Common Issues

#### "Could not find com.android.tools.build:gradle"
```bash
# Update Gradle wrapper
cd android
./gradlew wrapper --gradle-version 8.0
```

#### iOS build fails with CocoaPods error
```bash
cd ios/App
pod install --repo-update
```

#### Deep links not working on Android
1. Verify `assetlinks.json` is accessible: `https://cravlr.lovable.app/.well-known/assetlinks.json`
2. Check SHA-256 fingerprint matches your signing key
3. Clear app defaults: Settings → Apps → Cravlr → Open by default → Clear defaults

#### Deep links not working on iOS
1. Verify `apple-app-site-association` is accessible: `https://cravlr.lovable.app/.well-known/apple-app-site-association`
2. Check Team ID and Bundle ID in the file match your app
3. Ensure Associated Domains capability is enabled in Xcode

### Debug Logging

The app includes comprehensive logging for debugging. Open the device console to see logs:

- **Android**: Use `adb logcat | grep -E '\[Capacitor|\[Deep Linking'`
- **iOS**: Use Xcode's Console or Console.app

## Push Notifications Setup

### OneSignal Configuration

The app uses OneSignal for push notifications. Ensure you have:

1. Created a OneSignal app
2. Added Android (Firebase) and iOS credentials to OneSignal
3. Set the `ONESIGNAL_APP_ID` in your environment

### Android Firebase Setup

1. Create a Firebase project
2. Download `google-services.json`
3. Place it in `android/app/`

### iOS APNs Setup

1. Create an APNs key in Apple Developer Portal
2. Upload to OneSignal
3. Configure in Xcode under Push Notifications capability

## Support

For issues related to:
- **Capacitor**: [Capacitor Docs](https://capacitorjs.com/docs)
- **OneSignal**: [OneSignal Docs](https://documentation.onesignal.com/)
- **Deep Linking**: [Universal Links Guide](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app)
