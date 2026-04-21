import { useEffect, useState, useCallback } from 'react';
import {
  Bold, Italic, Underline, Link, List, ListOrdered,
  Heading2, Heading3, Heading4, Minus, AlignLeft, AlignCenter,
  Type, ALargeSmall, Mail,
} from 'lucide-react';

interface FloatingToolbarProps {
  containerRef: React.RefObject<HTMLElement>;
  disabled?: boolean;
  onExportEmailHtml?: () => void;
}

const FloatingToolbar = ({ containerRef, disabled, onExportEmailHtml }: FloatingToolbarProps) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const handleSelection = useCallback(() => {
    if (disabled) { setPosition(null); return; }
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { setPosition(null); return; }

    const range = sel.getRangeAt(0);
    const container = containerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) {
      setPosition(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setPosition({
      top: rect.top - containerRect.top - 48,
      left: rect.left - containerRect.left + rect.width / 2 - 200,
    });
  }, [containerRef, disabled]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, [handleSelection]);

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    handleSelection();
  };

  const handleLink = () => {
    const url = prompt('URL du lien :');
    if (url) exec('createLink', url);
  };

  const insertHR = () => {
    exec('insertHTML', '<hr class="my-4 border-border"/>');
  };

  const setFontSize = (size: 'small' | 'normal' | 'large') => {
    const sizeMap = { small: '2', normal: '3', large: '5' };
    exec('fontSize', sizeMap[size]);
  };

  if (!position) return null;

  const btnClass = "p-1.5 rounded hover:bg-accent text-foreground/70 hover:text-foreground transition-colors";
  const divider = <div className="w-px h-5 bg-border mx-0.5" />;

  return (
    <div
      className="absolute z-[60] flex items-center gap-0.5 rounded-lg shadow-lg border border-border bg-popover px-1 py-1 animate-in fade-in-0 zoom-in-95 flex-wrap max-w-[420px]"
      style={{ top: position.top, left: Math.max(0, position.left) }}
      onMouseDown={e => e.preventDefault()}
    >
      {/* Format: Bold / Italic / Underline */}
      {[
        { icon: Bold, cmd: 'bold', label: 'Gras' },
        { icon: Italic, cmd: 'italic', label: 'Italique' },
        { icon: Underline, cmd: 'underline', label: 'Souligné' },
      ].map(({ icon: Icon, cmd, label }) => (
        <button key={cmd} onClick={() => exec(cmd)} title={label} className={btnClass}>
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}

      {divider}

      {/* Headings */}
      {[
        { icon: Heading2, block: 'h2', label: 'Titre H2' },
        { icon: Heading3, block: 'h3', label: 'Sous-titre H3' },
        { icon: Heading4, block: 'h4', label: 'Sous-titre H4' },
        { icon: Type, block: 'p', label: 'Paragraphe' },
      ].map(({ icon: Icon, block, label }) => (
        <button key={block} onClick={() => exec('formatBlock', block)} title={label} className={btnClass}>
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}

      {divider}

      {/* Font size */}
      <button onClick={() => setFontSize('small')} title="Petit" className={btnClass}>
        <ALargeSmall className="h-3 w-3" />
      </button>
      <button onClick={() => setFontSize('large')} title="Grand" className={btnClass}>
        <ALargeSmall className="h-4.5 w-4.5" />
      </button>

      {divider}

      {/* Lists */}
      <button onClick={() => exec('insertUnorderedList')} title="Liste à puces" className={btnClass}>
        <List className="h-3.5 w-3.5" />
      </button>
      <button onClick={() => exec('insertOrderedList')} title="Liste numérotée" className={btnClass}>
        <ListOrdered className="h-3.5 w-3.5" />
      </button>

      {divider}

      {/* Alignment */}
      <button onClick={() => exec('justifyLeft')} title="Aligner à gauche" className={btnClass}>
        <AlignLeft className="h-3.5 w-3.5" />
      </button>
      <button onClick={() => exec('justifyCenter')} title="Centrer" className={btnClass}>
        <AlignCenter className="h-3.5 w-3.5" />
      </button>

      {divider}

      {/* HR + Link */}
      <button onClick={insertHR} title="Séparateur horizontal" className={btnClass}>
        <Minus className="h-3.5 w-3.5" />
      </button>
      <button onClick={handleLink} title="Lien" className={btnClass}>
        <Link className="h-3.5 w-3.5" />
      </button>

      {onExportEmailHtml && (
        <>
          {divider}
          <button onClick={onExportEmailHtml} title="Copier HTML email (Brevo)" className={btnClass}>
            <Mail className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
};

export default FloatingToolbar;
