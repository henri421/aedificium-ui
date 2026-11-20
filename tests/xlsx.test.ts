import { describe, expect, it } from 'vitest';

import { colonneXlsx, crc32, lireZipSansCompression, zipSansCompression } from '../src/index';

describe('crc32', () => {
  it('valeur de reference du format ZIP', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array(0))).toBe(0);
  });
});

describe('zipSansCompression / lireZipSansCompression', () => {
  it('aller-retour, accents compris', () => {
    const fichiers = [
      { nom: 'a.xml', contenu: '<a>é ç € μ</a>' },
      { nom: 'xl/b.xml', contenu: '' },
    ];
    const octets = zipSansCompression(fichiers);
    expect(octets[0]).toBe(0x50);
    expect(octets[1]).toBe(0x4b);
    const lu = lireZipSansCompression(octets);
    expect([...lu.keys()]).toEqual(['a.xml', 'xl/b.xml']);
    expect(lu.get('a.xml')).toBe('<a>é ç € μ</a>');
    expect(lu.get('xl/b.xml')).toBe('');
  });
  it('refuse une archive abimee (CRC faux)', () => {
    const octets = zipSansCompression([{ nom: 'a.xml', contenu: 'abc' }]);
    const abime = octets.slice();
    abime[30 + 'a.xml'.length] ^= 0xff; // premier octet des donnees
    expect(() => lireZipSansCompression(abime)).toThrow(/CRC/);
  });
});

describe('colonneXlsx', () => {
  it('lettres de colonne', () => {
    expect(colonneXlsx(0)).toBe('A');
    expect(colonneXlsx(5)).toBe('F');
    expect(colonneXlsx(25)).toBe('Z');
    expect(colonneXlsx(26)).toBe('AA');
  });
});
