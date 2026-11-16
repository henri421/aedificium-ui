// Cartouche tire du projet ouvert (audit I15).
import { describe, expect, it } from 'vitest';
import { ajouterCalcul, ajouterElement, creerProjet, dupliquerFeuille, renommer } from '../src/projets';
import { cartoucheDuProjet } from '../src/cartouche-projet';

describe('cartoucheDuProjet', () => {
  it('nom du projet et repere de l element', () => {
    const p = creerProjet('Immeuble rue X');
    const e = ajouterElement(p, null, 'M1');
    const c = ajouterCalcul(p, e.id, { app: 'mur-en-l', adresse: '', nom: '' }, { h: '2' });
    expect(cartoucheDuProjet(p, c.id, c.feuilles[0].id)).toEqual({ projet: 'Immeuble rue X', element: 'M1' });
  });

  it('plusieurs feuilles : le nom de la feuille suit le repere', () => {
    const p = creerProjet('P');
    const e = ajouterElement(p, null, 'M1');
    const c = ajouterCalcul(p, e.id, { app: 'mur-en-l', adresse: '', nom: '' }, { h: '2' }, 'Feuille 1');
    const f2 = dupliquerFeuille(c, c.feuilles[0].id);
    expect(cartoucheDuProjet(p, c.id, f2.id)?.element).toBe(`M1 · ${f2.nom}`);
    renommer(p, e.id, 'M2');
    expect(cartoucheDuProjet(p, c.id, c.feuilles[0].id)?.element).toBe('M2 · Feuille 1');
  });

  it('calcul introuvable : null', () => {
    expect(cartoucheDuProjet(creerProjet('P'), 'inconnu', 'x')).toBeNull();
  });
});
