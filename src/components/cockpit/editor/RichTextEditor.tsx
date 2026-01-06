import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextAlign } from '@tiptap/extension-text-align';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import Image from '@tiptap/extension-image';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Table as TableIcon,
  Columns,
  AlertCircle,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Trash2,
  Plus,
  Type,
  Image as ImageIcon,
  Minus,
  PenLine,
  Quote,
  Code,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { FontSize, FONT_SIZES } from './FontSizeExtension';
import './rich-editor.css';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ content, onChange, placeholder = 'Commencez à écrire...', className }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      TextStyle,
      FontSize,
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rich-editor-image',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'rich-editor-table',
        },
      }),
      TableRow,
      TableCell,
      TableHeader,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-3 py-2',
      },
    },
  });

  // Sync content from parent
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  const insertTable = (rows: number, cols: number) => {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
  };

  const insertColumns = (count: 2 | 3) => {
    const columnClass = count === 2 ? 'columns-2' : 'columns-3';
    const placeholderContent = Array(count).fill('<div class="column"><p>Colonne</p></div>').join('');
    editor.chain().focus().insertContent(`<div class="${columnClass}">${placeholderContent}</div>`).run();
  };

  const insertAlertBlock = (type: 'info' | 'warning' | 'success') => {
    const labels = {
      info: 'Information',
      warning: 'Attention',
      success: 'Succès',
    };
    editor.chain().focus().insertContent(`
      <div class="alert-block alert-${type}">
        <strong>${labels[type]} :</strong> Votre message ici...
      </div>
    `).run();
  };

  const insertSeparator = (type: 'line' | 'dots' | 'space') => {
    const separators = {
      line: '<hr class="separator-line" />',
      dots: '<div class="separator-dots">• • •</div>',
      space: '<div class="separator-space"></div>',
    };
    editor.chain().focus().insertContent(separators[type]).run();
  };

  const insertSignature = (type: 'simple' | 'full' | 'minimal') => {
    const signatures = {
      simple: `
        <div class="signature-block signature-simple">
          <p><strong>[Votre nom]</strong></p>
          <p>[Votre fonction]</p>
          <p>[Email] | [Téléphone]</p>
        </div>
      `,
      full: `
        <div class="signature-block signature-full">
          <div class="signature-logo">[Logo]</div>
          <p><strong>[Votre nom]</strong></p>
          <p>[Votre fonction]</p>
          <p>[Entreprise]</p>
          <p>[Adresse]</p>
          <p>📧 [Email] | 📞 [Téléphone]</p>
          <p>🌐 [Site web]</p>
        </div>
      `,
      minimal: `
        <div class="signature-block signature-minimal">
          <p>— <strong>[Votre nom]</strong>, [Fonction]</p>
        </div>
      `,
    };
    editor.chain().focus().insertContent(signatures[type]).run();
  };

  const insertQuote = () => {
    editor.chain().focus().insertContent(`
      <blockquote class="quote-block">
        <p>"Votre citation ici..."</p>
        <cite>— Auteur</cite>
      </blockquote>
    `).run();
  };

  const insertCodeBlock = () => {
    editor.chain().focus().insertContent(`
      <pre class="code-block"><code>// Votre code ici...</code></pre>
    `).run();
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        editor.chain().focus().setImage({ src: result, alt: file.name }).run();
      }
    };
    reader.readAsDataURL(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const insertImageFromUrl = () => {
    const url = prompt('URL de l\'image:');
    if (url) {
      editor.chain().focus().setImage({ src: url, alt: 'Image' }).run();
    }
  };

  return (
    <div className={cn('rich-editor-wrapper border rounded-lg bg-background', className)}>
      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
        {/* Text formatting */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn('h-8 w-8 p-0', editor.isActive('bold') && 'bg-muted')}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn('h-8 w-8 p-0', editor.isActive('italic') && 'bg-muted')}
        >
          <Italic className="h-4 w-4" />
        </Button>

        {/* Font size dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 gap-1">
              <Type className="h-4 w-4" />
              <span className="text-xs">Taille</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {FONT_SIZES.map((size) => (
              <DropdownMenuItem
                key={size.value}
                onClick={() => editor.chain().focus().setFontSize(size.value).run()}
                className="flex items-center justify-between"
              >
                <span style={{ fontSize: size.value }}>{size.label}</span>
                <span className="text-xs text-muted-foreground ml-2">{size.value}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor.chain().focus().unsetFontSize().run()}>
              Réinitialiser
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Headings */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn('h-8 px-2 text-xs font-bold', editor.isActive('heading', { level: 2 }) && 'bg-muted')}
        >
          H2
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={cn('h-8 px-2 text-xs font-bold', editor.isActive('heading', { level: 3 }) && 'bg-muted')}
        >
          H3
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Lists */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn('h-8 w-8 p-0', editor.isActive('bulletList') && 'bg-muted')}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn('h-8 w-8 p-0', editor.isActive('orderedList') && 'bg-muted')}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Text alignment */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={cn('h-8 w-8 p-0', editor.isActive({ textAlign: 'left' }) && 'bg-muted')}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={cn('h-8 w-8 p-0', editor.isActive({ textAlign: 'center' }) && 'bg-muted')}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={cn('h-8 w-8 p-0', editor.isActive({ textAlign: 'right' }) && 'bg-muted')}
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Image dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 gap-1">
              <ImageIcon className="h-4 w-4" />
              <span className="text-xs">Image</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <Plus className="h-4 w-4 mr-2" />
              Importer une image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={insertImageFromUrl}>
              <ImageIcon className="h-4 w-4 mr-2" />
              Image depuis URL
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Table dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 gap-1">
              <TableIcon className="h-4 w-4" />
              <span className="text-xs">Tableau</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => insertTable(3, 3)}>
              <Plus className="h-4 w-4 mr-2" />
              Tableau 3x3
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertTable(4, 4)}>
              <Plus className="h-4 w-4 mr-2" />
              Tableau 4x4
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertTable(2, 5)}>
              <Plus className="h-4 w-4 mr-2" />
              Tableau 2 lignes x 5 colonnes
            </DropdownMenuItem>
            {editor.isActive('table') && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()}>
                  Ajouter ligne après
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()}>
                  Ajouter colonne après
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => editor.chain().focus().deleteTable().run()}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer tableau
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Columns dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 gap-1">
              <Columns className="h-4 w-4" />
              <span className="text-xs">Colonnes</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => insertColumns(2)}>
              2 colonnes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertColumns(3)}>
              3 colonnes
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Separator dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 gap-1">
              <Minus className="h-4 w-4" />
              <span className="text-xs">Séparateur</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => insertSeparator('line')}>
              <div className="w-12 h-px bg-current mr-2" />
              Ligne
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertSeparator('dots')}>
              <span className="mr-2">• • •</span>
              Points
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertSeparator('space')}>
              <div className="w-4 h-4 border border-dashed mr-2" />
              Espace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Signature dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 gap-1">
              <PenLine className="h-4 w-4" />
              <span className="text-xs">Signature</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => insertSignature('simple')}>
              Signature simple
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertSignature('full')}>
              Signature complète
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertSignature('minimal')}>
              Signature minimale
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Alert blocks dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 gap-1">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs">Alerte</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => insertAlertBlock('info')}>
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
              Information
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertAlertBlock('warning')}>
              <div className="w-3 h-3 rounded-full bg-amber-500 mr-2" />
              Attention
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertAlertBlock('success')}>
              <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
              Succès
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quote button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertQuote}
          className="h-8 w-8 p-0"
          title="Citation"
        >
          <Quote className="h-4 w-4" />
        </Button>

        {/* Code block button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertCodeBlock}
          className="h-8 w-8 p-0"
          title="Bloc de code"
        >
          <Code className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        {/* Undo/Redo */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="h-8 w-8 p-0"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="h-8 w-8 p-0"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} />
    </div>
  );
}
