import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, Copy, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useInvitationEmailHtml } from '@/lib/email/useInvitationEmailHtml';
import { slugifyFilename } from '@/lib/email/filename';
import type { InvitationContentJson } from '@/lib/email/types';

interface EmailHtmlExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docId: string;
  slug: string;
  content: InvitationContentJson;
  eventTitle: string;
}

export function EmailHtmlExportDialog({
  open,
  onOpenChange,
  docId,
  slug,
  content,
  eventTitle,
}: EmailHtmlExportDialogProps) {
  const { generate, loading, error } = useInvitationEmailHtml();
  const [html, setHtml] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const runGenerate = useCallback(async () => {
    setHtml(null);
    setGenError(null);
    try {
      const { html: generatedHtml } = await generate({ docId, slug, content });
      setHtml(generatedHtml);
      try {
        await navigator.clipboard.writeText(generatedHtml);
        toast.success('HTML email copié dans le presse-papier');
      } catch {
        toast.info('Copie manuelle : utilise le textarea ci-dessous');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de génération';
      setGenError(message);
      toast.error('Échec de la génération HTML', { description: message });
    }
  }, [generate, docId, slug, content]);

  useEffect(() => {
    if (open && !html && !loading && !genError) {
      runGenerate();
    }
    if (!open) {
      // Reset on close so re-open regenerates fresh
      setHtml(null);
      setGenError(null);
    }
  }, [open, html, loading, genError, runGenerate]);

  const handleManualCopy = async () => {
    if (!html) return;
    try {
      await navigator.clipboard.writeText(html);
      toast.success('HTML copié');
    } catch {
      toast.error('Copie automatique impossible — sélectionne le texte manuellement');
    }
  };

  const handleDownload = () => {
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slugifyFilename(eventTitle)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const showError = error || genError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Export HTML email — Brevo</DialogTitle>
          <DialogDescription>
            HTML email-safe prêt à coller dans l'éditeur HTML de Brevo.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center gap-3 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Génération du QR code et du HTML…</span>
          </div>
        )}

        {showError && !loading && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{showError}</span>
              <Button size="sm" variant="outline" onClick={runGenerate}>
                Réessayer
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {html && !loading && (
          <div className="space-y-3">
            <Textarea
              value={html}
              readOnly
              className="font-mono text-xs h-[300px] resize-none"
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className="flex items-center gap-2">
              <Button onClick={handleManualCopy} size="sm">
                <Copy className="h-4 w-4 mr-1" />
                Copier HTML
              </Button>
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Télécharger .html
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
