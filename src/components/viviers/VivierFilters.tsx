import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, SlidersHorizontal, Download, MapPin, Briefcase, ListPlus, Building2, Mail, Phone } from 'lucide-react';
import { VIVIER_STATUSES } from '@/hooks/viviers/useViviers';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { useState, useEffect } from 'react';
import { SaveToListDialog, type FilterCriteria } from './SaveToListDialog';

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
  department?: string;
  onDepartmentChange?: (value: string) => void;
  industry?: string;
  onIndustryChange?: (value: string) => void;
  companySize?: string;
  onCompanySizeChange?: (value: string) => void;
  hasEmail?: boolean;
  onHasEmailChange?: (value: boolean | undefined) => void;
  hasPhone?: boolean;
  onHasPhoneChange?: (value: boolean | undefined) => void;
  onClearFilters: () => void;
  onExport?: () => void;
  isExporting?: boolean;
  totalCount?: number;
  selectedIds?: string[];
}

// French departments
const DEPARTMENTS: Record<string, string> = {
  '01': 'Ain', '02': 'Aisne', '03': 'Allier', '04': 'Alpes-de-Haute-Provence', '05': 'Hautes-Alpes',
  '06': 'Alpes-Maritimes', '07': 'Ardèche', '08': 'Ardennes', '09': 'Ariège', '10': 'Aube',
  '11': 'Aude', '12': 'Aveyron', '13': 'Bouches-du-Rhône', '14': 'Calvados', '15': 'Cantal',
  '16': 'Charente', '17': 'Charente-Maritime', '18': 'Cher', '19': 'Corrèze', '21': 'Côte-d\'Or',
  '22': 'Côtes-d\'Armor', '23': 'Creuse', '24': 'Dordogne', '25': 'Doubs', '26': 'Drôme',
  '27': 'Eure', '28': 'Eure-et-Loir', '29': 'Finistère', '2A': 'Corse-du-Sud', '2B': 'Haute-Corse',
  '30': 'Gard', '31': 'Haute-Garonne', '32': 'Gers', '33': 'Gironde', '34': 'Hérault',
  '35': 'Ille-et-Vilaine', '36': 'Indre', '37': 'Indre-et-Loire', '38': 'Isère', '39': 'Jura',
  '40': 'Landes', '41': 'Loir-et-Cher', '42': 'Loire', '43': 'Haute-Loire', '44': 'Loire-Atlantique',
  '45': 'Loiret', '46': 'Lot', '47': 'Lot-et-Garonne', '48': 'Lozère', '49': 'Maine-et-Loire',
  '50': 'Manche', '51': 'Marne', '52': 'Haute-Marne', '53': 'Mayenne', '54': 'Meurthe-et-Moselle',
  '55': 'Meuse', '56': 'Morbihan', '57': 'Moselle', '58': 'Nièvre', '59': 'Nord',
  '60': 'Oise', '61': 'Orne', '62': 'Pas-de-Calais', '63': 'Puy-de-Dôme', '64': 'Pyrénées-Atlantiques',
  '65': 'Hautes-Pyrénées', '66': 'Pyrénées-Orientales', '67': 'Bas-Rhin', '68': 'Haut-Rhin', '69': 'Rhône',
  '70': 'Haute-Saône', '71': 'Saône-et-Loire', '72': 'Sarthe', '73': 'Savoie', '74': 'Haute-Savoie',
  '75': 'Paris', '76': 'Seine-Maritime', '77': 'Seine-et-Marne', '78': 'Yvelines', '79': 'Deux-Sèvres',
  '80': 'Somme', '81': 'Tarn', '82': 'Tarn-et-Garonne', '83': 'Var', '84': 'Vaucluse',
  '85': 'Vendée', '86': 'Vienne', '87': 'Haute-Vienne', '88': 'Vosges', '89': 'Yonne',
  '90': 'Territoire de Belfort', '91': 'Essonne', '92': 'Hauts-de-Seine', '93': 'Seine-Saint-Denis',
  '94': 'Val-de-Marne', '95': 'Val-d\'Oise', '971': 'Guadeloupe', '972': 'Martinique',
  '973': 'Guyane', '974': 'La Réunion', '976': 'Mayotte',
};

