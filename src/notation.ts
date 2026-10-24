/**
 * Notations techniques : indices, exposants, lettres grecques et unites.
 *
 * La notation source est celle deja ecrite dans les apps : `M_Ed`,
 * `sigma_s`, `f_ctk,0.05`, `l_0^2`, `(rho_1 / 25)^0,5`. Une seule lecture en
 * segments, trois sorties : HTML, SVG (pour l'interieur d'un `<text>`) et
 * texte brut (CSV).
 */

import { echapper } from './format';

type Segment =
  | { type: 'texte'; contenu: string }
  | { type: 'indice'; contenu: string }
  | { type: 'exposant'; contenu: string };

/** Noms de lettres grecques acceptes, en base comme dans un indice. */
const GRECQUES: Readonly<Record<string, string>> = {
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  eps: 'ε',
  zeta: 'ζ',
  eta: 'η',
  theta: 'θ',
  kappa: 'κ',
  lambda: 'λ',
  mu: 'μ',
  nu: 'ν',
  xi: 'ξ',
  pi: 'π',
  rho: 'ρ',
  sigma: 'σ',
  tau: 'τ',
  upsilon: 'υ',
  phi: 'φ',
  chi: 'χ',
  psi: 'ψ',
  omega: 'ω',
  Gamma: 'Γ',
  Delta: 'Δ',
  Theta: 'Θ',
  Lambda: 'Λ',
  Xi: 'Ξ',
  Pi: 'Π',
  Sigma: 'Σ',
  Phi: 'Φ',
  Psi: 'Ψ',
  Omega: 'Ω',
};

/** Unites courantes : le chiffre final devient un exposant Unicode. */
const UNITES: Readonly<Record<string, string>> = {
  mm2: 'mm²',
  mm3: 'mm³',
  mm4: 'mm⁴',
  cm2: 'cm²',
  cm3: 'cm³',
  cm4: 'cm⁴',
  dm2: 'dm²',
  dm3: 'dm³',
  m2: 'm²',
  m3: 'm³',
  m4: 'm⁴',
};

const CHIFFRES_INDICE = '₀₁₂₃₄₅₆₇₈₉';
const CHIFFRES_EXPOSANT = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const MOINS_EXPOSANT = '⁻';

/** Hauteurs des decalages verticaux, en em du texte normal. */
const HAUTEUR_INDICE = 0.3;
const HAUTEUR_EXPOSANT = -0.45;
/** Taille des indices et exposants : leur `dy` s'exprime dans leur propre em. */
const ECHELLE = 0.75;

function estAlphanumerique(caractere: string | undefined): boolean {
  return caractere !== undefined && /[A-Za-z0-9]/.test(caractere);
}

/** Indice : blocs alphanumeriques separes par `,` ou `.` ; ponctuation isolee exclue. */
function lireIndice(source: string, debut: number): { contenu: string; fin: number } | null {
  const premier = /^[A-Za-z0-9]+/.exec(source.slice(debut));
  if (premier === null) return null;
  let fin = debut + premier[0].length;
  for (;;) {
    const separateur = source[fin];
    if ((separateur === ',' || separateur === '.') && estAlphanumerique(source[fin + 1])) {
      const bloc = /^[A-Za-z0-9]+/.exec(source.slice(fin + 1));
      if (bloc === null) break;
      fin += 1 + bloc[0].length;
    } else {
      break;
    }
  }
  return { contenu: source.slice(debut, fin), fin };
}

/** Exposant : `-?chiffres` puis eventuellement `,chiffres`. */
function lireExposant(source: string, debut: number): { contenu: string; fin: number } | null {
  const trouve = /^-?\d+(?:,\d+)?/.exec(source.slice(debut));
  if (trouve === null) return null;
  return { contenu: trouve[0], fin: debut + trouve[0].length };
}

/**
 * Decoupe la notation source en texte, indices et exposants. Un `_` ou un `^`
 * qui ne commence pas une notation valide reste du texte.
 */
function segmenter(source: string): Segment[] {
  const segments: Segment[] = [];
  let texte = '';
  let i = 0;
  const viderTexte = (): void => {
    if (texte !== '') {
      segments.push({ type: 'texte', contenu: texte });
      texte = '';
    }
  };
  while (i < source.length) {
    const caractere = source[i];
    if (caractere === '_') {
      const indice = lireIndice(source, i + 1);
      if (indice !== null) {
        viderTexte();
        segments.push({ type: 'indice', contenu: indice.contenu });
        i = indice.fin;
        continue;
      }
    } else if (caractere === '^') {
      const exposant = lireExposant(source, i + 1);
      if (exposant !== null) {
        viderTexte();
        segments.push({ type: 'exposant', contenu: exposant.contenu });
        i = exposant.fin;
        continue;
      }
    }
    texte += caractere;
    i += 1;
  }
  viderTexte();
  return segments;
}

