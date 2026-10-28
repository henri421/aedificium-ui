/**
 * aedificium-ui — editeur de dessin commun : noeuds et barres.
 *
 * Module PUR, sans DOM : repere, graphe immuable, aimantation, choix sous le
 * pointeur, historique, machine a etats des outils. Le branchement des
 * evenements est dans `editeur-dom.ts` ; le rendu reste a l'app.
 *
 * Aucune unite imposee : les coordonnees sont celles du modele de l'app,
 * `echelle` est en pixels par unite du modele.
 */

export interface Point {
  x: number;
  y: number;
}

/** echelle : pixels par unite du modele ; (x0, y0) : point du modele au coin haut-gauche. */
export interface Vue {
  echelle: number;
  x0: number;
  y0: number;
}

/** Point du modele vers pixels de la zone : le modele a y vers le haut, l'ecran y vers le bas. */
export function versEcran(p: Point, v: Vue): Point {
  return { x: (p.x - v.x0) * v.echelle, y: (v.y0 - p.y) * v.echelle };
}

/** Pixels de la zone vers point du modele : inverse exact de `versEcran`. */
export function versModele(p: Point, v: Vue): Point {
  return { x: p.x / v.echelle + v.x0, y: v.y0 - p.y / v.echelle };
}

/**
 * Vue qui cadre tous les points dans une zone de `largeur` x `hauteur`, avec
 * `marge` pixels de chaque cote. Seules les dimensions non nulles fixent
 * l'echelle ; l'autre est centree. Sans point, vue identite ; un seul point
 * donne l'echelle 1, centre sur lui.
 */
export function vueAjustee(points: readonly Point[], largeur: number, hauteur: number, marge: number): Vue {
  if (points.length === 0) return { echelle: 1, x0: 0, y0: 0 };
  let xmin = points[0].x;
  let xmax = points[0].x;
  let ymin = points[0].y;
  let ymax = points[0].y;
  for (const p of points) {
    if (p.x < xmin) xmin = p.x;
    if (p.x > xmax) xmax = p.x;
    if (p.y < ymin) ymin = p.y;
    if (p.y > ymax) ymax = p.y;
  }
  const w = xmax - xmin;
  const h = ymax - ymin;
  const candidats: number[] = [];
  if (w > 0) candidats.push((largeur - 2 * marge) / w);
  if (h > 0) candidats.push((hauteur - 2 * marge) / h);
  let echelle = candidats.length > 0 ? Math.min(...candidats) : 1;
  // Une marge plus grande que la zone donnerait une echelle nulle ou negative :
  // on retombe sur l'echelle 1 plutot que de rendre une vue degeneree.
  if (!(echelle > 0) || !Number.isFinite(echelle)) echelle = 1;
  const x0 = xmin - (largeur / echelle - w) / 2;
  const y0 = ymax + (hauteur / echelle - h) / 2;
  return { echelle, x0, y0 };
}

export interface NoeudGraphe<N> extends Point {
  id: string;
  donnees: N;
}

export interface BarreGraphe<B> {
  id: string;
  de: string;
  a: string;
  donnees: B;
}

export interface Graphe<N, B> {
  noeuds: NoeudGraphe<N>[];
  barres: BarreGraphe<B>[];
}

export type Selection = { type: 'noeud' | 'barre'; id: string } | null;

/**
 * Identifiant libre : `prefixe` suivi du plus grand entier deja pris, plus un.
 * Les ids d'une autre forme (`N_Col`, `N2a`, `B3`) sont ignores.
 */
export function prochainId(ids: readonly string[], prefixe: string): string {
  let max = 0;
  for (const id of ids) {
    if (!id.startsWith(prefixe)) continue;
    const reste = id.slice(prefixe.length);
    if (!/^\d+$/.test(reste)) continue;
    const n = Number(reste);
    if (Number.isSafeInteger(n) && n > max) max = n;
  }
  return `${prefixe}${max + 1}`;
}

