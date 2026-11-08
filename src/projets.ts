/**
 * Projets de la suite : arborescence, feuilles de calcul et heritage.
 *
 *     projet → dossiers libres → elements (reperes P1, M1…) → calculs (une app)
 *            → feuilles de calcul (F1, F2…)
 *
 * Une feuille est soit COMPLETE (`origine === null`, `donnees` = le JSON de
 * l'app), soit HERITEE d'une autre feuille du meme calcul : elle ne stocke
 * alors que ce qui differe (`surcharges`, chemin → valeur) et suit sa feuille
 * d'origine pour tout le reste. Changer le beton de la feuille 1 change donc
 * celui des feuilles qui en heritent, sauf celles qui l'ont surcharge.
 *
 * Ce module est pur (aucun acces au DOM ni au stockage) et sans import : le
 * hub, qui n'a pas de compilation, en charge une copie dont les types sont
 * retires (`_banc-local/copier-projets.mjs`). Pas d'enum, pas de propriete de
 * parametre : le retrait des types doit suffire.
 */

export const FORMAT_PROJET = 'aedificium-projet/1';

export type Json = null | boolean | number | string | Json[] | { [cle: string]: Json };

export type StatutFeuille = 'justifier' | 'etude';

/** `alerte` : ni conforme ni refuse (incomplet, armatures requises...). */
export type EtatVerdict = 'ok' | 'alerte' | 'ko';

export interface Feuille {
  id: string;
  nom: string;
  /** `justifier` : part dans la note ; `etude` : piste en cours ou ecartee. */
  statut: StatutFeuille;
  /** Feuille d'origine (meme calcul), ou null pour une feuille complete. */
  origine: string | null;
  /** JSON complet de l'app, pour une feuille complete ; null sinon. */
  donnees: Json;
  /** Champs qui different de l'origine (chemin → valeur), pour une feuille heritee. */
  surcharges: Record<string, Json>;
  /** Dernier verdict calcule, avec l'empreinte des donnees qui l'ont produit. */
  verdict?: { etat: EtatVerdict; empreinte: string };
}

export interface Calcul {
  type: 'calcul';
  id: string;
  /** Identifiant de l'app : nom de son depot (`mur-en-l`, `section-uls`…). */
  app: string;
  /** Adresse de la page de l'app, sans parametres ; le hub y renvoie. */
  adresse: string;
  nom: string;
  feuilles: Feuille[];
  /** Feuille ouverte en dernier. */
  active: string;
}

export interface ElementProjet {
  type: 'element';
  id: string;
  nom: string;
  calculs: Calcul[];
}

export interface Dossier {
  type: 'dossier';
  id: string;
  nom: string;
  enfants: Noeud[];
}

export type Noeud = Dossier | ElementProjet;

export interface Projet {
  format: typeof FORMAT_PROJET;
  id: string;
  nom: string;
  cree: string;
  modifie: string;
  enfants: Noeud[];
}

/** Resume d'un projet, pour la liste des projets. */
export interface ResumeProjet {
  id: string;
  nom: string;
  modifie: string;
}

export type CodeErreurProjet =
  | 'format'
  | 'introuvable'
  | 'cycle'
  | 'heritiers'
  | 'derniere-feuille'
  | 'deplacement';

/** Erreur metier ; `code` permet a l'interface de traduire le message. */
export class ErreurProjet extends Error {
  code: CodeErreurProjet;
  constructor(code: CodeErreurProjet, message: string) {
    super(message);
    this.name = 'ErreurProjet';
    this.code = code;
  }
}

/* ------------------------------------------------------------------ */
/* Identifiants et dates                                              */
/* ------------------------------------------------------------------ */

let compteur = 0;

