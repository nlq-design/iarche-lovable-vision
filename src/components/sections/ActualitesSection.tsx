import React from 'react';
import { NavLink } from '@/components/NavLink';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import ArticlePlaceholder from '@/components/ui/ArticlePlaceholder';

const articles = [
  {
    title: "L'IA au service des PME : retour d'expérience",
    excerpt: "Comment les entreprises françaises intègrent progressivement l'intelligence artificielle dans leur processus métier...",
    date: "28 Nov 2025"
  },
  {
    title: "RAG et données métier : guide pratique",
    excerpt: "Découvrez comment le Retrieval Augmented Generation transforme l'accès à l'information en entreprise...",
    date: "27 Nov 2025"
  },
  {
    title: "AI Act : ce que les PME doivent savoir",
    excerpt: "La réglementation européenne sur l'IA entre en vigueur. Analyse des impacts pour les entreprises...",
    date: "26 Nov 2025"
  }
];

const ActualitesSection = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-6">
        <h2 
          className="text-3xl md:text-4xl font-semibold text-foreground text-center mb-12"
          style={{ 
            visibility: 'hidden',
            animation: 'fadeIn 0.8s ease-out 0.2s forwards'
          }}
        >
          Actualités
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {articles.map((article, index) => (
            <Card 
              key={index}
              className="bg-background border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300"
              style={{
                visibility: 'hidden',
                animation: `fadeIn 0.8s ease-out ${0.4 + index * 0.1}s forwards`
              }}
            >
              {/* Image placeholder */}
              <ArticlePlaceholder className="h-48" />
              
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-foreground line-clamp-2">
                  {article.title}
                </h3>
              </CardHeader>
              
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {article.excerpt}
                </p>
                <p className="text-xs text-muted-foreground">
                  {article.date}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div 
          className="text-center"
          style={{
            visibility: 'hidden',
            animation: 'fadeIn 0.8s ease-out 0.7s forwards'
          }}
        >
          <NavLink 
            to="/actualites"
            className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-medium transition-colors group"
          >
            Toutes les actualités
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </NavLink>
        </div>
      </div>
    </section>
  );
};

export default ActualitesSection;
