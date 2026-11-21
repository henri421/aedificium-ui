/**
 * Classeur Excel commun a formules (fiche 11.3, S5) : meme format et meme
 * style pour toutes les apps de la suite.
 *
 * L'app ne fournit que des DONNEES (`ClasseurCalcul`) ; toute la mise en
 * page vit ici :
 * - une seule feuille, sans renvoi entre feuilles ;
 * - imprimable telle quelle en A4 portrait, une page en largeur ;
 * - aucun texte d'explication ;
 * - Calibri pour le texte, Consolas pour les nombres ;
 * - couleurs des jetons communs ;
 * - feuille protegee sans mot de passe, seules les saisies sont libres.
 *
 * Reference de rendu : la maquette T0 validee le 2026-11-20
 * (plan-webaedificium/maquette-excel/).
 *
 * Fonctions PURES : elles rendent des octets, le telechargement vit dans l'app.
 */

import { JETONS, valeursDesJetons } from './jetons';
import { langueCourante, type Langue } from './langue';
import { echapperXml as x, lireZipSansCompression, zipSansCompression } from './xlsx';

// --- Donnees fournies par l'app ------------------------------------------------

export interface CartoucheXlsx {
  /** Ligne 1 de la feuille. */
  titre: string;
  projet: string;
  element: string;
  /** Nom du depot ; sert aussi de nom de feuille. */
  outil: string;
  /** « 0.2.0 (a1b2c3d) ». */
  version: string;
  norme: string;
  annexe?: string;
  /** AAAA-MM-JJ. */
  date: string;
  /** Moteurs d'autres apps appeles (11.2) : « colonne-ec2 0.4.0 ». */
  moteurs?: readonly string[];
}

export interface LigneDonneeXlsx {
  grandeur: string;
  symbole: string;
  /** Nom defini ; une donnee de texte n'en a pas. */
  nom?: string;
  /** Une chaine : donnee de texte (etat de surface...), saisissable. */
  valeur: number | string;
  unite: string;
  /** 3 par defaut. */
  decimales?: number;
  source?: string;
}

export interface LigneCalculXlsx {
  grandeur: string;
  symbole: string;
  nom: string;
  /** Syntaxe Excel en anglais, sans « = », noms definis seulement. */
  formule: string;
  /** Valeur du noyau, ecrite en cache. */
  valeur: number;
  unite: string;
  /** 3 par defaut. */
  decimales?: number;
  clause?: string;
}

export interface GroupeXlsx<L> {
  titre: string;
  lignes: readonly L[];
}

export interface VerificationXlsx {
  nom: string;
  /** Formule. */
  sollicitation: string;
  /** Formule. */
  resistance: string;
  unite: string;
  valeurSollicitation: number;
  /** Strictement positive. */
  valeurResistance: number;
  /** 3 par defaut. */
  decimales?: number;
  clause?: string;
}

export interface ClasseurCalcul {
  cartouche: CartoucheXlsx;
  donnees: readonly GroupeXlsx<LigneDonneeXlsx>[];
  calcul: readonly GroupeXlsx<LigneCalculXlsx>[];
  verifications: readonly VerificationXlsx[];
}

// --- Constantes du gabarit -----------------------------------------------------

/** Seules fonctions admises dans une formule (l'evaluateur de test T2 les connait toutes). */
export const FONCTIONS_XLSX_PERMISES: readonly string[] = [
  'ABS', 'COS', 'EXP', 'IF', 'LN', 'MAX', 'MIN', 'PI', 'POWER', 'RADIANS', 'ROUNDDOWN', 'ROUNDUP', 'SIN', 'SQRT', 'TAN',
];

/** Largeurs des colonnes A a F (caracteres), celles de la maquette : la feuille tient sur une largeur A4. */
export const LARGEURS_COLONNES_XLSX: readonly number[] = [34, 11, 12, 8, 16, 19];

/** Lignes d'une page A4 imprimee, estimation pour les sauts de page. */
export const LIGNES_PAR_PAGE_XLSX = 52;

/** Unites portees dans le format des cellules de verification. */
const UNITES = ['MPa', 'kN', 'kN·m', 'kN/m', 'kPa', 'mm', 'm', 'mm²/m', '%'] as const;
const DECIMALES_MAX = 6;

const MOTS = {
  fr: {
    donnees: 'Données', calcul: 'Calcul', verifications: 'Vérifications',
    grandeur: 'Grandeur', symbole: 'Symbole', valeur: 'Valeur', unite: 'Unité', source: 'Source', clause: 'Clause',
    verification: 'Vérification', sollicitation: 'Sollicitation', resistance: 'Résistance', taux: 'Taux', verdict: 'Verdict',
    projet: 'Projet', element: 'Élément', outil: 'Outil', norme: 'Norme', annexe: 'Annexe', date: 'Date', moteurs: 'Moteurs',
    ok: 'OK', nonConforme: 'NON CONFORME',
  },
  en: {
    donnees: 'Data', calcul: 'Calculation', verifications: 'Checks',
    grandeur: 'Quantity', symbole: 'Symbol', valeur: 'Value', unite: 'Unit', source: 'Source', clause: 'Clause',
    verification: 'Check', sollicitation: 'Action effect', resistance: 'Resistance', taux: 'Ratio', verdict: 'Verdict',
    projet: 'Project', element: 'Element', outil: 'Tool', norme: 'Standard', annexe: 'Annex', date: 'Date', moteurs: 'Engines',
    ok: 'OK', nonConforme: 'NOT OK',
  },
} as const;

