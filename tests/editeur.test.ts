/**
 * Tests d'acceptation de l'editeur de dessin commun (v1.4.0) : module pur,
 * sans DOM. Repere, graphe de noeuds et de barres, aimantation, choix sous
 * le pointeur, historique, et machine a etats des outils.
 */

import { describe, expect, it } from 'vitest';
import {
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
  type ContexteEditeur,
  type EtatEditeur,
  type Graphe,
  type Outil,
  type Vue,
} from '../src/index';

type G = Graphe<{ m: string }, { t: string }>;

/** N1 (1, 3), N2 (3, 3), N3 (1, 1) ; B1 : N1 -> N2. */
const G0: G = {
  noeuds: [
    { id: 'N1', x: 1, y: 3, donnees: { m: 'a' } },
    { id: 'N2', x: 3, y: 3, donnees: { m: 'b' } },
    { id: 'N3', x: 1, y: 1, donnees: { m: 'c' } },
  ],
  barres: [{ id: 'B1', de: 'N1', a: 'N2', donnees: { t: 'x' } }],
};

/** 100 px par unite, y0 = 5 : le modele (1, 3) est a (100, 200) a l'ecran. */
const VUE: Vue = { echelle: 100, x0: 0, y0: 5 };

const ctx = (outil: Outil, graphe: G = G0, pas: number | null = null): ContexteEditeur => ({ vue: VUE, outil, graphe, pas, tolerancePx: 8 });
const ecran = (x: number, y: number) => versEcran({ x, y }, VUE);

describe('repere', () => {
  it('le modele a y vers le haut, l ecran y vers le bas', () => {
    expect(versEcran({ x: 1, y: 3 }, VUE)).toEqual({ x: 100, y: 200 });
    expect(versEcran({ x: 0, y: 5 }, VUE)).toEqual({ x: 0, y: 0 });
  });

  it('versModele est l inverse de versEcran', () => {
    const v: Vue = { echelle: 37.5, x0: -0.4, y0: 2.2 };
    const p = { x: 1.234, y: -0.5 };
    const q = versModele(versEcran(p, v), v);
    expect(q.x).toBeCloseTo(p.x, 12);
    expect(q.y).toBeCloseTo(p.y, 12);
  });

  it('vueAjustee : plus grande echelle dans la marge, figure centree', () => {
    const v = vueAjustee([{ x: 0, y: 0 }, { x: 2, y: 1 }], 440, 240, 20);
    expect(v.echelle).toBeCloseTo(200, 10);
    const a = versEcran({ x: 0, y: 0 }, v);
    const b = versEcran({ x: 2, y: 1 }, v);
    expect(a.x).toBeCloseTo(20, 10);
    expect(a.y).toBeCloseTo(220, 10);
    expect(b.x).toBeCloseTo(420, 10);
    expect(b.y).toBeCloseTo(20, 10);
  });

  it('vueAjustee : la dimension la plus contraignante fixe l echelle, l autre est centree', () => {
    const v = vueAjustee([{ x: 0, y: 0 }, { x: 1, y: 1 }], 440, 240, 20);
    expect(v.echelle).toBeCloseTo(200, 10);
    const a = versEcran({ x: 0, y: 0 }, v);
    expect(a.x).toBeCloseTo(120, 10);
    expect(a.y).toBeCloseTo(220, 10);
  });

  it('vueAjustee : points alignes ou absents, echelle finie et positive', () => {
    for (const pts of [[], [{ x: 2, y: 2 }], [{ x: 0, y: 1 }, { x: 4, y: 1 }]]) {
      const v = vueAjustee(pts, 400, 300, 10);
      expect(Number.isFinite(v.echelle) && v.echelle > 0, JSON.stringify(pts)).toBe(true);
      expect(Number.isFinite(v.x0) && Number.isFinite(v.y0)).toBe(true);
    }
    const v = vueAjustee([{ x: 0, y: 1 }, { x: 4, y: 1 }], 400, 300, 10);
    expect(v.echelle).toBeCloseTo(95, 10);
    expect(versEcran({ x: 0, y: 1 }, v).y).toBeCloseTo(150, 10);
  });
});

