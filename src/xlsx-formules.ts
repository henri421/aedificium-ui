/**
 * Evaluateur des formules du classeur commun (fiche 11.3, S3).
 *
 * Il sert le test de concordance de chaque app : chaque formule du classeur,
 * evaluee a partir des seules donnees, doit redonner la valeur du noyau. Sans
 * ce test, l'Excel et l'app divergeraient avec le temps.
 *
 * Seul le sous-ensemble admis par le gabarit est connu : nombres, noms
 * definis, + - * / ^ %, comparaisons, et les fonctions de
 * `FONCTIONS_XLSX_PERMISES`. Les priorites sont celles d'Excel : le moins
 * unaire passe avant la puissance (-2^2 = 4), et la puissance s'evalue de
 * gauche a droite (2^3^2 = 64).
 */

import type { ClasseurCalcul } from './xlsx-gabarit';

type Noeud =
  | { t: 'nombre'; v: number }
  | { t: 'nom'; n: string }
  | { t: 'unaire'; op: '-' | '+'; a: Noeud }
  | { t: 'pourcent'; a: Noeud }
  | { t: 'binaire'; op: string; a: Noeud; b: Noeud }
  | { t: 'appel'; f: string; args: Noeud[] };

interface Lexeme {
  t: 'nombre' | 'nom' | 'op' | 'fin';
  v: string;
}

function lexemes(formule: string): Lexeme[] {
  const sortie: Lexeme[] = [];
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
      sortie.push({ t: 'nombre', v: nombre[0] });
      i += nombre[0].length;
      continue;
    }
    const nom = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(reste);
    if (nom) {
      sortie.push({ t: 'nom', v: nom[0] });
      i += nom[0].length;
      continue;
    }
    const double = /^(<=|>=|<>)/.exec(reste);
    if (double) {
      sortie.push({ t: 'op', v: double[0] });
      i += 2;
      continue;
    }
    if ('+-*/^%(),<>='.includes(reste[0])) {
      sortie.push({ t: 'op', v: reste[0] });
      i++;
      continue;
    }
    throw new Error(`Formule « ${formule} » : caractere « ${reste[0]} » non admis.`);
  }
  sortie.push({ t: 'fin', v: '' });
  return sortie;
}

const ARITES: Record<string, [number, number]> = {
  ABS: [1, 1], COS: [1, 1], EXP: [1, 1], IF: [3, 3], LN: [1, 1], MAX: [1, 255], MIN: [1, 255], PI: [0, 0],
  POWER: [2, 2], RADIANS: [1, 1], ROUNDDOWN: [2, 2], ROUNDUP: [2, 2], SIN: [1, 1], SQRT: [1, 1], TAN: [1, 1],
};