type Mots = (typeof MOTS)[Langue];

function entetesDonnees(m: Mots): string[] {
  return [m.grandeur, m.symbole, m.valeur, m.unite, '', m.source];
}
function entetesCalcul(m: Mots): string[] {
  return [m.grandeur, m.symbole, m.valeur, m.unite, '', m.clause];
}
function entetesVerifications(m: Mots): string[] {
  return [m.verification, m.sollicitation, m.resistance, m.taux, m.verdict, m.clause];
}

// --- Styles (table fixe, identique pour tout classeur) ------------------------

const JETON = (() => {
  const v = valeursDesJetons(JETONS);
  const hex = (nom: string): string => (v.get(nom) ?? '').replace('#', '').toUpperCase();
  return {
    surface: hex('--surface'), texte: hex('--texte'), doux: hex('--texte-doux'), faible: hex('--texte-faible'),
    appui: hex('--surface-appui'), bordure: hex('--bordure'), bordureDouce: hex('--bordure-douce'),
    accent: hex('--accent'), accentDoux: hex('--accent-doux'),
    ok: hex('--ok'), okFond: hex('--ok-fond'), alerte: hex('--alerte'), alerteFond: hex('--alerte-fond'),
    refus: hex('--refus'), refusFond: hex('--refus-fond'),
  };
})();
const rgb = (h: string): string => `rgb="FF${h}"`;

const police = (taille: number, couleur: string, nom: 'Calibri' | 'Consolas', gras = false): string =>
  `<font>${gras ? '<b/>' : ''}<sz val="${taille}"/><color ${rgb(couleur)}/><name val="${nom}"/><family val="${nom === 'Calibri' ? 2 : 3}"/></font>`;

const POLICES = {
  texte: 0, titre: 1, faible: 2, bloc: 3, gras: 4, nombre: 5, unite: 6, note: 7, taux: 8,
} as const;
const FONTS = [
  police(10, JETON.texte, 'Calibri'),
  police(14, JETON.texte, 'Calibri', true),
  police(9, JETON.faible, 'Calibri'),
  police(12, JETON.texte, 'Calibri', true),
  police(10, JETON.texte, 'Calibri', true),
  police(10, JETON.texte, 'Consolas'),
  police(10, JETON.doux, 'Consolas'),
  police(9, JETON.doux, 'Calibri'),
  police(10, JETON.texte, 'Consolas', true),
];
const FILLS = [
  '<fill><patternFill patternType="none"/></fill>',
  '<fill><patternFill patternType="gray125"/></fill>',
  `<fill><patternFill patternType="solid"><fgColor ${rgb(JETON.appui)}/><bgColor indexed="64"/></patternFill></fill>`,
  `<fill><patternFill patternType="solid"><fgColor ${rgb(JETON.accentDoux)}/><bgColor indexed="64"/></patternFill></fill>`,
];
const FOND = { aucun: 0, appui: 2, saisie: 3 } as const;
const filetBas = (c: string): string => `<border><left/><right/><top/><bottom style="thin"><color ${rgb(c)}/></bottom><diagonal/></border>`;
const cote = (n: string): string => `<${n} style="thin"><color ${rgb(JETON.accent)}/></${n}>`;
const BORDERS = [
  '<border><left/><right/><top/><bottom/><diagonal/></border>',
  filetBas(JETON.bordure),
  filetBas(JETON.bordureDouce),
  `<border>${cote('left')}${cote('right')}${cote('top')}${cote('bottom')}<diagonal/></border>`,
];
const FILET = { aucun: 0, fort: 1, doux: 2, saisie: 3 } as const;

/** Format de nombre a d decimales, avec l'unite en suffixe eventuellement. */
function codeFormat(d: number, unite?: string): string {
  const base = d === 0 ? '0' : `0.${'0'.repeat(d)}`;
  return unite ? `${base}" ${unite}"` : base;
}

const FORMATS = (() => {
  const ids = new Map<string, number>([
    ['0', 1],
    ['0.00', 2],
  ]);
  const personnalises: Array<[string, number]> = [];
  let suivant = 164;
  const declarer = (code: string): void => {
    if (ids.has(code)) return;
    ids.set(code, suivant);
    personnalises.push([code, suivant]);
    suivant++;
  };
  for (let d = 0; d <= DECIMALES_MAX; d++) {
    declarer(codeFormat(d));
    for (const u of UNITES) declarer(codeFormat(d, u));
  }
  return { ids, personnalises };
})();

interface StyleCellule {
  police?: number;
  fond?: number;
  filet?: number;
  format?: string;
  horizontal?: 'left' | 'right' | 'center';
  vertical?: 'center' | 'bottom';
  libre?: boolean;
  retrait?: number;
}

