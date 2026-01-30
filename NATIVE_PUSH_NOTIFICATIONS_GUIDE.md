# Native Push Notifications Setup Guide (OneSignal + Capacitor)

Complete guide to implement native push notifications for iOS and Android that work like Swiggy, Uber Eats, and Zomato.

## ✅ What You Already Have

- OneSignal account and API keys (`ONESIGNAL_APP_ID`, `ONESIGNAL_API_KEY`)
- Backend edge functions sending notifications (`send-nearby-notification`)
- Device token registration (`register-device-token`)
- Geo-filtering logic for targeting users
- SMS notifications via OneSignal
- Email notifications via Resend

## 🎯 Goal: Native Push That...

- ✅ Shows on lock screen
- ✅ Works when app is closed/killed
- ✅ Vibrates and plays sounds
- ✅ Opens specific screens when tapped
- ✅ Shows badge count on app icon
- ✅ Works for iOS AND Android

---

## 📱 STEP 1: Install OneSignal Capacitor Plugin

```bash
# In your project root after git pull
npm install onesignal-cordova-plugin
npx cap sync
```

**Note:** The `onesignal-cordova-plugin` works with Capacitor.

---

## 🤖 STEP 2: Android Setup

### 2.1 Add Firebase to Your Android App

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing
3. Add an Android app with package name: `com.lovable.cravlr`
4. Download `google-services.json`
5. Place it in `android/app/google-services.json`

### 2.2 Update Android Gradle Files

**android/build.gradle** (project level):
```gradle
buildscript {
    dependencies {
        // Add this line
        classpath 'com.google.gms:google-services:4.4.4'
    }
}
```

**android/app/build.gradle** (app level):
```gradle
// At bottom of file
apply plugin: 'com.google.gms.google-services'

// Add OneSignal configuration
android {
    defaultConfig {
        // Add this
        manifestPlaceholders = [
            onesignal_app_id: 'YOUR_ONESIGNAL_APP_ID',
            onesignal_google_project_number: 'REMOTE'
        ]
    }
}
```

### 2.3 Configure OneSignal in Android Dashboard

