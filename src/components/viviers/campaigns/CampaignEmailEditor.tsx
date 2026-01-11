import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LazyQuill } from '@/components/admin/LazyQuill';
import { Eye, Code, Palette, Variable, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateFullEmailHtml, EMAIL_THEMES, type EmailTheme } from './EmailPreviewRenderer';

export type { EmailTheme };

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

  // Generate full HTML email using shared function
  const fullHtmlEmail = useMemo(() => {
    return generateFullEmailHtml(bodyHtml, theme, senderName, {
      '{{first_name}}': 'Jean',
      '{{last_name}}': 'Dupont',
      '{{name}}': 'Jean Dupont',
      '{{email}}': 'jean.dupont@example.com',
      '{{company}}': 'Entreprise Test',
    });
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
