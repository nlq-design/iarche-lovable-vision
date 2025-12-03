import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
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
  { name: 'Bleu Nuit', hex: '#1A2B4A', hsl: '218 47% 20%', usage: 'Couleur principale, titres, navigation' },
  { name: 'Terracotta', hex: '#D15A3E', hsl: '12 60% 53%', usage: 'Accent, CTA, liens, focus ring' },
  { name: 'Blanc Cassé', hex: '#FAF9F7', hsl: '30 14% 98%', usage: 'Fond principal des pages' },
  { name: 'Gris Sable', hex: '#F0EDE8', hsl: '30 20% 93%', usage: 'Surfaces secondaires, cartes' },
  { name: 'Bordure', hex: '#E5E0DA', hsl: '30 16% 88%', usage: 'Bordures, séparateurs' },
  { name: 'Gris Texte', hex: '#4A5568', hsl: '215 14% 35%', usage: 'Texte courant, descriptions' },
  { name: 'Texte Muted', hex: '#666666', hsl: '0 0% 40%', usage: 'Texte secondaire' },
  { name: 'Vert Sauge', hex: '#3D7A5C', hsl: '153 34% 36%', usage: 'Succès, validation' },
];

// Gradients definition
const GRADIENTS = [
  { 
    name: 'Barre décorative', 
    css: 'linear-gradient(90deg, #1A2B4A 0%, #D15A3E 100%)',
    usage: 'Barres horizontales, séparateurs visuels'
  },
  { 
    name: 'Texte animé (logo)', 
    css: 'linear-gradient(270deg, #1A2B4A 0%, #D15A3E 33%, #1A2B4A 66%, #D15A3E 100%)',
    usage: 'Logo IArche, titres héroïques'
  },
  { 
    name: 'Fond sombre', 
    css: 'linear-gradient(135deg, #1A2B4A 0%, #14203A 100%)',
    usage: 'Sections sombres, hero backgrounds'
  },
  { 
    name: 'Barre inversée', 
    css: 'linear-gradient(90deg, #D15A3E 0%, #1A2B4A 100%)',
    usage: 'Variante de barre décorative'
  },
];

// Spacing scale
const SPACING = [
  { label: 'XS', value: '4px', tailwind: 'p-1', usage: 'Micro-espacements' },
  { label: 'SM', value: '8px', tailwind: 'p-2', usage: 'Espacements internes' },
  { label: 'MD', value: '16px', tailwind: 'p-4', usage: 'Standard' },
  { label: 'LG', value: '24px', tailwind: 'p-6', usage: 'Sections' },
  { label: 'XL', value: '32px', tailwind: 'p-8', usage: 'Grandes séparations' },
  { label: '2XL', value: '48px', tailwind: 'p-12', usage: 'Séparations majeures' },
];

// Bar sizes
const BAR_SIZES = [
  { label: 'SM', width: '48px', height: '2px' },
  { label: 'MD', width: '80px', height: '4px' },
  { label: 'LG', width: '96px', height: '4px' },
  { label: 'XL', width: '128px', height: '6px' },
];

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 3,
    borderBottomColor: '#D15A3E',
    borderBottomStyle: 'solid',
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A2B4A',
    marginBottom: 6,
  },
  tagline: {
    fontSize: 12,
    color: '#4A5568',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A2B4A',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  colorRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'center',
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 3,
    marginRight: 10,
  },
  colorInfo: {
    flex: 1,
  },
  colorName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1A2B4A',
  },
  colorHex: {
    fontSize: 9,
    color: '#4A5568',
    fontFamily: 'Courier',
  },
  colorUsage: {
    fontSize: 8,
    color: '#6B7280',
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 20,
  },
  column: {
    flex: 1,
  },
  spacingRow: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'center',
  },
  spacingLabel: {
    width: 30,
    fontSize: 9,
    color: '#1A2B4A',
    fontWeight: 'bold',
  },
  spacingValue: {
    width: 40,
    fontSize: 9,
    color: '#4A5568',
    fontFamily: 'Courier',
  },
  spacingUsage: {
    fontSize: 8,
    color: '#6B7280',
  },
  barRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'center',
  },
  barLabel: {
    width: 25,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1A2B4A',
  },
  barSwatch: {
    marginRight: 8,
    borderRadius: 2,
  },
  barDimensions: {
    fontSize: 8,
    color: '#6B7280',
  },
  dosRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 15,
  },
  dosColumn: {
    flex: 1,
  },
  doTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 5,
  },
  dontTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 5,
  },
  doItem: {
    fontSize: 8,
    color: '#4A5568',
    marginBottom: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    borderTopStyle: 'solid',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: '#9CA3AF',
  },
});

