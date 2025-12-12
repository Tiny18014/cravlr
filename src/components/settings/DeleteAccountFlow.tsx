import React, { useState } from 'react';
import { AlertTriangle, ArrowLeft, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface DeleteAccountFlowProps {
  onBack: () => void;
}

export const DeleteAccountFlow = ({ onBack }: DeleteAccountFlowProps) => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [acknowledgements, setAcknowledgements] = useState({
    dataDeleted: false,
    cannotUndo: false,
    noRecovery: false,
    wantToProceed: false,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportRequested, setExportRequested] = useState(false);

  const allAcknowledged = Object.values(acknowledgements).every(Boolean);

  const handleDataExport = async () => {
    if (!user) return;
    
    try {
      setExportRequested(true);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data: requests } = await supabase
        .from('food_requests')
        .select('*')
        .eq('requester_id', user.id);

      const { data: recommendations } = await supabase
        .from('recommendations')
        .select('*')
        .eq('recommender_id', user.id);

      const exportData = {
        profile,
        requests,
        recommendations,
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cravlr-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Data Exported",
        description: "Your data has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting your data.",
        variant: "destructive",
      });
      setExportRequested(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !allAcknowledged) return;
    
    setIsDeleting(true);
    
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      
      if (error) throw error;

      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });

      await signOut();
      navigate('/welcome');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Deletion Failed",
        description: "There was an error deleting your account. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleAcknowledgement = (key: keyof typeof acknowledgements) => {
    setAcknowledgements((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border flex-shrink-0">
        <div className="container mx-auto px-4 py-4 max-w-2xl">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back to Settings</span>
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 max-w-2xl pb-24">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <h1 className="text-2xl font-semibold text-destructive flex items-center gap-2">
                <Trash2 className="h-6 w-6" />
                Delete Account
              </h1>
              <p className="text-muted-foreground mt-1">
                Permanently remove your Cravlr account and all data
              </p>
            </div>

            {/* Warning Banner */}
            <div className="rounded-[16px] border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-5">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                    This action is permanent
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Deleting your account will permanently remove all your data, including your profile, 
                    food requests, recommendations, and points. This cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            {/* Download Data Section */}
            <div className="bg-card rounded-[20px] p-6 shadow-sm border border-border">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-accent-bubble flex items-center justify-center flex-shrink-0">
                  <Download className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Download Your Data</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    Before deleting, you can download a copy of all your Cravlr data including your profile, 
                    requests, and recommendations.
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleDataExport}
                    disabled={exportRequested}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {exportRequested ? 'Data Downloaded' : 'Download My Data'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Acknowledgement Checkboxes */}
            <div className="bg-card rounded-[20px] p-6 shadow-sm border border-border">
              <h3 className="font-semibold text-foreground mb-4">Please confirm you understand:</h3>
              
              <div className="space-y-4">
                {[
                  { key: 'dataDeleted', label: 'All my data will be permanently deleted' },
                  { key: 'cannotUndo', label: 'This action cannot be undone' },
                  { key: 'noRecovery', label: 'I will not be able to recover my account' },
                  { key: 'wantToProceed', label: 'I want to proceed with account deletion' },
                ].map((item) => (
                  <div key={item.key} className="flex items-start gap-3">
                    <Checkbox
                      id={item.key}
                      checked={acknowledgements[item.key as keyof typeof acknowledgements]}
                      onCheckedChange={() => toggleAcknowledgement(item.key as keyof typeof acknowledgements)}
                      className="mt-0.5"
                    />
                    <Label 
                      htmlFor={item.key} 
                      className="text-sm text-foreground cursor-pointer leading-relaxed"
                    >
                      {item.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Delete Button */}
            <Button
              variant="destructive"
              size="lg"
              className="w-full h-14 text-base font-semibold"
              disabled={!allAcknowledged || isDeleting}
              onClick={handleDeleteAccount}
            >
              <Trash2 className="h-5 w-5 mr-2" />
              {isDeleting ? 'Deleting Account...' : 'Permanently Delete My Account'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
