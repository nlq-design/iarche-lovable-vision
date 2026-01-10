import { useState } from 'react';
import { VivierLayout } from '@/components/viviers/VivierLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Upload, Trash2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import LogoArc from '@/components/ui/LogoArc';
import { useViviers, type Vivier } from '@/hooks/viviers';
import { VivierTable } from '@/components/viviers/VivierTable';
import { VivierFilters } from '@/components/viviers/VivierFilters';
import { VivierDetailSheet } from '@/components/viviers/VivierDetailSheet';

export default function ViviersLeads() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [minScore, setMinScore] = useState<number | undefined>();
  const [maxScore, setMaxScore] = useState<number | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedVivier, setSelectedVivier] = useState<Vivier | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { 
    viviers, 
    totalCount, 
    totalPages, 
    isLoading,
    updateVivier,
    deleteVivier,
    bulkDeleteViviers,
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
    setSelectedVivier(vivier);
    setSheetOpen(true);
  };

  const handleSave = (data: Partial<Vivier>) => {
    if (data.id) {
      updateVivier.mutate(data as Vivier & { id: string });
    }
  };

  const handleDelete = (id: string) => {
    deleteVivier.mutate(id);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size > 0) {
      bulkDeleteViviers.mutate(Array.from(selectedIds));
      setSelectedIds(new Set());
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
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <Button variant="destructive" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer ({selectedIds.size})
              </Button>
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

      {/* Detail Sheet */}
      <VivierDetailSheet
        vivier={selectedVivier}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSave={handleSave}
        onDelete={handleDelete}
        isSaving={updateVivier.isPending}
      />
    </VivierLayout>
  );
}
