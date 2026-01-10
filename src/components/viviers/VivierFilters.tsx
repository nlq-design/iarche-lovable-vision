import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { VIVIER_STATUSES } from '@/hooks/viviers/useViviers';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useState } from 'react';

interface VivierFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  minScore: number | undefined;
  maxScore: number | undefined;
  onScoreChange: (min: number | undefined, max: number | undefined) => void;
  onClearFilters: () => void;
}

export function VivierFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  minScore,
  maxScore,
  onScoreChange,
  onClearFilters,
}: VivierFiltersProps) {
  const [scoreRange, setScoreRange] = useState<[number, number]>([minScore || 0, maxScore || 100]);
  const hasFilters = search || status || minScore !== undefined || maxScore !== undefined;

  const handleScoreApply = () => {
    onScoreChange(
      scoreRange[0] > 0 ? scoreRange[0] : undefined,
      scoreRange[1] < 100 ? scoreRange[1] : undefined
    );
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par email, entreprise, nom..."
          className="pl-10"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Status filter */}
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Tous les statuts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
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
          <Button variant="outline" className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Score
            {(minScore !== undefined || maxScore !== undefined) && (
              <span className="text-xs bg-primary text-primary-foreground px-1.5 rounded">
                {minScore || 0}-{maxScore || 100}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plage de score</Label>
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

      {/* Clear filters */}
      {hasFilters && (
        <Button variant="ghost" size="icon" onClick={onClearFilters}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
