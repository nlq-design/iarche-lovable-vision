import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Mail, Phone, Building2, FileText, CheckCircle, XCircle } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  consent_marketing: boolean;
  source: string;
  source_id: string | null;
  source_context: string | null;
  message: string | null;
  created_at: string;
}

interface LeadDetailModalProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getSourceBadgeColor = (source: string) => {
  switch (source) {
    case 'newsletter':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
    case 'atelier-webinaire':
      return 'bg-green-100 text-green-800 hover:bg-green-100';
    case 'livre-blanc':
      return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
    case 'contact':
      return 'bg-orange-100 text-orange-800 hover:bg-orange-100';
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
  }
};

const getSourceLabel = (source: string) => {
  switch (source) {
    case 'newsletter':
      return 'Newsletter';
    case 'atelier-webinaire':
      return 'Atelier/Webinaire';
    case 'livre-blanc':
      return 'Livre blanc';
    case 'contact':
      return 'Contact';
    default:
      return source;
  }
};

export function LeadDetailModal({ lead, open, onOpenChange }: LeadDetailModalProps) {
  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Détails du lead</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations principales */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Identité</h3>
              <p className="text-lg font-semibold text-foreground">{lead.name}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Email</h3>
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  {lead.email}
                </a>
              </div>

              {lead.phone && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Téléphone</h3>
                  <a
                    href={`tel:${lead.phone}`}
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    {lead.phone}
                  </a>
                </div>
              )}
            </div>

            {lead.company && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Entreprise</h3>
                <div className="flex items-center gap-2 text-foreground">
                  <Building2 className="h-4 w-4" />
                  {lead.company}
                </div>
              </div>
            )}
          </div>

          {/* Source */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Source</h3>
            <Badge className={getSourceBadgeColor(lead.source)}>
              {getSourceLabel(lead.source)}
            </Badge>
          </div>

          {/* Contexte */}
          {lead.source_context && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Contexte</h3>
              <p className="text-sm text-foreground">{lead.source_context}</p>
            </div>
          )}

          {/* Message */}
          {lead.message && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Message
              </h3>
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm text-foreground whitespace-pre-wrap">{lead.message}</p>
              </div>
            </div>
          )}

          {/* Consentement */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Consentement marketing</h3>
            <div className="flex items-center gap-2">
              {lead.consent_marketing ? (
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

          {/* Date */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Date de création</h3>
            <div className="flex items-center gap-2 text-foreground">
              <Calendar className="h-4 w-4" />
              {new Date(lead.created_at).toLocaleDateString('fr-FR', {
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
            <p className="text-xs text-muted-foreground">ID: {lead.id}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