describe('graphe', () => {
  it('prochainId : le plus grand numero plus un, ids etrangers ignores', () => {
    expect(prochainId([], 'N')).toBe('N1');
    expect(prochainId(['N1', 'N2', 'N7'], 'N')).toBe('N8');
    expect(prochainId(['N_Col', 'B3', 'N2a', 'N2'], 'N')).toBe('N3');
  });

  it('ajouterNoeud : nouvel id, graphe d origine intact', () => {
    const { graphe, id } = ajouterNoeud(G0, { x: 2, y: 0 }, { m: 'd' });
    expect(id).toBe('N4');
    expect(graphe.noeuds.at(-1)).toEqual({ id: 'N4', x: 2, y: 0, donnees: { m: 'd' } });
    expect(G0.noeuds).toHaveLength(3);
    expect(ajouterNoeud(G0, { x: 0, y: 0 }, { m: 'e' }, 'P').id).toBe('P1');
  });

  it('deplacerNoeud : seules les coordonnees changent ; id inconnu, meme graphe', () => {
    const g = deplacerNoeud(G0, 'N2', { x: 4, y: 2 });
    expect(g.noeuds[1]).toEqual({ id: 'N2', x: 4, y: 2, donnees: { m: 'b' } });
    expect(G0.noeuds[1].x).toBe(3);
    expect(deplacerNoeud(G0, 'N9', { x: 0, y: 0 })).toBe(G0);
  });

  it('relier : nouvelle barre ; refus si boucle, doublon (dans un sens ou l autre) ou noeud inconnu', () => {
    const r = relier(G0, 'N2', 'N3', { t: 'y' });
    expect(r.id).toBe('B2');
    expect(r.graphe.barres.at(-1)).toEqual({ id: 'B2', de: 'N2', a: 'N3', donnees: { t: 'y' } });
    for (const [de, a] of [['N1', 'N1'], ['N1', 'N2'], ['N2', 'N1'], ['N1', 'N9']]) {
      const refus = relier(G0, de, a, { t: 'z' });
      expect(refus.id, `${de}-${a}`).toBeNull();
      expect(refus.graphe).toBe(G0);
    }
  });

  it('supprimer : un noeud emporte ses barres ; une barre seule ; rien sinon', () => {
    const sansN1 = supprimer(G0, { type: 'noeud', id: 'N1' });
    expect(sansN1.noeuds.map((n) => n.id)).toEqual(['N2', 'N3']);
    expect(sansN1.barres).toEqual([]);
    const sansB1 = supprimer(G0, { type: 'barre', id: 'B1' });
    expect(sansB1.noeuds).toHaveLength(3);
    expect(sansB1.barres).toEqual([]);
    expect(supprimer(G0, null)).toBe(G0);
    expect(supprimer(G0, { type: 'barre', id: 'B9' })).toBe(G0);
  });
});

