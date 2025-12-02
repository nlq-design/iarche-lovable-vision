import React, { useRef, useState } from 'react';
import { Upload, X, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField, FormDesignSettings } from '@/types/forms';
import FieldWrapper from './FieldWrapper';

interface FileFieldProps {
  field: FormField;
  value: File | File[] | null;
  onChange: (value: File | File[] | null) => void;
  error?: string;
  colors: FormDesignSettings['colors'];
}

const FileField = ({ field, value, onChange, error, colors }: FileFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const files = value ? (Array.isArray(value) ? value : [value]) : [];

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    
    const newFiles = Array.from(fileList);
    
    // Check file size
    if (field.maxSize) {
      const maxBytes = field.maxSize * 1024 * 1024;
      const validFiles = newFiles.filter(f => f.size <= maxBytes);
      if (validFiles.length !== newFiles.length) {
        // Some files were too large
      }
      if (field.multiple) {
        onChange(validFiles);
      } else {
        onChange(validFiles[0] || null);
      }
    } else {
      if (field.multiple) {
        onChange(newFiles);
      } else {
        onChange(newFiles[0] || null);
      }
    }
  };

  const removeFile = (index: number) => {
    if (field.multiple && Array.isArray(value)) {
      const newFiles = [...value];
      newFiles.splice(index, 1);
      onChange(newFiles.length > 0 ? newFiles : null);
    } else {
      onChange(null);
    }
  };

  return (
    <FieldWrapper field={field} error={error} colors={colors}>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-gray-300'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={field.accept}
          multiple={field.multiple}
          onChange={(e) => handleFiles(e.target.files)}
        />
        
        {files.length === 0 ? (
          <>
            <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
            <p className="text-sm" style={{ color: colors.text }}>
              Glissez-déposez ou{' '}
              <button
                type="button"
                className="underline font-medium"
                style={{ color: colors.primary }}
                onClick={() => inputRef.current?.click()}
              >
                parcourez
              </button>
            </p>
            {field.accept && (
              <p className="text-xs mt-1 opacity-60" style={{ color: colors.text }}>
                Formats acceptés : {field.accept}
              </p>
            )}
            {field.maxSize && (
              <p className="text-xs opacity-60" style={{ color: colors.text }}>
                Taille max : {field.maxSize} MB
              </p>
            )}
          </>
        ) : (
          <div className="space-y-2">
            {files.map((file, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4" style={{ color: colors.primary }} />
                  <span className="text-sm" style={{ color: colors.text }}>
                    {file.name}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              {field.multiple ? 'Ajouter un fichier' : 'Changer le fichier'}
            </Button>
          </div>
        )}
      </div>
    </FieldWrapper>
  );
};

export default FileField;
