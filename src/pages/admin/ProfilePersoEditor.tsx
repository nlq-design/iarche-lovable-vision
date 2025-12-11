import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, User, Linkedin, Twitter, Instagram, Facebook, Upload, X, Download, Circle } from 'lucide-react';
import { COLORS_PERSO, GRADIENTS_PERSO, type GradientTypePerso } from '@/components/admin/medias/perso/tokensPerso';
import { exportToPNG } from '@/lib/mediaExport';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { toPng } from 'html-to-image';

// Dimensions pour chaque plateforme
const PLATFORM_SIZES = {
  linkedin: { size: 400, name: 'LinkedIn', icon: Linkedin },
  twitter: { size: 400, name: 'Twitter/X', icon: Twitter },
  instagram: { size: 320, name: 'Instagram', icon: Instagram },
  facebook: { size: 180, name: 'Facebook', icon: Facebook },
};

// Canvas de travail (le plus grand)
const CANVAS_SIZE = 800;

const ProfilePersoEditor = () => {
  const navigate = useNavigate();
  const previewRef = useRef<HTMLDivElement>(null);
  
  // Form state
  const [textMode, setTextMode] = useState<'initials' | 'custom'>('initials');
  const [initials, setInitials] = useState('NL');
  const [customText, setCustomText] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light' | 'gradient'>('gradient');
  const [gradientType, setGradientType] = useState<GradientTypePerso>('diagonal');
  const [showCircleGuide, setShowCircleGuide] = useState(true);
  const [fontSize, setFontSize] = useState(280);
  const [quality, setQuality] = useState<number>(2);

  const displayText = textMode === 'initials' ? (initials || 'NL') : (customText || 'Texte');

  const getBackground = () => {
    switch (theme) {
      case 'light':
        return COLORS_PERSO.blancCasse;
      case 'dark':
        return COLORS_PERSO.bleuProfond;
      case 'gradient':
        return GRADIENTS_PERSO[gradientType]?.css || GRADIENTS_PERSO.diagonal.css;
      default:
        return GRADIENTS_PERSO.diagonal.css;
    }
  };

  const getTextColor = () => {
    return theme === 'light' ? COLORS_PERSO.bleuProfond : COLORS_PERSO.white;
  };

  // Upload photo
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Export single platform
  const handleExportSingle = async (platform: keyof typeof PLATFORM_SIZES) => {
    if (!previewRef.current) return;
    
    const element = previewRef.current;
    const originalTransform = element.style.transform;
    element.style.transform = 'none';
    
    await document.fonts.ready;
    
    try {
      const { size, name } = PLATFORM_SIZES[platform];
      const scale = size / CANVAS_SIZE;
      
      const dataUrl = await toPng(element, {
        pixelRatio: quality * scale,
        cacheBust: true,
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        skipFonts: false,
      });
      
      const link = document.createElement('a');
      link.download = `profile-${platform}-${size}px.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success(`Photo de profil ${name} exportée`);
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    } finally {
      element.style.transform = originalTransform;
    }
  };

  // Export all platforms as ZIP
  const handleExportAll = async () => {
    if (!previewRef.current) return;
    
    const element = previewRef.current;
    const originalTransform = element.style.transform;
    element.style.transform = 'none';
    
    await document.fonts.ready;
    
    const zip = new JSZip();
    
    try {
      for (const [platform, { size, name }] of Object.entries(PLATFORM_SIZES)) {
        const scale = size / CANVAS_SIZE;
        
        const dataUrl = await toPng(element, {
          pixelRatio: quality * scale,
          cacheBust: true,
          width: CANVAS_SIZE,
          height: CANVAS_SIZE,
          skipFonts: false,
        });
        
        // Convert data URL to blob
        const base64 = dataUrl.split(',')[1];
        zip.file(`profile-${platform}-${size}px.png`, base64, { base64: true });
      }
      
      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.download = 'photos-profil-multi-reseaux.zip';
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      
      toast.success('Toutes les photos de profil exportées');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    } finally {
      element.style.transform = originalTransform;
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/medias-perso')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Photo de Profil</h1>
              <p className="text-muted-foreground text-sm flex items-center gap-2">
                Multi-réseaux
                <Linkedin className="h-4 w-4" />
                <Twitter className="h-4 w-4" />
                <Instagram className="h-4 w-4" />
                <Facebook className="h-4 w-4" />
              </p>
            </div>
          </div>
          <Button onClick={handleExportAll}>
            <Download className="h-4 w-4 mr-2" />
            Exporter tout (ZIP)
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label>Photo de profil</Label>
                  <div className="mt-2 flex items-center gap-4">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="flex-1"
                    />
                    {photoUrl && (
                      <Button variant="ghost" size="icon" onClick={() => setPhotoUrl('')}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ou utilisez des initiales ci-dessous
                  </p>
                </div>

                {!photoUrl && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label>Mode texte</Label>
                      <Select value={textMode} onValueChange={(v) => setTextMode(v as 'initials' | 'custom')}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="initials">Initiales</SelectItem>
                          <SelectItem value="custom">Texte libre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {textMode === 'initials' ? (
                      <div>
                        <Label>Initiales (max 3)</Label>
                        <Input
                          value={initials}
                          onChange={(e) => setInitials(e.target.value.toUpperCase().slice(0, 3))}
                          placeholder="NL"
                          maxLength={3}
                          className="mt-1 text-center font-bold text-xl"
                        />
                      </div>
                    ) : (
                      <div>
                        <Label>Texte personnalisé</Label>
                        <Input
                          value={customText}
                          onChange={(e) => setCustomText(e.target.value)}
                          placeholder="Votre texte"
                          className="mt-1 text-center font-bold"
                        />
                      </div>
                    )}

                    <div>
                      <Label>Taille police: {fontSize}px</Label>
                      <input
                        type="range"
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        min={textMode === 'initials' ? 180 : 60}
                        max={400}
                        step={10}
                        className="w-full mt-2"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Thème</Label>
                  <Select value={theme} onValueChange={(v) => setTheme(v as 'dark' | 'light' | 'gradient')}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gradient">Dégradé</SelectItem>
                      <SelectItem value="dark">Bleu</SelectItem>
                      <SelectItem value="light">Clair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {theme === 'gradient' && (
                  <div className="flex items-center justify-between">
                    <Label>Direction</Label>
                    <Select value={gradientType} onValueChange={(v) => setGradientType(v as GradientTypePerso)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diagonal">Diagonal</SelectItem>
                        <SelectItem value="horizontal">Horizontal</SelectItem>
                        <SelectItem value="vertical">Vertical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label>Guide cercle</Label>
                  <Switch checked={showCircleGuide} onCheckedChange={setShowCircleGuide} />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Qualité: {quality}x</Label>
                  <Select value={String(quality)} onValueChange={(v) => setQuality(Number(v))}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1x</SelectItem>
                      <SelectItem value="2">2x ✓</SelectItem>
                      <SelectItem value="3">3x</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Export par plateforme */}
            <Card>
              <CardContent className="pt-6">
                <Label className="mb-4 block">Export par plateforme</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PLATFORM_SIZES).map(([key, { size, name, icon: Icon }]) => (
                    <Button
                      key={key}
                      variant="outline"
                      onClick={() => handleExportSingle(key as keyof typeof PLATFORM_SIZES)}
                      className="justify-start"
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {name}
                      <span className="ml-auto text-xs text-muted-foreground">{size}px</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <Label>Aperçu (zone circulaire visible sur la plupart des réseaux)</Label>
            <div className="relative mx-auto" style={{ width: 400, height: 400 }}>
              {/* Scaled preview container */}
              <div 
                ref={previewRef}
                className="absolute top-0 left-0 overflow-hidden"
                style={{
                  width: CANVAS_SIZE,
                  height: CANVAS_SIZE,
                  transform: `scale(${400 / CANVAS_SIZE})`,
                  transformOrigin: 'top left',
                  background: getBackground(),
                  fontFamily: "'Manrope', 'Helvetica Neue', Arial, sans-serif",
                }}
              >
                {/* Photo ou Initiales */}
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Profile"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      className="font-bold text-center px-4"
                      style={{
                        color: getTextColor(),
                        fontSize: fontSize,
                        letterSpacing: textMode === 'initials' ? '-0.02em' : '-0.01em',
                        textShadow: theme !== 'light' ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
                        lineHeight: 1,
                        wordBreak: 'break-word',
                        maxWidth: '90%',
                      }}
                    >
                      {displayText}
                    </span>
                  </div>
                )}
              </div>

              {/* Guide cercle (overlay, non exporté) */}
              {showCircleGuide && (
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    border: '3px dashed rgba(255,255,255,0.5)',
                    borderRadius: '50%',
                    boxShadow: 'inset 0 0 0 3px rgba(0,0,0,0.2)',
                  }}
                />
              )}
            </div>

            {/* Previews des tailles */}
            <div className="flex items-end justify-center gap-4 mt-6">
              {Object.entries(PLATFORM_SIZES).map(([key, { size, name, icon: Icon }]) => {
                const previewSize = Math.max(size * 0.15, 36);
                return (
                  <div key={key} className="flex flex-col items-center gap-1">
                    <div
                      className="rounded-full overflow-hidden border-2 border-muted"
                      style={{
                        width: previewSize,
                        height: previewSize,
                        background: getBackground(),
                      }}
                    >
                      {photoUrl ? (
                        <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center overflow-hidden">
                          <span
                            className="font-bold text-center"
                            style={{
                              color: getTextColor(),
                              fontSize: previewSize * (textMode === 'initials' ? 0.4 : 0.25),
                              lineHeight: 1,
                            }}
                          >
                            {textMode === 'initials' ? displayText.slice(0, 2) : displayText.slice(0, 4)}
                          </span>
                        </div>
                      )}
                    </div>
                    <Icon className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{size}px</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ProfilePersoEditor;
