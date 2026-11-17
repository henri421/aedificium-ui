/**
 * Annexes nationales communes a la suite (audit du 10/11/2026, R4, lot E).
 *
 * Deux choix : les valeurs recommandees de l'Eurocode, et le Luxembourg. Les valeurs
 * luxembourgeoises vivent ICI, en un seul endroit : chaque outil construit son profil
 * `lu` a partir de son profil recommande et de `valeurLu`, puis laisse l'utilisateur
 * modifier chaque coefficient (une valeur changee est marquee imposee par l'outil).
 *
 * Tant que les annexes ILNAS (AN-LU:2020) n'ont pas ete lues, `ANNEXE_LU_VERIFIEE` est
 * faux : chaque source porte « non verifiee » et l'avertissement est affiche a l'ecran
 * et en tete de la note. A la lecture des annexes : completer `AN_LU`, passer
 * `ANNEXE_LU_VERIFIEE` a vrai et retirer la mention des sources.
 */
import { echapper } from './format';
import { langueCourante } from './langue';

export type AnnexeNationale = 'recommande' | 'lu';

export const ANNEXES_NATIONALES: readonly AnnexeNationale[] = ['recommande', 'lu'];

/** Faux tant que les valeurs de `AN_LU` n'ont pas ete relues sur les annexes ILNAS. */
export const ANNEXE_LU_VERIFIEE = false;

/** Ecart luxembourgeois connu : valeur et clause de l'Eurocode concernee. */
export interface ValeurLu {
  valeur: number;
  clause: string;
}

/**
 * Ecarts a la valeur recommandee, par partie d'Eurocode puis par cle de parametre.
 * Tout parametre absent garde la valeur recommandee (presumee retenue).
 * alpha_cc = 0,85 : indique par l'utilisateur le 17/11/2026, a verifier.
 */
export const AN_LU: Record<string, Record<string, ValeurLu>> = {
  'EN 1992-1-1': {
    alpha_cc: { valeur: 0.85, clause: '3.1.6(1)P' },
  },
};

export function libelleAnnexe(a: AnnexeNationale): string {
  const en = langueCourante() === 'en';
  if (a === 'recommande') return en ? 'Recommended values' : 'Valeurs recommandées';
  return en ? 'Luxembourg (AN-LU:2020, to be checked)' : 'Luxembourg (AN-LU:2020, à vérifier)';
}

/** Lecture tolerante d'un fichier enregistre : tout ce qui n'est pas `lu` donne `recommande`. */
export function lireAnnexe(x: unknown): AnnexeNationale {
  return x === 'lu' ? 'lu' : 'recommande';
}

/** Options d'un `<select>` d'annexe, le choix courant marque. */
export function optionsAnnexe(courante: AnnexeNationale): string {
  return ANNEXES_NATIONALES.map(
    (a) => `<option value="${a}"${a === courante ? ' selected' : ''}>${echapper(libelleAnnexe(a))}</option>`,
  ).join('');
}

/** Source d'une valeur luxembourgeoise. `recommandee` : la valeur recommandee est presumee retenue. */
export function sourceLu(partie: string, clause: string, recommandee: boolean): string {
  const statut = recommandee ? 'valeur recommandée présumée retenue' : 'valeur présumée';
  const suite = ANNEXE_LU_VERIFIEE ? '' : ', non vérifiée sur l’annexe';
  return `ILNAS-${partie}/AN-LU:2020, ${clause} : ${statut}${suite}`;
}

/** Valeur luxembourgeoise d'un parametre, a partir de sa valeur recommandee. */
export function valeurLu(
  partie: string,
  cle: string,
  recommandee: { valeur: number; source: string },
  clause: string,
): { valeur: number; source: string } {
  const ecart = AN_LU[partie]?.[cle];
  return ecart
    ? { valeur: ecart.valeur, source: sourceLu(partie, ecart.clause, false) }
    : { valeur: recommandee.valeur, source: sourceLu(partie, clause, true) };
}

/** Avertissement affiche a l'ecran et en tete de la note quand le profil `lu` est choisi. */
export function avertissementAnnexeLu(): string {
  if (ANNEXE_LU_VERIFIEE) return '';
  return langueCourante() === 'en'
    ? 'Luxembourg National Annex: values pre-filled and presumed, not yet checked against the ILNAS text. Check them; you can change each one.'
    : 'Annexe nationale luxembourgeoise : valeurs préremplies et présumées, pas encore vérifiées sur le texte de l’ILNAS. Contrôlez-les ; vous pouvez modifier chacune.';
}

/**
 * Source d'un profil telle qu'elle s'affiche : traduite mot a mot en anglais (les profils
 * ecrivent leurs sources en francais), intacte en francais.
 */
export function traduireSource(source: string): string {
  if (langueCourante() !== 'en') return source;
  return source
    .replace(/valeur recommandée présumée retenue/g, 'recommended value presumed retained')
    .replace(/valeur présumée/g, 'presumed value')
    .replace(/, non vérifiée sur l’annexe/g, ', not checked against the annex')
    .replace(/valeurs? recommandées?/g, 'recommended value')
    .replace(/valeur imposée par l’utilisateur/g, 'value imposed by the user')
    .replace(/valeur maximale recommandée/g, 'maximum recommended value')
    .replace(/valeur minimale recommandée/g, 'minimum recommended value')
    .replace(/\btableaux?\b/g, 'Table')
    .replace(/\bnote\b/g, 'Note')
    .replace(/\bannexe\b/g, 'Annex')
    .replace(/\bprofil\b/g, 'profile')
    .replace(/ : /g, ': ');
}