const XFS: string[] = [];
const INDEX_XF = new Map<string, number>();
function declarerStyle(s: StyleCellule): number {
  const cle = JSON.stringify(s);
  const deja = INDEX_XF.get(cle);
  if (deja !== undefined) return deja;
  const format = s.format ? (FORMATS.ids.get(s.format) as number) : 0;
  const al = `<alignment${s.horizontal ? ` horizontal="${s.horizontal}"` : ''} vertical="${s.vertical ?? 'center'}"${s.retrait ? ` indent="${s.retrait}"` : ''}/>`;
  XFS.push(
    `<xf numFmtId="${format}" fontId="${s.police ?? 0}" fillId="${s.fond ?? 0}" borderId="${s.filet ?? 0}" xfId="0" ` +
      'applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1" applyProtection="1">' +
      `${al}${s.libre ? '<protection locked="0"/>' : ''}</xf>`
  );
  INDEX_XF.set(cle, XFS.length - 1);
  return XFS.length - 1;
}

// Table fixe : tous les styles sont declares ici, une fois, quel que soit le contenu.
declarerStyle({});
const S = {
  titre: declarerStyle({ police: POLICES.titre }),
  cartouche: declarerStyle({ police: POLICES.texte }),
  bloc: declarerStyle({ police: POLICES.bloc, filet: FILET.fort, vertical: 'bottom' }),
  entete: declarerStyle({ police: POLICES.gras, fond: FOND.appui, filet: FILET.fort }),
  enteteDroite: declarerStyle({ police: POLICES.gras, fond: FOND.appui, filet: FILET.fort, horizontal: 'right' }),
  enteteCentre: declarerStyle({ police: POLICES.gras, fond: FOND.appui, filet: FILET.fort, horizontal: 'center' }),
  groupe: declarerStyle({ police: POLICES.faible, vertical: 'bottom' }),
  grandeur: declarerStyle({ police: POLICES.texte, filet: FILET.doux, retrait: 1 }),
  symbole: declarerStyle({ police: POLICES.texte, filet: FILET.doux }),
  unite: declarerStyle({ police: POLICES.unite, filet: FILET.doux }),
  note: declarerStyle({ police: POLICES.note, filet: FILET.doux }),
  vide: declarerStyle({ filet: FILET.doux }),
  saisieTexte: declarerStyle({ police: POLICES.texte, fond: FOND.saisie, filet: FILET.saisie, horizontal: 'right', libre: true }),
  taux: declarerStyle({ police: POLICES.taux, filet: FILET.doux, format: codeFormat(3), horizontal: 'right' }),
  verdict: declarerStyle({ police: POLICES.gras, filet: FILET.doux, horizontal: 'center' }),
};
const STYLES_SAISIE: number[] = [];
const STYLES_CALCUL: number[] = [];
const STYLES_VERIF = new Map<string, number>();
for (let d = 0; d <= DECIMALES_MAX; d++) {
  STYLES_SAISIE.push(declarerStyle({ police: POLICES.nombre, fond: FOND.saisie, filet: FILET.saisie, format: codeFormat(d), horizontal: 'right', libre: true }));
  STYLES_CALCUL.push(declarerStyle({ police: POLICES.nombre, filet: FILET.doux, format: codeFormat(d), horizontal: 'right' }));
  for (const u of [undefined, ...UNITES]) {
    STYLES_VERIF.set(codeFormat(d, u), declarerStyle({ police: POLICES.nombre, filet: FILET.doux, format: codeFormat(d, u), horizontal: 'right' }));
  }
}

const dxf = (c: string, f: string): string =>
  `<dxf><font><b/><color ${rgb(c)}/></font><fill><patternFill patternType="solid"><bgColor ${rgb(f)}/></patternFill></fill></dxf>`;
const DXF = { ok: 0, refus: 1 } as const;

/** styles.xml du gabarit, le meme pour tout classeur. */
const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  `<numFmts count="${FORMATS.personnalises.length}">${FORMATS.personnalises.map(([c, id]) => `<numFmt numFmtId="${id}" formatCode="${x(c)}"/>`).join('')}</numFmts>` +
  `<fonts count="${FONTS.length}">${FONTS.join('')}</fonts>` +
  `<fills count="${FILLS.length}">${FILLS.join('')}</fills>` +
  `<borders count="${BORDERS.length}">${BORDERS.join('')}</borders>` +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  `<cellXfs count="${XFS.length}">${XFS.join('')}</cellXfs>` +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  `<dxfs count="3">${dxf(JETON.ok, JETON.okFond)}${dxf(JETON.refus, JETON.refusFond)}${dxf(JETON.alerte, JETON.alerteFond)}</dxfs>` +
  '</styleSheet>';

const decimales = (d: number | undefined): number => {
  const n = d ?? 3;
  if (!Number.isInteger(n) || n < 0 || n > DECIMALES_MAX) throw new Error(`Classeur : decimales = ${n} hors de 0 a ${DECIMALES_MAX}.`);
  return n;
};

// --- Controles -------------------------------------------------------------------

