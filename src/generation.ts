/**
 * Avertissement commun de la 2e generation des Eurocodes (audit du 10/11/2026, R5) :
 * affiche a l'ecran et en tete de la note des que la 2e generation est choisie.
 */
import { langueCourante } from './langue';

export function avertissement2eGeneration(): string {
  return langueCourante() === 'en'
    ? '2nd generation of the Eurocodes: published by CEN but not applicable until its National Annex is published. Results for study only; do not use them alone to justify a structure.'
    : '2e génération des Eurocodes : publiée par le CEN mais pas applicable tant que son annexe nationale n’est pas parue. Résultats à titre d’étude, à ne pas utiliser seuls pour justifier un ouvrage.';
}
