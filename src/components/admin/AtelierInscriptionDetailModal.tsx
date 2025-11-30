import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Mail, Phone, Building2, User, Users } from 'lucide-react';

interface AtelierInscription {
  id: string;
  atelier_id: string;
  lead_id: string;
  created_at: string;
  atelier: {
    title: string;
    event_date: string | null;
  };
  lead: {
    name: string;
    email: string;
    company: string | null;
    phone: string | null;
  };
}

interface AtelierInscriptionDetailModalProps {
  inscription: AtelierInscription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AtelierInscriptionDetailModal({ inscription, open, onOpenChange }: AtelierInscriptionDetailModalProps) {
  if (!inscription) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Détails de l'inscription</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Atelier */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Atelier / Webinaire
            </h3>
            <p className="text-lg font-semibold text-foreground">{inscription.atelier.title}</p>
            {inscription.atelier.event_date && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Date de l'événement: {new Date(inscription.atelier.event_date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            )}
          </div>

          {/* Informations du participant */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                Participant
              </h3>
              <p className="text-lg font-semibold text-foreground">{inscription.lead.name}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Email</h3>
                <a
                  href={`mailto:${inscription.lead.email}`}
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  {inscription.lead.email}
                </a>
              </div>

              {inscription.lead.phone && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Téléphone</h3>
                  <a
                    href={`tel:${inscription.lead.phone}`}
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    {inscription.lead.phone}
                  </a>
                </div>
              )}
            </div>

            {inscription.lead.company && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Entreprise</h3>
                <div className="flex items-center gap-2 text-foreground">
                  <Building2 className="h-4 w-4" />
                  {inscription.lead.company}
                </div>
              </div>
            )}
          </div>

          {/* Date d'inscription */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Date d'inscription</h3>
            <div className="flex items-center gap-2 text-foreground">
              <Calendar className="h-4 w-4" />
              {new Date(inscription.created_at).toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>

          {/* IDs techniques */}
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">ID inscription: {inscription.id}</p>
            <p className="text-xs text-muted-foreground">Atelier ID: {inscription.atelier_id}</p>
            <p className="text-xs text-muted-foreground">Lead ID: {inscription.lead_id}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
