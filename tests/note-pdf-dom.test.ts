// @vitest-environment jsdom
/** Note PDF : figure autonome (DOM) et mise en page des titres et valeurs longues. */
import { describe, expect, it } from 'vitest';

import { definitionNotePdf, svgPourPdf, type NoteDeCalcul } from '../src/index';

describe('note PDF, mise en page', () => {
  it('svgPourPdf garde les traces visibles (regression : figures vides)', () => {
    const s = svgPourPdf('<svg viewBox="0 0 10 10"><circle class="a" cx="5" cy="5" r="2"/></svg>', '.a { fill: rgb(255, 0, 0); }');
    expect(s).toContain('<circle');
    expect(s).not.toContain('display="none"');
    expect(s).not.toContain('class=');
  });

  const note = (valeur: string): NoteDeCalcul => ({
    cartouche: { projet: 'P', element: 'E', date: '2026-11-19', norme: 'EN', outil: 'o', version: '1' },
    sections: { hypotheses: [{ type: 'bloc', bloc: { titre: 'Bloc', lignes: [{ symbole: '', libelle: 'gamma_C', valeur }], note: null } }] },
    verifications: [],
  });

  it('titre de section lie a son premier bloc, insecable', () => {
    const c = definitionNotePdf(note('1,5')).content as { stack?: unknown[]; unbreakable?: boolean }[];
    const titre = c.find((x) => JSON.stringify(x).includes('1. Hypothèses'));
    expect(titre?.unbreakable).toBe(true);
    expect(JSON.stringify(titre?.stack?.[2])).toContain('Bloc');
  });

  it('valeur longue : retour a la ligne permis ; courte : sur une ligne', () => {
    const longue = JSON.stringify(definitionNotePdf(note('1,5 (ILNAS-EN 1992-1-1/AN-LU:2020, tableau 2.1N)')).content);
    expect(longue).toContain('"noWrap":false');
    expect(JSON.stringify(definitionNotePdf(note('1,5')).content)).toContain('"noWrap":true');
  });
});
