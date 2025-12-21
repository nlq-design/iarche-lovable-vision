import React, { useRef, useState } from 'react';
import { Upload, X, File, FileText, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  value: File | File[] | null;
  onChange: (files: File | File[] | null) => void;
  multiple?: boolean;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
  label?: string;
}

const getFileIcon = (file: File) => {
  if (file.type.startsWith('image/')) return Image;
  if (file.type.includes('pdf') || file.type.includes('word') || file.type.includes('document')) return FileText;
  return File;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const FileUploader = ({ 
  value, 
  onChange, 
  multiple = false, 
  accept = '.pdf,.doc,.docx,.txt,.xls,.xlsx',
  maxSize = 10,
  className,
  label
}: FileUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const files = value ? (Array.isArray(value) ? value : [value]) : [];

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    
    const newFiles = Array.from(fileList);
    const maxBytes = maxSize * 1024 * 1024;
    const validFiles = newFiles.filter(f => f.size <= maxBytes);
    
    if (multiple) {
      onChange(validFiles.length > 0 ? [...files, ...validFiles] : (files.length > 0 ? files : null));
    } else {
      onChange(validFiles[0] || null);
    }
  };

  const removeFile = (index: number) => {
    if (multiple && Array.isArray(value)) {
      const newFiles = [...value];
      newFiles.splice(index, 1);
      onChange(newFiles.length > 0 ? newFiles : null);
    } else {
      onChange(null);
    }
  };

  return (
    <div className={className}>
      {label && <p className="text-sm font-medium mb-2">{label}</p>}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer",
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
        />
        
        {files.length === 0 ? (
          <div className="py-4">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Glissez-déposez ou <span className="text-primary font-medium">parcourez</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, Word, Excel • Max {maxSize} MB
            </p>
          </div>
        ) : (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            {files.map((file, index) => {
              const IconComponent = getFileIcon(file);
              return (
                <div 
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <IconComponent className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      ({formatFileSize(file.size)})
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {multiple ? 'Ajouter d\'autres fichiers' : 'Changer le fichier'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
