import { describe, expect, it } from 'vitest';

import { notationHtml, notationSvg, notationTexte } from '../src/index';

const ZWSP = '​';

describe('notationHtml — indices', () => {
  it('indice simple', () => {
    expect(notationHtml('M_Ed')).toBe('M<sub>Ed</sub>');
    expect(notationHtml('N_Rd')).toBe('N<sub>Rd</sub>');
    expect(notationHtml('e_2, M_2')).toBe('e<sub>2</sub>, M<sub>2</sub>');
  });
  it('indice compose : virgule et point internes', () => {
    expect(notationHtml('l_b,rqd')).toBe('l<sub>b,rqd</sub>');
    expect(notationHtml('f_ctk,0.05')).toBe('f<sub>ctk,0.05</sub>');
    expect(notationHtml('W_eff,y')).toBe('W<sub>eff,y</sub>');
    expect(notationHtml('v_Rd,max')).toBe('v<sub>Rd,max</sub>');
  });
  it('une ponctuation suivie d une espace ou en fin termine l indice', () => {
    expect(notationHtml('f_ck, plafonne')).toBe('f<sub>ck</sub>, plafonne');
    expect(notationHtml('avec f_yd.')).toBe('avec f<sub>yd</sub>.');
    expect(notationHtml('(f_yd)')).toBe('(f<sub>yd</sub>)');
  });
  it('plusieurs notations dans une phrase', () => {
    expect(notationHtml('l_bd = 561 mm')).toBe('l<sub>bd</sub> = 561 mm');
    expect(notationHtml('produit x l_b,rqd')).toBe('produit x l<sub>b,rqd</sub>');
  });
});

describe('notationHtml — lettres grecques', () => {
  it('nom de lettre en base', () => {
    expect(notationHtml('sigma_s')).toBe('σ<sub>s</sub>');
    expect(notationHtml('gamma_M0')).toBe('γ<sub>M0</sub>');
    expect(notationHtml('alpha_ct f_ctk,0.05 / gamma_C')).toBe('α<sub>ct</sub> f<sub>ctk,0.05</sub> / γ<sub>C</sub>');
    expect(notationHtml('eta_1 x eta_2')).toBe('η<sub>1</sub> x η<sub>2</sub>');
    expect(notationHtml('lambda_LT ; chi_LT')).toBe('λ<sub>LT</sub> ; χ<sub>LT</sub>');
    expect(notationHtml('psi_0')).toBe('ψ<sub>0</sub>');
  });
  it('nom de lettre seul', () => {
    expect(notationHtml('K, lambda')).toBe('K, λ');
    expect(notationHtml('diametre phi')).toBe('diametre φ');
    expect(notationHtml('theta = 45 degres')).toBe('θ = 45 degres');
    expect(notationHtml('lambda <= lambda_lim')).toBe('λ ≤ λ<sub>lim</sub>');
  });
  it('majuscules', () => {
    expect(notationHtml('Sigma A_st')).toBe('Σ A<sub>st</sub>');
    expect(notationHtml('Delta')).toBe('Δ');
    expect(notationHtml('Gamma Lambda Phi Psi Omega Theta Pi Xi')).toBe('Γ Λ Φ Ψ Ω Θ Π Ξ');
  });
  it('alphabet complet', () => {
    expect(
      notationHtml('alpha beta gamma delta epsilon zeta eta theta kappa lambda mu xi pi rho sigma tau upsilon phi chi psi omega')
    ).toBe('α β γ δ ε ζ η θ κ λ μ ξ π ρ σ τ υ φ χ ψ ω');
  });
  it('eps abrege epsilon', () => {
    expect(notationHtml('eps_yd')).toBe('ε<sub>yd</sub>');
  });
  it('lettre grecque dans l indice', () => {
    expect(notationHtml('K_r K_phi eps_yd / (0,45 d)')).toBe('K<sub>r</sub> K<sub>φ</sub> ε<sub>yd</sub> / (0,45 d)');
    expect(notationHtml('k_sigma')).toBe('k<sub>σ</sub>');
  });
  it('un nom de lettre colle a d autres lettres n est pas converti', () => {
    expect(notationHtml('alphabet')).toBe('alphabet');
    expect(notationHtml('betail')).toBe('betail');
    expect(notationHtml('Pierre')).toBe('Pierre');
    expect(notationHtml('chiffre')).toBe('chiffre');
  });
  it('un mot francais accentue n est pas coupe en nom de lettre', () => {
    expect(notationHtml('la pièce')).toBe('la pièce');
    expect(notationTexte('pièce, étau, muée')).toBe('pièce, étau, muée');
    expect(notationSvg('la pièce')).toBe('la pièce');
  });
  it('« nu » reste un mot dans le texte (au nu du poteau), mais se convertit en indice', () => {
    expect(notationHtml('écrasement au nu du poteau')).toBe('écrasement au nu du poteau');
    expect(notationTexte('V_Ed à d du nu')).toBe(notationTexte('V_Ed') + ' à d du nu');
    expect(notationHtml('k_nu')).toBe('k<sub>ν</sub>');
  });
});

