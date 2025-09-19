import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';

const TermsOfService = () => {
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
              <FileText className="h-8 w-8" />
              Terms of Service
            </h1>
            <p className="text-muted-foreground mt-1">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl prose prose-slate dark:prose-invert">
        <section className="mb-8">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using our food recommendation platform ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
          </p>
        </section>

        <section className="mb-8">
          <h2>2. Description of Service</h2>
          <p>
            Our platform connects food enthusiasts who can request dining recommendations with local experts who provide personalized restaurant suggestions. We facilitate these connections through our web application and related services.
          </p>
          <ul>
            <li>Food request posting and management</li>
            <li>Restaurant recommendation sharing</li>
            <li>Points and rewards system</li>
            <li>Business verification and analytics</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2>3. User Accounts and Registration</h2>
          <p>
            To access certain features of the Service, you must register for an account. You agree to:
          </p>
          <ul>
            <li>Provide accurate, current, and complete information during registration</li>
            <li>Maintain and promptly update your account information</li>
            <li>Maintain the security of your password and identification</li>
            <li>Notify us immediately of any unauthorized use of your account</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2>4. User Conduct</h2>
          <p>You agree not to use the Service to:</p>
          <ul>
            <li>Post false, misleading, or malicious restaurant recommendations</li>
            <li>Spam users with irrelevant or excessive communications</li>
            <li>Violate any local, state, national, or international law</li>
            <li>Impersonate any person or entity</li>
            <li>Collect or store personal data about other users</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2>5. Content and Intellectual Property</h2>
          <p>
            Users retain ownership of the content they submit. By posting content, you grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content in connection with the Service.
          </p>
          <p>
            The Service and its original content, features, and functionality are owned by us and are protected by international copyright, trademark, and other intellectual property laws.
          </p>
        </section>

        <section className="mb-8">
          <h2>6. Points and Rewards Program</h2>
          <p>
            Our points system rewards users for quality recommendations. Points have no cash value and cannot be transferred between users. We reserve the right to modify or discontinue the rewards program at any time.
          </p>
        </section>

        <section className="mb-8">
          <h2>7. Business Services</h2>
          <p>
            Business verification and analytics services are subject to additional terms. Businesses must provide accurate information during verification and comply with all applicable laws and regulations.
          </p>
        </section>

        <section className="mb-8">
          <h2>8. Privacy and Data Protection</h2>
          <p>
            Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices.
          </p>
        </section>

        <section className="mb-8">
          <h2>9. Disclaimers and Limitation of Liability</h2>
          <p>
            The Service is provided "as is" without warranties of any kind. We are not responsible for the accuracy of restaurant recommendations or any consequences of following user advice.
          </p>
          <p>
            In no event shall we be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or use.
          </p>
        </section>

        <section className="mb-8">
          <h2>10. Termination</h2>
          <p>
            We may terminate or suspend your account and access to the Service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users or third parties.
          </p>
        </section>

        <section className="mb-8">
          <h2>11. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. We will notify users of significant changes via email or through the Service. Continued use after changes constitutes acceptance of new terms.
          </p>
        </section>

        <section className="mb-8">
          <h2>12. Contact Information</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us through our support channels within the application.
          </p>
        </section>
      </main>
    </div>
  );
};

export default TermsOfService;