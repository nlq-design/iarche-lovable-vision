import { Brochure } from '@/types/brochure';
import { CheckCircle, Quote, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { COLORS, GRADIENTS, BAR_SIZES } from '@/components/admin/medias/shared/tokens';
import LogoArc from '@/components/ui/LogoArc';

interface BrochureWebViewProps {
  brochure: Brochure;
}

const BrochureWebView = ({ brochure }: BrochureWebViewProps) => {
  const { sections, custom_colors, export_settings } = brochure;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const isHorizontal = export_settings?.web_scroll === 'horizontal';
  
  // Use custom colors or fallback to brand tokens
  const primaryColor = custom_colors?.primary || COLORS.bleuNuit;
  const accentColor = custom_colors?.accent || COLORS.terracotta;

  // Build sections array
  const slides = [];
  slides.push({ type: 'cover', data: brochure });
  if (sections.introduction.enabled && sections.introduction.content) {
    slides.push({ type: 'introduction', data: sections.introduction });
  }
  if (sections.keyPoints.enabled && sections.keyPoints.points.length > 0) {
    slides.push({ type: 'keyPoints', data: sections.keyPoints });
  }
  if (sections.details.enabled && sections.details.content) {
    slides.push({ type: 'details', data: sections.details });
  }
  if (sections.cta?.enabled && sections.cta?.button_url) {
    slides.push({ type: 'cta', data: sections.cta });
  }
  if (sections.pricing.enabled && sections.pricing.plans.length > 0) {
    slides.push({ type: 'pricing', data: sections.pricing });
  }
  if (sections.testimonial.enabled && sections.testimonial.quote) {
    slides.push({ type: 'testimonial', data: sections.testimonial });
  }
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

  // Logo component with official SVG and decorative arc v4.0
  const BrandLogo = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
    const logoSizes = {
      sm: 24,
      md: 32,
      lg: 40,
    };
    const arcSizes: Record<string, 'sm' | 'md' | 'lg'> = {
      sm: 'sm',
      md: 'sm',
      lg: 'md',
    };
    
    return (
      <div className="flex flex-col items-center gap-2">
        <img 
          src="/logos/iarche-main.svg" 
          alt="IArche" 
          style={{ height: logoSizes[size], width: 'auto' }}
        />
        <LogoArc size={arcSizes[size]} />
      </div>
    );
  };


  // Render individual sections
  const renderSection = (slide: { type: string; data: any }, index: number) => {
    const slideClass = isHorizontal 
      ? 'flex-shrink-0 w-full h-full snap-center overflow-y-auto'
      : '';

    switch (slide.type) {
      case 'cover':
        return (
          <section 
            key={index} 
            className={`relative min-h-screen flex flex-col items-center justify-center px-6 py-20 ${slideClass}`}
            style={{ backgroundColor: COLORS.blancCasse }}
          >
            <div className="relative z-10 flex flex-col items-center">
              {/* Arc décoratif v4.0 above title */}
              <LogoArc size="xl" className="mb-8" />
              <h1
                className="text-5xl md:text-7xl font-bold text-center mb-4"
                style={{ 
                  background: GRADIENTS.text.css,
                  backgroundSize: '600% 600%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'hero-gradient 8s ease infinite',
                }}
              >
                {brochure.cover_title || 'Titre'}
              </h1>
              {brochure.cover_subtitle && (
                <p 
                  className="text-xl md:text-2xl text-center max-w-2xl"
                  style={{ color: COLORS.muted }}
                >
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
            </div>
            {isHorizontal && (
              <div 
                className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-pulse"
                style={{ color: COLORS.muted }}
              >
                Glissez pour continuer →
              </div>
            )}
          </section>
        );

      case 'introduction':
        return (
          <section 
            key={index} 
            className={`relative px-6 py-16 flex items-center justify-center ${isHorizontal ? 'min-h-screen' : ''} ${slideClass}`}
            style={{ backgroundColor: COLORS.blancCasse }}
          >
            <div className="relative z-10 max-w-3xl">
              <p 
                className="text-lg leading-relaxed"
                style={{ color: COLORS.foreground }}
              >
                {slide.data.content}
              </p>
            </div>
          </section>
        );

      case 'keyPoints':
        return (
          <section 
            key={index} 
            className={`relative px-6 py-16 ${isHorizontal ? 'min-h-screen flex items-center' : ''} ${slideClass}`}
            style={{ backgroundColor: COLORS.secondary }}
          >
            <div className="max-w-5xl mx-auto w-full relative z-10">
              <h2 
                className="text-3xl font-bold text-center mb-4"
                style={{ color: primaryColor }}
              >
                Points clés
              </h2>
              {/* Arc décoratif v4.0 under title */}
              <div className="flex justify-center mb-12">
                <LogoArc size="md" />
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {slide.data.points.map((point: any) => (
                  <div 
                    key={point.id} 
                    className="p-6 rounded-lg shadow-sm"
                    style={{ 
                      backgroundColor: COLORS.blancCasse,
                      border: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle 
                        className="h-6 w-6 flex-shrink-0 mt-1" 
                        style={{ color: accentColor }} 
                      />
                      <div>
                        <h3 
                          className="font-semibold mb-2"
                          style={{ color: primaryColor }}
                        >
                          {point.title}
                        </h3>
                        <p 
                          className="text-sm"
                          style={{ color: COLORS.muted }}
                        >
                          {point.description}
                        </p>
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
          <section 
            key={index} 
            className={`relative px-6 py-16 ${isHorizontal ? 'min-h-screen flex items-center' : ''} ${slideClass}`}
            style={{ backgroundColor: COLORS.blancCasse }}
          >
            <div className="max-w-3xl mx-auto relative z-10">
              <h2 
                className="text-3xl font-bold mb-4"
                style={{ color: primaryColor }}
              >
                Détails
              </h2>
              <LogoArc size="md" className="mb-8" />
              <div className="prose prose-lg max-w-none">
                {slide.data.content.split('\n').map((paragraph: string, i: number) => (
                  <p key={i} style={{ color: COLORS.foreground }}>{paragraph}</p>
                ))}
              </div>
            </div>
          </section>
        );

      case 'cta':
        return (
          <section 
            key={index} 
            className={`relative px-6 py-16 ${isHorizontal ? 'min-h-screen flex items-center' : ''} ${slideClass}`}
            style={{ backgroundColor: COLORS.secondary }}
          >
            <div className="max-w-3xl mx-auto text-center relative z-10">
              {slide.data.title && (
                <h2 
                  className="text-3xl font-bold mb-4"
                  style={{ color: primaryColor }}
                >
                  {slide.data.title}
                </h2>
              )}
              <div className="flex justify-center mb-8">
                <LogoArc size="md" />
              </div>
              {slide.data.description && (
                <p 
                  className="text-lg mb-8"
                  style={{ color: COLORS.muted }}
                >
                  {slide.data.description}
                </p>
              )}
              <a 
                href={slide.data.button_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold rounded-lg transition-all hover:scale-105"
                style={{ 
                  backgroundColor: accentColor,
                  color: COLORS.blancCasse,
                }}
              >
                {slide.data.button_text || 'En savoir plus'}
                <ExternalLink className="h-5 w-5" />
              </a>
            </div>
          </section>
        );

      case 'pricing':
        return (
          <section 
            key={index} 
            className={`relative px-6 py-16 ${isHorizontal ? 'min-h-screen flex items-center' : ''} ${slideClass}`}
            style={{ backgroundColor: COLORS.secondary }}
          >
            <div className="max-w-5xl mx-auto w-full relative z-10">
              <h2 
                className="text-3xl font-bold text-center mb-4"
                style={{ color: primaryColor }}
              >
                {slide.data.title}
              </h2>
              <div className="flex justify-center mb-12">
                <LogoArc size="md" />
              </div>
              <div className={`grid gap-6 ${slide.data.plans.length === 1 ? 'max-w-md mx-auto' : slide.data.plans.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : 'md:grid-cols-3'}`}>
                {slide.data.plans.map((plan: any) => (
                  <div 
                    key={plan.id}
                    className={`p-6 rounded-lg transition-shadow ${plan.highlighted ? 'shadow-lg scale-105' : ''}`}
                    style={{ 
                      backgroundColor: COLORS.blancCasse,
                      border: `2px solid ${plan.highlighted ? accentColor : COLORS.border}`,
                    }}
                  >
                    <h3 
                      className="text-xl font-bold mb-2"
                      style={{ color: primaryColor }}
                    >
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span 
                        className="text-3xl font-bold"
                        style={{ color: accentColor }}
                      >
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span style={{ color: COLORS.muted }}>{plan.period}</span>
                      )}
                    </div>
                    <ul className="space-y-2">
                      {plan.features.map((feature: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle 
                            className="h-4 w-4 flex-shrink-0 mt-0.5" 
                            style={{ color: accentColor }} 
                          />
                          <span style={{ color: COLORS.foreground }}>{feature}</span>
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
          <section 
            key={index} 
            className={`relative px-6 py-16 ${isHorizontal ? 'min-h-screen flex items-center' : ''} ${slideClass}`}
            style={{ backgroundColor: COLORS.blancCasse }}
          >
            <div className="max-w-3xl mx-auto relative z-10">
              <div 
                className="p-8 rounded-lg"
                style={{ 
                  backgroundColor: COLORS.bleuNuitLight10,
                  borderLeft: `4px solid ${accentColor}`,
                }}
              >
                <Quote 
                  className="h-8 w-8 mb-4" 
                  style={{ color: accentColor }} 
                />
                <blockquote 
                  className="text-lg italic mb-4"
                  style={{ color: COLORS.foreground }}
                >
                  "{slide.data.quote}"
                </blockquote>
                <div className="flex items-center gap-2">
                  <span 
                    className="font-semibold"
                    style={{ color: primaryColor }}
                  >
                    {slide.data.author}
                  </span>
                  {slide.data.company && (
                    <>
                      <span style={{ color: COLORS.muted }}>·</span>
                      <span style={{ color: COLORS.muted }}>{slide.data.company}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        );

      case 'contact':
        return (
          <section 
            key={index} 
            className={`relative px-6 py-20 text-center ${isHorizontal ? 'min-h-screen flex items-center justify-center' : ''} ${slideClass}`}
            style={{ backgroundColor: COLORS.blancCasse }}
          >
            
            <div className="max-w-xl mx-auto relative z-10">
              <h2 
                className="text-3xl font-bold mb-4"
                style={{ color: primaryColor }}
              >
                Intéressé ?
              </h2>
              <div className="flex justify-center mb-8">
                <LogoArc size="md" />
              </div>
              <a 
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold rounded-lg transition-all"
                style={{ 
                  border: `2px solid ${accentColor}`,
                  background: GRADIENTS.text.css,
                  backgroundSize: '600% 600%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {slide.data.cta_text}
                <span style={{ color: accentColor, WebkitTextFillColor: accentColor }}>→</span>
              </a>
              {slide.data.show_coordinates && (
                <p 
                  className="mt-8"
                  style={{ color: COLORS.subtle }}
                >
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

  // Footer component
  const BrochureFooter = ({ showPageInfo = false }: { showPageInfo?: boolean }) => (
    <div 
      className="flex items-center justify-between w-full"
      style={{ color: COLORS.muted }}
    >
      <BrandLogo size="sm" />
      {showPageInfo ? (
        <span className="text-sm">{currentSlide + 1} / {slides.length}</span>
      ) : (
        <span className="text-sm">© {new Date().getFullYear()} IArche</span>
      )}
    </div>
  );

  if (isHorizontal) {
    return (
      <div 
        className="relative h-screen overflow-hidden"
        style={{ backgroundColor: COLORS.blancCasse }}
      >
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
          className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full shadow-lg transition-opacity ${currentSlide === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-80'}`}
          style={{ 
            backgroundColor: COLORS.blancCasse,
            border: `1px solid ${COLORS.border}`,
          }}
          disabled={currentSlide === 0}
        >
          <ChevronLeft className="h-6 w-6" style={{ color: primaryColor }} />
        </button>
        <button
          onClick={() => scrollToSlide(Math.min(slides.length - 1, currentSlide + 1))}
          className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full shadow-lg transition-opacity ${currentSlide === slides.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-80'}`}
          style={{ 
            backgroundColor: COLORS.blancCasse,
            border: `1px solid ${COLORS.border}`,
          }}
          disabled={currentSlide === slides.length - 1}
        >
          <ChevronRight className="h-6 w-6" style={{ color: primaryColor }} />
        </button>

        {/* Slide indicators */}
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToSlide(index)}
              className="transition-all rounded-full"
              style={{ 
                width: index === currentSlide ? 32 : 8,
                height: 8,
                backgroundColor: index === currentSlide ? accentColor : COLORS.border,
              }}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="absolute bottom-4 left-6 right-6">
          <BrochureFooter showPageInfo />
        </div>
      </div>
    );
  }

  // Vertical scroll mode (default)
  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: COLORS.blancCasse }}
    >
      {slides.map((slide, index) => renderSection(slide, index))}

      {/* Footer */}
      <footer 
        className="px-6 py-8"
        style={{ borderTop: `1px solid ${COLORS.border}` }}
      >
        <div className="max-w-5xl mx-auto">
          <BrochureFooter />
        </div>
      </footer>
    </div>
  );
};

export default BrochureWebView;
