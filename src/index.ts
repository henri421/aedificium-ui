/**
 * aedificium-ui — primitives d'interface communes aux outils de calcul.
 *
 * Seulement ce qui doit se comporter a l'identique d'un outil a l'autre
 * (voir WebAedificium/DECISION-interface-commune.md). Ni formulaires, ni
 * persistance, ni vues : ils sont propres a chaque outil ; seule exception,
 * l'editeur de dessin (`editeur.ts`), commun a MBT et equilibre-statique.
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
export {
  ETAT_EDITEUR_INITIAL,
  aimanter,
  ajouterNoeud,
  annuler,
  deplacerNoeud,
  distanceAuSegment,
  historique,
  plusProche,
  prochainId,
  pousser,
  relier,
  retablir,
  supprimer,
  surPointeur,
  surTouche,
  versEcran,
  versModele,
  vueAjustee,
  type ActionEditeur,
  type BarreGraphe,
  type ContexteEditeur,
  type EtatEditeur,
  type Graphe,
  type Historique,
  type NoeudGraphe,
  type Outil,
  type Point,
  type Selection,
  type Vue,
} from './editeur';
export { brancherEditeur } from './editeur-dom';
