import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, AlertTriangle, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const AccountDeletion = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [confirmationText, setConfirmationText] = useState('');
  const [understanding, setUnderstanding] = useState({
    dataLoss: false,
    permanent: false,
    noRecovery: false,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportRequested, setExportRequested] = useState(false);

  const canDelete = 
    confirmationText === 'DELETE' && 
    understanding.dataLoss && 
    understanding.permanent && 
    understanding.noRecovery;

  const handleDataExport = async () => {
    if (!user) return;
    
    try {
      setExportRequested(true);
      
      // Fetch user data for export
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

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `account-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Data Export Complete",
        description: "Your account data has been downloaded as a JSON file.",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting your data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAccountDeletion = async () => {
    if (!user || !canDelete) return;
    
    setIsDeleting(true);
    
    try {
      // Call the server-side delete-account edge function
      const { error } = await supabase.functions.invoke('delete-account');
      
      if (error) {
        throw error;
      }

      toast({
        title: "Account Deleted",
        description: "Your account and all associated data have been permanently deleted.",
      });

      // Sign out after successful deletion
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

  return (
    <Card className="border-destructive/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          Delete Account
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                Before you delete your account
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Account deletion is permanent and cannot be undone. Consider downloading your data first.
              </p>
            </div>
          </div>
        </div>

        {/* Data Export Section */}
        <div className="space-y-3">
          <h4 className="font-semibold">Download Your Data</h4>
          <p className="text-sm text-muted-foreground">
            Before deleting your account, you can download a copy of your data including your profile, 
            requests, and recommendations.
          </p>
          <Button 
            variant="outline" 
            onClick={handleDataExport}
            disabled={exportRequested}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {exportRequested ? 'Data Exported' : 'Download My Data'}
          </Button>
        </div>

        {/* Understanding Checkboxes */}
        <div className="space-y-3">
          <h4 className="font-semibold">I understand that:</h4>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dataLoss"
              checked={understanding.dataLoss}
              onCheckedChange={(checked) => 
                setUnderstanding(prev => ({ ...prev, dataLoss: !!checked }))
              }
            />
            <Label htmlFor="dataLoss" className="text-sm">
              All my data (profile, requests, recommendations, points) will be permanently deleted
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="permanent"
              checked={understanding.permanent}
              onCheckedChange={(checked) => 
                setUnderstanding(prev => ({ ...prev, permanent: !!checked }))
              }
            />
            <Label htmlFor="permanent" className="text-sm">
              This action is permanent and cannot be undone
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="noRecovery"
              checked={understanding.noRecovery}
              onCheckedChange={(checked) => 
                setUnderstanding(prev => ({ ...prev, noRecovery: !!checked }))
              }
            />
            <Label htmlFor="noRecovery" className="text-sm">
              I will not be able to recover my account or data after deletion
            </Label>
          </div>
        </div>

        {/* Confirmation Input */}
        <div className="space-y-2">
          <Label htmlFor="confirm-delete">
            Type "DELETE" to confirm account deletion:
          </Label>
          <Input
            id="confirm-delete"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder="Type DELETE here"
            className="max-w-xs"
          />
        </div>

        {/* Delete Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              disabled={!canDelete}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete My Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your account and remove all your data from our servers. 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleAccountDeletion}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Deleting...' : 'Yes, delete my account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default AccountDeletion;