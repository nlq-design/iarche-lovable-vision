#!/usr/bin/env node
/**
 * Charte v4.0 — swap sémantique des tokens dans le code CUSTOM (hors src/components/ui).
 *
 * Nouveau mapping shadcn :
 *   primary   = Terracotta  (action)
 *   accent    = Sable        (hover subtil shadcn)
 *   secondary = Bleu Nuit    (surfaces navy)
 *   foreground= Bleu Nuit    (texte navy)
 *   muted     = Sable        (surfaces douces)
 *
 * Le code Lovable a été écrit avec la convention INVERSE
 * (primary=navy, accent=terracotta, secondary=sable). On rebranche donc
 * chaque MEANING vers le token qui le porte désormais :
 *   primary(navy)   -> secondary (bg/border/ring/gradient) + foreground (texte)
 *   accent(terra)   -> primary
 *   secondary(sable)-> muted
 *   accent sable-hover shadcn (`:bg-accent`, `accent-foreground`) -> reste accent
 *
 * Rotation sans collision : on passe le navy par des placeholders avant de
 * réaffecter `primary` au terracotta.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../src', import.meta.url).pathname;
const SKIP = '/components/ui/';

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (p.endsWith('.tsx') && !p.includes(SKIP)) acc.push(p);
  }
  return acc;
}

/** Replacements appliqués dans l'ordre, par fichier. */
function transform(src) {
  let s = src;

  // ─── PHASE A : primary (navy original) -> placeholders ───────────────
  s = s.replaceAll('primary-foreground', '@NVFG@');          // cream-on-navy
  s = s.replaceAll('text-primary',       'text-@NVT@');      // texte navy
  s = s.replaceAll('hover:text-primary', 'hover:text-@NVT@');// (déjà couvert par substring, sûreté)
  s = s.replaceAll('fill-primary',       'fill-@NVT@');
  s = s.replaceAll('decoration-primary', 'decoration-@NVT@');
  s = s.replaceAll('bg-primary',         'bg-@NV@');
  s = s.replaceAll('border-primary',     'border-@NV@');
  s = s.replaceAll('ring-primary',       'ring-@NV@');
  s = s.replaceAll('from-primary',       'from-@NV@');
  s = s.replaceAll('to-primary',         'to-@NV@');
  s = s.replaceAll('via-primary',        'via-@NV@');
  // NB: "accent-primary" (accent-color util) intentionnellement laissé.

  // ─── PHASE B : secondary (sable original) -> muted ───────────────────
  s = s.replaceAll('secondary-foreground', 'foreground');   // navy-on-sable -> texte navy
  s = s.replaceAll('bg-secondary',         'bg-muted');
  s = s.replaceAll('border-secondary',     'border-muted');
  s = s.replaceAll('ring-secondary',       'ring-muted');

  // ─── PHASE C : accent (terracotta) -> primary ────────────────────────
  // Exception terracotta : darken d'un bouton terracotta solide.
  s = s.replaceAll('hover:bg-accent/90', 'hover:bg-primary/90');
  s = s.replaceAll('hover:bg-accent/80', 'hover:bg-primary/80');
  // Protéger les hovers/sélections SABLE (shadcn) : tout ":bg-accent" + accent-foreground.
  s = s.replaceAll('accent-foreground', '@AF@');
  s = s.replace(/(:)(bg-accent)/g, '$1@SBA@');              // hover:/focus:/aria-selected:/...
  // Le reste des "accent" = vraie terracotta -> primary.
  s = s.replaceAll('text-accent',       'text-primary');
  s = s.replaceAll('bg-accent',         'bg-primary');
  s = s.replaceAll('border-accent',     'border-primary');
  s = s.replaceAll('ring-accent',       'ring-primary');
  s = s.replaceAll('from-accent',       'from-primary');
  s = s.replaceAll('to-accent',         'to-primary');
  s = s.replaceAll('via-accent',        'via-primary');
  s = s.replaceAll('decoration-accent', 'decoration-primary');
  s = s.replaceAll('fill-accent',       'fill-primary');
  // Restaurer les protégés.
  s = s.replaceAll('@AF@',  'accent-foreground');
  s = s.replaceAll('@SBA@', 'bg-accent');

  // ─── PHASE D : résoudre les placeholders navy ────────────────────────
  s = s.replaceAll('@NVFG@', 'secondary-foreground');       // cream-on-navy
  s = s.replaceAll('@NVT@',  'foreground');                 // texte navy
  s = s.replaceAll('@NV@',   'secondary');                  // surface navy

  return s;
}

const files = walk(ROOT);
let changed = 0;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const out = transform(src);
  if (out !== src) {
    writeFileSync(f, out);
    changed++;
  }
}
console.log(`Fichiers analysés : ${files.length} — modifiés : ${changed}`);
