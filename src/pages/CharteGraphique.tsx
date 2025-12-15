import React, { useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Printer } from 'lucide-react';
import GradientButton from '@/components/ui/GradientButton';
import LogoArc from '@/components/ui/LogoArc';
import arcImage from '@/assets/arc-iarche-v4.png';

const CharteGraphique = () => {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const colors = [
    { name: 'Bleu Nuit', variable: '--primary', hsl: '218 47% 20%', hex: '#1A2B4A', rgb: '26, 43, 74', usage: 'Titres, texte principal, CTA primaire' },
    { name: 'Terracotta', variable: '--accent', hsl: '12 60% 44%', hex: '#B04A32', rgb: '176, 74, 50', usage: 'Accents, CTA secondaire, focus, liens' },
    { name: 'Blanc Cassé', variable: '--background', hsl: '30 14% 98%', hex: '#FAF9F7', rgb: '250, 249, 247', usage: 'Fond principal' },
    { name: 'Gris Sable', variable: '--secondary', hsl: '30 20% 93%', hex: '#F0EDE8', rgb: '240, 237, 232', usage: 'Surfaces secondaires, cartes' },
    { name: 'Bordure', variable: '--border', hsl: '30 16% 88%', hex: '#E5E0DA', rgb: '229, 224, 218', usage: 'Bordures, séparateurs' },
    { name: 'Texte Muted', variable: '--muted-foreground', hsl: '0 0% 40%', hex: '#666666', rgb: '102, 102, 102', usage: 'Texte secondaire' },
    { name: 'Gris Texte', variable: '--text-subtle', hsl: '215 14% 35%', hex: '#4A5568', rgb: '74, 85, 104', usage: 'Texte formulaires, descriptions' },
    { name: 'Vert Sauge', variable: '--success', hsl: '153 34% 36%', hex: '#3D7A5C', rgb: '61, 122, 92', usage: 'Succès, validation' },
  ];

  const spacing = [
    { label: 'XS', value: '4px', tailwind: 'p-1 / m-1', usage: 'Micro-espacements, icônes' },
    { label: 'SM', value: '8px', tailwind: 'p-2 / m-2', usage: 'Espacements internes' },
    { label: 'MD', value: '16px', tailwind: 'p-4 / m-4', usage: 'Standard, padding cartes' },
    { label: 'LG', value: '24px', tailwind: 'p-6 / m-6', usage: 'Sections, gaps' },
    { label: 'XL', value: '32px', tailwind: 'p-8 / m-8', usage: 'Grandes séparations' },
    { label: '2XL', value: '48px', tailwind: 'p-12 / m-12', usage: 'Séparations majeures' },
    { label: '3XL', value: '64px', tailwind: 'p-16 / m-16', usage: 'Hero sections' },
  ];

  const arcSizes = [
    { label: 'SM', width: '80px', height: '10px', usage: 'Cards, petits titres' },
    { label: 'MD', width: '120px', height: '14px', usage: 'Titres de section (défaut)' },
    { label: 'LG', width: '180px', height: '20px', usage: 'Grands titres de page' },
    { label: 'XL', width: '260px', height: '28px', usage: 'Hero section' },
  ];

  return (
    <>
      <Helmet>
        <title>Charte Graphique v4.0 | IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Boutons d'action (non imprimés) */}
      <div className="fixed top-4 right-4 z-50 flex gap-2 print:hidden">
        <GradientButton onClick={handlePrint} size="sm">
          <Printer className="w-4 h-4 mr-2" />
          Imprimer / PDF
        </GradientButton>
      </div>

      <div ref={contentRef} className="bg-white min-h-screen">
        {/* ========== PAGE 1: COUVERTURE ========== */}
        <section className="min-h-screen flex flex-col items-center justify-center p-12 bg-[#FAF9F7] print:break-after-page">
          <div className="text-center">
            <img src="/logos/iarche-main.svg" alt="IArche" className="h-20 mx-auto mb-6" />
            <p className="text-2xl text-[#666666] mb-2">Charte Graphique Complète</p>
            <p className="text-lg text-[#999999]">Version 4.0 — Décembre 2025</p>
          </div>
          <div className="absolute bottom-12 text-center">
            <p className="text-sm text-[#999999]">L'IA se construit avec vous</p>
            <p className="text-xs text-[#CCCCCC] mt-2">Bayonne · France · nlq@iarche.fr</p>
          </div>
        </section>

        {/* ========== PAGE 2: SOMMAIRE ========== */}
        <section className="min-h-screen p-12 bg-white print:break-after-page">
          <h2 className="text-3xl font-semibold text-[#1A2B4A] mb-2">
            Sommaire
          </h2>
          <LogoArc size="md" className="mb-8" />
          
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-full bg-[#1A2B4A] text-white flex items-center justify-center text-sm font-semibold">01</span>
                <span className="text-lg text-[#1A2B4A]">Logo & Identité</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-full bg-[#1A2B4A] text-white flex items-center justify-center text-sm font-semibold">02</span>
                <span className="text-lg text-[#1A2B4A]">Arc Décoratif (Nouveau v4.0)</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-full bg-[#1A2B4A] text-white flex items-center justify-center text-sm font-semibold">03</span>
                <span className="text-lg text-[#1A2B4A]">Palette de Couleurs</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-full bg-[#1A2B4A] text-white flex items-center justify-center text-sm font-semibold">04</span>
                <span className="text-lg text-[#1A2B4A]">Typographie</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-full bg-[#1A2B4A] text-white flex items-center justify-center text-sm font-semibold">05</span>
                <span className="text-lg text-[#1A2B4A]">Espacements & Dimensions</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-full bg-[#B04A32] text-white flex items-center justify-center text-sm font-semibold">06</span>
                <span className="text-lg text-[#1A2B4A]">Éléments Visuels</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-full bg-[#B04A32] text-white flex items-center justify-center text-sm font-semibold">07</span>
                <span className="text-lg text-[#1A2B4A]">Boutons & CTA</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-full bg-[#B04A32] text-white flex items-center justify-center text-sm font-semibold">08</span>
                <span className="text-lg text-[#1A2B4A]">Animations</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-full bg-[#B04A32] text-white flex items-center justify-center text-sm font-semibold">09</span>
                <span className="text-lg text-[#1A2B4A]">Applications</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-8 h-8 rounded-full bg-[#B04A32] text-white flex items-center justify-center text-sm font-semibold">10</span>
                <span className="text-lg text-[#1A2B4A]">Usages & Règles</span>
              </div>
            </div>
          </div>

          {/* Changelog v4.0 */}
          <div className="mt-12 bg-[#E8F5E9] p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-[#2E7D32] mb-3">Nouveautés v4.0</h3>
            <ul className="text-sm text-[#1A2B4A] space-y-1">
              <li>✓ <strong>Logo SVG officiel</strong> — Remplace le texte gradient animé</li>
              <li>✓ <strong>Arc décoratif PNG</strong> — Fichier exact, remplace toutes les barres gradient</li>
              <li>✓ <strong>Suppression</strong> — Lignes canalisation, AnimatedArcs, gradient bars</li>
              <li>✓ <strong>Composant LogoArc</strong> — Unique élément décoratif (sous titres uniquement)</li>
            </ul>
          </div>
        </section>

        {/* ========== PAGE 3: LOGO ========== */}
        <section className="min-h-screen p-12 bg-white print:break-after-page">
          <h2 className="text-3xl font-semibold text-[#1A2B4A] mb-2">
            01. Logo & Identité
          </h2>
          <LogoArc size="md" className="mb-8" />

          {/* Logo Principal SVG */}
          <div className="mb-12">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Logo Principal — SVG Officiel</h3>
            <div className="bg-[#FAF9F7] p-12 rounded-lg flex items-center justify-center mb-4">
              <img src="/logos/iarche-main.svg" alt="IArche" className="h-16" />
            </div>
            <p className="text-sm text-[#666666]">
              Logo officiel en format SVG vectoriel. Typographie serif avec gradient Bleu Nuit → Terracotta.
              L'arc reliant le "I" au "E" est l'élément signature de l'identité.
            </p>
          </div>

          {/* Variantes */}
          <div className="grid grid-cols-3 gap-6 mb-12">
            <div>
              <h4 className="text-sm font-medium text-[#1A2B4A] mb-2">Gradient (Main)</h4>
              <div className="bg-[#FAF9F7] p-8 rounded-lg flex items-center justify-center">
                <img src="/logos/iarche-main.svg" alt="IArche" className="h-10" />
              </div>
              <p className="text-xs text-[#666666] mt-2">Usage principal</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-[#1A2B4A] mb-2">Blanc (White)</h4>
              <div className="bg-[#1A2B4A] p-8 rounded-lg flex items-center justify-center">
                <img src="/logos/iarche-white.svg" alt="IArche" className="h-10" />
              </div>
              <p className="text-xs text-[#666666] mt-2">Fonds sombres</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-[#1A2B4A] mb-2">Bleu Nuit (Dark)</h4>
              <div className="bg-[#FAF9F7] p-8 rounded-lg flex items-center justify-center">
                <img src="/logos/iarche-dark.svg" alt="IArche" className="h-10" />
              </div>
              <p className="text-xs text-[#666666] mt-2">Fonds clairs, monochrome</p>
            </div>
          </div>

          {/* Fichiers logo */}
          <div className="mb-12">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Fichiers Logo</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-[#FAF9F7] p-4 rounded-lg font-mono text-xs">
                <p className="font-semibold text-[#1A2B4A] mb-2">Logos SVG</p>
                <p className="text-[#666666]">/logos/iarche-main.svg — Gradient</p>
                <p className="text-[#666666]">/logos/iarche-white.svg — Blanc</p>
                <p className="text-[#666666]">/logos/iarche-dark.svg — Bleu Nuit</p>
                <p className="text-[#666666]">/logos/iarche-vertical.svg — Vertical</p>
              </div>
              <div className="bg-[#FAF9F7] p-4 rounded-lg font-mono text-xs">
                <p className="font-semibold text-[#1A2B4A] mb-2">Icônes (Favicon/PWA)</p>
                <p className="text-[#666666]">/logos/iarche-icon-32.svg — Favicon</p>
                <p className="text-[#666666]">/logos/iarche-icon-512.svg — PWA</p>
              </div>
            </div>
          </div>

          {/* Zones de protection */}
          <div className="mb-8">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Zones de Protection</h3>
            <div className="bg-[#FAF9F7] p-8 rounded-lg inline-block">
              <div className="border-2 border-dashed border-[#B04A32] p-8">
                <img src="/logos/iarche-main.svg" alt="IArche" className="h-10" />
              </div>
            </div>
            <p className="text-sm text-[#666666] mt-2">
              Espace minimum autour du logo: hauteur du "I" majuscule sur chaque côté.
            </p>
          </div>

          {/* Interdictions */}
          <div>
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Usages Interdits</h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-[#FEE] rounded-lg">
                <img src="/logos/iarche-main.svg" alt="IArche" className="h-8 mx-auto opacity-50" />
                <p className="text-xs text-red-600 mt-2">❌ Opacité réduite</p>
              </div>
              <div className="p-4 bg-[#FEE] rounded-lg">
                <img src="/logos/iarche-main.svg" alt="IArche" className="h-8 mx-auto" style={{ filter: 'hue-rotate(180deg)' }} />
                <p className="text-xs text-red-600 mt-2">❌ Couleurs modifiées</p>
              </div>
              <div className="p-4 bg-[#FEE] rounded-lg">
                <img src="/logos/iarche-main.svg" alt="IArche" className="h-8 mx-auto" style={{ transform: 'scaleX(1.5)' }} />
                <p className="text-xs text-red-600 mt-2">❌ Déformation</p>
              </div>
              <div className="p-4 bg-[#FEE] rounded-lg">
                <img src="/logos/iarche-main.svg" alt="IArche" className="h-8 mx-auto" style={{ filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.5))' }} />
                <p className="text-xs text-red-600 mt-2">❌ Ombres portées</p>
              </div>
            </div>
          </div>
        </section>

        {/* ========== PAGE 4: ARC DÉCORATIF (NOUVEAU v4.0) ========== */}
        <section className="min-h-screen p-12 bg-white print:break-after-page">
          <h2 className="text-3xl font-semibold text-[#1A2B4A] mb-2">
            02. Arc Décoratif
          </h2>
          <LogoArc size="md" className="mb-8" />

          {/* Explication */}
          <div className="mb-12 bg-[#E8F5E9] p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-[#2E7D32] mb-3">Nouveau en v4.0</h3>
            <p className="text-[#1A2B4A]">
              L'arc de cercle est l'<strong>UNIQUE élément décoratif</strong> du site. Il reproduit la "virgule" 
              du logo officiel (courbe reliant I→E). Cet arc remplace TOUTES les barres gradient horizontales 
              précédemment utilisées.
            </p>
          </div>

          {/* Image de référence */}
          <div className="mb-12">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Fichier de Référence</h3>
            <div className="bg-[#FAF9F7] p-12 rounded-lg flex items-center justify-center">
              <img 
                src={arcImage} 
                alt="Arc IArche" 
                className="block"
                style={{ width: '300px', height: 'auto' }}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="bg-[#FAF9F7] p-4 rounded font-mono text-xs">
                <p className="font-semibold text-[#1A2B4A] mb-2">Fichiers</p>
                <p className="text-[#666666]">src/assets/arc-iarche-v4.png (import ES6)</p>
                <p className="text-[#666666]">public/assets/arc-iarche-v4.png (URLs directes)</p>
              </div>
              <div className="bg-[#FAF9F7] p-4 rounded font-mono text-xs">
                <p className="font-semibold text-[#1A2B4A] mb-2">Caractéristiques</p>
                <p className="text-[#666666]">Gradient: Bleu Nuit (#1A2B4A) → Terracotta (#B04A32)</p>
                <p className="text-[#666666]">Forme: Courbe de Bézier affinée (épais→fin)</p>
              </div>
            </div>
          </div>

          {/* Tailles */}
          <div className="mb-12">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Tailles Disponibles</h3>
            <div className="bg-[#FAF9F7] p-8 rounded-lg space-y-6">
              {arcSizes.map((arc) => (
                <div key={arc.label} className="flex items-center gap-4">
                  <span className="w-8 text-sm font-mono text-[#666666]">{arc.label}</span>
                  <LogoArc size={arc.label.toLowerCase() as 'sm' | 'md' | 'lg' | 'xl'} />
                  <span className="text-xs text-[#666666]">{arc.width} × {arc.height} — {arc.usage}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Règles d'utilisation */}
          <div className="grid grid-cols-2 gap-8">
            <div className="bg-[#E8F5E9] p-6 rounded-lg">
              <h4 className="font-semibold text-[#2E7D32] mb-3">✓ Utiliser sous</h4>
              <ul className="text-sm text-[#1A2B4A] space-y-1">
                <li>• Titres de page (H1)</li>
                <li>• Titres de section (H2)</li>
                <li>• Sous-titres (H3)</li>
                <li>• Cards (petits titres)</li>
              </ul>
            </div>
            <div className="bg-[#FFEBEE] p-6 rounded-lg">
              <h4 className="font-semibold text-[#C62828] mb-3">✗ Ne PAS utiliser</h4>
              <ul className="text-sm text-[#1A2B4A] space-y-1">
                <li>• Sous le logo (réservé aux titres)</li>
                <li>• En remplacement du logo</li>
                <li>• Avec des couleurs modifiées</li>
                <li>• Avec rotation ou déformation</li>
              </ul>
            </div>
          </div>

          {/* Composant */}
          <div className="mt-8 bg-[#FAF9F7] p-6 rounded-lg">
            <h4 className="font-semibold text-[#1A2B4A] mb-3">Composant React</h4>
            <pre className="text-xs font-mono bg-white p-4 rounded border border-[#E5E0DA] overflow-x-auto">
{`import LogoArc from '@/components/ui/LogoArc';

// Utilisation
<LogoArc size="md" className="mt-2" />

// Le composant utilise directement le fichier PNG
import arcImage from '@/assets/arc-iarche-v4.png';`}
            </pre>
          </div>
        </section>

        {/* ========== PAGE 5: COULEURS ========== */}
        <section className="min-h-screen p-12 bg-white print:break-after-page">
          <h2 className="text-3xl font-semibold text-[#1A2B4A] mb-2">
            03. Palette de Couleurs
          </h2>
          <LogoArc size="md" className="mb-8" />

          {/* Couleurs principales */}
          <div className="grid grid-cols-3 gap-8 mb-12">
            <div>
              <div className="h-40 rounded-t-lg" style={{ backgroundColor: '#1A2B4A' }}></div>
              <div className="bg-[#FAF9F7] p-4 rounded-b-lg">
                <h4 className="font-semibold text-[#1A2B4A]">Bleu Nuit</h4>
                <p className="text-xs text-[#666666] font-mono mt-1">HEX: #1A2B4A</p>
                <p className="text-xs text-[#666666] font-mono">HSL: 218 47% 20%</p>
                <p className="text-xs text-[#666666] font-mono">RGB: 26, 43, 74</p>
              </div>
            </div>
            <div>
              <div className="h-40 rounded-t-lg" style={{ backgroundColor: '#B04A32' }}></div>
              <div className="bg-[#FAF9F7] p-4 rounded-b-lg">
                <h4 className="font-semibold text-[#1A2B4A]">Terracotta</h4>
                <p className="text-xs text-[#666666] font-mono mt-1">HEX: #B04A32</p>
                <p className="text-xs text-[#666666] font-mono">HSL: 12 60% 44%</p>
                <p className="text-xs text-[#666666] font-mono">RGB: 176, 74, 50</p>
              </div>
            </div>
            <div>
              <div className="h-40 rounded-t-lg border border-[#E5E0DA]" style={{ backgroundColor: '#FAF9F7' }}></div>
              <div className="bg-[#FAF9F7] p-4 rounded-b-lg border border-t-0 border-[#E5E0DA]">
                <h4 className="font-semibold text-[#1A2B4A]">Blanc Cassé</h4>
                <p className="text-xs text-[#666666] font-mono mt-1">HEX: #FAF9F7</p>
                <p className="text-xs text-[#666666] font-mono">HSL: 30 14% 98%</p>
                <p className="text-xs text-[#666666] font-mono">RGB: 250, 249, 247</p>
              </div>
            </div>
          </div>

          {/* Palette complète */}
          <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Palette Complète</h3>
          <div className="space-y-3">
            {colors.map((color) => (
              <div key={color.name} className="flex items-center gap-4 p-3 bg-[#FAF9F7] rounded-lg">
                <div 
                  className="w-16 h-16 rounded-lg flex-shrink-0 border border-[#E5E0DA]" 
                  style={{ backgroundColor: color.hex }}
                ></div>
                <div className="flex-1">
                  <h4 className="font-semibold text-[#1A2B4A]">{color.name}</h4>
                  <p className="text-xs text-[#666666]">{color.usage}</p>
                </div>
                <div className="text-right font-mono text-xs text-[#666666]">
                  <p>{color.hex}</p>
                  <p>HSL: {color.hsl}</p>
                  <p>RGB: {color.rgb}</p>
                  <p className="text-[#999999]">{color.variable}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========== PAGE 6: TYPOGRAPHIE ========== */}
        <section className="min-h-screen p-12 bg-white print:break-after-page">
          <h2 className="text-3xl font-semibold text-[#1A2B4A] mb-2">
            04. Typographie
          </h2>
          <LogoArc size="md" className="mb-8" />

          {/* Police principale */}
          <div className="mb-12">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Police Principale: Manrope</h3>
            <div className="bg-[#FAF9F7] p-8 rounded-lg">
              <p className="text-6xl font-light text-[#1A2B4A] mb-2">Aa</p>
              <p className="text-2xl text-[#1A2B4A]">ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
              <p className="text-2xl text-[#1A2B4A]">abcdefghijklmnopqrstuvwxyz</p>
              <p className="text-2xl text-[#1A2B4A]">0123456789 !@#$%&*()</p>
            </div>
            <p className="text-sm text-[#666666] mt-2">
              Police Google Fonts. Chargement: font-display: swap. Poids: 300, 400, 500, 600, 700.
            </p>
          </div>

          {/* Poids */}
          <div className="mb-12">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Poids Utilisés</h3>
            <div className="space-y-4">
              <div className="flex items-baseline gap-8">
                <span className="w-32 text-sm text-[#666666]">Light (300)</span>
                <span className="text-3xl font-light text-[#1A2B4A]">L'IA se construit avec vous</span>
              </div>
              <div className="flex items-baseline gap-8">
                <span className="w-32 text-sm text-[#666666]">Regular (400)</span>
                <span className="text-3xl font-normal text-[#1A2B4A]">L'IA se construit avec vous</span>
              </div>
              <div className="flex items-baseline gap-8">
                <span className="w-32 text-sm text-[#666666]">Medium (500)</span>
                <span className="text-3xl font-medium text-[#1A2B4A]">L'IA se construit avec vous</span>
              </div>
              <div className="flex items-baseline gap-8">
                <span className="w-32 text-sm text-[#666666]">Semibold (600)</span>
                <span className="text-3xl font-semibold text-[#1A2B4A]">L'IA se construit avec vous</span>
              </div>
              <div className="flex items-baseline gap-8">
                <span className="w-32 text-sm text-[#666666]">Bold (700)</span>
                <span className="text-3xl font-bold text-[#1A2B4A]">L'IA se construit avec vous</span>
              </div>
            </div>
          </div>

          {/* Hiérarchie */}
          <div>
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Hiérarchie Typographique</h3>
            <div className="space-y-6 bg-[#FAF9F7] p-8 rounded-lg">
              <div>
                <span className="text-xs text-[#B04A32] font-mono">H1 — 4.5rem / 72px / font-semibold</span>
                <h1 className="text-7xl font-semibold text-[#1A2B4A]">Titre Principal</h1>
              </div>
              <div>
                <span className="text-xs text-[#B04A32] font-mono">H2 — 2.25rem / 36px / font-semibold</span>
                <h2 className="text-4xl font-semibold text-[#1A2B4A]">Titre de Section</h2>
              </div>
              <div>
                <span className="text-xs text-[#B04A32] font-mono">H3 — 1.5rem / 24px / font-semibold</span>
                <h3 className="text-2xl font-semibold text-[#1A2B4A]">Sous-titre</h3>
              </div>
              <div>
                <span className="text-xs text-[#B04A32] font-mono">Body — 1rem / 16px / font-normal</span>
                <p className="text-base text-[#1A2B4A]">Corps de texte standard pour le contenu principal des pages.</p>
              </div>
              <div>
                <span className="text-xs text-[#B04A32] font-mono">Small — 0.875rem / 14px / text-muted-foreground</span>
                <p className="text-sm text-[#666666]">Texte secondaire, légendes et annotations.</p>
              </div>
              <div>
                <span className="text-xs text-[#B04A32] font-mono">Caption — 0.75rem / 12px / font-mono</span>
                <p className="text-xs font-mono text-[#999999]">Code, valeurs techniques, timestamps.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ========== PAGE 7: ESPACEMENTS ========== */}
        <section className="min-h-screen p-12 bg-white print:break-after-page">
          <h2 className="text-3xl font-semibold text-[#1A2B4A] mb-2">
            05. Espacements & Dimensions
          </h2>
          <LogoArc size="md" className="mb-8" />

          {/* Espacements */}
          <div className="mb-12">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Échelle d'Espacements</h3>
            <div className="space-y-3 bg-[#FAF9F7] p-6 rounded-lg">
              {spacing.map((item) => (
                <div key={item.label} className="flex items-center gap-4">
                  <span className="w-12 text-sm font-mono font-semibold text-[#1A2B4A]">{item.label}</span>
                  <div className="h-6 bg-[#1A2B4A] rounded" style={{ width: item.value }} />
                  <span className="w-20 text-sm font-mono text-[#666666]">{item.value}</span>
                  <span className="w-32 text-xs font-mono text-[#999999]">{item.tailwind}</span>
                  <span className="text-xs text-[#666666]">{item.usage}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Border Radius */}
          <div className="mb-12">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Border Radius</h3>
            <div className="flex gap-8 bg-[#FAF9F7] p-6 rounded-lg">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#1A2B4A] rounded-none mb-2"></div>
                <p className="text-xs font-mono text-[#666666]">none</p>
                <p className="text-xs text-[#999999]">0px</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-[#1A2B4A] rounded-sm mb-2"></div>
                <p className="text-xs font-mono text-[#666666]">sm</p>
                <p className="text-xs text-[#999999]">2px</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-[#1A2B4A] rounded mb-2"></div>
                <p className="text-xs font-mono text-[#666666]">default</p>
                <p className="text-xs text-[#999999]">4px</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-[#1A2B4A] rounded-md mb-2"></div>
                <p className="text-xs font-mono text-[#666666]">md</p>
                <p className="text-xs text-[#999999]">6px</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-[#1A2B4A] rounded-lg mb-2"></div>
                <p className="text-xs font-mono text-[#666666]">lg</p>
                <p className="text-xs text-[#999999]">8px</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-[#1A2B4A] rounded-xl mb-2"></div>
                <p className="text-xs font-mono text-[#666666]">xl</p>
                <p className="text-xs text-[#999999]">12px</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-[#1A2B4A] rounded-full mb-2"></div>
                <p className="text-xs font-mono text-[#666666]">full</p>
                <p className="text-xs text-[#999999]">50%</p>
              </div>
            </div>
          </div>

          {/* Formats d'export */}
          <div>
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Formats d'Export Médias</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#FAF9F7] p-4 rounded-lg">
                <h4 className="font-semibold text-[#1A2B4A] mb-2">PNG Exports</h4>
                <ul className="text-sm text-[#666666] space-y-1">
                  <li>• Post Instagram: 1080 × 1080px</li>
                  <li>• Story: 1080 × 1920px</li>
                  <li>• Banner LinkedIn: 1584 × 396px</li>
                  <li>• OpenGraph: 1200 × 630px</li>
                  <li>• Thumbnail: 1280 × 720px</li>
                  <li>• Signature Email: 600 × 200px</li>
                </ul>
              </div>
              <div className="bg-[#FAF9F7] p-4 rounded-lg">
                <h4 className="font-semibold text-[#1A2B4A] mb-2">PDF Exports</h4>
                <ul className="text-sm text-[#666666] space-y-1">
                  <li>• Présentation: 1920 × 1080px (16:9)</li>
                  <li>• Carousel: 1080 × 1350px (4:5)</li>
                  <li>• A4: 595 × 842pt</li>
                  <li>• Charte Graphique: A4 multi-pages</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ========== PAGE 8: ÉLÉMENTS VISUELS ========== */}
        <section className="min-h-screen p-12 bg-white print:break-after-page">
          <h2 className="text-3xl font-semibold text-[#1A2B4A] mb-2">
            06. Éléments Visuels
          </h2>
          <LogoArc size="md" className="mb-8" />

          {/* Suppressions v4.0 */}
          <div className="mb-12 bg-[#FFEBEE] p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-[#C62828] mb-3">Éléments Supprimés en v4.0</h3>
            <ul className="text-sm text-[#1A2B4A] space-y-1">
              <li>❌ <strong>Barres gradient horizontales</strong> — Remplacées par l'arc décoratif</li>
              <li>❌ <strong>HTMLGradientBar / PDFGradientBar</strong> — Composants supprimés</li>
              <li>❌ <strong>Lignes canalisation (HTMLCanalisationLines, PDFCanalisationLines)</strong> — Supprimées</li>
              <li>❌ <strong>AnimatedArcs</strong> — Remplacé par arc statique</li>
              <li>❌ <strong>Texte gradient "IArche"</strong> — Remplacé par logo SVG</li>
            </ul>
          </div>

          {/* Quadrillage */}
          <div className="mb-12">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Fond Quadrillé Animé (Mesh)</h3>
            <div className="relative h-48 rounded-lg overflow-hidden border border-[#E5E0DA]">
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  background: 'repeating-linear-gradient(45deg, transparent, transparent 20px, #E5E0DA 20px, #E5E0DA 22px)'
                }}
              ></div>
              <div 
                className="absolute inset-0 opacity-10"
                style={{
                  background: 'repeating-linear-gradient(-45deg, transparent, transparent 20px, #E5E0DA 20px, #E5E0DA 22px)'
                }}
              ></div>
            </div>
            <p className="text-sm text-[#666666] mt-2">
              Deux quadrillages diagonaux (45° et -45°) avec animation de translation continue (40s).
              Opacités: 20% et 10%. Espacement lignes: 20px.
            </p>
          </div>

          {/* Récapitulatif éléments restants */}
          <div className="bg-[#FAF9F7] p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-[#1A2B4A] mb-4">Éléments Décoratifs v4.0</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-[#1A2B4A] mb-2">Conservés</h4>
                <ul className="text-sm text-[#666666] space-y-1">
                  <li>✓ Logo SVG officiel (3 variantes)</li>
                  <li>✓ Arc décoratif PNG (4 tailles)</li>
                  <li>✓ Fond quadrillé animé (mesh)</li>
                  <li>✓ Gradient texte animé (GradientTitle)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-[#1A2B4A] mb-2">Composants</h4>
                <ul className="text-sm text-[#666666] space-y-1 font-mono text-xs">
                  <li>LogoArc.tsx — UI public</li>
                  <li>HTMLLogoArc.tsx — Éditeurs média HTML</li>
                  <li>PDFLogoArc.tsx — Exports PDF</li>
                  <li>GradientTitle.tsx — Titre + arc</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ========== PAGE 9: BOUTONS & CTA ========== */}
        <section className="min-h-screen p-12 bg-white print:break-after-page">
          <h2 className="text-3xl font-semibold text-[#1A2B4A] mb-2">
            07. Boutons & CTA
          </h2>
          <LogoArc size="md" className="mb-8" />

          {/* GradientButton */}
          <div className="mb-12">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">GradientButton — Primary</h3>
            <div className="flex gap-8 items-center mb-4">
              <button className="px-6 py-3 text-white font-medium rounded-lg" style={{
                background: 'linear-gradient(to right, #1A2B4A, #B04A32)',
                backgroundSize: '200% 100%',
              }}>
                Nous contacter
              </button>
              <button className="px-6 py-3 text-white font-medium rounded-lg opacity-50 cursor-not-allowed" style={{
                background: 'linear-gradient(to right, #1A2B4A, #B04A32)',
              }}>
                Disabled
              </button>
            </div>
            <p className="text-sm text-[#666666] font-mono">
              background: linear-gradient(to right, #1A2B4A, #B04A32);<br/>
              Hover: background-position slide de left à right.
            </p>
          </div>

          {/* Bouton Outline */}
          <div className="mb-12">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">GradientButton — Outline</h3>
            <div className="flex gap-8 items-center mb-4">
              <button className="px-6 py-3 font-medium rounded-lg border-2 border-[#1A2B4A] text-[#1A2B4A] bg-transparent">
                En savoir plus
              </button>
              <button className="px-6 py-3 font-medium rounded-lg text-white" style={{
                background: 'linear-gradient(to right, #1A2B4A, #B04A32)',
              }}>
                Hover State
              </button>
            </div>
            <p className="text-sm text-[#666666] font-mono">
              border: 2px solid #1A2B4A; color: #1A2B4A;<br/>
              Hover: fond gradient, texte blanc, bordure transparente.
            </p>
          </div>

          {/* GradientLink */}
          <div className="mb-12">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">GradientLink — Texte Animé</h3>
            <div className="flex gap-8 items-center mb-4 bg-[#FAF9F7] p-8 rounded-lg">
              <span className="text-lg font-medium hero-gradient-text cursor-pointer">
                Découvrir →
              </span>
              <span className="text-lg font-medium hero-gradient-text cursor-pointer">
                Une question ?
              </span>
            </div>
            <p className="text-sm text-[#666666]">
              Texte avec gradient animé (8s). Soulignement animé au hover (scale-x 0 → 1, 300ms).
              Focus-visible: ring-2 ring-accent.
            </p>
          </div>

          {/* IArcheLink */}
          <div>
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">IArcheLink — Secondaire</h3>
            <div className="flex gap-8 items-center mb-4 bg-[#FAF9F7] p-8 rounded-lg">
              <span className="text-sm font-medium text-[#1A2B4A] inline-flex items-center gap-2">
                En savoir plus <span className="text-[#B04A32]">→</span>
              </span>
            </div>
            <p className="text-sm text-[#666666]">
              Texte Bleu Nuit + flèche Terracotta. Gap augmente au hover (gap-2 → gap-3).
              Focus-visible: ring-2 ring-accent.
            </p>
          </div>
        </section>

        {/* ========== PAGE 10: ANIMATIONS ========== */}
        <section className="min-h-screen p-12 bg-white print:break-after-page">
          <h2 className="text-3xl font-semibold text-[#1A2B4A] mb-2">
            08. Animations
          </h2>
          <LogoArc size="md" className="mb-8" />

          <div className="grid grid-cols-2 gap-6">
            {/* FadeIn */}
            <div className="bg-[#FAF9F7] p-5 rounded-lg">
              <h3 className="text-lg font-semibold text-[#1A2B4A] mb-2">fadeIn</h3>
              <p className="text-sm text-[#666666] mb-2">Apparition progressive.</p>
              <pre className="text-xs font-mono bg-white p-3 rounded border border-[#E5E0DA] overflow-x-auto">
{`@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
animation: fadeIn 0.6s ease-out;`}
              </pre>
            </div>

            {/* GradientText */}
            <div className="bg-[#FAF9F7] p-5 rounded-lg">
              <h3 className="text-lg font-semibold text-[#1A2B4A] mb-2">gradientText</h3>
              <p className="text-sm text-[#666666] mb-2">Animation gradient titres.</p>
              <pre className="text-xs font-mono bg-white p-3 rounded border border-[#E5E0DA] overflow-x-auto">
{`@keyframes gradientText {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
animation: gradientText 8s ease infinite;`}
              </pre>
            </div>

            {/* PatternScroll */}
            <div className="bg-[#FAF9F7] p-5 rounded-lg">
              <h3 className="text-lg font-semibold text-[#1A2B4A] mb-2">patternScroll</h3>
              <p className="text-sm text-[#666666] mb-2">Translation quadrillage.</p>
              <pre className="text-xs font-mono bg-white p-3 rounded border border-[#E5E0DA] overflow-x-auto">
{`@keyframes patternScroll {
  0% { transform: translate(0, 0); }
  100% { transform: translate(50px, 50px); }
}
animation: patternScroll 40s linear infinite;`}
              </pre>
            </div>

            {/* Underline Hover */}
            <div className="bg-[#FAF9F7] p-5 rounded-lg">
              <h3 className="text-lg font-semibold text-[#1A2B4A] mb-2">underlineHover</h3>
              <p className="text-sm text-[#666666] mb-2">Soulignement animé.</p>
              <pre className="text-xs font-mono bg-white p-3 rounded border border-[#E5E0DA] overflow-x-auto">
{`::after {
  transform: scaleX(0);
  transform-origin: right;
}
:hover::after {
  transform: scaleX(1);
  transform-origin: left;
}`}
              </pre>
            </div>
          </div>

          {/* Accessibilité */}
          <div className="mt-8 bg-[#FAF9F7] p-5 rounded-lg">
            <h3 className="text-lg font-semibold text-[#1A2B4A] mb-2">Accessibilité — Reduced Motion</h3>
            <pre className="text-xs font-mono bg-white p-3 rounded border border-[#E5E0DA] overflow-x-auto">
{`@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}`}
            </pre>
          </div>
        </section>

        {/* ========== PAGE 11: APPLICATIONS ========== */}
        <section className="min-h-screen p-12 bg-white print:break-after-page">
          <h2 className="text-3xl font-semibold text-[#1A2B4A] mb-2">
            09. Applications
          </h2>
          <LogoArc size="md" className="mb-8" />

          {/* Signature email */}
          <div className="mb-12">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Signature Email</h3>
            <div className="bg-[#FAF9F7] p-6 rounded-lg inline-block">
              <p className="font-semibold text-[#1A2B4A]">Nicolas Lara Queralta</p>
              <p className="text-sm text-[#666666]">Fondateur</p>
              <img src="/logos/iarche-main.svg" alt="IArche" className="h-6 mt-2" />
              <p className="text-xs text-[#666666] mt-1">nlq@iarche.fr · Bayonne, France</p>
              <p className="text-xs text-[#B04A32] mt-1">L'IA se construit avec vous</p>
            </div>
            <p className="text-sm text-[#666666] mt-2">Export: 600 × 200px PNG via /admin/medias/signature</p>
          </div>

          {/* Carte de visite */}
          <div className="mb-12">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Carte de Visite</h3>
            <div className="flex gap-8">
              <div className="w-80 h-48 bg-[#FAF9F7] rounded-lg p-6 flex flex-col justify-between border border-[#E5E0DA]">
                <img src="/logos/iarche-main.svg" alt="IArche" className="h-8" />
                <div>
                  <p className="font-semibold text-[#1A2B4A]">Nicolas Lara Queralta</p>
                  <p className="text-xs text-[#666666]">Fondateur</p>
                </div>
              </div>
              <div className="w-80 h-48 bg-[#1A2B4A] rounded-lg p-6 flex flex-col justify-between">
                <div></div>
                <div className="text-right">
                  <p className="text-white text-sm">nlq@iarche.fr</p>
                  <p className="text-white/70 text-xs">Bayonne · France</p>
                  <p className="text-[#B04A32] text-xs mt-2">L'IA se construit avec vous</p>
                </div>
              </div>
            </div>
          </div>

          {/* Module Médias */}
          <div className="mb-12">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Module Admin Médias</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-[#FAF9F7] p-4 rounded-lg">
                <h4 className="font-semibold text-[#1A2B4A] mb-2">Éditeurs PNG</h4>
                <ul className="text-[#666666] space-y-1">
                  <li>• PostEditor (1080×1080)</li>
                  <li>• BannerEditor (1584×396)</li>
                  <li>• StoryEditor (1080×1920)</li>
                  <li>• ThumbnailEditor (1280×720)</li>
                  <li>• OpenGraphEditor (1200×630)</li>
                  <li>• SignatureEditor (600×200)</li>
                  <li>• LogoEditor (multi-formats)</li>
                </ul>
              </div>
              <div className="bg-[#FAF9F7] p-4 rounded-lg">
                <h4 className="font-semibold text-[#1A2B4A] mb-2">Éditeurs PDF</h4>
                <ul className="text-[#666666] space-y-1">
                  <li>• CarouselPDF (4:5)</li>
                  <li>• PresentationPDF (16:9)</li>
                  <li>• CharteEditor (A4)</li>
                  <li>• HeaderDocEditor (A4)</li>
                  <li>• QRCodeEditor</li>
                  <li>• FaviconEditor</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Coordonnées */}
          <div>
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Coordonnées Officielles</h3>
            <div className="bg-[#FAF9F7] p-6 rounded-lg">
              <p className="text-[#1A2B4A]"><strong>Baseline:</strong> L'IA se construit avec vous</p>
              <p className="text-[#1A2B4A]"><strong>Email:</strong> nlq@iarche.fr</p>
              <p className="text-[#1A2B4A]"><strong>Localisation:</strong> Bayonne · France</p>
              <p className="text-[#1A2B4A]"><strong>Site:</strong> iarche.fr</p>
            </div>
          </div>
        </section>

        {/* ========== PAGE 12: USAGES & RÈGLES ========== */}
        <section className="min-h-screen p-12 bg-white">
          <h2 className="text-3xl font-semibold text-[#1A2B4A] mb-2">
            10. Usages & Règles
          </h2>
          <LogoArc size="md" className="mb-8" />

          <div className="grid grid-cols-2 gap-8 mb-12">
            {/* À faire */}
            <div className="bg-[#E8F5E9] p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-[#2E7D32] mb-4">✓ À faire</h3>
              <ul className="space-y-2 text-[#1A2B4A]">
                <li>• Utiliser exclusivement les couleurs de la palette</li>
                <li>• Respecter les zones de protection du logo</li>
                <li>• Maintenir des contrastes WCAG AA minimum</li>
                <li>• Utiliser les tokens CSS (--primary, --accent...)</li>
                <li>• Appliquer focus-visible avec ring-accent</li>
                <li>• Respecter la hiérarchie typographique</li>
                <li>• Utiliser l'arc décoratif sous les titres uniquement</li>
                <li>• Inclure prefers-reduced-motion</li>
              </ul>
            </div>

            {/* À éviter */}
            <div className="bg-[#FFEBEE] p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-[#C62828] mb-4">✗ À éviter</h3>
              <ul className="space-y-2 text-[#1A2B4A]">
                <li>• Modifier les couleurs du logo ou de l'arc</li>
                <li>• Utiliser des fonds trop chargés</li>
                <li>• Hardcoder des valeurs HEX</li>
                <li>• Réduire le logo sous 100px de large</li>
                <li>• Déformer ou pivoter le logo / l'arc</li>
                <li>• Ajouter des ombres portées</li>
                <li>• Utiliser d'autres polices que Manrope</li>
                <li>• Placer l'arc sous le logo (réservé aux titres)</li>
              </ul>
            </div>
          </div>

          {/* Tokens référence */}
          <div className="bg-[#FAF9F7] p-6 rounded-lg">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Tokens CSS Référence</h3>
            <div className="grid grid-cols-3 gap-4 font-mono text-xs">
              <div>
                <p className="font-semibold text-[#1A2B4A] mb-2">Couleurs</p>
                <p className="text-[#666666]">--primary: 218 47% 20%</p>
                <p className="text-[#666666]">--accent: 12 60% 53%</p>
                <p className="text-[#666666]">--background: 30 14% 98%</p>
                <p className="text-[#666666]">--foreground: 218 47% 20%</p>
                <p className="text-[#666666]">--muted-foreground: 0 0% 40%</p>
              </div>
              <div>
                <p className="font-semibold text-[#1A2B4A] mb-2">Surfaces</p>
                <p className="text-[#666666]">--secondary: 30 20% 93%</p>
                <p className="text-[#666666]">--border: 30 16% 88%</p>
                <p className="text-[#666666]">--ring: 12 60% 53%</p>
                <p className="text-[#666666]">--card: 30 14% 98%</p>
              </div>
              <div>
                <p className="font-semibold text-[#1A2B4A] mb-2">Utilitaires</p>
                <p className="text-[#666666]">--radius: 0.5rem</p>
                <p className="text-[#666666]">--success: 153 34% 36%</p>
                <p className="text-[#666666]">--text-subtle: 0 0% 40%</p>
              </div>
            </div>
          </div>
        </section>

        {/* ========== FOOTER ========== */}
        <footer className="p-8 bg-[#1A2B4A] text-white text-center print:break-before-avoid">
          <img src="/logos/iarche-white.svg" alt="IArche" className="h-8 mx-auto mb-4" />
          <p className="text-sm text-white/70">Charte Graphique Complète v4.0 — Document confidentiel</p>
          <p className="text-xs text-white/50 mt-4">© 2025 IArche · Tous droits réservés</p>
          <p className="text-xs text-white/30 mt-2">Mise à jour : Décembre 2025</p>
        </footer>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print\\:break-after-page {
            break-after: page;
          }
          .print\\:break-before-avoid {
            break-before: avoid;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default CharteGraphique;