describe('aimantation et choix sous le pointeur', () => {
  const points = G0.noeuds;

  it('un noeud proche l emporte sur la grille', () => {
    expect(aimanter({ x: 1.05, y: 2.97 }, { pas: 0.5, tolerance: 0.08, points })).toEqual({ point: { x: 1, y: 3 }, noeud: 'N1' });
  });

  it('sinon la grille, sinon le point tel quel', () => {
    const g = aimanter({ x: 2.37, y: 0.12 }, { pas: 0.05, tolerance: 0.08, points });
    expect(g.noeud).toBeNull();
    expect(g.point.x).toBeCloseTo(2.35, 12);
    expect(g.point.y).toBeCloseTo(0.1, 12);
    expect(aimanter({ x: 2.37, y: 0.12 }, { pas: null, tolerance: 0.08, points })).toEqual({ point: { x: 2.37, y: 0.12 }, noeud: null });
  });

  it('jamais de -0 sur la grille', () => {
    const { point } = aimanter({ x: -0.01, y: -0.02 }, { pas: 0.05, tolerance: 0.001, points: [] });
    expect(Object.is(point.x, -0)).toBe(false);
    expect(Object.is(point.y, -0)).toBe(false);
  });

  it('distanceAuSegment : perpendiculaire dans le segment, extremite au-dela', () => {
    expect(distanceAuSegment({ x: 2, y: 1 }, { x: 0, y: 0 }, { x: 4, y: 0 })).toBeCloseTo(1, 12);
    expect(distanceAuSegment({ x: 7, y: 4 }, { x: 0, y: 0 }, { x: 4, y: 0 })).toBeCloseTo(5, 12);
    expect(distanceAuSegment({ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 2 })).toBeCloseTo(Math.SQRT2, 12);
  });

  it('plusProche : le noeud d abord, puis la barre, sinon rien', () => {
    expect(plusProche(G0, { x: 1.05, y: 3.02 }, 0.1)).toEqual({ type: 'noeud', id: 'N1' });
    expect(plusProche(G0, { x: 2, y: 3.05 }, 0.1)).toEqual({ type: 'barre', id: 'B1' });
    expect(plusProche(G0, { x: 2, y: 2 }, 0.1)).toBeNull();
  });
});

describe('historique', () => {
  it('pousser, annuler, retablir', () => {
    let h = historique('a');
    h = pousser(h, 'b');
    h = pousser(h, 'c');
    expect(h.present).toBe('c');
    h = annuler(h);
    expect(h.present).toBe('b');
    h = annuler(h);
    expect(h.present).toBe('a');
    const bout = annuler(h);
    expect(bout).toBe(h);
    h = retablir(h);
    expect(h.present).toBe('b');
    h = pousser(h, 'd');
    expect(h.futur).toEqual([]);
    expect(retablir(h)).toBe(h);
  });

  it('le passe est borne a la limite', () => {
    let h = historique(0);
    for (let i = 1; i <= 5; i++) h = pousser(h, i, 3);
    expect(h.passe).toEqual([2, 3, 4]);
    expect(h.present).toBe(5);
  });
});

