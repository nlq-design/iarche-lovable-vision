import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Download, Filter, Mail, Phone, Building2, Calendar, ArrowUpDown, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  consent_marketing: boolean;
  source: string;
  source_id: string | null;
  source_context: string | null;
  message: string | null;
  created_at: string;
}

const AdminLeads = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'created_at' | 'name' | 'email'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      loadLeads();
    }
  }, [user, isAdmin]);

  useEffect(() => {
    filterAndSortLeads();
  }, [leads, searchTerm, sourceFilter, sortField, sortOrder]);

  const loadLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les leads',
        variant: 'destructive',
      });
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  };

  const filterAndSortLeads = () => {
    let filtered = [...leads];

    // Filtre par recherche
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (lead) =>
          lead.name.toLowerCase().includes(search) ||
          lead.email.toLowerCase().includes(search) ||
          (lead.company && lead.company.toLowerCase().includes(search))
      );
    }

    // Filtre par source
    if (sourceFilter !== 'all') {
      filtered = filtered.filter((lead) => lead.source === sourceFilter);
    }

    // Tri
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'created_at') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'email') {
        comparison = a.email.localeCompare(b.email);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredLeads(filtered);
  };

  const handleSort = (field: 'created_at' | 'name' | 'email') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
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
    if (selectedIds.size === filteredLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`Supprimer ${selectedIds.size} lead(s) sélectionné(s) ?`)) return;

    const { error } = await supabase
      .from('leads')
      .delete()
      .in('id', Array.from(selectedIds));

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer les leads',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Succès',
        description: `${selectedIds.size} lead(s) supprimé(s)`,
      });
      setSelectedIds(new Set());
      loadLeads();
    }
  };

  const exportToCSV = () => {
    const headers = ['Nom', 'Email', 'Entreprise', 'Téléphone', 'Source', 'Contexte', 'Message', 'Consentement marketing', 'Date de création'];
    const csvData = filteredLeads.map((lead) => [
      lead.name,
      lead.email,
      lead.company || '',
      lead.phone || '',
      lead.source,
      lead.source_context || '',
      lead.message || '',
      lead.consent_marketing ? 'Oui' : 'Non',
      new Date(lead.created_at).toLocaleDateString('fr-FR'),
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export réussi',
      description: `${filteredLeads.length} leads exportés en CSV`,
    });
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'newsletter':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'atelier-webinaire':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'livre-blanc':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
      case 'contact':
        return 'bg-orange-100 text-orange-800 hover:bg-orange-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'newsletter':
        return 'Newsletter';
      case 'atelier-webinaire':
        return 'Atelier/Webinaire';
      case 'livre-blanc':
        return 'Livre blanc';
      case 'contact':
        return 'Contact';
      default:
        return source;
    }
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
    total: leads.length,
    newsletter: leads.filter((l) => l.source === 'newsletter').length,
    atelier: leads.filter((l) => l.source === 'atelier-webinaire').length,
    livreBlanc: leads.filter((l) => l.source === 'livre-blanc').length,
    contact: leads.filter((l) => l.source === 'contact').length,
    withConsent: leads.filter((l) => l.consent_marketing).length,
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Gestion des leads - Admin IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen px-6 py-12">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Gestion des leads</h1>
            <p className="text-muted-foreground">
              Leads capturés via formulaires de contact, newsletter, livres blancs et ateliers
            </p>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Newsletter</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">{stats.newsletter}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ateliers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{stats.atelier}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Livres blancs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-purple-600">{stats.livreBlanc}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-orange-600">{stats.contact}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Consentement</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{stats.withConsent}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filtres et actions */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full">
                  <Label htmlFor="search" className="sr-only">
                    Rechercher
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Rechercher par nom, email ou entreprise..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="w-full md:w-48">
                  <Label htmlFor="sourceFilter" className="sr-only">
                    Filtrer par source
                  </Label>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger>
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Toutes les sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les sources</SelectItem>
                      <SelectItem value="newsletter">Newsletter</SelectItem>
                      <SelectItem value="atelier-webinaire">Atelier/Webinaire</SelectItem>
                      <SelectItem value="livre-blanc">Livre blanc</SelectItem>
                      <SelectItem value="contact">Contact</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  {selectedIds.size > 0 && (
                    <Button variant="destructive" onClick={handleBulkDelete}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer ({selectedIds.size})
                    </Button>
                  )}
                  <Button onClick={exportToCSV} disabled={filteredLeads.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV ({filteredLeads.length})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des leads */}
          <Card>
            <CardContent className="p-0">
              {filteredLeads.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {searchTerm || sourceFilter !== 'all'
                    ? 'Aucun lead ne correspond aux filtres'
                    : 'Aucun lead enregistré'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left w-12">
                          <Checkbox
                            checked={selectedIds.size === filteredLeads.length}
                            onCheckedChange={toggleSelectAll}
                          />
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button
                            onClick={() => handleSort('name')}
                            className="flex items-center gap-2 font-semibold text-sm text-foreground hover:text-primary"
                          >
                            Nom
                            <ArrowUpDown className="h-4 w-4" />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button
                            onClick={() => handleSort('email')}
                            className="flex items-center gap-2 font-semibold text-sm text-foreground hover:text-primary"
                          >
                            Email
                            <ArrowUpDown className="h-4 w-4" />
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <span className="font-semibold text-sm text-foreground">Entreprise</span>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <span className="font-semibold text-sm text-foreground">Téléphone</span>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <span className="font-semibold text-sm text-foreground">Source</span>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <span className="font-semibold text-sm text-foreground">Contexte</span>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <span className="font-semibold text-sm text-foreground">Message</span>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <button
                            onClick={() => handleSort('created_at')}
                            className="flex items-center gap-2 font-semibold text-sm text-foreground hover:text-primary"
                          >
                            Date
                            <ArrowUpDown className="h-4 w-4" />
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3">
                            <Checkbox
                              checked={selectedIds.has(lead.id)}
                              onCheckedChange={() => toggleSelection(lead.id)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{lead.name}</span>
                              {lead.consent_marketing && (
                                <span className="text-xs text-green-600">✓ Consentement marketing</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <a
                              href={`mailto:${lead.email}`}
                              className="flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              <Mail className="h-4 w-4" />
                              {lead.email}
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            {lead.company ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Building2 className="h-4 w-4" />
                                {lead.company}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {lead.phone ? (
                              <a
                                href={`tel:${lead.phone}`}
                                className="flex items-center gap-2 text-sm text-primary hover:underline"
                              >
                                <Phone className="h-4 w-4" />
                                {lead.phone}
                              </a>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={getSourceBadgeColor(lead.source)}>
                              {getSourceLabel(lead.source)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {lead.source_context ? (
                              <span className="text-sm text-muted-foreground max-w-[200px] truncate block" title={lead.source_context}>
                                {lead.source_context}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground/50">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {lead.message ? (
                              <span className="text-sm text-muted-foreground max-w-[300px] truncate block" title={lead.message}>
                                {lead.message}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground/50">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {new Date(lead.created_at).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
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
    </AdminLayout>
  );
};

export default AdminLeads;
