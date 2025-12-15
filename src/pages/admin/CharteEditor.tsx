import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { COLORS } from '@/components/admin/medias/shared/tokens';

// Complete color palette
const PALETTE = [
  { name: 'Bleu Nuit', hex: '#1A2B4A', hsl: '218 47% 20%', rgb: '26, 43, 74', usage: 'Couleur principale, titres, navigation' },
  { name: 'Terracotta', hex: '#B04A32', hsl: '12 60% 44%', rgb: '176, 74, 50', usage: 'Accent, CTA, liens, focus ring' },
  { name: 'Blanc Cassé', hex: '#FAF9F7', hsl: '30 14% 98%', rgb: '250, 249, 247', usage: 'Fond principal des pages' },
  { name: 'Gris Sable', hex: '#F0EDE8', hsl: '30 20% 93%', rgb: '240, 237, 232', usage: 'Surfaces secondaires, cartes' },
  { name: 'Bordure', hex: '#E5E0DA', hsl: '30 16% 88%', rgb: '229, 224, 218', usage: 'Bordures, séparateurs' },
  { name: 'Gris Texte', hex: '#4A5568', hsl: '215 14% 35%', rgb: '74, 85, 104', usage: 'Texte courant, descriptions' },
  { name: 'Texte Muted', hex: '#666666', hsl: '0 0% 40%', rgb: '102, 102, 102', usage: 'Texte secondaire' },
  { name: 'Vert Sauge', hex: '#3D7A5C', hsl: '153 34% 36%', rgb: '61, 122, 92', usage: 'Succès, validation' },
];

// Gradients definition
const GRADIENTS = [
  { name: 'Barre décorative', css: 'linear-gradient(90deg, #1A2B4A 0%, #B04A32 100%)', usage: 'Barres horizontales, séparateurs visuels' },
  { name: 'Texte animé (logo)', css: 'linear-gradient(270deg, #1A2B4A 0%, #B04A32 33%, #1A2B4A 66%, #B04A32 100%)', usage: 'Logo IArche, titres héroïques' },
  { name: 'Fond sombre', css: 'linear-gradient(135deg, #1A2B4A 0%, #14203A 100%)', usage: 'Sections sombres, hero backgrounds' },
  { name: 'Barre inversée', css: 'linear-gradient(90deg, #B04A32 0%, #1A2B4A 100%)', usage: 'Variante de barre décorative' },
];

// Spacing scale
const SPACING = [
  { label: 'XS', value: '4px', tailwind: 'p-1', usage: 'Micro-espacements' },
  { label: 'SM', value: '8px', tailwind: 'p-2', usage: 'Espacements internes' },
  { label: 'MD', value: '16px', tailwind: 'p-4', usage: 'Standard' },
  { label: 'LG', value: '24px', tailwind: 'p-6', usage: 'Sections' },
  { label: 'XL', value: '32px', tailwind: 'p-8', usage: 'Grandes séparations' },
  { label: '2XL', value: '48px', tailwind: 'p-12', usage: 'Séparations majeures' },
  { label: '3XL', value: '64px', tailwind: 'p-16', usage: 'Hero sections' },
];

// Bar sizes
const BAR_SIZES = [
  { label: 'SM', width: '48px', height: '2px', usage: 'Petits titres, badges' },
  { label: 'MD', width: '80px', height: '4px', usage: 'Titres standards' },
  { label: 'LG', width: '96px', height: '4px', usage: 'Grands titres' },
  { label: 'XL', value: '128px', height: '6px', usage: 'Hero, couvertures' },
];

// Typography hierarchy
const TYPOGRAPHY = [
  { level: 'H1', size: '72px / 4.5rem', weight: 'Semibold (600)', usage: 'Titre principal' },
  { level: 'H2', size: '36px / 2.25rem', weight: 'Semibold (600)', usage: 'Titre de section' },
  { level: 'H3', size: '24px / 1.5rem', weight: 'Semibold (600)', usage: 'Sous-titre' },
  { level: 'Body', size: '16px / 1rem', weight: 'Regular (400)', usage: 'Corps de texte' },
  { level: 'Small', size: '14px / 0.875rem', weight: 'Regular (400)', usage: 'Texte secondaire' },
  { level: 'Caption', size: '12px / 0.75rem', weight: 'Mono', usage: 'Code, timestamps' },
];