describe('machine a etats : outils', () => {
  const run = (e: EtatEditeur, c: ContexteEditeur, ...evs: [type: 'bas' | 'deplace' | 'haut', x: number, y: number][]) => {
    const actions: ActionEditeur[] = [];
    for (const [type, x, y] of evs) {
      const r = surPointeur(e, { type, x, y }, c);
      e = r.etat;
      actions.push(...r.actions);
    }
    return { etat: e, actions };
  };

  it('selection : clic sur un noeud le choisit ; dans le vide, plus rien', () => {
    const a = ecran(1, 3);
    const r = run(ETAT_EDITEUR_INITIAL, ctx('selection'), ['bas', a.x + 3, a.y], ['haut', a.x + 3, a.y]);
    expect(r.actions).toEqual([{ type: 'choisir', selection: { type: 'noeud', id: 'N1' } }]);
    expect(r.etat.selection).toEqual({ type: 'noeud', id: 'N1' });
    const vide = ecran(2, 2);
    const r2 = run(r.etat, ctx('selection'), ['bas', vide.x, vide.y]);
    expect(r2.actions).toEqual([{ type: 'choisir', selection: null }]);
    expect(r2.etat.selection).toBeNull();
  });

  it('selection : glisser un noeud, aimante sur la grille, puis fin', () => {
    const a = ecran(3, 3);
    const b = ecran(3.52, 2.49);
    const r = run(ETAT_EDITEUR_INITIAL, ctx('selection', G0, 0.5), ['bas', a.x, a.y], ['deplace', b.x, b.y], ['haut', b.x, b.y]);
    expect(r.actions.map((x) => x.type)).toEqual(['choisir', 'deplacer', 'deplacer']);
    const [, pendant, fin] = r.actions;
    expect(pendant).toMatchObject({ type: 'deplacer', id: 'N2', fin: false });
    expect(fin).toMatchObject({ type: 'deplacer', id: 'N2', fin: true });
    if (fin.type !== 'deplacer') throw new Error('deplacer attendu');
    expect(fin.point.x).toBeCloseTo(3.5, 12);
    expect(fin.point.y).toBeCloseTo(2.5, 12);
    expect(r.etat.glisse).toBeNull();
  });

  it('selection : le noeud glisse ne s aimante pas sur lui-meme ; un clic sans mouvement ne deplace rien', () => {
    const a = ecran(3, 3);
    const b = ecran(3.03, 3.02);
    const r = run(ETAT_EDITEUR_INITIAL, ctx('selection'), ['bas', a.x, a.y], ['deplace', b.x, b.y], ['haut', b.x, b.y]);
    const fin = r.actions.at(-1);
    if (fin?.type !== 'deplacer') throw new Error('deplacer attendu');
    expect(fin.point.x).toBeCloseTo(3.03, 12);
    expect(fin.point.y).toBeCloseTo(3.02, 12);
    const clic = run(ETAT_EDITEUR_INITIAL, ctx('selection'), ['bas', a.x, a.y], ['haut', a.x, a.y]);
    expect(clic.actions.map((x) => x.type)).toEqual(['choisir']);
  });

  it('noeud : clic dans le vide ajoute un noeud aimante ; sur un noeud, le choisit', () => {
    const p = ecran(2.02, 0.49);
    const r = run(ETAT_EDITEUR_INITIAL, ctx('noeud', G0, 0.5), ['bas', p.x, p.y]);
    expect(r.actions).toHaveLength(1);
    const a = r.actions[0];
    if (a.type !== 'ajouter-noeud') throw new Error('ajouter-noeud attendu');
    expect(a.point.x).toBeCloseTo(2, 12);
    expect(a.point.y).toBeCloseTo(0.5, 12);
    const n = ecran(1, 1);
    expect(run(ETAT_EDITEUR_INITIAL, ctx('noeud'), ['bas', n.x + 2, n.y]).actions).toEqual([{ type: 'choisir', selection: { type: 'noeud', id: 'N3' } }]);
  });

  it('barre : deux noeuds relies, le second devient le depart suivant ; clic dans le vide sans effet', () => {
    const [n1, n2, n3] = [ecran(1, 3), ecran(3, 3), ecran(1, 1)];
    const vide = ecran(2, 2);
    const r = run(ETAT_EDITEUR_INITIAL, ctx('barre'), ['bas', n2.x, n2.y], ['bas', vide.x, vide.y], ['bas', n3.x, n3.y], ['bas', n1.x, n1.y]);
    expect(r.actions).toEqual([
      { type: 'relier', de: 'N2', a: 'N3' },
      { type: 'relier', de: 'N3', a: 'N1' },
    ]);
    expect(r.etat.barreEnCours).toBe('N1');
  });

  it('barre : reclic sur le noeud de depart ou Echap terminent la chaine', () => {
    const n2 = ecran(3, 3);
    const r = run(ETAT_EDITEUR_INITIAL, ctx('barre'), ['bas', n2.x, n2.y], ['bas', n2.x, n2.y]);
    expect(r.actions).toEqual([]);
    expect(r.etat.barreEnCours).toBeNull();
    const enCours = run(ETAT_EDITEUR_INITIAL, ctx('barre'), ['bas', n2.x, n2.y]).etat;
    expect(enCours.barreEnCours).toBe('N2');
    const echap = surTouche(enCours, { cle: 'Escape', ctrl: false, maj: false, dansChamp: false });
    expect(echap.etat.barreEnCours).toBeNull();
    expect(echap.actions).toEqual([]);
    expect(echap.gere).toBe(true);
  });

  it('changer d outil abandonne la barre en cours', () => {
    const n2 = ecran(3, 3);
    const enCours = run(ETAT_EDITEUR_INITIAL, ctx('barre'), ['bas', n2.x, n2.y]).etat;
    const vide = ecran(2, 2);
    expect(run(enCours, ctx('selection'), ['bas', vide.x, vide.y]).etat.barreEnCours).toBeNull();
  });

  it('appui et charge : sur un noeud seulement', () => {
    const n3 = ecran(1, 1);
    const vide = ecran(2, 2);
    expect(run(ETAT_EDITEUR_INITIAL, ctx('appui'), ['bas', n3.x, n3.y], ['bas', vide.x, vide.y]).actions).toEqual([{ type: 'appui', id: 'N3' }]);
    expect(run(ETAT_EDITEUR_INITIAL, ctx('charge'), ['bas', n3.x, n3.y], ['bas', vide.x, vide.y]).actions).toEqual([{ type: 'charge', id: 'N3' }]);
  });

  it('supprimer : noeud ou barre sous le pointeur ; la selection est videe', () => {
    const milieu = ecran(2, 3);
    const e: EtatEditeur = { ...ETAT_EDITEUR_INITIAL, selection: { type: 'barre', id: 'B1' } };
    const r = run(e, ctx('supprimer'), ['bas', milieu.x, milieu.y + 3]);
    expect(r.actions).toEqual([{ type: 'supprimer', selection: { type: 'barre', id: 'B1' } }]);
    expect(r.etat.selection).toBeNull();
  });

  it('survol : position aimantee et noeud vise, hors glissement', () => {
    const n1 = ecran(1, 3);
    const r = run(ETAT_EDITEUR_INITIAL, ctx('noeud', G0, 0.5), ['deplace', n1.x + 4, n1.y - 4]);
    expect(r.actions).toEqual([{ type: 'survol', point: { x: 1, y: 3 }, noeud: 'N1' }]);
  });
});

