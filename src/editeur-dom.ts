/**
 * aedificium-ui — branchement DOM de l'editeur de dessin commun.
 *
 * Seulement la traduction des evenements (`pointerdown`, `pointermove`,
 * `pointerup`, `keydown`) en appels a `editeur.ts`. Aucun rendu, aucun etat
 * de graphe : l'app fournit le contexte et applique les actions.
 */

import {
  ETAT_EDITEUR_INITIAL,
  surPointeur,
  surTouche,
  type ActionEditeur,
  type ContexteEditeur,
  type EtatEditeur,
} from './editeur';

/**
 * Rapport entre une dimension du viewBox (indice 2 : largeur, 3 : hauteur) et
 * la taille affichee. On lit l'attribut lui-meme : jsdom n'a pas
 * `viewBox.baseVal`. Sans viewBox ou sans dimension positive, le rapport vaut 1.
 */
function rapport(viewBox: string | null, taille: number, indice: number): number {
  if (viewBox === null || !(taille > 0)) return 1;
  const valeur = Number(viewBox.trim().split(/[\s,]+/)[indice]);
  return Number.isFinite(valeur) && valeur > 0 ? valeur / taille : 1;
}

/** Vrai si la cible est un champ de saisie ou un element editable. */
function dansChamp(cible: EventTarget | null): boolean {
  if (!(cible instanceof Element)) return false;
  const balise = cible.tagName;
  return (
    balise === 'INPUT' ||
    balise === 'SELECT' ||
    balise === 'TEXTAREA' ||
    (cible as HTMLElement).isContentEditable === true
  );
}

/**
 * Branche l'editeur sur une zone SVG. `contexte()` est lu a chaque evenement
 * (l'app peut changer d'outil ou de graphe) ; `surAction` recoit les actions
 * dans l'ordre. `detacher()` retire tous les ecouteurs.
 */
export function brancherEditeur(
  zone: SVGSVGElement,
  o: { contexte(): ContexteEditeur; surAction(a: ActionEditeur): void },
): { detacher(): void; etat(): EtatEditeur; definirEtat(e: EtatEditeur): void } {
  let etat = ETAT_EDITEUR_INITIAL;

  const appliquer = (r: { etat: EtatEditeur; actions: ActionEditeur[] }): void => {
    etat = r.etat;
    for (const a of r.actions) o.surAction(a);
  };

  const pointeur = (type: 'bas' | 'deplace' | 'haut', ev: PointerEvent): void => {
    const rect = zone.getBoundingClientRect();
    const viewBox = zone.getAttribute('viewBox');
    const x = (ev.clientX - rect.left) * rapport(viewBox, rect.width, 2);
    const y = (ev.clientY - rect.top) * rapport(viewBox, rect.height, 3);
    appliquer(surPointeur(etat, { type, x, y }, o.contexte()));
  };

  const surBas = (ev: PointerEvent): void => {
    if (typeof zone.setPointerCapture === 'function') {
      try {
        zone.setPointerCapture(ev.pointerId);
      } catch {
        // Capture indisponible (jsdom) : les evenements restent traites.
      }
    }
    pointeur('bas', ev);
  };
  const surDeplace = (ev: PointerEvent): void => pointeur('deplace', ev);
  const surHaut = (ev: PointerEvent): void => pointeur('haut', ev);

  const surClavier = (ev: KeyboardEvent): void => {
    const r = surTouche(etat, {
      cle: ev.key,
      ctrl: ev.ctrlKey,
      maj: ev.shiftKey,
      dansChamp: dansChamp(ev.target),
    });
    if (r.gere) ev.preventDefault();
    appliquer(r);
  };

  zone.addEventListener('pointerdown', surBas);
  zone.addEventListener('pointermove', surDeplace);
  zone.addEventListener('pointerup', surHaut);
  const doc = zone.ownerDocument;
  doc.addEventListener('keydown', surClavier);

  return {
    detacher(): void {
      zone.removeEventListener('pointerdown', surBas);
      zone.removeEventListener('pointermove', surDeplace);
      zone.removeEventListener('pointerup', surHaut);
      doc.removeEventListener('keydown', surClavier);
    },
    etat(): EtatEditeur {
      return etat;
    },
    definirEtat(e: EtatEditeur): void {
      etat = e;
    },
  };
}
