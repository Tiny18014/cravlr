import { useState, useEffect, useRef, useMemo } from 'react';
import Fuse from 'fuse.js';
import { UtensilsCrossed, X } from 'lucide-react';
import { dishTypes } from '@/data/dishTypes';
import { cn } from '@/lib/utils';

interface DishTypeAutocompleteProps {
  value: { id: number; name: string } | null;
  onSelect: (item: { id: number; name: string } | null) => void;
}

export function DishTypeAutocomplete({ value, onSelect }: DishTypeAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<typeof dishTypes[number][]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const justSelectedRef = useRef(false);

  const fuse = useMemo(() => new Fuse([...dishTypes], {
    keys: ['name'],
    threshold: 0.3
  }), []);

  const saveCustomValue = () => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    if (query.trim() && !value) {
      onSelect({ id: -1, name: query.trim() });
      setQuery('');
      setResults([]);
      setShowDropdown(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        saveCustomValue();
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [query, value]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const matched = fuse.search(query).map(r => r.item);
    setResults(matched.slice(0, 10));
  }, [query, fuse]);

  const handleSelect = (item: typeof dishTypes[number]) => {
    justSelectedRef.current = true;
    onSelect({ id: item.id, name: item.name });
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  const handleAnything = () => {
    onSelect({ id: 0, name: 'Anything' });
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  const clearSelection = () => {
    onSelect(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Dish Type</h3>
        <p className="text-sm text-muted-foreground">Type what you're craving or tap Anything</p>
      </div>

      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
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
                placeholder="Search dishes..."
                className="flex-1 outline-none ml-3 bg-transparent text-foreground placeholder:text-muted-foreground"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Dropdown */}
            {showDropdown && results.length > 0 && (
              <ul className="absolute z-10 w-full mt-2 max-h-60 overflow-y-auto bg-background border border-border rounded-xl shadow-lg">
                {results.map(item => (
                  <li
                    key={item.id}
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
            onClick={handleAnything}
            className={cn(
              "px-4 py-3 rounded-full text-sm font-medium transition-all border-2 whitespace-nowrap",
              value?.name === 'Anything'
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-accent text-accent-foreground border-border hover:border-primary"
            )}
          >
            Anything
          </button>
        </div>

        {/* Selected Chip */}
        {value && (
          <div className="flex items-center gap-2 mt-3">
            <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2">
              {value.name}
              <button
                type="button"
                onClick={clearSelection}
                className="text-primary hover:text-primary/80 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
