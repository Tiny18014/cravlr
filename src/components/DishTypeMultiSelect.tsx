import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import { UtensilsCrossed, X } from 'lucide-react';
import { dishTypes } from '@/data/dishTypes';
import { cn } from '@/lib/utils';

interface DishTypeMultiSelectProps {
  value: string[];
  onChange: (dishes: string[]) => void;
  placeholder?: string;
}

export function DishTypeMultiSelect({ value, onChange, placeholder = "Add dish types (e.g., Pizza, Burger...)" }: DishTypeMultiSelectProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<typeof dishTypes[number][]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fuse = useMemo(() => new Fuse([...dishTypes], {
    keys: ['name'],
    threshold: 0.3
  }), []);

  const saveCustomValue = useCallback(() => {
    if (query.trim() && !value.includes(query.trim())) {
      onChange([...value, query.trim()]);
      setQuery('');
      setResults([]);
      setShowDropdown(false);
    }
  }, [query, value, onChange]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        saveCustomValue();
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [saveCustomValue]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const matched = fuse.search(query).map(r => r.item);
    // Filter out already selected dishes
    const filtered = matched.filter(item => !value.includes(item.name));
    setResults(filtered.slice(0, 10));
  }, [query, fuse, value]);

  const handleSelect = (item: typeof dishTypes[number]) => {
    if (!value.includes(item.name)) {
      onChange([...value, item.name]);
    }
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  const removeDish = (dishName: string) => {
    onChange(value.filter(d => d !== dishName));
  };

  const handleAnything = () => {
    if (!value.includes('Anything')) {
      onChange([...value, 'Anything']);
    }
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Dish Type</h3>
        <p className="text-sm text-muted-foreground">Add one or more dishes you're craving</p>
      </div>

      <div className="w-full">
        <div className="relative" ref={dropdownRef}>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <div className="flex items-center border-2 border-border rounded-full px-4 py-3 bg-background shadow-sm focus-within:border-primary transition-colors">
                <UtensilsCrossed className="h-5 w-5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => query.trim() && setShowDropdown(true)}
                  onBlur={() => setTimeout(saveCustomValue, 150)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      saveCustomValue();
                    }
                  }}
                  placeholder={placeholder}
                  className="flex-1 outline-none ml-3 bg-transparent text-foreground placeholder:text-muted-foreground text-base min-w-0"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="ml-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {showDropdown && results.length > 0 && (
                <ul className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-popover border border-border rounded-xl shadow-lg animate-in fade-in-0 zoom-in-95 duration-150">
                  {results.map(item => (
                    <li
                      key={item.id}
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect(item)}
                      className="px-4 py-3 hover:bg-accent cursor-pointer text-foreground transition-colors first:rounded-t-xl last:rounded-b-xl"
                    >
                      {item.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Anything Button */}
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={handleAnything}
              className={cn(
                "px-4 py-3 rounded-full text-sm font-medium transition-all border-2 whitespace-nowrap shrink-0 w-full sm:w-auto",
                value.includes('Anything')
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-accent text-accent-foreground border-border hover:border-primary"
              )}
            >
              Anything
            </button>
          </div>
        </div>

        {/* Selected Dishes Tags */}
        {value.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 px-1">
            {value.map((dish) => (
              <span
                key={dish}
                className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2"
              >
                {dish}
                <button
                  type="button"
                  onClick={() => removeDish(dish)}
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
