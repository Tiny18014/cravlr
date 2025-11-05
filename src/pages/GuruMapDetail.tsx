import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Heart, MapPin, Plus, Share2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AddPlaceModal } from '@/components/guru/AddPlaceModal';

interface MapPlace {
  id: string;
  name: string;
  address: string | null;
  notes: string | null;
  place_id: string;
  photo_token: string | null;
  rating: number | null;
  added_by: string;
  adder_profile?: {
    display_name: string;
  };
}

interface GuruMapDetail {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  is_public: boolean;
  creator_profile?: {
    display_name: string;
  };
}

export default function GuruMapDetail() {
  const { mapId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState<GuruMapDetail | null>(null);
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [hasLiked, setHasLiked] = useState(false);
  const [isCollaborator, setIsCollaborator] = useState(false);
  const [showAddPlaceModal, setShowAddPlaceModal] = useState(false);

  useEffect(() => {
    if (mapId && user) {
      loadMapDetails();
      checkIfLiked();
    }
  }, [mapId, user]);

  const loadMapDetails = async () => {
    try {
      const { data: mapData, error: mapError } = await supabase
        .from('guru_maps')
        .select('*')
        .eq('id', mapId)
        .maybeSingle();

      if (mapError) throw mapError;
      
      if (mapData) {
        // Fetch creator profile separately
        const { data: creator } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', mapData.created_by)
          .maybeSingle();
        
        setMap({
          ...mapData,
          creator_profile: { display_name: creator?.display_name || 'Anonymous' }
        });
        setIsCollaborator(mapData.created_by === user?.id);
      }

      const { data: placesData, error: placesError } = await supabase
        .from('guru_map_places')
        .select('*')
        .eq('map_id', mapId)
        .order('created_at', { ascending: false });

      if (placesError) throw placesError;
      
      // Enrich places with profile data and transform to match interface
      const enrichedPlaces = await Promise.all((placesData || []).map(async (place) => {
        const { data: adderProfile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', place.added_by)
          .maybeSingle();
        
        return {
          id: place.id,
          name: place.place_name,
          address: null,
          notes: place.notes,
          place_id: place.place_id,
          photo_token: null,
          rating: null,
          added_by: place.added_by,
          adder_profile: { display_name: adderProfile?.display_name || 'A Guru' }
        };
      }));
      
      setPlaces(enrichedPlaces);
    } catch (error) {
      console.error('Error loading map:', error);
      toast({
        title: "Error",
        description: "Failed to load map details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkIfLiked = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('guru_map_likes')
        .select('id')
        .eq('map_id', mapId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setHasLiked(!!data);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const toggleLike = async () => {
    if (!user || !map) return;

    try {
      if (hasLiked) {
        const { error } = await supabase
          .from('guru_map_likes')
          .delete()
          .eq('map_id', mapId)
          .eq('user_id', user.id);

        if (error) throw error;
        setHasLiked(false);
      } else {
        const { error } = await supabase
          .from('guru_map_likes')
          .insert({
            map_id: mapId,
            user_id: user.id
          });

        if (error) throw error;
        setHasLiked(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  if (!map) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-muted-foreground mb-4">Map not found</p>
        <Button onClick={() => navigate('/guru-lounge')}>
          Back to Guru Lounge
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/guru-lounge')}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Lounge
          </Button>
          
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">{map.title}</h1>
          </div>
          
          {map.description && (
            <p className="text-muted-foreground">{map.description}</p>
          )}
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>by {map.creator_profile?.display_name || 'Anonymous'}</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {places.length} places
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant={hasLiked ? "default" : "outline"}
            size="sm"
            onClick={toggleLike}
            className="gap-2"
          >
            <Heart className={`h-4 w-4 ${hasLiked ? 'fill-current' : ''}`} />
            Like
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Add Place Button (for collaborators) */}
      {isCollaborator && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <h3 className="font-semibold">Add places to this map</h3>
              <p className="text-sm text-muted-foreground">
                Share your favorite spots with the community
              </p>
            </div>
            <Button onClick={() => setShowAddPlaceModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Place
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Places List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          Places on this map ({places.length})
        </h2>

        {places.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MapPin className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No places yet</h3>
              <p className="text-muted-foreground text-center">
                {isCollaborator 
                  ? "Be the first to add a place to this map!"
                  : "This map is waiting for recommendations from Gurus"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {places.map((place) => (
              <Card key={place.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{place.name}</CardTitle>
                      {place.address && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {place.address}
                        </p>
                      )}
                    </div>
                    {place.rating && (
                      <Badge variant="secondary">
                        ⭐ {place.rating.toFixed(1)}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                {place.notes && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground italic">
                      "{place.notes}"
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      — {place.adder_profile?.display_name || 'A Guru'}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Place Modal */}
      <AddPlaceModal
        open={showAddPlaceModal}
        onClose={() => setShowAddPlaceModal(false)}
        mapId={mapId!}
        onPlaceAdded={loadMapDetails}
      />
    </div>
  );
}
