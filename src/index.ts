/**
 * aedificium-ui — primitives d'interface communes aux outils de calcul.
 *
 * Seulement ce qui doit se comporter a l'identique d'un outil a l'autre
 * (voir WebAedificium/DECISION-interface-commune.md). Ni formulaires, ni
 * persistance, ni vues : ils sont propres a chaque outil.
 */

export { JETONS, valeursDesJetons } from './jetons';
export { echapper, lireNombre, nombreFr, tauxFr } from './format';
export { svgAutonome } from './svg';
export { csv, resultatsEnCsv, type BlocResultat, type LigneResultat } from './csv';
export { ouvrirOuTelecharger, telecharger } from './navigateur';
