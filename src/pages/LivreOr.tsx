import { Helmet } from 'react-helmet-async';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import { Button } from '@/components/ui/button';
import LogoArc from '@/components/ui/LogoArc';
import { Star } from 'lucide-react';

const testimonials = [
  {
    author: "Jeff JeGO",
    company: "Agence Digitale Artisanale Prémium",
    date: "Octobre 2025",
    rating: 5,
    content: "J'ai eu la chance de suivre la formation IA de Nicolas pendant trois jours. Et sincèrement, elle a été bien au-delà de mes espérances. Trois jours denses, précis, humains, et surtout incroyablement utiles. Dans mon métier de copywriter, cette formation a été un vrai tournant : non pas pour « écrire à ma place », mais pour m'aider à gagner un temps monstrueux tout en gardant ma signature et ma profondeur."
  },
  {
    author: "Marie Pecot",
    date: "Octobre 2025",
    rating: 5,
    content: "Formation très utile"
  },
  {
    author: "Frédéric Barbot",
    date: "Mars 2025",
    rating: 5,
    content: "Les formations proposées par Nicolas Lara sont très intéressantes et permettent de pouvoir comprendre comment utiliser l'IA dans le quotidien professionnel et gagner en productivité et qualité."
  },
  {
    author: "Floriane Garcia",
    company: "Maltôte Consulting",
    date: "Mars 2025",
    rating: 5,
    content: "J'ai fait appel à Nicolas afin de me former à l'IA, la formation a été au delà de mes espérances."
  },
  {
    author: "Shivan Emin",
    date: "Décembre 2024",
    rating: 5,
    content: "Je recommande fortement, cela m'a beaucoup aidé dans mon activité."
  },
  {
    author: "Peio Sévilla",
    date: "Décembre 2024",
    rating: 5,
    content: "Très bonne formation, je recommande vivement !"
  },
  {
    author: "Clément Petrau",
    date: "Décembre 2024",
    rating: 5,
    content: "Formation de qualité, cela m'a permis d'avoir une meilleure rentabilité et une meilleure organisation au sein de ma société !"
  },
  {
    author: "Nicolas Bruccoleri",
    date: "Décembre 2024",
    rating: 5,
    content: "Formation de qualité et très utile, je recommande !"
  },
  {
    author: "Hervé Guillaumet",
    date: "Décembre 2024",
    rating: 5,
    content: "J'ai récemment suivi une formation et je suis vraiment impressionné par la qualité et la pertinence des enseignements."
  }
];

const LivreOr = () => {
  const averageRating = 5;
  const reviewCount = testimonials.length;

  return (
    <BackgroundLayout>
      <Helmet>
        <title>Livre d'Or · IArche · Témoignages clients</title>
        <meta name="description" content="Découvrez les témoignages de nos clients. Ce qu'ils disent de leur collaboration avec IArche." />
        <link rel="canonical" href="https://iarche.fr/livre-or" />
        <meta property="og:title" content="Livre d'Or · IArche · Témoignages clients" />
        <meta property="og:description" content="Découvrez les témoignages de nos clients. Ce qu'ils disent de leur collaboration avec IArche." />
        <meta property="og:url" content="https://iarche.fr/livre-or" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://iarche.fr/og/livre-or.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Schema.org BreadcrumbList */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Accueil",
                "item": "https://iarche.fr/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Livre d'Or",
                "item": "https://iarche.fr/livre-or"
              }
            ]
          })}
        </script>

        {/* Schema.org Organization with AggregateRating */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "IArche",
            "url": "https://iarche.fr",
            "logo": "https://iarche.fr/logo-iarche.svg",
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": String(averageRating),
              "reviewCount": String(reviewCount),
              "bestRating": "5",
              "worstRating": "1"
            },
            "review": testimonials.map(t => ({
              "@type": "Review",
              "author": {
                "@type": "Person",
                "name": t.author
              },
              "reviewBody": t.content,
              "reviewRating": {
                "@type": "Rating",
                "ratingValue": String(t.rating),
                "bestRating": "5",
                "worstRating": "1"
              }
            }))
          })}
        </script>
      </Helmet>
      
      <Header />
      <BreadcrumbNav />
      
      <main className="min-h-screen pt-4">
        <section className="max-w-6xl mx-auto px-6 py-4">
          {/* En-tête */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-5xl font-bold hero-gradient-text mb-2 animate-fadeIn [animation-delay:0.1s]">
              Livre d'Or
            </h1>
            <LogoArc size="md" className="mx-auto mb-6 animate-fadeIn [animation-delay:0.15s]" />
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto animate-fadeIn [animation-delay:0.2s]">
              Ce que nos clients disent de nous
            </p>
            
            {/* Note globale */}
            <div className="flex items-center justify-center gap-2 mt-4 animate-fadeIn [animation-delay:0.25s]">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-accent text-accent" />
                ))}
              </div>
              <span className="text-lg font-semibold text-foreground">{averageRating}/5</span>
              <span className="text-muted-foreground">({reviewCount} avis)</span>
            </div>
          </div>

          {/* Témoignages */}
          <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto animate-fadeIn [animation-delay:0.3s]">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="bg-secondary/50 rounded-lg p-6 border border-border hover:border-accent/30 transition-colors"
              >
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-foreground mb-4 italic">"{testimonial.content}"</p>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-foreground">{testimonial.author}</p>
                    {testimonial.company && (
                      <p className="text-muted-foreground">{testimonial.company}</p>
                    )}
                  </div>
                  <p className="text-muted-foreground">{testimonial.date}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="max-w-2xl mx-auto text-center mt-12 animate-fadeIn [animation-delay:0.4s]">
            <p className="text-muted-foreground mb-6">
              Vous avez travaillé avec nous ? Partagez votre expérience.
            </p>
            <a href="mailto:nlq@iarche.fr?subject=Témoignage client">
              <Button 
                size="lg"
                className="bg-accent hover:bg-accent/90 text-white px-8 py-6 text-base"
              >
                Laisser un avis
              </Button>
            </a>
          </div>
        </section>
      </main>
      
      <Footer />
    </BackgroundLayout>
  );
};

export default LivreOr;
