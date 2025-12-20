import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Eye, Code, Copy, Check, Sparkles, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmailTemplateEditorProps {
  sourceType: string;
  sourceLabel: string;
  initialTemplate: string | null;
  initialSubject: string | null;
  onSave: (template: string, subject: string) => Promise<void>;
}

// Couleurs IArche v4.0
const EMAIL_COLORS = {
  bleuNuit: '#1A2B4A',
  terracotta: '#B04A32',
  blancCasse: '#FAF9F7',
  white: '#FFFFFF',
  grey: '#6B7280',
  lightGrey: '#E5E7EB',
};

type EmailTheme = 'bleu-nuit' | 'blanc-casse' | 'terracotta' | 'minimaliste';

const EMAIL_THEMES: Record<EmailTheme, {
  label: string;
  headerBg: string;
  headerText: string;
  bodyBg: string;
  bodyText: string;
  footerBg: string;
  accent: string;
  logoSrc: string;
}> = {
  'bleu-nuit': {
    label: 'Bleu Nuit (Gradient)',
    headerBg: `linear-gradient(135deg, ${EMAIL_COLORS.bleuNuit} 0%, ${EMAIL_COLORS.terracotta} 100%)`,
    headerText: EMAIL_COLORS.white,
    bodyBg: EMAIL_COLORS.white,
    bodyText: '#374151',
    footerBg: EMAIL_COLORS.blancCasse,
    accent: EMAIL_COLORS.terracotta,
    logoSrc: 'https://iarche.fr/logos/iarche-white.svg',
  },
  'blanc-casse': {
    label: 'Blanc Cassé (Élégant)',
    headerBg: EMAIL_COLORS.blancCasse,
    headerText: EMAIL_COLORS.bleuNuit,
    bodyBg: EMAIL_COLORS.white,
    bodyText: '#374151',
    footerBg: EMAIL_COLORS.blancCasse,
    accent: EMAIL_COLORS.terracotta,
    logoSrc: 'https://iarche.fr/logos/iarche-dark.svg',
  },
  'terracotta': {
    label: 'Terracotta (Chaleureux)',
    headerBg: EMAIL_COLORS.terracotta,
    headerText: EMAIL_COLORS.white,
    bodyBg: EMAIL_COLORS.white,
    bodyText: '#374151',
    footerBg: EMAIL_COLORS.blancCasse,
    accent: EMAIL_COLORS.bleuNuit,
    logoSrc: 'https://iarche.fr/logos/iarche-white.svg',
  },
  'minimaliste': {
    label: 'Minimaliste (Simple)',
    headerBg: EMAIL_COLORS.white,
    headerText: EMAIL_COLORS.bleuNuit,
    bodyBg: EMAIL_COLORS.white,
    bodyText: '#374151',
    footerBg: EMAIL_COLORS.white,
    accent: EMAIL_COLORS.terracotta,
    logoSrc: 'https://iarche.fr/logos/iarche-dark.svg',
  },
};

