import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
}

export const ArticleSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchArticles = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setLoading(true);
      
      const { data, error } = await supabase
        .from('articles')
        .select('id, title, slug, excerpt')
        .eq('published', true)
        .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%,content.ilike.%${query}%`)
        .limit(5);

      if (!error && data) {
        setResults(data);
        setIsOpen(data.length > 0);
      }
      
      setLoading(false);
    };

    const debounceTimer = setTimeout(searchArticles, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleSelectResult = (slug: string) => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    navigate(`/actualites/${slug}`);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Rechercher un article..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10 bg-background border-border focus:ring-2 focus:ring-primary"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Effacer la recherche"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown avec résultats */}
      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-background border border-border rounded-lg shadow-lg z-[100] max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Recherche en cours...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Aucun résultat trouvé
            </div>
          ) : (
            <ul className="py-2">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    onClick={() => handleSelectResult(result.slug)}
                    className="w-full text-left px-4 py-3 hover:bg-accent/5 transition-colors focus:bg-accent/10 focus:outline-none border-b border-border last:border-b-0"
                  >
                    <h4 className="font-semibold text-foreground text-sm mb-1 line-clamp-1">
                      {result.title}
                    </h4>
                    {result.excerpt && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {result.excerpt}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
