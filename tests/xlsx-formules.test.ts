/**
 * Tests d'acceptation de l'evaluateur de formules (fiche 11.3, S3 ; tache T2).
 * L'evaluateur sert le test de concordance de chaque app : l'Excel doit dire
 * la meme chose que le noyau.
 */

import { describe, expect, it } from 'vitest';

import { ecartsDeConcordance, evaluerFormuleXlsx, type ClasseurCalcul } from '../src/index';
import { classeurExemple } from './outils/classeur-exemple';

const ev = (f: string, v: Record<string, number> = {}): number =>
  evaluerFormuleXlsx(f, (n) => {
    if (!(n in v)) throw new Error(`nom inconnu ${n}`);
    return v[n];
  });

describe('evaluerFormuleXlsx', () => {
  it('operations et priorites d Excel', () => {
    expect(ev('1+2*3')).toBe(7);
    expect(ev('(1+2)*3')).toBe(9);
    expect(ev('2^3^2')).toBe(64); // Excel : de gauche a droite
    expect(ev('-2^2')).toBe(4); // Excel : le moins unaire avant la puissance
    expect(ev('0-2^2')).toBe(-4);
    expect(ev('10/4')).toBe(2.5);
    expect(ev('1.5E-3*1000')).toBeCloseTo(1.5, 12);
    expect(ev('50%')).toBe(0.5);
    expect(ev('+3')).toBe(3);
  });
  it('comparaisons : 1 ou 0', () => {
    expect(ev('1<2')).toBe(1);
    expect(ev('2<=1')).toBe(0);
    expect(ev('3>=3')).toBe(1);
    expect(ev('3<>3')).toBe(0);
    expect(ev('3=3')).toBe(1);
    expect(ev('1+1>1')).toBe(1);
  });
  it('noms definis', () => {
    expect(ev('alpha_cc*f_ck/gamma_C', { alpha_cc: 1, f_ck: 30, gamma_C: 1.5 })).toBe(20);
  });
  it('fonctions permises', () => {
    expect(ev('SQRT(16)')).toBe(4);
    expect(ev('MIN(3,1,2)')).toBe(1);
    expect(ev('MAX(3,1,2)')).toBe(3);
    expect(ev('ABS(-2)')).toBe(2);
    expect(ev('PI()')).toBeCloseTo(Math.PI, 15);
    expect(ev('LN(EXP(2))')).toBeCloseTo(2, 14);
    expect(ev('POWER(27,1/3)')).toBeCloseTo(3, 14);
    expect(ev('SIN(RADIANS(90))')).toBeCloseTo(1, 15);
    expect(ev('COS(RADIANS(60))')).toBeCloseTo(0.5, 15);
    expect(ev('TAN(RADIANS(45))')).toBeCloseTo(1, 15);
    expect(ev('if(1>0,2,3)')).toBe(2);
  });
  it('arrondis du taux comme Excel (15 chiffres significatifs)', () => {
    expect(ev('ROUNDDOWN(0.9729,3)')).toBe(0.972);
    expect(ev('ROUNDUP(2.3857,3)')).toBe(2.386);
    expect(ev('ROUNDUP(1.0004,3)')).toBe(1.001);
    expect(ev('ROUNDDOWN(0.9996,3)')).toBe(0.999);
    expect(ev('ROUNDUP(0.3*3,1)')).toBe(0.9); // 0,8999999999999999 en binaire, 0,9 pour Excel
    expect(ev('ROUNDDOWN(-1.25,1)')).toBe(-1.2);
    expect(ev('ROUNDUP(-1.21,1)')).toBe(-1.3);
  });
  it('IF n evalue que la branche retenue', () => {
    expect(ev('IF(1,5,1/0)')).toBe(5);
    expect(() => ev('IF(0,5,1/0)')).toThrow(/division par zero/i);
  });
  it('refuse une fonction hors liste, une chaine, un renvoi de cellule', () => {
    expect(() => ev('VLOOKUP(1,2,3)')).toThrow(/VLOOKUP/);
    expect(() => ev('IF(1,"a","b")')).toThrow();
    expect(() => ev('Feuil2!A1')).toThrow();
  });
  it('refuse une formule mal formee', () => {
    expect(() => ev('1+')).toThrow();
    expect(() => ev('(1+2')).toThrow();
    expect(() => ev('1 2')).toThrow();
    expect(() => ev('MIN()')).toThrow();
  });
  it('resultat non fini refuse (Excel afficherait une erreur)', () => {
    expect(() => ev('SQRT(-1)')).toThrow();
    expect(() => ev('LN(0)')).toThrow();
  });
});

describe('ecartsDeConcordance', () => {
  it('l exemple concorde : chaque formule redonne la valeur du noyau', () => {
    expect(ecartsDeConcordance(classeurExemple())).toEqual([]);
    expect(ecartsDeConcordance(classeurExemple(500))).toEqual([]);
  });
  it('une formule fausse est signalee, avec le nom, l attendu et l obtenu', () => {
    const c = classeurExemple();
    const fausse: ClasseurCalcul = {
      ...c,
      calcul: c.calcul.map((g) => ({ ...g, lignes: g.lignes.map((l) => (l.nom === 'f_cd' ? { ...l, formule: 'f_ck/gamma_C/alpha_cc*0.85' } : l)) })),
    };
    const e = ecartsDeConcordance(fausse);
    const fcd = e.find((x) => x.nom === 'f_cd');
    expect(fcd?.attendu).toBe(20);
    expect(fcd?.obtenu).toBeCloseTo(17, 12);
    // l'ecart se propage : le plafond et la resistance en dependent
    expect(e.some((x) => x.nom === 't_plaf')).toBe(true);
  });
  it('une valeur en cache fausse est signalee', () => {
    const c = classeurExemple();
    const g = c.calcul[0];
    const faux: ClasseurCalcul = { ...c, calcul: [{ ...g, lignes: [{ ...g.lignes[0], valeur: 2.6 }] }, ...c.calcul.slice(1)] };
    expect(ecartsDeConcordance(faux).map((x) => x.nom)).toContain('v_Edi');
  });
  it('controle aussi la sollicitation et la resistance des verifications', () => {
    const c = classeurExemple();
    const v = { ...c.verifications[0], valeurResistance: 3 };
    const e = ecartsDeConcordance({ ...c, verifications: [v] });
    expect(e.map((x) => x.nom)).toContain('Cisaillement à l’interface (résistance)');
  });
  it('tolerance relative de 1e-9', () => {
    const c = classeurExemple();
    const g = c.calcul[1];
    const proche = g.lignes.map((l) => (l.nom === 'f_cd' ? { ...l, valeur: 20 * (1 + 1e-12) } : l));
    expect(ecartsDeConcordance({ ...c, calcul: [c.calcul[0], { ...g, lignes: proche }] })).toEqual([]);
  });
  it('une formule circulaire est refusee', () => {
    const c = classeurExemple();
    const g = c.calcul[1];
    const boucle = g.lignes.map((l) => (l.nom === 'f_ctm' ? { ...l, formule: 'f_ctd*2' } : l));
    expect(() => ecartsDeConcordance({ ...c, calcul: [c.calcul[0], { ...g, lignes: boucle }] })).toThrow(/circulaire/);
  });
});
