import { useState } from 'react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Download, Plus, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WordDocEditorProps {
  templateId: string;
  onBack: () => void;
}

interface SectionData {
  id: number;
  type: 'heading' | 'paragraph' | 'bullets' | 'table';
  title: string;
  content: string;
  bullets: string[];
  tableData: string[][];
}

// IArche brand colors for Word documents (HEX without # for docx library)
// Source: src/components/admin/medias/pdf/tokens.ts
const WORD_COLORS = {
  bleuNuit: '1A2B4A',      // hsl(218, 47%, 20%) - Primary
  terracotta: 'B04A32',    // hsl(12, 60%, 44%) - Accent (WCAG AA compliant)
  foreground: '2D2D2D',    // hsl(0, 0%, 18%) - Text
  muted: '6B7280',         // hsl(220, 9%, 46%) - Muted text
  border: 'E8E4DD',        // hsl(36, 18%, 89%) - Borders
  subtle: '666666',        // hsl(0, 0%, 40%) - Subtle text
};

const templateConfigs: Record<string, { name: string; defaultSections: SectionData[] }> = {
  proposal: {
    name: 'Proposition Commerciale',
    defaultSections: [
      { id: 1, type: 'heading', title: 'Proposition Commerciale', content: '', bullets: [], tableData: [] },
      { id: 2, type: 'paragraph', title: 'Contexte', content: 'Décrivez le contexte et les besoins du client...', bullets: [], tableData: [] },
      { id: 3, type: 'heading', title: 'Notre proposition', content: '', bullets: [], tableData: [] },
      { id: 4, type: 'bullets', title: 'Services inclus', content: '', bullets: ['Service 1', 'Service 2', 'Service 3'], tableData: [] },
      { id: 5, type: 'table', title: 'Budget', content: '', bullets: [], tableData: [['Prestation', 'Montant'], ['Audit IA', '2 500 €'], ['Développement', '15 000 €'], ['Formation', '3 000 €'], ['Total', '20 500 €']] },
      { id: 6, type: 'paragraph', title: 'Conditions', content: 'Validité : 30 jours. Paiement : 30% à la commande, solde à la livraison.', bullets: [], tableData: [] },
    ]
  },
  report: {
    name: 'Compte-Rendu',
    defaultSections: [
      { id: 1, type: 'heading', title: 'Compte-Rendu de Réunion', content: '', bullets: [], tableData: [] },
      { id: 2, type: 'paragraph', title: 'Date et participants', content: 'Date : [DATE]\nParticipants : [NOMS]', bullets: [], tableData: [] },
      { id: 3, type: 'heading', title: 'Points abordés', content: '', bullets: [], tableData: [] },
      { id: 4, type: 'bullets', title: '', content: '', bullets: ['Point 1', 'Point 2', 'Point 3'], tableData: [] },
      { id: 5, type: 'heading', title: 'Décisions prises', content: '', bullets: [], tableData: [] },
      { id: 6, type: 'bullets', title: '', content: '', bullets: ['Décision 1', 'Décision 2'], tableData: [] },
      { id: 7, type: 'heading', title: 'Prochaines étapes', content: '', bullets: [], tableData: [] },
      { id: 8, type: 'table', title: '', content: '', bullets: [], tableData: [['Action', 'Responsable', 'Échéance'], ['Action 1', 'Nom', 'Date'], ['Action 2', 'Nom', 'Date']] },
    ]
  },
  datasheet: {
    name: 'Fiche Technique',
    defaultSections: [
      { id: 1, type: 'heading', title: 'Fiche Technique', content: '', bullets: [], tableData: [] },
      { id: 2, type: 'paragraph', title: 'Nom de la solution', content: '[NOM DE LA SOLUTION]', bullets: [], tableData: [] },
      { id: 3, type: 'paragraph', title: 'Description', content: 'Description détaillée de la solution...', bullets: [], tableData: [] },
      { id: 4, type: 'heading', title: 'Fonctionnalités', content: '', bullets: [], tableData: [] },
      { id: 5, type: 'bullets', title: '', content: '', bullets: ['Fonctionnalité 1', 'Fonctionnalité 2', 'Fonctionnalité 3'], tableData: [] },
      { id: 6, type: 'heading', title: 'Spécifications techniques', content: '', bullets: [], tableData: [] },
      { id: 7, type: 'table', title: '', content: '', bullets: [], tableData: [['Caractéristique', 'Valeur'], ['Technologie', 'IA / Machine Learning'], ['Hébergement', 'Cloud sécurisé'], ['API', 'REST / GraphQL']] },
    ]
  }
};

