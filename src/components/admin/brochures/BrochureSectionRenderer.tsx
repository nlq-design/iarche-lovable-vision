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
}

const BrochureSectionRenderer = ({ slide, brochure }: BrochureSectionRendererProps) => {
  const { custom_colors } = brochure;
  const primaryColor = custom_colors?.primary || COLORS.bleuNuit;
  const accentColor = custom_colors?.accent || COLORS.terracotta;

  // Mesh background component
  const MeshBackground = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div 
        className="absolute w-[200%] h-[200%] opacity-[0.15]" 
        style={{ 
          top: '-50%', 
          left: '-50%',
          background: `repeating-linear-gradient(45deg, transparent, transparent 20px, ${COLORS.border} 20px, ${COLORS.border} 22px)`,
        }}
      />
      <div 
        className="absolute w-[200%] h-[200%] opacity-[0.08]" 
        style={{ 
          top: '-50%', 
          left: '-50%',
          background: `repeating-linear-gradient(-45deg, transparent, transparent 20px, ${COLORS.border} 20px, ${COLORS.border} 22px)`,
        }}
      />
    </div>
  );

  switch (slide.type) {
    case 'cover':
      return (
        <section 
          className="relative min-h-[800px] flex flex-col items-center justify-center px-12 py-20"
          style={{ backgroundColor: COLORS.blancCasse }}
        >
          <MeshBackground />
          <div className="relative z-10 flex flex-col items-center">
            {/* Arc décoratif v4.0 */}
            <LogoArc size="xl" className="mb-8" />
            <h1 
              className="text-7xl font-bold text-center mb-6"
              style={{ 
                background: GRADIENTS.text.css,
                backgroundSize: '600% 600%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {brochure.cover_title || 'Titre'}
            </h1>
            {brochure.cover_subtitle && (
              <p 
                className="text-2xl text-center max-w-2xl"
                style={{ color: COLORS.muted }}
              >
                {brochure.cover_subtitle}
              </p>
            )}
            {brochure.cover_image_url && (
              <img 
                src={brochure.cover_image_url} 
                alt={brochure.cover_title}
                className="mt-12 max-w-lg rounded-lg shadow-lg"
                crossOrigin="anonymous"
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
          <MeshBackground />
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
          className="relative min-h-[800px] px-12 py-20 flex items-center"
          style={{ backgroundColor: COLORS.secondary }}
        >
          <div className="max-w-6xl mx-auto w-full relative z-10">
            <h2 
              className="text-4xl font-bold text-center mb-4"
              style={{ color: primaryColor }}
            >
              Points clés
            </h2>
            <div className="flex justify-center mb-12">
              <LogoArc size="md" />
            </div>
            <div className="grid grid-cols-3 gap-8">
              {slide.data.points.map((point: any) => (
                <div 
                  key={point.id} 
                  className="p-8 rounded-xl shadow-sm"
                  style={{ 
                    backgroundColor: COLORS.blancCasse,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <div className="flex items-start gap-4">
                    <CheckCircle 
                      className="h-8 w-8 flex-shrink-0 mt-1" 
                      style={{ color: accentColor }} 
                    />
                    <div>
                      <h3 
                        className="font-semibold text-lg mb-3"
                        style={{ color: primaryColor }}
                      >
                        {point.title}
                      </h3>
                      <p 
                        className="text-base"
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
          <MeshBackground />
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
          className="relative min-h-[800px] px-12 py-20 flex items-center"
          style={{ backgroundColor: COLORS.blancCasse }}
        >
          <MeshBackground />
          <div className="max-w-4xl mx-auto relative z-10">
            <div 
              className="p-12 rounded-xl"
              style={{ 
                backgroundColor: COLORS.bleuNuitLight10,
                borderLeft: `6px solid ${accentColor}`,
              }}
            >
              <Quote 
                className="h-12 w-12 mb-6" 
                style={{ color: accentColor }} 
              />
              <blockquote 
                className="text-2xl italic mb-6 leading-relaxed"
                style={{ color: COLORS.foreground }}
              >
                "{slide.data.quote}"
              </blockquote>
              <div className="flex items-center gap-3">
                <span 
                  className="font-semibold text-xl"
                  style={{ color: primaryColor }}
                >
                  {slide.data.author}
                </span>
                {slide.data.company && (
                  <>
                    <span className="text-xl" style={{ color: COLORS.muted }}>·</span>
                    <span className="text-xl" style={{ color: COLORS.muted }}>{slide.data.company}</span>
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
          className="relative min-h-[800px] px-12 py-20 text-center flex items-center justify-center"
          style={{ backgroundColor: COLORS.blancCasse }}
        >
          <MeshBackground />
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
