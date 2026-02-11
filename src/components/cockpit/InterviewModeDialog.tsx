import { useState, useEffect } from 'react';
import { Loader2, MessageCircle, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCockpitChatbotV2 } from '@/hooks/cockpit/useCockpitChatbotV2';
import { cn } from '@/lib/utils';

interface InterviewModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'lead' | 'opportunity' | 'project';
  entityId: string;
  entityName: string;
  workspaceId?: string;
  /** Override default missing fields with dynamic ones from completeness check */
  missingFields?: string[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function InterviewModeDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
  workspaceId,
  missingFields: propMissingFields,
}: InterviewModeDialogProps) {
  const defaultMissing = propMissingFields?.length ? propMissingFields : ['email', 'phone', 'budget', 'decision_date'];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [interviewContext, setInterviewContext] = useState({
    entity_type: entityType,
    entity_id: entityId,
    missing_fields: defaultMissing,
    current_question: 0,
    completed: false,
  });

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setMessages([]);
      setInput('');
      const fields = propMissingFields?.length ? propMissingFields : ['email', 'phone', 'budget', 'decision_date'];
      setInterviewContext({
        entity_type: entityType,
        entity_id: entityId,
        missing_fields: fields,
        current_question: 0,
        completed: false,
      });
    }
  }, [open, entityType, entityId, propMissingFields]);

  const { sendMessage } = useCockpitChatbotV2(workspaceId);
  const isLoading = sendMessage.isPending;

  // Start interview when dialog opens
  useEffect(() => {
    if (open && messages.length === 0) {
      const initialContext = {
        entity_type: entityType,
        entity_id: entityId,
        missing_fields: ['email', 'phone', 'budget', 'decision_date'],
        current_question: 0,
      };

      sendMessage.mutate(
        {
          messages: [
            {
              role: 'assistant',
              content: `Salut ! Je vais t'aider à enrichir les données de ${entityName}. Commençons !`,
            },
          ],
          mode: 'interview',
          interview_context: initialContext,
        },
        {
          onSuccess: (response) => {
            setMessages([
              {
                role: 'assistant',
                content: response.message,
              },
            ]);
            if (response.interview_context) {
              setInterviewContext(response.interview_context);
            }
          },
        }
      );
    }
  }, [open]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    sendMessage.mutate(
      {
        messages: [...messages, userMessage],
        mode: 'interview',
        interview_context: interviewContext,
      },
      {
        onSuccess: (response) => {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: response.message },
          ]);
          if (response.interview_context) {
            setInterviewContext(response.interview_context);
            if (response.interview_context.completed) {
              setTimeout(() => {
                onOpenChange(false);
              }, 2000);
            }
          }
        },
      }
    );
  };

  const progressPercent = interviewContext.current_question / interviewContext.missing_fields.length * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Enrichir {entityType}
          </DialogTitle>
          <DialogDescription>
            {entityName} · Question {interviewContext.current_question + 1}/{interviewContext.missing_fields.length}
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Messages */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                'p-3 rounded-lg',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground ml-auto max-w-[80%]'
                  : 'bg-muted text-foreground max-w-[80%]'
              )}
            >
              <p className="text-sm">{msg.content}</p>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Réflexion…</span>
            </div>
          )}

          {interviewContext.completed && (
            <div className="p-3 rounded-lg bg-accent/50 border border-border flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">
                Enrichissement terminé ! Les données ont été mises à jour.
              </p>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Votre réponse…"
            className="min-h-[40px] resize-none text-sm"
            disabled={isLoading || interviewContext.completed}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading || interviewContext.completed}
            size="icon"
            className="shrink-0 h-10"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
