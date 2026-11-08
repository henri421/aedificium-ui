import { describe, expect, it } from 'vitest';
import { verdictDepuisPage } from '../src/feuilles-dom';
import {
  ajouterCalcul,
  ajouterElement,
  creerProjet,
  definirStatut,
  definirVerdict,
  dupliquerFeuille,
  ecrireFeuille,
  trouverCalcul,
  verdictDeFeuille,
  verdictDuCalcul,
} from '../src/projets';

const el = (classes: string[], texte = '', cache = false) => ({
  classList: classes,
  textContent: texte,
  closest: () => (cache ? {} : null),
});
const page = (verdicts: ReturnType<typeof el>[], alarmes: ReturnType<typeof el>[] = []) =>
  ({ querySelectorAll: (s: string) => (s === '.verdict' ? verdicts : alarmes) }) as unknown as Document;

describe('verdictDepuisPage', () => {
  it('rend le pire des verdicts', () => {
    expect(verdictDepuisPage(page([el(['verdict']), el(['verdict', 'depasse'])]))).toBe('ko');
    expect(verdictDepuisPage(page([el(['verdict', 'verdict-conforme'])]))).toBe('ok');
    expect(verdictDepuisPage(page([el(['verdict', 'ok']), el(['verdict', 'verdict-incomplet'])]))).toBe('alerte');
  });
  it('une classe inconnue n est jamais un succes', () => {
    expect(verdictDepuisPage(page([el(['verdict', 'verdict-nouveau'])]))).toBe('alerte');
  });
  it('ignore les constats et ce qui est cache', () => {
    expect(verdictDepuisPage(page([el(['verdict', 'constat'])]))).toBeNull();
    expect(verdictDepuisPage(page([el(['verdict', 'depasse'], '', true)]))).toBeNull();
  });
  it('une erreur visible annule le verdict : l ecran montre un ancien resultat', () => {
    expect(verdictDepuisPage(page([el(['verdict', 'ok'])], [el(['erreur'], 'Valeur illisible')]))).toBeNull();
    expect(verdictDepuisPage(page([el(['verdict', 'ok'])], [el(['erreur'], '  ')]))).toBe('ok');
  });
});

describe('verdict des feuilles', () => {
  const calcul = () => {
    const p = creerProjet('P');
    const e = ajouterElement(p, null, 'E');
    const c = ajouterCalcul(p, e.id, { app: 'a', adresse: 'u', nom: 'n' }, { h: 1 });
    return trouverCalcul(p, c.id)!.calcul;
  };
  it('devient perime quand l origine change, pour l heritiere', () => {
    const c = calcul();
    const f1 = c.feuilles[0].id;
    const f2 = dupliquerFeuille(c, f1).id;
    definirVerdict(c, f1, 'ok');
    definirVerdict(c, f2, 'ok');
    expect(verdictDeFeuille(c, f2)).toBe('ok');
    ecrireFeuille(c, f1, { h: 2 });
    expect(verdictDeFeuille(c, f2)).toBe('perime');
    expect(verdictDeFeuille(c, f1)).toBe('perime');
  });
  it('le calcul prend le pire verdict des feuilles a justifier', () => {
    const c = calcul();
    const f1 = c.feuilles[0].id;
    const f2 = dupliquerFeuille(c, f1).id;
    definirVerdict(c, f1, 'ok');
    definirVerdict(c, f2, 'ko');
    expect(verdictDuCalcul(c)).toBe('ko');
    definirStatut(c, f2, 'etude');
    expect(verdictDuCalcul(c)).toBe('ok');
  });
});
