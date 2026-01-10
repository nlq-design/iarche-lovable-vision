import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  Linkedin, 
  MapPin, 
  Target, 
  Calendar,
  Trash2,
  ArrowRight,
  Save
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Vivier } from '@/hooks/viviers/useViviers';
import { VIVIER_STATUSES } from '@/hooks/viviers/useViviers';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface VivierDetailSheetProps {
  vivier: Vivier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<Vivier>) => void;
  onDelete: (id: string) => void;
  onPromote?: (id: string) => void;
  isSaving?: boolean;
}

export function VivierDetailSheet({ 
  vivier, 
  open, 
  onOpenChange, 
  onSave, 
  onDelete,
  onPromote,
  isSaving 
}: VivierDetailSheetProps) {
  const [formData, setFormData] = useState<Partial<Vivier>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (vivier) {
      setFormData(vivier);
      setHasChanges(false);
    }
  }, [vivier]);

  const handleChange = (field: keyof Vivier, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (vivier) {
      onSave({ id: vivier.id, ...formData });
      setHasChanges(false);
    }
  };

  const statusConfig = VIVIER_STATUSES[(vivier?.status as keyof typeof VIVIER_STATUSES) || 'new'];
  const displayName = vivier?.contact_name || 
    [vivier?.contact_first_name, vivier?.contact_last_name].filter(Boolean).join(' ') ||
    vivier?.company_name || 
    vivier?.email || 
    'Sans nom';

  const getScoreColor = (score: number | null | undefined) => {
    if (!score) return 'bg-muted text-muted-foreground';
    if (score >= 80) return 'bg-green-500 text-white';
    if (score >= 60) return 'bg-emerald-500 text-white';
    if (score >= 40) return 'bg-yellow-500 text-white';
    return 'bg-red-500 text-white';
  };

  if (!vivier) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <SheetTitle className="text-lg">{displayName}</SheetTitle>
            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
          </div>
          <SheetDescription className="flex items-center gap-2">
            {vivier.email}
            {vivier.cold_score !== null && vivier.cold_score !== undefined && (
              <Badge className={getScoreColor(vivier.cold_score)}>
                Score: {vivier.cold_score}
              </Badge>
            )}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-220px)] mt-6 pr-4">
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contact</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_first_name">Prénom</Label>
                  <Input
                    id="contact_first_name"
                    value={formData.contact_first_name || ''}
                    onChange={(e) => handleChange('contact_first_name', e.target.value)}
                    placeholder="Jean"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_last_name">Nom</Label>
                  <Input
                    id="contact_last_name"
                    value={formData.contact_last_name || ''}
                    onChange={(e) => handleChange('contact_last_name', e.target.value)}
                    placeholder="Dupont"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_position">Poste</Label>
                <Input
                  id="contact_position"
                  value={formData.contact_position || ''}
                  onChange={(e) => handleChange('contact_position', e.target.value)}
                  placeholder="Directeur Commercial"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" /> Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="jean@entreprise.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" /> Téléphone
                </Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+33 6 12 34 56 78"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin_url" className="flex items-center gap-2">
                  <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                </Label>
                <Input
                  id="linkedin_url"
                  value={formData.linkedin_url || ''}
                  onChange={(e) => handleChange('linkedin_url', e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
            </div>

            <Separator />

            {/* Company Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Entreprise
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="company_name">Nom de l'entreprise</Label>
                <Input
                  id="company_name"
                  value={formData.company_name || ''}
                  onChange={(e) => handleChange('company_name', e.target.value)}
                  placeholder="Acme Corp"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siret">SIRET</Label>
                  <Input
                    id="siret"
                    value={formData.siret || ''}
                    onChange={(e) => handleChange('siret', e.target.value)}
                    placeholder="123 456 789 00012"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Secteur</Label>
                  <Input
                    id="industry"
                    value={formData.industry || ''}
                    onChange={(e) => handleChange('industry', e.target.value)}
                    placeholder="Tech, Finance..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_size">Taille</Label>
                  <Input
                    id="company_size"
                    value={formData.company_size || ''}
                    onChange={(e) => handleChange('company_size', e.target.value)}
                    placeholder="PME, ETI..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee_count">Effectif</Label>
                  <Input
                    id="employee_count"
                    type="number"
                    value={formData.employee_count || ''}
                    onChange={(e) => handleChange('employee_count', parseInt(e.target.value) || null)}
                    placeholder="50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website" className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5" /> Site web
                </Label>
                <Input
                  id="website"
                  value={formData.website || ''}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://www.example.com"
                />
              </div>
            </div>

            <Separator />

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Localisation
              </h3>

              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="123 rue de la Paix"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Code postal</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code || ''}
                    onChange={(e) => handleChange('postal_code', e.target.value)}
                    placeholder="75001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    value={formData.city || ''}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="Paris"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="region">Région</Label>
                <Input
                  id="region"
                  value={formData.region || ''}
                  onChange={(e) => handleChange('region', e.target.value)}
                  placeholder="Île-de-France"
                />
              </div>
            </div>

            <Separator />

            {/* Scoring & Notes */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Target className="h-4 w-4" /> Qualification
              </h3>

              <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold">{vivier.cold_score ?? '-'}</p>
                  <p className="text-xs text-muted-foreground">Score IA</p>
                </div>
                <Separator orientation="vertical" className="h-10" />
                <div>
                  <p className="text-sm font-medium">Source: {vivier.source}</p>
                  {vivier.source_file && (
                    <p className="text-xs text-muted-foreground">{vivier.source_file}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Notes internes sur ce lead..."
                  rows={3}
                />
              </div>
            </div>

            {/* Metadata */}
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                Créé le {vivier.created_at ? format(new Date(vivier.created_at), 'dd MMM yyyy à HH:mm', { locale: fr }) : 'N/A'}
              </div>
              {vivier.promoted_at && (
                <div className="flex items-center gap-2 text-success">
                  <ArrowRight className="h-3.5 w-3.5" />
                  Promu le {format(new Date(vivier.promoted_at), 'dd MMM yyyy', { locale: fr })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="mt-4 flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer ce lead ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Le lead sera définitivement supprimé du vivier.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => {
                    onDelete(vivier.id);
                    onOpenChange(false);
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {!vivier.promoted_at && onPromote && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onPromote(vivier.id)}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Promouvoir
            </Button>
          )}

          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || isSaving}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
