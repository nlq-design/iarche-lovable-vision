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
import { Loader2, Search, Download, Mail, Calendar, Trash2 } from 'lucide-react';
import AdminLayout from '@/components/layouts/AdminLayout';

interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribed_at: string;
}

const AdminNewsletters = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [filteredSubscribers, setFilteredSubscribers] = useState<NewsletterSubscriber[]>([]);
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
      loadSubscribers();
    }
  }, [user, isAdmin]);

  useEffect(() => {
    filterSubscribers();
  }, [subscribers, searchTerm]);

  const loadSubscribers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .order('subscribed_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les abonnés',
        variant: 'destructive',
      });
    } else {
      setSubscribers(data || []);
    }
    setLoading(false);
  };

  const filterSubscribers = () => {
    let filtered = [...subscribers];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((subscriber) =>
        subscriber.email.toLowerCase().includes(search)
      );
    }

    setFilteredSubscribers(filtered);
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
    if (selectedIds.size === filteredSubscribers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSubscribers.map((s) => s.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`Supprimer ${selectedIds.size} abonné(s) sélectionné(s) ?`)) return;

    const { error } = await supabase
      .from('newsletter_subscribers')
      .delete()
      .in('id', Array.from(selectedIds));

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer les abonnés',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Succès',
        description: `${selectedIds.size} abonné(s) supprimé(s)`,
      });
      setSelectedIds(new Set());
      loadSubscribers();
    }
  };

  const exportToCSV = () => {
    const headers = ['Email', 'Date d\'inscription'];
    const csvData = filteredSubscribers.map((subscriber) => [
      subscriber.email,
      new Date(subscriber.subscribed_at).toLocaleDateString('fr-FR'),
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `newsletter_subscribers_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export réussi',
      description: `${filteredSubscribers.length} abonné(s) exporté(s) en CSV`,
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
    total: subscribers.length,
    last7Days: subscribers.filter(
      (s) => new Date(s.subscribed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length,
    last30Days: subscribers.filter(
      (s) => new Date(s.subscribed_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length,
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Abonnés newsletter - Admin IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen px-6 py-12">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Abonnés newsletter</h1>
            <p className="text-muted-foreground">
              Emails inscrits à la newsletter IArche
            </p>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total abonnés</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Derniers 7 jours</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{stats.last7Days}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Derniers 30 jours</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-accent">{stats.last30Days}</p>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
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
                      placeholder="Rechercher par email..."
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
                  <Button onClick={exportToCSV} disabled={filteredSubscribers.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV ({filteredSubscribers.length})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des abonnés */}
          <Card>
            <CardContent className="p-0">
              {filteredSubscribers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {searchTerm ? 'Aucun abonné ne correspond aux filtres' : 'Aucun abonné enregistré'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left w-12">
                          <Checkbox
                            checked={selectedIds.size === filteredSubscribers.length}
                            onCheckedChange={toggleSelectAll}
                          />
                        </th>
                        <th className="px-4 py-3 text-left">
                          <span className="font-semibold text-sm text-foreground">Email</span>
                        </th>
                        <th className="px-4 py-3 text-left">
                          <span className="font-semibold text-sm text-foreground">Date d'inscription</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredSubscribers.map((subscriber) => (
                        <tr key={subscriber.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3">
                            <Checkbox
                              checked={selectedIds.has(subscriber.id)}
                              onCheckedChange={() => toggleSelection(subscriber.id)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <a
                              href={`mailto:${subscriber.email}`}
                              className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                            >
                              <Mail className="h-4 w-4" />
                              {subscriber.email}
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {new Date(subscriber.subscribed_at).toLocaleDateString('fr-FR', {
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

export default AdminNewsletters;
