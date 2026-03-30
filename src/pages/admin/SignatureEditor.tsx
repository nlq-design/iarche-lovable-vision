import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import { PngQuality, PNG_QUALITY_OPTIONS, exportToPNG } from '@/lib/mediaExport';
import { IARCHE_COLORS } from '@/components/admin/medias/html';

const SIGNATURE_WIDTH = 600;
const SIGNATURE_HEIGHT = 200;

export default function SignatureEditor() {
  const navigate = useNavigate();
  const signatureRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [pngQuality, setPngQuality] = useState<PngQuality>(6);
  
  const c = IARCHE_COLORS;
  
  const [prenom, setPrenom] = useState('Nicolas');
  const [nom, setNom] = useState('Lara Queralta');
  const [fonction, setFonction] = useState('CEO & Fondateur');
  const [email, setEmail] = useState('nlq@iarche.fr');
  const [telephone, setTelephone] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [tagline, setTagline] = useState("L'IA se construit avec vous");

  const logoUrlLocal = `${window.location.origin}/logos/iarche-main.png`;
  const logoUrlPublished = 'https://iarche-lovable-vision.lovable.app/logos/iarche-main.png';

  const generateHTML = () => {
    const phoneRow = telephone ? `
        <tr>
          <td style="padding: 3px 0;">
            <a href="tel:${telephone.replace(/\s/g, '')}" style="color: ${c.bleuNuit}; text-decoration: none; font-size: 13px;">${telephone}</a>
          </td>
        </tr>` : '';

    const linkedinRow = linkedin ? `
        <tr>
          <td style="padding: 3px 0;">
            <a href="https://linkedin.com/in/${linkedin}" style="color: ${c.bleuNuit}; text-decoration: none; font-size: 13px;">LinkedIn</a>
          </td>
        </tr>` : '';

    return `<table cellpadding="0" cellspacing="0" border="0" align="left" style="font-family: Arial, 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0;">
  <tr>
    <td style="padding-right: 20px; vertical-align: middle; border-right: 3px solid ${c.terracotta};">
      <a href="https://iarche.fr" style="text-decoration:none;display:block;">
        <img src="${logoUrlPublished}" alt="IArche" height="48" border="0" style="display:block;border:0;outline:none;text-decoration:none;height:48px;">
      </a>
    </td>
    <td style="padding-left: 20px; vertical-align: top;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-bottom: 2px;">
            <span style="font-weight: bold; font-size: 17px; color: ${c.bleuNuit};">${prenom} ${nom.toUpperCase()}</span>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom: 10px;">
            <span style="font-size: 13px; color: #555555;">${fonction} · IArche</span>
          </td>
        </tr>
        <tr>
          <td style="padding: 3px 0;">
            <a href="mailto:${email}" style="color: ${c.terracotta}; text-decoration: none; font-size: 13px;">${email}</a>
          </td>
        </tr>${phoneRow}
        <tr>
          <td style="padding: 3px 0;">
            <a href="https://iarche.fr" style="color: ${c.bleuNuit}; text-decoration: none; font-size: 13px;">iarche.fr</a>
          </td>
        </tr>${linkedinRow}
      </table>
    </td>
  </tr>
  <tr>
    <td colspan="2" style="padding-top: 12px; border-top: 1px solid #E0DDD8;">
      <span style="font-style: italic; color: #999999; font-size: 11px;">— ${tagline}</span>
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

  const handleCopyForGmail = async () => {
    try {
      const html = generateHTML();
      const blob = new Blob([html], { type: 'text/html' });
      const plainBlob = new Blob([' '], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blob,
          'text/plain': plainBlob,
        }),
      ]);
      toast.success('Signature copiée ! Va dans Gmail → Paramètres → Signature → Ctrl+V');
    } catch (error) {
      toast.error('Erreur — essaie avec Chrome');
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
      toast.error("Erreur lors de l'export");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
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
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleCopyForGmail} className="gap-2">
              <Copy className="h-4 w-4" />
              Copier pour Gmail
            </Button>
            <Button onClick={handleCopyHTML} variant="outline" className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copié !' : 'Copier HTML'}
            </Button>
            <Button onClick={handleExportPNG} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              PNG
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
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
                <Label>LinkedIn (optionnel)</Label>
                <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="pseudo (ex: nicolaslq)" />
              </div>
              <div className="space-y-2">
                <Label>Tagline</Label>
                <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Qualité PNG</Label>
                <Select value={String(pngQuality)} onValueChange={(v) => setPngQuality(Number(v) as PngQuality)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PNG_QUALITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Aperçu</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border bg-white p-6" style={{ maxWidth: SIGNATURE_WIDTH }}>
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
                          verticalAlign: 'middle',
                          borderRight: `3px solid ${c.terracotta}`,
                        }}>
                          <img
                            src={logoUrlLocal}
                            crossOrigin="anonymous"
                            alt="IArche"
                            style={{ height: '48px', display: 'block' }}
                          />
                        </td>
                        <td style={{ paddingLeft: '20px', verticalAlign: 'top' }}>
                          <div style={{ marginBottom: '2px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '17px', color: c.bleuNuit }}>
                              {prenom} {nom.toUpperCase()}
                            </span>
                          </div>
                          <div style={{ marginBottom: '10px' }}>
                            <span style={{ fontSize: '13px', color: '#555555' }}>
                              {fonction} · IArche
                            </span>
                          </div>
                          <div style={{ marginBottom: '3px' }}>
                            <a href={`mailto:${email}`} style={{ color: c.terracotta, textDecoration: 'none', fontSize: '13px' }}>
                              {email}
                            </a>
                          </div>
                          {telephone && (
                            <div style={{ marginBottom: '3px' }}>
                              <a href={`tel:${telephone.replace(/\s/g, '')}`} style={{ color: c.bleuNuit, textDecoration: 'none', fontSize: '13px' }}>
                                {telephone}
                              </a>
                            </div>
                          )}
                          <div style={{ marginBottom: '3px' }}>
                            <a href="https://iarche.fr" style={{ color: c.bleuNuit, textDecoration: 'none', fontSize: '13px' }}>
                              iarche.fr
                            </a>
                          </div>
                          {linkedin && (
                            <div style={{ marginBottom: '3px' }}>
                              <a href={`https://linkedin.com/in/${linkedin}`} style={{ color: c.bleuNuit, textDecoration: 'none', fontSize: '13px' }}>
                                LinkedIn
                              </a>
                            </div>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2} style={{ paddingTop: '12px', borderTop: '1px solid #E0DDD8' }}>
                          <span style={{ fontStyle: 'italic', color: '#999999', fontSize: '11px' }}>
                            — {tagline}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

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
