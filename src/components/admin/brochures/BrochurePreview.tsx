import { Brochure } from '@/types/brochure';
import { CheckCircle, Quote } from 'lucide-react';

interface BrochurePreviewProps {
  brochure: Brochure;
}

const BrochurePreview = ({ brochure }: BrochurePreviewProps) => {
  const { sections, custom_colors } = brochure;
  
  // Build custom style overrides
  const customStyle: React.CSSProperties = {};
  if (custom_colors?.primary) {
    (customStyle as any)['--brochure-primary'] = custom_colors.primary;
  }
  if (custom_colors?.accent) {
    (customStyle as any)['--brochure-accent'] = custom_colors.accent;
  }

  const primaryColor = custom_colors?.primary || 'hsl(var(--primary))';
  const accentColor = custom_colors?.accent || 'hsl(var(--accent))';

  return (
    <div className="min-h-screen bg-background" style={customStyle}>
      {/* Animated Background Pattern */}
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

      {/* Cover Section */}
      <section className="relative min-h-[60vh] flex flex-col items-center justify-center px-6 py-20">
        {/* Gradient Bar */}
        <div 
          className="w-24 h-1 mb-8"
          style={{ background: `linear-gradient(90deg, ${primaryColor} 0%, ${accentColor} 100%)` }}
        />
        
        <h1 
          className={`text-5xl md:text-7xl font-bold text-center mb-4 ${custom_colors?.primary || custom_colors?.accent ? '' : 'hero-gradient-text'}`}
          style={custom_colors?.primary || custom_colors?.accent ? { 
            background: `linear-gradient(270deg, ${primaryColor}, ${accentColor}, ${primaryColor}, ${accentColor})`,
            backgroundSize: '600% 600%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'hero-gradient 15s ease infinite',
          } : undefined}
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
      </section>

      {/* Introduction */}
      {sections.introduction.enabled && sections.introduction.content && (
        <section className="relative px-6 py-16 max-w-3xl mx-auto">
          <p className="text-lg leading-relaxed text-foreground">
            {sections.introduction.content}
          </p>
        </section>
      )}

      {/* Key Points */}
      {sections.keyPoints.enabled && sections.keyPoints.points.length > 0 && (
        <section className="relative px-6 py-16 bg-secondary/30">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12" style={{ color: primaryColor }}>
              Points clés
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sections.keyPoints.points.map((point) => (
                <div 
                  key={point.id}
                  className="bg-background p-6 rounded-lg shadow-sm border border-border"
                >
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
      )}

      {/* Details */}
      {sections.details.enabled && sections.details.content && (
        <section className="relative px-6 py-16 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-8" style={{ color: primaryColor }}>Détails</h2>
          <div className="prose prose-lg max-w-none text-foreground">
            {sections.details.content.split('\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </section>
      )}

      {/* Pricing */}
      {sections.pricing.enabled && sections.pricing.plans.length > 0 && (
        <section className="relative px-6 py-16 bg-secondary/30">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12" style={{ color: primaryColor }}>
              {sections.pricing.title}
            </h2>
            <div className={`grid gap-6 ${sections.pricing.plans.length === 1 ? 'max-w-md mx-auto' : sections.pricing.plans.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : 'md:grid-cols-3'}`}>
              {sections.pricing.plans.map((plan) => (
                <div 
                  key={plan.id}
                  className={`bg-background p-6 rounded-lg border-2 transition-shadow ${
                    plan.highlighted ? 'shadow-lg scale-105' : ''
                  }`}
                  style={{ borderColor: plan.highlighted ? accentColor : 'hsl(var(--border))' }}
                >
                  <h3 className="text-xl font-bold mb-2" style={{ color: primaryColor }}>{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl font-bold" style={{ color: accentColor }}>{plan.price}</span>
                    {plan.period && (
                      <span className="text-muted-foreground">{plan.period}</span>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
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
      )}

      {/* Testimonial */}
      {sections.testimonial.enabled && sections.testimonial.quote && (
        <section className="relative px-6 py-16 max-w-3xl mx-auto">
          <div className="bg-primary/5 p-8 rounded-lg border-l-4" style={{ borderColor: accentColor }}>
            <Quote className="h-8 w-8 mb-4" style={{ color: accentColor }} />
            <blockquote className="text-lg italic text-foreground mb-4">
              "{sections.testimonial.quote}"
            </blockquote>
            <div className="flex items-center gap-2">
              <span className="font-semibold" style={{ color: primaryColor }}>{sections.testimonial.author}</span>
              {sections.testimonial.company && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{sections.testimonial.company}</span>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      {sections.contact.enabled && (
        <section className="relative px-6 py-20 text-center">
          <div className="max-w-xl mx-auto">
            <h2 className="text-3xl font-bold mb-6" style={{ color: primaryColor }}>Intéressé ?</h2>
            
            <a 
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold rounded-lg transition-all border-2"
              style={{ 
                borderColor: accentColor,
                background: custom_colors?.primary || custom_colors?.accent 
                  ? `linear-gradient(270deg, ${primaryColor}, ${accentColor}, ${primaryColor}, ${accentColor})`
                  : undefined,
                backgroundSize: '600% 600%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {sections.contact.cta_text}
              <span style={{ color: accentColor, WebkitTextFillColor: accentColor }}>→</span>
            </a>

            {sections.contact.show_coordinates && (
              <p className="mt-8 text-muted-foreground">
                Bayonne · France · nlq@iarche.fr
              </p>
            )}
          </div>
        </section>
      )}

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

export default BrochurePreview;
