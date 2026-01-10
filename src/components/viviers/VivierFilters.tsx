import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, SlidersHorizontal, Download, MapPin, Building2, Briefcase } from 'lucide-react';
import { VIVIER_STATUSES } from '@/hooks/viviers/useViviers';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useState, useEffect, useCallback } from 'react';

interface VivierFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  minScore: number | undefined;
  maxScore: number | undefined;
  onScoreChange: (min: number | undefined, max: number | undefined) => void;
  city?: string;
  onCityChange?: (value: string) => void;
  postalCode?: string;
  onPostalCodeChange?: (value: string) => void;
  industry?: string;
  onIndustryChange?: (value: string) => void;
  onClearFilters: () => void;
  onExport?: () => void;
  isExporting?: boolean;
  totalCount?: number;
}

// Debounce hook for optimized input handling
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function VivierFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  minScore,
  maxScore,
  onScoreChange,
  city,
  onCityChange,
  postalCode,
  onPostalCodeChange,
  industry,
  onIndustryChange,
  onClearFilters,
  onExport,
  isExporting,
  totalCount = 0,
}: VivierFiltersProps) {
  const [scoreRange, setScoreRange] = useState<[number, number]>([minScore || 0, maxScore || 100]);
  const [localSearch, setLocalSearch] = useState(search);
  const [localCity, setLocalCity] = useState(city || '');
  const [localPostalCode, setLocalPostalCode] = useState(postalCode || '');
  const [localIndustry, setLocalIndustry] = useState(industry || '');
  
  // Debounce all text inputs for performance (300ms delay)
  const debouncedSearch = useDebounce(localSearch, 300);
  const debouncedCity = useDebounce(localCity, 300);
  const debouncedPostalCode = useDebounce(localPostalCode, 300);
  const debouncedIndustry = useDebounce(localIndustry, 300);

  // Apply debounced values
  useEffect(() => {
    if (debouncedSearch !== search) {
      onSearchChange(debouncedSearch);
    }
  }, [debouncedSearch, search, onSearchChange]);

  useEffect(() => {
    if (onCityChange && debouncedCity !== city) {
      onCityChange(debouncedCity);
    }
  }, [debouncedCity, city, onCityChange]);

  useEffect(() => {
    if (onPostalCodeChange && debouncedPostalCode !== postalCode) {
      onPostalCodeChange(debouncedPostalCode);
    }
  }, [debouncedPostalCode, postalCode, onPostalCodeChange]);

  useEffect(() => {
    if (onIndustryChange && debouncedIndustry !== industry) {
      onIndustryChange(debouncedIndustry);
    }
  }, [debouncedIndustry, industry, onIndustryChange]);

  const hasFilters = search || status || minScore !== undefined || maxScore !== undefined || city || postalCode || industry;
  const activeFilterCount = [
    search, 
    status && status !== 'all', 
    minScore !== undefined || maxScore !== undefined,
    city,
    postalCode,
    industry
  ].filter(Boolean).length;

  const handleScoreApply = () => {
    onScoreChange(
      scoreRange[0] > 0 ? scoreRange[0] : undefined,
      scoreRange[1] < 100 ? scoreRange[1] : undefined
    );
  };

  const handleClearAll = () => {
    setLocalSearch('');
    setLocalCity('');
    setLocalPostalCode('');
    setLocalIndustry('');
    setScoreRange([0, 100]);
    onClearFilters();
  };

  return (
    <div className="space-y-3">
      {/* Main row: Search + Export */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par email, entreprise, nom..."
            className="pl-10"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>

        {/* Export button */}
        {onExport && (
          <Button 
            variant="outline" 
            onClick={onExport} 
            disabled={isExporting || totalCount === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Export...' : `Exporter${totalCount > 0 ? ` (${totalCount.toLocaleString('fr-FR')})` : ''}`}
          </Button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Status filter */}
        <Select value={status || 'all'} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {Object.entries(VIVIER_STATUSES).map(([value, config]) => (
              <SelectItem key={value} value={value}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${config.color}`} />
                  {config.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Score filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-9">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Score
              {(minScore !== undefined || maxScore !== undefined) && (
                <span className="text-xs bg-primary text-primary-foreground px-1.5 rounded-sm">
                  {minScore || 0}-{maxScore || 100}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Plage de score</Label>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={scoreRange}
                  onValueChange={(value) => setScoreRange(value as [number, number])}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{scoreRange[0]}</span>
                  <span>{scoreRange[1]}</span>
                </div>
              </div>
              <Button size="sm" onClick={handleScoreApply} className="w-full">
                Appliquer
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* City filter */}
        {onCityChange && (
          <div className="relative">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Ville..."
              className="pl-8 h-9 w-[130px]"
              value={localCity}
              onChange={(e) => setLocalCity(e.target.value)}
            />
          </div>
        )}

        {/* Postal code filter */}
        {onPostalCodeChange && (
          <Input
            placeholder="Code postal..."
            className="h-9 w-[110px]"
            value={localPostalCode}
            onChange={(e) => setLocalPostalCode(e.target.value)}
          />
        )}

        {/* Industry filter */}
        {onIndustryChange && (
          <div className="relative">
            <Briefcase className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Secteur..."
              className="pl-8 h-9 w-[140px]"
              value={localIndustry}
              onChange={(e) => setLocalIndustry(e.target.value)}
            />
          </div>
        )}

        {/* Clear filters */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-9 gap-1.5">
            <X className="h-3.5 w-3.5" />
            Effacer{activeFilterCount > 1 ? ` (${activeFilterCount})` : ''}
          </Button>
        )}
      </div>
    </div>
  );
}