const COMPANY_SIZES = [
  { value: 'micro', label: 'Micro (1-9)' },
  { value: 'small', label: 'Petite (10-49)' },
  { value: 'medium', label: 'Moyenne (50-249)' },
  { value: 'large', label: 'Grande (250+)' },
];

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
  department,
  onDepartmentChange,
  industry,
  onIndustryChange,
  companySize,
  onCompanySizeChange,
  hasEmail,
  onHasEmailChange,
  hasPhone,
  onHasPhoneChange,
  onClearFilters,
  onExport,
  isExporting,
  totalCount = 0,
  selectedIds = [],
}: VivierFiltersProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  
  const currentFilters: FilterCriteria = {
    search: search || undefined,
    status: status && status !== 'all' ? status : undefined,
    minScore,
    maxScore,
    city: city || undefined,
    postalCode: postalCode || undefined,
    department: department || undefined,
    industry: industry || undefined,
    companySize: companySize || undefined,
    hasEmail,
    hasPhone,
  };
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

  const hasFilters = search || status || minScore !== undefined || maxScore !== undefined || city || postalCode || department || industry || companySize || hasEmail !== undefined || hasPhone !== undefined;
  const activeFilterCount = [
    search, 
    status && status !== 'all', 
    minScore !== undefined || maxScore !== undefined,
    city,
    postalCode,
    department,
    industry,
    companySize,
    hasEmail !== undefined,
    hasPhone !== undefined,
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
    if (onDepartmentChange) onDepartmentChange('');
    if (onCompanySizeChange) onCompanySizeChange('');
    if (onHasEmailChange) onHasEmailChange(undefined);
    if (onHasPhoneChange) onHasPhoneChange(undefined);
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

        {/* Save to List button */}
        <Button 
          variant="outline" 
          onClick={() => setShowSaveDialog(true)} 
          disabled={totalCount === 0}
          className="gap-2"
        >
          <ListPlus className="h-4 w-4" />
          {selectedIds.length > 0 
            ? `Liste (${selectedIds.length})` 
            : `Sauvegarder${totalCount > 0 ? ` (${totalCount.toLocaleString('fr-FR')})` : ''}`}
        </Button>

        {/* Export button */}
        {onExport && (
          <Button 
            variant="outline" 
            onClick={onExport} 
            disabled={isExporting || totalCount === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Export...' : 'XLSX'}
          </Button>
        )}
      </div>

      {/* Save to List Dialog */}
      <SaveToListDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        filters={currentFilters}
        totalCount={totalCount}
        selectedIds={selectedIds}
      />

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
            className="h-9 w-[100px]"
            value={localPostalCode}
            onChange={(e) => setLocalPostalCode(e.target.value)}
          />
        )}

        {/* Department filter */}
        {onDepartmentChange && (
          <Select value={department || 'all'} onValueChange={(v) => onDepartmentChange(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Département" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="all">Tous dép.</SelectItem>
              {Object.entries(DEPARTMENTS).map(([code, name]) => (
                <SelectItem key={code} value={code}>
                  {code} - {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Industry filter */}
        {onIndustryChange && (
          <div className="relative">
            <Briefcase className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Secteur..."
              className="pl-8 h-9 w-[130px]"
              value={localIndustry}
              onChange={(e) => setLocalIndustry(e.target.value)}
            />
          </div>
        )}

        {/* Company size filter */}
        {onCompanySizeChange && (
          <Select value={companySize || 'all'} onValueChange={(v) => onCompanySizeChange(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[130px] h-9">
              <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Taille" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes tailles</SelectItem>
              {COMPANY_SIZES.map((size) => (
                <SelectItem key={size.value} value={size.value}>
                  {size.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Data quality filters */}
        {(onHasEmailChange || onHasPhoneChange) && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-9">
                Qualité
                {(hasEmail !== undefined || hasPhone !== undefined) && (
                  <span className="text-xs bg-primary text-primary-foreground px-1.5 rounded-sm">
                    {[hasEmail !== undefined, hasPhone !== undefined].filter(Boolean).length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52" align="start">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Qualité des données</Label>
                {onHasEmailChange && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="has-email"
                      checked={hasEmail === true}
                      onCheckedChange={(checked) => {
                        onHasEmailChange(checked === true ? true : undefined);
                      }}
                    />
                    <label htmlFor="has-email" className="text-sm flex items-center gap-1.5 cursor-pointer">
                      <Mail className="h-3.5 w-3.5" />
                      A un email
                    </label>
                  </div>
                )}
                {onHasPhoneChange && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="has-phone"
                      checked={hasPhone === true}
                      onCheckedChange={(checked) => {
                        onHasPhoneChange(checked === true ? true : undefined);
                      }}
                    />
                    <label htmlFor="has-phone" className="text-sm flex items-center gap-1.5 cursor-pointer">
                      <Phone className="h-3.5 w-3.5" />
                      A un téléphone
                    </label>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
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
