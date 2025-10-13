import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { RestaurantSearchInput } from '@/components/RestaurantSearchInput';

interface AddPlaceModalProps {
  open: boolean;
  onClose: () => void;
  mapId: string;
  onPlaceAdded: () => void;
}

interface SelectedPlace {
  place_id: string;
  name: string;
  address: string;
  rating?: number;
  photo_token?: string;
}

export function AddPlaceModal({ open, onClose, mapId, onPlaceAdded }: AddPlaceModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [notes, setNotes] = useState('');
  const [searchValue, setSearchValue] = useState('');

  const handleRestaurantChange = (name: string, address: string, placeId?: string) => {
    if (placeId) {
      setSelectedPlace({
        place_id: placeId,
        name,
        address,
      });
    } else {
      setSelectedPlace(null);
    }
    setSearchValue(name);
  };

  const handleAdd = async () => {
    if (!user || !selectedPlace) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('guru_map_places')
        .insert({
          map_id: mapId,
          place_id: selectedPlace.place_id,
          name: selectedPlace.name,
          address: selectedPlace.address,
          rating: selectedPlace.rating || null,
          photo_token: selectedPlace.photo_token || null,
          notes: notes.trim() || null,
          added_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Place added! 📍",
        description: `${selectedPlace.name} has been added to the map`
      });

      // Reset form
      setSelectedPlace(null);
      setNotes('');
      
      onPlaceAdded();
      onClose();
    } catch (error: any) {
      console.error('Error adding place:', error);
      
      if (error.code === '23505') {
        toast({
          title: "Already added",
          description: "This place is already on the map",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add place. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>📍 Add a Place to the Map</DialogTitle>
          <DialogDescription>
            Search for a restaurant or food spot to add to this collaborative map
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Search for a place</Label>
            <RestaurantSearchInput
              value={searchValue}
              onChange={handleRestaurantChange}
              placeholder="Search restaurants, cafes, food spots..."
            />
            {selectedPlace && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedPlace.name}</p>
                <p className="text-sm text-muted-foreground">{selectedPlace.address}</p>
                {selectedPlace.rating && (
                  <p className="text-sm">⭐ {selectedPlace.rating.toFixed(1)}</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Your Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="What makes this place special? Any dishes you recommend?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleAdd} 
            disabled={loading || !selectedPlace}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Place
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
