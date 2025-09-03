import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Loader2, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RestaurantSuggestion {
  placeId: string;
  name: string;
  address: string;
  description: string;
}

interface RestaurantSearchInputProps {
  value: string;
  onChange: (name: string, address: string, placeId?: string) => void;
  placeholder?: string;
  required?: boolean;
  userLocation?: { lat: number; lng: number } | null;
}

export const RestaurantSearchInput: React.FC<RestaurantSearchInputProps> = ({
  value,
  onChange,
  placeholder = "Search for restaurants...",
  required = false,
  userLocation
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<RestaurantSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm && searchTerm.length >= 2) {
        searchRestaurants(searchTerm);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, userLocation]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchRestaurants = async (query: string) => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      console.log('🔍 Searching restaurants for:', query);
      
      const requestBody = {
        input: query,
        ...(userLocation && { lat: userLocation.lat, lng: userLocation.lng }),
        radiusKm: 10 // 10km radius
      };

      console.log('🔍 Request body:', requestBody);

      const { data, error } = await supabase.functions.invoke('places-search/autocomplete', {
        body: requestBody
      });

      if (error) {
        console.error('❌ Places search error:', error);
        return;
      }

      console.log('✅ Got suggestions:', data);
      setSuggestions(data || []);
      setIsOpen(true);
    } catch (error) {
      console.error('❌ Restaurant search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectRestaurant = (suggestion: RestaurantSuggestion) => {
    setSearchTerm(suggestion.name);
    onChange(suggestion.name, suggestion.address, suggestion.placeId);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue, '', undefined); // Clear address and placeId when typing
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Input
          ref={inputRef}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          required={required}
          className="pr-10"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto border shadow-lg bg-background">
          <div className="p-1">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion.placeId}
                variant="ghost"
                className="w-full justify-start h-auto p-3 text-left font-normal hover:bg-muted"
                onClick={() => selectRestaurant(suggestion)}
              >
                <div className="flex items-start gap-3 w-full">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {suggestion.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {suggestion.address}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </Card>
      )}

      {isOpen && suggestions.length === 0 && !loading && searchTerm.length >= 2 && (
        <Card className="absolute z-50 w-full mt-1 border shadow-lg bg-background">
          <div className="p-4 text-center text-sm text-muted-foreground">
            No restaurants found for "{searchTerm}"
          </div>
        </Card>
      )}
    </div>
  );
};