import { useState, useEffect, useRef, useMemo } from 'react';
import Fuse from 'fuse.js';
import { Flame, X } from 'lucide-react';
import { flavorMoods } from '@/data/flavorMoods';
import { cn } from '@/lib/utils';

interface FlavorMoodAutocompleteProps {
  value: { id: number; name: string } | null;
  onSelect: (item: { id: number; name: string } | null) => void;
}

export function FlavorMoodAutocomplete({ value, onSelect }: FlavorMoodAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<typeof flavorMoods[number][]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const justSelectedRef = useRef(false);

  const fuse = useMemo(() => new Fuse([...flavorMoods], {
    keys: ['name'],
    threshold: 0.3
  }), []);

  // Run search when query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const matched = fuse.search(query).map(r => r.item);
    setResults(matched.slice(0, 10));
  }, [query, fuse]);

  const saveCustomValue = () => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    const custom = query.trim();
    if (custom && !value) {
      onSelect({ id: -1, name: custom });
      setQuery(custom);
      setResults([]);
      setShowDropdown(false);
    }
  };

  const handleSelect = (item: typeof flavorMoods[number]) => {
    justSelectedRef.current = true;
    onSelect({ id: item.id, name: item.name });
    setQuery(item.name);
    setResults([]);
    setShowDropdown(false);
  };

  const handleAnything = () => {
    justSelectedRef.current = true;
    onSelect({ id: 0, name: 'Anything' });
    setQuery('Anything');
    setResults([]);
    setShowDropdown(false);
  };

  const clearSelection = () => {
    onSelect(null);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Flavor Mood</h3>
        <p className="text-sm text-muted-foreground">Search or pick any taste</p>
      </div>

      <div className="relative" ref={dropdownRef}>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 min-w-0">
            <div className="flex items-center border-2 border-border rounded-full px-4 py-3 bg-background shadow-sm focus-within:border-primary transition-colors">
              <Flame className="h-5 w-5 text-muted-foreground shrink-0" />
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
                placeholder="Search flavors..."
                className="flex-1 outline-none ml-3 bg-transparent text-foreground placeholder:text-muted-foreground min-w-0"
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
              <ul className="absolute z-50 w-full mt-2 max-h-60 overflow-y-auto bg-popover border border-border rounded-xl shadow-lg">
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

          <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={handleAnything}
            className={cn(
              "px-4 py-3 rounded-full text-sm font-medium transition-all border-2 whitespace-nowrap shrink-0 w-full sm:w-auto",
              value?.name === 'Anything'
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-accent text-accent-foreground border-border hover:border-primary"
            )}
          >
            Anything
          </button>
        </div>

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
