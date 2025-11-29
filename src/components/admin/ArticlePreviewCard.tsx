import { Eye, Save } from 'lucide-react';

interface Props {
  article: {
    title: string;
    excerpt: string;
    tags: string[];
  };
  onPreview: () => void;
  onSave: () => void;
}

const ArticlePreviewCard = ({ article, onPreview, onSave }: Props) => {
  return (
    <div className="space-y-4">
      <h4 className="font-semibold line-clamp-2">{article.title}</h4>
      <p className="text-sm text-muted-foreground line-clamp-3">{article.excerpt}</p>
      
      <div className="flex flex-wrap gap-2">
        {article.tags.map((tag, i) => (
          <span key={i} className="text-xs bg-muted px-2 py-1 rounded">{tag}</span>
        ))}
      </div>
      
      <div className="flex gap-2 pt-2">
        <button
          onClick={onPreview}
          className="flex-1 flex items-center justify-center gap-2 border border-border px-4 py-2 rounded-lg hover:bg-muted transition-colors text-sm"
        >
          <Eye className="w-4 h-4" />
          Prévisualiser
        </button>
        <button
          onClick={onSave}
          className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm"
        >
          <Save className="w-4 h-4" />
          Sauvegarder
        </button>
      </div>
    </div>
  );
};

export default ArticlePreviewCard;
