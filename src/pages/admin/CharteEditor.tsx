import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer';
import { COLORS, FONTS } from '@/components/admin/medias/shared/tokens';

// Color palette definition
const PALETTE = [
  { name: 'Bleu Nuit', hex: '#1A2B4A', usage: 'Couleur principale, titres, navigation' },
  { name: 'Terracotta', hex: '#D15A3E', usage: 'Accent, CTA, liens interactifs' },
  { name: 'Gris Texte', hex: '#4A5568', usage: 'Texte courant, descriptions' },
  { name: 'Fond Clair', hex: '#F8F9FA', usage: 'Arrière-plans, sections alternées' },
  { name: 'Blanc', hex: '#FFFFFF', usage: 'Fond principal, cartes, modals' },
];

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 3,
    borderBottomColor: '#D15A3E',
    borderBottomStyle: 'solid',
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A2B4A',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: '#4A5568',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A2B4A',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  colorRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  colorSwatch: {
    width: 30,
    height: 30,
    borderRadius: 4,
    marginRight: 12,
  },
  colorInfo: {
    flex: 1,
  },
  colorName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1A2B4A',
  },
  colorHex: {
    fontSize: 10,
    color: '#4A5568',
    fontFamily: 'Courier',
  },
  colorUsage: {
    fontSize: 9,
    color: '#6B7280',
  },
  typoSection: {
    marginBottom: 15,
  },
  typoName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1A2B4A',
    marginBottom: 4,
  },
  typoSample: {
    fontSize: 10,
    color: '#4A5568',
    marginBottom: 2,
  },
  spacingRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  spacingLabel: {
    width: 80,
    fontSize: 10,
    color: '#1A2B4A',
    fontWeight: 'bold',
  },
  spacingValue: {
    fontSize: 10,
    color: '#4A5568',
  },
  dosRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  dosColumn: {
    flex: 1,
    marginRight: 20,
  },
  doTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 6,
  },
  dontTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 6,
  },
  doItem: {
    fontSize: 9,
    color: '#4A5568',
    marginBottom: 3,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    borderTopStyle: 'solid',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
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
        <Text style={styles.tagline}>L'IA se construit avec vous</Text>
      </View>

      {/* Colors Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Couleurs</Text>
        {PALETTE.map((color) => (
          <View key={color.hex} style={styles.colorRow}>
            <View style={[styles.colorSwatch, { backgroundColor: color.hex }]} />
            <View style={styles.colorInfo}>
              <Text style={styles.colorName}>{color.name}</Text>
              <Text style={styles.colorHex}>{color.hex}</Text>
              <Text style={styles.colorUsage}>{color.usage}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Typography Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Typographie</Text>
        <View style={styles.typoSection}>
          <Text style={styles.typoName}>Manrope (Titres)</Text>
          <Text style={styles.typoSample}>ABCDEFGHIJKLMNOPQRSTUVWXYZ</Text>
          <Text style={styles.typoSample}>abcdefghijklmnopqrstuvwxyz 0123456789</Text>
        </View>
        <View style={styles.typoSection}>
          <Text style={styles.typoName}>Inter (Corps de texte)</Text>
          <Text style={styles.typoSample}>ABCDEFGHIJKLMNOPQRSTUVWXYZ</Text>
          <Text style={styles.typoSample}>abcdefghijklmnopqrstuvwxyz 0123456789</Text>
        </View>
      </View>

      {/* Spacing Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Espacements</Text>
        <View style={styles.spacingRow}>
          <Text style={styles.spacingLabel}>XS</Text>
          <Text style={styles.spacingValue}>4px - Micro-espacements</Text>
        </View>
        <View style={styles.spacingRow}>
          <Text style={styles.spacingLabel}>SM</Text>
          <Text style={styles.spacingValue}>8px - Espacements internes</Text>
        </View>
        <View style={styles.spacingRow}>
          <Text style={styles.spacingLabel}>MD</Text>
          <Text style={styles.spacingValue}>16px - Standard</Text>
        </View>
        <View style={styles.spacingRow}>
          <Text style={styles.spacingLabel}>LG</Text>
          <Text style={styles.spacingValue}>24px - Sections</Text>
        </View>
        <View style={styles.spacingRow}>
          <Text style={styles.spacingLabel}>XL</Text>
          <Text style={styles.spacingValue}>48px - Grandes séparations</Text>
        </View>
      </View>

      {/* Do's and Don'ts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Usages</Text>
        <View style={styles.dosRow}>
          <View style={styles.dosColumn}>
            <Text style={styles.doTitle}>✓ À faire</Text>
            <Text style={styles.doItem}>• Utiliser les couleurs de la palette</Text>
            <Text style={styles.doItem}>• Respecter les contrastes minimum</Text>
            <Text style={styles.doItem}>• Garder des marges généreuses</Text>
            <Text style={styles.doItem}>• Privilégier la lisibilité</Text>
          </View>
          <View style={styles.dosColumn}>
            <Text style={styles.dontTitle}>✗ À éviter</Text>
            <Text style={styles.doItem}>• Modifier les couleurs du logo</Text>
            <Text style={styles.doItem}>• Utiliser des fonds chargés</Text>
            <Text style={styles.doItem}>• Mélanger trop de typographies</Text>
            <Text style={styles.doItem}>• Réduire le logo sous 100px</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>IArche - Charte Graphique v1.0</Text>
        <Text style={styles.footerText}>iarche.fr</Text>
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
      saveAs(blob, 'charte-graphique-iarche.pdf');
      toast.success('Charte graphique téléchargée');
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
              <p className="text-muted-foreground">One-pager A4 auto-généré depuis les tokens</p>
            </div>
          </div>
          <Button onClick={handleExport} disabled={isExporting} className="gap-2">
            <Download className="h-4 w-4" />
            Télécharger PDF
          </Button>
        </div>

        {/* Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Colors Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Palette de couleurs</CardTitle>
              <CardDescription>5 couleurs principales</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {PALETTE.map((color) => (
                <div key={color.hex} className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg border shadow-sm"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div>
                    <p className="text-sm font-medium">{color.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">{color.hex}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Typography Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Typographie</CardTitle>
              <CardDescription>Polices utilisées</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm font-medium text-primary mb-2">Manrope (Titres)</p>
                <p className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  L'IA se construit avec vous
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-primary mb-2">Inter (Corps)</p>
                <p className="text-base text-muted-foreground">
                  IArche accompagne les dirigeants de PME dans l'intégration concrète de l'intelligence artificielle.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Spacing Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Espacements</CardTitle>
              <CardDescription>Règles de padding/margin</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { label: 'XS', value: '4px', width: 'w-1' },
                  { label: 'SM', value: '8px', width: 'w-2' },
                  { label: 'MD', value: '16px', width: 'w-4' },
                  { label: 'LG', value: '24px', width: 'w-6' },
                  { label: 'XL', value: '48px', width: 'w-12' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="w-8 text-sm font-mono text-muted-foreground">{item.label}</span>
                    <div className={`h-4 bg-primary rounded ${item.width}`} />
                    <span className="text-sm text-muted-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Usage Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Usages</CardTitle>
              <CardDescription>Do's and Don'ts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-green-600 mb-2">✓ À faire</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Utiliser la palette</li>
                    <li>• Respecter les contrastes</li>
                    <li>• Garder des marges</li>
                    <li>• Privilégier la lisibilité</li>
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-medium text-red-600 mb-2">✗ À éviter</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Modifier le logo</li>
                    <li>• Fonds chargés</li>
                    <li>• Mélanger les typos</li>
                    <li>• Logo sous 100px</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
