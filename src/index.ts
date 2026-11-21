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
export { notationHtml, notationSegments, notationSvg, notationTexte } from './notation';
export { definitionNotePdf, noteDeCalculPdf, svgPourPdf, telechargerNotePdf, textePdf, type DefinitionPdf } from './note-pdf';
export { svgAutonome } from './svg';
export {
  AVERTISSEMENT_TYPE,
  MOTS_FRANCAIS,
  MOTS_SANS_ACCENT,
  NOMS_GRECS,
  constatsAffichage,
  contenuBalise,
  texteVisible,
  type OptionsControle,
} from './controle';
export { blocsEnTexte, csv, resultatsEnCsv, type BlocResultat, type LigneResultat } from './csv';
export { colonneXlsx, crc32, lireZipSansCompression, zipSansCompression } from './xlsx';
export {
  FONCTIONS_XLSX_PERMISES,
  LARGEURS_COLONNES_XLSX,
  LIGNES_PAR_PAGE_XLSX,
  classeurDeCalcul,
  nomDeFichierXlsx,
  verifierGabaritXlsx,
  type CartoucheXlsx,
  type ClasseurCalcul,
  type GroupeXlsx,
  type LigneCalculXlsx,
  type LigneDonneeXlsx,
  type VerificationXlsx,
} from './xlsx-gabarit';
export { ecartsDeConcordance, evaluerFormuleXlsx, type EcartConcordance } from './xlsx-formules';
export { ouvrirOuTelecharger, telecharger } from './navigateur';
export {
  definirLangue,
  langueCourante,
  langueDuDocument,
  lienDeLangue,
  pointDecimal,
  traducteur,
  type Langue,
  type RegleDePhrase,
} from './langue';
export { SECTIONS_NOTE, STYLE_NOTE, noteDeCalculHtml, versionOutil, type CartoucheNote, type ElementNote, type NoteDeCalcul, type SectionNote, type VerificationNote } from './note';
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
export {
  FORMAT_PROJET,
  SUPPRIME,
  ErreurProjet,
  ajouterCalcul,
  ajouterDossier,
  ajouterElement,
  aplatir,
  appliquer,
  champsSurcharges,
  chemin,
  cheminDuNoeud,
  clesDuChemin,
  creerProjet,
  definirStatut,
  deplacer,
  detacherFeuille,
  difference,
  donneesDeFeuille,
  dupliquer,
  dupliquerFeuille,
  ecrireFeuille,
  elements,
  exporterProjet,
  heritiers,
  importerProjet,
  nouvelId,
  renommer,
  revenirAOrigine,
  supprimerFeuille,
  supprimerNoeud,
  toucher,
  trouverCalcul,
  trouverFeuille,
  trouverNoeud,
  type Calcul,
  type CodeErreurProjet,
  type Dossier,
  type ElementProjet,
  type Feuille,
  type Json,
  type Noeud,
  type Projet,
  type ResumeProjet,
  definirVerdict,
  verdictDeFeuille,
  verdictDuCalcul,
  type EtatVerdict,
  type StatutFeuille,
} from './projets';
export { depotEnMemoire, depotNavigateur, depotParDefaut, type DepotProjets } from './projets-stockage';
export { cartoucheDuProjet, type CartoucheProjet } from './cartouche-projet';
export { brancherFeuilles, remplirCartouche, libelleDepuisPage, verdictDepuisPage, type BarreFeuilles, type OptionsFeuilles } from './feuilles-dom';
export { avertissement2eGeneration } from './generation';
export { AN_LU, ANNEXE_LU_VERIFIEE, ANNEXES_NATIONALES, avertissementAnnexeLu, libelleAnnexe, lireAnnexe, optionsAnnexe, sourceLu, traduireSource, valeurLu, type AnnexeNationale, type ValeurLu } from './annexe';