/** Ajoute un noeud ; le graphe d'origine n'est pas modifie. */
export function ajouterNoeud<N, B>(g: Graphe<N, B>, p: Point, donnees: N, prefixe = 'N'): { graphe: Graphe<N, B>; id: string } {
  const id = prochainId(g.noeuds.map((n) => n.id), prefixe);
  const noeud: NoeudGraphe<N> = { id, x: p.x, y: p.y, donnees };
  return { graphe: { noeuds: [...g.noeuds, noeud], barres: g.barres }, id };
}

/** Deplace un noeud ; id inconnu renvoie le meme graphe. */
export function deplacerNoeud<N, B>(g: Graphe<N, B>, id: string, p: Point): Graphe<N, B> {
  if (!g.noeuds.some((n) => n.id === id)) return g;
  return {
    noeuds: g.noeuds.map((n) => (n.id === id ? { ...n, x: p.x, y: p.y } : n)),
    barres: g.barres,
  };
}

/**
 * Relie deux noeuds dans le sens `de` -> `a`. Refuse une boucle, un noeud
 * inconnu ou une barre deja presente entre ces noeuds, dans un sens ou dans
 * l'autre : `id` vaut alors `null` et le graphe est le meme objet.
 */
export function relier<N, B>(g: Graphe<N, B>, de: string, a: string, donnees: B, prefixe = 'B'): { graphe: Graphe<N, B>; id: string | null } {
  const inconnu = (id: string) => !g.noeuds.some((n) => n.id === id);
  const deja = g.barres.some((b) => (b.de === de && b.a === a) || (b.de === a && b.a === de));
  if (de === a || inconnu(de) || inconnu(a) || deja) return { graphe: g, id: null };
  const id = prochainId(g.barres.map((b) => b.id), prefixe);
  const barre: BarreGraphe<B> = { id, de, a, donnees };
  return { graphe: { noeuds: g.noeuds, barres: [...g.barres, barre] }, id };
}

/** Supprime un noeud (avec ses barres) ou une barre ; rien a supprimer renvoie le meme graphe. */
export function supprimer<N, B>(g: Graphe<N, B>, s: Selection): Graphe<N, B> {
  if (s === null) return g;
  if (s.type === 'noeud') {
    if (!g.noeuds.some((n) => n.id === s.id)) return g;
    return {
      noeuds: g.noeuds.filter((n) => n.id !== s.id),
      barres: g.barres.filter((b) => b.de !== s.id && b.a !== s.id),
    };
  }
  if (!g.barres.some((b) => b.id === s.id)) return g;
  return { noeuds: g.noeuds, barres: g.barres.filter((b) => b.id !== s.id) };
}

/**
 * Point d'accroche : le noeud le plus proche a `tolerance` (en unites du
 * modele) l'emporte, avec ses coordonnees exactes ; sinon la grille de pas
 * `pas`, sinon le point tel quel. La grille ne produit jamais -0.
 */
export function aimanter(p: Point, o: { pas: number | null; tolerance: number; points: readonly (Point & { id: string })[] }): { point: Point; noeud: string | null } {
  let proche: (Point & { id: string }) | null = null;
  let meilleur = Infinity;
  const tol2 = o.tolerance * o.tolerance;
  for (const n of o.points) {
    const d2 = (n.x - p.x) ** 2 + (n.y - p.y) ** 2;
    if (d2 <= tol2 && d2 < meilleur) {
      meilleur = d2;
      proche = n;
    }
  }
  if (proche !== null) return { point: { x: proche.x, y: proche.y }, noeud: proche.id };
  if (o.pas === null) return { point: p, noeud: null };
  const arrondi = (v: number) => {
    const r = Math.round(v / o.pas!) * o.pas!;
    return r === 0 ? 0 : r; // Math.round peut rendre -0
  };
  return { point: { x: arrondi(p.x), y: arrondi(p.y) }, noeud: null };
}

