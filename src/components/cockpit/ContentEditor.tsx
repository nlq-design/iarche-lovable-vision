import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { FileUploader } from './FileUploader';
import { Upload, FileText } from 'lucide-react';

interface ContentEditorProps {
  textValue: string;
  onTextChange: (text: string) => void;
  fileValue: File | File[] | null;
  onFileChange: (files: File | File[] | null) => void;
  placeholder?: string;
  multiple?: boolean;
  accept?: string;
  className?: string;
}

export const ContentEditor = ({
  textValue,
  onTextChange,
  fileValue,
  onFileChange,
  placeholder = "Collez ou saisissez votre contenu ici...",
  multiple = true,
  accept = '.pdf,.doc,.docx,.txt,.xls,.xlsx',
  className
}: ContentEditorProps) => {
  const [activeTab, setActiveTab] = useState<string>('paste');

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 h-9">
          <TabsTrigger value="paste" className="text-xs">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Copier-coller
          </TabsTrigger>
          <TabsTrigger value="upload" className="text-xs">
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Importer fichier
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="paste" className="mt-3">
          <Textarea
            value={textValue}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={placeholder}
            className="min-h-[200px] resize-y"
          />
        </TabsContent>
        
        <TabsContent value="upload" className="mt-3">
          <FileUploader
            value={fileValue}
            onChange={onFileChange}
            multiple={multiple}
            accept={accept}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
