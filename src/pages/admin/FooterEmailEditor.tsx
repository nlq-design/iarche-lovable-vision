import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Linkedin, Mail, Phone, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import { COLORS } from '@/components/admin/medias/shared/tokens';
import { HTMLLogoArc } from '@/components/admin/medias/html/HTMLLogoArc';
import { IARCHE_SIZES, type ArcSize } from '@/components/admin/medias/html/tokens';

export default function FooterEmailEditor() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  // Arc size control
  const [barSize, setBarSize] = useState<ArcSize>('lg');

  // Editable fields
  const [name, setName] = useState('Nicolas');
  const [title, setTitle] = useState('Fondateur');
  const [phone, setPhone] = useState('+33 6 XX XX XX XX');
  const [email, setEmail] = useState('contact@iarche.fr');
  const [linkedinUrl, setLinkedinUrl] = useState('https://linkedin.com/company/iarche');
  const [address, setAddress] = useState('64100 Bayonne, France');
  const [siret, setSiret] = useState('XXX XXX XXX 00000');

  // Generate HTML code
  const generateHTML = () => {
    // Get bar dimensions from the selected size
    const barDimensions = IARCHE_SIZES.bar[barSize];
    
    // Inline SVG gradient bar for email compatibility
    const gradientBarSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${barDimensions.width}" height="${barDimensions.height}" viewBox="0 0 ${barDimensions.width} ${barDimensions.height}">
      <defs>
        <linearGradient id="barGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#1A2B4A"/>
          <stop offset="50%" stop-color="#B04A32"/>
          <stop offset="100%" stop-color="#1A2B4A"/>
        </linearGradient>
      </defs>
      <rect width="${barDimensions.width}" height="${barDimensions.height}" rx="${barDimensions.height / 2}" fill="url(#barGrad)"/>
    </svg>`;
    const gradientBarBase64 = btoa(gradientBarSVG);
    
    // Inline SVG gradient logo for email compatibility
    const gradientLogoSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="28" viewBox="0 0 80 28">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#1A2B4A"/>
          <stop offset="50%" stop-color="#B04A32"/>
          <stop offset="100%" stop-color="#1A2B4A"/>
        </linearGradient>
      </defs>
      <text x="0" y="22" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="bold" fill="url(#logoGrad)">IArche</text>
    </svg>`;
    const gradientLogoBase64 = btoa(gradientLogoSVG);
    
    return `<!--[if mso]>
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" align="center">
<tr><td>
<![endif]-->
<table role="presentation" style="max-width:600px;width:100%;margin:0 auto;font-family:Arial,Helvetica,sans-serif;border-collapse:collapse;">
  <tr>
    <td style="padding:24px 0;">
      <!-- Logo Gradient -->
      <a href="https://iarche.fr" style="text-decoration:none;display:block;">
        <img src="data:image/svg+xml;base64,${gradientLogoBase64}" alt="IArche" width="80" height="28" style="display:block;">
      </a>
      
      <!-- Gradient Bar below logo -->
      <img src="data:image/svg+xml;base64,${gradientBarBase64}" alt="" width="${barDimensions.width}" height="${barDimensions.height}" style="display:block;margin-top:8px;margin-bottom:16px;">
      
      <!-- Contact Info -->
      <table role="presentation" width="100%" style="margin-top:16px;">
        <tr>
          <td>
            <p style="margin:0;font-size:16px;font-weight:600;color:#1A2B4A;">${name}</p>
            <p style="margin:4px 0 0;font-size:14px;color:#B04A32;">${title}</p>
          </td>
        </tr>
      </table>
      
      <!-- Links -->
      <table role="presentation" width="100%" style="margin-top:12px;">
        <tr>
          <td style="font-size:14px;color:#4A5568;">
            <p style="margin:0;">
              <a href="tel:${phone.replace(/\s/g, '')}" style="color:#4A5568;text-decoration:none;">${phone}</a>
            </p>
            <p style="margin:4px 0 0;">
              <a href="mailto:${email}" style="color:#1A2B4A;text-decoration:none;">${email}</a>
            </p>
          </td>
        </tr>
      </table>
      
      <!-- Social -->
      <table role="presentation" width="100%" style="margin-top:16px;">
        <tr>
          <td>
            <a href="${linkedinUrl}" style="display:inline-block;width:32px;height:32px;background-color:#1A2B4A;border-radius:4px;text-align:center;line-height:32px;text-decoration:none;">
              <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" width="18" height="18" style="vertical-align:middle;filter:brightness(0) invert(1);">
            </a>
            <a href="https://iarche.fr" style="display:inline-block;margin-left:8px;width:32px;height:32px;background-color:#B04A32;border-radius:4px;text-align:center;line-height:32px;text-decoration:none;">
              <img src="https://cdn-icons-png.flaticon.com/512/1006/1006771.png" alt="Website" width="18" height="18" style="vertical-align:middle;filter:brightness(0) invert(1);">
            </a>
          </td>
        </tr>
      </table>
      
      <!-- Baseline -->
      <table role="presentation" width="100%" style="margin-top:16px;">
        <tr>
          <td>
            <p style="margin:0;font-size:14px;font-style:italic;color:#6B7280;">
              L'IA se construit avec vous
            </p>
          </td>
        </tr>
      </table>
      
      <!-- Legal -->
      <table role="presentation" width="100%" style="margin-top:16px;padding-top:16px;border-top:1px solid #E5E7EB;">
        <tr>
          <td>
            <p style="margin:0;font-size:11px;color:#9CA3AF;">
              IArche · ${address} · SIRET ${siret}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<!--[if mso]>
</td></tr></table>
<![endif]-->`;
  };

  const handleCopyHTML = async () => {
    try {
      await navigator.clipboard.writeText(generateHTML());
      setCopied(true);
      toast.success('Code HTML copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erreur lors de la copie');
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/medias')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Footer Email HTML</h1>
              <p className="text-muted-foreground">Pour newsletters et emails marketing</p>
            </div>
          </div>
          <Button onClick={handleCopyHTML} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copié !' : 'Copier HTML'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>Personnalisez le pied de page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Arc size control */}
              <div className="space-y-2">
                <Label>Taille de l'arc</Label>
                <RadioGroup
                  value={barSize}
                  onValueChange={(v) => setBarSize(v as ArcSize)}
                  className="flex gap-2"
                >
                  {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
                    <div key={size} className="flex items-center">
                      <RadioGroupItem value={size} id={`footer-bar-${size}`} className="peer sr-only" />
                      <Label
                        htmlFor={`footer-bar-${size}`}
                        className="px-3 py-1.5 rounded-md border cursor-pointer text-sm peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground peer-data-[state=checked]:border-primary"
                      >
                        {size.toUpperCase()}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Titre</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>URL LinkedIn</Label>
                <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Adresse</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>SIRET</Label>
                <Input value={siret} onChange={(e) => setSiret(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Preview - Desktop & Mobile côte à côte */}
          <Card>
            <CardHeader>
              <CardTitle>Aperçu</CardTitle>
              <CardDescription>Desktop et Mobile côte à côte</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Desktop Preview */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Desktop</p>
                  <div className="border rounded-lg bg-white p-6" style={{ maxWidth: '600px' }}>
                    <div style={{ paddingTop: '24px' }}>
                      {/* Logo gradient */}
                      <div>
                        <a href="#" style={{ textDecoration: 'none' }}>
                          <span style={{ 
                            fontSize: '24px', 
                            fontWeight: 'bold', 
                            background: `linear-gradient(90deg, ${COLORS.bleuNuit} 0%, ${COLORS.terracotta} 50%, ${COLORS.bleuNuit} 100%)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}>
                            IArche
                          </span>
                        </a>
                      </div>
                      
                      {/* Arc below logo */}
                      <div style={{ marginTop: '8px' }}>
                        <HTMLLogoArc size={barSize} />
                      </div>

                      {/* Contact */}
                      <div style={{ marginTop: '16px' }}>
                        <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: COLORS.bleuNuit }}>
                          {name}
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: '14px', color: COLORS.terracotta }}>
                          {title}
                        </p>
                      </div>

                      {/* Links */}
                      <div style={{ marginTop: '12px', fontSize: '14px', color: '#4A5568' }}>
                        <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Phone className="h-4 w-4" /> {phone}
                        </p>
                        <p style={{ margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Mail className="h-4 w-4" /> {email}
                        </p>
                      </div>

                      {/* Social */}
                      <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                        <a 
                          href={linkedinUrl}
                          className="flex items-center justify-center w-8 h-8 rounded"
                          style={{ backgroundColor: COLORS.bleuNuit }}
                        >
                          <Linkedin className="h-4 w-4 text-white" />
                        </a>
                        <a 
                          href="https://iarche.fr"
                          className="flex items-center justify-center w-8 h-8 rounded"
                          style={{ backgroundColor: COLORS.terracotta }}
                        >
                          <Globe className="h-4 w-4 text-white" />
                        </a>
                      </div>

                      {/* Baseline */}
                      <p style={{ marginTop: '16px', fontSize: '14px', fontStyle: 'italic', color: '#6B7280' }}>
                        L'IA se construit avec vous
                      </p>

                      {/* Legal */}
                      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                        <p style={{ margin: 0, fontSize: '11px', color: '#9CA3AF' }}>
                          IArche · {address} · SIRET {siret}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Preview */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Mobile</p>
                  <div className="border rounded-lg bg-white p-4" style={{ maxWidth: '320px' }}>
                    <div style={{ paddingTop: '16px' }}>
                      {/* Logo gradient */}
                      <div>
                        <span style={{ 
                          fontSize: '20px', 
                          fontWeight: 'bold', 
                          background: `linear-gradient(90deg, ${COLORS.bleuNuit} 0%, ${COLORS.terracotta} 50%, ${COLORS.bleuNuit} 100%)`,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}>
                          IArche
                        </span>
                      </div>
                      
                      {/* Arc below logo - one size smaller for mobile */}
                      <div style={{ marginTop: '6px' }}>
                        <HTMLLogoArc size={barSize === 'sm' ? 'sm' : barSize === 'md' ? 'sm' : barSize === 'lg' ? 'md' : 'lg'} />
                      </div>

                      {/* Contact */}
                      <div style={{ marginTop: '12px' }}>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: COLORS.bleuNuit }}>
                          {name}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: COLORS.terracotta }}>
                          {title}
                        </p>
                      </div>

                      {/* Links */}
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#4A5568' }}>
                        <p style={{ margin: 0 }}>{phone}</p>
                        <p style={{ margin: '2px 0 0' }}>{email}</p>
                      </div>

                      {/* Social */}
                      <div style={{ marginTop: '12px', display: 'flex', gap: '6px' }}>
                        <div 
                          className="flex items-center justify-center w-7 h-7 rounded"
                          style={{ backgroundColor: COLORS.bleuNuit }}
                        >
                          <Linkedin className="h-3 w-3 text-white" />
                        </div>
                        <div 
                          className="flex items-center justify-center w-7 h-7 rounded"
                          style={{ backgroundColor: COLORS.terracotta }}
                        >
                          <Globe className="h-3 w-3 text-white" />
                        </div>
                      </div>

                      {/* Baseline */}
                      <p style={{ marginTop: '12px', fontSize: '12px', fontStyle: 'italic', color: '#6B7280' }}>
                        L'IA se construit avec vous
                      </p>

                      {/* Legal */}
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
                        <p style={{ margin: 0, fontSize: '10px', color: '#9CA3AF' }}>
                          IArche · {address}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