describe('machine a etats : clavier', () => {
  const t = (cle: string, o: Partial<{ ctrl: boolean; maj: boolean; dansChamp: boolean }> = {}) => ({ cle, ctrl: false, maj: false, dansChamp: false, ...o });
  const choisi: EtatEditeur = { ...ETAT_EDITEUR_INITIAL, selection: { type: 'noeud', id: 'N2' } };

  it('Suppr supprime la selection, puis la vide', () => {
    const r = surTouche(choisi, t('Delete'));
    expect(r.actions).toEqual([{ type: 'supprimer', selection: { type: 'noeud', id: 'N2' } }]);
    expect(r.etat.selection).toBeNull();
    expect(r.gere).toBe(true);
    expect(surTouche(ETAT_EDITEUR_INITIAL, t('Delete')).actions).toEqual([]);
  });

  it('Ctrl+Z annule ; Ctrl+Y et Ctrl+Maj+Z retablissent (majuscules comprises)', () => {
    expect(surTouche(ETAT_EDITEUR_INITIAL, t('z', { ctrl: true })).actions).toEqual([{ type: 'annuler' }]);
    expect(surTouche(ETAT_EDITEUR_INITIAL, t('y', { ctrl: true })).actions).toEqual([{ type: 'retablir' }]);
    expect(surTouche(ETAT_EDITEUR_INITIAL, t('Z', { ctrl: true, maj: true })).actions).toEqual([{ type: 'retablir' }]);
    expect(surTouche(ETAT_EDITEUR_INITIAL, t('z', { ctrl: true })).gere).toBe(true);
  });

  it('dans un champ de saisie, le clavier est laisse au champ', () => {
    for (const touche of [t('Delete', { dansChamp: true }), t('z', { ctrl: true, dansChamp: true })]) {
      const r = surTouche(choisi, touche);
      expect(r.actions).toEqual([]);
      expect(r.gere).toBe(false);
      expect(r.etat).toBe(choisi);
    }
  });

  it('les autres touches ne font rien', () => {
    const r = surTouche(choisi, t('a'));
    expect(r).toEqual({ etat: choisi, actions: [], gere: false });
  });
});
