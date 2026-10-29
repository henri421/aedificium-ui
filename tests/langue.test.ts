import { afterEach, describe, expect, it } from 'vitest';

import {
  constatsAffichage,
  csv,
  definirLangue,
  langueCourante,
  langueDuDocument,
  lienDeLangue,
  nombreAffiche,
  nombreFr,
  noteDeCalculHtml,
  resultatsEnCsv,
  tauxAffiche,
  tauxFr,
  texteVisible,
  traducteur,
} from '../src/index';

afterEach(() => definirLangue('fr'));

const note = {
  cartouche: { projet: 'P', element: 'E', date: '2026-10-29', norme: 'EN 1992-1-1', outil: 'x' },
  sections: { geometrie: [{ type: 'texte' as const, texte: 'b = 300 mm' }] },
  verifications: [{ nom: 'Shear', taux: 0.81, ok: true, clause: '6.2.5' }],
};

describe('langue courante', () => {
  it('francais par defaut, anglais sur <html lang="en">', () => {
    expect(langueCourante()).toBe('fr');
    expect(langueDuDocument({ documentElement: { lang: 'en' } })).toBe('en');
    expect(langueDuDocument({ documentElement: { lang: 'en-GB' } })).toBe('en');
    expect(langueDuDocument({ documentElement: { lang: 'fr' } })).toBe('fr');
    expect(langueDuDocument({ documentElement: { lang: '' } })).toBe('fr');
  });

  it('lien vers l autre version', () => {
    expect(lienDeLangue('fr')).toContain('href="en/"');
    expect(lienDeLangue('fr')).toContain('>EN<');
    expect(lienDeLangue('en')).toContain('href="../"');
    expect(lienDeLangue('en')).toContain('>FR<');
  });
});

describe('nombres en anglais', () => {
  it('point decimal, memes regles d arrondi', () => {
    definirLangue('en');
    expect(nombreFr(3.14159, 2)).toBe('3.14');
    expect(nombreFr(-0.0001, 2)).toBe('0.00');
    expect(nombreAffiche(1.2)).toBe('1.2');
    expect(nombreAffiche(1200)).toBe('1200');
    expect(nombreAffiche(2)).toBe('2');
    expect(tauxAffiche(0.9996)).toBe('0.999');
    expect(tauxFr(Number.NaN)).toBe('out of range');
  });

  it('le francais reste inchange', () => {
    expect(nombreAffiche(1.2)).toBe('1,2');
    expect(nombreAffiche(1200)).toBe('1200');
    expect(tauxAffiche(1.0004)).toBe('1,001');
  });
});

describe('CSV en anglais', () => {
  it('virgule en separateur, en-tetes anglais', () => {
    definirLangue('en');
    const t = resultatsEnCsv([{ titre: 'B', lignes: [{ symbole: 'x', libelle: 'a, b', valeur: '1.5' }], note: null }]);
    expect(t).toContain('Block,Symbol,Quantity,Value');
    expect(t).toContain('B,x,"a, b",1.5');
  });

  it('en francais, la virgule decimale n est pas citee', () => {
    expect(csv([['1,5', 'a;b']])).toContain('1,5;"a;b"');
  });
});

describe('note en anglais', () => {
  it('titres, cartouche et conclusions en anglais', () => {
    definirLangue('en');
    const h = noteDeCalculHtml(note);
    expect(h).toContain('<html lang="en">');
    for (const m of ['Calculation note', 'Project: P', 'Element: E', '1. Geometry', 'Governing check: Shear (ratio 0.81)', 'satisfied'])
      expect(h).toContain(m);
    expect(constatsAffichage(texteVisible(h), { langue: 'en' })).toEqual([]);
  });

  it('en francais, inchangee', () => {
    const h = noteDeCalculHtml(note);
    expect(h).toContain('<html lang="fr">');
    expect(h).toContain('Vérification déterminante : Shear (taux 0,81)');
  });
});

describe('traducteur', () => {
  const t = traducteur({ 'résistance': 'resistance' }, [[/^alpha = (.+) degrés hors de la plage$/, 'alpha = $1 degrees out of range']]);

  it('ne touche a rien en francais', () => {
    expect(t('résistance')).toBe('résistance');
  });

  it('phrase exacte, puis regle, puis point decimal', () => {
    definirLangue('en');
    expect(t('résistance')).toBe('resistance');
    expect(t('alpha = 30,5 degrés hors de la plage')).toBe('alpha = 30.5 degrees out of range');
    expect(t('inconnue, 0,6')).toBe('inconnue, 0.6');
  });
});

describe('controle en anglais', () => {
  const c = (s: string) => constatsAffichage(s, { langue: 'en' });

  it('texte anglais propre', () => {
    expect(c('Shear at the interface, v = 0.81 MPa (6.2.5). Ratio 1.2')).toEqual([]);
  });

  it('restes de francais signales', () => {
    expect(c('Shear résistance')).toHaveLength(1);
    expect(c('Shear de la interface')).toHaveLength(1);
    expect(c('v = 0,81')).toHaveLength(1);
    expect(c('f_ck')).toHaveLength(1);
  });

  it('mots admis', () => {
    expect(constatsAffichage('Barré de Saint-Venant', { langue: 'en', motsAdmis: ['é', 'de'] })).toEqual([]);
  });
});
