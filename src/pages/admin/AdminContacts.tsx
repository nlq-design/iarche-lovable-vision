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
import { Loader2, Search, Download, Mail, Building2, Calendar, Trash2, MessageSquare } from 'lucide-react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Badge } from '@/components/ui/badge';

interface Contact {
  id: string;
  name: string;
  email: string;
  company: string | null;
  subject: string;
  message: string;
  source: string | null;
  source_context: string | null;
  created_at: string;
}

const AdminContacts = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      loadContacts();
    }
  }, [user, isAdmin]);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchTerm]);

  const loadContacts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les contacts',
        variant: 'destructive',
      });
    } else {
      setContacts(data || []);
    }
    setLoading(false);
  };

  const filterContacts = () => {
    let filtered = [...contacts];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (contact) =>
          contact.name.toLowerCase().includes(search) ||
          contact.email.toLowerCase().includes(search) ||
          (contact.company && contact.company.toLowerCase().includes(search)) ||
          contact.subject.toLowerCase().includes(search)
      );
    }

    setFilteredContacts(filtered);
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
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map(c => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`Supprimer ${selectedIds.size} contact(s) sélectionné(s) ?`)) return;

    const { error } = await supabase
      .from('contacts')
      .delete()
      .in('id', Array.from(selectedIds));

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer les contacts',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Succès',
        description: `${selectedIds.size} contact(s) supprimé(s)`,
      });
      setSelectedIds(new Set());
      loadContacts();
    }
  };

  const exportToCSV = () => {
    const headers = ['Nom', 'Email', 'Entreprise', 'Sujet', 'Message', 'Source', 'Date'];
    const csvData = filteredContacts.map((contact) => [
      contact.name,
      contact.email,
      contact.company || '',
      contact.subject,
      contact.message.replace(/"/g, '""'),
      contact.source || '',
      new Date(contact.created_at).toLocaleDateString('fr-FR'),
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `contacts_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export réussi',
      description: `${filteredContacts.length} contact(s) exporté(s) en CSV`,
    });
  };

  const getSubjectLabel = (subject: string) => {
    const labels: Record<string, string> = {
      'audit': 'Audit IA',
      'developpement': 'Développement',
      'accompagnement': 'Accompagnement',
      'conformite': 'Conformité',
      'autre': 'Autre',
    };
    return labels[subject] || subject;
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
    total: contacts.length,
    audit: contacts.filter((c) => c.subject === 'audit').length,
    developpement: contacts.filter((c) => c.subject === 'developpement').length,
    accompagnement: contacts.filter((c) => c.subject === 'accompagnement').length,
    conformite: contacts.filter((c) => c.subject === 'conformite').length,
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Gestion des contacts - Admin IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen px-6 py-12">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Gestion des contacts</h1>
            <p className="text-muted-foreground">
              Messages reçus via le formulaire de contact
            </p>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Audit</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">{stats.audit}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Développement</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{stats.developpement}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Accompagnement</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-purple-600">{stats.accompagnement}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Conformité</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-orange-600">{stats.conformite}</p>
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
                      placeholder="Rechercher par nom, email, entreprise ou sujet..."
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
                  <Button onClick={exportToCSV} disabled={filteredContacts.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV ({filteredContacts.length})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des contacts */}
          <Card>
            <CardContent className="p-0">
              {filteredContacts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {searchTerm ? 'Aucun contact ne correspond aux filtres' : 'Aucun contact enregistré'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left w-12">
                          <Checkbox
                            checked={selectedIds.size === filteredContacts.length}
                            onCheckedChange={toggleSelectAll}
                          />
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
                          <span className="font-semibold text-sm text-foreground">Sujet</span>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <span className="font-semibold text-sm text-foreground">Message</span>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <span className="font-semibold text-sm text-foreground">Date</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredContacts.map((contact) => (
                        <tr key={contact.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3">
                            <Checkbox
                              checked={selectedIds.has(contact.id)}
                              onCheckedChange={() => toggleSelection(contact.id)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-foreground">{contact.name}</span>
                          </td>
                          <td className="px-4 py-3">
                            <a
                              href={`mailto:${contact.email}`}
                              className="flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              <Mail className="h-4 w-4" />
                              {contact.email}
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            {contact.company ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Building2 className="h-4 w-4" />
                                {contact.company}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline">{getSubjectLabel(contact.subject)}</Badge>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground line-clamp-2">{contact.message}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {new Date(contact.created_at).toLocaleDateString('fr-FR', {
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

export default AdminContacts;
