// Annexe nationale luxembourgeoise (audit R4, lot E) : valeurs preremplies, presumees tant
// que l'annexe ILNAS n'a pas ete lue, et modifiables par l'utilisateur dans chaque outil.
import { afterEach, describe, expect, it } from 'vitest';
import {
  AN_LU,
  ANNEXE_LU_VERIFIEE,
  ANNEXES_NATIONALES,
  avertissementAnnexeLu,
  definirLangue,
  libelleAnnexe,
  lireAnnexe,
  optionsAnnexe,
  sourceLu,
  traduireSource,
  valeurLu,
} from '../src/index';

describe('annexes nationales', () => {
  afterEach(() => definirLangue('fr'));

  it('deux choix : valeurs recommandees et Luxembourg', () => {
    expect(ANNEXES_NATIONALES).toEqual(['recommande', 'lu']);
    expect(libelleAnnexe('recommande')).toBe('Valeurs recommandées');
    expect(libelleAnnexe('lu')).toMatch(/^Luxembourg/);
    definirLangue('en');
    expect(libelleAnnexe('recommande')).toBe('Recommended values');
    expect(libelleAnnexe('lu')).toMatch(/^Luxembourg/);
  });

  it('lecture tolerante d un fichier enregistre : tout sauf lu donne recommande', () => {
    expect(lireAnnexe('lu')).toBe('lu');
    expect(lireAnnexe('recommande')).toBe('recommande');
    expect(lireAnnexe(undefined)).toBe('recommande');
    expect(lireAnnexe('be')).toBe('recommande');
  });

  it('options du selecteur, choix courant marque', () => {
    const html = optionsAnnexe('lu');
    expect(html).toContain('<option value="recommande">');
    expect(html).toMatch(/<option value="lu" selected>Luxembourg/);
  });

  it('source luxembourgeoise : partie, clause, et mention non verifiee', () => {
    expect(sourceLu('EN 1992-1-1', '3.1.6(1)P', false)).toBe(
      'ILNAS-EN 1992-1-1/AN-LU:2020, 3.1.6(1)P : valeur présumée, non vérifiée sur l’annexe',
    );
    expect(sourceLu('EN 1992-1-1', 'tableau 2.1N', true)).toBe(
      'ILNAS-EN 1992-1-1/AN-LU:2020, tableau 2.1N : valeur recommandée présumée retenue, non vérifiée sur l’annexe',
    );
  });

  it('alpha_cc = 0,85 au Luxembourg (donne par l utilisateur, a verifier)', () => {
    expect(AN_LU['EN 1992-1-1'].alpha_cc).toEqual({ valeur: 0.85, clause: '3.1.6(1)P' });
    expect(ANNEXE_LU_VERIFIEE).toBe(false);
  });

  it('valeurLu : ecart connu applique, sinon valeur recommandee reprise avec source LU', () => {
    const rec = { valeur: 1.0, source: 'EN 1992-1-1:2004, valeur recommandée, §3.1.6(1)P' };
    expect(valeurLu('EN 1992-1-1', 'alpha_cc', rec, '3.1.6(1)P')).toEqual({
      valeur: 0.85,
      source: 'ILNAS-EN 1992-1-1/AN-LU:2020, 3.1.6(1)P : valeur présumée, non vérifiée sur l’annexe',
    });
    const gc = { valeur: 1.5, source: 'EN 1992-1-1:2004, tableau 2.1N' };
    expect(valeurLu('EN 1992-1-1', 'gamma_C', gc, 'tableau 2.1N')).toEqual({
      valeur: 1.5,
      source: 'ILNAS-EN 1992-1-1/AN-LU:2020, tableau 2.1N : valeur recommandée présumée retenue, non vérifiée sur l’annexe',
    });
    // Partie absente de la table : meme traitement que « recommandee retenue ».
    expect(valeurLu('EN 1996-1-1', 'gamma_M', { valeur: 2.5, source: 's' }, '2.4.3').valeur).toBe(2.5);
  });

  it('avertissement a l ecran et dans la note tant que l annexe n est pas lue', () => {
    expect(avertissementAnnexeLu()).toMatch(/^Annexe nationale luxembourgeoise.*présumées.*modifier/);
    definirLangue('en');
    expect(avertissementAnnexeLu()).toMatch(/^Luxembourg National Annex.*presumed.*change/);
  });

  it('traduireSource : intacte en francais, sans accent en anglais', () => {
    const s = sourceLu('EN 1992-1-1', 'tableau 2.1N', true);
    expect(traduireSource(s)).toBe(s);
    definirLangue('en');
    expect(traduireSource(s)).toBe('ILNAS-EN 1992-1-1/AN-LU:2020, Table 2.1N: recommended value presumed retained, not checked against the annex');
    expect(traduireSource('EN 1992-1-1:2004, valeur recommandée, tableau 2.1N')).toBe('EN 1992-1-1:2004, recommended value, Table 2.1N');
  });
});
