import { useState, useEffect, useRef, useMemo } from 'react';
import Fuse from 'fuse.js';
import { Globe, X } from 'lucide-react';
import { cuisines } from '@/data/cuisines';
import { cn } from '@/lib/utils';

interface CuisineMultiSelectProps {
  value: string[];
  onChange: (cuisines: string[]) => void;
  placeholder?: string;
}

export function CuisineMultiSelect({ value, onChange, placeholder = "Search cuisines..." }: CuisineMultiSelectProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<typeof cuisines[number][]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fuse = useMemo(() => new Fuse([...cuisines], {
    keys: ['name'],
    threshold: 0.3
  }), []);

  const saveCustomValue = () => {
    if (query.trim() && !value.includes(query.trim())) {
      onChange([...value, query.trim()]);
      setQuery('');
      setResults([]);
      setShowDropdown(false);
    }
  };

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
    // Filter out already selected cuisines
    const filtered = matched.filter(item => !value.includes(item.name));
    setResults(filtered.slice(0, 10));
  }, [query, fuse, value]);

  const handleSelect = (item: typeof cuisines[number]) => {
    if (!value.includes(item.name)) {
      onChange([...value, item.name]);
    }
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  const removeCuisine = (cuisineName: string) => {
    onChange(value.filter(c => c !== cuisineName));
  };

  return (
    <div className="w-full">
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <div className="flex items-center border-2 border-border rounded-full px-4 py-3 bg-background shadow-sm focus-within:border-primary transition-colors">
            <Globe className="h-5 w-5 text-muted-foreground shrink-0" />
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
              className="flex-1 outline-none ml-3 bg-transparent text-foreground placeholder:text-muted-foreground text-base"
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

          {showDropdown && results.length > 0 && (
            <ul className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-popover border border-border rounded-xl shadow-lg animate-in fade-in-0 zoom-in-95 duration-150">
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
      </div>

      {/* Selected Cuisines Tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3 px-1">
          {value.map((cuisine) => (
            <span
              key={cuisine}
              className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2"
            >
              {cuisine}
              <button
                type="button"
                onClick={() => removeCuisine(cuisine)}
                className="text-primary hover:text-primary/80 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