// Animations
const ANIMATIONS = [
  { name: 'fadeIn', duration: '0.6s', timing: 'ease-out', usage: 'Apparition éléments' },
  { name: 'gradientText', duration: '8s', timing: 'ease infinite', usage: 'Logo, titres gradient' },
  { name: 'patternScroll', duration: '40s', timing: 'linear infinite', usage: 'Fond quadrillé' },
];

// PDF Styles
const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', backgroundColor: '#FFFFFF' },
  coverPage: { padding: 0, backgroundColor: '#FAF9F7' },
  coverContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 60 },
  coverLogo: { fontSize: 64, fontWeight: 'bold', color: '#1A2B4A', marginBottom: 16 },
  coverSubtitle: { fontSize: 24, color: '#666666', marginBottom: 8 },
  coverVersion: { fontSize: 14, color: '#999999' },
  coverFooter: { position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center' },
  coverBaseline: { fontSize: 12, color: '#999999' },
  coverContact: { fontSize: 10, color: '#CCCCCC', marginTop: 8 },
  
  pageHeader: { marginBottom: 20, paddingBottom: 12, borderBottomWidth: 3, borderBottomColor: '#B04A32' },
  pageTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A2B4A' },
  pageNumber: { fontSize: 10, color: '#999999', marginTop: 4 },
  
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#1A2B4A', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  
  colorRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'center' },
  colorSwatch: { width: 40, height: 40, borderRadius: 4, marginRight: 12 },
  colorInfo: { flex: 1 },
  colorName: { fontSize: 11, fontWeight: 'bold', color: '#1A2B4A' },
  colorValues: { fontSize: 9, color: '#4A5568', fontFamily: 'Courier' },
  colorUsage: { fontSize: 8, color: '#6B7280', marginTop: 2 },
  
  twoColumn: { flexDirection: 'row', gap: 20 },
  column: { flex: 1 },
  
  gradientBox: { height: 24, borderRadius: 4, marginBottom: 4 },
  gradientName: { fontSize: 10, fontWeight: 'bold', color: '#1A2B4A' },
  gradientUsage: { fontSize: 8, color: '#6B7280', marginBottom: 8 },
  
  spacingRow: { flexDirection: 'row', marginBottom: 4, alignItems: 'center' },
  spacingLabel: { width: 30, fontSize: 10, fontWeight: 'bold', color: '#1A2B4A' },
  spacingValue: { width: 50, fontSize: 9, color: '#4A5568', fontFamily: 'Courier' },
  spacingUsage: { fontSize: 8, color: '#6B7280', flex: 1 },
  
  barRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'center' },
  barLabel: { width: 25, fontSize: 10, fontWeight: 'bold', color: '#1A2B4A' },
  barSwatch: { marginRight: 10, borderRadius: 2 },
  barDimensions: { fontSize: 9, color: '#4A5568', width: 70 },
  barUsage: { fontSize: 8, color: '#6B7280' },
  
  typoRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'center' },
  typoLevel: { width: 50, fontSize: 10, fontWeight: 'bold', color: '#B04A32' },
  typoSize: { width: 100, fontSize: 9, color: '#4A5568', fontFamily: 'Courier' },
  typoWeight: { width: 80, fontSize: 9, color: '#4A5568' },
  typoUsage: { fontSize: 8, color: '#6B7280' },
  
  animRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'center' },
  animName: { width: 90, fontSize: 10, fontWeight: 'bold', color: '#1A2B4A' },
  animDuration: { width: 50, fontSize: 9, color: '#B04A32', fontFamily: 'Courier' },
  animTiming: { width: 90, fontSize: 8, color: '#4A5568' },
  animUsage: { fontSize: 8, color: '#6B7280' },
  
  ctaButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, marginRight: 8 },
  ctaText: { fontSize: 9, fontWeight: 'bold' },
  
  dosRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  dosColumn: { flex: 1, padding: 10, borderRadius: 4 },
  doTitle: { fontSize: 11, fontWeight: 'bold', marginBottom: 6 },
  doItem: { fontSize: 8, color: '#4A5568', marginBottom: 3 },
  
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#E5E0DA', paddingTop: 8 },
  footerText: { fontSize: 7, color: '#9CA3AF' },
  
  tokenRow: { flexDirection: 'row', marginBottom: 3 },
  tokenName: { width: 120, fontSize: 8, color: '#4A5568', fontFamily: 'Courier' },
  tokenValue: { fontSize: 8, color: '#666666', fontFamily: 'Courier' },
});

