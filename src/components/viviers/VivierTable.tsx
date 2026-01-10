import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Building2, Mail, MapPin, Phone, Hash, Briefcase } from 'lucide-react';
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
      return <Badge variant="outline" className="text-muted-foreground">-</Badge>;
    }
    if (score >= 80) return <Badge className="bg-green-500">{score}</Badge>;
    if (score >= 60) return <Badge className="bg-emerald-500">{score}</Badge>;
    if (score >= 40) return <Badge className="bg-yellow-500">{score}</Badge>;
    return <Badge className="bg-red-500">{score}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => onSelectAll(!!checked)}
                  aria-label="Sélectionner tout"
                  className={someSelected ? 'data-[state=checked]:bg-primary' : ''}
                />
              </TableHead>
              <TableHead>Entreprise</TableHead>
              <TableHead>Dirigeant</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Localisation</TableHead>
              <TableHead>Activité</TableHead>
              <TableHead>SIRET</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {viviers.map((vivier) => {
              const statusConfig = VIVIER_STATUSES[(vivier.status as keyof typeof VIVIER_STATUSES) || 'new'];
              
              // Build display name for contact
              const contactDisplay = vivier.contact_name || 
                [vivier.contact_first_name, vivier.contact_last_name].filter(Boolean).join(' ') ||
                '';
              
              return (
                <TableRow 
                  key={vivier.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => onRowClick(vivier)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(vivier.id)}
                      onCheckedChange={(checked) => onSelectChange(vivier.id, !!checked)}
                      aria-label={`Sélectionner ${vivier.company_name || vivier.email}`}
                    />
                  </TableCell>
                  
                  {/* Entreprise (NOM) */}
                  <TableCell>
                    <div className="max-w-[180px]">
                      <p className="font-medium text-sm truncate">{vivier.company_name || '-'}</p>
                      {vivier.legal_form && (
                        <p className="text-xs text-muted-foreground truncate">{vivier.legal_form}</p>
                      )}
                    </div>
                  </TableCell>
                  
                  {/* Dirigeant */}
                  <TableCell>
                    <p className="text-sm truncate max-w-[150px]">{contactDisplay || '-'}</p>
                  </TableCell>
                  
                  {/* Contact (Email + Phone) */}
                  <TableCell>
                    <div className="space-y-0.5 max-w-[200px]">
                      {vivier.email && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{vivier.email}</span>
                        </p>
                      )}
                      {vivier.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          {vivier.phone}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  
                  {/* Localisation (Ville + CP) */}
                  <TableCell>
                    {(vivier.city || vivier.postal_code) ? (
                      <div className="flex items-center gap-1.5 text-sm max-w-[150px]">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">
                          {[vivier.postal_code, vivier.city].filter(Boolean).join(' ')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  
                  {/* Activité */}
                  <TableCell>
                    <p className="text-sm truncate max-w-[150px]" title={vivier.industry || ''}>
                      {vivier.industry || '-'}
                    </p>
                  </TableCell>
                  
                  {/* SIRET */}
                  <TableCell>
                    {vivier.siret ? (
                      <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                        {vivier.siret}
                      </code>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  
                  {/* Score */}
                  <TableCell className="text-center">
                    {getScoreBadge(vivier.cold_score)}
                  </TableCell>
                  
                  {/* Statut */}
                  <TableCell>
                    <Badge variant="outline" className={`${statusConfig.color} text-white border-0`}>
                      {statusConfig.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalCount} lead{totalCount > 1 ? 's' : ''} au total
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
          <span className="text-sm text-muted-foreground">
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
