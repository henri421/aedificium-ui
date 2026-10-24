import { describe, expect, it } from 'vitest';

import { nombreAffiche, tauxAffiche } from '../src/index';

describe('nombreAffiche — 3 decimales au plus, sans zeros inutiles', () => {
  it('zeros de fin retires', () => {
    expect(nombreAffiche(1.2)).toBe('1,2');
    expect(nombreAffiche(1.25)).toBe('1,25');
    expect(nombreAffiche(2.5, 3)).toBe('2,5');
    expect(nombreAffiche(0.7)).toBe('0,7');
  });
  it('un entier reste sans virgule', () => {
    expect(nombreAffiche(0)).toBe('0');
    expect(nombreAffiche(1200)).toBe('1200');
    expect(nombreAffiche(3)).toBe('3');
    expect(nombreAffiche(561.0000001)).toBe('561');
  });
  it('arrondi a 3 decimales par defaut', () => {
    expect(nombreAffiche(3.14159)).toBe('3,142');
    expect(nombreAffiche(0.12345)).toBe('0,123');
    expect(nombreAffiche(12345.6789)).toBe('12345,679');
  });
  it('nombre de decimales maximal reglable', () => {
    expect(nombreAffiche(12.04, 1)).toBe('12');
    expect(nombreAffiche(12.06, 1)).toBe('12,1');
    expect(nombreAffiche(560.6, 0)).toBe('561');
    expect(nombreAffiche(2.256, 2)).toBe('2,26');
  });
  it('pas de -0', () => {
    expect(nombreAffiche(-0.0004)).toBe('0');
    expect(nombreAffiche(-0)).toBe('0');
    expect(nombreAffiche(-0.04, 1)).toBe('0');
  });
  it('negatifs', () => {
    expect(nombreAffiche(-2.5)).toBe('-2,5');
    expect(nombreAffiche(-1200)).toBe('-1200');
  });
  it('ni NaN ni infini a l ecran', () => {
    expect(nombreAffiche(Number.NaN)).toBe('—');
    expect(nombreAffiche(Infinity)).toBe('—');
    expect(nombreAffiche(-Infinity)).toBe('—');
  });
});

describe('tauxAffiche — arrondi vers le verdict, sans zeros inutiles', () => {
  it('par defaut sous 1, par exces au-dessus', () => {
    expect(tauxAffiche(0.9996)).toBe('0,999');
    expect(tauxAffiche(1.0004)).toBe('1,001');
    expect(tauxAffiche(1.0000001)).toBe('1,001');
  });
  it('egalite exacte et zeros inutiles', () => {
    expect(tauxAffiche(1)).toBe('1');
    expect(tauxAffiche(0.95)).toBe('0,95');
    expect(tauxAffiche(0.5)).toBe('0,5');
    expect(tauxAffiche(0)).toBe('0');
    expect(tauxAffiche(2)).toBe('2');
  });
  it('hors domaine', () => {
    expect(tauxAffiche(Number.NaN)).toBe('hors domaine');
    expect(tauxAffiche(Infinity)).toBe('hors domaine');
  });
});
