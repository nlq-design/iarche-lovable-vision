import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Eye, Code, Copy, Check, Sparkles, Palette, User, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmailTemplateEditorProps {
  sourceType: string;
  sourceLabel: string;
  templateType: 'user' | 'admin';
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

// Variables disponibles selon le type de template
const USER_VARIABLES = [
  { key: '{{name}}', desc: 'Nom du destinataire' },
  { key: '{{email}}', desc: 'Email du destinataire' },
  { key: '{{title}}', desc: 'Titre de l\'email' },
  { key: '{{message}}', desc: 'Message personnalisé' },
  { key: '{{cta_url}}', desc: 'URL du bouton' },
  { key: '{{cta_text}}', desc: 'Texte du bouton' },
  { key: '{{date}}', desc: 'Date actuelle' },
  { key: '{{company}}', desc: 'Entreprise (si renseignée)' },
  { key: '{{source_context}}', desc: 'Contexte (solution, atelier, etc.)' },
  { key: '{{file_url}}', desc: 'Lien de téléchargement (livre blanc)' },
];

const ADMIN_VARIABLES = [
  { key: '{{name}}', desc: 'Nom du lead' },
  { key: '{{email}}', desc: 'Email du lead' },
  { key: '{{company}}', desc: 'Entreprise' },
  { key: '{{phone}}', desc: 'Téléphone' },
  { key: '{{source}}', desc: 'Source (contact, newsletter, etc.)' },
  { key: '{{source_context}}', desc: 'Contexte détaillé' },
  { key: '{{message}}', desc: 'Message du lead' },
  { key: '{{date}}', desc: 'Date/heure de réception' },
  { key: '{{lead_id}}', desc: 'ID du lead' },
  { key: '{{cta_url}}', desc: 'Lien vers l\'admin' },
  { key: '{{event_date}}', desc: 'Date événement (ateliers)' },
  { key: '{{event_location}}', desc: 'Lieu événement (ateliers)' },
];

const generateUserTemplate = (theme: EmailTheme, sourceType: string): string => {
  const t = EMAIL_THEMES[theme];
  const isGradient = t.headerBg.includes('gradient');
  const headerStyle = isGradient 
    ? `background: ${t.headerBg};` 
    : `background-color: ${t.headerBg};`;

  // Contenu personnalisé selon la source
  const getContentBySource = () => {
    switch (sourceType) {
      case 'contact':
        return `<p>Nous avons bien reçu votre message et nous vous répondrons dans les plus brefs délais.</p>
        <p>Notre équipe reste à votre disposition pour toute question.</p>`;
      case 'newsletter':
        return `<p>Bienvenue dans notre communauté ! Vous recevrez désormais nos actualités IA et conseils pratiques.</p>
        <ul style="color: ${t.bodyText}; line-height: 1.8;">
          <li><strong>Veille technologique</strong> · L'essentiel des actualités IA</li>
          <li><strong>Conseils pratiques</strong> · Des applications concrètes pour votre PME</li>
          <li><strong>Invitations exclusives</strong> · Ateliers, webinaires et événements</li>
        </ul>`;
      case 'livre-blanc':
        return `<p>Merci pour votre intérêt ! Votre document est prêt à être téléchargé.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="{{file_url}}" class="button">📥 Télécharger le PDF</a>
        </div>`;
      case 'atelier-webinaire':
        return `<p>Votre inscription à <strong>{{source_context}}</strong> est confirmée !</p>
        <p>Vous recevrez un rappel avec le lien de connexion avant l'événement.</p>`;
      case 'solution-contact':
        return `<p>Nous avons bien reçu votre demande concernant <strong>{{source_context}}</strong>.</p>
        <p>Un membre de notre équipe vous contactera rapidement pour organiser une présentation personnalisée.</p>`;
      default:
        return `<p>{{message}}</p>`;
    }
  };

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
      <p>Bonjour <strong>{{name}}</strong>,</p>
      ${getContentBySource()}
      <p style="margin-top: 24px; color: ${EMAIL_COLORS.grey};">À bientôt,<br><strong style="color: ${EMAIL_COLORS.bleuNuit};">L'équipe IArche</strong></p>
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

const generateAdminTemplate = (theme: EmailTheme, sourceType: string): string => {
  const t = EMAIL_THEMES[theme];
  const isGradient = t.headerBg.includes('gradient');
  const headerStyle = isGradient 
    ? `background: ${t.headerBg};` 
    : `background-color: ${t.headerBg};`;

  // Configuration par source
  const sourceConfig: Record<string, { emoji: string; label: string; color: string; bgColor: string }> = {
    'contact': { emoji: '✉️', label: 'Formulaire de Contact', color: '#3B82F6', bgColor: '#DBEAFE' },
    'newsletter': { emoji: '📬', label: 'Inscription Newsletter', color: '#F59E0B', bgColor: '#FEF3C7' },
    'livre-blanc': { emoji: '📚', label: 'Téléchargement Livre Blanc', color: '#8B5CF6', bgColor: '#EDE9FE' },
    'atelier-webinaire': { emoji: '🎓', label: 'Inscription Atelier/Webinaire', color: '#10B981', bgColor: '#D1FAE5' },
    'solution-contact': { emoji: '🚀', label: 'Demande Solution', color: '#B04A32', bgColor: '#FEE2E2' },
  };

  const config = sourceConfig[sourceType] || { emoji: '🎯', label: 'Nouveau Lead', color: t.accent, bgColor: '#FEF3C7' };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background: ${t.bodyBg}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
    .header { ${headerStyle} padding: 32px; text-align: center; }
    .header img { height: 40px; margin-bottom: 16px; }
    .header h1 { color: ${t.headerText}; margin: 0; font-size: 22px; font-weight: 600; }
    .content { padding: 32px; color: ${t.bodyText}; line-height: 1.6; }
    .source-badge { background: ${config.bgColor}; border-left: 4px solid ${config.color}; padding: 12px 16px; margin-bottom: 20px; border-radius: 0 8px 8px 0; }
    .source-badge p { margin: 0; color: ${config.color}; font-size: 14px; font-weight: 500; }
    .info-card { background: ${EMAIL_COLORS.blancCasse}; border-left: 4px solid ${t.accent}; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 16px 0; }
    .info-card p { margin: 5px 0; }
    .info-card a { color: ${t.accent}; font-weight: 500; }
    .button { display: inline-block; background: ${config.color}; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; }
    .footer { background: ${t.footerBg}; padding: 24px; text-align: center; font-size: 12px; border-top: 1px solid ${EMAIL_COLORS.lightGrey}; }
    .footer p { color: ${EMAIL_COLORS.grey}; margin: 4px 0; }
    .footer a { color: ${t.accent}; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${t.logoSrc}" alt="IArche" />
      <h1>${config.emoji} ${config.label}</h1>
    </div>
    <div class="content">
      <div class="source-badge">
        <p>${config.emoji} ${config.label} <span style="background: #DC2626; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-left: 8px;">À TRAITER</span></p>
        <p style="font-size: 12px; opacity: 0.8; margin-top: 4px;">Reçu le {{date}}</p>
      </div>
      
      <h3 style="color: ${EMAIL_COLORS.bleuNuit}; font-size: 16px; margin: 0 0 12px 0;">👤 Informations</h3>
      <div class="info-card">
        <p><strong>Nom:</strong> {{name}}</p>
        <p><strong>Email:</strong> <a href="mailto:{{email}}">{{email}}</a></p>
        <p><strong>Société:</strong> {{company}}</p>
        <p><strong>Téléphone:</strong> <a href="tel:{{phone}}">{{phone}}</a></p>
        <p><strong>Contexte:</strong> {{source_context}}</p>
      </div>
      
      <h3 style="color: ${EMAIL_COLORS.bleuNuit}; font-size: 16px; margin: 20px 0 12px 0;">💬 Message</h3>
      <div class="info-card">
        <p style="white-space: pre-wrap;">{{message}}</p>
      </div>
      
      <div style="text-align: center; margin: 24px 0;">
        <a href="{{cta_url}}" class="button">Voir dans l'admin →</a>
      </div>
      
      <p style="color: ${EMAIL_COLORS.grey}; font-size: 11px; text-align: center;">
        Lead ID: <code style="background: #F3F4F6; padding: 2px 6px; border-radius: 3px; font-size: 10px;">{{lead_id}}</code>
      </p>
    </div>
    <div class="footer">
      <img src="${t.logoSrc}" alt="IArche" style="height: 24px; margin-bottom: 8px; opacity: 0.8;" />
      <p>IArche · Agence IA · Bayonne, France</p>
      <p><a href="https://iarche.fr">iarche.fr</a> · <a href="mailto:nlq@iarche.fr">nlq@iarche.fr</a></p>
    </div>
  </div>
</body>
</html>`;
};

export function EmailTemplateEditor({ 
  sourceType, 
  sourceLabel, 
  templateType,
  initialTemplate, 
  initialSubject,
  onSave 
}: EmailTemplateEditorProps) {
  const [selectedTheme, setSelectedTheme] = useState<EmailTheme>('bleu-nuit');
  const [template, setTemplate] = useState(
    initialTemplate || (templateType === 'admin' 
      ? generateAdminTemplate('bleu-nuit', sourceType)
      : generateUserTemplate('bleu-nuit', sourceType))
  );
  const [subject, setSubject] = useState(initialSubject || '');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  const variables = templateType === 'admin' ? ADMIN_VARIABLES : USER_VARIABLES;
  const Icon = templateType === 'admin' ? Shield : User;
  const typeLabel = templateType === 'admin' ? 'Notification Admin' : 'Confirmation Prospect';
  const typeColor = templateType === 'admin' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700';

  const handleThemeChange = (theme: EmailTheme) => {
    setSelectedTheme(theme);
    setTemplate(templateType === 'admin' 
      ? generateAdminTemplate(theme, sourceType)
      : generateUserTemplate(theme, sourceType)
    );
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
    const textarea = document.querySelector(`textarea[data-template="${sourceType}-${templateType}"]`) as HTMLTextAreaElement;
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
      .replace(/\{\{title\}\}/g, templateType === 'admin' ? 'Nouveau Lead' : 'Confirmation')
      .replace(/\{\{message\}\}/g, 'Bonjour, je suis intéressé par vos services IA pour notre PME.')
      .replace(/\{\{cta_url\}\}/g, templateType === 'admin' ? 'https://iarche.fr/admin/leads' : 'https://iarche.fr')
      .replace(/\{\{cta_text\}\}/g, 'Voir dans l\'admin')
      .replace(/\{\{date\}\}/g, new Date().toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }))
      .replace(/\{\{company\}\}/g, 'Entreprise SAS')
      .replace(/\{\{phone\}\}/g, '06 12 34 56 78')
      .replace(/\{\{source\}\}/g, sourceType)
      .replace(/\{\{source_context\}\}/g, sourceLabel)
      .replace(/\{\{lead_id\}\}/g, 'abc-123-xyz')
      .replace(/\{\{file_url\}\}/g, 'https://iarche.fr/livres-blancs/exemple.pdf')
      .replace(/\{\{event_date\}\}/g, '15 janvier 2025')
      .replace(/\{\{event_location\}\}/g, 'En ligne (Zoom)');
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            {sourceLabel}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={typeColor}>
              {templateType === 'admin' ? '→ nlq@iarche.fr' : '→ Prospect'}
            </Badge>
            <Badge variant="outline">{typeLabel}</Badge>
          </div>
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
            placeholder={templateType === 'admin' ? 'Ex: 🎯 Nouveau lead - {{name}}' : 'Ex: ✅ Confirmation - IArche'}
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
                {variables.map((v) => (
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
              data-template={`${sourceType}-${templateType}`}
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
              <Button variant="outline" onClick={() => handleThemeChange(selectedTheme)}>
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