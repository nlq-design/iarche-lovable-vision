import React, { useState } from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Copy, Check, Eye, Code } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const BrevoHTMLExport = () => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaLink, setCtaLink] = useState('https://iarche.fr');
  const [footerText, setFooterText] = useState('IArche · Bayonne · France');
  const [copied, setCopied] = useState(false);

  const generateHTML = () => {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'IArche'}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF9F7; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF9F7;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header avec gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #1A2B4A 0%, #2D4A7C 50%, #B04A32 100%); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">IArche</h1>
              <div style="width: 60px; height: 3px; background: linear-gradient(90deg, #1A2B4A, #B04A32, #1A2B4A); margin: 15px auto 0;"></div>
            </td>
          </tr>
          
          <!-- Contenu principal -->
          <tr>
            <td style="padding: 40px;">
              ${title ? `<h2 style="margin: 0 0 10px; color: #1A2B4A; font-size: 24px; font-weight: bold;">${title}</h2>` : ''}
              ${subtitle ? `<p style="margin: 0 0 25px; color: #B04A32; font-size: 16px; font-weight: 500;">${subtitle}</p>` : ''}
              ${bodyText ? `<div style="color: #4A5568; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">${bodyText.replace(/\n/g, '<br>')}</div>` : ''}
              
              ${ctaText ? `
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 30px auto;">
                <tr>
                  <td style="background: linear-gradient(135deg, #1A2B4A 0%, #B04A32 100%); border-radius: 6px;">
                    <a href="${ctaLink}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold;">${ctaText}</a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #1A2B4A; padding: 25px 40px; text-align: center;">
              <p style="margin: 0; color: #ffffff; font-size: 14px;">${footerText}</p>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.7); font-size: 12px;">
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
    } catch (error) {
      toast.error('Erreur lors de la copie');
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Export HTML Brevo</h1>
            <p className="text-muted-foreground">Générez du HTML prêt à intégrer dans vos campagnes</p>
          </div>
          <Button onClick={handleCopy} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copié !' : 'Copier le HTML'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulaire */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contenu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre principal</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Nouvelle offre IA"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle">Sous-titre</Label>
                <Input
                  id="subtitle"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Ex: Découvrez nos solutions"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Corps du message</Label>
                <Textarea
                  id="body"
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="Rédigez votre message ici..."
                  rows={6}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ctaText">Texte du bouton</Label>
                  <Input
                    id="ctaText"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="Ex: En savoir plus"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ctaLink">Lien du bouton</Label>
                  <Input
                    id="ctaLink"
                    value={ctaLink}
                    onChange={(e) => setCtaLink(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="footer">Footer</Label>
                <Input
                  id="footer"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="Ex: IArche · Bayonne · France"
                />
              </div>
            </CardContent>
          </Card>

          {/* Aperçu */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Aperçu & Code</CardTitle>
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
    </AdminLayout>
  );
};

export default BrevoHTMLExport;
