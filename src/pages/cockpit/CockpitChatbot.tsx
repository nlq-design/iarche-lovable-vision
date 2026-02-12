import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { CockpitLayout } from '@/components/cockpit/CockpitLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  ChevronUp,
  Trash2,
  Info
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

interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  max_tokens: number;
  model_id: string;
}

export default function CockpitChatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedTools, setExpandedTools] = useState<string | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  
  // Persistent session ID for memory continuity across the conversation
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    };
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(scrollToBottom);
    });
    return () => cancelAnimationFrame(rafId);
  }, [messages, isLoading]);

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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setInputValue(transcript);
      };

      recognitionRef.current.onerror = () => {
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
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Route through the full orchestrator — circular architecture
      // This gives the chatbot access to ALL 40+ CRM tools (bookings, leads, RAG, agenda, etc.)
      const { data, error } = await supabase.functions.invoke('ai-agent-orchestrator', {
        body: {
          messages: [
            ...conversationHistory,
            { role: 'user', content: userMessage.content },
          ],
          session_id: sessionIdRef.current,
        },
      });

      if (error) throw error;

      // Extraire les données d'usage si disponibles
      if (data?.usage) {
        setTokenUsage({
          prompt_tokens: data.usage.prompt_tokens || 0,
          completion_tokens: data.usage.completion_tokens || 0,
          total_tokens: data.usage.total_tokens || 0,
          max_tokens: data.usage.max_tokens || 80000,
          model_id: data.usage.model_id || 'unknown',
        });
      }

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

  const getTokenColor = (percentage: number): string => {
    if (percentage < 50) return 'bg-success'; // Vert
    if (percentage < 80) return 'bg-accent';  // Orange/Terracotta
    return 'bg-destructive';                  // Rouge
  };

  const formatTokenCount = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(0)}k`;
    }
    return count.toString();
  };

  const clearConversation = () => {
    setMessages([]);
    sessionIdRef.current = crypto.randomUUID();
    setTokenUsage(null);
    toast.success('Conversation effacée');
  };

  return (
    <CockpitLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Agent IArche</h1>
              <p className="text-xs text-muted-foreground">
                Assistant commercial & opérationnel
              </p>
            </div>
          </div>
          
          {/* Token Usage Indicator */}
          {tokenUsage && (
            <div className="group relative flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-20 h-1 bg-muted rounded-full overflow-hidden">
                  {tokenUsage.max_tokens > 0 && (
                    <div
                      className={`h-full rounded-full transition-all ${getTokenColor(
                        (tokenUsage.total_tokens / tokenUsage.max_tokens) * 100
                      )}`}
                      style={{
                        width: `${Math.min(
                          (tokenUsage.total_tokens / tokenUsage.max_tokens) * 100,
                          100
                        )}%`,
                      }}
                    />
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatTokenCount(tokenUsage.total_tokens)}/{formatTokenCount(tokenUsage.max_tokens)}
                </span>
              </div>
              
              {/* Tooltip */}
              <div className="absolute -bottom-12 right-0 hidden group-hover:block bg-foreground text-background text-xs rounded px-2 py-1.5 whitespace-nowrap z-50 shadow-lg">
                Tokens : {tokenUsage.prompt_tokens.toLocaleString()} + {tokenUsage.completion_tokens.toLocaleString()} = {tokenUsage.total_tokens.toLocaleString()} / {tokenUsage.max_tokens.toLocaleString()} ({Math.round((tokenUsage.total_tokens / tokenUsage.max_tokens) * 100)}%)
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearConversation}>
              <Trash2 className="h-4 w-4 mr-2" />
              Effacer
            </Button>
          )}
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-6 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6">
                <MessageSquare className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-medium mb-2">Bonjour !</h3>
              <p className="text-muted-foreground max-w-md mb-8">
                Je peux consulter vos leads, opportunités, projets et vous aider dans votre activité commerciale.
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
                {[
                  { label: 'Leads récents', prompt: 'Quels sont mes leads récents ?' },
                  { label: 'Stats pipeline', prompt: 'Stats du pipeline ?' },
                  { label: 'Tâches en retard', prompt: 'Tâches en retard ?' },
                  { label: 'Prochains RDV', prompt: 'Prochains RDV ?' },
                ].map(({ label, prompt }) => (
                  <Card 
                    key={label}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setInputValue(prompt)}
                  >
                    <CardContent className="p-4 text-center">
                      <span className="text-sm font-medium">{label}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
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
                      "rounded-2xl px-4 py-3 max-w-[75%] relative group",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted border"
                    )}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                    
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
                          <div className="mt-2 flex flex-wrap gap-1">
                            {message.toolCalls.map((tool, idx) => (
                              <Badge 
                                key={idx} 
                                variant="secondary" 
                                className="text-[10px]"
                              >
                                {formatToolName(tool.name)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

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
              <div ref={messagesEndRef} className="h-px" />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-4 bg-background">
          <div className="max-w-4xl mx-auto flex gap-3">
            <Button
              variant={isListening ? "destructive" : "outline"}
              size="icon"
              onClick={toggleListening}
              className="shrink-0 h-12 w-12"
              disabled={isLoading}
            >
              {isListening ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </Button>
            
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Parlez..." : "Posez votre question..."}
              className="resize-none min-h-[48px] max-h-[120px]"
              disabled={isLoading}
            />
            
            <Button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="shrink-0 h-12 w-12 bg-gradient-to-br from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Entrée pour envoyer · Maj+Entrée pour nouvelle ligne · 🎤 pour parler
          </p>
        </div>
      </div>
    </CockpitLayout>
  );
}
