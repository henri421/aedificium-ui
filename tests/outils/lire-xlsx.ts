/**
 * Lecture d'un classeur .xlsx pour les tests (fiche 11.3, T1).
 *
 * Volontairement independante du generateur : seule l'archive ZIP passe par
 * `lireZipSansCompression` d'aedificium-ui ; le XML est lu ici, a part, par
 * expressions regulieres. Ne lit que ce que produit le gabarit.
 */

import { lireZipSansCompression } from '../../src/index';

export interface CelluleLue {
  ref: string;
  colonne: string;
  ligne: number;
  style: number;
  texte?: string;
  formule?: string;
  valeur?: string;
}

export interface ClasseurLu {
  fichiers: Map<string, string>;
  classeur: string;
  feuille: string;
  styles: string;
  cellules: Map<string, CelluleLue>;
  /** Noms definis hors _xlnm : nom -> reference (ex. 'cisaillement-interface'!$C$12). */
  noms: Map<string, string>;
}

const desechapper = (s: string): string =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

export function lireClasseur(octets: Uint8Array): ClasseurLu {
  const fichiers = lireZipSansCompression(octets);
  const classeur = fichiers.get('xl/workbook.xml') ?? '';
  const feuille = fichiers.get('xl/worksheets/sheet1.xml') ?? '';
  const styles = fichiers.get('xl/styles.xml') ?? '';
  const cellules = new Map<string, CelluleLue>();
  for (const m of feuille.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const [, col, lig, attributs, corps = ''] = m;
    const style = Number(/\bs="(\d+)"/.exec(attributs)?.[1] ?? 0);
    const c: CelluleLue = { ref: `${col}${lig}`, colonne: col, ligne: Number(lig), style };
    const f = /<f>([\s\S]*?)<\/f>/.exec(corps);
    if (f) c.formule = desechapper(f[1]);
    const v = /<v>([\s\S]*?)<\/v>/.exec(corps);
    if (v) c.valeur = desechapper(v[1]);
    if (/t="inlineStr"/.test(attributs)) c.texte = desechapper([...corps.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''));
    cellules.set(c.ref, c);
  }
  const noms = new Map<string, string>();
  for (const m of classeur.matchAll(/<definedName name="([^"]+)"[^>]*>([\s\S]*?)<\/definedName>/g)) {
    if (!m[1].startsWith('_xlnm.')) noms.set(m[1], desechapper(m[2]));
  }
  return { fichiers, classeur, feuille, styles, cellules, noms };
}

/** Texte visible d'une cellule (texte en ligne, ou valeur en cache). */
export function texte(c: CelluleLue | undefined): string {
  return c?.texte ?? c?.valeur ?? '';
}

/** Premiere cellule dont le texte vaut exactement `t`. */
export function trouverTexte(l: ClasseurLu, t: string): CelluleLue | undefined {
  return [...l.cellules.values()].find((c) => c.texte === t);
}

/** Cellules d'une ligne, par colonne. */
export function ligneDe(l: ClasseurLu, n: number): Record<string, CelluleLue> {
  const r: Record<string, CelluleLue> = {};
  for (const c of l.cellules.values()) if (c.ligne === n) r[c.colonne] = c;
  return r;
}

/** Element `cellXfs` d'indice `i`, en XML. */
export function xf(l: ClasseurLu, i: number): string {
  const bloc = /<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/.exec(l.styles)?.[1] ?? '';
  return [...bloc.matchAll(/<xf\b[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g)][i]?.[0] ?? '';
}

/** Element n d'une liste (`fonts`, `fills`, `borders`), en XML. */
export function elementDe(l: ClasseurLu, liste: 'fonts' | 'fills' | 'borders', i: number): string {
  const balise = liste.slice(0, -1);
  const bloc = new RegExp(`<${liste}[^>]*>([\\s\\S]*?)</${liste}>`).exec(l.styles)?.[1] ?? '';
  return [...bloc.matchAll(new RegExp(`<${balise}\\b[^>]*?(?:/>|>[\\s\\S]*?</${balise}>)`, 'g'))][i]?.[0] ?? '';
}

/** Code de format de nombre d'un style (formats integres 0, 1, 2 compris). */
export function formatDe(l: ClasseurLu, style: number): string {
  const id = Number(/numFmtId="(\d+)"/.exec(xf(l, style))?.[1] ?? 0);
  if (id === 0) return 'General';
  if (id === 1) return '0';
  if (id === 2) return '0.00';
  const m = new RegExp(`<numFmt numFmtId="${id}" formatCode="([^"]*)"`).exec(l.styles);
  return m ? desechapper(m[1]) : `?${id}`;
}

export function attribut(xml: string, balise: string, nom: string): string | undefined {
  const el = new RegExp(`<${balise}\\b[^>]*>`).exec(xml)?.[0];
  return el ? new RegExp(`\\b${nom}="([^"]*)"`).exec(el)?.[1] : undefined;
}
