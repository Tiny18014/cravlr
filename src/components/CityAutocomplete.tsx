import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CityAutocompleteProps {
  value: string;
  onValueChange: (value: string) => void;
  onCitySelect: (city: string, state: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
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
  disabled = false,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Clear any existing debounce timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Only search if we have at least 2 characters
    if (value.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    // Show loading state immediately for feedback
    setIsLoading(true);

    // Debounce the actual API call (400ms delay)
    debounceRef.current = setTimeout(async () => {
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
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  const handleInputChange = (newValue: string) => {
    onValueChange(newValue);
  };

  const handleCitySelect = (result: AutocompleteResult) => {
    const displayValue = `${result.city}, ${result.state}`;
    onValueChange(displayValue);
    onCitySelect(result.city, result.state);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    // Delay closing to allow for clicks on suggestions
    setTimeout(() => setIsOpen(false), 200);
  };

  const clearInput = () => {
    onValueChange('');
    onCitySelect('', '');
    setIsOpen(false);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "pl-10 pr-10 h-12 text-base",
            className
          )}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {value && !isLoading && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 hover:bg-transparent"
              onClick={clearInput}
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </Button>
          )}
        </div>
      </div>
      
      {isOpen && suggestions.length > 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.placeId}-${index}`}
              type="button"
              className="w-full px-4 py-3 text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-3 transition-colors first:rounded-t-xl last:rounded-b-xl"
              onMouseDown={(e) => {
                e.preventDefault();
                handleCitySelect(suggestion);
              }}
            >
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{suggestion.city}</div>
                <div className="text-sm text-muted-foreground truncate">{suggestion.state}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};