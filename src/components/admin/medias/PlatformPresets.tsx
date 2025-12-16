import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type Platform = 
  | 'custom' 
  | 'linkedin-banner' | 'linkedin-post' | 'linkedin-landscape'
  | 'twitter-banner' | 'twitter-post' 
  | 'instagram-square' | 'instagram-story' 
  | 'facebook-banner' | 'facebook-post' 
  | 'youtube-cover' | 'youtube-thumbnail'
  | 'reels-tiktok'
  | 'business-card'
  | 'opengraph';

export interface PlatformPreset {
  id: Platform;
  label: string;
  width: number;
  height: number;
  category: string;
}

export const PLATFORM_PRESETS: PlatformPreset[] = [
  { id: 'custom', label: 'Personnalisé', width: 0, height: 0, category: 'Général' },
  // LinkedIn
  { id: 'linkedin-banner', label: 'LinkedIn Banner', width: 1584, height: 396, category: 'LinkedIn' },
  { id: 'linkedin-post', label: 'LinkedIn Carré', width: 1200, height: 1200, category: 'LinkedIn' },
  { id: 'linkedin-landscape', label: 'LinkedIn Paysage', width: 1200, height: 627, category: 'LinkedIn' },
  // Twitter/X
  { id: 'twitter-banner', label: 'Twitter/X Banner', width: 1500, height: 500, category: 'Twitter/X' },
  { id: 'twitter-post', label: 'Twitter/X Post', width: 1600, height: 900, category: 'Twitter/X' },
  // Instagram
  { id: 'instagram-square', label: 'Instagram Carré', width: 1080, height: 1080, category: 'Instagram' },
  { id: 'instagram-story', label: 'Instagram Story', width: 1080, height: 1920, category: 'Instagram' },
  // Facebook
  { id: 'facebook-banner', label: 'Facebook Couverture', width: 820, height: 312, category: 'Facebook' },
  { id: 'facebook-post', label: 'Facebook Post', width: 1200, height: 630, category: 'Facebook' },
  // YouTube (v4.1)
  { id: 'youtube-cover', label: 'YouTube Bannière', width: 2560, height: 1440, category: 'YouTube' },
  { id: 'youtube-thumbnail', label: 'YouTube Miniature', width: 1280, height: 720, category: 'YouTube' },
  // TikTok/Reels (v4.1)
  { id: 'reels-tiktok', label: 'Reels / TikTok', width: 1080, height: 1920, category: 'Vidéo verticale' },
  // Business (v4.1)
  { id: 'business-card', label: 'Carte de visite digitale', width: 1050, height: 600, category: 'Business' },
  // Web
  { id: 'opengraph', label: 'Open Graph', width: 1200, height: 630, category: 'Web' },
];

interface PlatformPresetsProps {
  value: Platform;
  onChange: (value: Platform) => void;
  onDimensionsChange?: (width: number, height: number) => void;
  filterByCategory?: string[];
}

export default function PlatformPresets({
  value,
  onChange,
  onDimensionsChange,
  filterByCategory,
}: PlatformPresetsProps) {
  const handleChange = (newValue: Platform) => {
    onChange(newValue);
    
    if (onDimensionsChange && newValue !== 'custom') {
      const preset = PLATFORM_PRESETS.find(p => p.id === newValue);
      if (preset) {
        onDimensionsChange(preset.width, preset.height);
      }
    }
  };

  // Filter presets by category if specified
  const filteredPresets = filterByCategory 
    ? PLATFORM_PRESETS.filter(p => p.id === 'custom' || filterByCategory.includes(p.category))
    : PLATFORM_PRESETS;

  // Group by category
  const groupedPresets = filteredPresets.reduce((acc, preset) => {
    if (!acc[preset.category]) {
      acc[preset.category] = [];
    }
    acc[preset.category].push(preset);
    return acc;
  }, {} as Record<string, PlatformPreset[]>);

  return (
    <div className="space-y-2">
      <Label>Préset plateforme</Label>
      <Select value={value} onValueChange={(v) => handleChange(v as Platform)}>
        <SelectTrigger>
          <SelectValue placeholder="Choisir une plateforme..." />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(groupedPresets).map(([category, presets]) => (
            <React.Fragment key={category}>
              {category !== 'Général' && (
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {category}
                </div>
              )}
              {presets.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.label}
                  {preset.width > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({preset.width}×{preset.height})
                    </span>
                  )}
                </SelectItem>
              ))}
            </React.Fragment>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Helper to get preset dimensions
export function getPresetDimensions(platform: Platform): { width: number; height: number } | null {
  const preset = PLATFORM_PRESETS.find(p => p.id === platform);
  if (!preset || preset.id === 'custom') return null;
  return { width: preset.width, height: preset.height };
}