describe('notationHtml — exposants, unites, comparaisons, echappement', () => {
  it('exposants', () => {
    expect(notationHtml('pi^2 EI / l_0^2')).toBe('π<sup>2</sup> EI / l<sub>0</sub><sup>2</sup>');
    expect(notationHtml('x 10^-6 /mm')).toBe('x 10<sup>-6</sup> /mm');
    expect(notationHtml('(rho_1 / 25)^0,5')).toBe('(ρ<sub>1</sub> / 25)<sup>0,5</sup>');
  });
  it('unites au carre, au cube, a la puissance 4', () => {
    expect(notationHtml('A_st = 1000 mm2')).toBe('A<sub>st</sub> = 1000 mm²');
    expect(notationHtml('kN/m2')).toBe('kN/m²');
    expect(notationHtml('cm3 et cm4')).toBe('cm³ et cm⁴');
    expect(notationHtml('m3')).toBe('m³');
  });
  it('ce qui ressemble a une unite sans en etre une reste tel quel', () => {
    expect(notationHtml('M2')).toBe('M2');
    expect(notationHtml('HA16')).toBe('HA16');
    expect(notationHtml('mm25')).toBe('mm25');
  });
  it('comparaisons', () => {
    expect(notationHtml('a >= b')).toBe('a ≥ b');
    expect(notationHtml('a <= b')).toBe('a ≤ b');
  });
  it('echappe le reste du texte', () => {
    expect(notationHtml('a < b & c > "d"')).toBe('a &lt; b &amp; c &gt; &quot;d&quot;');
  });
  it('texte sans notation inchange', () => {
    expect(notationHtml('')).toBe('');
    expect(notationHtml('longueur de reference')).toBe('longueur de reference');
    expect(notationHtml('2,25 x 1,0')).toBe('2,25 x 1,0');
    expect(notationHtml('§8.4.4(2), expression (8.3)')).toBe('§8.4.4(2), expression (8.3)');
  });
});

describe('notationSvg — indices par decalage vertical, retour a la ligne de base', () => {
  it('indice suivi de texte', () => {
    expect(notationSvg('l_bd = 561 mm')).toBe('l<tspan dy="0.4em" font-size="75%">bd</tspan><tspan dy="-0.3em"> = 561 mm</tspan>');
  });
  it('indice en fin de texte : retour par une espace sans chasse', () => {
    expect(notationSvg('M_Ed')).toBe(`M<tspan dy="0.4em" font-size="75%">Ed</tspan><tspan dy="-0.3em">${ZWSP}</tspan>`);
  });
  it('indice puis exposant', () => {
    expect(notationSvg('l_0^2')).toBe(
      `l<tspan dy="0.4em" font-size="75%">0</tspan><tspan dy="-1em" font-size="75%">2</tspan><tspan dy="0.45em">${ZWSP}</tspan>`
    );
  });
  it('exposant suivi de texte', () => {
    expect(notationSvg('pi^2 EI')).toBe('π<tspan dy="-0.6em" font-size="75%">2</tspan><tspan dy="0.45em"> EI</tspan>');
  });
  it('plusieurs indices', () => {
    expect(notationSvg('rho_1 = 1 % · alpha_6 = 1')).toBe(
      'ρ<tspan dy="0.4em" font-size="75%">1</tspan><tspan dy="-0.3em"> = 1 % · α</tspan>' +
        '<tspan dy="0.4em" font-size="75%">6</tspan><tspan dy="-0.3em"> = 1</tspan>'
    );
  });
  it('unites, comparaisons, echappement, texte sans notation', () => {
    expect(notationSvg('1000 mm2')).toBe('1000 mm²');
    expect(notationSvg('a <= b & c')).toBe('a ≤ b &amp; c');
    expect(notationSvg('a < b')).toBe('a &lt; b');
    expect(notationSvg('sans notation')).toBe('sans notation');
  });
});

describe('notationTexte — texte brut (CSV)', () => {
  it('lettres grecques et indices accoles', () => {
    expect(notationTexte('M_Ed')).toBe('MEd');
    expect(notationTexte('gamma_M0')).toBe('γM0');
    expect(notationTexte('l_b,rqd')).toBe('lb,rqd');
    expect(notationTexte('f_ctk,0.05')).toBe('fctk,0.05');
    expect(notationTexte('Sigma A_st')).toBe('Σ Ast');
  });
  it('indice fait de chiffres : chiffres en indice Unicode', () => {
    expect(notationTexte('l_0')).toBe('l₀');
    expect(notationTexte('alpha_1')).toBe('α₁');
    expect(notationTexte('e_2, M_2')).toBe('e₂, M₂');
    expect(notationTexte('gamma_M0')).toBe('γM0');
  });
  it('exposant fait de chiffres et du signe moins : exposant Unicode, sinon garde tel quel', () => {
    expect(notationTexte('l_0^2')).toBe('l₀²');
    expect(notationTexte('10^-6')).toBe('10⁻⁶');
    expect(notationTexte('(rho_1 / 25)^0,5')).toBe('(ρ₁ / 25)^0,5');
  });
  it('unites et comparaisons, sans echappement HTML', () => {
    expect(notationTexte('1000 mm2')).toBe('1000 mm²');
    expect(notationTexte('a <= b & c')).toBe('a ≤ b & c');
    expect(notationTexte('a < b')).toBe('a < b');
  });
});
