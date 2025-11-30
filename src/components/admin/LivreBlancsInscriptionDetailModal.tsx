import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Mail, Phone, Building2, BookOpen, CheckCircle, XCircle } from 'lucide-react';

interface LivreBlancsInscription {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  consent_marketing: boolean;
  source_id: string | null;
  created_at: string;
  article: {
    title: string;
  } | null;
}

interface LivreBlancsInscriptionDetailModalProps {
  inscription: LivreBlancsInscription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LivreBlancsInscriptionDetailModal({ inscription, open, onOpenChange }: LivreBlancsInscriptionDetailModalProps) {
  if (!inscription) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Détails de l'inscription</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Livre blanc */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Livre blanc
            </h3>
            <p className="text-lg font-semibold text-foreground">
              {inscription.article?.title || 'Livre blanc supprimé'}
            </p>
          </div>

          {/* Informations du participant */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Nom</h3>
              <p className="text-lg font-semibold text-foreground">{inscription.name}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Email</h3>
                <a
                  href={`mailto:${inscription.email}`}
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  {inscription.email}
                </a>
              </div>

              {inscription.phone && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Téléphone</h3>
                  <a
                    href={`tel:${inscription.phone}`}
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    {inscription.phone}
                  </a>
                </div>
              )}
            </div>

            {inscription.company && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Entreprise</h3>
                <div className="flex items-center gap-2 text-foreground">
                  <Building2 className="h-4 w-4" />
                  {inscription.company}
                </div>
              </div>
            )}
          </div>

          {/* Consentement */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Consentement marketing</h3>
            <div className="flex items-center gap-2">
              {inscription.consent_marketing ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-600 font-medium">Oui</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  <span className="text-muted-foreground">Non</span>
                </>
              )}
            </div>
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

          {/* ID technique */}
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">ID: {inscription.id}</p>
            {inscription.source_id && (
              <p className="text-xs text-muted-foreground">Livre blanc ID: {inscription.source_id}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
