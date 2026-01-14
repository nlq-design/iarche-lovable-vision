import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DOMPurify from 'dompurify';
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, Clock, CheckCircle, AlertCircle, Copy, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface EmailDraft {
  id: string;
  title: string;
  content: string;
  created_at: string;
  ai_metadata: {
    email_type?: string;
    email_data?: {
      subject: string;
      greeting: string;
      body: string;
      cta: string;
      cta_url: string;
      signature: string;
    };
    recipient_email?: string;
    recipient_name?: string;
    validated_by_human?: boolean;
  };
  metadata?: {
    draft_status?: string;
    email_subject?: string;
  };
  lead?: {
    id: string;
    name: string;
    email: string;
  };
}

interface EmailDraftsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string;
}

export function EmailDraftsSheet({ open, onOpenChange, leadId }: EmailDraftsSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDraft, setSelectedDraft] = useState<EmailDraft | null>(null);

  const { data: drafts, isLoading } = useQuery({
    queryKey: ["email-drafts", leadId],
    queryFn: async () => {
      let query = supabase
        .from("activity_log")
        .select(`
          id, title, content, created_at, ai_metadata, metadata,
          lead:leads(id, name, email)
        `)
        .eq("activity_type", "email_draft_generated")
        .order("created_at", { ascending: false })
        .limit(50);

      if (leadId) {
        query = query.eq("lead_id", leadId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as EmailDraft[];
    },
    enabled: open,
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (draft: EmailDraft) => {
      const emailData = draft.ai_metadata?.email_data;
      const recipientEmail = draft.ai_metadata?.recipient_email || draft.lead?.email;
      
      if (!emailData || !recipientEmail) {
        throw new Error("Données email incomplètes");
      }

      // Check email domain warmup status before sending
      const { data: domains } = await supabase
        .from("email_domains")
        .select("domain, warmup_status, is_active, domain_type")
        .eq("is_active", true)
        .in("domain_type", ["transactional", "primary"]);

      const readyDomain = domains?.find(d => d.warmup_status === "ready");
      
      if (!readyDomain && domains && domains.length > 0) {
        const warmingDomains = domains.filter(d => d.warmup_status === "warming");
        if (warmingDomains.length > 0) {
          throw new Error(`Domaines en cours de warmup (${warmingDomains.map(d => d.domain).join(", ")}). Attendez que le warmup soit terminé ou utilisez un domaine prêt.`);
        }
      }

      // Call the send-email edge function
      const response = await supabase.functions.invoke("send-transactional-email", {
        body: {
          to: recipientEmail,
          subject: emailData.subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <p>${emailData.greeting}</p>
              <div>${emailData.body}</div>
              ${emailData.cta ? `
                <p style="margin: 24px 0;">
                  <a href="${emailData.cta_url}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                    ${emailData.cta}
                  </a>
                </p>
              ` : ""}
              <p>${emailData.signature.replace(/\n/g, "<br>")}</p>
            </div>
          `,
          source_type: "email_draft",
          source_id: draft.id,
        },
      });

      if (response.error) throw response.error;

      // Update activity log to mark as sent
      await supabase
        .from("activity_log")
        .update({
          metadata: {
            ...draft.metadata,
            draft_status: "sent",
            sent_at: new Date().toISOString(),
          },
          ai_metadata: {
            ...draft.ai_metadata,
            validated_by_human: true,
          },
        })
        .eq("id", draft.id);

      return response.data;
    },
    onSuccess: () => {
      toast({ title: "Email envoyé", description: "Le brouillon a été envoyé avec succès" });
      queryClient.invalidateQueries({ queryKey: ["email-drafts"] });
      setSelectedDraft(null);
    },
    onError: (error) => {
      toast({
        title: "Erreur d'envoi",
        description: error instanceof Error ? error.message : "Impossible d'envoyer l'email",
        variant: "destructive",
      });
    },
  });

  const deleteDraftMutation = useMutation({
    mutationFn: async (draftId: string) => {
      const { error } = await supabase
        .from("activity_log")
        .delete()
        .eq("id", draftId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Brouillon supprimé" });
      queryClient.invalidateQueries({ queryKey: ["email-drafts"] });
      setSelectedDraft(null);
    },
  });

  const copyToClipboard = (draft: EmailDraft) => {
    const emailData = draft.ai_metadata?.email_data;
    if (!emailData) return;

    const text = `Objet: ${emailData.subject}\n\n${emailData.greeting}\n\n${emailData.body}\n\n${emailData.cta}\n\n${emailData.signature}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Copié", description: "Email copié dans le presse-papier" });
  };

  const getStatusBadge = (draft: EmailDraft) => {
    const status = draft.metadata?.draft_status || "pending_review";
    switch (status) {
      case "sent":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Envoyé</Badge>;
      case "pending_review":
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> À relire</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Brouillons d'emails IA
          </SheetTitle>
          <SheetDescription>
            Emails générés par l'agent IA en attente de validation
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : drafts && drafts.length > 0 ? (
            <div className="space-y-4">
              {selectedDraft ? (
                // Detail view
                <div className="space-y-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDraft(null)}
                  >
                    ← Retour à la liste
                  </Button>

                  <div className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{selectedDraft.ai_metadata?.email_data?.subject}</h3>
                      {getStatusBadge(selectedDraft)}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <span>À : </span>
                      <span className="font-medium">
                        {selectedDraft.ai_metadata?.recipient_name || selectedDraft.lead?.name} 
                        {" <"}{selectedDraft.ai_metadata?.recipient_email || selectedDraft.lead?.email}{">"}
                      </span>
                    </div>

                    <Separator />

                    <div className="prose prose-sm max-w-none">
                      <p className="font-medium">{selectedDraft.ai_metadata?.email_data?.greeting}</p>
                      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedDraft.ai_metadata?.email_data?.body || "", { ADD_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'] }) }} />
                      {selectedDraft.ai_metadata?.email_data?.cta && (
                        <p>
                          <a href={selectedDraft.ai_metadata?.email_data?.cta_url} className="text-primary font-medium">
                            {selectedDraft.ai_metadata?.email_data?.cta}
                          </a>
                        </p>
                      )}
                      <p className="whitespace-pre-line text-muted-foreground">
                        {selectedDraft.ai_metadata?.email_data?.signature}
                      </p>
                    </div>

                    <Separator />

                    <div className="flex gap-2">
                      {selectedDraft.metadata?.draft_status !== "sent" && (
                        <Button
                          onClick={() => sendEmailMutation.mutate(selectedDraft)}
                          disabled={sendEmailMutation.isPending}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          {sendEmailMutation.isPending ? "Envoi..." : "Envoyer"}
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => copyToClipboard(selectedDraft)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copier
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => deleteDraftMutation.mutate(selectedDraft.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                // List view
                drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedDraft(draft)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">
                          {draft.ai_metadata?.email_data?.subject || draft.title}
                        </h4>
                        <p className="text-sm text-muted-foreground truncate">
                          À : {draft.ai_metadata?.recipient_name || draft.lead?.name || "Inconnu"}
                          {" <"}{draft.ai_metadata?.recipient_email || draft.lead?.email || ""}{">"} 
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(draft.created_at), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                        </p>
                      </div>
                      {getStatusBadge(draft)}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium">Aucun brouillon</h3>
              <p className="text-sm text-muted-foreground">
                Demandez à l'agent IA de générer un email pour un lead
              </p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
