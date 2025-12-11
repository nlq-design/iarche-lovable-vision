import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Copy, Check, Eye, Code, Plus, Trash2, Columns, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { LazyQuill } from '@/components/admin/LazyQuill';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const quillModules = {
  toolbar: [
    [{ 'font': [] }],
    [{ 'size': ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ['link'],
    ['clean']
  ]
};

const quillFormats = [
  'font', 'size', 'bold', 'italic', 'underline', 'strike',
  'color', 'background', 'list', 'bullet', 'link'
];

interface Section {
  id: string;
  type: 'text' | 'columns' | 'cta' | 'divider';
  title?: string;
  content?: string;
  leftColumn?: string;
  rightColumn?: string;
  ctaText?: string;
  ctaLink?: string;
}

interface SortableSectionProps {
  section: Section;
  index: number;
  sections: Section[];
  updateSection: (id: string, updates: Partial<Section>) => void;
  removeSection: (id: string) => void;
}

const SortableSection = ({ section, index, sections, updateSection, removeSection }: SortableSectionProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="p-4 border rounded-lg space-y-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab hover:bg-muted p-1 rounded touch-none"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-medium text-muted-foreground">
            Section {index + 1} - {section.type === 'text' ? 'Texte' : section.type === 'columns' ? 'Colonnes' : section.type === 'cta' ? 'Bouton CTA' : 'Séparateur'}
          </span>
        </div>
        {sections.length > 1 && (
          <Button size="icon" variant="ghost" onClick={() => removeSection(section.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>

      {section.type === 'text' && (
        <>
          <Input
            value={section.title || ''}
            onChange={(e) => updateSection(section.id, { title: e.target.value })}
            placeholder="Titre (optionnel)"
          />
          <div className="brevo-quill-editor">
            <LazyQuill
              value={section.content || ''}
              onChange={(value) => updateSection(section.id, { content: value })}
              modules={quillModules}
              formats={quillFormats}
              placeholder="Contenu avec mise en forme..."
            />
          </div>
        </>
      )}

      {section.type === 'columns' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Colonne gauche</Label>
            <div className="brevo-quill-editor">
              <LazyQuill
                value={section.leftColumn || ''}
                onChange={(value) => updateSection(section.id, { leftColumn: value })}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Contenu colonne gauche..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Colonne droite</Label>
            <div className="brevo-quill-editor">
              <LazyQuill
                value={section.rightColumn || ''}
                onChange={(value) => updateSection(section.id, { rightColumn: value })}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Contenu colonne droite..."
              />
            </div>
          </div>
        </div>
      )}

      {section.type === 'cta' && (
        <div className="grid grid-cols-2 gap-4">
          <Input
            value={section.ctaText || ''}
            onChange={(e) => updateSection(section.id, { ctaText: e.target.value })}
            placeholder="Texte du bouton"
          />
          <Input
            value={section.ctaLink || ''}
            onChange={(e) => updateSection(section.id, { ctaLink: e.target.value })}
            placeholder="Lien du bouton"
          />
        </div>
      )}

      {section.type === 'divider' && (
        <p className="text-xs text-muted-foreground">Ligne de séparation horizontale</p>
      )}
    </div>
  );
};

const BrevoHTMLEditor = () => {
  const [headerTitle, setHeaderTitle] = useState('IArche');
  const [headerImage, setHeaderImage] = useState('');
  const [showHeaderImage, setShowHeaderImage] = useState(false);
  const [footerText, setFooterText] = useState('IArche · Bayonne · France');
  const [copied, setCopied] = useState(false);
  
  const [sections, setSections] = useState<Section[]>([
    { id: '1', type: 'text', title: '', content: '' }
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addSection = (type: Section['type']) => {
    const newSection: Section = {
      id: Date.now().toString(),
      type,
      title: '',
      content: '',
      leftColumn: '',
      rightColumn: '',
      ctaText: '',
      ctaLink: 'https://iarche.fr'
    };
    setSections([...sections, newSection]);
  };

  const updateSection = (id: string, updates: Partial<Section>) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeSection = (id: string) => {
    if (sections.length > 1) {
      setSections(sections.filter(s => s.id !== id));
    }
  };

  const generateHTML = () => {
    const sectionsHTML = sections.map(section => {
      switch (section.type) {
        case 'text':
          return `
              ${section.title ? `<h2 style="margin: 0 0 8px; color: #1A2B4A; font-size: 20px; font-weight: bold;">${section.title}</h2>` : ''}
              ${section.content ? `<div style="color: #4A5568; font-size: 15px; line-height: 1.5; margin-bottom: 12px;">${section.content}</div>` : ''}`;
        
        case 'columns':
          return `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 12px;">
                <tr>
                  <td width="48%" valign="top" style="padding-right: 2%;">
                    <div style="color: #4A5568; font-size: 14px; line-height: 1.5;">${section.leftColumn || ''}</div>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" valign="top" style="padding-left: 2%;">
                    <div style="color: #4A5568; font-size: 14px; line-height: 1.5;">${section.rightColumn || ''}</div>
                  </td>
                </tr>
              </table>`;
        
        case 'cta':
          return section.ctaText ? `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 16px auto;">
                <tr>
                  <td style="background: linear-gradient(135deg, #1A2B4A 0%, #B04A32 100%); border-radius: 6px;">
                    <a href="${section.ctaLink || 'https://iarche.fr'}" target="_blank" style="display: inline-block; padding: 12px 28px; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: bold;">${section.ctaText}</a>
                  </td>
                </tr>
              </table>` : '';
        
        case 'divider':
          return `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 12px 0;">
                <tr>
                  <td style="border-top: 1px solid #E2E8F0;"></td>
                </tr>
              </table>`;
        
        default:
          return '';
      }
    }).join('');

    const headerContent = showHeaderImage && headerImage 
      ? `<img src="${headerImage}" alt="${headerTitle}" style="max-width: 200px; height: auto; margin-bottom: 15px;" />`
      : '';

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headerTitle || 'IArche'}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF9F7; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF9F7;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1A2B4A 0%, #2D4A7C 50%, #B04A32 100%); padding: 20px 24px; text-align: center;">
              ${headerContent}
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">${headerTitle}</h1>
              <div style="width: 50px; height: 2px; background: linear-gradient(90deg, #1A2B4A, #B04A32, #1A2B4A); margin: 10px auto 0;"></div>
            </td>
          </tr>
          
          <!-- Contenu -->
          <tr>
            <td style="padding: 24px;">
              ${sectionsHTML}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #1A2B4A; padding: 16px 24px; text-align: center;">
              <p style="margin: 0; color: #ffffff; font-size: 13px;">${footerText}</p>
              <p style="margin: 6px 0 0; color: rgba(255,255,255,0.7); font-size: 11px;">
                <a href="https://iarche.fr" style="color: #B04A32; text-decoration: none;">iarche.fr</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateHTML());
      setCopied(true);
      toast.success('HTML copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erreur lors de la copie');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Générez du HTML prêt à intégrer dans vos campagnes Brevo</p>
        <Button onClick={handleCopy} className="gap-2">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copié !' : 'Copier le HTML'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulaire */}
        <div className="space-y-4">
          {/* Header */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">En-tête</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Titre de l'en-tête</Label>
                <Input
                  value={headerTitle}
                  onChange={(e) => setHeaderTitle(e.target.value)}
                  placeholder="IArche"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label>Image d'en-tête (optionnel)</Label>
                <Switch checked={showHeaderImage} onCheckedChange={setShowHeaderImage} />
              </div>
              
              {showHeaderImage && (
                <Input
                  value={headerImage}
                  onChange={(e) => setHeaderImage(e.target.value)}
                  placeholder="https://... (URL de l'image)"
                />
              )}
            </CardContent>
          </Card>

          {/* Sections */}
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Sections</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => addSection('text')}>
                    <Plus className="h-4 w-4 mr-1" /> Texte
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => addSection('columns')}>
                    <Columns className="h-4 w-4 mr-1" /> Colonnes
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => addSection('cta')}>
                    <Plus className="h-4 w-4 mr-1" /> CTA
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => addSection('divider')}>
                    Séparateur
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sections.map(s => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sections.map((section, index) => (
                    <SortableSection
                      key={section.id}
                      section={section}
                      index={index}
                      sections={sections}
                      updateSection={updateSection}
                      removeSection={removeSection}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>

          {/* Footer */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Pied de page</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="IArche · Bayonne · France"
              />
            </CardContent>
          </Card>
        </div>

        {/* Aperçu */}
        <Card className="lg:sticky lg:top-6 h-fit">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Aperçu & Code</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="preview" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="preview" className="gap-2">
                  <Eye className="h-4 w-4" /> Aperçu
                </TabsTrigger>
                <TabsTrigger value="code" className="gap-2">
                  <Code className="h-4 w-4" /> Code HTML
                </TabsTrigger>
              </TabsList>
              <TabsContent value="preview" className="mt-0">
                <div 
                  className="border rounded-lg overflow-hidden bg-[#FAF9F7]"
                  style={{ maxHeight: '600px', overflowY: 'auto' }}
                >
                  <iframe
                    srcDoc={generateHTML()}
                    title="Aperçu email"
                    className="w-full h-[500px] border-0"
                  />
                </div>
              </TabsContent>
              <TabsContent value="code" className="mt-0">
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs max-h-[500px]">
                    <code>{generateHTML()}</code>
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BrevoHTMLEditor;
