import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Loader2, 
  Bot, 
  User, 
  Mic, 
  MicOff, 
  Copy, 
  Check,
  Sparkles,
  MessageSquare,
  Wrench,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: { name: string; result: unknown }[];
}

interface AgentChatProps {
  className?: string;
  defaultOpen?: boolean;
}

export function AgentChat({ className, defaultOpen = false }: AgentChatProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedTools, setExpandedTools] = useState<string | null>(null);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionClass();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'fr-FR';

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setInputValue(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast.error('Erreur de reconnaissance vocale');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      toast.error('La reconnaissance vocale n\'est pas supportée par votre navigateur');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    // Stop listening if active
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke('ai-agent-orchestrator', {
        body: {
          messages: [
            ...conversationHistory,
            { role: 'user', content: userMessage.content },
          ],
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message || 'Désolé, je n\'ai pas pu traiter votre demande.',
        timestamp: new Date(),
        toolCalls: data.tool_calls,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Agent error:', error);
      toast.error('Erreur de communication avec l\'agent IA');
      
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Désolé, une erreur est survenue. Veuillez réessayer.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, isListening, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success('Copié dans le presse-papier');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Impossible de copier');
    }
  };

  const formatToolName = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg",
            "bg-gradient-to-br from-primary to-accent hover:from-primary/90 hover:to-accent/90",
            "border-0 text-white z-50",
            className
          )}
        >
          <Bot className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      
      <SheetContent 
        side="right" 
        className="w-full sm:w-[500px] p-0 flex flex-col"
      >
        <SheetHeader className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-accent/5">
          <SheetTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-semibold">Agent IArche</span>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                Assistant commercial & opérationnel
              </p>
            </div>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">Bonjour !</h3>
              <p className="text-sm text-muted-foreground max-w-[280px]">
                Je peux consulter vos leads, opportunités, projets et vous aider dans votre activité commerciale.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2 text-xs">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setInputValue('Quels sont mes leads récents ?')}
                >
                  Leads récents
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setInputValue('Stats du pipeline ?')}
                >
                  Stats pipeline
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setInputValue('Tâches en retard ?')}
                >
                  Tâches en retard
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setInputValue('Prochains RDV ?')}
                >
                  Prochains RDV
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 max-w-[85%] relative group",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted border"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Tool calls display */}
                    {message.toolCalls && message.toolCalls.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <button
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setExpandedTools(
                            expandedTools === message.id ? null : message.id
                          )}
                        >
                          <Wrench className="w-3 h-3" />
                          <span>{message.toolCalls.length} outil(s) utilisé(s)</span>
                          {expandedTools === message.id ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                        
                        {expandedTools === message.id && (
                          <div className="mt-2 space-y-1">
                            {message.toolCalls.map((tool, idx) => (
                              <Badge 
                                key={idx} 
                                variant="secondary" 
                                className="text-[10px] mr-1"
                              >
                                {formatToolName(tool.name)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Copy button for assistant messages */}
                    {message.role === 'assistant' && (
                      <button
                        onClick={() => copyToClipboard(message.content, message.id)}
                        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-background border shadow-sm hover:bg-accent"
                      >
                        {copiedId === message.id ? (
                          <Check className="w-3 h-3 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                  
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-muted border rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Réflexion en cours...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-4 bg-background">
          <div className="flex gap-2">
            <Button
              variant={isListening ? "destructive" : "outline"}
              size="icon"
              onClick={toggleListening}
              className="shrink-0"
              disabled={isLoading}
            >
              {isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
            
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Parlez..." : "Posez votre question..."}
              className="resize-none min-h-[52px] max-h-[120px]"
              disabled={isLoading}
            />
            
            <Button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="shrink-0 bg-gradient-to-br from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Entrée pour envoyer · Maj+Entrée pour nouvelle ligne · 🎤 pour parler
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default AgentChat;
