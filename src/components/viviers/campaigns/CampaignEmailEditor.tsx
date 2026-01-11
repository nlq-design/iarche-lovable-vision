import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LazyQuill } from '@/components/admin/LazyQuill';
import { Eye, Code, Palette, Variable, RefreshCw, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Email theme system (matching EmailTemplateEditor patterns)
const EMAIL_COLORS = {
  bleuNuit: '#1A2B4A',
  terracotta: '#B04A32',
  blancCasse: '#FAF9F7',
  white: '#FFFFFF',
  grey: '#6B7280',
  lightGrey: '#E5E7EB',
};

export type EmailTheme = 'bleu-nuit' | 'blanc-casse' | 'terracotta' | 'minimaliste';

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

// Campaign-specific variables
const CAMPAIGN_VARIABLES = [
  { key: '{{first_name}}', desc: 'Prénom du destinataire' },
  { key: '{{last_name}}', desc: 'Nom du destinataire' },
  { key: '{{name}}', desc: 'Nom complet' },
  { key: '{{email}}', desc: 'Email du destinataire' },
  { key: '{{company}}', desc: 'Entreprise' },
  { key: '{{unsubscribe_url}}', desc: 'Lien de désinscription' },
];

interface CampaignEmailEditorProps {
  subject: string;
  bodyHtml: string;
  theme: EmailTheme;
  onSubjectChange: (subject: string) => void;
  onBodyChange: (html: string) => void;
  onThemeChange: (theme: EmailTheme) => void;
  senderName?: string;
}

// Quill modules for email editing
const QUILL_MODULES = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['link'],
    ['clean']
  ],
};

const QUILL_FORMATS = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'color', 'background', 'list', 'bullet', 'align', 'link'
];

export function CampaignEmailEditor({
  subject,
  bodyHtml,
  theme,
  onSubjectChange,
  onBodyChange,
  onThemeChange,
  senderName = 'IArche',
}: CampaignEmailEditorProps) {
  const { toast } = useToast();
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'html'>('editor');

  const themeConfig = EMAIL_THEMES[theme];

  // Generate full HTML email
  const fullHtmlEmail = useMemo(() => {
    const t = EMAIL_THEMES[theme];
    const headerStyle = t.headerBg.startsWith('linear') 
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
    .content { padding: 32px; color: ${t.bodyText}; line-height: 1.6; }
    .content h1, .content h2, .content h3 { color: ${EMAIL_COLORS.bleuNuit}; margin-top: 0; }
    .content a { color: ${t.accent}; }
    .button { display: inline-block; background: ${t.accent}; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0; font-weight: 500; }
    .footer { background: ${t.footerBg}; padding: 24px; text-align: center; font-size: 12px; border-top: 1px solid ${EMAIL_COLORS.lightGrey}; }
    .footer p { color: ${EMAIL_COLORS.grey}; margin: 8px 0; }
    .footer a { color: ${t.accent}; text-decoration: underline; }
  </style>
</head>
<body>
  <div style="background: #f4f4f4; padding: 20px 0;">
    <div class="container">
      <div class="header">
        <img src="${t.logoSrc}" alt="IArche" />
      </div>
      <div class="content">
        ${bodyHtml || '<p>Rédigez votre email ici...</p>'}
      </div>
      <div class="footer">
        <p>Envoyé par ${senderName} • IArche</p>
        <p><a href="{{unsubscribe_url}}">Se désinscrire</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }, [bodyHtml, theme, senderName]);

  const insertVariable = (variable: string) => {
    onBodyChange(bodyHtml + ` ${variable} `);
    setCopiedVar(variable);
    setTimeout(() => setCopiedVar(null), 2000);
    toast({ title: 'Variable insérée', description: variable });
  };

  const copyHtml = () => {
    navigator.clipboard.writeText(fullHtmlEmail);
    toast({ title: 'HTML copié dans le presse-papier' });
  };

  return (
    <div className="space-y-6">
      {/* Subject & Theme row */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="subject">Sujet de l'email</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="Objet de votre email..."
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Thème</Label>
          <Select value={theme} onValueChange={(v) => onThemeChange(v as EmailTheme)}>
            <SelectTrigger className="mt-1.5">
              <Palette className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EMAIL_THEMES).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Variables helper */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center gap-2">
            <Variable className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Variables disponibles</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex flex-wrap gap-2">
            {CAMPAIGN_VARIABLES.map((v) => (
              <Badge
                key={v.key}
                variant="outline"
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => insertVariable(v.key)}
                title={v.desc}
              >
                {copiedVar === v.key ? <Check className="w-3 h-3 mr-1" /> : null}
                {v.key}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Editor Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="editor" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              Éditeur
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Aperçu
            </TabsTrigger>
            <TabsTrigger value="html" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              HTML
            </TabsTrigger>
          </TabsList>
          {activeTab === 'html' && (
            <Button variant="outline" size="sm" onClick={copyHtml}>
              <Copy className="w-4 h-4 mr-2" />
              Copier HTML
            </Button>
          )}
        </div>

        <TabsContent value="editor" className="mt-4">
          <div className="border rounded-lg overflow-hidden">
            <LazyQuill
              value={bodyHtml}
              onChange={onBodyChange}
              modules={QUILL_MODULES}
              formats={QUILL_FORMATS}
              placeholder="Rédigez votre email ici..."
              className="bg-white min-h-[300px]"
            />
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <div className="border rounded-lg overflow-hidden bg-gray-100 p-4">
            <div className="text-xs text-muted-foreground mb-2">
              Sujet : <strong>{subject || '(non défini)'}</strong>
            </div>
            <iframe
              srcDoc={fullHtmlEmail}
              className="w-full min-h-[500px] bg-white rounded border-0"
              title="Email Preview"
            />
          </div>
        </TabsContent>

        <TabsContent value="html" className="mt-4">
          <div className="border rounded-lg overflow-hidden">
            <pre className="p-4 bg-muted text-xs overflow-auto max-h-[500px]">
              <code>{fullHtmlEmail}</code>
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