// Multi-page PDF Document
const CharteCompletePDF = () => (
  <Document>
    {/* Page 1: Cover */}
    <Page size="A4" style={styles.coverPage}>
      <View style={styles.coverContent}>
        <Text style={styles.coverLogo}>IArche</Text>
        <Text style={styles.coverSubtitle}>Charte Graphique Complète</Text>
        <Text style={styles.coverVersion}>Version 3.0 — Décembre 2025</Text>
      </View>
      <View style={styles.coverFooter}>
        <Text style={styles.coverBaseline}>L'IA se construit avec vous</Text>
        <Text style={styles.coverContact}>Bayonne · France · nlq@iarche.fr</Text>
      </View>
    </Page>

    {/* Page 2: Logo & Identité */}
    <Page size="A4" style={styles.page}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>01. Logo & Identité</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Logo Principal</Text>
        <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#1A2B4A', marginBottom: 8 }}>IArche</Text>
        <Text style={{ fontSize: 9, color: '#666666', marginBottom: 16 }}>
          Gradient animé alternant Bleu Nuit ↔ Terracotta. Animation: 8s, direction 270°, boucle infinie.
        </Text>
        
        <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#1A2B4A', marginBottom: 6 }}>Variantes disponibles</Text>
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 80, height: 40, backgroundColor: '#FAF9F7', borderRadius: 4, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E0DA' }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1A2B4A' }}>IArche</Text>
            </View>
            <Text style={{ fontSize: 8, color: '#666666', marginTop: 4 }}>Bleu Nuit</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 80, height: 40, backgroundColor: '#1A2B4A', borderRadius: 4, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' }}>IArche</Text>
            </View>
            <Text style={{ fontSize: 8, color: '#666666', marginTop: 4 }}>Blanc</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 80, height: 40, backgroundColor: '#FAF9F7', borderRadius: 4, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E0DA' }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#B04A32' }}>IArche</Text>
            </View>
            <Text style={{ fontSize: 8, color: '#666666', marginTop: 4 }}>Terracotta</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Barres Décoratives Gradient</Text>
        {BAR_SIZES.map((bar) => (
          <View key={bar.label} style={styles.barRow}>
            <Text style={styles.barLabel}>{bar.label}</Text>
            <View style={[styles.barSwatch, { width: parseInt(bar.width || bar.value) * 0.6, height: parseInt(bar.height), backgroundColor: '#1A2B4A' }]} />
            <Text style={styles.barDimensions}>{bar.width || bar.value} × {bar.height}</Text>
            <Text style={styles.barUsage}>{bar.usage}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Zones de Protection</Text>
        <Text style={{ fontSize: 9, color: '#666666' }}>
          Espace minimum autour du logo: hauteur du "I" majuscule sur chaque côté.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Usages Interdits</Text>
        <Text style={{ fontSize: 9, color: '#666666' }}>
          ❌ Opacité réduite · ❌ Couleurs non-charte · ❌ Déformation · ❌ Ombres portées · ❌ Rotation
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>IArche — Charte Graphique v3.0</Text>
        <Text style={styles.footerText}>Page 2</Text>
      </View>
    </Page>

    {/* Page 3: Couleurs */}
    <Page size="A4" style={styles.page}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>02. Palette de Couleurs</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Couleurs Principales</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          {PALETTE.slice(0, 3).map((color) => (
            <View key={color.hex} style={{ flex: 1 }}>
              <View style={{ height: 60, backgroundColor: color.hex, borderRadius: 4, marginBottom: 6, borderWidth: color.hex === '#FAF9F7' ? 1 : 0, borderColor: '#E5E0DA' }} />
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#1A2B4A' }}>{color.name}</Text>
              <Text style={{ fontSize: 8, color: '#4A5568', fontFamily: 'Courier' }}>{color.hex}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Palette Complète</Text>
        {PALETTE.map((color) => (
          <View key={color.hex} style={styles.colorRow}>
            <View style={[styles.colorSwatch, { backgroundColor: color.hex, borderWidth: color.hex === '#FAF9F7' ? 1 : 0, borderColor: '#E5E0DA' }]} />
            <View style={styles.colorInfo}>
              <Text style={styles.colorName}>{color.name}</Text>
              <Text style={styles.colorValues}>{color.hex} · HSL: {color.hsl} · RGB: {color.rgb}</Text>
              <Text style={styles.colorUsage}>{color.usage}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>IArche — Charte Graphique v3.0</Text>
        <Text style={styles.footerText}>Page 3</Text>
      </View>
    </Page>

    {/* Page 4: Typographie */}
    <Page size="A4" style={styles.page}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>03. Typographie</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Police Principale: Manrope</Text>
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1A2B4A', marginBottom: 4 }}>Aa</Text>
        <Text style={{ fontSize: 12, color: '#1A2B4A', marginBottom: 2 }}>ABCDEFGHIJKLMNOPQRSTUVWXYZ</Text>
        <Text style={{ fontSize: 12, color: '#1A2B4A', marginBottom: 2 }}>abcdefghijklmnopqrstuvwxyz</Text>
        <Text style={{ fontSize: 12, color: '#1A2B4A', marginBottom: 8 }}>0123456789 !@#$%&*()</Text>
        <Text style={{ fontSize: 9, color: '#666666' }}>
          Google Fonts. Chargement: font-display: swap. Poids: 300, 400, 500, 600, 700.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hiérarchie Typographique</Text>
        {TYPOGRAPHY.map((typo) => (
          <View key={typo.level} style={styles.typoRow}>
            <Text style={styles.typoLevel}>{typo.level}</Text>
            <Text style={styles.typoSize}>{typo.size}</Text>
            <Text style={styles.typoWeight}>{typo.weight}</Text>
            <Text style={styles.typoUsage}>{typo.usage}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Poids Utilisés</Text>
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: 300, color: '#1A2B4A' }}>Light (300) — L'IA se construit avec vous</Text>
          <Text style={{ fontSize: 14, color: '#1A2B4A' }}>Regular (400) — L'IA se construit avec vous</Text>
          <Text style={{ fontSize: 14, fontWeight: 500, color: '#1A2B4A' }}>Medium (500) — L'IA se construit avec vous</Text>
          <Text style={{ fontSize: 14, fontWeight: 600, color: '#1A2B4A' }}>Semibold (600) — L'IA se construit avec vous</Text>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1A2B4A' }}>Bold (700) — L'IA se construit avec vous</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>IArche — Charte Graphique v3.0</Text>
        <Text style={styles.footerText}>Page 4</Text>
      </View>
    </Page>

    {/* Page 5: Espacements & Gradients */}
    <Page size="A4" style={styles.page}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>04. Espacements & Gradients</Text>
      </View>
      
      <View style={styles.twoColumn}>
        <View style={styles.column}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Échelle d'Espacements</Text>
            {SPACING.map((item) => (
              <View key={item.label} style={styles.spacingRow}>
                <Text style={styles.spacingLabel}>{item.label}</Text>
                <Text style={styles.spacingValue}>{item.value}</Text>
                <Text style={styles.spacingUsage}>{item.usage}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Border Radius</Text>
            <Text style={{ fontSize: 9, color: '#4A5568', fontFamily: 'Courier' }}>none: 0px · sm: 2px · default: 4px</Text>
            <Text style={{ fontSize: 9, color: '#4A5568', fontFamily: 'Courier' }}>md: 6px · lg: 8px · xl: 12px · full: 50%</Text>
          </View>
        </View>

        <View style={styles.column}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gradients</Text>
            {GRADIENTS.map((gradient, index) => (
              <View key={index} style={{ marginBottom: 10 }}>
                <View style={[styles.gradientBox, { backgroundColor: index % 2 === 0 ? '#1A2B4A' : '#B04A32' }]} />
                <Text style={styles.gradientName}>{gradient.name}</Text>
                <Text style={styles.gradientUsage}>{gradient.usage}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Formats d'Export Médias</Text>
        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#1A2B4A', marginBottom: 4 }}>PNG</Text>
            <Text style={{ fontSize: 8, color: '#4A5568' }}>Post: 1080×1080 · Story: 1080×1920</Text>
            <Text style={{ fontSize: 8, color: '#4A5568' }}>Banner: 1584×396 · OG: 1200×630</Text>
            <Text style={{ fontSize: 8, color: '#4A5568' }}>Thumbnail: 1280×720 · Signature: 600×200</Text>
          </View>
          <View style={styles.column}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#1A2B4A', marginBottom: 4 }}>PDF</Text>
            <Text style={{ fontSize: 8, color: '#4A5568' }}>Présentation: 1920×1080 (16:9)</Text>
            <Text style={{ fontSize: 8, color: '#4A5568' }}>Carousel: 1080×1350 (4:5)</Text>
            <Text style={{ fontSize: 8, color: '#4A5568' }}>Document: A4 (595×842pt)</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>IArche — Charte Graphique v3.0</Text>
        <Text style={styles.footerText}>Page 5</Text>
      </View>
    </Page>

    {/* Page 6: Éléments Visuels */}
    <Page size="A4" style={styles.page}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>05. Éléments Visuels</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lignes SVG Canalisation (Arche)</Text>
        <Text style={{ fontSize: 9, color: '#666666', marginBottom: 8 }}>
          Deux lignes en L formant une arche symétrique avec gradients inverses.
        </Text>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#1A2B4A', marginBottom: 4 }}>Ligne 1 (top-left)</Text>
            <Text style={{ fontSize: 8, color: '#4A5568' }}>Gradient: Bleu Nuit → Terracotta</Text>
            <Text style={{ fontSize: 8, color: '#4A5568' }}>Forme: L inversé</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#1A2B4A', marginBottom: 4 }}>Ligne 2 (bottom-right)</Text>
            <Text style={{ fontSize: 8, color: '#4A5568' }}>Gradient: Terracotta → Bleu Nuit</Text>
            <Text style={{ fontSize: 8, color: '#4A5568' }}>Forme: L normal</Text>
          </View>
        </View>
        <Text style={{ fontSize: 8, color: '#B04A32', marginTop: 6, fontFamily: 'Courier' }}>
          stroke-width: 7px · opacity: 0.6-0.7 · animation: 6s ease-in-out
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fond Quadrillé Animé (Mesh)</Text>
        <Text style={{ fontSize: 9, color: '#666666', marginBottom: 4 }}>
          Deux quadrillages diagonaux (45° et -45°) superposés.
        </Text>
        <Text style={{ fontSize: 8, color: '#4A5568', fontFamily: 'Courier' }}>
          Opacités: 20% et 10% · Espacement: 20px · Animation: 40s linear infinite
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rectangles Décoratifs</Text>
        <Text style={{ fontSize: 9, color: '#666666', marginBottom: 4 }}>
          Rectangles avec bordure subtile et animation de pulsation. Usage: Hero page uniquement.
        </Text>
        <Text style={{ fontSize: 8, color: '#4A5568', fontFamily: 'Courier' }}>
          border: 1px solid border/30 · animation: 6s pulsation (30% → 60%) · délais: 0s, 1s, 2s, 3s
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Animations</Text>
        {ANIMATIONS.map((anim) => (
          <View key={anim.name} style={styles.animRow}>
            <Text style={styles.animName}>{anim.name}</Text>
            <Text style={styles.animDuration}>{anim.duration}</Text>
            <Text style={styles.animTiming}>{anim.timing}</Text>
            <Text style={styles.animUsage}>{anim.usage}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accessibilité</Text>
        <Text style={{ fontSize: 8, color: '#4A5568', fontFamily: 'Courier' }}>
          @media (prefers-reduced-motion: reduce) — Désactive toutes les animations
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>IArche — Charte Graphique v3.0</Text>
        <Text style={styles.footerText}>Page 6</Text>
      </View>
    </Page>

    {/* Page 7: Boutons & CTA */}
    <Page size="A4" style={styles.page}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>06. Boutons & CTA</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GradientButton — Primary</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 6 }}>
          <View style={[styles.ctaButton, { backgroundColor: '#1A2B4A' }]}>
            <Text style={[styles.ctaText, { color: '#FFFFFF' }]}>Nous contacter</Text>
          </View>
          <View style={[styles.ctaButton, { backgroundColor: '#1A2B4A', opacity: 0.5 }]}>
            <Text style={[styles.ctaText, { color: '#FFFFFF' }]}>Disabled</Text>
          </View>
        </View>
        <Text style={{ fontSize: 8, color: '#4A5568', fontFamily: 'Courier' }}>
          background: linear-gradient(to right, #1A2B4A, #B04A32) · Hover: slide left→right
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GradientButton — Outline</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 6 }}>
          <View style={[styles.ctaButton, { borderWidth: 2, borderColor: '#1A2B4A' }]}>
            <Text style={[styles.ctaText, { color: '#1A2B4A' }]}>En savoir plus</Text>
          </View>
          <View style={[styles.ctaButton, { backgroundColor: '#B04A32' }]}>
            <Text style={[styles.ctaText, { color: '#FFFFFF' }]}>Hover State</Text>
          </View>
        </View>
        <Text style={{ fontSize: 8, color: '#4A5568', fontFamily: 'Courier' }}>
          border: 2px solid #1A2B4A · Hover: fond gradient, texte blanc
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GradientLink — Texte Animé</Text>
        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1A2B4A', marginBottom: 4 }}>Découvrir →</Text>
        <Text style={{ fontSize: 8, color: '#4A5568' }}>
          Texte avec gradient animé (8s). Soulignement animé au hover (scale-x 0→1, 300ms).
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>IArcheLink — Secondaire</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Text style={{ fontSize: 12, color: '#1A2B4A' }}>En savoir plus </Text>
          <Text style={{ fontSize: 12, color: '#B04A32' }}>→</Text>
        </View>
        <Text style={{ fontSize: 8, color: '#4A5568' }}>
          Texte Bleu Nuit + flèche Terracotta. Gap augmente au hover (gap-2 → gap-3).
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Focus States</Text>
        <Text style={{ fontSize: 8, color: '#4A5568', fontFamily: 'Courier' }}>
          focus-visible: ring-2 ring-accent (Terracotta) · Pas de outline par défaut
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>IArche — Charte Graphique v3.0</Text>
        <Text style={styles.footerText}>Page 7</Text>
      </View>
    </Page>

    {/* Page 8: Applications & Usages */}
    <Page size="A4" style={styles.page}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>07. Applications & Usages</Text>
      </View>
      
      <View style={styles.twoColumn}>
        <View style={styles.column}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Signature Email</Text>
            <View style={{ backgroundColor: '#FAF9F7', padding: 10, borderRadius: 4 }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#1A2B4A' }}>Nicolas Lara Queralta</Text>
              <Text style={{ fontSize: 8, color: '#666666' }}>Fondateur</Text>
              <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#1A2B4A', marginTop: 4 }}>IArche</Text>
              <Text style={{ fontSize: 7, color: '#666666' }}>nlq@iarche.fr · Bayonne</Text>
              <Text style={{ fontSize: 7, color: '#B04A32', marginTop: 2 }}>L'IA se construit avec vous</Text>
            </View>
            <Text style={{ fontSize: 8, color: '#999999', marginTop: 4 }}>Export: 600×200px</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Coordonnées</Text>
            <Text style={{ fontSize: 9, color: '#1A2B4A' }}>Baseline: L'IA se construit avec vous</Text>
            <Text style={{ fontSize: 9, color: '#1A2B4A' }}>Email: nlq@iarche.fr</Text>
            <Text style={{ fontSize: 9, color: '#1A2B4A' }}>Lieu: Bayonne · France</Text>
            <Text style={{ fontSize: 9, color: '#1A2B4A' }}>Site: iarche.fr</Text>
          </View>
        </View>

        <View style={styles.column}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Module Admin Médias</Text>
            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#1A2B4A', marginBottom: 4 }}>Éditeurs PNG</Text>
            <Text style={{ fontSize: 8, color: '#4A5568' }}>PostEditor · BannerEditor · StoryEditor</Text>
            <Text style={{ fontSize: 8, color: '#4A5568' }}>ThumbnailEditor · OpenGraphEditor</Text>
            <Text style={{ fontSize: 8, color: '#4A5568', marginBottom: 6 }}>SignatureEditor · LogoEditor</Text>
            
            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#1A2B4A', marginBottom: 4 }}>Éditeurs PDF</Text>
            <Text style={{ fontSize: 8, color: '#4A5568' }}>CarouselPDF · PresentationPDF</Text>
            <Text style={{ fontSize: 8, color: '#4A5568' }}>CharteEditor · HeaderDocEditor</Text>
            <Text style={{ fontSize: 8, color: '#4A5568' }}>QRCodeEditor · FaviconEditor</Text>
          </View>
        </View>
      </View>

      <View style={styles.dosRow}>
        <View style={[styles.dosColumn, { backgroundColor: '#E8F5E9' }]}>
          <Text style={[styles.doTitle, { color: '#2E7D32' }]}>✓ À faire</Text>
          <Text style={styles.doItem}>• Utiliser les tokens CSS (--primary, --accent...)</Text>
          <Text style={styles.doItem}>• Respecter les zones de protection du logo</Text>
          <Text style={styles.doItem}>• Maintenir contrastes WCAG AA</Text>
          <Text style={styles.doItem}>• Focus-visible avec ring-accent</Text>
          <Text style={styles.doItem}>• Export haute résolution (pixelRatio: 3)</Text>
          <Text style={styles.doItem}>• Inclure prefers-reduced-motion</Text>
        </View>
        <View style={[styles.dosColumn, { backgroundColor: '#FFEBEE' }]}>
          <Text style={[styles.doTitle, { color: '#C62828' }]}>✗ À éviter</Text>
          <Text style={styles.doItem}>• Modifier les couleurs du logo</Text>
          <Text style={styles.doItem}>• Hardcoder des valeurs HEX</Text>
          <Text style={styles.doItem}>• Réduire le logo sous 100px</Text>
          <Text style={styles.doItem}>• Déformer ou pivoter le logo</Text>
          <Text style={styles.doItem}>• Ajouter des ombres portées</Text>
          <Text style={styles.doItem}>• Utiliser d'autres polices que Manrope</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tokens CSS Référence</Text>
        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <View style={styles.tokenRow}>
              <Text style={styles.tokenName}>--primary</Text>
              <Text style={styles.tokenValue}>218 47% 20%</Text>
            </View>
            <View style={styles.tokenRow}>
              <Text style={styles.tokenName}>--accent</Text>
              <Text style={styles.tokenValue}>12 60% 53%</Text>
            </View>
            <View style={styles.tokenRow}>
              <Text style={styles.tokenName}>--background</Text>
              <Text style={styles.tokenValue}>30 14% 98%</Text>
            </View>
          </View>
          <View style={styles.column}>
            <View style={styles.tokenRow}>
              <Text style={styles.tokenName}>--ring</Text>
              <Text style={styles.tokenValue}>12 60% 53%</Text>
            </View>
            <View style={styles.tokenRow}>
              <Text style={styles.tokenName}>--border</Text>
              <Text style={styles.tokenValue}>30 16% 88%</Text>
            </View>
            <View style={styles.tokenRow}>
              <Text style={styles.tokenName}>--radius</Text>
              <Text style={styles.tokenValue}>0.5rem</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>IArche — Charte Graphique v3.0 — Décembre 2025</Text>
        <Text style={styles.footerText}>Page 8</Text>
      </View>
    </Page>
  </Document>
);

export default function CharteEditor() {
  const navigate = useNavigate();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await pdf(<CharteCompletePDF />).toBlob();
      saveAs(blob, 'charte-graphique-complete-iarche-v3.pdf');
      toast.success('Charte graphique complète (8 pages) téléchargée');
    } catch (error) {
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/medias')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Charte Graphique PDF</h1>
              <p className="text-muted-foreground">Document complet 8 pages auto-généré v3.0</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.open('/charte-graphique', '_blank')} className="gap-2">
              <FileText className="h-4 w-4" />
              Voir en ligne
            </Button>
            <Button onClick={handleExport} disabled={isExporting} className="gap-2">
              <Download className="h-4 w-4" />
              Télécharger PDF (8 pages)
            </Button>
          </div>
        </div>

        {/* Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colors Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Palette de couleurs</CardTitle>
              <CardDescription>{PALETTE.length} couleurs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {PALETTE.slice(0, 5).map((color) => (
                <div key={color.hex} className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded border shadow-sm flex-shrink-0"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{color.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">{color.hex}</p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">+ {PALETTE.length - 5} autres...</p>
            </CardContent>
          </Card>

          {/* Gradients Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Gradients</CardTitle>
              <CardDescription>{GRADIENTS.length} dégradés</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {GRADIENTS.map((gradient, index) => (
                <div key={index} className="space-y-1">
                  <p className="text-sm font-medium">{gradient.name}</p>
                  <div className="h-5 rounded" style={{ background: gradient.css }} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Typography Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Typographie</CardTitle>
              <CardDescription>Manrope · 5 poids</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {TYPOGRAPHY.slice(0, 5).map((typo) => (
                <div key={typo.level} className="flex items-center gap-2">
                  <span className="w-12 text-xs font-mono text-accent">{typo.level}</span>
                  <span className="text-xs text-muted-foreground">{typo.size}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Bar Sizes Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Barres Décoratives</CardTitle>
              <CardDescription>4 tailles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {BAR_SIZES.map((bar) => (
                <div key={bar.label} className="flex items-center gap-3">
                  <span className="w-8 text-xs font-mono font-semibold">{bar.label}</span>
                  <div 
                    className="rounded-full"
                    style={{ 
                      width: bar.width || bar.value, 
                      height: bar.height,
                      background: 'linear-gradient(90deg, #1A2B4A 0%, #B04A32 100%)'
                    }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Animations Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Animations</CardTitle>
              <CardDescription>{ANIMATIONS.length} animations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {ANIMATIONS.map((anim) => (
                <div key={anim.name} className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-primary">{anim.name}</span>
                  <span className="text-xs text-muted-foreground">{anim.duration}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* CTAs Preview */}
          <Card>
            <CardHeader>
              <CardTitle>CTAs</CardTitle>
              <CardDescription>Boutons et liens</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button 
                  className="px-3 py-1.5 rounded text-xs font-medium text-white"
                  style={{ backgroundColor: COLORS.bleuNuit }}
                >
                  Primaire
                </button>
                <button 
                  className="px-3 py-1.5 rounded text-xs font-medium border-2"
                  style={{ borderColor: COLORS.terracotta, color: COLORS.terracotta }}
                >
                  Secondaire
                </button>
              </div>
              <p className="text-sm hero-gradient-text font-medium">Découvrir →</p>
            </CardContent>
          </Card>
        </div>

        {/* Usage Rules */}
        <div className="grid grid-cols-2 gap-6">
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <CardTitle className="text-green-700">✓ À faire</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm text-green-800">
                <li>• Utiliser les tokens CSS</li>
                <li>• Respecter les contrastes WCAG AA</li>
                <li>• Focus-visible avec ring-accent</li>
                <li>• Export haute résolution (pixelRatio: 3)</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50">
            <CardHeader>
              <CardTitle className="text-red-700">✗ À éviter</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm text-red-800">
                <li>• Modifier les couleurs du logo</li>
                <li>• Hardcoder des valeurs HEX</li>
                <li>• Réduire le logo sous 100px</li>
                <li>• Ajouter des ombres portées</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
