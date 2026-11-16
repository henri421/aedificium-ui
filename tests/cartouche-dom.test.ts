// @vitest-environment jsdom
// Champs de cartouche remplis depuis le projet ouvert (audit I15).
import { describe, expect, it } from 'vitest';
import { remplirCartouche } from '../src/index';

describe('remplirCartouche', () => {
  it('remplit les champs projet et element et emet input', () => {
    document.body.innerHTML = '<input data-role="projet" value="ancien"><input data-role="element">';
    const vus: string[] = [];
    document.addEventListener('input', (e) => vus.push((e.target as HTMLInputElement).dataset.role ?? ''));
    remplirCartouche(document, { projet: 'Immeuble', element: 'M1' });
    expect(document.querySelector<HTMLInputElement>('[data-role="projet"]')?.value).toBe('Immeuble');
    expect(document.querySelector<HTMLInputElement>('[data-role="element"]')?.value).toBe('M1');
    expect(vus).toEqual(['projet', 'element']);
  });

  it('sans champs de cartouche, ne fait rien', () => {
    document.body.innerHTML = '<p></p>';
    expect(() => remplirCartouche(document, { projet: 'P', element: 'E' })).not.toThrow();
  });
});
