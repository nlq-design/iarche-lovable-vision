import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/layouts/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
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

interface Tag {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

const AdminTags = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      loadTags();
    }
  }, [user, isAdmin]);

  const loadTags = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name');

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les tags',
        variant: 'destructive',
      });
    } else {
      setTags(data || []);
    }
    setLoading(false);
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!editingId) {
      setSlug(generateSlug(value));
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le nom et le slug sont requis',
        variant: 'destructive',
      });
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from('tags')
        .update({ name, slug })
        .eq('id', editingId);

      if (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible de mettre à jour le tag',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Succès',
          description: 'Tag mis à jour',
        });
        resetForm();
        loadTags();
      }
    } else {
      const { error } = await supabase.from('tags').insert({ name, slug });

      if (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible de créer le tag',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Succès',
          description: 'Tag créé',
        });
        resetForm();
        loadTags();
      }
    }
  };

  const handleEdit = (tag: Tag) => {
    setIsEditing(true);
    setEditingId(tag.id);
    setName(tag.name);
    setSlug(tag.slug);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase.from('tags').delete().eq('id', deleteId);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le tag',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Succès',
        description: 'Tag supprimé',
      });
      loadTags();
    }
    setDeleteId(null);
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setName('');
    setSlug('');
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

  return (
    <AdminLayout>
      <Helmet>
        <title>Gestion des tags - IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen px-6 py-12">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <NavLink to="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour au tableau de bord
              </Button>
            </NavLink>
          </div>

          <Card className="bg-background/95 border-border mb-6">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground">
                {isEditing ? 'Modifier le tag' : 'Nouveau tag'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nom</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ex: Machine Learning"
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="Ex: machine-learning"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave}>
                  {isEditing ? 'Mettre à jour' : 'Créer'}
                </Button>
                {isEditing && (
                  <Button variant="outline" onClick={resetForm}>
                    Annuler
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-background/95 border-border">
            <CardHeader>
              <CardTitle className="text-xl text-foreground">
                Tags existants
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tags.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aucun tag créé
                </p>
              ) : (
                <div className="space-y-2">
                  {tags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors"
                    >
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {tag.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Slug: {tag.slug}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(tag)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteId(tag.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce tag ? Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminTags;