function analyser(formule: string): Noeud {
  const l = lexemes(formule);
  let p = 0;
  const voir = (): Lexeme => l[p];
  const estOp = (...ops: string[]): boolean => voir().t === 'op' && ops.includes(voir().v);
  const attendre = (op: string): void => {
    if (!estOp(op)) throw new Error(`Formule « ${formule} » : « ${op} » attendu.`);
    p++;
  };

  const comparaison = (): Noeud => {
    let a = addition();
    while (estOp('=', '<>', '<', '>', '<=', '>=')) {
      const op = l[p++].v;
      a = { t: 'binaire', op, a, b: addition() };
    }
    return a;
  };
  const addition = (): Noeud => {
    let a = produit();
    while (estOp('+', '-')) {
      const op = l[p++].v;
      a = { t: 'binaire', op, a, b: produit() };
    }
    return a;
  };
  const produit = (): Noeud => {
    let a = puissance();
    while (estOp('*', '/')) {
      const op = l[p++].v;
      a = { t: 'binaire', op, a, b: puissance() };
    }
    return a;
  };
  const puissance = (): Noeud => {
    let a = unaire();
    while (estOp('^')) {
      p++;
      a = { t: 'binaire', op: '^', a, b: unaire() };
    }
    return a;
  };
  const unaire = (): Noeud => {
    if (estOp('-', '+')) {
      const op = l[p++].v as '-' | '+';
      return { t: 'unaire', op, a: unaire() };
    }
    let a = primaire();
    while (estOp('%')) {
      p++;
      a = { t: 'pourcent', a };
    }
    return a;
  };
  const primaire = (): Noeud => {
    const x = voir();
    if (x.t === 'nombre') {
      p++;
      return { t: 'nombre', v: Number(x.v) };
    }
    if (x.t === 'nom') {
      p++;
      if (estOp('(')) {
        const f = x.v.toUpperCase();
        const arite = ARITES[f];
        if (!arite) throw new Error(`Formule « ${formule} » : fonction ${x.v} non permise.`);
        p++;
        const args: Noeud[] = [];
        if (!estOp(')')) {
          args.push(comparaison());
          while (estOp(',')) {
            p++;
            args.push(comparaison());
          }
        }
        attendre(')');
        if (args.length < arite[0] || args.length > arite[1]) throw new Error(`Formule « ${formule} » : ${f} attend ${arite[0]} a ${arite[1]} arguments, ${args.length} donnes.`);
        return { t: 'appel', f, args };
      }
      return { t: 'nom', n: x.v };
    }
    if (estOp('(')) {
      p++;
      const a = comparaison();
      attendre(')');
      return a;
    }
    throw new Error(`Formule « ${formule} » : expression attendue${x.t === 'fin' ? ' en fin de formule' : ` avant « ${x.v} »`}.`);
  };

  const racine = comparaison();
  if (voir().t !== 'fin') throw new Error(`Formule « ${formule} » : « ${voir().v} » inattendu.`);
  return racine;
}

/** Arrondi d'Excel vers zero (ROUNDDOWN) ou en s'en eloignant (ROUNDUP), sur 15 chiffres significatifs. */
function arrondir(x: number, n: number, versLeHaut: boolean): number {
  const f = 10 ** Math.trunc(n);
  const y = Number((x * f).toPrecision(15));
  const r = versLeHaut ? Math.sign(y) * Math.ceil(Math.abs(y)) : Math.trunc(y);
  return r / f;
}

function evaluer(n: Noeud, valeur: (nom: string) => number, formule: string): number {
  const e = (x: Noeud): number => evaluer(x, valeur, formule);
  let r: number;
  switch (n.t) {
    case 'nombre':
      r = n.v;
      break;
    case 'nom':
      r = valeur(n.n);
      break;
    case 'unaire':
      r = n.op === '-' ? -e(n.a) : e(n.a);
      break;
    case 'pourcent':
      r = e(n.a) / 100;
      break;
    case 'binaire': {
      const a = e(n.a);
      const b = e(n.b);
      switch (n.op) {
        case '+': r = a + b; break;
        case '-': r = a - b; break;
        case '*': r = a * b; break;
        case '/':
          if (b === 0) throw new Error(`Formule « ${formule} » : division par zero.`);
          r = a / b;
          break;
        case '^': r = a ** b; break;
        case '=': r = a === b ? 1 : 0; break;
        case '<>': r = a !== b ? 1 : 0; break;
        case '<': r = a < b ? 1 : 0; break;
        case '>': r = a > b ? 1 : 0; break;
        case '<=': r = a <= b ? 1 : 0; break;
        default: r = a >= b ? 1 : 0;
      }
      break;
    }
    case 'appel': {
      const a = n.args;
      switch (n.f) {
        case 'IF': r = e(a[0]) !== 0 ? e(a[1]) : e(a[2]); break;
        case 'MIN': r = Math.min(...a.map(e)); break;
        case 'MAX': r = Math.max(...a.map(e)); break;
        case 'ABS': r = Math.abs(e(a[0])); break;
        case 'SQRT': r = Math.sqrt(e(a[0])); break;
        case 'LN': r = Math.log(e(a[0])); break;
        case 'EXP': r = Math.exp(e(a[0])); break;
        case 'PI': r = Math.PI; break;
        case 'POWER': r = e(a[0]) ** e(a[1]); break;
        case 'SIN': r = Math.sin(e(a[0])); break;
        case 'COS': r = Math.cos(e(a[0])); break;
        case 'TAN': r = Math.tan(e(a[0])); break;
        case 'RADIANS': r = (e(a[0]) * Math.PI) / 180; break;
        case 'ROUNDDOWN': r = arrondir(e(a[0]), e(a[1]), false); break;
        default: r = arrondir(e(a[0]), e(a[1]), true);
      }
      break;
    }
  }
  if (!Number.isFinite(r)) throw new Error(`Formule « ${formule} » : resultat non fini (Excel afficherait une erreur).`);
  return r;
}

