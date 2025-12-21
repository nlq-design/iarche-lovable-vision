import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import BackgroundLayout from '@/components/layouts/BackgroundLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav';
import { Button } from '@/components/ui/button';
import { NavLink } from '@/components/NavLink';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { getServiceBySlug } from '@/data/servicesData';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import GradientLink from '@/components/ui/GradientLink';
import GradientTitle from '@/components/ui/GradientTitle';
import { useCTATracking } from '@/hooks/useCTATracking';

const ServiceDetail = () => {
  const { slug } = useParams();
  const { trackCTAClick } = useCTATracking();
  const navigate = useNavigate();
  const service = getServiceBySlug(slug || '');

  useEffect(() => {
    if (!service) {
      navigate('/404');
    }
  }, [service, navigate]);

  if (!service) {
    return null;
  }

  const getCanonicalUrl = () => {
    return `https://iarche.fr/services/${slug}`;
  };

  return (
    <BackgroundLayout>
      <Helmet>
        <html lang="fr" />
        <link rel="alternate" hrefLang="fr" href={getCanonicalUrl()} />
        <title>{service.title} · IArche · Services IA</title>
        <meta name="description" content={service.description} />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="IArche" />
        <meta name="keywords" content={`${service.title}, IA, intelligence artificielle, PME, services IA, IArche`} />
        <link rel="canonical" href={getCanonicalUrl()} />
        
        {/* Open Graph */}
        <meta property="og:title" content={`${service.title} · IArche · Services IA`} />
        <meta property="og:description" content={service.description} />
        <meta property="og:url" content={getCanonicalUrl()} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://iarche.fr/og-image-v4.png" />
        <meta property="og:image:width" content="1512" />
        <meta property="og:image:height" content="794" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="IArche" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${service.title} · IArche`} />
        <meta name="twitter:description" content={service.description} />
        <meta name="twitter:image" content="https://iarche.fr/og-image-v4.png" />

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
                "name": "Services",
                "item": "https://iarche.fr/services"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": service.title,
                "item": getCanonicalUrl()
              }
            ]
          })}
        </script>

        {/* Schema.org Service */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "@id": getCanonicalUrl(),
            "name": service.title,
            "description": service.descriptionLongue,
            "provider": {
              "@type": "Organization",
              "name": "IArche",
              "url": "https://iarche.fr"
            },
            "areaServed": {
              "@type": "Country",
              "name": "France"
            },
            "serviceOutput": service.livrables,
            "audience": {
              "@type": "Audience",
              "audienceType": service.pourQui
            },
            "offers": {
              "@type": "Offer",
              "priceCurrency": "EUR",
              "price": "Sur devis",
              "url": "https://iarche.fr/contact"
            }
          })}
        </script>

        {/* Schema.org FAQPage */}
        {service.faq && service.faq.length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": service.faq.map((item) => ({
                "@type": "Question",
                "name": item.question,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": item.answer
                }
              }))
            })}
          </script>
        )}
      </Helmet>

      <Header />
      <BreadcrumbNav />

      <main className="min-h-screen pt-4">
        <article className="max-w-4xl mx-auto px-6 py-4">
          {/* Bouton retour */}
          <div className="mb-8">
            <NavLink to="/services">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Retour aux services
              </Button>
            </NavLink>
          </div>

          {/* En-tête */}
          <header className="mb-12">
            <GradientTitle size="lg" as="h1" centered={false} className="mb-6 animate-fadeIn [animation-delay:0.1s]">
              {service.title}
            </GradientTitle>
            <p className="text-lg md:text-xl text-muted-foreground animate-fadeIn [animation-delay:0.2s]">
              {service.descriptionLongue}
            </p>
          </header>

          {/* Livrables */}
          <section className="mb-12 animate-fadeIn [animation-delay:0.3s]">
            <h2 className="text-2xl font-bold text-foreground mb-6">Livrables</h2>
            <ul className="space-y-3">
              {service.livrables.map((livrable, idx) => (
                <li key={idx} className="flex items-start gap-3 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" aria-hidden="true" />
                  <span 
                    className="prose prose-lg max-w-none
                      prose-strong:font-semibold prose-strong:text-[hsl(var(--primary))] prose-strong:px-1 prose-strong:py-0.5 prose-strong:rounded prose-strong:bg-gradient-to-r prose-strong:from-primary/8 prose-strong:via-primary/12 prose-strong:to-primary/8"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(livrable) }}
                  />
                </li>
              ))}
            </ul>
          </section>

          {/* Pour qui */}
          <section className="mb-12 animate-fadeIn [animation-delay:0.4s]">
            <h2 className="text-2xl font-bold text-foreground mb-6">Pour qui ?</h2>
            <p 
              className="text-lg text-muted-foreground prose prose-lg max-w-none
                prose-strong:font-semibold prose-strong:text-[hsl(var(--primary))] prose-strong:px-1 prose-strong:py-0.5 prose-strong:rounded prose-strong:bg-gradient-to-r prose-strong:from-primary/8 prose-strong:via-primary/12 prose-strong:to-primary/8"
            >
              {service.pourQui}
            </p>
          </section>

          {/* CTA intermédiaire */}
          <div className="text-center my-12 animate-fadeIn [animation-delay:0.45s]">
            <GradientLink 
              to="/rendez-vous/audit-conseil"
              className="text-lg"
              onClick={() => trackCTAClick('prendre_rendez_vous', 'service_detail', slug || '')}
            >
              Prendre rendez-vous
            </GradientLink>
          </div>

          {/* Méthodologie */}
          <section className="mb-12 animate-fadeIn [animation-delay:0.5s]">
            <h2 className="text-2xl font-bold text-foreground mb-6">Méthodologie</h2>
            <div className="space-y-6">
              {service.methodologie.map((etape, idx) => (
                <div key={idx} className="border-l-2 border-accent pl-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {etape.etape}
                  </h3>
                  <p 
                    className="text-muted-foreground prose prose-lg max-w-none
                      prose-strong:font-semibold prose-strong:text-[hsl(var(--primary))] prose-strong:px-1 prose-strong:py-0.5 prose-strong:rounded prose-strong:bg-gradient-to-r prose-strong:from-primary/8 prose-strong:via-primary/12 prose-strong:to-primary/8"
                  >
                    {etape.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Cas d'usage */}
          <section className="mb-12 invisible animate-fadeIn [animation-delay:0.6s]">
            <h2 className="text-2xl font-bold text-foreground mb-6">Cas d'usage concrets</h2>
            <div className="space-y-6">
              {service.casUsage.map((cas, idx) => (
                <div key={idx} className="bg-secondary/50 rounded-lg p-6 border border-border">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {cas.titre}
                  </h3>
                  <p 
                    className="text-muted-foreground prose prose-lg max-w-none
                      prose-strong:font-semibold prose-strong:text-[hsl(var(--primary))] prose-strong:px-1 prose-strong:py-0.5 prose-strong:rounded prose-strong:bg-gradient-to-r prose-strong:from-primary/8 prose-strong:via-primary/12 prose-strong:to-primary/8"
                  >
                    {cas.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          {service.faq && service.faq.length > 0 && (
            <section className="mb-12 invisible animate-fadeIn [animation-delay:0.7s]">
              <h2 className="text-2xl font-bold text-foreground mb-6">Questions fréquentes</h2>
              <Accordion type="single" collapsible className="w-full">
                {service.faq.map((item, idx) => (
                  <AccordionItem key={idx} value={`faq-${idx}`}>
                    <AccordionTrigger className="text-left text-foreground hover:text-accent">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          )}

          {/* CTA final */}
          <div className="text-center mt-16 invisible animate-fadeIn [animation-delay:0.8s]">
            <p className="text-lg text-foreground mb-6">
              En savoir plus
            </p>
            <GradientLink 
              href="/contact" 
              className="text-lg"
              onClick={() => trackCTAClick('premier_echange', 'service_detail', slug || '')}
            >
              Premier échange
            </GradientLink>
          </div>
        </article>
      </main>

      <Footer />
    </BackgroundLayout>
  );
};

export default ServiceDetail;
