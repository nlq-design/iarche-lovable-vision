import { useParams, useNavigate } from 'react-router-dom';
import { VivierLayout } from '@/components/viviers/VivierLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  RefreshCw, 
  Download, 
  Mail, 
  Trash2, 
  Calendar, 
  Filter, 
  Users,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { useVivierList, useVivierLists } from '@/hooks/viviers/useVivierLists';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function ViviersListDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: list, isLoading: listLoading } = useVivierList(id || null);
  const { syncList, deleteList } = useVivierLists();
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Fetch list members
  const { data: membersData, isLoading: membersLoading, refetch: refetchMembers } = useQuery({
    queryKey: ['vivier-list-members', id, page],
    queryFn: async () => {
      if (!list) return { members: [], totalCount: 0 };

      let query = supabase
        .from('viviers')
        // IMPORTANT: do NOT request an exact count here (it can timeout on large datasets).
        // We use the synced list.lead_count for pagination/count display instead.
        .select('id, company_name, contact_name, email, phone, city, industry, cold_score, status')
        // Include NULL statuses ("not promoted" should include unset status)
        .or('status.neq.promoted,status.is.null');

      // Apply filters based on list type
      if (list.list_type === 'static' && list.static_vivier_ids?.length > 0) {
        query = query.in('id', list.static_vivier_ids);
      } else if (list.list_type === 'dynamic' && list.criteria_json) {
        const criteria = list.criteria_json as Record<string, unknown>;
        
        if (criteria.search) {
          query = query.or(`company_name.ilike.%${String(criteria.search)}%,contact_name.ilike.%${String(criteria.search)}%`);
        }
        if (criteria.city) {
          // Use ilike with pattern for case-insensitive city matching
          query = query.ilike('city', `%${String(criteria.city)}%`);
        }
        if (criteria.postalCode) {
          query = query.ilike('postal_code', `${String(criteria.postalCode)}%`);
        }
        if (criteria.industry) {
          // Use ilike with pattern for case-insensitive industry matching
          query = query.ilike('industry', `%${String(criteria.industry)}%`);
        }
        if (criteria.minScore !== undefined) {
          query = query.gte('cold_score', criteria.minScore as number);
        }
        if (criteria.maxScore !== undefined) {
          query = query.lte('cold_score', criteria.maxScore as number);
        }
        if (criteria.hasEmail === true) {
          query = query.not('email', 'is', null);
        }
        if (criteria.hasPhone === true) {
          query = query.not('phone', 'is', null);
        }
      }

      const { data, error, count } = await query
        .order('cold_score', { ascending: false, nullsFirst: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;

      return { members: data || [], totalCount: count || 0 };
    },
    enabled: !!list,
  });

  const handleSync = async () => {
    if (!list) return;
    try {
      await syncList.mutateAsync(list);
      refetchMembers();
      toast.success('Liste synchronisée');
    } catch (err) {
      toast.error('Erreur de synchronisation');
    }
  };

  const handleExport = async () => {
    if (!membersData?.members.length) {
      toast.error('Aucun lead à exporter');
      return;
    }

    // Fetch all members for export (not just current page)
    let query = supabase
      .from('viviers')
      .select('company_name, contact_name, email, phone, city, postal_code, industry, cold_score, status')
      .neq('status', 'promoted');

    if (list?.list_type === 'static' && list.static_vivier_ids?.length > 0) {
      query = query.in('id', list.static_vivier_ids);
    } else if (list?.list_type === 'dynamic' && list.criteria_json) {
      const criteria = list.criteria_json as Record<string, unknown>;
      // Use wildcards for case-insensitive matching (data may be uppercase)
      if (criteria.city) query = query.ilike('city', `%${String(criteria.city)}%`);
      if (criteria.postalCode) query = query.ilike('postal_code', `${String(criteria.postalCode)}%`);
      if (criteria.industry) query = query.ilike('industry', `%${String(criteria.industry)}%`);
      if (criteria.minScore !== undefined) query = query.gte('cold_score', Number(criteria.minScore));
      if (criteria.maxScore !== undefined) query = query.lte('cold_score', Number(criteria.maxScore));
    }

    const { data: allMembers } = await query.order('cold_score', { ascending: false }).limit(10000);

    if (!allMembers?.length) {
      toast.error('Aucun lead à exporter');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(allMembers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, `liste-${list?.name || 'export'}-${Date.now()}.xlsx`);
    toast.success(`${allMembers.length} leads exportés`);
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteList.mutateAsync(id);
      navigate('/viviers/leads');
    } catch (err) {
      toast.error('Erreur de suppression');
    }
  };

  const handleSendCampaign = () => {
    if (!list) return;
    navigate(`/viviers/campaigns?listId=${list.id}&listName=${encodeURIComponent(list.name)}`);
  };

  const totalPages = Math.ceil((membersData?.totalCount || 0) / pageSize);

  if (listLoading) {
    return (
      <VivierLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </VivierLayout>
    );
  }

  if (!list) {
    return (
      <VivierLayout>
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Liste introuvable</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/viviers/leads')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour aux leads
              </Button>
            </CardContent>
          </Card>
        </div>
      </VivierLayout>
    );
  }

  const criteria = list.criteria_json as Record<string, unknown> | null;

  return (
    <VivierLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/viviers/leads')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux leads
            </Button>
            <h1 className="text-2xl font-bold text-foreground">{list.name}</h1>
            {list.description && (
              <p className="text-muted-foreground">{list.description}</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {list.list_type === 'dynamic' && (
              <Button variant="outline" onClick={handleSync} disabled={syncList.isPending}>
                <RefreshCw className={`w-4 h-4 mr-2 ${syncList.isPending ? 'animate-spin' : ''}`} />
                Synchroniser
              </Button>
            )}
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
            <Button onClick={handleSendCampaign}>
              <Mail className="w-4 h-4 mr-2" />
              Campagne
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer la liste ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Les leads ne seront pas supprimés.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Metadata */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{membersData?.totalCount.toLocaleString() || list.lead_count}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Leads dans la liste</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Badge variant={list.list_type === 'dynamic' ? 'default' : 'secondary'}>
                  {list.list_type === 'dynamic' ? 'Dynamique' : 'Statique'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Type de liste</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {list.last_sync_at 
                    ? new Date(list.last_sync_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : 'Jamais'
                  }
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Dernière sync</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {new Date(list.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Date de création</p>
            </CardContent>
          </Card>
        </div>

        {/* Criteria (for dynamic lists) */}
        {list.list_type === 'dynamic' && criteria && Object.keys(criteria).length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Critères de filtrage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(criteria).map(([key, value]) => {
                  if (value === undefined || value === null || value === '') return null;
                  const labels: Record<string, string> = {
                    search: 'Recherche',
                    city: 'Ville',
                    postalCode: 'Code postal',
                    region: 'Région',
                    industry: 'Secteur',
                    minScore: 'Score min',
                    maxScore: 'Score max',
                    minEmployees: 'Effectif min',
                    maxEmployees: 'Effectif max',
                    status: 'Statut',
                    hasEmail: 'Avec email',
                    hasPhone: 'Avec téléphone',
                  };
                  return (
                    <Badge key={key} variant="outline">
                      {labels[key] || key}: {typeof value === 'boolean' ? (value ? 'Oui' : 'Non') : String(value)}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Members table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leads de la liste</CardTitle>
            <CardDescription>
              Page {page} sur {totalPages || 1} • {membersData?.totalCount || 0} leads
            </CardDescription>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : membersData?.members.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Aucun lead dans cette liste
              </div>
            ) : (
              <>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entreprise</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Téléphone</TableHead>
                        <TableHead>Ville</TableHead>
                        <TableHead>Secteur</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {membersData?.members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">{member.company_name || '-'}</TableCell>
                          <TableCell>{member.contact_name || '-'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{member.email || '-'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{member.phone || '-'}</TableCell>
                          <TableCell>{member.city || '-'}</TableCell>
                          <TableCell className="text-sm">{member.industry || '-'}</TableCell>
                          <TableCell className="text-right">
                            {member.cold_score !== null ? (
                              <Badge variant={member.cold_score >= 70 ? 'default' : member.cold_score >= 40 ? 'secondary' : 'outline'}>
                                {member.cold_score}
                              </Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => navigate(`/viviers/leads/${member.id}`)}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Précédent
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Suivant
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </VivierLayout>
  );
}
