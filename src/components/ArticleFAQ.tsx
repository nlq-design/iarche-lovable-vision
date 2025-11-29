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
    <Card className="bg-background/95 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground text-lg">
          <HelpCircle className="h-4 w-4" />
          Questions fréquentes
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Accordion type="single" collapsible className="w-full space-y-2">
          {faq.map((item, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="border border-border/50 rounded-md px-4 bg-background/30"
            >
              <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-3">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pb-3 leading-relaxed">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};
