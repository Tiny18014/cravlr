import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [isLocked, setIsLocked] = useState(false); // Track if a city was selected
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset locked state when value is cleared externally
  useEffect(() => {
    if (!value) {
      setIsLocked(false);
    }
  }, [value]);

  useEffect(() => {
    // Don't search if locked (user selected a city)
    if (isLocked) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    // Clear any existing debounce timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Only search if we have at least 2 characters
    if (value.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      setHighlightedIndex(-1);
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
        setHighlightedIndex(-1);
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
  }, [value, isLocked]);

  const handleInputChange = (newValue: string) => {
    // User is typing, unlock the field
    setIsLocked(false);
    onValueChange(newValue);
  };

  const handleCitySelect = useCallback((result: AutocompleteResult) => {
    const displayValue = `${result.city}, ${result.state}`;
    
    // Lock the selection and close dropdown
    setIsLocked(true);
    setIsOpen(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
    
    // Update value and call callback
    onValueChange(displayValue);
    onCitySelect(result.city, result.state);
  }, [onValueChange, onCitySelect]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleCitySelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleInputFocus = () => {
    // Only show dropdown if not locked and we have suggestions
    if (!isLocked && suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget?.closest('.city-suggestions-dropdown')) {
      return;
    }
    setTimeout(() => {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }, 100);
  };

  const clearInput = () => {
    onValueChange('');
    onCitySelect('', '');
    setIsOpen(false);
    setSuggestions([]);
    setIsLocked(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const highlighted = dropdownRef.current.children[highlightedIndex] as HTMLElement;
      if (highlighted) {
        highlighted.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  return (
    <div className="relative w-full">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur as any}
          onKeyDown={handleKeyDown}
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
        <div 
          ref={dropdownRef}
          className="city-suggestions-dropdown absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-xl shadow-lg max-h-64 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.placeId}-${index}`}
              type="button"
              tabIndex={0}
              className={cn(
                "w-full px-4 py-3 text-left flex items-center gap-3 transition-colors first:rounded-t-xl last:rounded-b-xl focus:outline-none",
                highlightedIndex === index 
                  ? "bg-accent text-accent-foreground" 
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCitySelect(suggestion);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
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