const generateTemplate = (theme: EmailTheme): string => {
  const t = EMAIL_THEMES[theme];
  const isGradient = t.headerBg.includes('gradient');
  const headerStyle = isGradient 
    ? `background: ${t.headerBg};` 
    : `background-color: ${t.headerBg};`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background: ${t.bodyBg}; }
    .header { ${headerStyle} padding: 32px; text-align: center; }
    .header img { height: 40px; }
    .header h1 { color: ${t.headerText}; margin: 16px 0 0 0; font-size: 22px; font-weight: 600; }
    .content { padding: 32px; color: ${t.bodyText}; line-height: 1.6; }
    .content h2 { color: ${EMAIL_COLORS.bleuNuit}; margin-top: 0; }
    .button { display: inline-block; background: ${t.accent}; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0; font-weight: 500; }
    .footer { background: ${t.footerBg}; padding: 24px; text-align: center; font-size: 14px; border-top: 1px solid ${EMAIL_COLORS.lightGrey}; }
    .footer p { color: ${EMAIL_COLORS.grey}; margin: 8px 0; }
    .footer .baseline { color: ${EMAIL_COLORS.terracotta}; font-weight: 500; font-style: italic; }
    .footer a { color: ${EMAIL_COLORS.terracotta}; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${t.logoSrc}" alt="IArche" />
      <h1>{{title}}</h1>
    </div>
    <div class="content">
      <p>Bonjour {{name}},</p>
      <p>{{message}}</p>
      <a href="{{cta_url}}" class="button">{{cta_text}}</a>
    </div>
    <div class="footer">
      <p class="baseline">L'IA se construit avec vous</p>
      <p>IArche · Bayonne, France</p>
      <p><a href="https://iarche.fr">iarche.fr</a></p>
    </div>
  </div>
</body>
</html>`;
};

const VARIABLES = [
  { key: '{{name}}', desc: 'Nom du destinataire' },
  { key: '{{email}}', desc: 'Email du destinataire' },
  { key: '{{title}}', desc: 'Titre de l\'email' },
  { key: '{{message}}', desc: 'Message personnalisé' },
  { key: '{{cta_url}}', desc: 'URL du bouton' },
  { key: '{{cta_text}}', desc: 'Texte du bouton' },
  { key: '{{date}}', desc: 'Date actuelle' },
  { key: '{{company}}', desc: 'Entreprise (si renseignée)' },
];

export function EmailTemplateEditor({ 
  sourceType, 
  sourceLabel, 
  initialTemplate, 
  initialSubject,
  onSave 
}: EmailTemplateEditorProps) {
  const [selectedTheme, setSelectedTheme] = useState<EmailTheme>('bleu-nuit');
  const [template, setTemplate] = useState(initialTemplate || generateTemplate('bleu-nuit'));
  const [subject, setSubject] = useState(initialSubject || '');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  const handleThemeChange = (theme: EmailTheme) => {
    setSelectedTheme(theme);
    setTemplate(generateTemplate(theme));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(template, subject);
      toast({ title: 'Template sauvegardé', description: 'Le template a été mis à jour' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' });
    }
    setSaving(false);
  };

  const insertVariable = (variable: string) => {
    const textarea = document.querySelector('textarea[data-template]') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newTemplate = template.substring(0, start) + variable + template.substring(end);
      setTemplate(newTemplate);
    }
  };

  const getPreviewHtml = () => {
    return template
      .replace(/\{\{name\}\}/g, 'Jean Dupont')
      .replace(/\{\{email\}\}/g, 'jean.dupont@exemple.fr')
      .replace(/\{\{title\}\}/g, 'Merci pour votre message')
      .replace(/\{\{message\}\}/g, 'Nous avons bien reçu votre demande et nous vous répondrons dans les plus brefs délais.')
      .replace(/\{\{cta_url\}\}/g, 'https://iarche.fr')
      .replace(/\{\{cta_text\}\}/g, 'Visiter notre site')
      .replace(/\{\{date\}\}/g, new Date().toLocaleDateString('fr-FR'))
      .replace(/\{\{company\}\}/g, 'Entreprise SAS');
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Template: {sourceLabel}
          </CardTitle>
          <Badge variant="outline">{sourceType}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sélection du thème */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Thème du template
          </Label>
          <Select value={selectedTheme} onValueChange={(v) => handleThemeChange(v as EmailTheme)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EMAIL_THEMES).map(([key, theme]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full border" 
                      style={{ 
                        background: theme.headerBg.includes('gradient') 
                          ? theme.headerBg 
                          : theme.headerBg 
                      }} 
                    />
                    {theme.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Sujet de l'email</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Sujet de l'email de confirmation"
          />
        </div>

        <Tabs defaultValue="editor">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="editor" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              Éditeur HTML
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Prévisualisation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-4 mt-4">
            {/* Variables disponibles */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <Label className="text-sm font-medium mb-2 block">Variables disponibles</Label>
              <div className="flex flex-wrap gap-2">
                {VARIABLES.map((v) => (
                  <Button
                    key={v.key}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => insertVariable(v.key)}
                    title={v.desc}
                  >
                    {copied === v.key ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                    {v.key}
                  </Button>
                ))}
              </div>
            </div>

            <Textarea
              data-template
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="font-mono text-sm min-h-[400px]"
              placeholder="Code HTML du template..."
            />

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
              <Button variant="outline" onClick={() => setTemplate(generateTemplate(selectedTheme))}>
                Réinitialiser
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <div className="border rounded-lg overflow-hidden bg-muted/20">
              <div className="p-2 bg-muted border-b text-sm text-muted-foreground flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Prévisualisation (données fictives)
              </div>
              <iframe
                srcDoc={getPreviewHtml()}
                className="w-full h-[500px] bg-white"
                title="Email Preview"
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
