import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { FileText, Loader2 } from "lucide-react";

export interface ExportSettings {
  header: {
    companyName: string;
    tagline: string;
    showLogo: boolean;
  };
  footer: {
    line1: string;
    line2: string;
    showPageNumbers: boolean;
  };
}

const DEFAULT_SETTINGS: ExportSettings = {
  header: {
    companyName: 'IArche',
    tagline: 'Architecture de Solutions IA',
    showLogo: true,
  },
  footer: {
    line1: 'IArche - Conseil en Architecture IA & Transformation Digitale',
    line2: 'contact@iarche.fr  •  www.iarche.fr',
    showPageNumbers: true,
  },
};

interface ExportSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (settings: ExportSettings) => Promise<void>;
  documentTitle: string;
  isExporting?: boolean;
}

export function ExportSettingsDialog({
  open,
  onOpenChange,
  onExport,
  documentTitle,
  isExporting = false,
}: ExportSettingsDialogProps) {
  const [settings, setSettings] = useState<ExportSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState('header');

  // Load saved settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('cockpit-export-settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved export settings');
      }
    }
  }, []);

  // Save settings to localStorage when they change
  const updateSettings = (newSettings: ExportSettings) => {
    setSettings(newSettings);
    localStorage.setItem('cockpit-export-settings', JSON.stringify(newSettings));
  };

  const handleExport = async () => {
    await onExport(settings);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Export PDF
          </DialogTitle>
          <DialogDescription>
            Personnalisez l'en-tête et le pied de page pour "{documentTitle}"
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="header">En-tête</TabsTrigger>
            <TabsTrigger value="footer">Pied de page</TabsTrigger>
          </TabsList>

          <TabsContent value="header" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nom de l'entreprise</Label>
              <Input
                id="companyName"
                value={settings.header.companyName}
                onChange={(e) => updateSettings({
                  ...settings,
                  header: { ...settings.header, companyName: e.target.value }
                })}
                placeholder="IArche"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">Slogan / Description</Label>
              <Input
                id="tagline"
                value={settings.header.tagline}
                onChange={(e) => updateSettings({
                  ...settings,
                  header: { ...settings.header, tagline: e.target.value }
                })}
                placeholder="Architecture de Solutions IA"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showLogo">Afficher le logo</Label>
              <Switch
                id="showLogo"
                checked={settings.header.showLogo}
                onCheckedChange={(checked) => updateSettings({
                  ...settings,
                  header: { ...settings.header, showLogo: checked }
                })}
              />
            </div>
          </TabsContent>

          <TabsContent value="footer" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="footerLine1">Ligne 1</Label>
              <Input
                id="footerLine1"
                value={settings.footer.line1}
                onChange={(e) => updateSettings({
                  ...settings,
                  footer: { ...settings.footer, line1: e.target.value }
                })}
                placeholder="IArche - Conseil en Architecture IA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="footerLine2">Ligne 2 (contact)</Label>
              <Input
                id="footerLine2"
                value={settings.footer.line2}
                onChange={(e) => updateSettings({
                  ...settings,
                  footer: { ...settings.footer, line2: e.target.value }
                })}
                placeholder="contact@iarche.fr  •  www.iarche.fr"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showPageNumbers">Afficher les numéros de page</Label>
              <Switch
                id="showPageNumbers"
                checked={settings.footer.showPageNumbers}
                onCheckedChange={(checked) => updateSettings({
                  ...settings,
                  footer: { ...settings.footer, showPageNumbers: checked }
                })}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Générer PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
