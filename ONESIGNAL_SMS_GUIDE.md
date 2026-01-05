# OneSignal SMS Setup Guide

To enable SMS notifications in addition to Push Notifications, follow these steps:

## 1. Configure Twilio (Prerequisite)

You need a Twilio account with an active phone number to send SMS.

1.  Sign up for [Twilio](https://www.twilio.com/).
2.  Get a Phone Number.
3.  Note your `Account SID`, `Auth Token`, and the `Phone Number`.

## 2. Configure OneSignal SMS Platform

1.  Log in to your [OneSignal Dashboard](https://onesignal.com).
2.  Go to **Settings** -> **Platforms**.
3.  Find **SMS** and click **Activate**.
4.  Select **Twilio** as the provider.
5.  Enter your Twilio `Account SID`, `Auth Token`, and `From Phone Number`.
6.  Click **Save**.

## 3. Verify Code Integration

The code has already been updated to support SMS:

*   **Frontend (`OneSignalInit.tsx`):** Automatically syncs the user's phone number from their profile to OneSignal when they log in.
*   **Backend (`notify-area-users` & `send-recommendation-email`):** Automatically targets *all* active channels for the user (Push and SMS).

## 4. Testing SMS

1.  Log in to the app with a user that has a valid phone number in their profile.
2.  (Optional) Verify in OneSignal Dashboard -> **Audience** that the user record now shows an SMS number.
3.  Trigger a notification (e.g., create a request nearby as another user).
4.  The target user should receive both a Web Push and an SMS.

*Note: SMS costs money via Twilio. Ensure your trial credit or billing is active.*