const NOM_VALIDE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const REFERENCE_A1 = /^[A-Za-z]{1,3}[0-9]+$/;
const REFERENCE_L1C1 = /^[RrCc][0-9]*([RrCc][0-9]*)?$/;

function controlerNom(nom: string, vus: Set<string>): void {
  if (!NOM_VALIDE.test(nom)) throw new Error(`Classeur : le nom « ${nom} » n'est pas un nom Excel valide (lettres, chiffres, _).`);
  if (REFERENCE_A1.test(nom) || REFERENCE_L1C1.test(nom)) {
    throw new Error(`Classeur : le nom « ${nom} » se lit comme une reference de cellule ; prefixer par v_ (v_${nom}).`);
  }
  if (vus.has(nom.toLowerCase())) throw new Error(`Classeur : le nom « ${nom} » est defini deux fois.`);
  vus.add(nom.toLowerCase());
}

function controlerFormule(formule: string, noms: Set<string>, ou: string): void {
  const permises = new Set(FONCTIONS_XLSX_PERMISES);
  let i = 0;
  while (i < formule.length) {
    const reste = formule.slice(i);
    const blanc = /^\s+/.exec(reste);
    if (blanc) {
      i += blanc[0].length;
      continue;
    }
    const nombre = /^(\d+\.?\d*|\.\d+)([Ee][+-]?\d+)?/.exec(reste);
    if (nombre) {
      i += nombre[0].length;
      continue;
    }
    if (reste[0] === '"') throw new Error(`Formule de « ${ou} » : chaine de caracteres refusee dans une formule de calcul.`);
    const id = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(reste);
    if (id) {
      const apres = formule.slice(i + id[0].length).trimStart();
      if (apres.startsWith('(')) {
        if (!permises.has(id[0].toUpperCase())) throw new Error(`Formule de « ${ou} » : fonction ${id[0]} non permise.`);
      } else if (!noms.has(id[0])) {
        throw new Error(`Formule de « ${ou} » : nom inconnu ${id[0]}.`);
      }
      i += id[0].length;
      continue;
    }
    if ('![]$'.includes(reste[0])) throw new Error(`Formule de « ${ou} » : « ${reste[0]} » refuse, la formule ne doit renvoyer qu'aux noms de cette feuille.`);
    if ('+-*/^(),<>=&%'.includes(reste[0])) {
      i++;
      continue;
    }
    throw new Error(`Formule de « ${ou} » : caractere « ${reste[0]} » non admis.`);
  }
}

function controler(c: ClasseurCalcul): void {
  const vus = new Set<string>();
  const noms = new Set<string>();
  for (const g of c.donnees) {
    for (const l of g.lignes) {
      if (typeof l.valeur === 'number') {
        if (!Number.isFinite(l.valeur)) throw new Error(`Classeur : la donnee « ${l.grandeur} » n'est pas un nombre fini.`);
      } else if (l.nom !== undefined) {
        throw new Error(`Classeur : la donnee de texte « ${l.grandeur} » ne peut pas porter de nom.`);
      }
      if (l.nom !== undefined) {
        controlerNom(l.nom, vus);
        noms.add(l.nom);
      }
      decimales(l.decimales);
    }
  }
  for (const g of c.calcul) {
    for (const l of g.lignes) {
      controlerNom(l.nom, vus);
      noms.add(l.nom);
      if (!Number.isFinite(l.valeur)) throw new Error(`Classeur : la valeur de « ${l.grandeur} » n'est pas un nombre fini.`);
      decimales(l.decimales);
    }
  }
  for (const g of c.calcul) for (const l of g.lignes) controlerFormule(l.formule, noms, l.grandeur);
  for (const v of c.verifications) {
    controlerFormule(v.sollicitation, noms, v.nom);
    controlerFormule(v.resistance, noms, v.nom);
    if (!Number.isFinite(v.valeurSollicitation)) throw new Error(`Classeur : la sollicitation de « ${v.nom} » n'est pas un nombre fini.`);
    if (!(Number.isFinite(v.valeurResistance) && v.valeurResistance > 0)) {
      throw new Error(`Classeur : la resistance de « ${v.nom} » doit etre un nombre strictement positif.`);
    }
    decimales(v.decimales);
  }
}

// --- Feuille ---------------------------------------------------------------------

/** Nom de feuille admis par Excel : sans []:*?/\ , 31 caracteres au plus. */
function nomDeFeuille(outil: string): string {
  return outil.replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Calcul';
}

/** Taux arrondi vers le verdict, comme `tauxAffiche` : 0,9996 -> 0,999 ; 1,0004 -> 1,001. */
function tauxVersVerdict(s: number, r: number): number {
  const brut = s / r;
  if (brut === 1) return 1;
  return brut < 1 ? Math.floor(brut * 1000) / 1000 : Math.ceil(brut * 1000) / 1000;
}

/** Hauteurs des lignes (points). */
const HAUTEUR = { ligne: 15, titre: 22, bloc: 28, groupe: 18 } as const;
/**
 * Hauteur utile d'une page A4 imprimee a l'echelle de la feuille, en points.
 * Etalonnee dans Excel le 2026-11-20 : une feuille de 754 pt tient sur une
 * page, une de 769 pt deborde. Toujours au plus LIGNES_PAR_PAGE_XLSX lignes.
 */
