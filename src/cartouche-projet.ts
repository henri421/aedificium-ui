/**
 * Cartouche tire du projet ouvert (audit du 10/11/2026, I15) : quand une app
 * travaille dans une feuille de projet, le nom du projet et le repere de
 * l'element viennent du projet, au lieu d'etre ressaisis dans chaque outil.
 */
import { trouverCalcul, trouverFeuille, type Projet } from './projets';

export interface CartoucheProjet {
  /** Nom du projet. */
  projet: string;
  /** Repere de l'element ; suivi du nom de la feuille quand le calcul en a plusieurs. */
  element: string;
}

/** Le cartouche de la feuille `feuilleId` du calcul `calculId`, ou null s'il est introuvable. */
export function cartoucheDuProjet(p: Projet, calculId: string, feuilleId: string): CartoucheProjet | null {
  const t = trouverCalcul(p, calculId);
  if (t === null) return null;
  const f = trouverFeuille(t.calcul, feuilleId);
  const element = t.calcul.feuilles.length > 1 ? `${t.element.nom} · ${f.nom}` : t.element.nom;
  return { projet: p.nom, element };
}
