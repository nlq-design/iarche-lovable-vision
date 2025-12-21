import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Mail, 
  Phone, 
  Building2, 
  Calendar, 
  MessageSquare,
  Trash2,
  Save,
  ExternalLink,
  User,
  Briefcase,
  Tag
} from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCockpitLeads } from '@/hooks/cockpit';
import { useLeads } from '@/hooks/shared/useLeads';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  company_size?: string | null;
  industry?: string | null;
  source: string;
  source_context?: string | null;
  message?: string | null;
  qualification_status?: string | null;
  lead_score?: number | null;
  consent_marketing?: boolean | null;
  created_at?: string | null;
  last_contacted_at?: string | null;
}

interface LeadDetailSheetProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SOURCE_LABELS: Record<string, string> = {
  'contact': 'Formulaire Contact',
  'newsletter': 'Newsletter',
  'atelier-webinaire': 'Atelier/Webinaire',
  'livre-blanc': 'Livre blanc',
  'formulaire': 'Formulaire',
};

const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 employés' },
  { value: '11-50', label: '11-50 employés' },
  { value: '51-200', label: '51-200 employés' },
  { value: '201-500', label: '201-500 employés' },
  { value: '500+', label: '500+ employés' },
];

const INDUSTRIES = [
  'Agriculture',
  'Agroalimentaire',
  'Automobile',
  'BTP / Construction',
  'Commerce / Distribution',
  'Conseil',
  'Éducation / Formation',
  'Énergie',
  'Finance / Banque',
  'Immobilier',
  'Industrie',
  'IT / Numérique',
  'Logistique / Transport',
  'Santé',
  'Services',
  'Tourisme / Hôtellerie',
  'Autre',
];

export function LeadDetailSheet({ lead, open, onOpenChange }: LeadDetailSheetProps) {
  const { updateLead } = useCockpitLeads();
  const { deleteLead } = useLeads();
  const [formData, setFormData] = useState<Partial<Lead>>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        company_size: lead.company_size,
        industry: lead.industry,
        message: lead.message,
      });
      setHasChanges(false);
    }
  }, [lead]);

  const handleChange = (field: keyof Lead, value: string | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (lead && hasChanges) {
      updateLead.mutate({ id: lead.id, ...formData }, {
        onSuccess: () => {
          setHasChanges(false);
        }
      });
    }
  };

  const handleDelete = () => {
    if (lead) {
      deleteLead.mutate(lead.id, {
        onSuccess: () => {
          setShowDeleteDialog(false);
          onOpenChange(false);
        }
      });
    }
  };

  if (!lead) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl">{lead.name}</SheetTitle>
              <Badge variant="outline">
                {SOURCE_LABELS[lead.source] || lead.source}
              </Badge>
            </div>
            <SheetDescription className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              Créé le {lead.created_at && format(new Date(lead.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Contact Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <User className="h-4 w-4" />
                Informations de contact
              </h3>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => handleChange('name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    Téléphone
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value || null)}
                    placeholder="Non renseigné"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Company Info Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Entreprise
              </h3>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Nom de l'entreprise</Label>
                  <Input
                    id="company"
                    value={formData.company || ''}
                    onChange={(e) => handleChange('company', e.target.value || null)}
                    placeholder="Non renseigné"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_size">Taille de l'entreprise</Label>
                  <Select
                    value={formData.company_size || ''}
                    onValueChange={(value) => handleChange('company_size', value || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZES.map(size => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry" className="flex items-center gap-2">
                    <Briefcase className="h-3 w-3" />
                    Secteur d'activité
                  </Label>
                  <Select
                    value={formData.industry || ''}
                    onValueChange={(value) => handleChange('industry', value || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map(industry => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Message Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Message / Contexte
              </h3>
              
              {lead.source_context && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Contexte source</p>
                  <p className="text-sm">{lead.source_context}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="message">Notes / Message</Label>
                <Textarea
                  id="message"
                  value={formData.message || ''}
                  onChange={(e) => handleChange('message', e.target.value || null)}
                  placeholder="Notes sur ce lead..."
                  className="min-h-[100px]"
                />
              </div>
            </div>

            <Separator />

            {/* Metadata Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Métadonnées
              </h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Score</p>
                  <Badge variant={lead.lead_score && lead.lead_score >= 70 ? 'default' : 'secondary'}>
                    {lead.lead_score || 0} pts
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Consentement marketing</p>
                  <Badge variant={lead.consent_marketing ? 'default' : 'outline'}>
                    {lead.consent_marketing ? 'Oui' : 'Non'}
                  </Badge>
                </div>
                {lead.last_contacted_at && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Dernier contact</p>
                    <p>{format(new Date(lead.last_contacted_at), 'dd MMMM yyyy', { locale: fr })}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="default"
                className="flex-1"
                onClick={handleSave}
                disabled={!hasChanges || updateLead.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateLead.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce lead ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le lead "{lead.name}" sera définitivement supprimé 
              de la base de données.
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
    </>
  );
}
