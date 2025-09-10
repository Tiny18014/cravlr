import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CityAutocompleteProps {
  value: string;
  onValueChange: (value: string) => void;
  onCitySelect: (city: string, state: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

interface AutocompleteResult {
  description: string;
  placeId: string;
  city: string;
  state: string;
}

export const CityAutocomplete: React.FC<CityAutocompleteProps> = ({
  value,
  onValueChange,
  onCitySelect,
  placeholder = "Start typing a city name...",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const searchCities = async () => {
      if (value.length >= 2) {
        setIsLoading(true);
        try {
          const { data, error } = await supabase.functions.invoke('places-autocomplete', {
            body: { input: value }
          });

          if (error) {
            console.error('Error fetching cities:', error);
            setSuggestions([]);
            setIsOpen(false);
            return;
          }

          const results = data || [];
          setSuggestions(results.slice(0, 8));
          setIsOpen(results.length > 0);
        } catch (error) {
          console.error('Error searching cities:', error);
          setSuggestions([]);
          setIsOpen(false);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    };

    const timeoutId = setTimeout(searchCities, 300); // Debounce API calls
    return () => clearTimeout(timeoutId);
  }, [value]);

  const handleInputChange = (newValue: string) => {
    onValueChange(newValue);
  };

  const handleCitySelect = (result: AutocompleteResult) => {
    const displayValue = `${result.city}, ${result.state}`;
    onValueChange(displayValue);
    onCitySelect(result.city, result.state);
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    // Delay closing to allow for clicks on suggestions
    setTimeout(() => setIsOpen(false), 150);
  };

  const clearInput = () => {
    onValueChange('');
    onCitySelect('', '');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className="pl-10 pr-10"
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={clearInput}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      {isLoading && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-lg">
          <div className="px-4 py-3 text-muted-foreground flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <span>Searching cities...</span>
          </div>
        </div>
      )}
      
      {isOpen && suggestions.length > 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.placeId}-${index}`}
              className="w-full px-4 py-3 text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-3 transition-colors"
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input blur
                handleCitySelect(suggestion);
              }}
            >
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <div className="font-medium">{suggestion.city}</div>
                <div className="text-sm text-muted-foreground">{suggestion.state}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};