/**
 * Slugifie un titre pour nommer un fichier téléchargé.
 * Ex: "La Vague de l'IA — Atelier" → "la-vague-de-l-ia-atelier".
 */
export function slugifyFilename(str: string): string {
  return (
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'invitation'
  );
}