/** Distance d'un point a un segment, extremites comprises. */
export function distanceAuSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Noeud le plus proche a `tolerance`, puis barre la plus proche, sinon `null`. */
export function plusProche<N, B>(g: Graphe<N, B>, p: Point, tolerance: number): Selection {
  let meilleur: string | null = null;
  let dmin = Infinity;
  const tol2 = tolerance * tolerance;
  for (const n of g.noeuds) {
    const d2 = (n.x - p.x) ** 2 + (n.y - p.y) ** 2;
    if (d2 <= tol2 && d2 < dmin) {
      dmin = d2;
      meilleur = n.id;
    }
  }
  if (meilleur !== null) return { type: 'noeud', id: meilleur };
  const parId = new Map(g.noeuds.map((n) => [n.id, n]));
  let barre: string | null = null;
  dmin = Infinity;
  for (const b of g.barres) {
    const de = parId.get(b.de);
    const a = parId.get(b.a);
    if (de === undefined || a === undefined) continue;
    const d = distanceAuSegment(p, de, a);
    if (d <= tolerance && d < dmin) {
      dmin = d;
      barre = b.id;
    }
  }
  if (barre !== null) return { type: 'barre', id: barre };
  return null;
}

export interface Historique<T> {
  passe: T[];
  present: T;
  futur: T[];
}

/** Historique neuf, sans passe ni futur. */
export function historique<T>(present: T): Historique<T> {
  return { passe: [], present, futur: [] };
}

/** Empile l'etat courant et retient `etat` comme present ; vide le futur et borne le passe. */
export function pousser<T>(h: Historique<T>, etat: T, limite = 100): Historique<T> {
  const passe = limite <= 0 ? [] : [...h.passe, h.present].slice(-limite);
  return { passe, present: etat, futur: [] };
}

/** Revient a l'etat precedent ; sans passe, renvoie `h` lui-meme. */
export function annuler<T>(h: Historique<T>): Historique<T> {
  if (h.passe.length === 0) return h;
  const present = h.passe[h.passe.length - 1];
  return { passe: h.passe.slice(0, -1), present, futur: [h.present, ...h.futur] };
}

/** Reprend l'etat annule ; sans futur, renvoie `h` lui-meme. */
export function retablir<T>(h: Historique<T>): Historique<T> {
  if (h.futur.length === 0) return h;
  return { passe: [...h.passe, h.present], present: h.futur[0], futur: h.futur.slice(1) };
}

export type Outil = 'selection' | 'noeud' | 'barre' | 'appui' | 'charge' | 'supprimer';

export type ActionEditeur =
  | { type: 'choisir'; selection: Selection }
  | { type: 'deplacer'; id: string; point: Point; fin: boolean }
  | { type: 'ajouter-noeud'; point: Point }
  | { type: 'relier'; de: string; a: string }
  | { type: 'appui'; id: string }
  | { type: 'charge'; id: string }
  | { type: 'supprimer'; selection: { type: 'noeud' | 'barre'; id: string } }
  | { type: 'survol'; point: Point; noeud: string | null }
  | { type: 'annuler' }
  | { type: 'retablir' };

export interface EtatEditeur {
  selection: Selection;
  barreEnCours: string | null;
  glisse: { id: string; bouge: boolean; dernier: Point } | null;
}

export const ETAT_EDITEUR_INITIAL: EtatEditeur = { selection: null, barreEnCours: null, glisse: null };

export interface ContexteEditeur {
  vue: Vue;
  outil: Outil;
  graphe: Graphe<unknown, unknown>;
  pas: number | null;
  tolerancePx: number;
}

/** Noeud le plus proche a `tolerance`, ou `null`. Premier rencontre en cas d'egalite. */
function idNoeudProche(points: readonly (Point & { id: string })[], p: Point, tolerance: number): string | null {
  let id: string | null = null;
  let dmin = Infinity;
  const tol2 = tolerance * tolerance;
  for (const n of points) {
    const d2 = (n.x - p.x) ** 2 + (n.y - p.y) ** 2;
    if (d2 <= tol2 && d2 < dmin) {
      dmin = d2;
      id = n.id;
    }
  }
  return id;
}

/**
 * Traduit un evenement du pointeur, en pixels locaux de la zone, en actions.
 * Toute la decision est ici : l'app applique les actions puis redessine.
 */
