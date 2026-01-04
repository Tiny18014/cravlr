# OneSignal Setup Guide

This guide explains how to set up OneSignal for push notifications in this project.

## 1. Create a OneSignal Account

1.  Go to [onesignal.com](https://onesignal.com) and sign up for a free account.
2.  Create a new **App/Website**.
3.  Name your app (e.g., "Lovable Food App").
4.  Select **Web** as the platform.

## 2. Configure Web Push

1.  In the Web Configuration setup:
    *   **Site Name:** Enter your app's name.
    *   **Site URL:** Enter your Lovable preview URL (e.g., `https://your-project-id.lovable.app`) or your custom domain.
    *   **Auto Resubscribe:** Enable this if you want users to be re-subscribed automatically if they clear cookies but revisit.
    *   **Default Icon:** Upload a square icon (at least 192x192) for your notifications.

2.  **Advanced Push Settings (Optional but Recommended):**
    *   You don't need to enable Safari Certificate unless you want to support macOS Safari < 16. (Modern Safari uses standard Web Push).

3.  Click **Save**.

4.  On the next screen ("Download OneSignal SDK"), verify the settings but **do not** download the files. We are using the CDN hosted SDK.
5.  Click **Finish**.

## 3. Get Your API Keys

1.  Go to **Settings** -> **Keys & IDs**.
2.  Copy your **OneSignal App ID** (It looks like a UUID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).
3.  Copy your **Rest API Key**.

## 4. Configure Supabase Secrets

You need to add these keys to your Supabase Edge Functions secrets.

1.  Go to your Supabase Dashboard.
2.  Navigate to **Edge Functions** (or Settings -> Environment Variables if deploying globally).
3.  Add the following secrets:

    *   `ONESIGNAL_APP_ID`: Your **App ID** (UUID format).
    *   `ONESIGNAL_API_KEY`: Your **Rest API Key**.
    *   `ONE_SIGNAL_APP_ID`: (Optional) Add this with the same value as `ONESIGNAL_APP_ID` just in case some legacy code uses the underscored version.
    *   `ONE_SIGNAL_API_KEY`: (Optional) Add this with the same value as `ONESIGNAL_API_KEY`.

## 5. Deployment

Once the secrets are set, redeploy your Edge Functions (specifically `notify-area-users` and `send-recommendation-email`).

## Troubleshooting

*   **"AppID doesn't match existing apps"**: This error usually means the `ONESIGNAL_APP_ID` in your Supabase secrets is incorrect or formatted wrongly. Ensure it is the **App ID** (UUID) and not the API Key.
*   **Notifications not arriving**: Check the Logs in OneSignal Dashboard -> Delivery. Also check Supabase Edge Function logs for `notify-area-users`.
