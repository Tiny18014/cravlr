import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, X } from 'lucide-react';
import { searchCities } from '@/data/cities';

interface CityAutocompleteProps {
  value: string;
  onValueChange: (value: string) => void;
  onCitySelect: (city: string, state: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const CityAutocomplete: React.FC<CityAutocompleteProps> = ({
  value,
  onValueChange,
  onCitySelect,
  placeholder = "Start typing a city name...",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{city: string, state: string, fullName: string}>>([]);

  useEffect(() => {
    if (value.length >= 2) {
      const results = searchCities(value, 8);
      setSuggestions(results);
      setIsOpen(results.length > 0);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [value]);

  const handleInputChange = (newValue: string) => {
    onValueChange(newValue);
  };

  const handleCitySelect = (city: string, state: string, fullName: string) => {
    onValueChange(fullName);
    onCitySelect(city, state);
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
          disabled={disabled}
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
      
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.city}-${suggestion.state}-${index}`}
              className="w-full px-4 py-3 text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-3 transition-colors"
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input blur
                handleCitySelect(suggestion.city, suggestion.state, suggestion.fullName);
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