/**
 * Un mot alphabetique ENTIER egal a un nom de lettre grecque devient la
 * lettre. Un mot colle a une lettre ou a un chiffre reste intact, ainsi que
 * `alphabet` ou `Pierre` : `_` et `^` ne collent pas.
 */
function convertirGrecques(texte: string): string {
  return texte.replace(/[A-Za-z]+/g, (mot, position: number) => {
    const avant = texte[position - 1];
    const apres = texte[position + mot.length];
    if (estAlphanumerique(avant) || estAlphanumerique(apres)) return mot;
    return GRECQUES[mot] ?? mot;
  });
}

/** `mm2` et semblables, en mot entier seulement (`mm25` et `M2` restent). */
function convertirUnites(texte: string): string {
  return texte.replace(
    /(?<![A-Za-z0-9])(mm2|mm3|mm4|cm2|cm3|cm4|dm2|dm3|m2|m3|m4)(?![A-Za-z0-9])/g,
    (mot) => UNITES[mot] ?? mot
  );
}

function convertirTexte(texte: string): string {
  return convertirGrecques(convertirUnites(texte.replace(/<=/g, '≤').replace(/>=/g, '≥')));
}

function chiffresIndice(chiffres: string): string {
  return Array.from(chiffres, (c) => CHIFFRES_INDICE[Number(c)]).join('');
}

function chiffresExposant(contenu: string): string {
  return Array.from(contenu, (c) => (c === '-' ? MOINS_EXPOSANT : CHIFFRES_EXPOSANT[Number(c)])).join('');
}

/** Notation en HTML sur : tout le texte hors balises est echappe. */
export function notationHtml(source: string): string {
  return segmenter(source)
    .map((segment) => {
      if (segment.type === 'texte') return echapper(convertirTexte(segment.contenu));
      if (segment.type === 'indice') return `<sub>${echapper(convertirGrecques(segment.contenu))}</sub>`;
      return `<sup>${echapper(segment.contenu)}</sup>`;
    })
    .join('');
}

/** Valeur de `dy` : arrondie pour que 0,3 / 0,75 s'ecrive « 0.4 ». */
function valeurDy(delta: number): string {
  return String(Math.round(delta * 1000) / 1000);
}

/**
 * Notation pour l'interieur d'un `<text>` SVG. Pas de `baseline-shift` (mal
 * rendu par certains navigateurs) : chaque changement de ligne de base se fait
 * par un `dy`. Le texte normal qui suit un decalage est ramene a la ligne de
 * base ; si le texte finit decale, une espace sans chasse le ramene.
 */
export function notationSvg(source: string): string {
  let sortie = '';
  let decalage = 0;
  for (const segment of segmenter(source)) {
    if (segment.type === 'texte') {
      const contenu = echapper(convertirTexte(segment.contenu));
      if (decalage === 0) {
        sortie += contenu;
      } else {
        sortie += `<tspan dy="${valeurDy(-decalage)}em">${contenu}</tspan>`;
        decalage = 0;
      }
    } else {
      const cible = segment.type === 'indice' ? HAUTEUR_INDICE : HAUTEUR_EXPOSANT;
      const contenu =
        segment.type === 'indice' ? echapper(convertirGrecques(segment.contenu)) : echapper(segment.contenu);
      sortie += `<tspan dy="${valeurDy((cible - decalage) / ECHELLE)}em" font-size="75%">${contenu}</tspan>`;
      decalage = cible;
    }
  }
  if (decalage !== 0) sortie += `<tspan dy="${valeurDy(-decalage)}em">​</tspan>`;
  return sortie;
}

/** Notation en texte brut (CSV) : aucun echappement. */
export function notationTexte(source: string): string {
  return segmenter(source)
    .map((segment) => {
      if (segment.type === 'texte') return convertirTexte(segment.contenu);
      if (segment.type === 'indice') {
        if (/^\d+$/.test(segment.contenu)) return chiffresIndice(segment.contenu);
        return convertirGrecques(segment.contenu);
      }
      if (/^-?\d+$/.test(segment.contenu)) return chiffresExposant(segment.contenu);
      return `^${segment.contenu}`;
    })
    .join('');
}
