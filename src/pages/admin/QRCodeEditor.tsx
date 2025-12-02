import React, { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import QRCode from 'react-qr-code';
import { saveAs } from 'file-saver';
import { COLORS } from '@/components/admin/medias/shared/tokens';

type QRSize = '500' | '1000' | '2000';

const QR_SIZES = {
  '500': { size: 500, label: '500px' },
  '1000': { size: 1000, label: '1000px' },
  '2000': { size: 2000, label: '2000px' },
};

export default function QRCodeEditor() {
  const navigate = useNavigate();
  const qrRef = useRef<HTMLDivElement>(null);
  
  const [url, setUrl] = useState('https://iarche.fr');
  const [qrColor, setQrColor] = useState<string>(COLORS.bleuNuit);
  const [bgColor, setBgColor] = useState<string>('#FFFFFF');
  const [showLogo, setShowLogo] = useState(true);
  const [exportSize, setExportSize] = useState<QRSize>('1000');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!url.trim()) {
      toast.error('Veuillez entrer une URL');
      return;
    }

    setIsExporting(true);
    try {
      const size = QR_SIZES[exportSize].size;
      
      // Create a canvas with the QR code
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      canvas.width = size;
      canvas.height = size;

      // Draw background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, size, size);

      // Get the SVG from the QR component
      const svgElement = qrRef.current?.querySelector('svg');
      if (!svgElement) throw new Error('QR code not found');

      // Clone and resize SVG
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = svgUrl;
      });

      // Draw QR code
      const padding = size * 0.1;
      const qrSize = size - (padding * 2);
      ctx.drawImage(img, padding, padding, qrSize, qrSize);

      URL.revokeObjectURL(svgUrl);

      // Draw logo in center if enabled
      if (showLogo) {
        const logoSize = size * 0.15;
        const logoX = (size - logoSize) / 2;
        const logoY = (size - logoSize) / 2;
        
        // White background for logo
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(logoX - 5, logoY - 5, logoSize + 10, logoSize + 10);
        
        // Draw "IA" text as logo
        ctx.fillStyle = qrColor;
        ctx.font = `bold ${logoSize * 0.6}px Helvetica`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('IA', size / 2, size / 2);
      }

      // Export as PNG
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `qrcode-iarche-${size}px.png`);
          toast.success('QR Code exporté avec succès');
        }
      }, 'image/png', 1.0);

    } catch (error) {
      toast.error('Erreur lors de l\'export');
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const presetColors = [
    { name: 'Bleu Nuit', value: COLORS.bleuNuit },
    { name: 'Terracotta', value: COLORS.terracotta },
    { name: 'Noir', value: '#000000' },
  ];

  const presetBgColors = [
    { name: 'Blanc', value: '#FFFFFF' },
    { name: 'Blanc Cassé', value: COLORS.blancCasse },
    { name: 'Transparent', value: 'transparent' },
  ];

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
              <h1 className="text-2xl font-bold text-foreground">QR Code Brandé</h1>
              <p className="text-muted-foreground">Générez un QR code aux couleurs IArche</p>
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
              <CardTitle>Configuration</CardTitle>
              <CardDescription>Personnalisez votre QR code</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* URL Input */}
              <div className="space-y-2">
                <Label>URL de destination</Label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://iarche.fr"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* QR Color */}
              <div className="space-y-2">
                <Label>Couleur du QR code</Label>
                <div className="flex gap-2">
                  {presetColors.map((color) => (
                    <button
                      key={color.value}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        qrColor === color.value ? 'border-primary scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setQrColor(color.value)}
                      title={color.name}
                    />
                  ))}
                  <Input
                    type="color"
                    value={qrColor}
                    onChange={(e) => setQrColor(e.target.value)}
                    className="w-10 h-10 p-1 cursor-pointer"
                  />
                </div>
              </div>

              {/* Background Color */}
              <div className="space-y-2">
                <Label>Couleur de fond</Label>
                <div className="flex gap-2">
                  {presetBgColors.map((color) => (
                    <button
                      key={color.value}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        bgColor === color.value ? 'border-primary scale-110' : 'border-border'
                      } ${color.value === 'transparent' ? 'bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZjBmMGYwIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNmMGYwZjAiLz48L3N2Zz4=")]' : ''}`}
                      style={{ backgroundColor: color.value === 'transparent' ? undefined : color.value }}
                      onClick={() => setBgColor(color.value)}
                      title={color.name}
                    />
                  ))}
                  <Input
                    type="color"
                    value={bgColor === 'transparent' ? '#FFFFFF' : bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-10 h-10 p-1 cursor-pointer"
                  />
                </div>
              </div>

              {/* Logo Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Logo IArche au centre</Label>
                  <p className="text-xs text-muted-foreground">Ajoute "IA" au centre du QR</p>
                </div>
                <Switch checked={showLogo} onCheckedChange={setShowLogo} />
              </div>

              {/* Export Size */}
              <div className="space-y-2">
                <Label>Taille d'export</Label>
                <Select value={exportSize} onValueChange={(v) => setExportSize(v as QRSize)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(QR_SIZES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Aperçu</CardTitle>
              <CardDescription>
                Export : {QR_SIZES[exportSize].label}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                ref={qrRef}
                className="flex items-center justify-center p-8 rounded-lg border"
                style={{ backgroundColor: bgColor === 'transparent' ? undefined : bgColor }}
              >
                <div className="relative">
                  <QRCode
                    value={url || 'https://iarche.fr'}
                    size={256}
                    fgColor={qrColor}
                    bgColor={bgColor === 'transparent' ? 'transparent' : bgColor}
                    level="H"
                  />
                  {showLogo && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ pointerEvents: 'none' }}
                    >
                      <div 
                        className="px-2 py-1 rounded"
                        style={{ backgroundColor: bgColor === 'transparent' ? '#FFFFFF' : bgColor }}
                      >
                        <span 
                          className="text-2xl font-bold"
                          style={{ color: qrColor }}
                        >
                          IA
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-4">
                Scannez pour tester : {url || 'https://iarche.fr'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
