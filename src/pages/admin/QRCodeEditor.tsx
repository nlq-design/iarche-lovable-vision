import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Link2, Copy, Save, History, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import AdminLayout from '@/components/layouts/AdminLayout';
import QRCode from 'react-qr-code';
import { saveAs } from 'file-saver';
import { COLORS } from '@/components/admin/medias/shared/tokens';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type QRSize = '500' | '1000' | '2000';

const QR_SIZES = {
  '500': { size: 500, label: '500px' },
  '1000': { size: 1000, label: '1000px' },
  '2000': { size: 2000, label: '2000px' },
};

interface SavedQRCode {
  name: string;
  created_at: string;
  url: string;
  metadata: {
    target_url: string;
    qr_color: string;
    bg_color: string;
    show_logo: boolean;
    size: number;
  };
}

export default function QRCodeEditor() {
  const navigate = useNavigate();
  const qrRef = useRef<HTMLDivElement>(null);
  
  const [url, setUrl] = useState('https://iarche.fr');
  const [qrColor, setQrColor] = useState<string>(COLORS.bleuNuit);
  const [bgColor, setBgColor] = useState<string>('#FFFFFF');
  const [showLogo, setShowLogo] = useState(true);
  const [exportSize, setExportSize] = useState<QRSize>('1000');
  const [isExporting, setIsExporting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedQRCodes, setSavedQRCodes] = useState<SavedQRCode[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Generate QR code as blob
  const generateQRBlob = useCallback(async (): Promise<Blob | null> => {
    if (!url.trim()) {
      toast.error('Veuillez entrer une URL');
      return null;
    }

    const size = QR_SIZES[exportSize].size;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    canvas.width = size;
    canvas.height = size;

    // Draw background
    ctx.fillStyle = bgColor === 'transparent' ? '#FFFFFF' : bgColor;
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

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
    });
  }, [url, qrColor, bgColor, showLogo, exportSize]);

  // Export as download
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await generateQRBlob();
      if (blob) {
        const size = QR_SIZES[exportSize].size;
        saveAs(blob, `qrcode-iarche-${size}px.png`);
        toast.success('QR Code téléchargé');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'export');
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  // Copy to clipboard
  const handleCopyToClipboard = async () => {
    setIsCopying(true);
    try {
      const blob = await generateQRBlob();
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        toast.success('QR Code copié dans le presse-papier');
      }
    } catch (error) {
      toast.error('Impossible de copier dans le presse-papier');
      console.error(error);
    } finally {
      setIsCopying(false);
    }
  };

  // Save to Supabase Storage
  const handleSaveToStorage = async () => {
    setIsSaving(true);
    try {
      const blob = await generateQRBlob();
      if (!blob) return;

      const size = QR_SIZES[exportSize].size;
      const timestamp = Date.now();
      const fileName = `qrcode-${timestamp}-${size}px.png`;

      const { error: uploadError } = await supabase.storage
        .from('qr-codes')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      toast.success('QR Code sauvegardé dans le storage');
      loadSavedQRCodes();
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // Load saved QR codes from storage
  const loadSavedQRCodes = async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase.storage
        .from('qr-codes')
        .list('', { limit: 50, sortBy: { column: 'created_at', order: 'desc' } });

      if (error) throw error;

      const qrCodes: SavedQRCode[] = (data || [])
        .filter(file => file.name.endsWith('.png'))
        .map(file => {
          const { data: urlData } = supabase.storage.from('qr-codes').getPublicUrl(file.name);
          return {
            name: file.name,
            created_at: file.created_at || '',
            url: urlData.publicUrl,
            metadata: {
              target_url: '',
              qr_color: '',
              bg_color: '',
              show_logo: true,
              size: parseInt(file.name.match(/(\d+)px/)?.[1] || '1000'),
            },
          };
        });

      setSavedQRCodes(qrCodes);
    } catch (error) {
      console.error('Error loading QR codes:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Delete a saved QR code
  const handleDeleteQRCode = async (fileName: string) => {
    try {
      const { error } = await supabase.storage.from('qr-codes').remove([fileName]);
      if (error) throw error;
      toast.success('QR Code supprimé');
      loadSavedQRCodes();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
      console.error(error);
    }
  };

  useEffect(() => {
    loadSavedQRCodes();
  }, []);

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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/medias')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">QR Code Brandé</h1>
              <p className="text-muted-foreground">Générez un QR code aux couleurs IArche</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleCopyToClipboard} disabled={isCopying} className="gap-2">
              <Copy className="h-4 w-4" />
              Copier
            </Button>
            <Button variant="outline" onClick={handleSaveToStorage} disabled={isSaving} className="gap-2">
              <Save className="h-4 w-4" />
              Sauvegarder
            </Button>
            <Button onClick={handleExport} disabled={isExporting} className="gap-2">
              <Download className="h-4 w-4" />
              Télécharger
            </Button>
          </div>
        </div>

        <Tabs defaultValue="generator" className="space-y-6">
          <TabsList>
            <TabsTrigger value="generator">Générateur</TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Historique ({savedQRCodes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generator">
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
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>QR Codes sauvegardés</CardTitle>
                <CardDescription>Historique des QR codes générés et sauvegardés dans le storage</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingHistory ? (
                  <div className="text-center py-8 text-muted-foreground">Chargement...</div>
                ) : savedQRCodes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun QR code sauvegardé. Utilisez le bouton "Sauvegarder" pour en ajouter.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {savedQRCodes.map((qr) => (
                      <div 
                        key={qr.name} 
                        className="border rounded-lg p-3 space-y-2 hover:border-primary transition-colors"
                      >
                        <img 
                          src={qr.url} 
                          alt={qr.name} 
                          className="w-full aspect-square object-contain bg-white rounded"
                        />
                        <div className="text-xs text-muted-foreground truncate" title={qr.name}>
                          {qr.metadata.size}px
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {qr.created_at && format(new Date(qr.created_at), 'dd MMM yyyy', { locale: fr })}
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="flex-1 h-8"
                            onClick={() => window.open(qr.url, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="flex-1 h-8"
                            onClick={() => saveAs(qr.url, qr.name)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="flex-1 h-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteQRCode(qr.name)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
