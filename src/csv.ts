/**
 * CSV pour tableur francais ; en anglais, pour tableur anglais.
 *
 * - Point-virgule en separateur : la virgule est le separateur decimal. En
 *   anglais (point decimal), virgule en separateur.
 * - Marque d'ordre des octets : sans elle, un tableur lit le fichier dans
 *   l'encodage de la machine et massacre accents et lettres grecques.
 * - Fins de ligne CRLF, comprises partout.
 */

import { langueCourante } from './langue';
import { notationTexte } from './notation';

const FIN_DE_LIGNE = '\r\n';
const BOM = '﻿';

function champ(valeur: string, separateur: string): string {
  if (!valeur.includes(separateur) && !/["\r\n]/.test(valeur)) return valeur;
  return `"${valeur.replace(/"/g, '""')}"`;
}

/** Tableau de lignes en texte CSV, BOM compris. */
export function csv(lignes: readonly (readonly string[])[]): string {
  const separateur = langueCourante() === 'en' ? ',' : ';';
  return BOM + lignes.map((l) => l.map((v) => champ(v, separateur)).join(separateur)).join(FIN_DE_LIGNE) + FIN_DE_LIGNE;
}

export interface LigneResultat {
  symbole: string;
  libelle: string;
  valeur: string;
}

export interface BlocResultat {
  titre: string;
  lignes: readonly LigneResultat[];
  /** Precision ou motif d'indisponibilite ; null s'il n'y en a pas. */
  note: string | null;
}

/**
 * Les resultats affiches, en tableau. AUCUN BLOC N'EST OMIS : ce qui n'a pas
 * ete calcule sort avec son motif, et le motif sort meme sans ligne — c'est
 * justement le cas ou il porte toute l'information.
 */
export function resultatsEnCsv(blocs: readonly BlocResultat[]): string {
  const lignes: string[][] = [langueCourante() === 'en' ? ['Block', 'Symbol', 'Quantity', 'Value'] : ['Bloc', 'Symbole', 'Grandeur', 'Valeur']];
  for (const b of blocs) {
    for (const l of b.lignes) lignes.push([b.titre, l.symbole, l.libelle, l.valeur]);
    if (b.note !== null) lignes.push([b.titre, '', b.note, '']);
  }
  return csv(lignes);
}

/**
 * Les blocs en notation de texte brut (`M_Ed` -> `MEd`, `alpha_1` -> `α₁`),
 * pour le CSV. Copie : les blocs recus, qui servent aussi a l'ecran et a la
 * note, ne sont pas modifies.
 */
export function blocsEnTexte(blocs: readonly BlocResultat[]): BlocResultat[] {
  return blocs.map((b) => ({
    titre: notationTexte(b.titre),
    lignes: b.lignes.map((l) => ({ symbole: notationTexte(l.symbole), libelle: notationTexte(l.libelle), valeur: notationTexte(l.valeur) })),
    note: b.note === null ? null : notationTexte(b.note),
  }));
}