/** Identifiant stable : renommer ou deplacer un noeud ne le change pas. */
export function nouvelId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  compteur += 1;
  return `id-${Date.now().toString(36)}-${compteur.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const maintenant = (): string => new Date().toISOString();

/* ------------------------------------------------------------------ */
/* Chemins JSON et differences                                        */
/* ------------------------------------------------------------------ */

/** Marque d'un champ present a l'origine et retire dans la feuille heritee. */
export const SUPPRIME: Json = { '~supprime': true };

const estSupprime = (v: Json): boolean =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length === 1 && v['~supprime'] === true;

const estObjet = (v: Json | undefined): v is { [cle: string]: Json } =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Chemin d'un champ : cles jointes par `/` (`~` et `/` echappes comme en JSON Pointer). */
export function chemin(cles: readonly string[]): string {
  return cles.map((c) => c.replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
}

export function clesDuChemin(c: string): string[] {
  return c === '' ? [] : c.split('/').map((k) => k.replace(/~1/g, '/').replace(/~0/g, '~'));
}

export function copie<T extends Json>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/**
 * Feuilles de l'arbre JSON, par chemin. Les tableaux et les objets vides sont
 * des valeurs entieres : une liste de bandes de charge se surcharge d'un bloc.
 */
export function aplatir(v: Json, prefixe: string[] = [], sortie: Map<string, Json> = new Map()): Map<string, Json> {
  if (estObjet(v) && Object.keys(v).length > 0) {
    for (const [k, x] of Object.entries(v)) aplatir(x, [...prefixe, k], sortie);
  } else {
    sortie.set(chemin(prefixe), v);
  }
  return sortie;
}

const egaux = (a: Json, b: Json): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Ce qui differe de `base` dans `v` : champs changes ou ajoutes, et champs retires. */
export function difference(base: Json, v: Json): Record<string, Json> {
  const a = aplatir(base);
  const b = aplatir(v);
  const d: Record<string, Json> = {};
  for (const [c, x] of b) {
    if (!a.has(c) || !egaux(a.get(c) as Json, x)) d[c] = copie(x);
  }
  for (const c of a.keys()) {
    if (!b.has(c)) d[c] = copie(SUPPRIME);
  }
  return d;
}

function poser(racine: Json, cles: string[], valeur: Json): Json {
  if (cles.length === 0) return copie(valeur);
  const o: { [cle: string]: Json } = estObjet(racine) ? racine : {};
  const [tete, ...reste] = cles;
  o[tete] = poser(o[tete] ?? null, reste, valeur);
  return o;
}

function retirer(racine: Json, cles: string[]): Json {
  if (cles.length === 0) return null;
  if (!estObjet(racine)) return racine;
  const [tete, ...reste] = cles;
  if (!(tete in racine)) return racine;
  if (reste.length === 0) delete racine[tete];
  else racine[tete] = retirer(racine[tete], reste);
  return racine;
}

/** Recompose une feuille : copie de la base, retraits d'abord, puis valeurs posees. */
export function appliquer(base: Json, surcharges: Record<string, Json>): Json {
  let r = copie(base);
  const entrees = Object.entries(surcharges);
  for (const [c, v] of entrees) if (estSupprime(v)) r = retirer(r, clesDuChemin(c));
  for (const [c, v] of entrees) if (!estSupprime(v)) r = poser(r, clesDuChemin(c), v);
  return r;
}

/* ------------------------------------------------------------------ */
/* Projet et arborescence                                             */
/* ------------------------------------------------------------------ */

export function creerProjet(nom: string): Projet {
  const t = maintenant();
  return { format: FORMAT_PROJET, id: nouvelId(), nom, cree: t, modifie: t, enfants: [] };
}

export function toucher(p: Projet): void {
  p.modifie = maintenant();
}

interface Place {
  noeud: Noeud;
  liste: Noeud[];
  parent: Dossier | null;
}

/** Dossier ou element, et la liste qui le contient. */
export function trouverNoeud(p: Projet, id: string): Place | null {
  const chercher = (liste: Noeud[], parent: Dossier | null): Place | null => {
    for (const n of liste) {
      if (n.id === id) return { noeud: n, liste, parent };
      if (n.type === 'dossier') {
        const r = chercher(n.enfants, n);
        if (r) return r;
      }
    }
    return null;
  };
  return chercher(p.enfants, null);
}

/** Tous les elements du projet, dans l'ordre de l'arbre. */
export function elements(p: Projet): ElementProjet[] {
  const r: ElementProjet[] = [];
  const parcourir = (l: Noeud[]): void => {
    for (const n of l) {
      if (n.type === 'element') r.push(n);
      else parcourir(n.enfants);
    }
  };
  parcourir(p.enfants);
  return r;
}

export function trouverCalcul(p: Projet, id: string): { calcul: Calcul; element: ElementProjet } | null {
  for (const e of elements(p)) {
    const c = e.calculs.find((x) => x.id === id);
    if (c) return { calcul: c, element: e };
  }
  return null;
}

/** Noms du dossier racine jusqu'au noeud (fil d'Ariane), noeud compris. */
export function cheminDuNoeud(p: Projet, id: string): string[] {
  const descendre = (liste: Noeud[], acc: string[]): string[] | null => {
    for (const n of liste) {
      if (n.id === id) return [...acc, n.nom];
      if (n.type === 'dossier') {
        const r = descendre(n.enfants, [...acc, n.nom]);
        if (r) return r;
      } else {
        const c = n.calculs.find((x) => x.id === id);
        if (c) return [...acc, n.nom, c.nom];
      }
    }
    return null;
  };
  return descendre(p.enfants, []) ?? [];
}

function listeDuParent(p: Projet, parentId: string | null): Noeud[] {
  if (parentId === null) return p.enfants;
  const place = trouverNoeud(p, parentId);
  if (!place || place.noeud.type !== 'dossier') {
    throw new ErreurProjet('introuvable', `Dossier introuvable : ${parentId}`);
  }
  return place.noeud.enfants;
}

export function ajouterDossier(p: Projet, parentId: string | null, nom: string): Dossier {
  const d: Dossier = { type: 'dossier', id: nouvelId(), nom, enfants: [] };
  listeDuParent(p, parentId).push(d);
  toucher(p);
  return d;
}

export function ajouterElement(p: Projet, parentId: string | null, nom: string): ElementProjet {
  const e: ElementProjet = { type: 'element', id: nouvelId(), nom, calculs: [] };
  listeDuParent(p, parentId).push(e);
  toucher(p);
  return e;
}

/** Nouveau calcul d'un element, avec une premiere feuille complete. */
export function ajouterCalcul(
  p: Projet,
  elementId: string,
  app: { app: string; adresse: string; nom: string },
  donnees: Json,
  nomFeuille = 'Feuille 1'
): Calcul {
  const place = trouverNoeud(p, elementId);
  if (!place || place.noeud.type !== 'element') {
    throw new ErreurProjet('introuvable', `Élément introuvable : ${elementId}`);
  }
  const f: Feuille = { id: nouvelId(), nom: nomFeuille, statut: 'justifier', origine: null, donnees: copie(donnees), surcharges: {} };
  const c: Calcul = { type: 'calcul', id: nouvelId(), app: app.app, adresse: app.adresse, nom: app.nom, feuilles: [f], active: f.id };
  place.noeud.calculs.push(c);
  toucher(p);
  return c;
}

/** Renomme un dossier, un element, un calcul ou une feuille. */
export function renommer(p: Projet, id: string, nom: string): void {
  const place = trouverNoeud(p, id);
  if (place) {
    place.noeud.nom = nom;
    toucher(p);
    return;
  }
  for (const e of elements(p)) {
    for (const c of e.calculs) {
      if (c.id === id) {
        c.nom = nom;
        toucher(p);
        return;
      }
      const f = c.feuilles.find((x) => x.id === id);
      if (f) {
        f.nom = nom;
        toucher(p);
        return;
      }
    }
  }
  throw new ErreurProjet('introuvable', `Introuvable : ${id}`);
}

function contient(n: Noeud, id: string): boolean {
  return n.type === 'dossier' && n.enfants.some((x) => x.id === id || contient(x, id));
}

/** Deplace un dossier ou un element vers un dossier (null : racine), a la position `index`. */
export function deplacer(p: Projet, id: string, versParentId: string | null, index?: number): void {
  const place = trouverNoeud(p, id);
  if (!place) throw new ErreurProjet('introuvable', `Introuvable : ${id}`);
  if (versParentId === id || (versParentId !== null && contient(place.noeud, versParentId))) {
    throw new ErreurProjet('deplacement', 'Un dossier ne peut pas entrer dans lui-même ni dans un de ses sous-dossiers.');
  }
  const cible = listeDuParent(p, versParentId);
  place.liste.splice(place.liste.indexOf(place.noeud), 1);
  const i = index === undefined ? cible.length : Math.max(0, Math.min(index, cible.length));
  cible.splice(i, 0, place.noeud);
  toucher(p);
}

/** Supprime un dossier (avec son contenu), un element ou un calcul. */
export function supprimerNoeud(p: Projet, id: string): void {
  const place = trouverNoeud(p, id);
  if (place) {
    place.liste.splice(place.liste.indexOf(place.noeud), 1);
    toucher(p);
    return;
  }
  const t = trouverCalcul(p, id);
  if (!t) throw new ErreurProjet('introuvable', `Introuvable : ${id}`);
  t.element.calculs.splice(t.element.calculs.indexOf(t.calcul), 1);
  toucher(p);
}

/** Copie d'un calcul avec de nouveaux identifiants ; l'heritage interne suit. */
function copierCalcul(c: Calcul): Calcul {
  const nouveaux = new Map(c.feuilles.map((f) => [f.id, nouvelId()]));
  const feuilles: Feuille[] = c.feuilles.map((f) => ({
    ...(JSON.parse(JSON.stringify(f)) as Feuille),
    id: nouveaux.get(f.id) as string,
    origine: f.origine === null ? null : (nouveaux.get(f.origine) ?? null),
  }));
  return { ...c, id: nouvelId(), feuilles, active: nouveaux.get(c.active) ?? feuilles[0].id };
}

function copierNoeud(n: Noeud): Noeud {
  if (n.type === 'element') return { type: 'element', id: nouvelId(), nom: n.nom, calculs: n.calculs.map(copierCalcul) };
  return { type: 'dossier', id: nouvelId(), nom: n.nom, enfants: n.enfants.map(copierNoeud) };
}

/**
 * Duplique un dossier, un element (avec tous ses calculs) ou un calcul, juste
 * apres l'original. La copie est independante de l'original.
 */
export function dupliquer(p: Projet, id: string, suffixe = ' (copie)'): string {
  const place = trouverNoeud(p, id);
  if (place) {
    const n = copierNoeud(place.noeud);
    n.nom += suffixe;
    place.liste.splice(place.liste.indexOf(place.noeud) + 1, 0, n);
    toucher(p);
    return n.id;
  }
  const t = trouverCalcul(p, id);
  if (!t) throw new ErreurProjet('introuvable', `Introuvable : ${id}`);
  const c = copierCalcul(t.calcul);
  c.nom += suffixe;
  t.element.calculs.splice(t.element.calculs.indexOf(t.calcul) + 1, 0, c);
  toucher(p);
  return c.id;
}

/* ------------------------------------------------------------------ */
/* Feuilles de calcul et heritage                                     */
/* ------------------------------------------------------------------ */

export function trouverFeuille(c: Calcul, id: string): Feuille {
  const f = c.feuilles.find((x) => x.id === id);
  if (!f) throw new ErreurProjet('introuvable', `Feuille introuvable : ${id}`);
  return f;
}

/** JSON complet d'une feuille, origine et surcharges recomposees. */
export function donneesDeFeuille(c: Calcul, id: string): Json {
  const vus = new Set<string>();
  const recomposer = (fid: string): Json => {
    if (vus.has(fid)) throw new ErreurProjet('cycle', 'Héritage circulaire entre feuilles.');
    vus.add(fid);
    const f = trouverFeuille(c, fid);
    return f.origine === null ? copie(f.donnees) : appliquer(recomposer(f.origine), f.surcharges);
  };
  return recomposer(id);
}

/**
 * Enregistre le JSON complet saisi dans une feuille. Une feuille heritee n'en
 * garde que la difference avec son origine.
 */
export function ecrireFeuille(c: Calcul, id: string, donnees: Json): void {
  const f = trouverFeuille(c, id);
  if (f.origine === null) f.donnees = copie(donnees);
  else f.surcharges = difference(donneesDeFeuille(c, f.origine), donnees);
}

/** Chemins des champs propres a une feuille heritee (vide pour une feuille complete). */
export function champsSurcharges(c: Calcul, id: string): string[] {
  return Object.keys(trouverFeuille(c, id).surcharges);
}

/** Nom libre suivant : « Feuille 2 », « Feuille 3 »… (`Sheet` en anglais). */
function nomSuivant(c: Calcul, prefixe: string): string {
  let n = c.feuilles.length + 1;
  const pris = new Set(c.feuilles.map((f) => f.nom));
  while (pris.has(`${prefixe} ${n}`)) n += 1;
  return `${prefixe} ${n}`;
}

/**
 * Duplique une feuille, juste apres elle. `liee` (par defaut) : la copie herite
 * de la feuille dupliquee ; sinon c'est une copie complete et independante.
 */
export function dupliquerFeuille(c: Calcul, id: string, liee = true, prefixe = 'Feuille'): Feuille {
  const src = trouverFeuille(c, id);
  const f: Feuille = liee
    ? { id: nouvelId(), nom: nomSuivant(c, prefixe), statut: src.statut, origine: src.id, donnees: null, surcharges: {} }
    : { id: nouvelId(), nom: nomSuivant(c, prefixe), statut: src.statut, origine: null, donnees: donneesDeFeuille(c, id), surcharges: {} };
  c.feuilles.splice(c.feuilles.indexOf(src) + 1, 0, f);
  c.active = f.id;
  return f;
}

/** Fait d'une feuille heritee une copie complete : elle ne suit plus son origine. */
export function detacherFeuille(c: Calcul, id: string): void {
  const f = trouverFeuille(c, id);
  if (f.origine === null) return;
  f.donnees = donneesDeFeuille(c, id);
  f.origine = null;
  f.surcharges = {};
}

/** Rend a des champs (et a leurs sous-champs) la valeur de la feuille d'origine. */
export function revenirAOrigine(c: Calcul, id: string, chemins: readonly string[]): void {
  const f = trouverFeuille(c, id);
  for (const k of Object.keys(f.surcharges)) {
    if (chemins.some((x) => k === x || k.startsWith(`${x}/`))) delete f.surcharges[k];
  }
}

/** Feuilles qui heritent directement de `id`. */
export function heritiers(c: Calcul, id: string): Feuille[] {
  return c.feuilles.filter((f) => f.origine === id);
}

/** Refuse de supprimer la derniere feuille, ou une feuille dont d'autres heritent. */
export function supprimerFeuille(c: Calcul, id: string): void {
  const f = trouverFeuille(c, id);
  if (c.feuilles.length === 1) throw new ErreurProjet('derniere-feuille', 'Un calcul garde au moins une feuille.');
  const h = heritiers(c, id);
  if (h.length > 0) {
    throw new ErreurProjet(
      'heritiers',
      `Des feuilles héritent de « ${f.nom} » (${h.map((x) => x.nom).join(', ')}) : détachez-les d'abord.`
    );
  }
  c.feuilles.splice(c.feuilles.indexOf(f), 1);
  if (c.active === id) c.active = c.feuilles[0].id;
}