export function surPointeur(
  e: EtatEditeur,
  p: { type: 'bas' | 'deplace' | 'haut'; x: number; y: number },
  c: ContexteEditeur,
): { etat: EtatEditeur; actions: ActionEditeur[] } {
  const modele = versModele(p, c.vue);
  const tolerance = c.tolerancePx / c.vue.echelle;
  const points = c.graphe.noeuds;

  if (p.type === 'deplace') {
    if (e.glisse !== null) {
      const id = e.glisse.id;
      const autres = points.filter((n) => n.id !== id);
      const a = aimanter(modele, { pas: c.pas, tolerance, points: autres });
      return {
        etat: { ...e, glisse: { id, bouge: true, dernier: a.point } },
        actions: [{ type: 'deplacer', id, point: a.point, fin: false }],
      };
    }
    const a = aimanter(modele, { pas: c.pas, tolerance, points });
    return { etat: e, actions: [{ type: 'survol', point: a.point, noeud: a.noeud }] };
  }

  if (p.type === 'haut') {
    const actions: ActionEditeur[] = [];
    if (e.glisse !== null && e.glisse.bouge) {
      actions.push({ type: 'deplacer', id: e.glisse.id, point: e.glisse.dernier, fin: true });
    }
    return { etat: e.glisse === null ? e : { ...e, glisse: null }, actions };
  }

  // Changement d'outil : tout `bas` hors barre abandonne la chaine en cours.
  const base: EtatEditeur = c.outil === 'barre' ? e : { ...e, barreEnCours: null };

  switch (c.outil) {
    case 'selection': {
      const selection = plusProche(c.graphe, modele, tolerance);
      const etat: EtatEditeur = {
        ...base,
        selection,
        glisse: selection !== null && selection.type === 'noeud' ? { id: selection.id, bouge: false, dernier: modele } : null,
      };
      return { etat, actions: [{ type: 'choisir', selection }] };
    }
    case 'noeud': {
      const a = aimanter(modele, { pas: c.pas, tolerance, points });
      if (a.noeud !== null) {
        const selection: Selection = { type: 'noeud', id: a.noeud };
        return { etat: { ...base, selection, glisse: null }, actions: [{ type: 'choisir', selection }] };
      }
      return { etat: { ...base, glisse: null }, actions: [{ type: 'ajouter-noeud', point: a.point }] };
    }
    case 'barre': {
      const id = idNoeudProche(points, modele, tolerance);
      if (id === null) return { etat: e, actions: [] };
      if (e.barreEnCours === null) return { etat: { ...e, barreEnCours: id }, actions: [] };
      if (e.barreEnCours === id) return { etat: { ...e, barreEnCours: null }, actions: [] };
      const de = e.barreEnCours;
      return { etat: { ...e, barreEnCours: id }, actions: [{ type: 'relier', de, a: id }] };
    }
    case 'appui':
    case 'charge': {
      const id = idNoeudProche(points, modele, tolerance);
      if (id === null) return { etat: base, actions: [] };
      const action: ActionEditeur = c.outil === 'appui' ? { type: 'appui', id } : { type: 'charge', id };
      return { etat: base, actions: [action] };
    }
    case 'supprimer': {
      const s = plusProche(c.graphe, modele, tolerance);
      return {
        etat: { ...base, selection: null, glisse: null },
        actions: s === null ? [] : [{ type: 'supprimer', selection: s }],
      };
    }
  }
}

/** Traduit une touche en action ; dans un champ de saisie, ne touche a rien. */
export function surTouche(
  e: EtatEditeur,
  t: { cle: string; ctrl: boolean; maj: boolean; dansChamp: boolean },
): { etat: EtatEditeur; actions: ActionEditeur[]; gere: boolean } {
  if (t.dansChamp) return { etat: e, actions: [], gere: false };
  const cle = t.cle.toLowerCase();
  if (cle === 'delete') {
    const actions: ActionEditeur[] = e.selection === null ? [] : [{ type: 'supprimer', selection: e.selection }];
    return { etat: e.selection === null ? e : { ...e, selection: null }, actions, gere: true };
  }
  if (cle === 'escape') {
    return { etat: e.barreEnCours === null ? e : { ...e, barreEnCours: null }, actions: [], gere: true };
  }
  if (t.ctrl && (cle === 'y' || (cle === 'z' && t.maj))) return { etat: e, actions: [{ type: 'retablir' }], gere: true };
  if (t.ctrl && cle === 'z') return { etat: e, actions: [{ type: 'annuler' }], gere: true };
  return { etat: e, actions: [], gere: false };
}
