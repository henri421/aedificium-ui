/**
 * Jetons de l'identite graphique commune, bloc `:root` a embarquer dans les
 * documents exportes (SVG, note de calcul).
 *
 * Un document exporte ne voit pas la feuille de style de la page : sans cette
 * copie, il s'ouvrirait sans couleur. Les valeurs sont celles du `:root` de
 * chaque `style.css` de la suite ; un test de chaque outil peut verifier
 * qu'elles concordent.
 */
export const JETONS = `:root {
  --fond: #f7f7f6;
  --surface: #ffffff;
  --surface-appui: #f2f1ec;
  --texte: #1a1a1a;
  --texte-doux: #4a4842;
  --texte-faible: #6a6862;
  --bordure: #c8c6c0;
  --bordure-douce: #eceae4;
  --accent: #1e5aa8;
  --accent-doux: #eaf1f9;
  --compression: #2f5d8a;
  --traction: #a8442a;
  --beton: #e7eaee;
  --neutre: #9a978f;
  --ok: #1f6f3f;      --ok-fond: #eaf4ee;
  --alerte: #8a6d00;  --alerte-fond: #fdf6e3;
  --refus: #a52121;   --refus-fond: #f8ecec;
  --sans: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --rayon: 4px;
  --rayon-petit: 3px;
  color-scheme: light;
}`;

/** Nom et valeur de chaque jeton, pour comparer deux feuilles de style. */
export function valeursDesJetons(css: string): Map<string, string> {
  const valeurs = new Map<string, string>();
  const sansCommentaires = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of sansCommentaires.matchAll(/(--[a-z-]+)\s*:\s*([^;]+);/g)) {
    valeurs.set(m[1], m[2].trim());
  }
  return valeurs;
}
