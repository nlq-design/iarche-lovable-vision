import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, X, Plus, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TestEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
  subject: string;
  htmlContent: string;
  senderName?: string;
  senderEmail?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function TestEmailDialog({
  open,
  onOpenChange,
  campaignId,
  campaignName,
  subject,
  htmlContent,
  senderName = 'IArche',
  senderEmail,
}: TestEmailDialogProps) {
  const { toast } = useToast();
  const [recipients, setRecipients] = useState<string[]>(['']);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const addRecipient = () => {
    if (recipients.length < 5) {
      setRecipients([...recipients, '']);
    }
  };

  const removeRecipient = (index: number) => {
    if (recipients.length > 1) {
      setRecipients(recipients.filter((_, i) => i !== index));
    }
  };

  const updateRecipient = (index: number, value: string) => {
    const updated = [...recipients];
    updated[index] = value.trim();
    setRecipients(updated);
  };

  const validRecipients = recipients.filter(r => EMAIL_REGEX.test(r));

  const sendTestEmail = async () => {
    if (validRecipients.length === 0) {
      toast({ title: 'Erreur', description: 'Ajoutez au moins un email valide', variant: 'destructive' });
      return;
    }

    if (!subject || !htmlContent) {
      toast({ title: 'Erreur', description: 'Sujet et contenu requis', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-campaign-test', {
        body: {
          campaign_id: campaignId,
          recipients: validRecipients,
          subject,
          html_content: htmlContent,
          sender_name: senderName,
          sender_email: senderEmail,
        },
      });

      if (error) throw error;

      setResult({ success: true, message: `Email test envoyé à ${validRecipients.length} destinataire(s)` });
      toast({ title: 'Email test envoyé', description: `Envoyé à ${validRecipients.join(', ')}` });

      // Update campaign test_sent_at
      await supabase
        .from('vivier_campaigns')
        .update({ 
          test_sent_at: new Date().toISOString(),
          test_recipients: validRecipients,
        })
        .eq('id', campaignId);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de l\'envoi';
      setResult({ success: false, message });
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Envoyer un email test</DialogTitle>
          <DialogDescription>
            Testez votre campagne "{campaignName}" avant l'envoi réel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Subject preview */}
          <div>
            <Label className="text-muted-foreground text-xs">Sujet</Label>
            <p className="font-medium">{subject || '(non défini)'}</p>
          </div>

          {/* Recipients */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Destinataires test (max 5)</Label>
              {recipients.length < 5 && (
                <Button variant="ghost" size="sm" onClick={addRecipient}>
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter
                </Button>
              )}
            </div>
            {recipients.map((email, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => updateRecipient(index, e.target.value)}
                  placeholder="email@example.com"
                  className={email && !EMAIL_REGEX.test(email) ? 'border-destructive' : ''}
                />
                {recipients.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeRecipient(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Validation info */}
          <div className="flex gap-2">
            <Badge variant={validRecipients.length > 0 ? 'default' : 'secondary'}>
              {validRecipients.length} email(s) valide(s)
            </Badge>
          </div>

          {/* Result */}
          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              {result.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSending}>
            Fermer
          </Button>
          <Button onClick={sendTestEmail} disabled={validRecipients.length === 0 || isSending}>
            {isSending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Envoyer le test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
