import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, X, Loader2, Check } from 'lucide-react';
import { useCitySearch } from '@/hooks/viviers/useCitySearch';
import { cn } from '@/lib/utils';

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CityAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Ville...",
  className 
}: CityAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(value || null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search for cities as user types
  const { data: cities = [], isLoading } = useCitySearch({
    search: inputValue,
    enabled: isOpen && inputValue.length >= 2 && !selectedCity,
  });

  // Sync external value changes
  useEffect(() => {
    if (value !== inputValue && value !== selectedCity) {
      setInputValue(value);
      setSelectedCity(value || null);
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedCity(null);
    setIsOpen(true);
    
    // If cleared, reset filter immediately
    if (!newValue) {
      onChange('');
    }
  };

  const handleSelectCity = (city: string) => {
    setInputValue(city);
    setSelectedCity(city);
    setIsOpen(false);
    onChange(city); // This will be used as exact match
  };

  const handleClear = () => {
    setInputValue('');
    setSelectedCity(null);
    setIsOpen(false);
    onChange('');
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    if (inputValue.length >= 2 && !selectedCity) {
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && cities.length > 0 && !selectedCity) {
      e.preventDefault();
      handleSelectCity(cities[0]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground z-10" />
      <Input
        ref={inputRef}
        placeholder={placeholder}
        className={cn(
          "pl-8 h-9 w-[160px] pr-8",
          selectedCity && "border-primary/50 bg-primary/5"
        )}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
      />
      
      {/* Loading or clear button */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : selectedCity ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 hover:bg-transparent"
            onClick={handleClear}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </Button>
        ) : inputValue ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 hover:bg-transparent"
            onClick={handleClear}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </Button>
        ) : null}
      </div>

      {/* Dropdown */}
      {isOpen && cities.length > 0 && !selectedCity && (
        <div className="absolute z-50 top-full left-0 mt-1 w-[200px] max-h-[200px] overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {cities.map((city) => (
            <button
              key={city}
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer text-left"
              onClick={() => handleSelectCity(city)}
            >
              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{city}</span>
            </button>
          ))}
          {cities.length >= 50 && (
            <div className="px-2 py-1 text-xs text-muted-foreground border-t mt-1 pt-1">
              Affinez votre recherche pour plus de résultats
            </div>
          )}
        </div>
      )}

      {/* No results hint */}
      {isOpen && inputValue.length >= 2 && !isLoading && cities.length === 0 && !selectedCity && (
        <div className="absolute z-50 top-full left-0 mt-1 w-[200px] rounded-md border bg-popover p-2 shadow-md">
          <p className="text-xs text-muted-foreground">
            Aucune ville trouvée pour "{inputValue}"
          </p>
        </div>
      )}

      {/* Selected indicator */}
      {selectedCity && (
        <div className="absolute -top-1 -right-1">
          <div className="h-3 w-3 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-2 w-2 text-primary-foreground" />
          </div>
        </div>
      )}
    </div>
  );
}