export function definirStatut(c: Calcul, id: string, statut: StatutFeuille): void {
  trouverFeuille(c, id).statut = statut;
}

/* ------------------------------------------------------------------ */
/* Fichier de projet                                                  */
/* ------------------------------------------------------------------ */

export function exporterProjet(p: Projet): string {
  return JSON.stringify(p, null, 2);
}

const texte = (v: unknown): v is string => typeof v === 'string';

function controlerFeuille(f: unknown): f is Feuille {
  if (typeof f !== 'object' || f === null) return false;
  const o = f as Record<string, unknown>;
  return (
    texte(o.id) &&
    texte(o.nom) &&
    (o.statut === 'justifier' || o.statut === 'etude') &&
    (o.origine === null || texte(o.origine)) &&
    typeof o.surcharges === 'object' &&
    o.surcharges !== null
  );
}

function controlerNoeud(n: unknown): boolean {
  if (typeof n !== 'object' || n === null) return false;
  const o = n as Record<string, unknown>;
  if (!texte(o.id) || !texte(o.nom)) return false;
  if (o.type === 'dossier') return Array.isArray(o.enfants) && o.enfants.every(controlerNoeud);
  if (o.type !== 'element' || !Array.isArray(o.calculs)) return false;
  return o.calculs.every((c) => {
    if (typeof c !== 'object' || c === null) return false;
    const k = c as Record<string, unknown>;
    if (!texte(k.id) || !texte(k.app) || !texte(k.nom) || !Array.isArray(k.feuilles) || k.feuilles.length === 0) return false;
    if (!k.feuilles.every(controlerFeuille)) return false;
    const ids = new Set((k.feuilles as Feuille[]).map((f) => f.id));
    return (k.feuilles as Feuille[]).every((f) => f.origine === null || ids.has(f.origine));
  });
}

