import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import ExportActions from '@/components/admin/medias/ExportActions';
import { PngQuality, PNG_QUALITY_OPTIONS, exportToPNG } from '@/lib/mediaExport';
import { Download } from 'lucide-react';
import CharterSelector, { CharterType, getCharterColors } from '@/components/admin/medias/CharterSelector';

const SIGNATURE_WIDTH = 600;
const SIGNATURE_HEIGHT = 200;

// Logo IArche en PNG base64 (version terracotta pour email)
// Utiliser une image simple car les gradients CSS ne fonctionnent pas dans les emails
const LOGO_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAAAoCAYAAAAIeF9DAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF8WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNy4xLWMwMDAgNzkuZWRhMmIzZmFjLCAyMDIxLzExLzE3LTE3OjIzOjE5ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIi8+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4B';

export default function SignatureEditor() {
  const navigate = useNavigate();
  const signatureRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [charter, setCharter] = useState<CharterType>('iarche');
  const [pngQuality, setPngQuality] = useState<PngQuality>(6);
  
  // Get colors based on charter
  const charterColors = getCharterColors(charter);
  
  // Form fields
  const [prenom, setPrenom] = useState('Nicolas');
  const [nom, setNom] = useState('Lara Queralta');
  const [fonction, setFonction] = useState('CEO & Fondateur');
  const [email, setEmail] = useState('nlq@iarche.fr');
  const [telephone, setTelephone] = useState('');
  const [tagline, setTagline] = useState("L'IA se construit avec vous");

  const generateHTML = () => {
    // Inline SVG gradient logo for email compatibility
    const gradientLogoSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="28" viewBox="0 0 80 28">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${charterColors.bleuNuit}"/>
          <stop offset="50%" stop-color="${charterColors.terracotta}"/>
          <stop offset="100%" stop-color="${charterColors.bleuNuit}"/>
        </linearGradient>
      </defs>
      <text x="0" y="22" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="bold" fill="url(#logoGrad)">IArche</text>
    </svg>`;
    const gradientLogoBase64 = btoa(gradientLogoSVG);

    const phoneRow = telephone ? `
      <tr>
        <td style="padding: 2px 0;">
          <a href="tel:${telephone.replace(/\s/g, '')}" style="color: ${charterColors.bleuNuit}; text-decoration: none; font-size: 14px;">${telephone}</a>
        </td>
      </tr>` : '';

    return `<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, 'Helvetica Neue', sans-serif; max-width: 600px;">
  <tr>
    <td style="padding-right: 20px; vertical-align: top; border-right: 3px solid ${charterColors.terracotta};">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-bottom: 8px;">
            <a href="https://iarche.fr" style="text-decoration:none;display:block;">
              <img src="data:image/svg+xml;base64,${gradientLogoBase64}" alt="IArche" width="80" height="28" style="display:block;">
            </a>
          </td>
        </tr>
      </table>
    </td>
    <td style="padding-left: 20px; vertical-align: top;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-bottom: 4px;">
            <span style="font-weight: bold; font-size: 16px; color: ${charterColors.bleuNuit};">${prenom} ${nom.toUpperCase()}</span>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom: 8px;">
            <span style="font-size: 14px; color: #666666;">${fonction} · IArche</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 2px 0;">
            <a href="mailto:${email}" style="color: ${charterColors.terracotta}; text-decoration: none; font-size: 14px;">${email}</a>
          </td>
        </tr>${phoneRow}
        <tr>
          <td style="padding: 2px 0;">
            <a href="https://iarche.fr" style="color: ${charterColors.bleuNuit}; text-decoration: none; font-size: 14px;">iarche.fr</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td colspan="2" style="padding-top: 16px;">
      <span style="font-style: italic; color: #888888; font-size: 12px;">${tagline}</span>
    </td>
  </tr>
</table>`;
  };

  const handleCopyHTML = async () => {
    try {
      await navigator.clipboard.writeText(generateHTML());
      setCopied(true);
      toast.success('HTML copié dans le presse-papiers');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erreur lors de la copie');
    }
  };

  const handleExportPNG = async () => {
    try {
      await exportToPNG(signatureRef, 'signature-email', {
        pixelRatio: pngQuality,
        backgroundColor: '#FFFFFF',
      });
      toast.success(`Signature exportée (${SIGNATURE_WIDTH * pngQuality}×${SIGNATURE_HEIGHT * pngQuality}px)`);
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/medias')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Signature Email</h1>
              <p className="text-muted-foreground">600 × 200 px — Compatible Outlook/Gmail</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCopyHTML} variant="outline" className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copié !' : 'Copier HTML'}
            </Button>
            <Button onClick={handleExportPNG} className="gap-2">
              <Download className="h-4 w-4" />
              PNG (fallback)
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input value={nom} onChange={(e) => setNom(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fonction</Label>
                <Input value={fonction} onChange={(e) => setFonction(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Téléphone (optionnel)</Label>
                <Input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+33 6 00 00 00 00" />
              </div>
              <div className="space-y-2">
                <Label>Tagline</Label>
                <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Charte graphique</Label>
                <CharterSelector value={charter} onChange={setCharter} />
              </div>
              <div className="space-y-2">
                <Label>Qualité PNG</Label>
                <Select value={String(pngQuality)} onValueChange={(v) => setPngQuality(Number(v) as PngQuality)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PNG_QUALITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Aperçu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Visual Preview */}
              <div 
                className="rounded-lg border bg-white p-6"
                style={{ maxWidth: SIGNATURE_WIDTH }}
              >
                <div 
                  ref={signatureRef}
                  style={{
                    fontFamily: "Arial, 'Helvetica Neue', sans-serif",
                    maxWidth: SIGNATURE_WIDTH,
                    backgroundColor: '#FFFFFF',
                    padding: '16px',
                  }}
                >
                  <table cellPadding="0" cellSpacing="0" style={{ borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ 
                          paddingRight: '20px', 
                          verticalAlign: 'top', 
                          borderRight: `3px solid ${charterColors.terracotta}` 
                        }}>
                          <span style={{ 
                            fontSize: '24px', 
                            fontWeight: 'bold', 
                            background: `linear-gradient(90deg, ${charterColors.bleuNuit} 0%, ${charterColors.terracotta} 50%, ${charterColors.bleuNuit} 100%)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}>
                            IArche
                          </span>
                        </td>
                        <td style={{ paddingLeft: '20px', verticalAlign: 'top' }}>
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ 
                              fontWeight: 'bold', 
                              fontSize: '16px', 
                              color: charterColors.bleuNuit 
                            }}>
                              {prenom} {nom.toUpperCase()}
                            </span>
                          </div>
                          <div style={{ marginBottom: '8px' }}>
                            <span style={{ fontSize: '14px', color: '#666666' }}>
                              {fonction} · IArche
                            </span>
                          </div>
                          <div style={{ marginBottom: '2px' }}>
                            <a 
                              href={`mailto:${email}`} 
                              style={{ 
                                color: charterColors.terracotta, 
                                textDecoration: 'none', 
                                fontSize: '14px' 
                              }}
                            >
                              {email}
                            </a>
                          </div>
                          {telephone && (
                            <div style={{ marginBottom: '2px' }}>
                              <a 
                                href={`tel:${telephone.replace(/\s/g, '')}`} 
                                style={{ 
                                  color: charterColors.bleuNuit, 
                                  textDecoration: 'none', 
                                  fontSize: '14px' 
                                }}
                              >
                                {telephone}
                              </a>
                            </div>
                          )}
                          <div>
                            <a 
                              href="https://iarche.fr" 
                              style={{ 
                                color: charterColors.bleuNuit, 
                                textDecoration: 'none', 
                                fontSize: '14px' 
                              }}
                            >
                              iarche.fr
                            </a>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2} style={{ paddingTop: '16px' }}>
                          <span style={{ 
                            fontStyle: 'italic', 
                            color: '#888888', 
                            fontSize: '12px' 
                          }}>
                            {tagline}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* HTML Code Preview */}
              <div className="space-y-2">
                <Label>Code HTML (email-safe)</Label>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-48">
                  {generateHTML()}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
