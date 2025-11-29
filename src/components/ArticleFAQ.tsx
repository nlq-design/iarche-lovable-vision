import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, HelpCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

interface ArticleFAQProps {
  articleId: string;
}

export const ArticleFAQ = ({ articleId }: ArticleFAQProps) => {
  const [faq, setFaq] = useState<FAQItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFAQ();
  }, [articleId]);

  const loadFAQ = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('faqs')
      .select('questions')
      .eq('article_id', articleId)
      .maybeSingle();

    if (!error && data && data.questions) {
      setFaq(data.questions as unknown as FAQItem[]);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!faq || faq.length === 0) {
    return null;
  }

  return (
    <Card className="bg-background/50 border-border/30">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="flex items-center gap-2 text-foreground text-base">
          <HelpCircle className="h-4 w-4" />
          Questions fréquentes
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        <Accordion type="single" collapsible className="w-full space-y-1.5">
          {faq.map((item, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="border border-border/30 rounded px-3 bg-background/20"
            >
              <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-2.5">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pb-2.5 leading-relaxed">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};