/** Relit un fichier de projet ; refuse net un format inconnu ou un arbre incoherent. */
export function importerProjet(contenu: string): Projet {
  let brut: unknown;
  try {
    brut = JSON.parse(contenu);
  } catch {
    throw new ErreurProjet('format', 'Fichier illisible : ce n’est pas du JSON.');
  }
  const o = brut as Record<string, unknown>;
  if (typeof o !== 'object' || o === null || o.format !== FORMAT_PROJET) {
    throw new ErreurProjet('format', `Format inconnu : ${JSON.stringify(o?.format)} (attendu ${FORMAT_PROJET}).`);
  }
  if (!texte(o.id) || !texte(o.nom) || !Array.isArray(o.enfants) || !o.enfants.every(controlerNoeud)) {
    throw new ErreurProjet('format', 'Fichier de projet incomplet ou incohérent.');
  }
  const p = brut as Projet;
  for (const e of elements(p)) {
    for (const c of e.calculs) {
      if (!texte(c.adresse)) c.adresse = '';
      if (!c.feuilles.some((f) => f.id === c.active)) c.active = c.feuilles[0].id;
      for (const f of c.feuilles) donneesDeFeuille(c, f.id); // detecte les cycles
    }
  }
  if (!texte(p.cree)) p.cree = maintenant();
  if (!texte(p.modifie)) p.modifie = p.cree;
  return p;
}

