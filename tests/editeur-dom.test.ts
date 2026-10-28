// @vitest-environment jsdom
/**
 * Tests d'acceptation du branchement DOM de l'editeur (v1.4.0). Ils ne
 * tournent qu'en CI (jsdom absent du banc local) : la logique est testee
 * dans editeur.test.ts, ici seulement la traduction des evenements.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { brancherEditeur, type ActionEditeur, type ContexteEditeur, type Graphe, type Outil } from '../src/index';

const G: Graphe<unknown, unknown> = {
  noeuds: [
    { id: 'N1', x: 1, y: 3, donnees: null },
    { id: 'N2', x: 3, y: 3, donnees: null },
  ],
  barres: [],
};

let detacher: (() => void) | null = null;
afterEach(() => {
  detacher?.();
  detacher = null;
  document.body.innerHTML = '';
});

function monter(outil: Outil, rect?: { left: number; top: number; width: number; height: number }, viewBox?: string) {
  document.body.innerHTML = `<svg data-zone ${viewBox ? `viewBox="${viewBox}"` : ''}></svg><input data-champ>`;
  const zone = document.querySelector('[data-zone]') as unknown as SVGSVGElement;
  if (rect) {
    zone.getBoundingClientRect = () => ({ ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height, x: rect.left, y: rect.top, toJSON: () => ({}) }) as DOMRect;
  }
  const actions: ActionEditeur[] = [];
  const contexte = (): ContexteEditeur => ({ vue: { echelle: 100, x0: 0, y0: 5 }, outil, graphe: G, pas: null, tolerancePx: 8 });
  const e = brancherEditeur(zone, { contexte, surAction: (a) => actions.push(a) });
  detacher = e.detacher;
  return { zone, actions, editeur: e };
}

const pointeur = (cible: Element, type: string, clientX: number, clientY: number) =>
  cible.dispatchEvent(new window.MouseEvent(type, { clientX, clientY, bubbles: true }));
const touche = (cible: EventTarget, key: string, ctrlKey = false) =>
  cible.dispatchEvent(new window.KeyboardEvent('keydown', { key, ctrlKey, bubbles: true, cancelable: true }));

describe('brancherEditeur', () => {
  it('pointerdown dans la zone : coordonnees locales converties au modele', () => {
    const { zone, actions } = monter('noeud');
    pointeur(zone, 'pointerdown', 200, 400);
    expect(actions).toHaveLength(1);
    const a = actions[0];
    if (a.type !== 'ajouter-noeud') throw new Error('ajouter-noeud attendu');
    expect(a.point.x).toBeCloseTo(2, 12);
    expect(a.point.y).toBeCloseTo(1, 12);
  });

  it('decalage de la zone et rapport viewBox / taille affichee pris en compte', () => {
    const { zone, actions } = monter('noeud', { left: 10, top: 20, width: 200, height: 100 }, '0 0 400 200');
    pointeur(zone, 'pointerdown', 110, 70);
    const a = actions[0];
    if (a.type !== 'ajouter-noeud') throw new Error('ajouter-noeud attendu');
    expect(a.point.x).toBeCloseTo(2, 12);
    expect(a.point.y).toBeCloseTo(4, 12);
  });

  it('glisser : pointerdown, pointermove, pointerup', () => {
    const { zone, actions } = monter('selection');
    pointeur(zone, 'pointerdown', 300, 200);
    pointeur(zone, 'pointermove', 320, 180);
    pointeur(zone, 'pointerup', 320, 180);
    expect(actions.map((a) => a.type)).toEqual(['choisir', 'deplacer', 'deplacer']);
    expect(actions.at(-1)).toMatchObject({ type: 'deplacer', id: 'N2', fin: true });
  });

  it('clavier : Suppr sur le document, ignore dans un champ, Ctrl+Z empeche le defaut', () => {
    const { zone, actions } = monter('selection');
    pointeur(zone, 'pointerdown', 100, 200);
    pointeur(zone, 'pointerup', 100, 200);
    touche(document.querySelector('[data-champ]')!, 'Delete');
    expect(actions.map((a) => a.type)).toEqual(['choisir']);
    touche(document.body, 'Delete');
    expect(actions.at(-1)).toEqual({ type: 'supprimer', selection: { type: 'noeud', id: 'N1' } });
    const ev = new window.KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true });
    document.body.dispatchEvent(ev);
    expect(actions.at(-1)).toEqual({ type: 'annuler' });
    expect(ev.defaultPrevented).toBe(true);
  });

  it('etat et definirEtat : l app peut aligner la selection (choix dans un tableau)', () => {
    const { actions, editeur } = monter('selection');
    editeur.definirEtat({ ...editeur.etat(), selection: { type: 'noeud', id: 'N2' } });
    touche(document.body, 'Delete');
    expect(actions).toEqual([{ type: 'supprimer', selection: { type: 'noeud', id: 'N2' } }]);
  });

  it('detacher : plus aucun evenement traite', () => {
    const { zone, actions, editeur } = monter('noeud');
    editeur.detacher();
    pointeur(zone, 'pointerdown', 200, 400);
    touche(document.body, 'z', true);
    expect(actions).toEqual([]);
  });
});
