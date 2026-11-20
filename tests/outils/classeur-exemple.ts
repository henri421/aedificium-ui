/**
 * Donnees d'exemple du gabarit Excel (fiche 11.3) : le cas de la maquette T0
 * validee le 2026-11-20 (cisaillement-interface, EN 1992-1-1:2004, 6.2.5,
 * surface rugueuse, A_si = 2000 mm2/m : v_Edi = 2,5 MPa, v_Rdi = 2,5697 MPa).
 *
 * Les valeurs en cache sont celles du noyau ; `asi` permet un cas non
 * conforme (500 mm2/m : v_Rdi = 1,0479 MPa).
 */

import type { ClasseurCalcul, GroupeXlsx, LigneCalculXlsx } from '../../src/index';

export function classeurExemple(asi = 2000): ClasseurCalcul {
  const fck = 30;
  const fctm = 0.3 * fck ** (2 / 3);
  const fctd = (0.7 * fctm) / 1.5;
  const fcd = fck / 1.5;
  const fyd = 500 / 1.15;
  const rho = asi / (300 * 1000);
  const nu = 0.6 * (1 - fck / 250);
  const coh = 0.4 * fctd;
  const arm = rho * fyd * (0.7 * Math.sin(Math.PI / 2) + Math.cos(Math.PI / 2));
  const plaf = 0.5 * nu * fcd;
  const vRdi = Math.min(coh + 0 + arm, plaf);
  return {
    cartouche: {
      titre: 'Cisaillement le long d’une reprise de bétonnage',
      projet: 'Exemple de maquette',
      element: 'Dalle sur prédalles, travée 2',
      outil: 'cisaillement-interface',
      version: '0.2.0 (a1b2c3d)',
      norme: 'EN 1992-1-1:2004, 6.2.5',
      annexe: 'valeurs recommandées',
      date: '2026-11-20',
    },
    donnees: [
      {
        titre: 'Géométrie',
        lignes: [
          { grandeur: 'Bras de levier de la section composite', symbole: 'z', nom: 'z', valeur: 400, unite: 'mm', decimales: 0 },
          { grandeur: 'Largeur de l’interface', symbole: 'b_i', nom: 'b_i', valeur: 300, unite: 'mm', decimales: 0 },
        ],
      },
      {
        titre: 'Matériaux',
        lignes: [
          { grandeur: 'Résistance du béton le plus faible', symbole: 'f_ck', nom: 'f_ck', valeur: 30, unite: 'MPa', decimales: 0 },
          { grandeur: 'Limite d’élasticité des armatures', symbole: 'f_yk', nom: 'f_yk', valeur: 500, unite: 'MPa', decimales: 0 },
          { grandeur: 'Coefficient partiel du béton', symbole: 'γ_C', nom: 'gamma_C', valeur: 1.5, unite: '-', decimales: 2, source: 'tab. 2.1N' },
          { grandeur: 'Coefficient partiel de l’acier', symbole: 'γ_S', nom: 'gamma_S', valeur: 1.15, unite: '-', decimales: 2, source: 'tab. 2.1N' },
          { grandeur: 'Coefficient de résistance en compression', symbole: 'α_cc', nom: 'alpha_cc', valeur: 1, unite: '-', decimales: 2, source: '3.1.6(1)' },
          { grandeur: 'Coefficient de résistance en traction', symbole: 'α_ct', nom: 'alpha_ct', valeur: 1, unite: '-', decimales: 2, source: '3.1.6(2)' },
        ],
      },
      {
        titre: 'Hypothèses',
        lignes: [
          { grandeur: 'État de surface', symbole: '', valeur: 'rugueuse', unite: '', source: '6.2.5(2)' },
          { grandeur: 'Coefficient de cohésion', symbole: 'c', nom: 'v_c', valeur: 0.4, unite: '-', source: '6.2.5(2), rugueuse' },
          { grandeur: 'Coefficient de frottement', symbole: 'μ', nom: 'mu', valeur: 0.7, unite: '-', source: '6.2.5(2), rugueuse' },
          { grandeur: 'Armatures traversant l’interface', symbole: 'A_si', nom: 'A_si', valeur: asi, unite: 'mm²/m', decimales: 0 },
          { grandeur: 'Angle des armatures avec l’interface', symbole: 'α', nom: 'alpha', valeur: 90, unite: '°', decimales: 0 },
        ],
      },
      {
        titre: 'Cas de charges',
        lignes: [
          { grandeur: 'Effort tranchant de calcul', symbole: 'V_Ed', nom: 'V_Ed', valeur: 300, unite: 'kN', decimales: 0 },
          { grandeur: 'Part reprise par le béton de reprise', symbole: 'β', nom: 'beta', valeur: 1, unite: '-', decimales: 2, source: '6.2.5(1)' },
          { grandeur: 'Contrainte normale (compression +)', symbole: 'σ_n', nom: 'sigma_n', valeur: 0, unite: 'MPa' },
        ],
      },
    ],
    calcul: [
      {
        titre: 'Contrainte agissante',
        lignes: [{ grandeur: 'Contrainte de cisaillement à l’interface', symbole: 'v_Edi', nom: 'v_Edi', formule: 'beta*V_Ed*1000/(z*b_i)', valeur: 2.5, unite: 'MPa', clause: '(6.24)' }],
      },
      {
        titre: 'Résistance',
        lignes: [
          { grandeur: 'Résistance moyenne en traction', symbole: 'f_ctm', nom: 'f_ctm', formule: 'IF(f_ck<=50,0.3*POWER(f_ck,2/3),2.12*LN(1+(f_ck+8)/10))', valeur: fctm, unite: 'MPa', clause: 'tab. 3.1' },
          { grandeur: 'Résistance de calcul en traction', symbole: 'f_ctd', nom: 'f_ctd', formule: 'alpha_ct*0.7*f_ctm/gamma_C', valeur: fctd, unite: 'MPa', clause: '(3.16)' },
          { grandeur: 'Résistance de calcul en compression', symbole: 'f_cd', nom: 'f_cd', formule: 'alpha_cc*f_ck/gamma_C', valeur: fcd, unite: 'MPa', clause: '(3.15)' },
          { grandeur: 'Limite d’élasticité de calcul', symbole: 'f_yd', nom: 'f_yd', formule: 'f_yk/gamma_S', valeur: fyd, unite: 'MPa', clause: '3.2.7' },
          { grandeur: 'Pourcentage d’armatures', symbole: 'ρ', nom: 'rho', formule: 'A_si/(b_i*1000)', valeur: rho, unite: '-', decimales: 5, clause: '6.2.5(1)' },
          { grandeur: 'Coefficient de réduction', symbole: 'ν', nom: 'nu', formule: '0.6*(1-f_ck/250)', valeur: nu, unite: '-', clause: '(6.6N)' },
          { grandeur: 'Terme de cohésion', symbole: '', nom: 't_coh', formule: 'IF(sigma_n<0,0,v_c*f_ctd)', valeur: coh, unite: 'MPa', clause: '(6.25)' },
          { grandeur: 'Terme de frottement', symbole: '', nom: 't_frot', formule: 'mu*sigma_n', valeur: 0, unite: 'MPa', clause: '(6.25)' },
          { grandeur: 'Terme des armatures', symbole: '', nom: 't_arm', formule: 'rho*f_yd*(mu*SIN(RADIANS(alpha))+COS(RADIANS(alpha)))', valeur: arm, unite: 'MPa', clause: '(6.25)' },
          { grandeur: 'Plafond', symbole: '', nom: 't_plaf', formule: '0.5*nu*f_cd', valeur: plaf, unite: 'MPa', clause: '(6.25)' },
          { grandeur: 'Résistance au cisaillement de l’interface', symbole: 'v_Rdi', nom: 'v_Rdi', formule: 'MIN(t_coh+t_frot+t_arm,t_plaf)', valeur: vRdi, unite: 'MPa', clause: '(6.25)' },
        ],
      },
    ],
    verifications: [
      { nom: 'Cisaillement à l’interface', sollicitation: 'v_Edi', resistance: 'v_Rdi', unite: 'MPa', valeurSollicitation: 2.5, valeurResistance: vRdi, clause: '(6.23)' },
      { nom: 'Contrainte normale, domaine', sollicitation: 'sigma_n', resistance: '0.6*f_cd', unite: 'MPa', valeurSollicitation: 0, valeurResistance: 0.6 * fcd, clause: '6.2.5(1)' },
    ],
  };
}

/** Classeur long : `n` groupes de calcul de `lignes` lignes chacun, pour les sauts de page. */
export function classeurLong(n: number, lignes: number): ClasseurCalcul {
  const base = classeurExemple();
  const groupes: GroupeXlsx<LigneCalculXlsx>[] = [];
  for (let g = 0; g < n; g++) {
    groupes.push({
      titre: `Groupe ${g + 1}`,
      lignes: Array.from({ length: lignes }, (_, i) => ({
        grandeur: `Grandeur ${g + 1}.${i + 1}`,
        symbole: `x_${g + 1}_${i + 1}`,
        nom: `x_${g + 1}_${i + 1}`,
        formule: 'f_ck*2',
        valeur: 60,
        unite: 'MPa',
      })),
    });
  }
  return { ...base, calcul: [...base.calcul, ...groupes] };
}
