import { describe, expect, it } from 'vitest';
import { libelleDepuisPage } from '../src/feuilles-dom';

/** Page reduite a ce que lit la fonction : pas besoin de jsdom. */
const page = (span: string | null, aria: string | null) => {
  const champ = {
    closest: () => (span === null ? null : { querySelector: () => ({ textContent: span }) }),
    getAttribute: () => aria,
  };
  const demande: string[] = [];
  const querySelector = (s: string) => {
    demande.push(s);
    return s.includes('absent') ? null : champ;
  };
  return { demande, querySelector } as unknown as Document & { demande: string[] };
};

describe('libelleDepuisPage', () => {
  it('cherche la derniere cle du chemin', () => {
    const d = page('Largeur B (m)', null);
    expect(libelleDepuisPage('semelle/B', d)).toBe('Largeur B (m)');
    expect(d.demande[0]).toBe('[data-champ="B"],[data-fixe="B"]');
  });
  it('resserre les espaces du label', () => {
    expect(libelleDepuisPage('x', page('  V\n   Ed (kN) ', null))).toBe('V Ed (kN)');
  });
  it('se rabat sur aria-label', () => {
    expect(libelleDepuisPage('x', page(null, 'direction'))).toBe('direction');
  });
  it('nomme une liste par la legende de son cadre', () => {
    const cadre = { querySelector: () => ({ textContent: ' Charges ' }) };
    const d = {
      querySelector: (s: string) => (s.includes('data-liste') ? { closest: () => cadre } : null),
    } as unknown as Document;
    expect(libelleDepuisPage('charges', d)).toBe('Charges');
  });
  it('rend une chaine vide si le champ n est pas a l ecran', () => {
    expect(libelleDepuisPage('absent', page('x', null))).toBe('');
  });
});
