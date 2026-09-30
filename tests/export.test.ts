// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { JETONS, csv, ouvrirOuTelecharger, resultatsEnCsv, svgAutonome, telecharger, valeursDesJetons } from '../src/index';

describe('svgAutonome', () => {
  it('ajoute l espace de noms et les styles en CDATA', () => {
    const s = svgAutonome('<p>x</p><svg viewBox="0 0 1 1"><rect/></svg><p>y</p>', '.a { fill: red; }');
    expect(s.startsWith('<?xml')).toBe(true);
    expect(s).toMatch(/<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 1 1">/);
    expect(s).toMatch(/<!\[CDATA\[\n\.a \{ fill: red; \}\n\]\]>/);
    expect(s).not.toMatch(/<p>/);
  });
  it('ne double pas un espace de noms present', () => {
    const s = svgAutonome('<svg xmlns="http://www.w3.org/2000/svg"></svg>', '');
    expect(s.match(/xmlns=/g)).toHaveLength(1);
  });
  it('sans SVG : un document vide mais valide', () => {
    expect(svgAutonome('rien', '')).toMatch(/<svg xmlns="http:\/\/www.w3.org\/2000\/svg">.*<\/svg>$/s);
  });
});

describe('csv', () => {
  it('BOM, point-virgule, CRLF, guillemets', () => {
    const t = csv([['a', 'b;c'], ['d"e', 'f']]);
    expect(t.charCodeAt(0)).toBe(0xfeff);
    expect(t.slice(1)).toBe('a;"b;c"\r\n"d""e";f\r\n');
  });
  it('resultatsEnCsv : aucun bloc omis, le motif sort meme sans ligne', () => {
    const t = resultatsEnCsv([
      { titre: 'A', lignes: [{ symbole: 'x', libelle: 'lx', valeur: '1' }], note: null },
      { titre: 'B', lignes: [], note: 'sans objet' },
    ]);
    expect(t.slice(1).split('\r\n')).toEqual(['Bloc;Symbole;Grandeur;Valeur', 'A;x;lx;1', 'B;;sans objet;', '']);
  });
});

describe('valeursDesJetons', () => {
  it('lit les jetons, commentaires ignores', () => {
    const v = valeursDesJetons(':root { --a: #fff; /* --b: 1; */ --c: 2px; }');
    expect([...v.keys()]).toEqual(['--a', '--c']);
  });
  it('JETONS porte les deux couleurs de sens de la suite', () => {
    const v = valeursDesJetons(JETONS);
    expect(v.get('--compression')).toBe('#2f5d8a');
    expect(v.get('--traction')).toBe('#a8442a');
  });
});

describe('navigateur', () => {
  afterEach(() => vi.restoreAllMocks());

  function preparer() {
    const creer = vi.fn(() => 'blob:x');
    const liberer = vi.fn();
    Object.assign(URL, { createObjectURL: creer, revokeObjectURL: liberer });
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    return { creer, liberer, clic };
  }

  it('telecharger : lien temporaire retire, URL liberee', () => {
    const { creer, liberer, clic } = preparer();
    telecharger('a.txt', 'x', 'text/plain');
    expect(clic).toHaveBeenCalledOnce();
    expect(creer).toHaveBeenCalledOnce();
    expect(liberer).toHaveBeenCalledOnce();
    expect(document.querySelectorAll('a')).toHaveLength(0);
  });

  it('ouvrirOuTelecharger : onglet bloque -> telechargement', () => {
    const { clic } = preparer();
    vi.spyOn(window, 'open').mockReturnValue(null);
    expect(ouvrirOuTelecharger('n.html', '<p>x</p>')).toBe(false);
    expect(clic).toHaveBeenCalledOnce();
  });

  it('ouvrirOuTelecharger : onglet ouvert -> ecrit dedans', () => {
    preparer();
    const ecrit = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({ document: { write: ecrit, close: vi.fn() } } as unknown as Window);
    expect(ouvrirOuTelecharger('n.html', '<p>x</p>')).toBe(true);
    expect(ecrit).toHaveBeenCalledWith('<p>x</p>');
  });
});