1. Go to [OneSignal Dashboard](https://onesignal.com)
2. Select your app → Settings → Platforms
3. Click "Google Android (FCM)"
4. In Firebase Console → Project Settings → Cloud Messaging
5. Copy "Server key" (or create a new one)
6. Paste into OneSignal

### 2.4 Add Notification Icons (Android)

Create notification icons in:
```
android/app/src/main/res/drawable-hdpi/ic_stat_onesignal_default.png (36x36)
android/app/src/main/res/drawable-mdpi/ic_stat_onesignal_default.png (24x24)
android/app/src/main/res/drawable-xhdpi/ic_stat_onesignal_default.png (48x48)
android/app/src/main/res/drawable-xxhdpi/ic_stat_onesignal_default.png (72x72)
android/app/src/main/res/drawable-xxxhdpi/ic_stat_onesignal_default.png (96x96)
```

---

## 🍎 STEP 3: iOS Setup

### 3.1 Apple Developer Requirements

1. Apple Developer Account ($99/year)
2. Physical iOS device for testing (push doesn't work on simulator)

### 3.2 Create Push Notification Certificate

**Option A: p8 Key (Recommended)**

1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Certificates, Identifiers & Profiles → Keys
3. Create a new key with "Apple Push Notifications service (APNs)"
4. Download the `.p8` file
5. Note the Key ID and Team ID

**Option B: p12 Certificate**

1. Create APNs certificate in Apple Developer Portal
2. Export as `.p12` from Keychain Access

### 3.3 Configure OneSignal for iOS

1. OneSignal Dashboard → Settings → Platforms → Apple iOS
2. Upload your `.p8` key (or `.p12` certificate)
3. Enter Key ID and Team ID
4. Select Bundle ID: `com.lovable.cravlr`

### 3.4 Enable Push Capability in Xcode

1. Open `ios/App/App.xcworkspace` in Xcode
2. Select your target → Signing & Capabilities
3. Click "+ Capability" → Add "Push Notifications"
4. Add "Background Modes" → Check "Remote notifications"

### 3.5 Update Info.plist

Add to `ios/App/App/Info.plist`:
```xml
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>
```

---

## 💻 STEP 4: App Code Integration

### 4.1 Create Native Push Service

The app uses `src/services/NativePushNotificationService.ts` which:
- Detects if running in Capacitor (native) or web
- Initializes OneSignal appropriately
- Handles permission requests
- Registers device tokens with backend
- Handles notification tap → deep linking

### 4.2 Update App.tsx or Main Entry

```typescript
import { NativePushNotificationService } from '@/services/NativePushNotificationService';

// In your app initialization:
useEffect(() => {
  NativePushNotificationService.initialize();
}, []);
```

### 4.3 Request Permission (after user logs in)

```typescript
import { NativePushNotificationService } from '@/services/NativePushNotificationService';

const handleEnableNotifications = async () => {
  const granted = await NativePushNotificationService.requestPermission();
  if (granted) {
    console.log('Push notifications enabled!');
  }
};
```

---

## 🔗 STEP 5: Deep Linking Setup

Notifications should open specific screens when tapped.

### Notification Types & Routes

| Type | Route | Example |
|------|-------|---------|
| `NEW_REQUEST_NEARBY` | `/recommend/:requestId` | New food request |
| `VISIT_REMINDER` | `/feedback/:recommendationId` | Remind to rate |
| `LEVEL_UP` | `/profile` | Level up notification |
| `RECOMMENDATION_RECEIVED` | `/request-results/:requestId` | New recommendation |

### Backend Sends Deep Link Data

```typescript
// In send-nearby-notification edge function
const notificationPayload = {
  data: {
    type: 'NEW_REQUEST_NEARBY',
    requestId: request.id,
    deepLink: `/recommend/${request.id}`,
  },
};
```

### App Handles Deep Link

```typescript
// NativePushNotificationService.ts
static handleNotificationOpened(notification: any) {
  const data = notification.additionalData || notification.data;
  
  switch (data?.type) {
    case 'NEW_REQUEST_NEARBY':
      window.location.href = `/recommend/${data.requestId}`;
      break;
    case 'VISIT_REMINDER':
      window.location.href = `/feedback/${data.recommendationId}`;
      break;
    // etc.
  }
}
```

---

## 🛠️ STEP 6: Build & Test

### Build for Android

```bash
# 1. Build the web app
npm run build

# 2. Sync to native projects
npx cap sync android

# 3. Open in Android Studio
npx cap open android

# 4. Connect a physical device and run
```

### Build for iOS

```bash
# 1. Build the web app
npm run build

# 2. Sync to native projects
npx cap sync ios

# 3. Open in Xcode
npx cap open ios

# 4. Set signing team, connect device, and run
```

### Test Notifications

1. Log in to the app on your device
2. Create a food request from another device/browser
3. Verify notification appears on lock screen
4. Tap notification → should open the app to specific screen
5. Check badge count updates

---

## 📋 STEP 7: OneSignal Dashboard Settings

### Notification Appearance

1. OneSignal → Settings → Messaging
2. Set default notification icon
3. Configure notification sounds
4. Enable badge counts

### Segments (Optional)

Create segments for targeted notifications:
- "Active Users" - Users who opened app in last 7 days
- "Location: NYC" - Users in New York
- "Recommenders" - Users with recommender role

---

## 🐛 Troubleshooting

### Android Issues

**"No Google Play Services"**
- Ensure device has Google Play Services installed
- Add `google-services.json` to `android/app/`

**Notifications not appearing**
- Check FCM server key in OneSignal dashboard
- Verify `com.google.gms.google-services` plugin applied
- Check logcat for errors: `adb logcat | grep OneSignal`

### iOS Issues

**"Failed to register for remote notifications"**
- Ensure Push Notifications capability is added in Xcode
- Verify APNs certificate/key in OneSignal dashboard
- Test on physical device (not simulator)

**Notifications work but no sound**
- Check device is not in silent mode
- Verify notification permission includes sounds

### General Issues

**Device token not registered**
- Check `register-device-token` edge function logs
- Verify user is authenticated before registering

**Deep links not working**
- Check `capacitor.config.ts` has correct app links
- Verify notification data includes `type` and route params

---

## 📊 Monitoring

### OneSignal Dashboard

- Delivery → See sent notifications and delivery rates
- Users → See subscribed devices
- Analytics → Notification open rates

### Supabase Logs

Check edge function logs:
```sql
-- Check device tokens
SELECT * FROM device_tokens ORDER BY created_at DESC LIMIT 10;

-- Check notification logs
SELECT * FROM recommender_notifications ORDER BY created_at DESC LIMIT 10;
```

---

## 🚀 Production Checklist

- [ ] Firebase project created (Android)
- [ ] `google-services.json` in `android/app/`
- [ ] APNs key/certificate uploaded to OneSignal (iOS)
- [ ] Push capability enabled in Xcode (iOS)
- [ ] Notification icons created (Android)
- [ ] `NativePushNotificationService.ts` integrated
- [ ] Deep linking tested for all notification types
- [ ] Permission flow tested (first-time users)
- [ ] Badge count working
- [ ] Sound and vibration working
- [ ] Background/killed app notifications working

---

## 📚 Resources

- [OneSignal React Native SDK](https://documentation.onesignal.com/docs/react-native-sdk-setup)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notification Service](https://developer.apple.com/documentation/usernotifications)
