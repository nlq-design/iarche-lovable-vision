import { useEffect, useState, useCallback } from 'react';
import { Bold, Italic, Underline, Link, List, ListOrdered } from 'lucide-react';

interface FloatingToolbarProps {
  containerRef: React.RefObject<HTMLElement>;
  disabled?: boolean;
}

const FloatingToolbar = ({ containerRef, disabled }: FloatingToolbarProps) => {
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
      top: rect.top - containerRect.top - 44,
      left: rect.left - containerRect.left + rect.width / 2 - 120,
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

  if (!position) return null;

  return (
    <div
      className="absolute z-[60] flex items-center gap-0.5 rounded-lg shadow-lg border border-border bg-popover px-1 py-1 animate-in fade-in-0 zoom-in-95"
      style={{ top: position.top, left: Math.max(0, position.left) }}
      onMouseDown={e => e.preventDefault()}
    >
      {[
        { icon: Bold, cmd: 'bold', label: 'Gras' },
        { icon: Italic, cmd: 'italic', label: 'Italique' },
        { icon: Underline, cmd: 'underline', label: 'Souligné' },
      ].map(({ icon: Icon, cmd, label }) => (
        <button
          key={cmd}
          onClick={() => exec(cmd)}
          title={label}
          className="p-1.5 rounded hover:bg-accent text-foreground/70 hover:text-foreground transition-colors"
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
      <div className="w-px h-5 bg-border mx-0.5" />
      <button onClick={() => exec('insertUnorderedList')} title="Liste à puces" className="p-1.5 rounded hover:bg-accent text-foreground/70 hover:text-foreground transition-colors">
        <List className="h-3.5 w-3.5" />
      </button>
      <button onClick={() => exec('insertOrderedList')} title="Liste numérotée" className="p-1.5 rounded hover:bg-accent text-foreground/70 hover:text-foreground transition-colors">
        <ListOrdered className="h-3.5 w-3.5" />
      </button>
      <div className="w-px h-5 bg-border mx-0.5" />
      <button onClick={handleLink} title="Lien" className="p-1.5 rounded hover:bg-accent text-foreground/70 hover:text-foreground transition-colors">
        <Link className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default FloatingToolbar;
