import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield } from 'lucide-react';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Privacy Policy
            </h1>
            <p className="text-muted-foreground mt-1">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl prose prose-slate dark:prose-invert">
        <section className="mb-8">
          <h2>1. Information We Collect</h2>
          
          <h3>Personal Information</h3>
          <p>When you create an account, we collect:</p>
          <ul>
            <li>Email address</li>
            <li>Display name</li>
            <li>Location (city and state)</li>
            <li>Profile preferences</li>
          </ul>

          <h3>Content Information</h3>
          <p>We collect content you provide through the Service:</p>
          <ul>
            <li>Food requests and descriptions</li>
            <li>Restaurant recommendations and reviews</li>
            <li>Communications with other users</li>
            <li>Feedback and ratings</li>
          </ul>

          <h3>Usage Information</h3>
          <p>We automatically collect:</p>
          <ul>
            <li>Device and browser information</li>
            <li>IP address and location data</li>
            <li>Usage patterns and preferences</li>
            <li>Referral link clicks and conversions</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2>2. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Provide and improve our Service</li>
            <li>Match food requests with relevant recommendations</li>
            <li>Send notifications about relevant opportunities</li>
            <li>Calculate points and rewards</li>
            <li>Verify business accounts</li>
            <li>Analyze usage patterns and improve user experience</li>
            <li>Prevent fraud and ensure platform safety</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2>3. Information Sharing</h2>
          
          <h3>Public Information</h3>
          <p>The following information is visible to other users:</p>
          <ul>
            <li>Display name</li>
            <li>Restaurant recommendations</li>
            <li>Public ratings and reviews</li>
            <li>City and state (for location-based matching)</li>
          </ul>

          <h3>Business Analytics</h3>
          <p>
            Verified businesses can see aggregated analytics about referrals to their establishments, including click counts and conversion data, but not personal user information.
          </p>

          <h3>Service Providers</h3>
          <p>We may share information with trusted service providers who help us operate the Service:</p>
          <ul>
            <li>Authentication and database services (Supabase)</li>
            <li>Push notification services (OneSignal)</li>
            <li>Email communication services (Resend)</li>
            <li>Maps and location services (Google Places)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2>4. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no internet transmission is completely secure.
          </p>
          <ul>
            <li>Encrypted data transmission</li>
            <li>Secure database storage</li>
            <li>Regular security audits</li>
            <li>Limited employee access to personal data</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2>5. Cookies and Tracking</h2>
          <p>
            We use cookies and similar technologies to enhance your experience:
          </p>
          <ul>
            <li>Essential cookies for authentication and security</li>
            <li>Analytics cookies to understand usage patterns</li>
            <li>Preference cookies to remember your settings</li>
            <li>Performance cookies to improve Service speed</li>
          </ul>
          <p>
            You can control cookie preferences through your browser settings. Some features may not work properly if you disable certain cookies.
          </p>
        </section>

        <section className="mb-8">
          <h2>6. Your Rights and Choices</h2>
          
          <h3>Account Management</h3>
          <p>You can:</p>
          <ul>
            <li>Update your profile information at any time</li>
            <li>Adjust notification preferences</li>
            <li>Control location sharing settings</li>
            <li>Delete your recommendations and requests</li>
          </ul>

          <h3>Data Rights</h3>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Correct inaccurate information</li>
            <li>Request data deletion</li>
            <li>Data portability</li>
            <li>Withdraw consent for data processing</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2>7. Data Retention</h2>
          <p>
            We retain your information for as long as necessary to provide the Service and fulfill legal obligations:
          </p>
          <ul>
            <li>Account information: Until account deletion</li>
            <li>Recommendations and reviews: May be retained for Service integrity</li>
            <li>Analytics data: Aggregated and anonymized after 2 years</li>
            <li>Legal compliance data: As required by law</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2>8. Children's Privacy</h2>
          <p>
            Our Service is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, please contact us immediately.
          </p>
        </section>

        <section className="mb-8">
          <h2>9. International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data during such transfers.
          </p>
        </section>

        <section className="mb-8">
          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of significant changes via email or through the Service. Your continued use after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section className="mb-8">
          <h2>11. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or want to exercise your data rights, please contact us through the support channels in the application or visit your Profile settings to manage your data preferences.
          </p>
        </section>
      </main>
    </div>
  );
};

export default PrivacyPolicy;