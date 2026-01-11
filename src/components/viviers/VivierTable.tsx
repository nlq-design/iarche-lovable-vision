import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Mail, MapPin, Phone, ExternalLink, Filter, X } from 'lucide-react';
import type { Vivier } from '@/hooks/viviers/useViviers';
import { VIVIER_STATUSES } from '@/hooks/viviers/useViviers';

export interface ColumnFilters {
  company: string;
  contact: string;
  email: string;
  location: string;
  industry: string;
  siret: string;
  score: string;
  status: string;
}

// Empty filters default value
export const emptyColumnFilters: ColumnFilters = {
  company: '',
  contact: '',
  email: '',
  location: '',
  industry: '',
  siret: '',
  score: '',
  status: '',
};

interface VivierTableProps {
  viviers: Vivier[];
  isLoading: boolean;
  selectedIds: Set<string>;
  onSelectChange: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onRowClick: (vivier: Vivier) => void;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  columnFilters: ColumnFilters;
  onColumnFiltersChange: (filters: ColumnFilters) => void;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

function FilterableHeader({ 
  label, 
  value, 
  onChange, 
  placeholder,
  type = 'text',
  options,
}: { 
  label: string; 
  value: string; 
  onChange: (v: string) => void; 
  placeholder?: string;
  type?: 'text' | 'select';
  options?: { value: string; label: string }[];
}) {
  const hasFilter = value.length > 0;
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-auto p-0 font-medium hover:bg-transparent gap-1 ${hasFilter ? 'text-primary' : ''}`}
        >
          {label}
          <Filter className={`h-3 w-3 ${hasFilter ? 'text-primary fill-primary/20' : 'text-muted-foreground'}`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="space-y-2">
          {type === 'select' && options ? (
            <Select value={value || 'all'} onValueChange={(v) => onChange(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-8">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder={placeholder || `Filtrer ${label.toLowerCase()}...`}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="h-8"
              autoFocus
            />
          )}
          {hasFilter && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full h-7 text-xs" 
              onClick={() => onChange('')}
            >
              <X className="h-3 w-3 mr-1" />
              Effacer
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function VivierTable({
  viviers,
  isLoading,
  selectedIds,
  onSelectChange,
  onSelectAll,
  onRowClick,
  page,
  totalPages,
  totalCount,
  onPageChange,
  pageSize = 50,
  onPageSizeChange,
  columnFilters,
  onColumnFiltersChange,
}: VivierTableProps) {
  const updateFilter = (key: keyof ColumnFilters, value: string) => {
    onColumnFiltersChange({ ...columnFilters, [key]: value });
  };
  
  const hasColumnFilters = Object.values(columnFilters).some(v => v.length > 0);
  const activeColumnFilterCount = Object.values(columnFilters).filter(v => v.length > 0).length;
  
  // Filters are now applied server-side, use viviers directly
  const allSelected = viviers.length > 0 && viviers.every(v => selectedIds.has(v.id));
  const someSelected = viviers.some(v => selectedIds.has(v.id)) && !allSelected;

  const getScoreBadge = (score: number | null | undefined) => {
    if (score === null || score === undefined) {
      return <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground">-</Badge>;
    }
    if (score >= 80) return <Badge className="bg-green-500 text-xs px-1.5 py-0">{score}</Badge>;
    if (score >= 60) return <Badge className="bg-emerald-500 text-xs px-1.5 py-0">{score}</Badge>;
    if (score >= 40) return <Badge className="bg-yellow-500 text-xs px-1.5 py-0">{score}</Badge>;
    return <Badge className="bg-red-500 text-xs px-1.5 py-0">{score}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: Math.min(pageSize, 10) }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (viviers.length === 0 && !hasColumnFilters) {
    return null;
  }

  const scoreOptions = [
    { value: 'high', label: '≥70 (Élevé)' },
    { value: 'medium', label: '40-69 (Moyen)' },
    { value: 'low', label: '<40 (Faible)' },
    { value: 'none', label: 'Non scoré' },
  ];

  const statusOptions = Object.entries(VIVIER_STATUSES).map(([value, config]) => ({
    value,
    label: config.label,
  }));

  return (
    <div className="space-y-4">
      {/* Column filter indicator */}
      {hasColumnFilters && (
        <div className="flex items-center gap-2 px-1">
          <Badge variant="secondary" className="gap-1">
            <Filter className="h-3 w-3" />
            {activeColumnFilterCount} filtre{activeColumnFilterCount > 1 ? 's' : ''} colonne
          </Badge>
          <span className="text-sm text-muted-foreground">
            {totalCount.toLocaleString('fr-FR')} résultat{totalCount > 1 ? 's' : ''}
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs"
            onClick={() => onColumnFiltersChange(emptyColumnFilters)}
          >
            <X className="h-3 w-3 mr-1" />
            Effacer filtres colonnes
          </Button>
        </div>
      )}
      
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-10 px-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) => onSelectAll(!!checked)}
                    aria-label="Sélectionner tout"
                    className={someSelected ? 'data-[state=checked]:bg-primary' : ''}
                  />
                </TableHead>
                <TableHead className="min-w-[180px]">
                  <FilterableHeader 
                    label="Entreprise" 
                    value={columnFilters.company} 
                    onChange={(v) => updateFilter('company', v)} 
                  />
                </TableHead>
                <TableHead className="min-w-[140px]">
                  <FilterableHeader 
                    label="Dirigeant" 
                    value={columnFilters.contact} 
                    onChange={(v) => updateFilter('contact', v)} 
                  />
                </TableHead>
                <TableHead className="min-w-[200px]">
                  <FilterableHeader 
                    label="Contact" 
                    value={columnFilters.email} 
                    onChange={(v) => updateFilter('email', v)}
                    placeholder="Filtrer email..."
                  />
                </TableHead>
                <TableHead className="min-w-[130px]">
                  <FilterableHeader 
                    label="Localisation" 
                    value={columnFilters.location} 
                    onChange={(v) => updateFilter('location', v)} 
                  />
                </TableHead>
                <TableHead className="min-w-[150px]">
                  <FilterableHeader 
                    label="Activité" 
                    value={columnFilters.industry} 
                    onChange={(v) => updateFilter('industry', v)} 
                  />
                </TableHead>
                <TableHead className="min-w-[130px]">
                  <FilterableHeader 
                    label="SIRET" 
                    value={columnFilters.siret} 
                    onChange={(v) => updateFilter('siret', v)} 
                  />
                </TableHead>
                <TableHead className="w-16 text-center">
                  <FilterableHeader 
                    label="Score" 
                    value={columnFilters.score} 
                    onChange={(v) => updateFilter('score', v)}
                    type="select"
                    options={scoreOptions}
                  />
                </TableHead>
                <TableHead className="w-24">
                  <FilterableHeader 
                    label="Statut" 
                    value={columnFilters.status} 
                    onChange={(v) => updateFilter('status', v)}
                    type="select"
                    options={statusOptions}
                  />
                </TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viviers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Aucun lead ne correspond aux filtres
                  </TableCell>
                </TableRow>
              ) : (
                viviers.map((vivier) => {
                const statusConfig = VIVIER_STATUSES[(vivier.status as keyof typeof VIVIER_STATUSES) || 'new'];
                
                // Build display name for contact
                const contactDisplay = vivier.contact_name || 
                  [vivier.contact_first_name, vivier.contact_last_name].filter(Boolean).join(' ') ||
                  '';

                // Location display
                const location = [vivier.postal_code, vivier.city].filter(Boolean).join(' ');
                
                return (
                  <TableRow 
                    key={vivier.id}
                    className="cursor-pointer hover:bg-primary/5 transition-colors group"
                    onClick={() => onRowClick(vivier)}
                  >
                    <TableCell className="px-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(vivier.id)}
                        onCheckedChange={(checked) => onSelectChange(vivier.id, !!checked)}
                        aria-label={`Sélectionner ${vivier.company_name || vivier.email}`}
                      />
                    </TableCell>
                    
                    {/* Entreprise (NOM) */}
                    <TableCell className="py-2.5">
                      <div className="max-w-[180px]">
                        <p className="font-medium text-sm truncate text-foreground group-hover:text-primary transition-colors">
                          {vivier.company_name || <span className="text-muted-foreground italic">Sans nom</span>}
                        </p>
                        {vivier.legal_form && (
                          <p className="text-xs text-muted-foreground truncate">{vivier.legal_form}</p>
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Dirigeant */}
                    <TableCell className="py-2.5">
                      <p className="text-sm truncate max-w-[140px]">
                        {contactDisplay || <span className="text-muted-foreground">-</span>}
                      </p>
                    </TableCell>
                    
                    {/* Contact (Email + Phone) */}
                    <TableCell className="py-2.5">
                      <div className="space-y-0.5 max-w-[200px]">
                        {vivier.email ? (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                            <Mail className="h-3 w-3 flex-shrink-0 text-muted-foreground/70" />
                            <span className="truncate font-mono">{vivier.email}</span>
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground/50">Pas d'email</p>
                        )}
                        {vivier.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Phone className="h-3 w-3 flex-shrink-0 text-muted-foreground/70" />
                            <span className="font-mono">{vivier.phone}</span>
                          </p>
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Localisation (Ville + CP) */}
                    <TableCell className="py-2.5">
                      {location ? (
                        <div className="flex items-center gap-1.5 text-sm max-w-[130px]">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground/70 flex-shrink-0" />
                          <span className="truncate">{location}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    
                    {/* Activité */}
                    <TableCell className="py-2.5">
                      <p className="text-sm truncate max-w-[150px]" title={vivier.industry || ''}>
                        {vivier.industry || <span className="text-muted-foreground">-</span>}
                      </p>
                    </TableCell>
                    
                    {/* SIRET */}
                    <TableCell className="py-2.5">
                      {vivier.siret ? (
                        <code className="text-xs font-mono bg-muted/60 px-1.5 py-0.5 rounded text-muted-foreground">
                          {vivier.siret}
                        </code>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    
                    {/* Score */}
                    <TableCell className="text-center py-2.5">
                      {getScoreBadge(vivier.cold_score)}
                    </TableCell>
                    
                    {/* Statut */}
                    <TableCell className="py-2.5">
                      <Badge variant="outline" className={`${statusConfig.color} text-white border-0 text-xs px-2 py-0.5`}>
                        {statusConfig.label}
                      </Badge>
                    </TableCell>

                    {/* Action indicator */}
                    <TableCell className="py-2.5 pr-3">
                      <ExternalLink className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                    </TableCell>
                  </TableRow>
                );
              })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {totalCount.toLocaleString('fr-FR')} lead{totalCount > 1 ? 's' : ''}
          </p>
          {onPageSizeChange && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Afficher</span>
              <Select value={pageSize.toString()} onValueChange={(v) => onPageSizeChange(Number(v))}>
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">par page</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* First page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            className="h-8 w-8 p-0"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          
          {/* Previous page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {/* Page selector */}
          <div className="flex items-center gap-1.5 mx-1">
            <span className="text-sm text-muted-foreground">Page</span>
            <Select value={page.toString()} onValueChange={(v) => onPageChange(Number(v))}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {Array.from({ length: Math.min(totalPages || 1, 100) }, (_, i) => i + 1).map((p) => (
                  <SelectItem key={p} value={p.toString()}>
                    {p}
                  </SelectItem>
                ))}
                {totalPages > 100 && (
                  <>
                    <SelectItem value="..." disabled>...</SelectItem>
                    <SelectItem value={totalPages.toString()}>{totalPages}</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">/ {totalPages || 1}</span>
          </div>
          
          {/* Next page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          {/* Last page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}