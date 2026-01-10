import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { VivierLayout } from '@/components/viviers/VivierLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Save, Trash2, Building2, Mail, Phone, MapPin, Globe, Linkedin, Calendar, Hash, Users, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import LogoArc from '@/components/ui/LogoArc';
import type { Vivier } from '@/hooks/viviers/useViviers';
import { VIVIER_STATUSES } from '@/hooks/viviers/useViviers';

// Generate slug from vivier data
export function generateVivierSlug(vivier: Vivier): string {
  const parts: string[] = [];
  
  // Use company name or contact name as primary identifier
  if (vivier.company_name) {
    parts.push(vivier.company_name);
  } else if (vivier.contact_name) {
    parts.push(vivier.contact_name);
  } else if (vivier.contact_last_name) {
    parts.push(vivier.contact_last_name);
  }
  
  // Add city for uniqueness
  if (vivier.city) {
    parts.push(vivier.city);
  }
  
  // Add ID suffix for guaranteed uniqueness
  parts.push(vivier.id.substring(0, 8));
  
  return parts
    .join('-')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9-]/g, '-') // Replace special chars
    .replace(/-+/g, '-') // Remove multiple dashes
    .replace(/^-|-$/g, ''); // Trim dashes
}

export default function VivierLeadDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<Partial<Vivier>>({});
  const [isEditing, setIsEditing] = useState(false);

  // Fetch vivier by slug (extract ID from end of slug)
  const { data: vivier, isLoading, error } = useQuery({
    queryKey: ['vivier-by-slug', slug],
    queryFn: async () => {
      if (!slug) return null;
      
      // Extract ID from slug (last 8 characters)
      const idPrefix = slug.split('-').pop();
      
      if (!idPrefix) return null;
      
      const { data, error } = await supabase
        .from('viviers')
        .select('*')
        .ilike('id', `${idPrefix}%`)
        .maybeSingle();

      if (error) throw error;
      return data as Vivier | null;
    },
    enabled: !!slug,
  });

  // Update form data when vivier loads
  useEffect(() => {
    if (vivier) {
      setFormData(vivier);
    }
  }, [vivier]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Vivier>) => {
      if (!vivier?.id) throw new Error('No vivier ID');
      
      const { error } = await supabase
        .from('viviers')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', vivier.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vivier-by-slug', slug] });
      queryClient.invalidateQueries({ queryKey: ['viviers'] });
      toast.success('Lead mis à jour');
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!vivier?.id) throw new Error('No vivier ID');
      
      const { error } = await supabase
        .from('viviers')
        .delete()
        .eq('id', vivier.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['viviers'] });
      toast.success('Lead supprimé');
      navigate('/viviers/leads');
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleChange = (field: keyof Vivier, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <VivierLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </VivierLayout>
    );
  }

  if (!vivier) {
    return (
      <VivierLayout>
        <div className="p-6">
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <h3 className="text-lg font-semibold mb-2">Lead non trouvé</h3>
              <p className="text-muted-foreground mb-4">Ce lead n'existe pas ou a été supprimé.</p>
              <Button onClick={() => navigate('/viviers/leads')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour aux leads
              </Button>
            </CardContent>
          </Card>
        </div>
      </VivierLayout>
    );
  }

  const statusConfig = VIVIER_STATUSES[(vivier.status as keyof typeof VIVIER_STATUSES) || 'new'];

  return (
    <VivierLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/viviers/leads')} className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Retour
            </Button>
            <h1 className="text-2xl font-bold text-foreground">
              {vivier.company_name || vivier.contact_name || vivier.email}
            </h1>
            <LogoArc size="sm" className="mt-2" />
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={`${statusConfig.color} text-white border-0`}>
                {statusConfig.label}
              </Badge>
              {vivier.cold_score !== null && (
                <Badge variant="outline">Score: {vivier.cold_score}</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => { setIsEditing(false); setFormData(vivier); }}>
                  Annuler
                </Button>
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Enregistrer
                </Button>
              </>
            ) : (
              <>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer ce lead ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible. Le lead sera définitivement supprimé.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground">
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button onClick={() => setIsEditing(true)}>
                  Modifier
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="w-5 h-5" />
                Entreprise
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Raison sociale</Label>
                  {isEditing ? (
                    <Input 
                      value={formData.company_name || ''} 
                      onChange={(e) => handleChange('company_name', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm mt-1">{vivier.company_name || '-'}</p>
                  )}
                </div>
                <div>
                  <Label>Activité / Secteur</Label>
                  {isEditing ? (
                    <Input 
                      value={formData.industry || ''} 
                      onChange={(e) => handleChange('industry', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm mt-1">{vivier.industry || '-'}</p>
                  )}
                </div>
                <div>
                  <Label>SIRET</Label>
                  {isEditing ? (
                    <Input 
                      value={formData.siret || ''} 
                      onChange={(e) => handleChange('siret', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm mt-1 font-mono">{vivier.siret || '-'}</p>
                  )}
                </div>
                <div>
                  <Label>Code NAF/APE</Label>
                  {isEditing ? (
                    <Input 
                      value={formData.naf_code || ''} 
                      onChange={(e) => handleChange('naf_code', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm mt-1 font-mono">{vivier.naf_code || '-'}</p>
                  )}
                </div>
                <div>
                  <Label>Forme juridique</Label>
                  {isEditing ? (
                    <Input 
                      value={formData.legal_form || ''} 
                      onChange={(e) => handleChange('legal_form', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm mt-1">{vivier.legal_form || '-'}</p>
                  )}
                </div>
                <div>
                  <Label>Effectif</Label>
                  {isEditing ? (
                    <Input 
                      value={formData.company_size || ''} 
                      onChange={(e) => handleChange('company_size', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm mt-1">{vivier.company_size || '-'}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5" />
                Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Dirigeant / Contact</Label>
                  {isEditing ? (
                    <Input 
                      value={formData.contact_name || ''} 
                      onChange={(e) => handleChange('contact_name', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm mt-1">{vivier.contact_name || '-'}</p>
                  )}
                </div>
                <div>
                  <Label>Poste</Label>
                  {isEditing ? (
                    <Input 
                      value={formData.contact_position || ''} 
                      onChange={(e) => handleChange('contact_position', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm mt-1">{vivier.contact_position || '-'}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <Label className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Email</Label>
                  {isEditing ? (
                    <Input 
                      type="email"
                      value={formData.email || ''} 
                      onChange={(e) => handleChange('email', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm mt-1">{vivier.email || '-'}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <Label className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Téléphone</Label>
                  {isEditing ? (
                    <Input 
                      value={formData.phone || ''} 
                      onChange={(e) => handleChange('phone', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm mt-1">{vivier.phone || '-'}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="w-5 h-5" />
                Localisation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Adresse</Label>
                  {isEditing ? (
                    <Input 
                      value={formData.address || ''} 
                      onChange={(e) => handleChange('address', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm mt-1">{vivier.address || '-'}</p>
                  )}
                </div>
                <div>
                  <Label>Code postal</Label>
                  {isEditing ? (
                    <Input 
                      value={formData.postal_code || ''} 
                      onChange={(e) => handleChange('postal_code', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm mt-1">{vivier.postal_code || '-'}</p>
                  )}
                </div>
                <div>
                  <Label>Ville</Label>
                  {isEditing ? (
                    <Input 
                      value={formData.city || ''} 
                      onChange={(e) => handleChange('city', e.target.value)}
                    />
                  ) : (
                    <p className="text-sm mt-1">{vivier.city || '-'}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea 
                  value={formData.notes || ''} 
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={4}
                  placeholder="Notes internes..."
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{vivier.notes || 'Aucune note'}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </VivierLayout>
  );
}
