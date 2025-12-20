/**
 * Responsive Preview Toggle v4.2
 * Preview mobile/tablet/desktop pour les éditeurs média
 */

import React from 'react';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Label } from '@/components/ui/label';

export type PreviewDevice = 'mobile' | 'tablet' | 'desktop';

interface DeviceConfig {
  id: PreviewDevice;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  width: number;
  description: string;
}

export const DEVICE_CONFIGS: DeviceConfig[] = [
  { id: 'mobile', label: 'Mobile', icon: Smartphone, width: 375, description: 'iPhone' },
  { id: 'tablet', label: 'Tablette', icon: Tablet, width: 768, description: 'iPad' },
  { id: 'desktop', label: 'Desktop', icon: Monitor, width: 1440, description: 'Écran large' },
];

interface ResponsivePreviewProps {
  value: PreviewDevice;
  onChange: (device: PreviewDevice) => void;
  className?: string;
}

export default function ResponsivePreview({
  value,
  onChange,
  className = '',
}: ResponsivePreviewProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-xs text-muted-foreground">Aperçu responsive</Label>
      <ToggleGroup 
        type="single" 
        value={value} 
        onValueChange={(v) => v && onChange(v as PreviewDevice)}
        className="justify-start"
      >
        {DEVICE_CONFIGS.map((device) => (
          <ToggleGroupItem
            key={device.id}
            value={device.id}
            aria-label={device.label}
            className="flex items-center gap-1.5 px-3"
          >
            <device.icon className="h-4 w-4" />
            <span className="text-xs hidden sm:inline">{device.label}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

/**
 * Get preview scale based on device and container width
 */
export function getDevicePreviewScale(
  device: PreviewDevice,
  contentWidth: number,
  containerMaxWidth: number
): number {
  const deviceConfig = DEVICE_CONFIGS.find(d => d.id === device);
  if (!deviceConfig) return 1;
  
  // Scale to fit container while simulating device viewport
  const deviceScale = deviceConfig.width / contentWidth;
  const containerScale = containerMaxWidth / contentWidth;
  
  return Math.min(deviceScale, containerScale, 0.5);
}

/**
 * Get device viewport width
 */
export function getDeviceWidth(device: PreviewDevice): number {
  const deviceConfig = DEVICE_CONFIGS.find(d => d.id === device);
  return deviceConfig?.width || 1440;
}
