import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import { toPng } from 'html-to-image';
import { saveAs } from 'file-saver';
import { COLORS, FONTS } from '@/components/admin/medias/shared/tokens';
import { HTMLGradientBar } from '@/components/admin/medias/html/HTMLGradientBar';
import type { BarSize } from '@/components/admin/medias/html/tokens';

export default function HeaderDocEditor() {
  const navigate = useNavigate();
  const headerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Bar size control
  const [barSize, setBarSize] = useState<BarSize>('xl');

  // Editable fields
  const [address, setAddress] = useState('64100 Bayonne, France');
  const [phone, setPhone] = useState('+33 6 XX XX XX XX');
  const [email, setEmail] = useState('contact@iarche.fr');
  const [siret, setSiret] = useState('XXX XXX XXX 00000');
  const [website, setWebsite] = useState('iarche.fr');

  const handleExport = async () => {
    if (!headerRef.current) return;

    setIsExporting(true);
    try {
      const dataUrl = await toPng(headerRef.current, {
        width: 2480, // A4 at 300dpi
        height: 400,
        pixelRatio: 2,
        backgroundColor: '#FFFFFF',
      });
      
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      saveAs(blob, 'entete-document-iarche.png');
      toast.success('En-tête exporté avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
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
              <h1 className="text-2xl font-bold text-foreground">En-tête Document</h1>
              <p className="text-muted-foreground">Pour vos documents Word, PDF, factures</p>
            </div>
          </div>
          <Button onClick={handleExport} disabled={isExporting} className="gap-2">
            <Download className="h-4 w-4" />
            Télécharger PNG
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
              <CardDescription>Personnalisez les coordonnées</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Bar size control */}
              <div className="space-y-2">
                <Label>Taille de la barre</Label>
                <RadioGroup
                  value={barSize}
                  onValueChange={(v) => setBarSize(v as BarSize)}
                  className="flex gap-2"
                >
                  {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
                    <div key={size} className="flex items-center">
                      <RadioGroupItem value={size} id={`bar-${size}`} className="peer sr-only" />
                      <Label
                        htmlFor={`bar-${size}`}
                        className="px-3 py-1.5 rounded-md border cursor-pointer text-sm peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground peer-data-[state=checked]:border-primary"
                      >
                        {size.toUpperCase()}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <Label>Adresse</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
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
                <Label>SIRET</Label>
                <Input value={siret} onChange={(e) => setSiret(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Site web</Label>
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Aperçu A4</CardTitle>
              <CardDescription>Export PNG haute résolution (300dpi)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden bg-white">
                {/* Header Preview - scaled down for display */}
                <div 
                  ref={headerRef}
                  className="p-8"
                  style={{
                    fontFamily: FONTS.html.primary,
                  }}
                >
                  <div className="flex items-start justify-between">
                    {/* Logo gradient */}
                    <div>
                      <h1 
                        className="text-3xl font-bold"
                        style={{ 
                          background: `linear-gradient(90deg, ${COLORS.bleuNuit} 0%, ${COLORS.terracotta} 50%, ${COLORS.bleuNuit} 100%)`,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        IArche
                      </h1>
                      <p 
                        className="text-sm mt-1"
                        style={{ color: COLORS.terracotta }}
                      >
                        L'IA se construit avec vous
                      </p>
                    </div>

                    {/* Coordinates */}
                    <div 
                      className="text-right text-sm space-y-0.5"
                      style={{ color: COLORS.foreground }}
                    >
                      <p>{address}</p>
                      <p>{phone}</p>
                      <p>{email}</p>
                      <p className="text-xs" style={{ color: COLORS.muted }}>
                        SIRET : {siret}
                      </p>
                      <p 
                        className="font-medium"
                        style={{ color: COLORS.bleuNuit }}
                      >
                        {website}
                      </p>
                    </div>
                  </div>

                  {/* Gradient bar separator */}
                  <div className="mt-6">
                    <HTMLGradientBar size={barSize} />
                  </div>
                </div>

                {/* Simulated document body */}
                <div className="px-8 pb-8 space-y-4">
                  <div className="h-4 bg-muted/30 rounded w-3/4" />
                  <div className="h-4 bg-muted/30 rounded w-full" />
                  <div className="h-4 bg-muted/30 rounded w-5/6" />
                  <div className="h-4 bg-muted/30 rounded w-2/3" />
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-4 text-center">
                Insérez ce PNG en en-tête de vos documents Word ou Google Docs
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
