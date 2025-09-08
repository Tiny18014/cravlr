import React from 'react';
import { SampleBusinessAccounts } from '@/components/SampleBusinessAccounts';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function SampleAccounts() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          
          <h1 className="text-3xl font-bold mb-2">Sample Business Accounts</h1>
          <p className="text-muted-foreground">
            Pre-created restaurant accounts for testing the business verification and management features.
          </p>
        </div>

        <SampleBusinessAccounts />
      </div>
    </div>
  );
}