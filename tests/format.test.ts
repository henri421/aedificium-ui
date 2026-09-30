import { describe, expect, it } from 'vitest';

import { echapper, lireNombre, nombreFr, tauxFr } from '../src/index';

describe('echapper', () => {
  it('neutralise les caracteres HTML', () => {
    expect(echapper('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
  });
});

describe('nombreFr', () => {
  it('virgule decimale', () => {
    expect(nombreFr(3.14159, 2)).toBe('3,14');
    expect(nombreFr(1200, 0)).toBe('1200');
  });
  it('ni NaN ni infini a l ecran', () => {
    expect(nombreFr(Number.NaN, 2)).toBe('—');
    expect(nombreFr(Infinity, 2)).toBe('—');
  });
  it('pas de -0', () => {
    expect(nombreFr(-0.0001, 2)).toBe('0,00');
    expect(nombreFr(-0.01, 2)).toBe('-0,01');
  });
});

describe('lireNombre', () => {
  it('virgule ou point, espaces toleres', () => {
    expect(lireNombre(' 12,5 ')).toBe(12.5);
    expect(lireNombre('12.5')).toBe(12.5);
  });
  it('vide, texte ou infini : null', () => {
    expect(lireNombre('')).toBeNull();
    expect(lireNombre('abc')).toBeNull();
    expect(lireNombre('Infinity')).toBeNull();
  });
});

describe('tauxFr — arrondi vers le verdict', () => {
  it('par defaut sous 1, par exces au-dessus', () => {
    expect(tauxFr(0.9996)).toBe('0,999');
    expect(tauxFr(1.0004)).toBe('1,001');
    expect(tauxFr(1)).toBe('1,000');
    expect(tauxFr(0.999, 2)).toBe('0,99');
    expect(tauxFr(1.001, 2)).toBe('1,01');
  });
  it('hors domaine', () => {
    expect(tauxFr(Number.NaN)).toBe('hors domaine');
  });
});
