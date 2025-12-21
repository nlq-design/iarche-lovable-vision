import { Brochure } from '@/types/brochure';
import { CheckCircle, Quote, ExternalLink } from 'lucide-react';
import { COLORS, GRADIENTS } from '@/components/admin/medias/shared/tokens';
import LogoArc from '@/components/ui/LogoArc';

interface SlideData {
  type: string;
  data: any;
  label: string;
}

interface BrochureSectionRendererProps {
  slide: SlideData;
  brochure: Brochure;
  showDecorativeArc?: boolean;
}

/**
 * BrochureSectionRenderer v4.2 - Synchronisé avec BrochureWebView
 * 
 * Ce composant reproduit EXACTEMENT le rendu de BrochureWebView pour l'export PDF HD.
 * Toute modification dans BrochureWebView doit être reportée ici.
 */
const BrochureSectionRenderer = ({ slide, brochure, showDecorativeArc = true }: BrochureSectionRendererProps) => {
  const { custom_colors } = brochure;
  const primaryColor = custom_colors?.primary || COLORS.bleuNuit;
  const accentColor = custom_colors?.accent || COLORS.terracotta;

  switch (slide.type) {
    case 'cover':
      return (
        <section 
          className="relative min-h-[800px] flex flex-col items-center justify-center px-12 py-20 overflow-hidden"
          style={{ 
            background: `radial-gradient(ellipse at 50% 0%, rgba(176, 74, 50, 0.08) 0%, transparent 50%), ${COLORS.blancCasse}`,
          }}
        >
          {/* v4.2 - Arcs décoratifs en zones mortes extrêmes */}
          {showDecorativeArc && (
            <>
              <div className="absolute -top-48 -right-48 w-96 h-96 pointer-events-none opacity-[0.03]">
                <svg viewBox="0 0 400 400" className="w-full h-full">
                  <path d="M400 0 Q400 400 0 400" fill="none" stroke={COLORS.terracotta} strokeWidth="2" />
                </svg>
              </div>
              <div className="absolute -bottom-48 -left-48 w-96 h-96 pointer-events-none opacity-[0.03]">
                <svg viewBox="0 0 400 400" className="w-full h-full">
                  <path d="M0 0 Q0 400 400 400" fill="none" stroke={COLORS.bleuNuit} strokeWidth="2" />
                </svg>
              </div>
            </>
          )}
          
          <div className="relative z-10 flex flex-col items-center">
            {/* Logo SVG officiel v4.0 en haut */}
            <img 
              src="/logos/iarche-main.svg" 
              alt="IArche" 
              className="h-12 mb-8"
              crossOrigin="anonymous"
            />
            {/* v4.2 - Titre avec gradient et typography renforcée */}
            <h1
              className="text-5xl md:text-7xl font-bold text-center mb-6"
              style={{ 
                background: GRADIENTS.text.css,
                backgroundSize: '600% 600%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
              }}
            >
              {brochure.cover_title || 'Titre'}
            </h1>
            {/* Sous-titre avec meilleure opacité */}
            {brochure.cover_subtitle && (
              <p 
                className="text-xl md:text-2xl text-center max-w-2xl leading-relaxed"
                style={{ color: COLORS.muted, opacity: 0.85 }}
              >
                {brochure.cover_subtitle}
              </p>
            )}
            {/* Image de couverture avec ombre profonde */}
            {brochure.cover_image_url && (
              <img 
                src={brochure.cover_image_url} 
                alt={brochure.cover_title}
                className="mt-12 max-w-md rounded-lg"
                crossOrigin="anonymous"
                style={{
                  boxShadow: `0 25px 50px -12px rgba(26, 43, 74, 0.25), 0 0 0 1px rgba(176, 74, 50, 0.1)`,
                }}
              />
            )}
          </div>
        </section>
      );

    case 'introduction':
      return (
        <section 
          className="relative min-h-[800px] px-12 py-20 flex items-center justify-center"
          style={{ backgroundColor: COLORS.blancCasse }}
        >
          <div className="relative z-10 max-w-4xl">
            <p 
              className="text-xl leading-relaxed"
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
          className="relative min-h-[800px] px-12 py-20 flex items-center overflow-hidden"
          style={{ 
            background: `radial-gradient(ellipse at 80% 20%, rgba(176, 74, 50, 0.06) 0%, transparent 40%), ${COLORS.secondary}`,
          }}
        >
          <div className="max-w-6xl mx-auto w-full relative z-10">
            {/* v4.2 - Badge stylisé */}
            <div className="flex justify-center mb-4">
              <span 
                className="inline-flex items-center gap-2 text-xs uppercase tracking-wider font-medium px-4 py-2 rounded-full"
                style={{ 
                  background: 'rgba(176, 74, 50, 0.12)',
                  color: accentColor,
                  border: `1px solid rgba(176, 74, 50, 0.25)`,
                }}
              >
                <span>📋</span>
                Essentiel
              </span>
            </div>
            <h2 
              className="text-4xl font-bold text-center mb-4"
              style={{ color: primaryColor, letterSpacing: '-0.02em' }}
            >
              Points clés
            </h2>
            {/* Arc décoratif v4.0 under title */}
            <div className="flex justify-center mb-12">
              <LogoArc size="md" />
            </div>
            <div className="grid grid-cols-3 gap-8">
              {slide.data.points.map((point: any, pointIdx: number) => (
                <div 
                  key={point.id} 
                  className="p-8 rounded-xl"
                  style={{ 
                    backgroundColor: COLORS.blancCasse,
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: '0 4px 20px -4px rgba(26, 43, 74, 0.12)',
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* v4.2 - Numéro stylisé au lieu de CheckCircle */}
                    <span 
                      className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                      style={{ 
                        background: 'rgba(176, 74, 50, 0.15)',
                        color: accentColor,
                      }}
                    >
                      {pointIdx + 1}
                    </span>
                    <div>
                      <h3 
                        className="font-semibold text-lg mb-3"
                        style={{ color: primaryColor }}
                      >
                        {point.title}
                      </h3>
                      <p 
                        className="text-base leading-relaxed"
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
          className="relative min-h-[800px] px-12 py-20 flex items-center"
          style={{ backgroundColor: COLORS.blancCasse }}
        >
          <div className="max-w-4xl mx-auto relative z-10">
            <h2 
              className="text-4xl font-bold mb-4"
              style={{ color: primaryColor }}
            >
              Détails
            </h2>
            <LogoArc size="md" className="mb-8" />
            <div className="prose prose-xl max-w-none">
              {slide.data.content.split('\n').map((paragraph: string, i: number) => (
                <p key={i} className="text-lg mb-4" style={{ color: COLORS.foreground }}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </section>
      );

    case 'cta':
      return (
        <section 
          className="relative min-h-[800px] px-12 py-20 flex items-center"
          style={{ backgroundColor: COLORS.secondary }}
        >
          <div className="max-w-4xl mx-auto text-center relative z-10">
            {slide.data.title && (
              <h2 
                className="text-4xl font-bold mb-4"
                style={{ color: primaryColor }}
              >
                {slide.data.title}
              </h2>
            )}
            <div className="flex justify-center mb-10">
              <LogoArc size="md" />
            </div>
            {slide.data.description && (
              <p 
                className="text-xl mb-10"
                style={{ color: COLORS.muted }}
              >
                {slide.data.description}
              </p>
            )}
            <div 
              className="inline-flex items-center gap-3 px-10 py-5 text-xl font-semibold rounded-xl"
              style={{ 
                backgroundColor: accentColor,
                color: COLORS.blancCasse,
              }}
            >
              {slide.data.button_text || 'En savoir plus'}
              <ExternalLink className="h-6 w-6" />
            </div>
            <p 
              className="mt-8 text-base"
              style={{ color: COLORS.subtle }}
            >
              {slide.data.button_url}
            </p>
          </div>
        </section>
      );

    case 'pricing':
      return (
        <section 
          className="relative min-h-[800px] px-12 py-20 flex items-center"
          style={{ backgroundColor: COLORS.secondary }}
        >
          <div className="max-w-6xl mx-auto w-full relative z-10">
            <h2 
              className="text-4xl font-bold text-center mb-4"
              style={{ color: primaryColor }}
            >
              {slide.data.title}
            </h2>
            <div className="flex justify-center mb-12">
              <LogoArc size="md" />
            </div>
            <div className={`grid gap-8 ${
              slide.data.plans.length === 1 ? 'max-w-md mx-auto' : 
              slide.data.plans.length === 2 ? 'grid-cols-2 max-w-3xl mx-auto' : 
              'grid-cols-3'
            }`}>
              {slide.data.plans.map((plan: any) => (
                <div 
                  key={plan.id}
                  className={`p-8 rounded-xl ${plan.highlighted ? 'shadow-xl scale-105' : ''}`}
                  style={{ 
                    backgroundColor: COLORS.blancCasse,
                    border: `2px solid ${plan.highlighted ? accentColor : COLORS.border}`,
                  }}
                >
                  <h3 
                    className="text-2xl font-bold mb-3"
                    style={{ color: primaryColor }}
                  >
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span 
                      className="text-4xl font-bold"
                      style={{ color: accentColor }}
                    >
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-lg" style={{ color: COLORS.muted }}>{plan.period}</span>
                    )}
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((feature: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-base">
                        <CheckCircle 
                          className="h-5 w-5 flex-shrink-0 mt-0.5" 
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
          className="relative min-h-[800px] px-12 py-20 flex items-center overflow-hidden"
          style={{ 
            background: `radial-gradient(ellipse at 20% 80%, rgba(26, 43, 74, 0.05) 0%, transparent 40%), ${COLORS.blancCasse}`,
          }}
        >
          <div className="max-w-4xl mx-auto relative z-10">
            {/* v4.2 - Badge témoignage */}
            <div className="flex justify-center mb-6">
              <span 
                className="inline-flex items-center gap-2 text-xs uppercase tracking-wider font-medium px-4 py-2 rounded-full"
                style={{ 
                  background: 'rgba(176, 74, 50, 0.12)',
                  color: accentColor,
                  border: `1px solid rgba(176, 74, 50, 0.25)`,
                }}
              >
                <span>💬</span>
                Témoignage
              </span>
            </div>
            
            <div 
              className="p-12 rounded-xl relative"
              style={{ 
                backgroundColor: COLORS.bleuNuitLight10,
                borderLeft: `6px solid ${accentColor}`,
                boxShadow: '0 10px 40px -10px rgba(26, 43, 74, 0.15)',
              }}
            >
              {/* v4.2 - Guillemets stylisés grands */}
              <div 
                className="absolute -top-6 left-6 text-9xl font-serif leading-none opacity-20"
                style={{ color: accentColor }}
              >
                "
              </div>
              <blockquote 
                className="text-2xl italic mb-6 relative z-10 leading-relaxed"
                style={{ color: COLORS.foreground }}
              >
                {slide.data.quote}
              </blockquote>
              <div className="flex items-center gap-4">
                {/* v4.2 - Avatar placeholder stylisé */}
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
                  style={{ 
                    background: `linear-gradient(135deg, ${accentColor}, ${COLORS.terracottaLight30})`,
                    color: COLORS.blancCasse,
                  }}
                >
                  {slide.data.author?.charAt(0) || 'A'}
                </div>
                <div>
                  <span 
                    className="font-semibold text-xl block"
                    style={{ color: primaryColor }}
                  >
                    {slide.data.author}
                  </span>
                  {slide.data.company && (
                    <span 
                      className="text-lg"
                      style={{ color: COLORS.muted }}
                    >
                      {slide.data.company}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      );

    case 'contact':
      return (
        <section 
          className="relative min-h-[800px] px-12 py-20 text-center flex items-center justify-center"
          style={{ backgroundColor: COLORS.blancCasse }}
        >
          <div className="max-w-xl mx-auto relative z-10">
            <h2 
              className="text-4xl font-bold mb-4"
              style={{ color: primaryColor }}
            >
              Intéressé ?
            </h2>
            <div className="flex justify-center mb-10">
              <LogoArc size="md" />
            </div>
            <div 
              className="inline-flex items-center gap-3 px-10 py-5 text-xl font-semibold rounded-xl"
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
            </div>
            {slide.data.show_coordinates && (
              <p 
                className="mt-12 text-lg"
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

export default BrochureSectionRenderer;
