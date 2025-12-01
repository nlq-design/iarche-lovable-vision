import React, { useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Download, Printer } from 'lucide-react';
import GradientButton from '@/components/ui/GradientButton';

const CharteGraphique = () => {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const colors = [
    { name: 'Bleu Nuit', variable: '--primary', hsl: '218 47% 20%', hex: '#1A2B4A', usage: 'Titres, texte principal, CTA primaire' },
    { name: 'Terracotta', variable: '--accent', hsl: '12 60% 53%', hex: '#D15A3E', usage: 'Accents, CTA secondaire, focus' },
    { name: 'Blanc Cassé', variable: '--background', hsl: '30 14% 98%', hex: '#FAF9F7', usage: 'Fond principal' },
    { name: 'Gris Sable', variable: '--secondary', hsl: '30 20% 93%', hex: '#F0EDE8', usage: 'Surfaces secondaires' },
    { name: 'Bordure', variable: '--border', hsl: '30 16% 88%', hex: '#E5E0DA', usage: 'Bordures, séparateurs' },
    { name: 'Texte Muted', variable: '--muted-foreground', hsl: '0 0% 40%', hex: '#666666', usage: 'Texte secondaire' },
    { name: 'Vert Sauge', variable: '--success', hsl: '153 34% 36%', hex: '#3D7A5C', usage: 'Succès, validation' },
  ];

  return (
    <>
      <Helmet>
        <title>Charte Graphique | IArche</title>
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
            <h1 className="text-7xl font-semibold mb-4 hero-gradient-text">IArche</h1>
            <p className="text-2xl text-[#666666] mb-2">Charte Graphique</p>
            <p className="text-lg text-[#999999]">Version 1.0 — Décembre 2025</p>
          </div>
          <div className="absolute bottom-12 text-center">
            <p className="text-sm text-[#999999]">L'IA se construit avec vous</p>
            <p className="text-xs text-[#CCCCCC] mt-2">Bayonne · France · nlq@iarche.fr</p>
          </div>
        </section>

        {/* ========== PAGE 2: LOGO ========== */}
        <section className="min-h-screen p-12 bg-white print:break-after-page">
          <h2 className="text-3xl font-semibold text-[#1A2B4A] mb-8 border-b-2 border-[#D15A3E] pb-4">
            01. Logo
          </h2>

          {/* Logo Principal */}
          <div className="mb-12">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Logo Principal — Gradient Animé</h3>
            <div className="bg-[#FAF9F7] p-12 rounded-lg flex items-center justify-center mb-4">
              <span className="text-6xl font-semibold hero-gradient-text">IArche</span>
            </div>
            <p className="text-sm text-[#666666]">
              Le logo principal utilise un gradient animé alternant entre Bleu Nuit et Terracotta.
              Animation: 8 secondes, direction 270°, boucle infinie.
            </p>
          </div>

          {/* Variantes */}
          <div className="grid grid-cols-3 gap-6 mb-12">
            <div>
              <h4 className="text-sm font-medium text-[#1A2B4A] mb-2">Bleu Nuit (Dark)</h4>
              <div className="bg-[#FAF9F7] p-8 rounded-lg flex items-center justify-center">
                <span className="text-4xl font-semibold text-[#1A2B4A]">IArche</span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-[#1A2B4A] mb-2">Blanc (Light)</h4>
              <div className="bg-[#1A2B4A] p-8 rounded-lg flex items-center justify-center">
                <span className="text-4xl font-semibold text-white">IArche</span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-[#1A2B4A] mb-2">Gradient Statique</h4>
              <div className="bg-[#FAF9F7] p-8 rounded-lg flex items-center justify-center">
                <span className="text-4xl font-semibold" style={{
                  background: 'linear-gradient(90deg, #1A2B4A 0%, #1A2B4A 65%, #D15A3E 65%, #D15A3E 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>IArche</span>
              </div>
            </div>
          </div>

          {/* Zones de protection */}
          <div className="mb-8">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Zones de Protection</h3>
            <div className="bg-[#FAF9F7] p-8 rounded-lg inline-block">
              <div className="border-2 border-dashed border-[#D15A3E] p-8">
                <span className="text-4xl font-semibold text-[#1A2B4A]">IArche</span>
              </div>
            </div>
            <p className="text-sm text-[#666666] mt-2">
              Espace minimum autour du logo: hauteur du "I" majuscule.
            </p>
          </div>

          {/* Interdictions */}
          <div>
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Usages Interdits</h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-[#FEE] rounded-lg">
                <span className="text-2xl font-semibold text-[#1A2B4A] opacity-50">IArche</span>
                <p className="text-xs text-red-600 mt-2">❌ Opacité réduite</p>
              </div>
              <div className="p-4 bg-[#FEE] rounded-lg">
                <span className="text-2xl font-semibold text-[#FF0000]">IArche</span>
                <p className="text-xs text-red-600 mt-2">❌ Couleurs non-charte</p>
              </div>
              <div className="p-4 bg-[#FEE] rounded-lg">
                <span className="text-2xl font-semibold text-[#1A2B4A]" style={{ transform: 'scaleX(1.5)', display: 'inline-block' }}>IArche</span>
                <p className="text-xs text-red-600 mt-2">❌ Déformation</p>
              </div>
              <div className="p-4 bg-[#FEE] rounded-lg">
                <span className="text-2xl text-[#1A2B4A]" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>IArche</span>
                <p className="text-xs text-red-600 mt-2">❌ Ombres portées</p>
              </div>
            </div>
          </div>
        </section>

        {/* ========== PAGE 3: COULEURS ========== */}
        <section className="min-h-screen p-12 bg-white print:break-after-page">
          <h2 className="text-3xl font-semibold text-[#1A2B4A] mb-8 border-b-2 border-[#D15A3E] pb-4">
            02. Palette de Couleurs
          </h2>

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
              <div className="h-40 rounded-t-lg" style={{ backgroundColor: '#D15A3E' }}></div>
              <div className="bg-[#FAF9F7] p-4 rounded-b-lg">
                <h4 className="font-semibold text-[#1A2B4A]">Terracotta</h4>
                <p className="text-xs text-[#666666] font-mono mt-1">HEX: #D15A3E</p>
                <p className="text-xs text-[#666666] font-mono">HSL: 12 60% 53%</p>
                <p className="text-xs text-[#666666] font-mono">RGB: 209, 90, 62</p>
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
                  <p className="text-[#999999]">{color.variable}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========== PAGE 4: TYPOGRAPHIE ========== */}
        <section className="min-h-screen p-12 bg-white print:break-after-page">
          <h2 className="text-3xl font-semibold text-[#1A2B4A] mb-8 border-b-2 border-[#D15A3E] pb-4">
            03. Typographie
          </h2>

          {/* Police principale */}
          <div className="mb-12">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Police Principale: Manrope</h3>
            <div className="bg-[#FAF9F7] p-8 rounded-lg">
              <p className="text-6xl font-light text-[#1A2B4A] mb-2">Aa</p>
              <p className="text-2xl text-[#1A2B4A]">ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
              <p className="text-2xl text-[#1A2B4A]">abcdefghijklmnopqrstuvwxyz</p>
              <p className="text-2xl text-[#1A2B4A]">0123456789 !@#$%&*()</p>
            </div>
          </div>

          {/* Poids */}
          <div className="mb-12">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Poids Utilisés</h3>
            <div className="space-y-4">
              <div className="flex items-baseline gap-8">
                <span className="w-24 text-sm text-[#666666]">Light (300)</span>
                <span className="text-3xl font-light text-[#1A2B4A]">L'IA se construit avec vous</span>
              </div>
              <div className="flex items-baseline gap-8">
                <span className="w-24 text-sm text-[#666666]">Regular (400)</span>
                <span className="text-3xl font-normal text-[#1A2B4A]">L'IA se construit avec vous</span>
              </div>
              <div className="flex items-baseline gap-8">
                <span className="w-24 text-sm text-[#666666]">Medium (500)</span>
                <span className="text-3xl font-medium text-[#1A2B4A]">L'IA se construit avec vous</span>
              </div>
              <div className="flex items-baseline gap-8">
                <span className="w-24 text-sm text-[#666666]">Semibold (600)</span>
                <span className="text-3xl font-semibold text-[#1A2B4A]">L'IA se construit avec vous</span>
              </div>
              <div className="flex items-baseline gap-8">
                <span className="w-24 text-sm text-[#666666]">Bold (700)</span>
                <span className="text-3xl font-bold text-[#1A2B4A]">L'IA se construit avec vous</span>
              </div>
            </div>
          </div>

          {/* Hiérarchie */}
          <div>
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Hiérarchie Typographique</h3>
            <div className="space-y-6 bg-[#FAF9F7] p-8 rounded-lg">
              <div>
                <span className="text-xs text-[#D15A3E] font-mono">H1 — 4.5rem / 72px / font-semibold</span>
                <h1 className="text-7xl font-semibold text-[#1A2B4A]">Titre Principal</h1>
              </div>
              <div>
                <span className="text-xs text-[#D15A3E] font-mono">H2 — 2.25rem / 36px / font-semibold</span>
                <h2 className="text-4xl font-semibold text-[#1A2B4A]">Titre de Section</h2>
              </div>
              <div>
                <span className="text-xs text-[#D15A3E] font-mono">H3 — 1.5rem / 24px / font-semibold</span>
                <h3 className="text-2xl font-semibold text-[#1A2B4A]">Sous-titre</h3>
              </div>
              <div>
                <span className="text-xs text-[#D15A3E] font-mono">Body — 1rem / 16px / font-normal</span>
                <p className="text-base text-[#1A2B4A]">Corps de texte standard pour le contenu principal des pages.</p>
              </div>
              <div>
                <span className="text-xs text-[#D15A3E] font-mono">Small — 0.875rem / 14px / text-muted-foreground</span>
                <p className="text-sm text-[#666666]">Texte secondaire, légendes et annotations.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ========== PAGE 5: ÉLÉMENTS VISUELS ========== */}
        <section className="min-h-screen p-12 bg-white print:break-after-page">
          <h2 className="text-3xl font-semibold text-[#1A2B4A] mb-8 border-b-2 border-[#D15A3E] pb-4">
            04. Éléments Visuels
          </h2>

          {/* Lignes SVG */}
          <div className="mb-12">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Lignes SVG Animées (Arche)</h3>
            <div className="bg-[#FAF9F7] p-8 rounded-lg relative h-48">
              <svg className="absolute w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="lineGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1A2B4A" />
                    <stop offset="100%" stopColor="#D15A3E" />
                  </linearGradient>
                  <linearGradient id="lineGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#D15A3E" />
                    <stop offset="100%" stopColor="#1A2B4A" />
                  </linearGradient>
                </defs>
                <path d="M0 20 L150 20 L150 80 L0 80" fill="none" stroke="url(#lineGrad1)" strokeWidth="2" opacity="0.5" />
                <path d="M400 20 L250 20 L250 80 L400 80" fill="none" stroke="url(#lineGrad2)" strokeWidth="2" opacity="0.5" />
              </svg>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="bg-[#FAF9F7] p-4 rounded">
                <p className="font-mono text-xs text-[#666666]">Ligne 1: Bleu Nuit → Terracotta</p>
                <p className="font-mono text-xs text-[#666666]">stroke-width: 2px, opacity: 0.5</p>
              </div>
              <div className="bg-[#FAF9F7] p-4 rounded">
                <p className="font-mono text-xs text-[#666666]">Ligne 2: Terracotta → Bleu Nuit</p>
                <p className="font-mono text-xs text-[#666666]">Animation: 6s ease-in-out</p>
              </div>
            </div>
          </div>

          {/* Quadrillage */}
          <div className="mb-12">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Fond Quadrillé Animé</h3>
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
              Opacités: 20% et 10%.
            </p>
          </div>

          {/* Rectangles décoratifs */}
          <div>
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Rectangles Décoratifs</h3>
            <div className="relative h-48 bg-[#FAF9F7] rounded-lg">
              <div className="absolute top-4 left-4 w-16 h-16 border border-[#E5E0DA] rounded-lg opacity-40"></div>
              <div className="absolute bottom-8 right-8 w-12 h-12 border border-[#E5E0DA] rounded-lg opacity-50"></div>
              <div className="absolute top-1/2 right-4 w-20 h-20 border border-[#E5E0DA] rounded-lg opacity-30"></div>
              <div className="absolute bottom-4 left-1/4 w-14 h-14 border border-[#E5E0DA] rounded-lg opacity-60"></div>
            </div>
            <p className="text-sm text-[#666666] mt-2">
              Bordure: 1px solid border/30. Animation: pulsation 6s (opacité 30% → 60%).
              Délais échelonnés: 0s, 1s, 2s, 3s.
            </p>
          </div>
        </section>

        {/* ========== PAGE 6: BOUTONS & CTA ========== */}
        <section className="min-h-screen p-12 bg-white print:break-after-page">
          <h2 className="text-3xl font-semibold text-[#1A2B4A] mb-8 border-b-2 border-[#D15A3E] pb-4">
            05. Boutons & CTA
          </h2>

          {/* Bouton Primary */}
          <div className="mb-12">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">GradientButton — Primary</h3>
            <div className="flex gap-8 items-center mb-4">
              <button className="px-6 py-3 text-white font-medium rounded-lg" style={{
                background: 'linear-gradient(to right, #1A2B4A, #D15A3E)',
                backgroundSize: '200% 100%',
              }}>
                Nous contacter
              </button>
              <button className="px-6 py-3 text-white font-medium rounded-lg opacity-50 cursor-not-allowed" style={{
                background: 'linear-gradient(to right, #1A2B4A, #D15A3E)',
              }}>
                Disabled
              </button>
            </div>
            <p className="text-sm text-[#666666] font-mono">
              background: linear-gradient(to right, #1A2B4A, #D15A3E);<br/>
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
                background: 'linear-gradient(to right, #1A2B4A, #D15A3E)',
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
              Texte avec gradient animé (8s). Soulignement animé au hover (scale-x 0 → 1).
            </p>
          </div>

          {/* IArcheLink */}
          <div>
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">IArcheLink — Secondaire</h3>
            <div className="flex gap-8 items-center mb-4 bg-[#FAF9F7] p-8 rounded-lg">
              <span className="text-sm font-medium text-[#1A2B4A] inline-flex items-center gap-2">
                En savoir plus <span className="text-[#D15A3E]">→</span>
              </span>
            </div>
            <p className="text-sm text-[#666666]">
              Texte Bleu Nuit + flèche Terracotta. Gap augmente au hover (2 → 3).
            </p>
          </div>
        </section>

        {/* ========== PAGE 7: ANIMATIONS ========== */}
        <section className="min-h-screen p-12 bg-white print:break-after-page">
          <h2 className="text-3xl font-semibold text-[#1A2B4A] mb-8 border-b-2 border-[#D15A3E] pb-4">
            06. Animations
          </h2>

          <div className="space-y-8">
            {/* FadeIn */}
            <div className="bg-[#FAF9F7] p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-[#1A2B4A] mb-2">fadeIn</h3>
              <p className="text-sm text-[#666666] mb-2">Apparition progressive avec légère translation verticale.</p>
              <pre className="text-xs font-mono bg-white p-4 rounded border border-[#E5E0DA] overflow-x-auto">
{`@keyframes fadeIn {
  0% { opacity: 0; visibility: hidden; }
  1% { visibility: visible; }
  100% { opacity: 1; visibility: visible; }
}
animation: fadeIn 0.6s ease-out forwards;`}
              </pre>
            </div>

            {/* GradientText */}
            <div className="bg-[#FAF9F7] p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-[#1A2B4A] mb-2">gradientText</h3>
              <p className="text-sm text-[#666666] mb-2">Animation du gradient sur le texte (logo, titres).</p>
              <pre className="text-xs font-mono bg-white p-4 rounded border border-[#E5E0DA] overflow-x-auto">
{`@keyframes gradientText {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
animation: gradientText 8s ease infinite;
background-size: 600% 600%;`}
              </pre>
            </div>

            {/* PatternScroll */}
            <div className="bg-[#FAF9F7] p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-[#1A2B4A] mb-2">patternScroll</h3>
              <p className="text-sm text-[#666666] mb-2">Translation continue du quadrillage diagonal.</p>
              <pre className="text-xs font-mono bg-white p-4 rounded border border-[#E5E0DA] overflow-x-auto">
{`@keyframes patternScroll {
  0% { transform: translate(0, 0); }
  100% { transform: translate(50px, 50px); }
}
animation: patternScroll 40s linear infinite;`}
              </pre>
            </div>

            {/* ConstructionFade */}
            <div className="bg-[#FAF9F7] p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-[#1A2B4A] mb-2">constructionFade</h3>
              <p className="text-sm text-[#666666] mb-2">Pulsation des rectangles décoratifs.</p>
              <pre className="text-xs font-mono bg-white p-4 rounded border border-[#E5E0DA] overflow-x-auto">
{`@keyframes constructionFade {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}
animation: constructionFade 6s ease-in-out infinite;`}
              </pre>
            </div>

            {/* Line Draw */}
            <div className="bg-[#FAF9F7] p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-[#1A2B4A] mb-2">Line Draw (SVG)</h3>
              <p className="text-sm text-[#666666] mb-2">Animation de tracé progressif des lignes SVG.</p>
              <pre className="text-xs font-mono bg-white p-4 rounded border border-[#E5E0DA] overflow-x-auto">
{`const length = path.getTotalLength();
path.style.strokeDasharray = length + 'px';
path.style.strokeDashoffset = length + 'px';
path.style.transition = 'stroke-dashoffset 6s ease-in-out';
path.style.strokeDashoffset = '0px';`}
              </pre>
            </div>
          </div>
        </section>

        {/* ========== PAGE 8: APPLICATIONS ========== */}
        <section className="min-h-screen p-12 bg-white">
          <h2 className="text-3xl font-semibold text-[#1A2B4A] mb-8 border-b-2 border-[#D15A3E] pb-4">
            07. Applications
          </h2>

          {/* Signature email */}
          <div className="mb-12">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Signature Email</h3>
            <div className="bg-[#FAF9F7] p-6 rounded-lg inline-block">
              <p className="font-semibold text-[#1A2B4A]">Nicolas Laquerrière-Music</p>
              <p className="text-sm text-[#666666]">Fondateur</p>
              <p className="text-sm text-[#1A2B4A] font-medium mt-2">IArche</p>
              <p className="text-xs text-[#666666]">nlq@iarche.fr · Bayonne, France</p>
              <p className="text-xs text-[#D15A3E] mt-1">L'IA se construit avec vous</p>
            </div>
          </div>

          {/* Carte de visite */}
          <div className="mb-12">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Carte de Visite</h3>
            <div className="flex gap-8">
              <div className="w-80 h-48 bg-[#FAF9F7] rounded-lg p-6 flex flex-col justify-between border border-[#E5E0DA]">
                <span className="text-2xl font-semibold hero-gradient-text">IArche</span>
                <div>
                  <p className="font-semibold text-[#1A2B4A]">Nicolas Laquerrière-Music</p>
                  <p className="text-xs text-[#666666]">Fondateur</p>
                </div>
              </div>
              <div className="w-80 h-48 bg-[#1A2B4A] rounded-lg p-6 flex flex-col justify-between">
                <div></div>
                <div className="text-right">
                  <p className="text-white text-sm">nlq@iarche.fr</p>
                  <p className="text-white/70 text-xs">Bayonne · France</p>
                  <p className="text-[#D15A3E] text-xs mt-2">L'IA se construit avec vous</p>
                </div>
              </div>
            </div>
          </div>

          {/* Baseline */}
          <div className="mb-12">
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Baseline</h3>
            <div className="bg-[#FAF9F7] p-8 rounded-lg text-center">
              <p className="text-2xl text-[#666666] italic">"L'IA se construit avec vous"</p>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xl font-medium text-[#1A2B4A] mb-4">Coordonnées</h3>
            <div className="bg-[#FAF9F7] p-6 rounded-lg">
              <p className="text-[#1A2B4A]"><strong>Email:</strong> nlq@iarche.fr</p>
              <p className="text-[#1A2B4A]"><strong>Localisation:</strong> Bayonne · France</p>
              <p className="text-[#1A2B4A]"><strong>Site:</strong> iarche.fr</p>
            </div>
          </div>
        </section>

        {/* ========== FOOTER ========== */}
        <footer className="p-8 bg-[#1A2B4A] text-white text-center print:break-before-avoid">
          <p className="text-xl font-semibold mb-2">IArche</p>
          <p className="text-sm text-white/70">Charte Graphique v1.0 — Document confidentiel</p>
          <p className="text-xs text-white/50 mt-4">© 2025 IArche · Tous droits réservés</p>
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