// PDF Document Component
const ChartePDF = () => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>IArche</Text>
        <Text style={styles.tagline}>L'IA se construit avec vous — Charte Graphique v3.0</Text>
      </View>

      <View style={styles.twoColumn}>
        {/* Left Column */}
        <View style={styles.column}>
          {/* Colors Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Palette de Couleurs</Text>
            {PALETTE.map((color) => (
              <View key={color.hex} style={styles.colorRow}>
                <View style={[styles.colorSwatch, { backgroundColor: color.hex }]} />
                <View style={styles.colorInfo}>
                  <Text style={styles.colorName}>{color.name}</Text>
                  <Text style={styles.colorHex}>{color.hex} · {color.hsl}</Text>
                  <Text style={styles.colorUsage}>{color.usage}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Gradients Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gradients</Text>
            {GRADIENTS.map((gradient, index) => (
              <View key={index} style={styles.colorRow}>
                <View style={[styles.colorSwatch, { backgroundColor: index % 2 === 0 ? '#1A2B4A' : '#D15A3E' }]} />
                <View style={styles.colorInfo}>
                  <Text style={styles.colorName}>{gradient.name}</Text>
                  <Text style={styles.colorUsage}>{gradient.usage}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Bar Sizes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Barres Décoratives</Text>
            {BAR_SIZES.map((bar) => (
              <View key={bar.label} style={styles.barRow}>
                <Text style={styles.barLabel}>{bar.label}</Text>
                <View style={[styles.barSwatch, { 
                  width: parseInt(bar.width) / 2, 
                  height: parseInt(bar.height), 
                  backgroundColor: '#1A2B4A' 
                }]} />
                <Text style={styles.barDimensions}>{bar.width} × {bar.height}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Right Column */}
        <View style={styles.column}>
          {/* Typography Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Typographie</Text>
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#1A2B4A', marginBottom: 3 }}>Manrope</Text>
              <Text style={{ fontSize: 9, color: '#4A5568' }}>ABCDEFGHIJKLMNOPQRSTUVWXYZ</Text>
              <Text style={{ fontSize: 9, color: '#4A5568' }}>abcdefghijklmnopqrstuvwxyz 0123456789</Text>
              <Text style={{ fontSize: 8, color: '#6B7280', marginTop: 2 }}>Poids: 300, 400, 500, 600, 700</Text>
            </View>
            <View style={{ marginTop: 6 }}>
              <Text style={{ fontSize: 9, color: '#D15A3E', fontFamily: 'Courier' }}>H1: 72px / Semibold</Text>
              <Text style={{ fontSize: 9, color: '#D15A3E', fontFamily: 'Courier' }}>H2: 36px / Semibold</Text>
              <Text style={{ fontSize: 9, color: '#D15A3E', fontFamily: 'Courier' }}>H3: 24px / Semibold</Text>
              <Text style={{ fontSize: 9, color: '#D15A3E', fontFamily: 'Courier' }}>Body: 16px / Regular</Text>
              <Text style={{ fontSize: 9, color: '#D15A3E', fontFamily: 'Courier' }}>Small: 14px / Muted</Text>
            </View>
          </View>

          {/* Spacing Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Espacements</Text>
            {SPACING.map((item) => (
              <View key={item.label} style={styles.spacingRow}>
                <Text style={styles.spacingLabel}>{item.label}</Text>
                <Text style={styles.spacingValue}>{item.value}</Text>
                <Text style={styles.spacingUsage}>{item.usage}</Text>
              </View>
            ))}
          </View>

          {/* CTAs Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CTAs</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
              <View style={{ 
                paddingHorizontal: 12, 
                paddingVertical: 6, 
                backgroundColor: '#1A2B4A',
                borderRadius: 4,
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: 'bold' }}>Primaire</Text>
              </View>
              <View style={{ 
                paddingHorizontal: 12, 
                paddingVertical: 6, 
                borderWidth: 2,
                borderColor: '#D15A3E',
                borderRadius: 4,
              }}>
                <Text style={{ color: '#D15A3E', fontSize: 9, fontWeight: 'bold' }}>Secondaire</Text>
              </View>
            </View>
            <Text style={{ fontSize: 8, color: '#6B7280' }}>
              GradientLink: texte gradient animé 8s
            </Text>
            <Text style={{ fontSize: 8, color: '#6B7280' }}>
              IArcheLink: texte bleu + flèche terracotta
            </Text>
          </View>

          {/* Do's and Don'ts */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Usages</Text>
            <View style={styles.dosRow}>
              <View style={styles.dosColumn}>
                <Text style={styles.doTitle}>✓ À faire</Text>
                <Text style={styles.doItem}>• Utiliser les tokens CSS</Text>
                <Text style={styles.doItem}>• Respecter les contrastes</Text>
                <Text style={styles.doItem}>• Focus-visible: ring-accent</Text>
                <Text style={styles.doItem}>• Export pixelRatio: 3</Text>
              </View>
              <View style={styles.dosColumn}>
                <Text style={styles.dontTitle}>✗ À éviter</Text>
                <Text style={styles.doItem}>• Modifier logo couleurs</Text>
                <Text style={styles.doItem}>• Hardcoder HEX values</Text>
                <Text style={styles.doItem}>• Logo {'<'} 100px</Text>
                <Text style={styles.doItem}>• Ombres portées</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>IArche — Charte Graphique v3.0 — Décembre 2025</Text>
        <Text style={styles.footerText}>iarche.fr · nlq@iarche.fr</Text>
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
      const blob = await pdf(<ChartePDF />).toBlob();
      saveAs(blob, 'charte-graphique-iarche-v3.pdf');
      toast.success('Charte graphique v3.0 téléchargée');
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
              <p className="text-muted-foreground">One-pager A4 complet auto-généré depuis les tokens v3.0</p>
            </div>
          </div>
          <Button onClick={handleExport} disabled={isExporting} className="gap-2">
            <Download className="h-4 w-4" />
            Télécharger PDF
          </Button>
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
              {PALETTE.map((color) => (
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
                  <div 
                    className="h-5 rounded"
                    style={{ background: gradient.css }}
                  />
                  <p className="text-xs text-muted-foreground">{gradient.usage}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Typography Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Typographie</CardTitle>
              <CardDescription>Manrope</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  L'IA se construit avec vous
                </p>
              </div>
              <div className="space-y-1 text-xs font-mono text-muted-foreground">
                <p>H1: 72px / Semibold</p>
                <p>H2: 36px / Semibold</p>
                <p>H3: 24px / Semibold</p>
                <p>Body: 16px / Regular</p>
                <p>Small: 14px / Muted</p>
              </div>
            </CardContent>
          </Card>

          {/* Spacing Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Espacements</CardTitle>
              <CardDescription>Échelle Tailwind</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {SPACING.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="w-8 text-xs font-mono text-muted-foreground">{item.label}</span>
                    <div className="h-3 bg-primary rounded" style={{ width: item.value }} />
                    <span className="text-xs text-muted-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
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
                      width: bar.width, 
                      height: bar.height,
                      background: 'linear-gradient(90deg, #1A2B4A 0%, #D15A3E 100%)'
                    }}
                  />
                  <span className="text-xs text-muted-foreground">{bar.width} × {bar.height}</span>
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
            <CardContent className="space-y-4">
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
              <div className="space-y-1">
                <p className="text-sm">
                  <span 
                    className="font-medium"
                    style={{ 
                      background: `linear-gradient(270deg, ${COLORS.bleuNuit} 0%, ${COLORS.terracotta} 50%, ${COLORS.bleuNuit} 100%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    Découvrir →
                  </span>
                  <span className="text-muted-foreground text-xs ml-2">(Gradient)</span>
                </p>
                <p className="text-sm">
                  <span style={{ color: COLORS.bleuNuit }}>
                    En savoir plus <span style={{ color: COLORS.terracotta }}>→</span>
                  </span>
                  <span className="text-muted-foreground text-xs ml-2">(IArche)</span>
                </p>
              </div>
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
                <li>• Utiliser les tokens CSS (--primary, --accent...)</li>
                <li>• Respecter les contrastes WCAG AA</li>
                <li>• Focus-visible avec ring-accent</li>
                <li>• Export haute résolution (pixelRatio: 3)</li>
                <li>• Inclure prefers-reduced-motion</li>
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
                <li>• Ajouter des ombres portées au logo</li>
                <li>• Utiliser d'autres polices que Manrope</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
