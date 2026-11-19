/** Note de calcul en PDF : definition pdfmake (pure), sans navigateur. */
import { describe, expect, it } from 'vitest';

import { definitionNotePdf, textePdf, type NoteDeCalcul } from '../src/index';

const note = (): NoteDeCalcul => ({
  cartouche: { projet: '', element: 'Poteau P1', date: '2026-11-19', norme: 'EN 1992-1-1:2004', outil: 'colonne-ec2', version: '0.3.0' },
  sections: {
    hypotheses: [{ type: 'liste', items: ['gamma_C = 1,5'] }],
    calculs: [{ type: 'etape', formule: 'N_Rd = A_c f_cd', substituee: '0,16 × 20', resultat: '3,2 MN', clause: '6.1' }, { type: 'figure', svg: '<svg/>' }],
  },
  verifications: [{ nom: 'Compression', taux: 0.62, ok: true }, { nom: 'Flexion', taux: 1.1, ok: false }],
  avertissements: ['Annexe presumee.'],
});

const texte = (x: unknown): string => JSON.stringify(x);

describe('note PDF', () => {
  it('A4, metadonnees, en-tete absent en page 1, pied « Page x / y »', () => {
    const d = definitionNotePdf(note());
    expect(d.pageSize).toBe('A4');
    expect(d.info.title).toContain('Poteau P1');
    expect(d.header(1, 3)).toBe('');
    expect(texte(d.header(2, 3))).toContain('colonne-ec2 0.3.0');
    expect(texte(d.footer(2, 3))).toContain('Page 2 / 3');
  });

  it('cartouche : champ vide rendu par un tiret ; sections numerotees dans l ordre', () => {
    const t = texte(definitionNotePdf(note()).content);
    expect(t).toContain('—');
    expect(t.indexOf('1. Hypothèses')).toBeLessThan(t.indexOf('2. Calculs et vérifications'));
    expect(t.indexOf('2. Calculs')).toBeLessThan(t.indexOf('3. Conclusions'));
  });

  it('notation : indices en sub, grecques converties', () => {
    expect(texte(textePdf('gamma_C'))).toBe(texte({ text: [{ text: 'γ' }, { text: 'C', sub: true }] }));
  });

  it('figure sans version autonome omise ; verdicts colores, determinante citee', () => {
    const t = texte(definitionNotePdf(note()).content);
    expect(t).not.toContain('"svg"');
    expect(t).toContain('non satisfaite');
    expect(t).toContain('Vérification déterminante');
    expect(texte(definitionNotePdf(note(), () => '<svg viewBox="0 0 100 50"/>').content)).toContain('"svg"');
  });
});
