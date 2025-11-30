import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface FAQItem {
  question: string;
  answer: string;
}

interface LivePreviewPanelProps {
  title: string;
  content: string;
  excerpt: string;
  coverImageUrl: string;
  resourceType: string;
  faq: FAQItem[];
  eventDate?: Date;
  eventLocation?: string;
  dureeHeures?: number;
  nombrePages?: number;
  formatFichier?: string;
}

export const LivePreviewPanel = ({
  title,
  content,
  excerpt,
  coverImageUrl,
  resourceType,
  faq,
  eventDate,
  eventLocation,
  dureeHeures,
  nombrePages,
  formatFichier,
}: LivePreviewPanelProps) => {
  return (
    <div className="h-full overflow-y-auto bg-background border-l border-border">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4 z-10">
        <h3 className="font-semibold text-lg">Prévisualisation temps réel</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Visualisez le rendu de votre article pendant la rédaction
        </p>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        {/* Cover Image */}
        {coverImageUrl && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img 
              src={coverImageUrl} 
              alt={title || 'Aperçu'} 
              className="w-full h-64 object-cover"
            />
          </div>
        )}

        {/* Title */}
        <h1 className="text-4xl font-bold mb-4 text-primary">
          {title || 'Titre de l\'article'}
        </h1>

        {/* Metadata Badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Badge variant="outline">{resourceType}</Badge>
          {eventDate && (
            <Badge variant="secondary">
              {new Date(eventDate).toLocaleDateString('fr-FR')}
            </Badge>
          )}
          {eventLocation && (
            <Badge variant="secondary">{eventLocation}</Badge>
          )}
          {dureeHeures && (
            <Badge variant="secondary">{dureeHeures}h</Badge>
          )}
          {nombrePages && (
            <Badge variant="secondary">{nombrePages} pages</Badge>
          )}
          {formatFichier && (
            <Badge variant="secondary">{formatFichier.toUpperCase()}</Badge>
          )}
        </div>

        {/* Excerpt */}
        {excerpt && (
          <p className="text-lg text-muted-foreground mb-8 italic border-l-4 border-accent pl-4">
            {excerpt}
          </p>
        )}

        {/* Content */}
        <article className="prose prose-gray max-w-none mb-12">
          {content ? (
            <ReactMarkdown>{content}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground italic">
              Le contenu apparaîtra ici au fur et à mesure de votre saisie...
            </p>
          )}
        </article>

        {/* FAQ */}
        {faq && faq.length > 0 && (
          <Card className="mt-12">
            <div className="p-6">
              <h2 className="text-2xl font-semibold mb-6">Questions fréquentes</h2>
              <Accordion type="single" collapsible className="w-full">
                {faq.map((item, idx) => (
                  <AccordionItem key={idx} value={`item-${idx}`}>
                    <AccordionTrigger className="text-left">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
