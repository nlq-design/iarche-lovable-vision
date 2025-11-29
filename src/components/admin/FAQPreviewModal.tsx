import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Check, X } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQPreviewModalProps {
  isOpen: boolean;
  faqData: FAQItem[] | null;
  isGenerating: boolean;
  onClose: () => void;
  onSave: () => void;
  onRegenerate: () => void;
}

export const FAQPreviewModal = ({
  isOpen,
  faqData,
  isGenerating,
  onClose,
  onSave,
  onRegenerate,
}: FAQPreviewModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Prévisualisation de la FAQ générée
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Génération de la FAQ en cours...
              </p>
            </div>
          ) : faqData && faqData.length > 0 ? (
            <div>
              <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{faqData.length} questions</strong> générées automatiquement par IA
                </p>
              </div>
              
              <Accordion type="single" collapsible className="w-full space-y-2">
                {faqData.map((item, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`item-${index}`}
                    className="border border-border rounded-md px-4"
                  >
                    <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pb-3 leading-relaxed">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <X className="h-12 w-12 text-destructive/50" />
              <p className="text-sm text-muted-foreground">
                Aucune FAQ générée. Réessayez.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isGenerating}
          >
            Annuler
          </Button>
          <Button 
            variant="outline" 
            onClick={onRegenerate}
            disabled={isGenerating || !faqData}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Régénérer
          </Button>
          <Button 
            onClick={onSave}
            disabled={isGenerating || !faqData || faqData.length === 0}
          >
            <Check className="mr-2 h-4 w-4" />
            Valider et enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