export const WordDocEditor = ({ templateId, onBack }: WordDocEditorProps) => {
  const { toast } = useToast();
  const config = templateConfigs[templateId] || templateConfigs.proposal;
  
  const [sections, setSections] = useState<SectionData[]>(config.defaultSections);
  const [isExporting, setIsExporting] = useState(false);
  const [documentTitle, setDocumentTitle] = useState(config.name);

  const handleSectionChange = (index: number, field: keyof SectionData, value: any) => {
    setSections(prev => prev.map((section, idx) => 
      idx === index ? { ...section, [field]: value } : section
    ));
  };

  const handleBulletChange = (sectionIndex: number, bulletIndex: number, value: string) => {
    const section = sections[sectionIndex];
    const newBullets = [...section.bullets];
    newBullets[bulletIndex] = value;
    handleSectionChange(sectionIndex, 'bullets', newBullets);
  };

  const addBullet = (sectionIndex: number) => {
    const section = sections[sectionIndex];
    handleSectionChange(sectionIndex, 'bullets', [...section.bullets, 'Nouveau point']);
  };

  const handleTableCellChange = (sectionIndex: number, rowIndex: number, colIndex: number, value: string) => {
    const section = sections[sectionIndex];
    const newTableData = section.tableData.map((row, rIdx) => 
      rIdx === rowIndex ? row.map((cell, cIdx) => cIdx === colIndex ? value : cell) : row
    );
    handleSectionChange(sectionIndex, 'tableData', newTableData);
  };

  const addSection = (type: SectionData['type']) => {
    const newSection: SectionData = {
      id: Date.now(),
      type,
      title: type === 'heading' ? 'Nouveau titre' : '',
      content: type === 'paragraph' ? 'Nouveau paragraphe...' : '',
      bullets: type === 'bullets' ? ['Point 1'] : [],
      tableData: type === 'table' ? [['Colonne 1', 'Colonne 2'], ['Valeur 1', 'Valeur 2']] : [],
    };
    setSections(prev => [...prev, newSection]);
  };

  const removeSection = (index: number) => {
    setSections(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleExportWord = async () => {
    setIsExporting(true);
    try {
      const children: any[] = [];

      // Header with IArche branding
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'IArche',
              bold: true,
              size: 48,
              color: WORD_COLORS.terracotta,
            }),
          ],
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'L\'IA se construit avec vous',
              italics: true,
              size: 24,
              color: WORD_COLORS.bleuNuit,
            }),
          ],
          spacing: { after: 400 },
        })
      );

      // Document content
      sections.forEach((section) => {
        if (section.type === 'heading') {
          children.push(
            new Paragraph({
              text: section.title,
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
            })
          );
        } else if (section.type === 'paragraph') {
          if (section.title) {
            children.push(
              new Paragraph({
                text: section.title,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 100 },
              })
            );
          }
          children.push(
            new Paragraph({
              text: section.content,
              spacing: { after: 200 },
            })
          );
        } else if (section.type === 'bullets') {
          if (section.title) {
            children.push(
              new Paragraph({
                text: section.title,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 100 },
              })
            );
          }
          section.bullets.forEach((bullet) => {
            children.push(
              new Paragraph({
                text: bullet,
                bullet: { level: 0 },
                spacing: { after: 100 },
              })
            );
          });
        } else if (section.type === 'table') {
          if (section.title) {
            children.push(
              new Paragraph({
                text: section.title,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 100 },
              })
            );
          }
          const tableRows = section.tableData.map((row, rowIndex) => 
            new TableRow({
              children: row.map((cell) => 
                new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({
                        text: cell,
                        bold: rowIndex === 0,
                        color: rowIndex === 0 ? WORD_COLORS.bleuNuit : undefined,
                      })],
                    })],
                  width: { size: 100 / row.length, type: WidthType.PERCENTAGE },
                })
              ),
            })
          );
          children.push(
            new Table({
              rows: tableRows,
              width: { size: 100, type: WidthType.PERCENTAGE },
            })
          );
          children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
        }
      });

      // Footer
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
              color: WORD_COLORS.terracotta,
            }),
          ],
          spacing: { before: 400 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'IArche - Agence IA | Bayonne, France | iarche.fr | nlq@iarche.fr',
              size: 20,
              color: WORD_COLORS.bleuNuit,
            }),
          ],
          alignment: AlignmentType.CENTER,
        })
      );

      const doc = new Document({
        sections: [{
          properties: {},
          children,
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${documentTitle.toLowerCase().replace(/\s+/g, '-')}-iarche-${Date.now()}.docx`);
      toast({ title: 'Document Word exporté avec succès' });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Erreur lors de l\'export', variant: 'destructive' });
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
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Document Word : {config.name}</h1>
              <p className="text-sm text-muted-foreground">Format A4 - Export DOCX</p>
            </div>
          </div>
          <Button onClick={handleExportWord} disabled={isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Télécharger Word
          </Button>
        </div>

        {/* Document title */}
        <div className="space-y-2">
          <Label>Titre du document</Label>
          <Input 
            value={documentTitle} 
            onChange={(e) => setDocumentTitle(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Sections */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Sections</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => addSection('heading')}>
                <Plus className="h-4 w-4 mr-1" />
                Titre
              </Button>
              <Button variant="outline" size="sm" onClick={() => addSection('paragraph')}>
                <Plus className="h-4 w-4 mr-1" />
                Paragraphe
              </Button>
              <Button variant="outline" size="sm" onClick={() => addSection('bullets')}>
                <Plus className="h-4 w-4 mr-1" />
                Liste
              </Button>
              <Button variant="outline" size="sm" onClick={() => addSection('table')}>
                <Plus className="h-4 w-4 mr-1" />
                Tableau
              </Button>
            </div>
          </div>

          {sections.map((section, index) => (
            <Card key={section.id}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium capitalize">
                    {section.type === 'heading' && '📑 Titre'}
                    {section.type === 'paragraph' && '📝 Paragraphe'}
                    {section.type === 'bullets' && '📋 Liste'}
                    {section.type === 'table' && '📊 Tableau'}
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => removeSection(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {section.type === 'heading' && (
                  <Input 
                    value={section.title} 
                    onChange={(e) => handleSectionChange(index, 'title', e.target.value)}
                    placeholder="Titre de section"
                  />
                )}
                {section.type === 'paragraph' && (
                  <>
                    <Input 
                      value={section.title} 
                      onChange={(e) => handleSectionChange(index, 'title', e.target.value)}
                      placeholder="Sous-titre (optionnel)"
                    />
                    <Textarea 
                      value={section.content} 
                      onChange={(e) => handleSectionChange(index, 'content', e.target.value)}
                      placeholder="Contenu..."
                      rows={3}
                    />
                  </>
                )}
                {section.type === 'bullets' && (
                  <>
                    <Input 
                      value={section.title} 
                      onChange={(e) => handleSectionChange(index, 'title', e.target.value)}
                      placeholder="Titre de la liste (optionnel)"
                    />
                    {section.bullets.map((bullet, bIdx) => (
                      <div key={bIdx} className="flex gap-2">
                        <Input 
                          value={bullet} 
                          onChange={(e) => handleBulletChange(index, bIdx, e.target.value)}
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleSectionChange(index, 'bullets', section.bullets.filter((_, i) => i !== bIdx))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => addBullet(index)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter
                    </Button>
                  </>
                )}
                {section.type === 'table' && (
                  <>
                    <Input 
                      value={section.title} 
                      onChange={(e) => handleSectionChange(index, 'title', e.target.value)}
                      placeholder="Titre du tableau (optionnel)"
                    />
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <tbody>
                          {section.tableData.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-1">
                                  <Input 
                                    value={cell} 
                                    onChange={(e) => handleTableCellChange(index, rIdx, cIdx, e.target.value)}
                                    className={rIdx === 0 ? 'font-semibold' : ''}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};
