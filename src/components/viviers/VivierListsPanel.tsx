import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  List, 
  RefreshCw, 
  Trash2, 
  Loader2, 
  FolderOpen, 
  MoreHorizontal, 
  Mail, 
  Download, 
  Eye,
  Plus
} from 'lucide-react';
import { useVivierLists, type VivierList } from '@/hooks/viviers/useVivierLists';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createAndDownloadExcel } from '@/utils/excelUtils';

interface VivierListsPanelProps {
  onSelectList?: (list: VivierList) => void;
}

export function VivierListsPanel({ onSelectList }: VivierListsPanelProps) {
  const navigate = useNavigate();
  const { lists, isLoading, syncList, deleteList } = useVivierLists();
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const handleSync = async (list: VivierList) => {
    setSyncingId(list.id);
    try {
      await syncList.mutateAsync(list);
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Supprimer cette liste ?')) {
      await deleteList.mutateAsync(id);
    }
  };

  const handleExportList = async (list: VivierList) => {
    setExportingId(list.id);
    try {
      let query = supabase
        .from('viviers')
        .select('company_name, contact_name, email, phone, city, postal_code, industry, cold_score, status')
        .limit(50000);

      // Apply criteria for dynamic lists
      if (list.list_type === 'dynamic' && list.criteria_json) {
        const criteria = list.criteria_json as Record<string, unknown>;
        if (criteria.search) {
          query = query.or(`email.ilike.%${criteria.search}%,company_name.ilike.%${criteria.search}%`);
        }
        if (criteria.status && criteria.status !== 'all') {
          query = query.eq('status', criteria.status as string);
        }
        if (criteria.minScore !== undefined) {
          query = query.gte('cold_score', criteria.minScore as number);
        }
        if (criteria.maxScore !== undefined) {
          query = query.lte('cold_score', criteria.maxScore as number);
        }
        if (criteria.city) {
          query = query.ilike('city', `%${criteria.city}%`);
        }
        if (criteria.postalCode) {
          query = query.ilike('postal_code', `${criteria.postalCode}%`);
        }
        if (criteria.industry) {
          query = query.ilike('industry', `%${criteria.industry}%`);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('Aucun lead à exporter');
        return;
      }

      const exportData = data.map(v => ({
        'Entreprise': v.company_name || '',
        'Contact': v.contact_name || '',
        'Email': v.email || '',
        'Téléphone': v.phone || '',
        'Ville': v.city || '',
        'Code Postal': v.postal_code || '',
        'Secteur': v.industry || '',
        'Score': v.cold_score ?? '',
        'Statut': v.status || '',
      }));

      const filename = `${list.name.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
      await createAndDownloadExcel(exportData, filename, 'Leads');

      toast.success(`${data.length} leads exportés`);
    } catch (error) {
      toast.error(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setExportingId(null);
    }
  };

  const handleCreateCampaign = (list: VivierList) => {
    navigate(`/viviers/campaigns?listId=${list.id}&listName=${encodeURIComponent(list.name)}`);
  };

  const handleViewList = (list: VivierList) => {
    navigate(`/viviers/lists/${list.id}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <List className="w-5 h-5" />
          Listes sauvegardées
        </CardTitle>
        <CardDescription>
          Segments de leads pour campagnes ou exports
        </CardDescription>
      </CardHeader>
      <CardContent>
        {lists.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune liste sauvegardée</p>
            <p className="text-xs mt-1">Utilisez les filtres ou la recherche IA pour créer des listes</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px] pr-4">
            <div className="space-y-2">
              {lists.map((list) => (
                <div
                  key={list.id}
                  className="group flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleViewList(list)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{list.name}</h4>
                      <Badge variant={list.list_type === 'dynamic' ? 'default' : 'secondary'} className="text-xs shrink-0">
                        {list.list_type === 'dynamic' ? 'Dynamique' : 'Statique'}
                      </Badge>
                    </div>
                    {list.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {list.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {list.lead_count.toLocaleString('fr-FR')} leads
                      </span>
                      {list.last_sync_at && (
                        <>
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(list.last_sync_at), { addSuffix: true, locale: fr })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => handleViewList(list)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Voir la liste
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCreateCampaign(list)}>
                        <Mail className="w-4 h-4 mr-2" />
                        Créer une campagne
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleExportList(list)}
                        disabled={exportingId === list.id}
                      >
                        {exportingId === list.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        Exporter XLSX
                      </DropdownMenuItem>
                      {list.list_type === 'dynamic' && (
                        <DropdownMenuItem 
                          onClick={() => handleSync(list)}
                          disabled={syncingId === list.id}
                        >
                          {syncingId === list.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                          )}
                          Rafraîchir
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDelete(list.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