/**
 * Valeur d'une formule du gabarit (syntaxe Excel en anglais, sans « = »).
 * `valeur(nom)` rend la valeur d'un nom defini, ou leve s'il est inconnu.
 * Leve sur une fonction non permise, une chaine, un renvoi de cellule, une
 * division par zero ou un resultat non fini.
 */
export function evaluerFormuleXlsx(formule: string, valeur: (nom: string) => number): number {
  return evaluer(analyser(formule), valeur, formule);
}

export interface EcartConcordance {
  /** Nom defini de la ligne de calcul, ou « verification (sollicitation | résistance) ». */
  nom: string;
  formule: string;
  /** Valeur du noyau, ecrite en cache dans le classeur. */
  attendu: number;
  /** Valeur de la formule evaluee a partir des seules donnees. */
  obtenu: number;
}

/**
 * Ecarts entre les formules d'un classeur et les valeurs du noyau ; `[]` si
 * tout concorde. Chaque formule est evaluee a partir des DONNEES seules (pas
 * des valeurs en cache), si bien qu'une formule fausse se signale avec toutes
 * celles qui en dependent. Tolerance relative : `tolerance × max(1, |attendu|)`.
 */
export function ecartsDeConcordance(c: ClasseurCalcul, tolerance = 1e-9): EcartConcordance[] {
  const donnees = new Map<string, number>();
  for (const g of c.donnees) for (const l of g.lignes) if (l.nom !== undefined && typeof l.valeur === 'number') donnees.set(l.nom, l.valeur);
  const lignes = new Map<string, { formule: string }>();
  for (const g of c.calcul) for (const l of g.lignes) lignes.set(l.nom, l);

  const calculees = new Map<string, number>();
  const enCours: string[] = [];
  const valeur = (nom: string): number => {
    const d = donnees.get(nom);
    if (d !== undefined) return d;
    const deja = calculees.get(nom);
    if (deja !== undefined) return deja;
    const l = lignes.get(nom);
    if (!l) throw new Error(`Concordance : nom inconnu ${nom}.`);
    if (enCours.includes(nom)) throw new Error(`Concordance : formule circulaire ${[...enCours, nom].join(' -> ')}.`);
    enCours.push(nom);
    const v = evaluerFormuleXlsx(l.formule, valeur);
    enCours.pop();
    calculees.set(nom, v);
    return v;
  };

  const ecarts: EcartConcordance[] = [];
  const comparer = (nom: string, formule: string, attendu: number): void => {
    const obtenu = evaluerFormuleXlsx(formule, valeur);
    if (!(Math.abs(obtenu - attendu) <= tolerance * Math.max(1, Math.abs(attendu)))) ecarts.push({ nom, formule, attendu, obtenu });
  };
  for (const g of c.calcul) for (const l of g.lignes) comparer(l.nom, l.formule, l.valeur);
  for (const v of c.verifications) {
    comparer(`${v.nom} (sollicitation)`, v.sollicitation, v.valeurSollicitation);
    comparer(`${v.nom} (résistance)`, v.resistance, v.valeurResistance);
  }
  return ecarts;
}
