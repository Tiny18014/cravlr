# Supabase Secrets for Notifications

To enable notifications, you need to add the following secrets to your Supabase project.

## How to Add Secrets

1.  Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2.  Navigate to **Edge Functions** (or Settings > API).
3.  Find the **Secrets** section.
4.  Add the following secrets:

| Secret Name | Description | Example Value |
| :--- | :--- | :--- |
| `ONESIGNAL_APP_ID` | Your OneSignal App ID | `e.g. 12345678-abcd-efgh-ijkl-1234567890ab` |
| `ONESIGNAL_API_KEY` | Your OneSignal REST API Key | `e.g. NDE0...` |
| `RESEND_API_KEY` | Your Resend API Key (for emails) | `re_...` |

## OneSignal Integration

The application uses OneSignal for Push Notifications.
- **Frontend**: Initializes OneSignal and asks for permission. Stores the player ID in the `device_tokens` table.
- **Backend**:
    - `send-nearby-notification`: Sends push notifications to recommenders when a new request is nearby.
    - `email-recommendation-received`: Sends email notifications to the requester when they receive a recommendation.
