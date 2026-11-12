// Avertissement de la 2e generation (audit R5).
import { afterEach, describe, expect, it } from 'vitest';
import { avertissement2eGeneration, definirLangue } from '../src/index';

describe('avertissement2eGeneration', () => {
  afterEach(() => definirLangue('fr'));
  it('francais par defaut : non applicable sans annexe nationale', () => {
    definirLangue('fr');
    expect(avertissement2eGeneration()).toMatch(/^2e génération.*annexe nationale.*étude/);
  });
  it('anglais', () => {
    definirLangue('en');
    expect(avertissement2eGeneration()).toMatch(/^2nd generation.*National Annex.*study/);
  });
});
