import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Eye, Copy, FileText, Search, QrCode, CopyPlus } from 'lucide-react';
import { useBrochures } from '@/hooks/useBrochures';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import QRCode from 'react-qr-code';
import { Brochure } from '@/types/brochure';

const AdminBrochures = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { brochures, isLoading, deleteBrochure, duplicateBrochure } = useBrochures();
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [qrBrochure, setQrBrochure] = useState<Brochure | null>(null);

  const filteredBrochures = brochures.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.cover_title.toLowerCase().includes(search.toLowerCase())
  );

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`https://iarche.fr/brochure/${slug}`);
    toast({ title: 'Lien copié' });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteBrochure.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const handleDuplicate = (brochure: Brochure) => {
    duplicateBrochure.mutate(brochure);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Brochures</h1>
            <p className="text-muted-foreground">Créez des présentations commerciales</p>
          </div>
          <Button onClick={() => navigate('/admin/brochures/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle brochure
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {brochures.length} brochure{brochures.length > 1 ? 's' : ''}
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Chargement...</p>
            ) : filteredBrochures.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {search ? 'Aucune brochure trouvée' : 'Aucune brochure créée'}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Vues</TableHead>
                    <TableHead>Créée le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBrochures.map((brochure) => (
                    <TableRow key={brochure.id}>
                      <TableCell className="font-medium">{brochure.title}</TableCell>
                      <TableCell className="text-muted-foreground">/brochure/{brochure.slug}</TableCell>
                      <TableCell>
                        <Badge variant={brochure.published ? 'default' : 'secondary'}>
                          {brochure.published ? 'Publiée' : 'Brouillon'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{brochure.views_count}</span>
                      </TableCell>
                      <TableCell>
                        {format(new Date(brochure.created_at), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {brochure.published && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(`/brochure/${brochure.slug}`, '_blank')}
                                title="Voir"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => copyLink(brochure.slug)}
                                title="Copier le lien"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setQrBrochure(brochure)}
                                title="QR Code"
                              >
                                <QrCode className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDuplicate(brochure)}
                            title="Dupliquer"
                          >
                            <CopyPlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/admin/brochures/${brochure.id}`)}
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(brochure.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette brochure ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
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

      {/* QR Code Modal */}
      <Dialog open={!!qrBrochure} onOpenChange={() => setQrBrochure(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code - {qrBrochure?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrBrochure && (
              <div className="bg-white p-4 rounded-lg">
                <QRCode value={`https://iarche.fr/brochure/${qrBrochure.slug}`} size={200} />
              </div>
            )}
            <p className="text-sm text-muted-foreground text-center">
              Scannez ce code pour accéder à la brochure
            </p>
            <Button
              variant="outline"
              onClick={() => {
                if (qrBrochure) copyLink(qrBrochure.slug);
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copier le lien
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminBrochures;