const HAUTEUR_PAGE = 760;

interface Ligne {
  cellules: string[];
  hauteur?: number;
}

class Feuille {
  lignes: Ligne[] = [];
  fusions: string[] = [];
  noms: Array<[string, string]> = [];
  sauts: number[] = [];
  private debutPage = 1;

  get derniere(): number {
    return this.lignes.length;
  }
  get suivante(): number {
    return this.lignes.length + 1;
  }
  ajouter(cellules: string[], hauteur?: number): number {
    this.lignes.push({ cellules, hauteur });
    return this.lignes.length;
  }
  /**
   * Coupe la page avant la ligne suivante si un ensemble de `h` points de
   * haut ne tient plus et tiendrait sur une page vide. On compte la HAUTEUR
   * des lignes, pas leur nombre : un titre de bloc pese pres de deux lignes
   * (controle dans Excel : compter les lignes laissait une verification
   * seule en page 2).
   */
  reserver(h: number): void {
    const occupee = this.lignes.slice(this.debutPage - 1).reduce((s, l) => s + (l.hauteur ?? HAUTEUR.ligne), 0);
    if (occupee > 0 && occupee + h > HAUTEUR_PAGE && h <= HAUTEUR_PAGE) {
      this.sauts.push(this.derniere);
      this.debutPage = this.suivante;
    }
  }
}

const cTexte = (ref: string, texte: string, s: number): string =>
  texte === '' ? `<c r="${ref}" s="${s}"/>` : `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${x(texte)}</t></is></c>`;
const cNombre = (ref: string, v: number, s: number): string => `<c r="${ref}" s="${s}"><v>${v}</v></c>`;
const cFormule = (ref: string, f: string, v: number | string, s: number): string =>
  `<c r="${ref}" s="${s}"${typeof v === 'string' ? ' t="str"' : ''}><f>${x(f)}</f><v>${typeof v === 'string' ? x(v) : v}</v></c>`;
const run = (taille: number, couleur: string, texte: string): string =>
  `<r><rPr><sz val="${taille}"/><color ${rgb(couleur)}/><rFont val="Calibri"/><family val="2"/></rPr><t xml:space="preserve">${x(texte)}</t></r>`;
const cPaire = (ref: string, libelle: string, valeur: string): string =>
  `<c r="${ref}" s="${S.cartouche}" t="inlineStr"><is>${run(9, JETON.faible, `${libelle}   `)}${run(10, JETON.texte, valeur)}</is></c>`;

const COLONNES = ['A', 'B', 'C', 'D', 'E', 'F'];

function ligneEntetes(f: Feuille, textes: string[], verif: boolean): void {
  const n = f.suivante;
  const styles = verif
    ? [S.entete, S.enteteDroite, S.enteteDroite, S.enteteDroite, S.enteteCentre, S.entete]
    : [S.entete, S.entete, S.enteteDroite, S.entete, S.entete, S.entete];
  f.ajouter(textes.map((t, i) => cTexte(`${COLONNES[i]}${n}`, t, styles[i])));
}

function ligneTitreBloc(f: Feuille, titre: string): void {
  const n = f.suivante;
  f.ajouter(COLONNES.map((c, i) => cTexte(`${c}${n}`, i === 0 ? titre : '', S.bloc)), HAUTEUR.bloc);
}

function ligneTitreGroupe(f: Feuille, titre: string, langue: Langue): void {
  const n = f.suivante;
  f.ajouter([cTexte(`A${n}`, titre.toLocaleUpperCase(langue), S.groupe)], HAUTEUR.groupe);
}

