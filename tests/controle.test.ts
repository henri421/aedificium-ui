import { describe, expect, it } from 'vitest';

import { blocsEnTexte, constatsAffichage, contenuBalise, notationHtml, texteVisible } from '../src/index';

describe('texteVisible', () => {
  it('retire balises, styles et commentaires, decode les entites', () => {
    expect(texteVisible('<style>h1{}</style><p>a &lt; b &amp; c</p><!-- x_y -->').trim()).toBe('| a < b & c |');
    expect(texteVisible('&phi;1').trim()).toBe('1');
  });
  it('indices recolles, cases separees', () => {
    expect(texteVisible('c<sub>d</sub> = 30').trim()).toBe('cd = 30');
    expect(texteVisible('l<tspan dy="0.4em" font-size="75%">bd</tspan><tspan dy="-0.3em"> = 561</tspan>').trim()).toBe('lbd = 561');
    expect(texteVisible('<td>1,2</td><td>30</td>').trim()).toBe('| 1,2 | | 30 |');
  });
});

describe('constatsAffichage', () => {
  it('texte conforme : aucun constat', () => {
    const t = texteVisible(notationHtml("σ_sd = 434,8 MPa à l'origine ; l_bd = 561 mm, n'intervient pas, η = 0,7"));
    expect(constatsAffichage(t)).toEqual([]);
  });
  it('chaque regle a son constat', () => {
    const relever = (t: string) => constatsAffichage(t).map((x) => x.split(' :')[0]);
    expect(relever('M_Ed')).toEqual(['« _ » affiche']);
    expect(relever('l0^2')).toEqual(['« ^ » affiche']);
    expect(relever('sigma s')).toEqual(['nom de lettre grecque']);
    expect(relever('1,0 et 0,700')).toEqual(['zero inutile']);
    expect(relever('0,12345')).toEqual(['plus de 3 decimales']);
    expect(relever('Donnees')).toEqual(['accent manquant']);
    expect(relever('longueur d ancrage')).toEqual(['apostrophe manquante']);
    expect(relever('contrainte a la base')).toEqual(['« a » pour « à »']);
    expect(relever("Outil d'aide au calcul")).toEqual(['phrase type']);
  });
  it('mots en plus et mots admis', () => {
    expect(constatsAffichage('coulee', { motsEnPlus: ['coulee'] })).toHaveLength(1);
    expect(constatsAffichage('Beton', { motsAdmis: ['beton'] })).toEqual([]);
  });
  it('les nombres entiers, les sections et les intervalles ne sont pas des zeros inutiles', () => {
    expect(constatsAffichage('§8.4.4(2), 1200 mm, C25/30, [1 ; 1,5], 60, 30 mm')).toEqual([]);
  });
});

describe('contenuBalise', () => {
  it('premiere balise, texte visible', () => {
    expect(contenuBalise('<h1 class="t">Section <em>BA</em></h1><h1>b</h1>', 'h1')).toBe('Section BA');
    expect(contenuBalise('<p>x</p>', 'h1')).toBeNull();
  });
});

describe('blocsEnTexte', () => {
  it('notation de texte brut, sans muter les blocs recus', () => {
    const bloc = { titre: 'alpha_1', lignes: [{ symbole: 'l_0', libelle: 'phi', valeur: '1 mm2' }], note: 'M_Ed' };
    expect(blocsEnTexte([bloc])).toEqual([{ titre: 'α₁', lignes: [{ symbole: 'l₀', libelle: 'φ', valeur: '1 mm²' }], note: 'MEd' }]);
    expect(bloc.titre).toBe('alpha_1');
    expect(blocsEnTexte([{ titre: 't', lignes: [], note: null }])[0].note).toBeNull();
  });
});
