import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Mail, Building2, FileText, Tag } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email: string;
  company: string | null;
  subject: string;
  message: string;
  source: string | null;
  source_context: string | null;
  created_at: string;
}

interface ContactDetailModalProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getSubjectLabel = (subject: string) => {
  const labels: Record<string, string> = {
    'audit': 'Audit IA',
    'developpement': 'Développement',
    'accompagnement': 'Accompagnement',
    'conformite': 'Conformité',
    'autre': 'Autre',
  };
  return labels[subject] || subject;
};

export function ContactDetailModal({ contact, open, onOpenChange }: ContactDetailModalProps) {
  if (!contact) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Détails du contact</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations principales */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Nom</h3>
              <p className="text-lg font-semibold text-foreground">{contact.name}</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Email</h3>
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <Mail className="h-4 w-4" />
                {contact.email}
              </a>
            </div>

            {contact.company && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Entreprise</h3>
                <div className="flex items-center gap-2 text-foreground">
                  <Building2 className="h-4 w-4" />
                  {contact.company}
                </div>
              </div>
            )}
          </div>

          {/* Sujet */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Sujet
            </h3>
            <Badge variant="outline">{getSubjectLabel(contact.subject)}</Badge>
          </div>

          {/* Message */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Message
            </h3>
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm text-foreground whitespace-pre-wrap">{contact.message}</p>
            </div>
          </div>

          {/* Source */}
          {contact.source && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Source</h3>
              <p className="text-sm text-foreground">{contact.source}</p>
            </div>
          )}

          {/* Contexte */}
          {contact.source_context && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Contexte</h3>
              <p className="text-sm text-foreground">{contact.source_context}</p>
            </div>
          )}

          {/* Date */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Date de création</h3>
            <div className="flex items-center gap-2 text-foreground">
              <Calendar className="h-4 w-4" />
              {new Date(contact.created_at).toLocaleDateString('fr-FR', {
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
            <p className="text-xs text-muted-foreground">ID: {contact.id}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
