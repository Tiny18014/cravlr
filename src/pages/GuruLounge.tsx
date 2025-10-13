import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Map, Users, TrendingUp, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NewMapModal } from '@/components/guru/NewMapModal';

interface GuruMap {
  id: string;
  title: string;
  description: string | null;
  theme: string | null;
  likes_count: number;
  created_at: string;
  created_by: string;
  collaborators: string[];
  guru_map_places: Array<{
    name: string;
    address: string;
  }>;
  creator_profile?: {
    display_name: string;
  };
}

export default function GuruLounge() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isGuru, setIsGuru] = useState(false);
  const [topMaps, setTopMaps] = useState<GuruMap[]>([]);
  const [showNewMapModal, setShowNewMapModal] = useState(false);

  useEffect(() => {
    checkGuruAccess();
  }, [user]);

  const checkGuruAccess = async () => {
    if (!user) {
      navigate('/welcome');
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('guru_level')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (!profile?.guru_level) {
        toast({
          title: "Access Denied",
          description: "The Guru Lounge is invite-only. Keep building your reputation to earn access!",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      setIsGuru(true);
      await loadTopMaps();
    } catch (error) {
      console.error('Error checking Guru access:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadTopMaps = async () => {
    try {
      const { data, error } = await supabase
        .from('guru_maps')
        .select(`
          *,
          guru_map_places (
            name,
            address
          ),
          creator_profile:profiles!guru_maps_created_by_fkey (
            display_name
          )
        `)
        .order('likes_count', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTopMaps(data || []);
    } catch (error) {
      console.error('Error loading maps:', error);
      toast({
        title: "Error",
        description: "Failed to load collaborative maps",
        variant: "destructive"
      });
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
    <div className="container mx-auto p-6 max-w-7xl space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Guru Lounge</h1>
          <Badge variant="secondary" className="ml-2">Invite Only</Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Your exclusive space to collaborate, curate, and create the ultimate food maps. 
          Welcome to the inner circle.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Maps</CardTitle>
            <Map className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topMaps.length}</div>
            <p className="text-xs text-muted-foreground">
              Collaborative food guides
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {topMaps.reduce((sum, map) => sum + map.likes_count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Community engagement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collaborators</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(topMaps.flatMap(m => m.collaborators)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Guru contributors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Create New Map Button */}
      <div className="flex justify-center">
        <Button 
          size="lg" 
          onClick={() => setShowNewMapModal(true)}
          className="gap-2"
        >
          <Plus className="h-5 w-5" />
          Start a New Collaborative Map
        </Button>
      </div>

      {/* Top Maps Section */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold mb-2">🔥 Top Collaborative Maps</h2>
          <p className="text-muted-foreground">
            Most loved food guides from the Guru community
          </p>
        </div>

        {topMaps.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Map className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No maps yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Be the first to create a collaborative food map!
              </p>
              <Button onClick={() => setShowNewMapModal(true)}>
                Create First Map
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {topMaps.map((map) => (
              <Card 
                key={map.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/guru-lounge/map/${map.id}`)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg">{map.title}</CardTitle>
                      {map.theme && (
                        <Badge variant="outline" className="text-xs">
                          {map.theme}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {map.likes_count}
                      </div>
                      <p className="text-xs text-muted-foreground">likes</p>
                    </div>
                  </div>
                  {map.description && (
                    <CardDescription className="line-clamp-2">
                      {map.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Map className="h-4 w-4" />
                      <span>{map.guru_map_places?.length || 0} places</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{map.collaborators.length} gurus</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    by {map.creator_profile?.display_name || 'Anonymous'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* New Map Modal */}
      <NewMapModal 
        open={showNewMapModal}
        onClose={() => setShowNewMapModal(false)}
        onMapCreated={loadTopMaps}
      />
    </div>
  );
}
