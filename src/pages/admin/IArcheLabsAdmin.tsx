import { useEffect, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Download, Eye, Rocket, Save } from 'lucide-react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageSections } from '@/hooks/usePageSections';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface LabsContact {
  id: string;
  name: string;
  email: string;
  company: string | null;
  subject: string;
  message: string;
  source: string | null;
  source_context: string | null;
  created_at: string;
  labs_status: string | null;
}

const STATUS_OPTIONS = [
  { value: 'a_traiter', label: 'À traiter', color: 'bg-muted text-muted-foreground' },
  { value: 'en_discussion', label: 'En discussion', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'retenu', label: 'Retenu', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'refuse', label: 'Refusé', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
];

const DATE_FILTERS = [
  { value: 'all', label: 'Tout' },
  { value: '7', label: '7 derniers jours' },
  { value: '30', label: '30 derniers jours' },
];

const SECTION_LABELS: Record<string, string> = {
  hero_title: 'Titre Hero',
  hero_subtitle: 'Sous-titre Hero',
  cible_1_titre: 'Cible 1 — Titre',
  cible_1_texte: 'Cible 1 — Texte',
  cible_2_titre: 'Cible 2 — Titre',
  cible_2_texte: 'Cible 2 — Texte',
  cible_3_titre: 'Cible 3 — Titre',
  cible_3_texte: 'Cible 3 — Texte',
  formule_titre: 'Formule — Titre',
  formule_nom: 'Formule — Nom',
  formule_sous_titre: 'Formule — Sous-titre',
  lieu_texte: 'Lieu — Texte',
  formulaire_titre: 'Formulaire — Titre',
  formulaire_sous_titre: 'Formulaire — Sous-titre',
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const extractInterest = (subject: string) => {
  if (subject?.includes('Je suis prêt')) return 'Prêt(e) à candidater';
  if (subject?.includes('en savoir plus')) return 'En savoir plus';
  return subject?.replace('Candidature IArche Labs - ', '') || '—';
};

const IArcheLabsAdmin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<LabsContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedContact, setSelectedContact] = useState<LabsContact | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // CMS state
  const { sections, loading: sectionsLoading, updateSection } = usePageSections('iarche-labs');
  const [editedSections, setEditedSections] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (sections && Object.keys(editedSections).length === 0) {
      setEditedSections({ ...sections });
    }
  }, [sections]);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) loadContacts();
  }, [user, isAdmin]);

  const loadContacts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('source', 'iarche-labs')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Erreur', description: 'Impossible de charger les candidatures.', variant: 'destructive' });
    } else {
      setContacts((data as LabsContact[]) || []);
    }
    setLoading(false);
  };

  const filteredContacts = useMemo(() => {
    let result = contacts;

    if (statusFilter !== 'all') {
      result = result.filter(c => (c.labs_status || 'a_traiter') === statusFilter);
    }

    if (dateFilter !== 'all') {
      const days = parseInt(dateFilter);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      result = result.filter(c => new Date(c.created_at) >= cutoff);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [contacts, statusFilter, dateFilter, searchTerm]);

  const updateStatus = async (contactId: string, newStatus: string) => {
    const { error } = await supabase
      .from('contacts')
      .update({ labs_status: newStatus } as any)
      .eq('id', contactId);

    if (error) {
      toast({ title: 'Erreur', description: 'Impossible de modifier le statut.', variant: 'destructive' });
    } else {
      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, labs_status: newStatus } : c));
      toast({ title: 'Statut mis à jour' });
    }
  };

  const exportCSV = () => {
    const headers = ['Date', 'Nom', 'Email', 'Entreprise', 'Message', 'Intérêt', 'Statut'];
    const rows = filteredContacts.map(c => [
      formatDate(c.created_at),
      c.name,
      c.email,
      c.company || '',
      `"${(c.message || '').replace(/"/g, '""')}"`,
      extractInterest(c.subject),
      STATUS_OPTIONS.find(s => s.value === (c.labs_status || 'a_traiter'))?.label || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iarche-labs-candidatures-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveSections = async () => {
    setSaving(true);
    try {
      const changed = Object.keys(editedSections).filter(
        key => editedSections[key] !== sections[key]
      );
      for (const key of changed) {
        await updateSection(key, editedSections[key]);
      }
      toast({ title: 'Contenu mis à jour', description: `${changed.length} section(s) modifiée(s).` });
    } catch (err) {
      toast({ title: 'Erreur', description: 'Erreur lors de la mise à jour.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Helmet>
        <title>IArche Labs — Admin</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Rocket className="h-6 w-6 text-accent" />
            <h1 className="text-2xl font-bold text-foreground">IArche Labs</h1>
            <Badge variant="secondary">{contacts.length} candidature{contacts.length > 1 ? 's' : ''}</Badge>
          </div>
        </div>

        <Tabs defaultValue="candidatures">
          <TabsList>
            <TabsTrigger value="candidatures">Candidatures</TabsTrigger>
            <TabsTrigger value="contenu">Contenu de la page</TabsTrigger>
          </TabsList>

          {/* TAB 1: Candidatures */}
          <TabsContent value="candidatures" className="space-y-6">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher nom, email, entreprise..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Période" />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_FILTERS.map(d => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Entreprise</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Intérêt</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          Aucune candidature trouvée.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredContacts.map(contact => (
                        <TableRow key={contact.id}>
                          <TableCell className="text-sm whitespace-nowrap">{formatDate(contact.created_at)}</TableCell>
                          <TableCell className="font-medium">{contact.name}</TableCell>
                          <TableCell className="text-sm">{contact.email}</TableCell>
                          <TableCell className="text-sm">{contact.company || '—'}</TableCell>
                          <TableCell className="text-sm max-w-[200px]" title={contact.message}>
                            {contact.message?.length > 80
                              ? contact.message.slice(0, 80) + '…'
                              : contact.message || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs whitespace-nowrap">
                              {extractInterest(contact.subject)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={contact.labs_status || 'a_traiter'}
                              onValueChange={(val) => updateStatus(contact.id, val)}
                            >
                              <SelectTrigger className="h-8 w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map(s => (
                                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setSelectedContact(contact); setSheetOpen(true); }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground">
              {filteredContacts.length} candidature{filteredContacts.length > 1 ? 's' : ''} affichée{filteredContacts.length > 1 ? 's' : ''}
            </p>
          </TabsContent>

          {/* TAB 2: Contenu */}
          <TabsContent value="contenu" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Éditer le contenu de la page IArche Labs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {sectionsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {Object.keys(SECTION_LABELS).map(key => (
                      <div key={key} className="space-y-1.5">
                        <Label className="text-sm font-medium text-muted-foreground">
                          {SECTION_LABELS[key]}
                        </Label>
                        {(editedSections[key] || '').length >= 100 ? (
                          <Textarea
                            value={editedSections[key] || ''}
                            onChange={e => setEditedSections(prev => ({ ...prev, [key]: e.target.value }))}
                            rows={3}
                          />
                        ) : (
                          <Input
                            value={editedSections[key] || ''}
                            onChange={e => setEditedSections(prev => ({ ...prev, [key]: e.target.value }))}
                          />
                        )}
                      </div>
                    ))}
                    <Button onClick={handleSaveSections} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Enregistrer les modifications
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Détail candidature</SheetTitle>
            <SheetDescription>
              {selectedContact ? `Reçue le ${formatDate(selectedContact.created_at)}` : ''}
            </SheetDescription>
          </SheetHeader>

          {selectedContact && (
            <div className="space-y-6 mt-6">
              <div>
                <Label className="text-muted-foreground text-xs">Nom</Label>
                <p className="font-medium text-foreground">{selectedContact.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Email</Label>
                <p className="text-foreground">{selectedContact.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Entreprise / Projet</Label>
                <p className="text-foreground">{selectedContact.company || '—'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Intérêt</Label>
                <Badge variant="outline">{extractInterest(selectedContact.subject)}</Badge>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Message complet</Label>
                <p className="text-foreground whitespace-pre-wrap text-sm mt-1">{selectedContact.message}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Statut</Label>
                <div className="mt-1">
                  <Select
                    value={selectedContact.labs_status || 'a_traiter'}
                    onValueChange={(val) => {
                      updateStatus(selectedContact.id, val);
                      setSelectedContact({ ...selectedContact, labs_status: val });
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Source</Label>
                <p className="text-foreground text-sm">{selectedContact.source_context || selectedContact.source || '—'}</p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
};

export default IArcheLabsAdmin;
