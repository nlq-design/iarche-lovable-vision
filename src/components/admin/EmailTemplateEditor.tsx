import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Save, Eye, Code, Copy, Check, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmailTemplateEditorProps {
  sourceType: string;
  sourceLabel: string;
  initialTemplate: string | null;
  initialSubject: string | null;
  onSave: (template: string, subject: string) => Promise<void>;
}

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #1A2B4A 0%, #2d4a7c 100%); padding: 32px; text-align: center; }
    .header img { height: 40px; margin-bottom: 12px; }
    .header-arc { width: 60px; height: 8px; margin: 0 auto; }
    .content { padding: 32px; color: #374151; line-height: 1.6; }
    .content h2 { color: #1A2B4A; margin-top: 0; }
    .button { display: inline-block; background: #B04A32; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0; }
    .footer { background: #f9fafb; padding: 24px; text-align: center; color: #6b7280; font-size: 14px; }
    .footer a { color: #B04A32; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://iarche.fr/logos/iarche-white.svg" alt="IArche" />
      <img src="https://iarche.fr/assets/arc-iarche-v4.png" alt="" class="header-arc" />
    </div>
    <div class="content">
      <h2>{{title}}</h2>
      <p>Bonjour {{name}},</p>
      <p>{{message}}</p>
      <a href="{{cta_url}}" class="button">{{cta_text}}</a>
    </div>
    <div class="footer">
      <p>IArche - L'IA se construit avec vous</p>
      <p>Bayonne, France</p>
      <p><a href="https://iarche.fr">iarche.fr</a></p>
    </div>
  </div>
</body>
</html>`;

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
  const [template, setTemplate] = useState(initialTemplate || DEFAULT_TEMPLATE);
  const [subject, setSubject] = useState(initialSubject || '');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

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

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopied(variable);
    setTimeout(() => setCopied(null), 2000);
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

  const resetToDefault = () => {
    setTemplate(DEFAULT_TEMPLATE);
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
              <Button variant="outline" onClick={resetToDefault}>
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
