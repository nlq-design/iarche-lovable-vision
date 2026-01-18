import { useState } from 'react';
import { PartnerLayout } from '@/components/partner/PartnerLayout';
import { PartnerTimeEntryForm } from '@/components/partner/PartnerTimeEntryForm';
import { 
  usePartnerTimeEntries, 
  useDeleteTimeEntry,
  usePartnerTimeStats,
  PartnerTimeEntry 
} from '@/hooks/partner/usePartnerTimeEntries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
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
  Clock, 
  Plus, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  Hourglass,
  Pencil,
  Trash2,
  FolderKanban,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'En attente', variant: 'secondary' },
  validated: { label: 'Validé', variant: 'default' },
  rejected: { label: 'Refusé', variant: 'destructive' },
};

export default function PartnerTimeTracking() {
  const { data: entries, isLoading } = usePartnerTimeEntries();
  const { data: stats, isLoading: statsLoading } = usePartnerTimeStats();
  const deleteMutation = useDeleteTimeEntry();
  
  const [formOpen, setFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<PartnerTimeEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<PartnerTimeEntry | null>(null);

  const handleEdit = (entry: PartnerTimeEntry) => {
    if (entry.status !== 'pending') {
      toast.error('Seules les saisies en attente peuvent être modifiées');
      return;
    }
    setEditEntry(entry);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteEntry) return;
    try {
      await deleteMutation.mutateAsync(deleteEntry.id);
      toast.success('Saisie supprimée');
      setDeleteEntry(null);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    }
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditEntry(null);
  };

  const statCards = [
    {
      title: 'Cette semaine',
      value: stats?.thisWeek ?? 0,
      unit: 'h',
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Ce mois',
      value: stats?.thisMonth ?? 0,
      unit: 'h',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'En attente',
      value: stats?.pendingHours ?? 0,
      unit: 'h',
      icon: Hourglass,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Validées',
      value: stats?.validatedHours ?? 0,
      unit: 'h',
      icon: CheckCircle2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <PartnerLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="h-6 w-6" />
              Suivi du temps
            </h1>
            <p className="text-muted-foreground">
              Enregistrez et suivez le temps passé sur vos missions
            </p>
          </div>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Saisir du temps
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.title}</p>
                    {statsLoading ? (
                      <Skeleton className="h-6 w-12" />
                    ) : (
                      <p className="text-xl font-bold">
                        {stat.value}<span className="text-sm font-normal">{stat.unit}</span>
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Time Entries Table */}
        <Card>
          <CardHeader>
            <CardTitle>Historique des saisies</CardTitle>
            <CardDescription>
              {stats?.totalEntries ?? 0} saisie{(stats?.totalEntries ?? 0) > 1 ? 's' : ''} enregistrée{(stats?.totalEntries ?? 0) > 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : entries && entries.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Heures</TableHead>
                      <TableHead>Rattachement</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {format(new Date(entry.date), 'dd MMM yyyy', { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {entry.hours}h
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {entry.project ? (
                            <div className="flex items-center gap-1.5">
                              <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{entry.project.name}</span>
                            </div>
                          ) : entry.lead ? (
                            <div className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{entry.lead.company || entry.lead.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <span className="text-sm text-muted-foreground truncate block">
                            {entry.description || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[entry.status]?.variant || 'secondary'}>
                            {statusConfig[entry.status]?.label || entry.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {entry.status === 'pending' && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(entry)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteEntry(entry)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Clock className="h-12 w-12 mb-4 opacity-50" />
                <p>Aucune saisie de temps</p>
                <p className="text-sm">Commencez par enregistrer du temps passé sur vos missions</p>
                <Button className="mt-4" onClick={() => setFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Première saisie
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <PartnerTimeEntryForm
        open={formOpen}
        onOpenChange={handleFormClose}
        editEntry={editEntry}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteEntry} onOpenChange={() => setDeleteEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette saisie ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La saisie de {deleteEntry?.hours}h du{' '}
              {deleteEntry && format(new Date(deleteEntry.date), 'dd MMMM yyyy', { locale: fr })}{' '}
              sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PartnerLayout>
  );
}