/** Empreinte courte des donnees d'une feuille : sert a reperer un verdict perime. */
function empreinte(c: Calcul, id: string): string {
  let h = 5381;
  for (const car of JSON.stringify(donneesDeFeuille(c, id))) h = (h * 33 + car.charCodeAt(0)) >>> 0;
  return h.toString(36);
}

/** Enregistre le verdict que l'app vient de calculer ; `null` l'efface. */
export function definirVerdict(c: Calcul, id: string, etat: EtatVerdict | null): void {
  const f = trouverFeuille(c, id);
  if (etat === null) delete f.verdict;
  else f.verdict = { etat, empreinte: empreinte(c, id) };
}

/**
 * Verdict d'une feuille. `perime` : ses donnees ont change depuis le calcul,
 * typiquement parce que la feuille d'origine a ete modifiee ; il faut rouvrir
 * la feuille pour le recalculer. Un verdict perime n'est jamais montre comme valable.
 */
export function verdictDeFeuille(c: Calcul, id: string): EtatVerdict | 'perime' | null {
  const f = trouverFeuille(c, id);
  if (!f.verdict) return null;
  return f.verdict.empreinte === empreinte(c, id) ? f.verdict.etat : 'perime';
}

/** Pire verdict des feuilles a justifier d'un calcul (les etudes ne comptent pas). */
export function verdictDuCalcul(c: Calcul): EtatVerdict | 'perime' | null {
  const vus = c.feuilles.filter((f) => f.statut === 'justifier').map((f) => verdictDeFeuille(c, f.id));
  return (['ko', 'perime', 'alerte', 'ok'] as const).find((v) => vus.includes(v)) ?? null;
}
