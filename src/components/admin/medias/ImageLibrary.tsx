import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Image, 
  Upload, 
  Trash2, 
  Copy, 
  Check, 
  FolderOpen, 
  Search,
  Loader2,
  X,
  RefreshCw
} from 'lucide-react';

interface ImageFile {
  name: string;
  id: string;
  url: string;
  size: number;
  createdAt: string;
  bucket: string;
}

interface ImageLibraryProps {
  /** Callback when an image is selected */
  onSelect?: (url: string) => void;
  /** Show as dialog trigger button */
  triggerLabel?: string;
  /** Allowed file types */
  acceptTypes?: string;
  /** Max file size in MB */
  maxSizeMB?: number;
}

// Available storage buckets for media
const MEDIA_BUCKETS = [
  { id: 'brochure-images', label: 'Brochures', description: 'Images pour brochures' },
  { id: 'qr-codes', label: 'QR Codes', description: 'QR codes générés' },
  { id: 'livres-blancs', label: 'Livres Blancs', description: 'Documents PDF' },
] as const;

export const ImageLibrary: React.FC<ImageLibraryProps> = ({
  onSelect,
  triggerLabel = 'Bibliothèque',
  acceptTypes = 'image/*',
  maxSizeMB = 5,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBucket, setSelectedBucket] = useState<string>(MEDIA_BUCKETS[0].id);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const fetchImages = useCallback(async (bucket: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

      if (error) throw error;

      const imageFiles: ImageFile[] = (data || [])
        .filter(file => !file.name.startsWith('.'))
        .map(file => {
          const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(file.name);
          
          return {
            id: file.id || file.name,
            name: file.name,
            url: urlData.publicUrl,
            size: file.metadata?.size || 0,
            createdAt: file.created_at || '',
            bucket,
          };
        });

      setImages(imageFiles);
    } catch (error) {
      console.error('Error fetching images:', error);
      toast.error('Erreur lors du chargement des images');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchImages(selectedBucket);
    }
  }, [isOpen, selectedBucket, fetchImages]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Fichier trop volumineux (max ${maxSizeMB}MB)`);
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error } = await supabase.storage
        .from(selectedBucket)
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      toast.success('Image uploadée');
      fetchImages(selectedBucket);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (image: ImageFile) => {
    if (!confirm(`Supprimer "${image.name}" ?`)) return;

    try {
      const { error } = await supabase.storage
        .from(image.bucket)
        .remove([image.name]);

      if (error) throw error;

      toast.success('Image supprimée');
      setImages(prev => prev.filter(img => img.id !== image.id));
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleCopyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    toast.success('URL copiée');
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleSelect = (url: string) => {
    onSelect?.(url);
    setIsOpen(false);
    toast.success('Image sélectionnée');
  };

  const filteredImages = images.filter(img =>
    img.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FolderOpen className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Bibliothèque d'images
          </DialogTitle>
        </DialogHeader>

        <Tabs value={selectedBucket} onValueChange={setSelectedBucket}>
          <TabsList className="grid w-full grid-cols-3">
            {MEDIA_BUCKETS.map(bucket => (
              <TabsTrigger key={bucket.id} value={bucket.id} className="text-xs">
                {bucket.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-4 space-y-4">
            {/* Actions bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-7 w-7"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchImages(selectedBucket)}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>

              <Label htmlFor="upload-input" className="cursor-pointer">
                <Button variant="default" size="sm" className="gap-2" asChild disabled={uploading}>
                  <span>
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Uploader
                  </span>
                </Button>
              </Label>
              <Input
                id="upload-input"
                type="file"
                accept={acceptTypes}
                onChange={handleUpload}
                className="hidden"
              />
            </div>

            {/* Images grid */}
            <ScrollArea className="h-[400px] rounded-md border p-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Image className="h-12 w-12 mb-2 opacity-50" />
                  <p>Aucune image</p>
                  <p className="text-xs">Uploadez une image pour commencer</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredImages.map(image => (
                    <Card key={image.id} className="group overflow-hidden">
                      <div className="aspect-square relative bg-muted">
                        <img
                          src={image.url}
                          alt={image.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        
                        {/* Overlay actions */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          {onSelect && (
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-8 w-8"
                              onClick={() => handleSelect(image.url)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8"
                            onClick={() => handleCopyUrl(image.url)}
                          >
                            {copiedUrl === image.url ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-8 w-8"
                            onClick={() => handleDelete(image)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardContent className="p-2">
                        <p className="text-xs truncate" title={image.name}>
                          {image.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatSize(image.size)}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Stats */}
            <div className="text-xs text-muted-foreground text-center">
              {filteredImages.length} image{filteredImages.length !== 1 ? 's' : ''} 
              {searchQuery && ` (filtré sur "${searchQuery}")`}
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ImageLibrary;
