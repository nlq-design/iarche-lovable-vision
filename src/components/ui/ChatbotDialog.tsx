import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatbotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ChatbotDialog: React.FC<ChatbotDialogProps> = ({ open, onOpenChange }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('https://mhynzlruietxushewupo.supabase.co/functions/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatbotId: 'c397a5e9-3bcb-4c4b-8b75-16fa90e41f30',
          message: inputValue,
          conversationHistory: messages
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la communication avec le chatbot');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      // Add empty assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  assistantMessage += content;
                  
                  // Update the last message (assistant's response)
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      role: 'assistant',
                      content: assistantMessage
                    };
                    return newMessages;
                  });
                }
              } catch (e) {
                console.error('Error parsing SSE:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Erreur chatbot:', error);
      setMessages(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: 'Désolé, une erreur est survenue. Veuillez réessayer ou nous contacter directement.' 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] h-[650px] flex flex-col p-0 border-accent/20">
        <DialogHeader className="px-6 py-5 border-b border-border/50 bg-gradient-to-r from-primary/5 to-accent/5">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-2xl font-semibold hero-gradient-text">IArche</span>
              <span className="text-lg font-normal text-muted-foreground ml-2">Assistant</span>
            </div>
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Posez vos questions sur l'IA et nos services
          </p>
        </DialogHeader>

        <ScrollArea ref={scrollAreaRef} className="flex-1 px-6 py-4 bg-background/50">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div className="space-y-4 animate-fade-in">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl animate-pulse">
                  <Sparkles className="w-10 h-10 text-white" strokeWidth={2} />
                </div>
                <p className="text-lg font-medium text-foreground">
                  Bonjour ! Je suis l'assistant <span className="hero-gradient-text font-semibold">IArche</span>.
                </p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Je peux vous renseigner sur nos services IA, nos solutions, et répondre à toutes vos questions sur l'intelligence artificielle.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div
                    className={`rounded-2xl px-4 py-3 max-w-[85%] shadow-sm ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-primary to-primary/90 text-white'
                        : 'bg-muted/80 text-foreground border border-border/50'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.content === '' && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-muted/80 rounded-2xl px-4 py-3 border border-border/50">
                    <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-border/50 p-4 bg-background">
          <div className="flex gap-3">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question..."
              className="resize-none min-h-[64px] focus-visible:ring-accent focus-visible:ring-2 focus-visible:border-accent transition-all"
              disabled={isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="shrink-0 h-[64px] w-[64px] bg-gradient-to-br from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-2.5">
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-xs">Entrée</kbd> pour envoyer · <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-xs">Shift+Entrée</kbd> pour nouvelle ligne
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatbotDialog;