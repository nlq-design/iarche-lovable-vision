import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { VivierLayout } from '@/components/viviers/VivierLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Upload, Trash2, AlertTriangle, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import LogoArc from '@/components/ui/LogoArc';
import { useViviers, useVivierFilterOptions, type Vivier } from '@/hooks/viviers';
import { VivierTable, type ColumnFilters, emptyColumnFilters } from '@/components/viviers/VivierTable';
import { VivierFilters } from '@/components/viviers/VivierFilters';
import { VivierAISearch } from '@/components/viviers/VivierAISearch';
import { VivierScoringPanel } from '@/components/viviers/VivierScoringPanel';
import { VivierListsPanel } from '@/components/viviers/VivierListsPanel';
import { generateVivierSlug } from './VivierLeadDetail';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';

export default function ViviersLeads() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [minScore, setMinScore] = useState<number | undefined>();
  const [maxScore, setMaxScore] = useState<number | undefined>();
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [department, setDepartment] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [hasEmail, setHasEmail] = useState<boolean | undefined>();
  const [hasPhone, setHasPhone] = useState<boolean | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showAITools, setShowAITools] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [pageSize, setPageSize] = useState(50);
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>(emptyColumnFilters);

  const { 
    viviers, 
    totalCount, 
    totalPages, 
    stats,
    isLoading,
    bulkDeleteViviers,
    refetch,
  } = useViviers({
    page, 
    pageSize, 
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
    columnFilters: {
      company: columnFilters.company || undefined,
      contact: columnFilters.contact || undefined,
      email: columnFilters.email || undefined,
      location: columnFilters.location || undefined,
      industry: columnFilters.industry || undefined,
      siret: columnFilters.siret || undefined,
      scoreRange: columnFilters.score as 'high' | 'medium' | 'low' | 'none' | undefined,
      statusFilter: columnFilters.status || undefined,
    },
  });

  // Fetch filter options for dropdowns - contextual based on filter 1
  const { data: filterOptions } = useVivierFilterOptions({
    status: status && status !== 'all' ? status : undefined,
    city: city || undefined,
    postalCode: postalCode || undefined,
    department: department || undefined,
    industry: industry || undefined,
    companySize: companySize || undefined,
    hasEmail,
    hasPhone,
    search: search || undefined,
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

  // Export function - fetches all filtered data and exports to XLSX
  const handleExport = useCallback(async () => {
    if (totalCount === 0) {
      toast.error('Aucun lead à exporter');
      return;
    }

    setIsExporting(true);
    try {
      // Build query with same filters but fetch all (with reasonable limit)
      let query = supabase
        .from('viviers')
        .select('company_name, contact_name, contact_first_name, contact_last_name, email, phone, city, postal_code, region, industry, siret, cold_score, status, created_at')
        .order('created_at', { ascending: false })
        .limit(50000); // Safety limit

      // Apply filters
      if (search) {
        query = query.or(`email.ilike.%${search}%,company_name.ilike.%${search}%,contact_name.ilike.%${search}%`);
      }
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      if (minScore !== undefined) {
        query = query.gte('cold_score', minScore);
      }
      if (maxScore !== undefined) {
        query = query.lte('cold_score', maxScore);
      }
      if (city) {
        query = query.ilike('city', `%${city}%`);
      }
      if (postalCode) {
        query = query.ilike('postal_code', `${postalCode}%`);
      }
      if (industry) {
        query = query.ilike('industry', `%${industry}%`);
      }

      // Apply column filters (layer 2) - only Entreprise, Localisation, Activité
      if (columnFilters.company) {
        query = query.eq('company_name', columnFilters.company);
      }
      if (columnFilters.location) {
        query = query.eq('city', columnFilters.location);
      }
      if (columnFilters.industry) {
        query = query.eq('industry', columnFilters.industry);
      }
      if (columnFilters.score) {
        if (columnFilters.score === 'high') {
          query = query.gte('cold_score', 70);
        } else if (columnFilters.score === 'medium') {
          query = query.gte('cold_score', 40).lt('cold_score', 70);
        } else if (columnFilters.score === 'low') {
          query = query.lt('cold_score', 40).not('cold_score', 'is', null);
        } else if (columnFilters.score === 'none') {
          query = query.is('cold_score', null);
        }
      }
      if (columnFilters.status) {
        query = query.eq('status', columnFilters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('Aucune donnée à exporter');
        return;
      }

      // Transform data for export
      const exportData = data.map(v => ({
        'Entreprise': v.company_name || '',
        'Contact': v.contact_name || [v.contact_first_name, v.contact_last_name].filter(Boolean).join(' ') || '',
        'Email': v.email || '',
        'Téléphone': v.phone || '',
        'Ville': v.city || '',
        'Code Postal': v.postal_code || '',
        'Région': v.region || '',
        'Secteur': v.industry || '',
        'SIRET': v.siret || '',
        'Score': v.cold_score ?? '',
        'Statut': v.status || '',
        'Créé le': v.created_at ? new Date(v.created_at).toLocaleDateString('fr-FR') : '',
      }));

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Leads Vivier');

      // Auto-size columns
      const colWidths = Object.keys(exportData[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      ws['!cols'] = colWidths;

      // Generate filename with date
      const date = new Date().toISOString().split('T')[0];
      const filename = `viviers-export-${date}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);

      toast.success(`${data.length} leads exportés`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Erreur d'export: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsExporting(false);
    }
  }, [search, status, minScore, maxScore, city, postalCode, industry, totalCount, columnFilters]);

  const handleDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      // Batch size reduced to avoid URL length limits (UUIDs are 36 chars each)
      // ~100 UUIDs = ~4KB URL which is safe
      const BATCH_SIZE = 100;
      let deletedCount = 0;
      let hasMore = true;
      
      while (hasMore) {
        // First, fetch IDs to delete (with same filters as list)
        let selectQuery = supabase.from('viviers').select('id');
        
        // Apply same filters as the list
        if (search) {
          selectQuery = selectQuery.or(`email.ilike.%${search}%,company_name.ilike.%${search}%,contact_name.ilike.%${search}%`);
        }
        if (status && status !== 'all') {
          selectQuery = selectQuery.eq('status', status);
        }
        if (minScore !== undefined) {
          selectQuery = selectQuery.gte('cold_score', minScore);
        }
        if (maxScore !== undefined) {
          selectQuery = selectQuery.lte('cold_score', maxScore);
        }
        if (city) {
          selectQuery = selectQuery.ilike('city', `%${city}%`);
        }
        if (postalCode) {
          selectQuery = selectQuery.ilike('postal_code', `${postalCode}%`);
        }
        if (industry) {
          selectQuery = selectQuery.ilike('industry', `%${industry}%`);
        }
        
        // Limit batch size
        const { data: idsToDelete, error: selectError } = await selectQuery.limit(BATCH_SIZE);
        
        if (selectError) throw selectError;
        
        if (!idsToDelete || idsToDelete.length === 0) {
          hasMore = false;
          break;
        }
        
        // Delete this batch
        const ids = idsToDelete.map(row => row.id);
        const { error: deleteError } = await supabase
          .from('viviers')
          .delete()
          .in('id', ids);
          
        if (deleteError) throw deleteError;
        
        deletedCount += ids.length;
        
        // If we got less than BATCH_SIZE, we're done
        if (idsToDelete.length < BATCH_SIZE) {
          hasMore = false;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['viviers'] });
      queryClient.invalidateQueries({ queryKey: ['viviers-stats'] });
      toast.success(`${deletedCount} lead${deletedCount > 1 ? 's' : ''} supprimé${deletedCount > 1 ? 's' : ''}`);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const hasFilters = !!(search || (status && status !== 'all') || minScore !== undefined || maxScore !== undefined || city || postalCode || department || industry || companySize || hasEmail !== undefined || hasPhone !== undefined);

  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setMinScore(undefined);
    setMaxScore(undefined);
    setCity('');
    setPostalCode('');
    setDepartment('');
    setIndustry('');
    setCompanySize('');
    setHasEmail(undefined);
    setHasPhone(undefined);
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
                    {hasFilters ? `Supprimer les ${totalCount.toLocaleString('fr-FR')} filtrés` : 'Tout supprimer'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-h-[85vh] overflow-auto">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-5 h-5" />
                      {hasFilters ? 'Supprimer les leads filtrés ?' : 'Supprimer tous les leads ?'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est <strong>irréversible</strong>. Vous êtes sur le point de supprimer <strong>{totalCount.toLocaleString('fr-FR')} lead{totalCount > 1 ? 's' : ''}</strong>
                      {hasFilters && ' correspondant aux filtres actuels'}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteAll} 
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isDeletingAll}
                    >
                      {isDeletingAll ? 'Suppression...' : `Supprimer ${totalCount.toLocaleString('fr-FR')} lead${totalCount > 1 ? 's' : ''}`}
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

        {/* AI Tools Section */}
        <Collapsible open={showAITools} onOpenChange={setShowAITools}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between mb-2">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Outils IA
              </span>
              {showAITools ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <VivierAISearch 
                onFiltersApply={(filters) => {
                  if (filters.search) setSearch(filters.search);
                  if (filters.city) setCity(filters.city);
                  if (filters.postalCode) setPostalCode(filters.postalCode);
                  if (filters.industry) setIndustry(filters.industry);
                  if (filters.minScore !== undefined) setMinScore(filters.minScore);
                  if (filters.maxScore !== undefined) setMaxScore(filters.maxScore);
                  if (filters.status) setStatus(filters.status);
                  setPage(1);
                }}
              />
              <VivierScoringPanel 
                pendingCount={stats.pendingScoring} 
                onComplete={() => refetch()}
              />
              <VivierListsPanel />
            </div>
          </CollapsibleContent>
        </Collapsible>

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
              city={city}
              onCityChange={(value) => {
                setCity(value);
                setPage(1);
              }}
              postalCode={postalCode}
              onPostalCodeChange={(value) => {
                setPostalCode(value);
                setPage(1);
              }}
              department={department}
              onDepartmentChange={(value) => {
                setDepartment(value);
                setPage(1);
              }}
              industry={industry}
              onIndustryChange={(value) => {
                setIndustry(value);
                setPage(1);
              }}
              companySize={companySize}
              onCompanySizeChange={(value) => {
                setCompanySize(value);
                setPage(1);
              }}
              hasEmail={hasEmail}
              onHasEmailChange={(value) => {
                setHasEmail(value);
                setPage(1);
              }}
              hasPhone={hasPhone}
              onHasPhoneChange={(value) => {
                setHasPhone(value);
                setPage(1);
              }}
              onClearFilters={handleClearFilters}
              onExport={handleExport}
              isExporting={isExporting}
              totalCount={totalCount}
              selectedIds={Array.from(selectedIds)}
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
                {hasFilters 
                  ? "Aucun lead ne correspond à vos critères de recherche."
                  : "Importez vos leads froids depuis un fichier CSV ou XLSX pour commencer."}
              </p>
              {!hasFilters && (
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
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            onSelectAll={handleSelectAll}
            onRowClick={handleRowClick}
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            onPageChange={setPage}
            columnFilters={columnFilters}
            onColumnFiltersChange={(filters) => {
              setColumnFilters(filters);
              setPage(1);
            }}
            filterOptions={filterOptions}
          />
        )}
      </div>
    </VivierLayout>
  );
}