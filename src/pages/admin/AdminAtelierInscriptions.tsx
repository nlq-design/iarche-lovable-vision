import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Download, Mail, Calendar, Trash2, Building2, Phone, User, Eye } from 'lucide-react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { AtelierInscriptionDetailModal } from '@/components/admin/AtelierInscriptionDetailModal';

interface AtelierInscription {
  id: string;
  atelier_id: string;
  lead_id: string;
  created_at: string;
  atelier: {
    title: string;
    event_date: string | null;
  };
  lead: {
    name: string;
    email: string;
    company: string | null;
    phone: string | null;
  };
}

const AdminAtelierInscriptions = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [inscriptions, setInscriptions] = useState<AtelierInscription[]>([]);
  const [filteredInscriptions, setFilteredInscriptions] = useState<AtelierInscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedInscription, setSelectedInscription] = useState<AtelierInscription | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      loadInscriptions();
    }
  }, [user, isAdmin]);

  useEffect(() => {
    filterInscriptions();
  }, [inscriptions, searchTerm]);

  const loadInscriptions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('atelier_inscriptions')
      .select(`
        id,
        atelier_id,
        lead_id,
        created_at,
        articles:atelier_id (
          title,
          event_date
        ),
        leads:lead_id (
          name,
          email,
          company,
          phone
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les inscriptions',
        variant: 'destructive',
      });
    } else {
      // Transform data structure
      const transformedData = (data || []).map((item: any) => ({
        id: item.id,
        atelier_id: item.atelier_id,
        lead_id: item.lead_id,
        created_at: item.created_at,
        atelier: {
          title: item.articles?.title || 'Atelier supprimé',
          event_date: item.articles?.event_date || null,
        },
        lead: {
          name: item.leads?.name || 'Lead supprimé',
          email: item.leads?.email || '',
          company: item.leads?.company || null,
          phone: item.leads?.phone || null,
        }
      }));
      setInscriptions(transformedData);
    }
    setLoading(false);
  };

  const filterInscriptions = () => {
    let filtered = [...inscriptions];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (inscription) =>
          inscription.lead.name.toLowerCase().includes(search) ||
          inscription.lead.email.toLowerCase().includes(search) ||
          inscription.atelier.title.toLowerCase().includes(search) ||
          (inscription.lead.company && inscription.lead.company.toLowerCase().includes(search))
      );
    }

    setFilteredInscriptions(filtered);
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInscriptions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInscriptions.map(i => i.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`Supprimer ${selectedIds.size} inscription(s) sélectionnée(s) ?`)) return;

    const { error } = await supabase
      .from('atelier_inscriptions')
      .delete()
      .in('id', Array.from(selectedIds));

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer les inscriptions',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Succès',
        description: `${selectedIds.size} inscription(s) supprimée(s)`,
      });
      setSelectedIds(new Set());
      loadInscriptions();
    }
  };

  const exportToCSV = () => {
    const headers = ['Atelier', 'Date événement', 'Participant', 'Email', 'Entreprise', 'Téléphone', 'Date inscription'];
    const csvData = filteredInscriptions.map((inscription) => [
      inscription.atelier.title,
      inscription.atelier.event_date ? new Date(inscription.atelier.event_date).toLocaleDateString('fr-FR') : '',
      inscription.lead.name,
      inscription.lead.email,
      inscription.lead.company || '',
      inscription.lead.phone || '',
      new Date(inscription.created_at).toLocaleDateString('fr-FR'),
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inscriptions_ateliers_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export réussi',
      description: `${filteredInscriptions.length} inscription(s) exportée(s) en CSV`,
    });
  };

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  // Get unique ateliers count
  const uniqueAteliers = new Set(inscriptions.map(i => i.atelier_id)).size;

  return (
    <AdminLayout>
      <Helmet>
        <title>Inscriptions aux ateliers - Admin IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen px-6 py-12">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Inscriptions aux ateliers</h1>
            <p className="text-muted-foreground">
              Participants inscrits aux ateliers et webinaires
            </p>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total inscriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{inscriptions.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ateliers actifs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{uniqueAteliers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Dernières 7 jours</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-accent">
                  {inscriptions.filter(i => 
                    new Date(i.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ).length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full">
                  <Label htmlFor="search" className="sr-only">Rechercher</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Rechercher par participant, email, atelier ou entreprise..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedIds.size > 0 && (
                    <Button variant="destructive" onClick={handleBulkDelete}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer ({selectedIds.size})
                    </Button>
                  )}
                  <Button onClick={exportToCSV} disabled={filteredInscriptions.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV ({filteredInscriptions.length})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des inscriptions */}
          <Card>
            <CardContent className="p-0">
              {filteredInscriptions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {searchTerm ? 'Aucune inscription ne correspond aux filtres' : 'Aucune inscription enregistrée'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left w-12">
                          <Checkbox
                            checked={selectedIds.size === filteredInscriptions.length}
                            onCheckedChange={toggleSelectAll}
                          />
                        </th>
                        <th className="px-4 py-3 text-left">
                          <span className="font-semibold text-sm text-foreground">Atelier</span>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <span className="font-semibold text-sm text-foreground">Participant</span>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <span className="font-semibold text-sm text-foreground">Email</span>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <span className="font-semibold text-sm text-foreground">Entreprise</span>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <span className="font-semibold text-sm text-foreground">Téléphone</span>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <span className="font-semibold text-sm text-foreground">Date inscription</span>
                        </th>
                        <th className="px-4 py-3 text-center w-20">
                          <span className="font-semibold text-sm text-foreground">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredInscriptions.map((inscription) => (
                        <tr key={inscription.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3">
                            <Checkbox
                              checked={selectedIds.has(inscription.id)}
                              onCheckedChange={() => toggleSelection(inscription.id)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-foreground">{inscription.atelier.title}</p>
                              {inscription.atelier.event_date && (
                                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(inscription.atelier.event_date).toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-foreground">{inscription.lead.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <a
                              href={`mailto:${inscription.lead.email}`}
                              className="flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              <Mail className="h-4 w-4" />
                              {inscription.lead.email}
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            {inscription.lead.company ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Building2 className="h-4 w-4" />
                                {inscription.lead.company}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {inscription.lead.phone ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                {inscription.lead.phone}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {new Date(inscription.created_at).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedInscription(inscription);
                                  setDetailModalOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AtelierInscriptionDetailModal
        inscription={selectedInscription}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />
    </AdminLayout>
  );
};

export default AdminAtelierInscriptions;
