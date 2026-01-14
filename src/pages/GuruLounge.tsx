import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GuruFeed } from '@/components/guru/GuruFeed';
import { TopMapsTab } from '@/components/guru/TopMapsTab';
import { GuruLeaderboard } from '@/components/guru/GuruLeaderboard';
import { BrowseMapsTab } from '@/components/guru/BrowseMapsTab';

export default function GuruLounge() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isGuru, setIsGuru] = useState(false);

  useEffect(() => {
    checkGuruAccess();
  }, [user]);

  const checkGuruAccess = async () => {
    if (!user) {
      navigate('/welcome');
      return;
    }

    // Guru feature temporarily disabled - checking user roles instead
    try {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;

      const isGuruRole = roles?.some(r => r.role === 'admin'); // Temporarily admin-only
      
      if (!isGuruRole) {
        toast({
          title: "Access Denied",
          description: "This feature is currently under development.",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      setIsGuru(true);
    } catch (error) {
      console.error('Error checking Guru access:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Sparkles className="h-12 w-12 animate-pulse mx-auto text-primary" />
          <p className="text-muted-foreground">Loading Guru Lounge...</p>
        </div>
      </div>
    );
  }

  if (!isGuru) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold">Guru Lounge</h1>
            </div>
            <p className="text-muted-foreground">
              The exclusive space for Cravlr's top contributors
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="feed" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1">
              <TabsTrigger value="feed" className="text-xs sm:text-sm">🧭 Feed</TabsTrigger>
              <TabsTrigger value="maps" className="text-xs sm:text-sm">🗺️ Top Maps</TabsTrigger>
              <TabsTrigger value="leaderboard" className="text-xs sm:text-sm">🏆 Leaderboard</TabsTrigger>
              <TabsTrigger value="browse" className="text-xs sm:text-sm">🔍 Browse Gurus</TabsTrigger>
            </TabsList>

            <TabsContent value="feed" className="mt-6">
              <GuruFeed />
            </TabsContent>

            <TabsContent value="maps" className="mt-6">
              <TopMapsTab />
            </TabsContent>

            <TabsContent value="leaderboard" className="mt-6">
              <GuruLeaderboard />
            </TabsContent>

            <TabsContent value="browse" className="mt-6">
              <BrowseMapsTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