function feuilleXml(c: ClasseurCalcul, langue: Langue): { feuille: Feuille; xml: string } {
  const m = MOTS[langue];
  const f = new Feuille();
  const k = c.cartouche;

  // Cartouche.
  f.ajouter([cTexte('A1', k.titre, S.titre)], HAUTEUR.titre);
  const paires: Array<[[string, string] | null, [string, string]]> = [
    [[m.projet, k.projet], [m.element, k.element]],
    [[m.outil, `${k.outil} ${k.version}`], [m.norme, k.norme]],
    [k.annexe ? [m.annexe, k.annexe] : null, [m.date, k.date]],
  ];
  for (const [a, d] of paires) {
    const n = f.suivante;
    f.ajouter([a ? cPaire(`A${n}`, a[0], a[1]) : `<c r="A${n}" s="${S.cartouche}"/>`, cPaire(`D${n}`, d[0], d[1])]);
    f.fusions.push(`A${n}:C${n}`, `D${n}:F${n}`);
  }
  if (k.moteurs && k.moteurs.length > 0) {
    const n = f.suivante;
    f.ajouter([cPaire(`A${n}`, m.moteurs, k.moteurs.join(', '))]);
    f.fusions.push(`A${n}:F${n}`);
  }

  // Donnees.
  const groupesDonnees = c.donnees.filter((g) => g.lignes.length > 0);
  if (groupesDonnees.length > 0) {
    f.reserver(HAUTEUR.bloc + HAUTEUR.ligne + HAUTEUR.groupe + groupesDonnees[0].lignes.length * HAUTEUR.ligne);
    ligneTitreBloc(f, m.donnees);
    ligneEntetes(f, entetesDonnees(m), false);
    groupesDonnees.forEach((g, i) => {
      if (i > 0) f.reserver(HAUTEUR.groupe + g.lignes.length * HAUTEUR.ligne);
      ligneTitreGroupe(f, g.titre, langue);
      for (const l of g.lignes) {
        const n = f.suivante;
        const valeur =
          typeof l.valeur === 'number'
            ? cNombre(`C${n}`, l.valeur, STYLES_SAISIE[decimales(l.decimales)])
            : cTexte(`C${n}`, l.valeur, S.saisieTexte);
        f.ajouter([
          cTexte(`A${n}`, l.grandeur, S.grandeur),
          cTexte(`B${n}`, l.symbole, S.symbole),
          valeur,
          cTexte(`D${n}`, l.unite, S.unite),
          cTexte(`E${n}`, '', S.vide),
          cTexte(`F${n}`, l.source ?? '', S.note),
        ]);
        if (l.nom !== undefined) f.noms.push([l.nom, `$C$${n}`]);
      }
    });
  }

  // Calcul.
  const groupesCalcul = c.calcul.filter((g) => g.lignes.length > 0);
  if (groupesCalcul.length > 0) {
    f.reserver(HAUTEUR.bloc + HAUTEUR.ligne + HAUTEUR.groupe + groupesCalcul[0].lignes.length * HAUTEUR.ligne);
    ligneTitreBloc(f, m.calcul);
    ligneEntetes(f, entetesCalcul(m), false);
    groupesCalcul.forEach((g, i) => {
      if (i > 0) f.reserver(HAUTEUR.groupe + g.lignes.length * HAUTEUR.ligne);
      ligneTitreGroupe(f, g.titre, langue);
      for (const l of g.lignes) {
        const n = f.suivante;
        f.ajouter([
          cTexte(`A${n}`, l.grandeur, S.grandeur),
          cTexte(`B${n}`, l.symbole, S.symbole),
          cFormule(`C${n}`, l.formule, l.valeur, STYLES_CALCUL[decimales(l.decimales)]),
          cTexte(`D${n}`, l.unite, S.unite),
          cTexte(`E${n}`, '', S.vide),
          cTexte(`F${n}`, l.clause ?? '', S.note),
        ]);
        f.noms.push([l.nom, `$C$${n}`]);
      }
    });
  }

  // Verifications.
  let mef = '';
  if (c.verifications.length > 0) {
    f.reserver(HAUTEUR.bloc + HAUTEUR.ligne + c.verifications.length * HAUTEUR.ligne);
    ligneTitreBloc(f, m.verifications);
    ligneEntetes(f, entetesVerifications(m), true);
    const premiere = f.suivante;
    for (const v of c.verifications) {
      const n = f.suivante;
      const d = decimales(v.decimales);
      const avecUnite = (UNITES as readonly string[]).includes(v.unite);
      const s = STYLES_VERIF.get(codeFormat(d, avecUnite ? v.unite : undefined)) as number;
      const taux = tauxVersVerdict(v.valeurSollicitation, v.valeurResistance);
      f.ajouter([
        cTexte(`A${n}`, v.nom, S.grandeur),
        cFormule(`B${n}`, v.sollicitation, v.valeurSollicitation, s),
        cFormule(`C${n}`, v.resistance, v.valeurResistance, s),
        cFormule(`D${n}`, `IF(B${n}/C${n}<=1,ROUNDDOWN(B${n}/C${n},3),ROUNDUP(B${n}/C${n},3))`, taux, S.taux),
        cFormule(`E${n}`, `IF(D${n}<=1,"${m.ok}","${m.nonConforme}")`, taux <= 1 ? m.ok : m.nonConforme, S.verdict),
        cTexte(`F${n}`, v.clause ?? '', S.note),
      ]);
    }
    const derniere = f.derniere;
    mef =
      `<conditionalFormatting sqref="D${premiere}:E${derniere}">` +
      `<cfRule type="expression" dxfId="${DXF.ok}" priority="1"><formula>$D${premiere}&lt;=1</formula></cfRule>` +
      `<cfRule type="expression" dxfId="${DXF.refus}" priority="2"><formula>$D${premiere}&gt;1</formula></cfRule>` +
      '</conditionalFormatting>';
  }

  const codeEntete = (t: string): string => t.replace(/&/g, '&&');
  const pol = '&"Calibri,Normal"&9';
  const enTete = `&L${pol}${codeEntete(k.projet)}&R${pol}${codeEntete(k.element)}`;
  const pied = `&L${pol}${codeEntete(`${k.outil} ${k.version}`)}&R${pol}page &P / &N`;
  const lignes = f.lignes
    .map((l, i) => `<row r="${i + 1}"${l.hauteur ? ` ht="${l.hauteur}" customHeight="1"` : ''}>${l.cellules.join('')}</row>`)
    .join('');
  const sauts =
    f.sauts.length > 0
      ? `<rowBreaks count="${f.sauts.length}" manualBreakCount="${f.sauts.length}">${f.sauts.map((s) => `<brk id="${s}" max="16383" man="1"/>`).join('')}</rowBreaks>`
      : '';

  const xml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
    `<dimension ref="A1:F${f.derniere}"/>` +
    '<sheetViews><sheetView workbookViewId="0" showGridLines="0" view="pageLayout" zoomScale="100"/></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="15"/>' +
    `<cols>${LARGEURS_COLONNES_XLSX.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` +
    `<sheetData>${lignes}</sheetData>` +
    '<sheetProtection sheet="1" objects="1" scenarios="1" formatColumns="0" formatRows="0" selectLockedCells="0" selectUnlockedCells="0"/>' +
    `<mergeCells count="${f.fusions.length}">${f.fusions.map((r) => `<mergeCell ref="${r}"/>`).join('')}</mergeCells>` +
    mef +
    '<printOptions horizontalCentered="1"/>' +
    '<pageMargins left="0.6" right="0.6" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>' +
    '<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>' +
    `<headerFooter><oddHeader>${x(enTete)}</oddHeader><oddFooter>${x(pied)}</oddFooter></headerFooter>` +
    sauts +
    '</worksheet>';
  return { feuille: f, xml };
}

