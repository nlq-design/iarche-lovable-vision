import { X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface FAQ {
  question: string;
  answer: string;
}

interface Props {
  article: {
    title: string;
    content: string;
    faq: FAQ[];
  };
  onClose: () => void;
}

const PreviewModal = ({ article, onClose }: Props) => {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-border">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold">Prévisualisation</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <article className="prose prose-gray max-w-none">
            <h1>{article.title}</h1>
            <ReactMarkdown>{article.content}</ReactMarkdown>
            
            {/* FAQ */}
            {article.faq.length > 0 && (
              <section className="mt-12 pt-8 border-t border-border">
                <h2>Questions fréquentes</h2>
                <div className="space-y-4">
                  {article.faq.map((item, i) => (
                    <details key={i} className="border border-border rounded-lg">
                      <summary className="p-4 cursor-pointer font-medium hover:bg-muted/50">
                        {item.question}
                      </summary>
                      <div className="p-4 pt-0 text-muted-foreground">
                        {item.answer}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            )}
          </article>
        </div>
        
      </div>
    </div>
  );
};

export default PreviewModal;
