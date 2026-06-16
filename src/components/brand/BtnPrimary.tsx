import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BtnPrimaryProps {
  to?: string;
  href?: string;
  onClick?: () => void;
  /** Petite note sous le bouton (ex "30 min, sans engagement"). */
  note?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * CTA primaire charte v4.0 : pilule dégradé terracotta + flèche qui glisse + note.
 * Rend un <Link> (to), un <a> (href) ou un <button> (onClick seul).
 */
export default function BtnPrimary({ to, href, onClick, note, children, className }: BtnPrimaryProps) {
  const inner = (
    <>
      {children}
      <span className="arrow" aria-hidden="true">→</span>
    </>
  );
  const cls = cn("btn-primary", className);

  let btn: React.ReactNode;
  if (to) {
    btn = (
      <Link to={to} onClick={onClick} className={cls}>
        {inner}
      </Link>
    );
  } else if (href) {
    btn = (
      <a href={href} onClick={onClick} className={cls} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined}>
        {inner}
      </a>
    );
  } else {
    btn = (
      <button type="button" onClick={onClick} className={cls}>
        {inner}
      </button>
    );
  }

  if (!note) return btn;
  return (
    <div>
      {btn}
      <span className="ds-btn-note">{note}</span>
    </div>
  );
}
