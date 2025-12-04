import { Brochure } from '@/types/brochure';
import { CheckCircle, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';

interface BrochureWebViewProps {
  brochure: Brochure;
}

const BrochureWebView = ({ brochure }: BrochureWebViewProps) => {
  const { sections, custom_colors, export_settings } = brochure;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const isHorizontal = export_settings?.web_scroll === 'horizontal';
  
  const primaryColor = custom_colors?.primary || 'hsl(var(--primary))';
  const accentColor = custom_colors?.accent || 'hsl(var(--accent))';

  // Build sections array for horizontal mode
  const slides = [];
  
  // Cover slide
  slides.push({ type: 'cover', data: brochure });
  
  // Introduction
  if (sections.introduction.enabled && sections.introduction.content) {
    slides.push({ type: 'introduction', data: sections.introduction });
  }
  
  // Key Points
  if (sections.keyPoints.enabled && sections.keyPoints.points.length > 0) {
    slides.push({ type: 'keyPoints', data: sections.keyPoints });
  }
  
  // Details
  if (sections.details.enabled && sections.details.content) {
    slides.push({ type: 'details', data: sections.details });
  }
  
  // Pricing
  if (sections.pricing.enabled && sections.pricing.plans.length > 0) {
    slides.push({ type: 'pricing', data: sections.pricing });
  }
  
  // Testimonial
  if (sections.testimonial.enabled && sections.testimonial.quote) {
    slides.push({ type: 'testimonial', data: sections.testimonial });
  }
  
  // Contact
  if (sections.contact.enabled) {
    slides.push({ type: 'contact', data: sections.contact });
  }

  const scrollToSlide = (index: number) => {
    if (scrollContainerRef.current && isHorizontal) {
      const container = scrollContainerRef.current;
      const slideWidth = container.clientWidth;
      container.scrollTo({ left: slideWidth * index, behavior: 'smooth' });
      setCurrentSlide(index);
    }
  };

  const handleScroll = () => {
    if (scrollContainerRef.current && isHorizontal) {
      const container = scrollContainerRef.current;
      const slideWidth = container.clientWidth;
      const newSlide = Math.round(container.scrollLeft / slideWidth);
      setCurrentSlide(newSlide);
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container && isHorizontal) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [isHorizontal]);

  // Render individual sections
  const renderSection = (slide: { type: string; data: any }, index: number) => {
    const slideClass = isHorizontal 
      ? 'flex-shrink-0 w-full h-full snap-center overflow-y-auto'
      : '';

    switch (slide.type) {
      case 'cover':
        return (
          <section key={index} className={`relative min-h-screen flex flex-col items-center justify-center px-6 py-20 ${slideClass}`}>
            <div 
              className="w-24 h-1 mb-8"
              style={{ background: `linear-gradient(90deg, ${primaryColor} 0%, ${accentColor} 100%)` }}
            />
            <h1 
              className="text-5xl md:text-7xl font-bold text-center mb-4"
              style={{ 
                background: `linear-gradient(270deg, ${primaryColor}, ${accentColor}, ${primaryColor}, ${accentColor})`,
                backgroundSize: '600% 600%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'hero-gradient 15s ease infinite',
              }}
            >
              {brochure.cover_title || 'Titre'}
            </h1>
            {brochure.cover_subtitle && (
              <p className="text-xl md:text-2xl text-muted-foreground text-center max-w-2xl">
                {brochure.cover_subtitle}
              </p>
            )}
            {brochure.cover_image_url && (
              <img 
                src={brochure.cover_image_url} 
                alt={brochure.cover_title}
                className="mt-12 max-w-md rounded-lg shadow-lg"
              />
            )}
            {isHorizontal && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground animate-pulse">
                Glissez pour continuer →
              </div>
            )}
          </section>
        );

      case 'introduction':
        return (
          <section key={index} className={`relative px-6 py-16 flex items-center justify-center ${isHorizontal ? 'min-h-screen' : ''} ${slideClass}`}>
            <div className="max-w-3xl">
              <p className="text-lg leading-relaxed text-foreground">
                {slide.data.content}
              </p>
            </div>
          </section>
        );

      case 'keyPoints':
        return (
          <section key={index} className={`relative px-6 py-16 bg-secondary/30 ${isHorizontal ? 'min-h-screen flex items-center' : ''} ${slideClass}`}>
            <div className="max-w-5xl mx-auto w-full">
              <h2 className="text-3xl font-bold text-center mb-12" style={{ color: primaryColor }}>
                Points clés
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {slide.data.points.map((point: any) => (
                  <div key={point.id} className="bg-background p-6 rounded-lg shadow-sm border border-border">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-6 w-6 flex-shrink-0 mt-1" style={{ color: accentColor }} />
                      <div>
                        <h3 className="font-semibold mb-2" style={{ color: primaryColor }}>{point.title}</h3>
                        <p className="text-muted-foreground text-sm">{point.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'details':
        return (
          <section key={index} className={`relative px-6 py-16 ${isHorizontal ? 'min-h-screen flex items-center' : ''} ${slideClass}`}>
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-8" style={{ color: primaryColor }}>Détails</h2>
              <div className="prose prose-lg max-w-none text-foreground">
                {slide.data.content.split('\n').map((paragraph: string, i: number) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </div>
          </section>
        );

      case 'pricing':
        return (
          <section key={index} className={`relative px-6 py-16 bg-secondary/30 ${isHorizontal ? 'min-h-screen flex items-center' : ''} ${slideClass}`}>
            <div className="max-w-5xl mx-auto w-full">
              <h2 className="text-3xl font-bold text-center mb-12" style={{ color: primaryColor }}>
                {slide.data.title}
              </h2>
              <div className={`grid gap-6 ${slide.data.plans.length === 1 ? 'max-w-md mx-auto' : slide.data.plans.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : 'md:grid-cols-3'}`}>
                {slide.data.plans.map((plan: any) => (
                  <div 
                    key={plan.id}
                    className={`bg-background p-6 rounded-lg border-2 transition-shadow ${plan.highlighted ? 'shadow-lg scale-105' : ''}`}
                    style={{ borderColor: plan.highlighted ? accentColor : 'hsl(var(--border))' }}
                  >
                    <h3 className="text-xl font-bold mb-2" style={{ color: primaryColor }}>{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-3xl font-bold" style={{ color: accentColor }}>{plan.price}</span>
                      {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                    </div>
                    <ul className="space-y-2">
                      {plan.features.map((feature: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: accentColor }} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'testimonial':
        return (
          <section key={index} className={`relative px-6 py-16 ${isHorizontal ? 'min-h-screen flex items-center' : ''} ${slideClass}`}>
            <div className="max-w-3xl mx-auto">
              <div className="bg-primary/5 p-8 rounded-lg border-l-4" style={{ borderColor: accentColor }}>
                <Quote className="h-8 w-8 mb-4" style={{ color: accentColor }} />
                <blockquote className="text-lg italic text-foreground mb-4">
                  "{slide.data.quote}"
                </blockquote>
                <div className="flex items-center gap-2">
                  <span className="font-semibold" style={{ color: primaryColor }}>{slide.data.author}</span>
                  {slide.data.company && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{slide.data.company}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        );

      case 'contact':
        return (
          <section key={index} className={`relative px-6 py-20 text-center ${isHorizontal ? 'min-h-screen flex items-center justify-center' : ''} ${slideClass}`}>
            <div className="max-w-xl mx-auto">
              <h2 className="text-3xl font-bold mb-6" style={{ color: primaryColor }}>Intéressé ?</h2>
              <a 
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold rounded-lg transition-all border-2"
                style={{ 
                  borderColor: accentColor,
                  background: `linear-gradient(270deg, ${primaryColor}, ${accentColor}, ${primaryColor}, ${accentColor})`,
                  backgroundSize: '600% 600%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {slide.data.cta_text}
                <span style={{ color: accentColor, WebkitTextFillColor: accentColor }}>→</span>
              </a>
              {slide.data.show_coordinates && (
                <p className="mt-8 text-muted-foreground">
                  Bayonne · France · nlq@iarche.fr
                </p>
              )}
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  if (isHorizontal) {
    return (
      <div className="relative h-screen bg-background overflow-hidden">
        {/* Background Pattern */}
        <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
          <div 
            className="absolute w-[150%] h-[150%] opacity-20 animate-patternScroll" 
            style={{ 
              top: '-25%', 
              left: '-25%',
              background: 'repeating-linear-gradient(45deg, transparent, transparent 20px, hsl(var(--border)) 20px, hsl(var(--border)) 22px)',
            }}
          />
        </div>

        {/* Horizontal scroll container */}
        <div 
          ref={scrollContainerRef}
          className="flex h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide"
          style={{ scrollBehavior: 'smooth' }}
        >
          {slides.map((slide, index) => renderSection(slide, index))}
        </div>

        {/* Navigation arrows */}
        <button
          onClick={() => scrollToSlide(Math.max(0, currentSlide - 1))}
          className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-background/80 border border-border shadow-lg transition-opacity ${currentSlide === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-background'}`}
          disabled={currentSlide === 0}
        >
          <ChevronLeft className="h-6 w-6" style={{ color: primaryColor }} />
        </button>
        <button
          onClick={() => scrollToSlide(Math.min(slides.length - 1, currentSlide + 1))}
          className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-background/80 border border-border shadow-lg transition-opacity ${currentSlide === slides.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-background'}`}
          disabled={currentSlide === slides.length - 1}
        >
          <ChevronRight className="h-6 w-6" style={{ color: primaryColor }} />
        </button>

        {/* Slide indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${index === currentSlide ? 'w-8' : ''}`}
              style={{ backgroundColor: index === currentSlide ? accentColor : 'hsl(var(--border))' }}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between pointer-events-none">
          <span 
            className="font-bold text-xl"
            style={{ 
              background: `linear-gradient(270deg, ${primaryColor}, ${accentColor}, ${primaryColor}, ${accentColor})`,
              backgroundSize: '600% 600%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            IArche
          </span>
          <span className="text-sm text-muted-foreground">
            {currentSlide + 1} / {slides.length}
          </span>
        </div>
      </div>
    );
  }

  // Vertical scroll mode (default)
  return (
    <div className="min-h-screen bg-background">
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div 
          className="absolute w-[150%] h-[150%] opacity-20 animate-patternScroll" 
          style={{ 
            top: '-25%', 
            left: '-25%',
            background: 'repeating-linear-gradient(45deg, transparent, transparent 20px, hsl(var(--border)) 20px, hsl(var(--border)) 22px)',
          }}
        />
      </div>

      {slides.map((slide, index) => renderSection(slide, index))}

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span 
            className="font-bold text-xl"
            style={{ 
              background: `linear-gradient(270deg, ${primaryColor}, ${accentColor}, ${primaryColor}, ${accentColor})`,
              backgroundSize: '600% 600%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            IArche
          </span>
          <span className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} IArche
          </span>
        </div>
      </footer>
    </div>
  );
};

export default BrochureWebView;
