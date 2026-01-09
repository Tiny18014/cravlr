# OneSignal SMS Setup Guide

SMS notifications work alongside email notifications. When emails are sent, SMS is also sent if the user has a phone number.

## 1. Configure Twilio (Prerequisite)

You need a Twilio account with an active phone number to send SMS.

1. Sign up for [Twilio](https://www.twilio.com/).
2. Get a Phone Number (for trial, you can only send to verified numbers).
3. Note your `Account SID`, `Auth Token`, and the `Phone Number`.

## 2. Configure OneSignal SMS Platform

1. Log in to your [OneSignal Dashboard](https://onesignal.com).
2. Go to **Settings** → **Platforms**.
3. Find **SMS** and click **Activate**.
4. Select **Twilio** as the provider.
5. Enter your Twilio `Account SID`, `Auth Token`, and `From Phone Number`.
6. Click **Save**.

## 3. How It Works

The system is already integrated:

- **Signup**: Phone number is collected during signup (optional for regular users, required for business).
- **Profile Storage**: Phone number is saved to the `profiles` table.
- **OneSignal Sync**: When users log in, their phone number is automatically synced to OneSignal.
- **Notifications**: When emails are sent (e.g., new recommendation), SMS is also sent via OneSignal if:
  - User has a phone number in their profile
  - User has SMS notifications enabled (default: true)
  - OneSignal SMS is configured with Twilio

## 4. Testing SMS (Twilio Trial)

**Important**: On Twilio trial, you can only send SMS to verified phone numbers.

1. Go to Twilio Console → **Verified Caller IDs**
2. Add your personal phone number and verify it
3. Sign up with that verified number in the app
4. Trigger a notification (e.g., have another user recommend something for your request)
5. You should receive both email and SMS

## 5. SMS Preferences

Users can control SMS notifications in their profile settings:
- `sms_notifications_enabled`: Global SMS toggle
- `sms_new_requests`: SMS for new nearby requests
- `sms_recommendations`: SMS when receiving recommendations
- `sms_visit_reminders`: SMS for visit reminders

## 6. Logs

Check edge function logs for SMS status:
- `📱 SMS sent successfully via OneSignal` - Success
- `📱 SMS send error` - Check OneSignal/Twilio configuration
- `📱 SMS skipped: No phone number` - User hasn't added phone

*Note: SMS costs money via Twilio. Trial has limited credits and can only send to verified numbers.*