const TYPES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
  '</Types>';
const RELS_RACINE =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  '</Relationships>';
const RELS_CLASSEUR =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  '</Relationships>';

/**
 * Le classeur d'un calcul, au gabarit commun, pret a etre telecharge (type
 * MIME xlsx). Leve, en nommant la fautive, sur un nom invalide, une formule
 * hors des regles (fonction non permise, nom inconnu, renvoi hors de la
 * feuille, chaine) ou une valeur non finie.
 */
export function classeurDeCalcul(c: ClasseurCalcul): Uint8Array {
  controler(c);
  const langue = langueCourante();
  const { feuille, xml } = feuilleXml(c, langue);
  const nomFeuille = nomDeFeuille(c.cartouche.outil);
  const cite = `'${nomFeuille.replace(/'/g, "''")}'`;
  const zone = `<definedName name="_xlnm.Print_Area" localSheetId="0">${x(`${cite}!$A$1:$F$${feuille.derniere}`)}</definedName>`;
  const noms = feuille.noms.map(([n, ref]) => `<definedName name="${n}">${x(`${cite}!${ref}`)}</definedName>`).join('');
  const classeur =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets><sheet name="${x(nomFeuille)}" sheetId="1" r:id="rId1"/></sheets>` +
    `<definedNames>${zone}${noms}</definedNames>` +
    '<calcPr calcId="191029" fullCalcOnLoad="1"/>' +
    '</workbook>';
  return zipSansCompression([
    { nom: '[Content_Types].xml', contenu: TYPES },
    { nom: '_rels/.rels', contenu: RELS_RACINE },
    { nom: 'xl/workbook.xml', contenu: classeur },
    { nom: 'xl/_rels/workbook.xml.rels', contenu: RELS_CLASSEUR },
    { nom: 'xl/styles.xml', contenu: STYLES_XML },
    { nom: 'xl/worksheets/sheet1.xml', contenu: xml },
  ]);
}

/** `<outil>_<element>_<feuille>_<date>.xlsx`, sans accents ni espaces ; parties vides omises. */
export function nomDeFichierXlsx(outil: string, element: string, feuille: string, date: string): string {
  const propre = (t: string): string =>
    t
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^A-Za-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  return `${[outil, element, feuille, date].map(propre).filter((p) => p !== '').join('_')}.xlsx`;
}

// --- Controle d'un classeur au regard du gabarit -------------------------------

const desechapper = (s: string): string =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

function attributDe(xml: string, balise: string, nom: string): string | undefined {
  const el = new RegExp(`<${balise}\\b[^>]*>`).exec(xml)?.[0];
  return el ? new RegExp(`\\b${nom}="([^"]*)"`).exec(el)?.[1] : undefined;
}

