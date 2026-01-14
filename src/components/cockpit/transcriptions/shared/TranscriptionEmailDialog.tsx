import { useState } from 'react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, Loader2, Copy, Check, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GeneratedEmail {
  subject: string;
  greeting: string;
  body: string;
  cta: string;
  signature: string;
}

interface TranscriptionEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transcriptionId: string;
  leadId?: string | null;
  leadName?: string | null;
  leadCompany?: string | null;
  leadEmail?: string | null;
  summary?: {
    executive_summary?: string;
    key_points?: string[];
    action_items?: { task: string; owner?: string; due_date?: string; priority?: string }[];
  } | null;
}

export function TranscriptionEmailDialog({
  open,
  onOpenChange,
  transcriptionId,
  leadId,
  leadName,
  leadCompany,
  leadEmail,
  summary,
}: TranscriptionEmailDialogProps) {
  const [emailType, setEmailType] = useState<'post_meeting' | 'followup'>('post_meeting');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState<GeneratedEmail | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedEmail(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-followup-email', {
        body: {
          transcription_id: transcriptionId,
          lead_id: leadId || null,
          email_type: emailType,
          context: {
            transcript_summary: summary?.executive_summary || '',
            key_points: summary?.key_points || [],
            action_items: summary?.action_items || [],
          },
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Erreur de génération');

      setGeneratedEmail(data.email);
      toast.success('Email généré avec succès');
    } catch (err) {
      console.error('Email generation error:', err);
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copié dans le presse-papier');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenMailClient = () => {
    if (!generatedEmail) return;
    const mailto = `mailto:${leadEmail || ''}?subject=${encodeURIComponent(generatedEmail.subject)}&body=${encodeURIComponent(`${generatedEmail.greeting}\n\n${generatedEmail.body.replace(/<[^>]*>/g, '')}\n\n${generatedEmail.signature}`)}`;
    window.open(mailto, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Rédiger un email de suivi
          </DialogTitle>
          <DialogDescription>
            {leadName 
              ? `Email de suivi pour ${leadName}${leadCompany ? ` (${leadCompany})` : ''}`
              : 'Générez un email de suivi basé sur la transcription'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email Type Selector */}
          <div className="space-y-2">
            <Label>Type d'email</Label>
            <Select value={emailType} onValueChange={(v: 'post_meeting' | 'followup') => setEmailType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="post_meeting">
                  Post-RDV - Suivi après la réunion
                </SelectItem>
                <SelectItem value="followup">
                  Relance - Suite aux discussions
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Generate Button */}
          {!generatedEmail && (
            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Générer l'email
                </>
              )}
            </Button>
          )}

          {/* Generated Email Preview */}
          {generatedEmail && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
              {/* Subject */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Objet</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => handleCopy(generatedEmail.subject, 'subject')}
                  >
                    {copiedField === 'subject' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <p className="font-medium text-sm">{generatedEmail.subject}</p>
              </div>

              <Separator />

              {/* Body */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Corps de l'email</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => handleCopy(
                      `${generatedEmail.greeting}\n\n${generatedEmail.body.replace(/<[^>]*>/g, '')}\n\n${generatedEmail.signature}`,
                      'body'
                    )}
                  >
                    {copiedField === 'body' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <div className="bg-background rounded p-3 text-sm space-y-3">
                  <p>{generatedEmail.greeting}</p>
                  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(generatedEmail.body, { ADD_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'] }) }} />
                  <p className="text-muted-foreground whitespace-pre-line">{generatedEmail.signature}</p>
                </div>
              </div>

              {/* CTA Info */}
              {generatedEmail.cta && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium">CTA suggéré :</span>
                  <Badge variant="secondary">{generatedEmail.cta}</Badge>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {generatedEmail && (
            <>
              <Button variant="outline" onClick={() => setGeneratedEmail(null)}>
                Régénérer
              </Button>
              <Button onClick={handleOpenMailClient}>
                <Send className="h-4 w-4 mr-2" />
                Ouvrir dans email
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
