import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Building2, Mail, MapPin } from 'lucide-react';
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

  const getDisplayName = (vivier: Vivier) => {
    return vivier.contact_name || 
      [vivier.contact_first_name, vivier.contact_last_name].filter(Boolean).join(' ') ||
      vivier.company_name || 
      vivier.email || 
      'Sans nom';
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
      <div className="border rounded-lg overflow-hidden">
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
              <TableHead>Contact</TableHead>
              <TableHead>Entreprise</TableHead>
              <TableHead>Localisation</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {viviers.map((vivier) => {
              const statusConfig = VIVIER_STATUSES[(vivier.status as keyof typeof VIVIER_STATUSES) || 'new'];
              
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
                      aria-label={`Sélectionner ${getDisplayName(vivier)}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{getDisplayName(vivier)}</p>
                      {vivier.email && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {vivier.email}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {vivier.company_name && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{vivier.company_name}</span>
                      </div>
                    )}
                    {vivier.industry && (
                      <p className="text-xs text-muted-foreground mt-0.5">{vivier.industry}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {(vivier.city || vivier.region) && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {[vivier.city, vivier.region].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {getScoreBadge(vivier.cold_score)}
                  </TableCell>
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
