import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Mail, MapPin, Phone, ExternalLink } from 'lucide-react';
import type { Vivier } from '@/hooks/viviers/useViviers';
import { VIVIER_STATUSES } from '@/hooks/viviers/useViviers';

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
}: VivierTableProps) {
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
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (viviers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
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
                <TableHead className="min-w-[180px]">Entreprise</TableHead>
                <TableHead className="min-w-[140px]">Dirigeant</TableHead>
                <TableHead className="min-w-[200px]">Contact</TableHead>
                <TableHead className="min-w-[130px]">Localisation</TableHead>
                <TableHead className="min-w-[150px]">Activité</TableHead>
                <TableHead className="min-w-[130px]">SIRET</TableHead>
                <TableHead className="w-16 text-center">Score</TableHead>
                <TableHead className="w-24">Statut</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viviers.map((vivier) => {
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
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-muted-foreground">
          {totalCount.toLocaleString('fr-FR')} lead{totalCount > 1 ? 's' : ''} au total
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[100px] text-center">
            Page {page} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}