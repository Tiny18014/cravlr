# Supabase Secrets for SMS Integration

To enable SMS/WhatsApp notifications via Twilio, you need to add the following secrets to your Supabase project.

## How to Add Secrets

1.  Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2.  Navigate to **Edge Functions** (or Settings > API).
3.  Find the **Secrets** section.
4.  Add the following secrets with your Twilio credentials:

| Secret Name | Description | Example Value |
| :--- | :--- | :--- |
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token | `your_auth_token_here` |
| `TWILIO_PHONE_NUMBER` | The Twilio phone number to send SMS from | `+15551234567` |

> **Note:** If you want to use WhatsApp, ensure your `TWILIO_PHONE_NUMBER` is a WhatsApp-enabled number or use a specific `TWILIO_WHATSAPP_NUMBER` if you customize the code further. Currently, the code defaults to sending standard SMS.

## Code References

The backend functions `notify-area-users` and `send-recommendation-email` have been updated to check for these variables. If they are missing, SMS sending will be skipped gracefully without crashing the app.
