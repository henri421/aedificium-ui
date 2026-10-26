/**
 * aedificium-ui — primitives d'interface communes aux outils de calcul.
 *
 * Seulement ce qui doit se comporter a l'identique d'un outil a l'autre
 * (voir WebAedificium/DECISION-interface-commune.md). Ni formulaires, ni
 * persistance, ni vues : ils sont propres a chaque outil.
 */

export { JETONS, valeursDesJetons } from './jetons';
export { echapper, lireNombre, nombreAffiche, nombreFr, tauxAffiche, tauxFr } from './format';
export { notationHtml, notationSvg, notationTexte } from './notation';
export { svgAutonome } from './svg';
export {
  AVERTISSEMENT_TYPE,
  MOTS_SANS_ACCENT,
  NOMS_GRECS,
  constatsAffichage,
  contenuBalise,
  texteVisible,
  type OptionsControle,
} from './controle';
export { blocsEnTexte, csv, resultatsEnCsv, type BlocResultat, type LigneResultat } from './csv';
export { ouvrirOuTelecharger, telecharger } from './navigateur';
export { SECTIONS_NOTE, STYLE_NOTE, noteDeCalculHtml, type CartoucheNote, type ElementNote, type NoteDeCalcul, type SectionNote, type VerificationNote } from './note';
