/**
 * Controle du texte VISIBLE, pour les tests des apps (etape 8 du plan de la
 * suite) : plus de « _ », de « ^ » ni de nom de lettre grecque affiche, trois
 * decimales au plus sans zero inutile, accents et apostrophes, plus aucune
 * phrase type d'avertissement.
 *
 * Une app passe son ecran, ses dessins, sa note et sa page a `texteVisible`,
 * puis a `constatsAffichage` : la liste rendue doit etre vide.
 */

/**
 * Texte visible d'un fragment HTML ou SVG : balises retirees, entites decodees.
 * Les balises de texte (`sub`, `sup`, `tspan`, `span`…) sont retirees sans
 * espace, pour que `c<sub>d</sub>` se lise « cd » ; les autres (cellules,
 * paragraphes, `<text>`) deviennent un separateur « | », pour que deux cases
 * voisines ne se lisent pas comme un seul mot ou un seul nombre.
 */
export function texteVisible(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/?(sub|sup|tspan|span|em|strong|b|i|a|abbr|small)(\s[^>]*)?>/g, '')
    .replace(/<[^>]*>/g, ' | ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[A-Za-z0-9#]+;/g, ' ')
    .replace(/\s+/g, ' ');
}

export const NOMS_GRECS =
  /\b(alpha|beta|gamma|delta|epsilon|eps|zeta|eta|theta|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Phi|Psi|Omega)\b/;

/**
 * Mots francais qui ne s'ecrivent JAMAIS sans accent. Les mots ambigus
 * (« limite », « cote », « calcule », « fixe ») n'y sont pas : relecture.
 */
export const MOTS_SANS_ACCENT: readonly string[] = [
  'activee', 'adherence', 'apres', 'beton', 'calculees', 'caracteristique', 'caracteristiques', 'categorie',
  'comprimee', 'comprimees', 'controle', 'critere', 'criteres', 'deformation', 'deformations', 'dela', 'deja',
  'declaree', 'declarees', 'deduites', 'degres', 'destabilisant', 'destabilisante', 'destabilisantes',
  'deversement', 'diametre', 'diametres', 'donnee', 'donnees', 'duree', 'echelle', 'elancement', 'elastique',
  'element', 'elements', 'entree', 'entrees', 'epaisseur', 'equilibre', 'equivalent', 'equivalente', 'etat',
  'etats', 'excentricite', 'extremite', 'fleche', 'frequente', 'generale', 'generation', 'geometrie',
  'hypotheses', 'inferieur', 'inferieure', 'materiaux', 'memes', 'methode', 'modele', 'moitie', 'numero',
  'parametre', 'parametres', 'perimetre', 'poinconnement', 'precontrainte', 'premiere', 'propriete',
  'proprietes', 'reduction', 'reduite', 'reference', 'regle', 'regles', 'resistance', 'resistances',
  'resultat', 'resultats', 'securite', 'simplifiee', 'soudee', 'soudees', 'superieur', 'superieure',
  'symetrie', 'symetrique', 'synthese', 'systeme', 'tres', 'verification', 'verifications', 'verifiee',
  'n a pas', 'n est pas', 'l ecran', 'd entree',
];

export const AVERTISSEMENT_TYPE = /aide au calcul|ne prescrit pas|responsabilit|incombe|justification r[eé]glementaire/i;

function extrait(texte: string, i: number): string {
  return `« ${texte.slice(Math.max(0, i - 30), i + 30).trim()} »`;
}

export interface OptionsControle {
  /** Mots sans accent propres a l'app, en plus de `MOTS_SANS_ACCENT`. */
  motsEnPlus?: readonly string[];
  /**
   * Mots de `MOTS_SANS_ACCENT` a ne pas signaler pour cette app (nom propre,
   * mot repris tel quel d'une source). A justifier dans le test.
   */
  motsAdmis?: readonly string[];
}

/**
 * Ecarts aux regles d'affichage dans un texte visible. Liste vide : rien a
 * redire. Chaque constat cite le passage, pour corriger sans chercher.
 */
export function constatsAffichage(texte: string, options: OptionsControle = {}): string[] {
  const c: string[] = [];
  const admis = new Set(options.motsAdmis ?? []);
  const mots = [...MOTS_SANS_ACCENT.filter((m) => !admis.has(m)), ...(options.motsEnPlus ?? [])];
  const sansAccent = new RegExp(`\\b(${mots.join('|')})\\b`, 'i');

  const souligne = texte.indexOf('_');
  if (souligne >= 0) c.push(`« _ » affiche : ${extrait(texte, souligne)}`);
  const chapeau = texte.indexOf('^');
  if (chapeau >= 0) c.push(`« ^ » affiche : ${extrait(texte, chapeau)}`);
  const grec = NOMS_GRECS.exec(texte);
  if (grec) c.push(`nom de lettre grecque : ${extrait(texte, grec.index)}`);
  const zero = /\d,\d*0(?!\d)/.exec(texte);
  if (zero) c.push(`zero inutile : ${extrait(texte, zero.index)}`);
  const long = /\d,\d{4,}/.exec(texte);
  if (long) c.push(`plus de 3 decimales : ${extrait(texte, long.index)}`);
  const accent = sansAccent.exec(texte);
  if (accent) c.push(`accent manquant : ${extrait(texte, accent.index)}`);
  const apostrophe = /(^|[^A-Za-z])[dlnDLN] (?=[aeiouyhéèêàâAEIOUYHÉ])/.exec(texte);
  if (apostrophe) c.push(`apostrophe manquante : ${extrait(texte, apostrophe.index)}`);
  const a = /\ba (la|le|les|l')\s/.exec(texte);
  if (a) c.push(`« a » pour « à » : ${extrait(texte, a.index)}`);
  const type = AVERTISSEMENT_TYPE.exec(texte);
  if (type) c.push(`phrase type : ${extrait(texte, type.index)}`);
  return c;
}

/** Contenu de la premiere balise `<nom>` d'une page, ou null. */
export function contenuBalise(page: string, nom: string): string | null {
  const m = new RegExp(`<${nom}(\\s[^>]*)?>([\\s\\S]*?)</${nom}>`).exec(page);
  return m === null ? null : texteVisible(m[2]).trim();
}
