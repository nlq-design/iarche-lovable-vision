import { useState, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { VerticalAlignment } from './VerticalAlignmentControls';
import { Layout, LayoutTemplate, Layers, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, Plus, Trash2, Save, Star, Download, Upload, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';

export interface CompositionPreset {
  id: string;
  label: string;
  description: string;
  icon?: React.ReactNode;
  verticalAlignment: VerticalAlignment;
  topMargin: number;
  paddingTop?: number;
  paddingBottom?: number;
  contentGap?: number;
  isCustom?: boolean;
}

// Presets de composition prédéfinis
export const COMPOSITION_PRESETS: CompositionPreset[] = [
  {
    id: 'title-top',
    label: 'Titre en haut',
    description: 'Contenu principal en haut, espace libre en bas',
    icon: <AlignVerticalJustifyStart className="h-5 w-5" />,
    verticalAlignment: 'top',
    topMargin: 8,
    paddingTop: 15,
    paddingBottom: 25,
    contentGap: 24,
  },
  {
    id: 'centered',
    label: 'Centré',
    description: 'Contenu équilibré au centre',
    icon: <AlignVerticalJustifyCenter className="h-5 w-5" />,
    verticalAlignment: 'center',
    topMargin: 0,
    paddingTop: 20,
    paddingBottom: 20,
    contentGap: 32,
  },
  {
    id: 'title-bottom',
    label: 'Titre en bas',
    description: 'Espace libre en haut, contenu en bas',
    icon: <AlignVerticalJustifyEnd className="h-5 w-5" />,
    verticalAlignment: 'bottom',
    topMargin: 0,
    paddingTop: 25,
    paddingBottom: 15,
    contentGap: 24,
  },
  {
    id: 'hero-impact',
    label: 'Impact Hero',
    description: 'Titre haut avec grand espace central',
    icon: <Layout className="h-5 w-5" />,
    verticalAlignment: 'top',
    topMargin: 5,
    paddingTop: 10,
    paddingBottom: 30,
    contentGap: 48,
  },
  {
    id: 'cta-focused',
    label: 'Focus CTA',
    description: 'CTA en bas bien visible',
    icon: <Layers className="h-5 w-5" />,
    verticalAlignment: 'bottom',
    topMargin: 0,
    paddingTop: 30,
    paddingBottom: 10,
    contentGap: 40,
  },
  {
    id: 'balanced',
    label: 'Équilibré',
    description: 'Distribution uniforme du contenu',
    icon: <LayoutTemplate className="h-5 w-5" />,
    verticalAlignment: 'center',
    topMargin: 0,
    paddingTop: 15,
    paddingBottom: 15,
    contentGap: 28,
  },
];

const STORAGE_KEY = 'iarche-custom-composition-presets';

// Load custom presets from localStorage
const loadCustomPresets = (): CompositionPreset[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load custom presets:', e);
  }
  return [];
};

// Save custom presets to localStorage
const saveCustomPresets = (presets: CompositionPreset[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch (e) {
    console.error('Failed to save custom presets:', e);
  }
};

// Get icon for alignment
const getAlignmentIcon = (alignment: VerticalAlignment) => {
  switch (alignment) {
    case 'top':
      return <AlignVerticalJustifyStart className="h-5 w-5" />;
    case 'bottom':
      return <AlignVerticalJustifyEnd className="h-5 w-5" />;
    default:
      return <AlignVerticalJustifyCenter className="h-5 w-5" />;
  }
};

interface CompositionPresetsProps {
  selectedPreset: string;
  onSelectPreset: (preset: CompositionPreset) => void;
  label?: string;
  className?: string;
  compact?: boolean;
  // Current values for saving custom preset
  currentVerticalAlignment?: VerticalAlignment;
  currentTopMargin?: number;
  showSaveButton?: boolean;
}

export const CompositionPresets = ({
  selectedPreset,
  onSelectPreset,
  label = 'Presets de composition',
  className = '',
  compact = false,
  currentVerticalAlignment = 'center',
  currentTopMargin = 0,
  showSaveButton = true,
}: CompositionPresetsProps) => {
  const [customPresets, setCustomPresets] = useState<CompositionPreset[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');

  // Load custom presets on mount
  useEffect(() => {
    setCustomPresets(loadCustomPresets());
  }, []);

  const allPresets = [...COMPOSITION_PRESETS, ...customPresets];

  const handleSavePreset = () => {
    if (!newPresetName.trim()) {
      toast.error('Veuillez entrer un nom pour le preset');
      return;
    }

    const newPreset: CompositionPreset = {
      id: `custom-${Date.now()}`,
      label: newPresetName.trim(),
      description: newPresetDescription.trim() || `Marge: ${currentTopMargin}%`,
      verticalAlignment: currentVerticalAlignment,
      topMargin: currentTopMargin,
      isCustom: true,
    };

    const updatedPresets = [...customPresets, newPreset];
    setCustomPresets(updatedPresets);
    saveCustomPresets(updatedPresets);

    toast.success(`Preset "${newPresetName}" sauvegardé`);
    setSaveDialogOpen(false);
    setNewPresetName('');
    setNewPresetDescription('');
  };

  const handleDeletePreset = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedPresets = customPresets.filter(p => p.id !== presetId);
    setCustomPresets(updatedPresets);
    saveCustomPresets(updatedPresets);
    toast.success('Preset supprimé');
  };

  // Export presets to JSON
  const handleExportPresets = () => {
    if (customPresets.length === 0) {
      toast.error('Aucun preset personnalisé à exporter');
      return;
    }

    // Clean presets for export (remove icon which can't be serialized)
    const exportData = customPresets.map(({ icon, ...preset }) => preset);
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `composition-presets-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`${customPresets.length} preset(s) exporté(s)`);
  };

  // Import presets from JSON
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportPresets = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        
        if (!Array.isArray(importedData)) {
          throw new Error('Format invalide');
        }

        // Validate and clean imported presets
        const validPresets: CompositionPreset[] = importedData
          .filter((item: any) => 
            item.id && 
            item.label && 
            item.verticalAlignment && 
            typeof item.topMargin === 'number'
          )
          .map((item: any) => ({
            ...item,
            id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate new unique IDs
            isCustom: true,
          }));

        if (validPresets.length === 0) {
          throw new Error('Aucun preset valide trouvé');
        }

        // Merge with existing presets (avoid duplicates by label)
        const existingLabels = new Set(customPresets.map(p => p.label.toLowerCase()));
        const newPresets = validPresets.filter(p => !existingLabels.has(p.label.toLowerCase()));
        const duplicates = validPresets.length - newPresets.length;

        const updatedPresets = [...customPresets, ...newPresets];
        setCustomPresets(updatedPresets);
        saveCustomPresets(updatedPresets);

        if (duplicates > 0) {
          toast.success(`${newPresets.length} preset(s) importé(s), ${duplicates} doublon(s) ignoré(s)`);
        } else {
          toast.success(`${newPresets.length} preset(s) importé(s)`);
        }
      } catch (error) {
        toast.error('Erreur lors de l\'import: format de fichier invalide');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    e.target.value = '';
  };

  const renderPresetIcon = (preset: CompositionPreset) => {
    if (preset.isCustom) {
      return (
        <div className="relative">
          {getAlignmentIcon(preset.verticalAlignment)}
          <Star className="h-2.5 w-2.5 absolute -top-1 -right-1 text-amber-500 fill-amber-500" />
        </div>
      );
    }
    return preset.icon;
  };

  // Hidden file input for import
  const renderFileInput = () => (
    <input
      ref={fileInputRef}
      type="file"
      accept=".json"
      onChange={handleImportPresets}
      className="hidden"
    />
  );

  if (compact) {
    return (
      <div className={`space-y-2 ${className}`}>
        {renderFileInput()}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">{label}</Label>
          <div className="flex items-center gap-1">
            {showSaveButton && (
              <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
                    <Plus className="h-3.5 w-3.5" />
                    <span className="text-xs">Sauvegarder</span>
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Sauvegarder la composition</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="preset-name">Nom du preset</Label>
                    <Input
                      id="preset-name"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      placeholder="Ma composition personnalisée"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preset-desc">Description (optionnelle)</Label>
                    <Input
                      id="preset-desc"
                      value={newPresetDescription}
                      onChange={(e) => setNewPresetDescription(e.target.value)}
                      placeholder="Description courte..."
                    />
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Alignement:</span>
                      <span className="font-medium capitalize">{currentVerticalAlignment}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Marge supérieure:</span>
                      <span className="font-medium">{currentTopMargin}%</span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Annuler</Button>
                  </DialogClose>
                  <Button onClick={handleSavePreset}>
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            )}
            {/* Import/Export dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPresets} disabled={customPresets.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Exporter les presets
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleImportClick}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importer des presets
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allPresets.map((preset) => (
            <div key={preset.id} className="relative group">
              <Button
                variant={selectedPreset === preset.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSelectPreset(preset)}
                className="h-8 px-2.5 gap-1.5"
                title={preset.description}
              >
                {renderPresetIcon(preset)}
                <span className="text-xs">{preset.label}</span>
              </Button>
              {preset.isCustom && (
                <button
                  onClick={(e) => handleDeletePreset(preset.id, e)}
                  className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Supprimer"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {renderFileInput()}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex items-center gap-2">
          {showSaveButton && (
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5">
                  <Plus className="h-4 w-4" />
                  Sauvegarder actuel
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Sauvegarder la composition</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="preset-name-full">Nom du preset</Label>
                    <Input
                      id="preset-name-full"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      placeholder="Ma composition personnalisée"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preset-desc-full">Description (optionnelle)</Label>
                    <Input
                      id="preset-desc-full"
                      value={newPresetDescription}
                      onChange={(e) => setNewPresetDescription(e.target.value)}
                      placeholder="Description courte..."
                    />
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Alignement:</span>
                      <span className="font-medium capitalize">{currentVerticalAlignment}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Marge supérieure:</span>
                      <span className="font-medium">{currentTopMargin}%</span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Annuler</Button>
                  </DialogClose>
                  <Button onClick={handleSavePreset}>
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {/* Import/Export buttons */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPresets} disabled={customPresets.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Exporter les presets ({customPresets.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleImportClick}>
                <Upload className="h-4 w-4 mr-2" />
                Importer des presets
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Default presets */}
      <div className="grid grid-cols-2 gap-2">
        {COMPOSITION_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelectPreset(preset)}
            className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
              selectedPreset === preset.id 
                ? 'border-accent bg-accent/10' 
                : 'border-border hover:border-accent/50'
            }`}
          >
            <div className="text-muted-foreground mt-0.5">
              {preset.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{preset.label}</div>
              <div className="text-xs text-muted-foreground truncate">
                {preset.description}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Custom presets */}
      {customPresets.length > 0 && (
        <>
          <div className="flex items-center gap-2 pt-2">
            <Star className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-muted-foreground">Mes compositions</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {customPresets.map((preset) => (
              <div key={preset.id} className="relative group">
                <button
                  onClick={() => onSelectPreset(preset)}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-colors text-left w-full ${
                    selectedPreset === preset.id 
                      ? 'border-accent bg-accent/10' 
                      : 'border-border hover:border-accent/50'
                  }`}
                >
                  <div className="text-muted-foreground mt-0.5">
                    {getAlignmentIcon(preset.verticalAlignment)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm flex items-center gap-1.5">
                      {preset.label}
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {preset.description}
                    </div>
                  </div>
                </button>
                <button
                  onClick={(e) => handleDeletePreset(preset.id, e)}
                  className="absolute top-2 right-2 bg-destructive/90 text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CompositionPresets;
