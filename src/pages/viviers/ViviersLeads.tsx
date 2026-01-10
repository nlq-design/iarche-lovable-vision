import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VivierLayout } from '@/components/viviers/VivierLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Upload, Trash2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import LogoArc from '@/components/ui/LogoArc';
import { useViviers, type Vivier } from '@/hooks/viviers';
import { VivierTable } from '@/components/viviers/VivierTable';
import { VivierFilters } from '@/components/viviers/VivierFilters';
import { generateVivierSlug } from './VivierLeadDetail';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function ViviersLeads() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [minScore, setMinScore] = useState<number | undefined>();
  const [maxScore, setMaxScore] = useState<number | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { 
    viviers, 
    totalCount, 
    totalPages, 
    isLoading,
    bulkDeleteViviers,
    refetch,
  } = useViviers({ 
    page, 
    pageSize: 25, 
    search: search || undefined,
    status: status && status !== 'all' ? status : undefined,
    minScore,
    maxScore,
  });

  const handleSelectChange = (id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(new Set(viviers.map(v => v.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleRowClick = (vivier: Vivier) => {
    const slug = generateVivierSlug(vivier);
    navigate(`/viviers/leads/${slug}`);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size > 0) {
      bulkDeleteViviers.mutate(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      const { error } = await supabase
        .from('viviers')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['viviers'] });
      queryClient.invalidateQueries({ queryKey: ['viviers-stats'] });
      toast.success('Tous les leads ont été supprimés');
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setMinScore(undefined);
    setMaxScore(undefined);
    setPage(1);
  };

  return (
    <VivierLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leads Vivier</h1>
            <LogoArc size="sm" className="mt-2" />
            <p className="text-muted-foreground mt-2">
              Gérez vos leads froids avant promotion vers le CRM
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedIds.size > 0 && (
              <Button variant="destructive" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer ({selectedIds.size})
              </Button>
            )}
            {totalCount > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive border-destructive/50 hover:bg-destructive/10">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Tout supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-h-[85vh] overflow-auto">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-5 h-5" />
                      Supprimer tous les leads ?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est <strong>irréversible</strong>. Vous êtes sur le point de supprimer <strong>{totalCount} lead{totalCount > 1 ? 's' : ''}</strong> du vivier.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAll} 
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isDeletingAll}
                    >
                      {isDeletingAll ? 'Suppression...' : 'Oui, tout supprimer'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button asChild>
              <Link to="/viviers/import">
                <Upload className="w-4 h-4 mr-2" />
                Importer
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <VivierFilters
              search={search}
              onSearchChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              status={status}
              onStatusChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              minScore={minScore}
              maxScore={maxScore}
              onScoreChange={(min, max) => {
                setMinScore(min);
                setMaxScore(max);
                setPage(1);
              }}
              onClearFilters={handleClearFilters}
            />
          </CardContent>
        </Card>

        {/* Content */}
        {!isLoading && viviers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun lead dans le vivier</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                {search || status || minScore || maxScore 
                  ? "Aucun lead ne correspond à vos critères de recherche."
                  : "Importez vos leads froids depuis un fichier CSV ou XLSX pour commencer."}
              </p>
              {!search && !status && !minScore && !maxScore && (
                <Button asChild>
                  <Link to="/viviers/import">
                    <Upload className="w-4 h-4 mr-2" />
                    Importer des leads
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <VivierTable
            viviers={viviers}
            isLoading={isLoading}
            selectedIds={selectedIds}
            onSelectChange={handleSelectChange}
            onSelectAll={handleSelectAll}
            onRowClick={handleRowClick}
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            onPageChange={setPage}
          />
        )}
      </div>
    </VivierLayout>
  );
}
