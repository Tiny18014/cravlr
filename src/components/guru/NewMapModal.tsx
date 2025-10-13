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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface NewMapModalProps {
  open: boolean;
  onClose: () => void;
  onMapCreated: () => void;
}

export function NewMapModal({ open, onClose, onMapCreated }: NewMapModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState('');

  const handleCreate = async () => {
    if (!user) return;
    
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your map",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('guru_maps')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          theme: theme.trim() || null,
          created_by: user.id,
          collaborators: [user.id],
          is_public: true
        });

      if (error) throw error;

      toast({
        title: "Map created! 🗺️",
        description: "Your collaborative map is ready. Start adding places!"
      });

      // Reset form
      setTitle('');
      setDescription('');
      setTheme('');
      
      onMapCreated();
      onClose();
    } catch (error) {
      console.error('Error creating map:', error);
      toast({
        title: "Error",
        description: "Failed to create map. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>🗺️ Create a New Collaborative Map</DialogTitle>
          <DialogDescription>
            Start a themed food map and invite other Gurus to collaborate
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Map Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Hidden Gems of Charlotte"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Input
              id="theme"
              placeholder="e.g., Late Night Eats, Brunch Spots, Vegan Friendly"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What makes this map special? What kind of places will it include?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Map
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