/** Textes de la feuille par ligne, puis par colonne. */
function textesParLigne(feuille: string): Map<number, Map<string, string>> {
  const lignes = new Map<number, Map<string, string>>();
  for (const m of feuille.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const [, col, lig, attributs, corps = ''] = m;
    if (!/t="inlineStr"/.test(attributs)) continue;
    const t = desechapper([...corps.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((r) => r[1]).join(''));
    const n = Number(lig);
    if (!lignes.has(n)) lignes.set(n, new Map());
    lignes.get(n)?.set(col, t);
  }
  return lignes;
}

/**
 * Anomalies d'un classeur au regard du gabarit commun ; `[]` s'il est
 * conforme. A lancer dans le test de chaque app sur son classeur.
 */
export function verifierGabaritXlsx(octets: Uint8Array): string[] {
  let fichiers: Map<string, string>;
  try {
    fichiers = lireZipSansCompression(octets);
  } catch (e) {
    return [`archive illisible : ${(e as Error).message}`];
  }
  const anomalies: string[] = [];
  const classeur = fichiers.get('xl/workbook.xml') ?? '';
  const feuille = fichiers.get('xl/worksheets/sheet1.xml');
  if (feuille === undefined) return ['feuille xl/worksheets/sheet1.xml absente'];

  // Une seule feuille, aucun renvoi hors d'elle.
  if ([...classeur.matchAll(/<sheet\b/g)].length !== 1) anomalies.push('une seule feuille attendue dans le classeur');
  if ([...fichiers.keys()].some((f) => f.startsWith('xl/worksheets/') && f !== 'xl/worksheets/sheet1.xml')) {
    anomalies.push('une seule feuille attendue (fichier de feuille en trop)');
  }
  const nomFeuille = desechapper(attributDe(classeur, 'sheet', 'name') ?? '');
  for (const m of feuille.matchAll(/<f>([\s\S]*?)<\/f>/g)) {
    if (/[![]/.test(desechapper(m[1]))) anomalies.push(`formule renvoyant hors de la feuille : ${desechapper(m[1])}`);
  }
  for (const m of classeur.matchAll(/<definedName name="([^"]+)"[^>]*>([\s\S]*?)<\/definedName>/g)) {
    const ref = desechapper(m[2]);
    const cite = `'${nomFeuille.replace(/'/g, "''")}'!`;
    if (ref.includes('[') || !(ref.startsWith(cite) || ref.startsWith(`${nomFeuille}!`))) anomalies.push(`nom defini ${m[1]} hors de la feuille : ${ref}`);
  }

  // Blocs et en-tetes.
  const lignes = textesParLigne(feuille);
  const blocs: Array<{ titres: string[]; entetes: (m: Mots) => string[] }> = [
    { titres: [MOTS.fr.donnees, MOTS.en.donnees], entetes: entetesDonnees },
    { titres: [MOTS.fr.calcul, MOTS.en.calcul], entetes: entetesCalcul },
    { titres: [MOTS.fr.verifications, MOTS.en.verifications], entetes: entetesVerifications },
  ];
  let precedente = 0;
  let trouves = 0;
  for (const b of blocs) {
    for (const [n, cols] of [...lignes].sort((a, z) => a[0] - z[0])) {
      const t = cols.get('A') ?? '';
      const langue = b.titres.indexOf(t);
      if (langue < 0) continue;
      trouves++;
      if (n <= precedente) anomalies.push(`bloc ${t} hors de l'ordre Donnees, Calcul, Verifications`);
      precedente = n;
      const attendus = b.entetes(MOTS[langue === 0 ? 'fr' : 'en']);
      const lus = COLONNES.map((c) => lignes.get(n + 1)?.get(c) ?? '');
      if (lus.join('|') !== attendus.join('|')) anomalies.push(`en-tetes du bloc ${t} : « ${lus.join(' · ')} » au lieu de « ${attendus.join(' · ')} »`);
      break;
    }
  }
  if (trouves === 0) anomalies.push('aucun bloc Donnees, Calcul ou Verifications');

  // Mise en page.
  if (attributDe(feuille, 'pageSetUpPr', 'fitToPage') !== '1') anomalies.push('mise en page : fitToPage absent');
  if (attributDe(feuille, 'pageSetup', 'paperSize') !== '9') anomalies.push('mise en page : format A4 (paperSize 9) attendu');
  if (attributDe(feuille, 'pageSetup', 'orientation') !== 'portrait') anomalies.push('mise en page : orientation portrait attendue');
  if (attributDe(feuille, 'pageSetup', 'fitToWidth') !== '1') anomalies.push('mise en page : fitToWidth 1 attendu');
  if (attributDe(feuille, 'pageSetup', 'fitToHeight') !== '0') anomalies.push('mise en page : fitToHeight 0 attendu');
  if (!/<definedName name="_xlnm\.Print_Area" localSheetId="0">/.test(classeur)) anomalies.push("mise en page : zone d'impression absente");
  if (!/<oddHeader>[^<]+<\/oddHeader>/.test(feuille) || !/<oddFooter>[^<]+<\/oddFooter>/.test(feuille)) anomalies.push('mise en page : en-tete ou pied de page absent');

  // Protection.
  const protection = /<sheetProtection\b[^>]*>/.exec(feuille)?.[0];
  if (!protection || !/\bsheet="1"/.test(protection)) anomalies.push('protection de la feuille absente');
  else if (/password|hashValue|algorithmName|saltValue/.test(protection)) anomalies.push('protection : pas de mot de passe attendu');

  // Colonnes et styles.
  const largeurs = [...feuille.matchAll(/<col min="\d+" max="\d+" width="([\d.]+)"/g)].map((m) => Number(m[1]));
  if (largeurs.join(',') !== LARGEURS_COLONNES_XLSX.join(',')) anomalies.push(`largeurs de colonnes ${largeurs.join(', ')} au lieu de ${LARGEURS_COLONNES_XLSX.join(', ')}`);
  if (fichiers.get('xl/styles.xml') !== STYLES_XML) anomalies.push('styles.xml different de celui du gabarit');

  return anomalies;
}
