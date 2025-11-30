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
import { Loader2, Search, Download, Mail, Building2, Calendar, Trash2, BookOpen, Phone, CheckCircle, Eye } from 'lucide-react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { LivreBlancsInscriptionDetailModal } from '@/components/admin/LivreBlancsInscriptionDetailModal';

interface LivreBlancsInscription {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  consent_marketing: boolean;
  source_id: string | null;
  created_at: string;
  article: {
    title: string;
  } | null;
}

const AdminLivreBlancsInscriptions = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [inscriptions, setInscriptions] = useState<LivreBlancsInscription[]>([]);
  const [filteredInscriptions, setFilteredInscriptions] = useState<LivreBlancsInscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedInscription, setSelectedInscription] = useState<LivreBlancsInscription | null>(null);
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
    
    // Charger les leads avec source='livre-blanc'
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select('id, name, email, company, phone, consent_marketing, source_id, created_at')
      .eq('source', 'livre-blanc')
      .order('created_at', { ascending: false });

    if (leadsError) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les inscriptions',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Charger les articles correspondants
    const articleIds = leadsData
      ?.filter(lead => lead.source_id)
      .map(lead => lead.source_id) || [];
    
    let articlesMap: Record<string, { title: string }> = {};
    
    if (articleIds.length > 0) {
      const { data: articlesData } = await supabase
        .from('articles')
        .select('id, title')
        .in('id', articleIds);
      
      if (articlesData) {
        articlesMap = articlesData.reduce((acc, article) => {
          acc[article.id] = { title: article.title };
          return acc;
        }, {} as Record<string, { title: string }>);
      }
    }

    // Joindre les données
    const transformedData = (leadsData || []).map((lead) => ({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      company: lead.company,
      phone: lead.phone,
      consent_marketing: lead.consent_marketing,
      source_id: lead.source_id,
      created_at: lead.created_at,
      article: lead.source_id ? articlesMap[lead.source_id] || null : null,
    }));
    
    setInscriptions(transformedData);
    setLoading(false);
  };

  const filterInscriptions = () => {
    let filtered = [...inscriptions];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (inscription) =>
          inscription.name.toLowerCase().includes(search) ||
          inscription.email.toLowerCase().includes(search) ||
          (inscription.company && inscription.company.toLowerCase().includes(search)) ||
          (inscription.article?.title && inscription.article.title.toLowerCase().includes(search))
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
      .from('leads')
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
    const headers = ['Livre blanc', 'Nom', 'Email', 'Entreprise', 'Téléphone', 'Consentement marketing', 'Date inscription'];
    const csvData = filteredInscriptions.map((inscription) => [
      inscription.article?.title || 'Livre blanc supprimé',
      inscription.name,
      inscription.email,
      inscription.company || '',
      inscription.phone || '',
      inscription.consent_marketing ? 'Oui' : 'Non',
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
    link.setAttribute('download', `inscriptions_livres_blancs_${new Date().toISOString().split('T')[0]}.csv`);
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

  const stats = {
    total: inscriptions.length,
    withConsent: inscriptions.filter((i) => i.consent_marketing).length,
    uniqueLivresBlancs: new Set(inscriptions.map(i => i.source_id)).size,
    last7Days: inscriptions.filter(i => 
      new Date(i.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length,
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Inscriptions livres blancs - Admin IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen px-6 py-12">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Inscriptions aux livres blancs</h1>
            <p className="text-muted-foreground">
              Leads capturés via les formulaires de téléchargement de livres blancs
            </p>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total inscriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avec consentement</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{stats.withConsent}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Livres blancs actifs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{stats.uniqueLivresBlancs}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Dernières 7 jours</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-accent">{stats.last7Days}</p>
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
                      placeholder="Rechercher par nom, email, entreprise ou livre blanc..."
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
                          <span className="font-semibold text-sm text-foreground">Livre blanc</span>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <span className="font-semibold text-sm text-foreground">Nom</span>
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
                          <span className="font-semibold text-sm text-foreground">Consentement</span>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <span className="font-semibold text-sm text-foreground">Date</span>
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
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-primary" />
                              <span className="font-medium text-foreground">
                                {inscription.article?.title || 'Livre blanc supprimé'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-foreground">{inscription.name}</span>
                          </td>
                          <td className="px-4 py-3">
                            <a
                              href={`mailto:${inscription.email}`}
                              className="flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              <Mail className="h-4 w-4" />
                              {inscription.email}
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            {inscription.company ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Building2 className="h-4 w-4" />
                                {inscription.company}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {inscription.phone ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                {inscription.phone}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {inscription.consent_marketing ? (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Oui
                              </Badge>
                            ) : (
                              <Badge variant="outline">Non</Badge>
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

      <LivreBlancsInscriptionDetailModal
        inscription={selectedInscription}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />
    </AdminLayout>
  );
};

export default AdminLivreBlancsInscriptions;
