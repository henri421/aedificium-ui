/**
 * Tests d'acceptation du gabarit Excel commun (fiche 11.3, S5 ; tache T1).
 * Reference visuelle : la maquette T0 validee le 2026-11-20
 * (plan-webaedificium/maquette-excel/).
 */

import { afterEach, describe, expect, it } from 'vitest';

import {
  FONCTIONS_XLSX_PERMISES,
  LARGEURS_COLONNES_XLSX,
  LIGNES_PAR_PAGE_XLSX,
  classeurDeCalcul,
  definirLangue,
  lireZipSansCompression,
  nomDeFichierXlsx,
  verifierGabaritXlsx,
  zipSansCompression,
  type ClasseurCalcul,
} from '../src/index';
import { classeurExemple, classeurLong } from './outils/classeur-exemple';
import { attribut, elementDe, formatDe, ligneDe, lireClasseur, texte, trouverTexte, xf, type ClasseurLu } from './outils/lire-xlsx';

afterEach(() => definirLangue('fr'));

const JETONS_HEX = ['1A1A1A', '4A4842', '6A6862', 'FFFFFF', 'F2F1EC', 'C8C6C0', 'ECEAE4', '1E5AA8', 'EAF1F9', '1F6F3F', 'EAF4EE', '8A6D00', 'FDF6E3', 'A52121', 'F8ECEC'];

const lu = (c: ClasseurCalcul = classeurExemple()): ClasseurLu => lireClasseur(classeurDeCalcul(c));

/** Ligne d'une cellule de texte exact, ou erreur. */
function ligneDuTexte(l: ClasseurLu, t: string): number {
  const c = trouverTexte(l, t);
  if (!c) throw new Error(`texte absent : ${t}`);
  return c.ligne;
}

function entetes(l: ClasseurLu, n: number): string[] {
  const r = ligneDe(l, n);
  return ['A', 'B', 'C', 'D', 'E', 'F'].map((c) => texte(r[c]));
}

/** Cellule pointee par un nom defini. */
function celluleDuNom(l: ClasseurLu, nom: string) {
  const ref = l.noms.get(nom);
  if (!ref) throw new Error(`nom non defini : ${nom}`);
  const m = /!\$([A-Z]+)\$(\d+)$/.exec(ref);
  if (!m) throw new Error(`reference illisible : ${ref}`);
  return l.cellules.get(`${m[1]}${m[2]}`);
}

describe('une seule feuille', () => {
  it('le classeur n a qu une feuille, nommee d apres l outil', () => {
    const l = lu();
    expect([...l.classeur.matchAll(/<sheet\b/g)]).toHaveLength(1);
    expect(attribut(l.classeur, 'sheet', 'name')).toBe('cisaillement-interface');
    expect([...l.fichiers.keys()].filter((f) => f.startsWith('xl/worksheets/'))).toEqual(['xl/worksheets/sheet1.xml']);
  });
  it('aucune formule ne renvoie a une autre feuille ni a un autre fichier', () => {
    const l = lu();
    for (const c of l.cellules.values()) if (c.formule) expect(/[![]/.test(c.formule)).toBe(false);
    for (const ref of l.noms.values()) expect(ref.startsWith("'cisaillement-interface'!") || ref.startsWith('cisaillement-interface!')).toBe(true);
  });
  it('recalcul complet a l ouverture', () => {
    expect(attribut(lu().classeur, 'calcPr', 'fullCalcOnLoad')).toBe('1');
  });
});

describe('cartouche', () => {
  it('titre en A1, puis projet, element, outil et version, norme, annexe, date', () => {
    const l = lu();
    expect(texte(l.cellules.get('A1'))).toBe('Cisaillement le long d’une reprise de bétonnage');
    const textes = [...l.cellules.values()].map((c) => c.texte ?? '');
    const avec = (debut: string, valeur: string) => textes.some((t) => t.startsWith(debut) && t.includes(valeur));
    expect(avec('Projet', 'Exemple de maquette')).toBe(true);
    expect(avec('Élément', 'Dalle sur prédalles, travée 2')).toBe(true);
    expect(avec('Outil', 'cisaillement-interface 0.2.0 (a1b2c3d)')).toBe(true);
    expect(avec('Norme', 'EN 1992-1-1:2004, 6.2.5')).toBe(true);
    expect(avec('Annexe', 'valeurs recommandées')).toBe(true);
    expect(avec('Date', '2026-11-20')).toBe(true);
    expect(textes.some((t) => t.startsWith('Moteurs'))).toBe(false);
  });
  it('moteurs utilises (11.2) quand il y en a', () => {
    const c = classeurExemple();
    const l = lu({ ...c, cartouche: { ...c.cartouche, moteurs: ['colonne-ec2 0.4.0', 'section-uls 2.1.0'] } });
    const t = [...l.cellules.values()].map((x) => x.texte ?? '').find((x) => x.startsWith('Moteurs'));
    expect(t).toContain('colonne-ec2 0.4.0');
    expect(t).toContain('section-uls 2.1.0');
  });
  it('le cartouche tient avant le premier bloc, en 5 lignes au plus', () => {
    expect(ligneDuTexte(lu(), 'Données')).toBeLessThanOrEqual(7);
  });
});

describe('blocs et colonnes', () => {
  it('Données, Calcul, Vérifications dans cet ordre, chacun suivi de sa ligne d en-tetes', () => {
    const l = lu();
    const d = ligneDuTexte(l, 'Données');
    const c = ligneDuTexte(l, 'Calcul');
    const v = ligneDuTexte(l, 'Vérifications');
    expect(d).toBeLessThan(c);
    expect(c).toBeLessThan(v);
    expect(entetes(l, d + 1)).toEqual(['Grandeur', 'Symbole', 'Valeur', 'Unité', '', 'Source']);
    expect(entetes(l, c + 1)).toEqual(['Grandeur', 'Symbole', 'Valeur', 'Unité', '', 'Clause']);
    expect(entetes(l, v + 1)).toEqual(['Vérification', 'Sollicitation', 'Résistance', 'Taux', 'Verdict', 'Clause']);
  });
  it('un bloc vide n est pas produit', () => {
    const l = lu({ ...classeurExemple(), calcul: [], verifications: [] });
    expect(trouverTexte(l, 'Calcul')).toBeUndefined();
    expect(trouverTexte(l, 'Données')).toBeDefined();
  });
  it('titres de groupes en capitales, en colonne A, dans l ordre donne', () => {
    const l = lu();
    const lignes = ['GÉOMÉTRIE', 'MATÉRIAUX', 'HYPOTHÈSES', 'CAS DE CHARGES', 'CONTRAINTE AGISSANTE', 'RÉSISTANCE'].map((t) => {
      const c = trouverTexte(l, t);
      expect(c?.colonne).toBe('A');
      return c?.ligne ?? 0;
    });
    expect([...lignes].sort((a, b) => a - b)).toEqual(lignes);
  });
  it('largeurs fixes des six colonnes, tenant sur une largeur A4', () => {
    const l = lu();
    expect(LARGEURS_COLONNES_XLSX).toHaveLength(6);
    expect(LARGEURS_COLONNES_XLSX.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(100);
    const cols = [...l.feuille.matchAll(/<col min="(\d+)" max="(\d+)" width="([\d.]+)"/g)];
    expect(cols.map((m) => Number(m[3]))).toEqual([...LARGEURS_COLONNES_XLSX]);
  });
});

describe('lignes de donnees', () => {
  it('grandeur, symbole, valeur saisissable, unite, colonne E vide, source', () => {
    const l = lu();
    const c = celluleDuNom(l, 'gamma_C');
    expect(c?.colonne).toBe('C');
    expect(Number(c?.valeur)).toBe(1.5);
    expect(c?.formule).toBeUndefined();
    const r = ligneDe(l, c?.ligne ?? 0);
    expect(texte(r.A)).toBe('Coefficient partiel du béton');
    expect(texte(r.B)).toBe('γ_C');
    expect(texte(r.D)).toBe('-');
    expect(texte(r.E)).toBe('');
    expect(texte(r.F)).toBe('tab. 2.1N');
  });
  it('cellule de saisie : deverrouillee, fond accent-doux, filet accent, Consolas', () => {
    const l = lu();
    const s = xf(l, celluleDuNom(l, 'f_ck')?.style ?? 0);
    expect(s).toContain('locked="0"');
    const fill = elementDe(l, 'fills', Number(/fillId="(\d+)"/.exec(s)?.[1]));
    expect(fill.toUpperCase()).toContain('EAF1F9');
    const bord = elementDe(l, 'borders', Number(/borderId="(\d+)"/.exec(s)?.[1]));
    expect(bord.toUpperCase()).toContain('1E5AA8');
    const font = elementDe(l, 'fonts', Number(/fontId="(\d+)"/.exec(s)?.[1]));
    expect(font).toContain('Consolas');
  });
  it('donnee de texte : saisissable aussi, sans nom defini', () => {
    const l = lu();
    const c = trouverTexte(l, 'rugueuse');
    expect(c?.colonne).toBe('C');
    expect(xf(l, c?.style ?? 0)).toContain('locked="0"');
  });
  it('format de nombre selon les decimales (3 par defaut)', () => {
    const l = lu();
    expect(formatDe(l, celluleDuNom(l, 'f_ck')?.style ?? 0)).toBe('0');
    expect(formatDe(l, celluleDuNom(l, 'gamma_C')?.style ?? 0)).toBe('0.00');
    expect(formatDe(l, celluleDuNom(l, 'mu')?.style ?? 0)).toBe('0.000');
    expect(formatDe(l, celluleDuNom(l, 'rho')?.style ?? 0)).toBe('0.00000');
  });
});

describe('lignes de calcul', () => {
  it('formule nommee en colonne C, sans signe =, valeur en cache', () => {
    const l = lu();
    const c = celluleDuNom(l, 'v_Rdi');
    expect(c?.colonne).toBe('C');
    expect(c?.formule).toBe('MIN(t_coh+t_frot+t_arm,t_plaf)');
    expect(Number(c?.valeur)).toBeCloseTo(2.56966, 4);
    const r = ligneDe(l, c?.ligne ?? 0);
    expect(texte(r.A)).toBe('Résistance au cisaillement de l’interface');
    expect(texte(r.B)).toBe('v_Rdi');
    expect(texte(r.D)).toBe('MPa');
    expect(texte(r.E)).toBe('');
    expect(texte(r.F)).toBe('(6.25)');
  });
  it('cellule calculee verrouillee, en Consolas', () => {
    const l = lu();
    const s = xf(l, celluleDuNom(l, 'f_cd')?.style ?? 0);
    expect(s).not.toContain('locked="0"');
    expect(elementDe(l, 'fonts', Number(/fontId="(\d+)"/.exec(s)?.[1]))).toContain('Consolas');
  });
  it('toutes les grandeurs nommees de l exemple sont definies', () => {
    const l = lu();
    for (const n of ['z', 'b_i', 'f_ck', 'f_yk', 'gamma_C', 'gamma_S', 'alpha_cc', 'alpha_ct', 'v_c', 'mu', 'A_si', 'alpha', 'V_Ed', 'beta', 'sigma_n', 'v_Edi', 'f_ctm', 'f_ctd', 'f_cd', 'f_yd', 'rho', 'nu', 't_coh', 't_frot', 't_arm', 't_plaf', 'v_Rdi']) {
      expect(celluleDuNom(l, n)?.colonne).toBe('C');
    }
    expect(l.noms.size).toBe(27);
  });
});

describe('verifications', () => {
  function ligneVerif(l: ClasseurLu, nom: string) {
    return ligneDe(l, ligneDuTexte(l, nom));
  }
  it('sollicitation et resistance en formules, avec l unite dans le format', () => {
    const l = lu();
    const r = ligneVerif(l, 'Cisaillement à l’interface');
    expect(r.B.formule).toBe('v_Edi');
    expect(r.C.formule).toBe('v_Rdi');
    expect(formatDe(l, r.B.style)).toBe('0.000" MPa"');
    expect(formatDe(l, r.C.style)).toBe('0.000" MPa"');
    expect(texte(r.F)).toBe('(6.23)');
  });
  it('taux arrondi vers le verdict, verdict lu sur le taux', () => {
    const l = lu();
    const r = ligneVerif(l, 'Cisaillement à l’interface');
    const n = r.D.ligne;
    expect(r.D.formule).toBe(`IF(B${n}/C${n}<=1,ROUNDDOWN(B${n}/C${n},3),ROUNDUP(B${n}/C${n},3))`);
    expect(r.D.valeur).toBe('0.972');
    expect(formatDe(l, r.D.style)).toBe('0.000');
    expect(r.E.formule).toBe(`IF(D${n}<=1,"OK","NON CONFORME")`);
    expect(r.E.valeur).toBe('OK');
  });
  it('cas non conforme : taux par exces et verdict en cache', () => {
    const r = ligneVerif(lu(classeurExemple(500)), 'Cisaillement à l’interface');
    expect(r.D.valeur).toBe('2.386');
    expect(r.E.valeur).toBe('NON CONFORME');
  });
  it('arrondi du taux en cache : 0,9996 -> 0,999 ; 1,0004 -> 1,001 ; 1 -> 1', () => {
    const avec = (s: number) => {
      const c = classeurExemple();
      const v = { ...c.verifications[0], valeurSollicitation: s, valeurResistance: 1 };
      return ligneVerif(lu({ ...c, verifications: [v] }), 'Cisaillement à l’interface').D.valeur;
    };
    expect(avec(0.9996)).toBe('0.999');
    expect(avec(1.0004)).toBe('1.001');
    expect(avec(1)).toBe('1');
  });
  it('mise en forme conditionnelle : ok et refus sur le taux et le verdict', () => {
    const l = lu();
    const r = ligneVerif(l, 'Cisaillement à l’interface');
    const d = ligneVerif(l, 'Contrainte normale, domaine');
    const cf = /<conditionalFormatting sqref="([^"]+)">([\s\S]*?)<\/conditionalFormatting>/.exec(l.feuille);
    expect(cf?.[1]).toBe(`D${r.D.ligne}:E${d.D.ligne}`);
    const regles = [...(cf?.[2] ?? '').matchAll(/<cfRule\b[^>]*dxfId="(\d+)"[^>]*>\s*<formula>([^<]*)<\/formula>/g)];
    expect(regles).toHaveLength(2);
    const dxfs = [...(/<dxfs[^>]*>([\s\S]*?)<\/dxfs>/.exec(l.styles)?.[1] ?? '').matchAll(/<dxf>[\s\S]*?<\/dxf>/g)].map((m) => m[0].toUpperCase());
    const pour = (formule: string) => dxfs[Number(regles.find((x) => x[2].replace(/&lt;/g, '<').replace(/&gt;/g, '>') === formule)?.[1])];
    expect(pour(`$D${r.D.ligne}<=1`)).toContain('1F6F3F');
    expect(pour(`$D${r.D.ligne}<=1`)).toContain('EAF4EE');
    expect(pour(`$D${r.D.ligne}>1`)).toContain('A52121');
    expect(pour(`$D${r.D.ligne}>1`)).toContain('F8ECEC');
  });
});

describe('pas de texte d explication', () => {
  it('tout texte de la feuille vient des donnees ou du vocabulaire fixe du gabarit', () => {
    const c = classeurExemple();
    const l = lu(c);
    const permis = new Set<string>([
      c.cartouche.titre,
      'Données', 'Calcul', 'Vérifications',
      'Grandeur', 'Symbole', 'Valeur', 'Unité', 'Source', 'Clause', 'Vérification', 'Sollicitation', 'Résistance', 'Taux', 'Verdict',
    ]);
    for (const g of [...c.donnees, ...c.calcul]) {
      permis.add(g.titre.toLocaleUpperCase('fr'));
      for (const x of g.lignes) {
        permis.add(x.grandeur);
        permis.add(x.symbole);
        permis.add(x.unite);
        if ('source' in x && x.source) permis.add(x.source);
        if ('clause' in x && x.clause) permis.add(x.clause);
        if ('valeur' in x && typeof x.valeur === 'string') permis.add(x.valeur);
      }
    }
    for (const v of c.verifications) {
      permis.add(v.nom);
      if (v.clause) permis.add(v.clause);
    }
    const cartouche = /^(Projet|Élément|Outil|Norme|Annexe|Date|Moteurs)\b/;
    for (const cel of l.cellules.values()) {
      if (cel.texte === undefined || cel.texte === '') continue;
      expect(permis.has(cel.texte) || cartouche.test(cel.texte)).toBe(true);
    }
    expect(l.feuille).not.toContain('<legacyDrawing');
    expect([...l.fichiers.keys()].some((f) => f.includes('comments'))).toBe(false);
  });
});

describe('style', () => {
  it('styles.xml identique quel que soit le contenu (gabarit fige)', () => {
    const a = lu().styles;
    expect(lu(classeurLong(4, 12)).styles).toBe(a);
    expect(lu({ ...classeurExemple(), calcul: [], verifications: [] }).styles).toBe(a);
    definirLangue('en');
    expect(lu().styles).toBe(a);
  });
  it('polices Calibri et Consolas seulement', () => {
    const l = lu();
    const noms = new Set([...l.styles.matchAll(/<name val="([^"]+)"/g)].map((m) => m[1]));
    expect([...noms].sort()).toEqual(['Calibri', 'Consolas']);
  });
  it('aucune couleur hors des jetons de DESIGN.md', () => {
    const l = lu();
    const couleurs = [...l.styles.matchAll(/rgb="([0-9A-Fa-f]{8})"/g)].map((m) => m[1].toUpperCase().slice(2));
    expect(couleurs.length).toBeGreaterThan(0);
    for (const c of couleurs) expect(JETONS_HEX).toContain(c);
  });
  it('texte des grandeurs en Calibri', () => {
    const l = lu();
    const c = trouverTexte(l, 'Coefficient partiel du béton');
    expect(elementDe(l, 'fonts', Number(/fontId="(\d+)"/.exec(xf(l, c?.style ?? 0))?.[1]))).toContain('Calibri');
  });
  it('quadrillage masque a l ecran', () => {
    expect(attribut(lu().feuille, 'sheetView', 'showGridLines')).toBe('0');
  });
});

describe('protection', () => {
  it('feuille protegee, sans mot de passe', () => {
    const l = lu();
    expect(attribut(l.feuille, 'sheetProtection', 'sheet')).toBe('1');
    const p = /<sheetProtection\b[^>]*>/.exec(l.feuille)?.[0] ?? '';
    expect(p).not.toMatch(/password|hashValue|algorithmName|saltValue/);
  });
});

describe('impression', () => {
  it('A4 portrait, une page en largeur, hauteur libre', () => {
    const l = lu();
    expect(attribut(l.feuille, 'pageSetUpPr', 'fitToPage')).toBe('1');
    expect(attribut(l.feuille, 'pageSetup', 'paperSize')).toBe('9');
    expect(attribut(l.feuille, 'pageSetup', 'orientation')).toBe('portrait');
    expect(attribut(l.feuille, 'pageSetup', 'fitToWidth')).toBe('1');
    expect(attribut(l.feuille, 'pageSetup', 'fitToHeight')).toBe('0');
    expect(attribut(l.feuille, 'printOptions', 'horizontalCentered')).toBe('1');
    expect(attribut(l.feuille, 'printOptions', 'gridLines')).not.toBe('1');
  });
  it('zone d impression : toute la plage utilisee', () => {
    const l = lu();
    const derniere = Math.max(...[...l.cellules.values()].map((c) => c.ligne));
    const zone = /<definedName name="_xlnm\.Print_Area" localSheetId="0">([^<]*)<\/definedName>/.exec(l.classeur)?.[1] ?? '';
    expect(zone.replace(/&apos;/g, "'")).toMatch(new RegExp(`!\\$A\\$1:\\$F\\$${derniere}$`));
  });
  it('en-tete : projet et element ; pied : outil, version, page n / N', () => {
    const l = lu();
    const tete = (/<oddHeader>([\s\S]*?)<\/oddHeader>/.exec(l.feuille)?.[1] ?? '').replace(/&amp;/g, '&');
    const pied = (/<oddFooter>([\s\S]*?)<\/oddFooter>/.exec(l.feuille)?.[1] ?? '').replace(/&amp;/g, '&');
    expect(tete).toContain('Exemple de maquette');
    expect(tete).toContain('Dalle sur prédalles, travée 2');
    expect(pied).toContain('cisaillement-interface 0.2.0 (a1b2c3d)');
    expect(pied).toContain('&P');
    expect(pied).toContain('&N');
  });
  it('pas de saut de page quand tout tient sur une page (exemple)', () => {
    expect(lu().feuille).not.toContain('<rowBreaks');
  });
  it('sauts de page avant un titre de groupe ou de bloc, jamais au milieu d un groupe', () => {
    const c = classeurLong(6, 15);
    const l = lu(c);
    const titres = new Set<number>();
    for (const t of ['Données', 'Calcul', 'Vérifications', ...[...c.donnees, ...c.calcul].map((g) => g.titre.toLocaleUpperCase('fr'))]) {
      const cel = trouverTexte(l, t);
      if (cel) titres.add(cel.ligne);
    }
    const sauts = [...l.feuille.matchAll(/<brk id="(\d+)"[^>]*man="1"/g)].map((m) => Number(m[1]));
    expect(sauts.length).toBeGreaterThan(0);
    let debut = 1;
    for (const s of sauts) {
      expect(titres.has(s + 1)).toBe(true);
      // un titre de groupe n'est pas separe de l'en-tete de son bloc
      expect(entetes(l, s).includes('Grandeur')).toBe(false);
      expect(s - debut + 1).toBeLessThanOrEqual(LIGNES_PAR_PAGE_XLSX);
      debut = s + 1;
    }
    const derniere = Math.max(...[...l.cellules.values()].map((x) => x.ligne));
    expect(derniere - debut + 1).toBeLessThanOrEqual(LIGNES_PAR_PAGE_XLSX);
  });
  it('compte la hauteur des lignes, pas leur nombre : les verifications ne restent pas seules en page 2', () => {
    // 51 lignes (< 52), mais trois titres de bloc hauts : la page deborde (constate dans Excel).
    const c = classeurExemple();
    const l = lu({ ...c, calcul: [...c.calcul, ...classeurLong(1, 4).calcul.slice(-1)] });
    const sauts = [...l.feuille.matchAll(/<brk id="(\d+)"[^>]*man="1"/g)].map((m) => Number(m[1]));
    expect(sauts).toHaveLength(1);
    expect(texte(ligneDe(l, sauts[0] + 1).A)).toBe('Vérifications');
  });
  it('un groupe plus long qu une page ne fait pas echouer la generation', () => {
    const l = lu(classeurLong(1, LIGNES_PAR_PAGE_XLSX + 20));
    expect(l.feuille).toContain('<sheetData>');
  });
});

describe('controles du generateur', () => {
  const avecCalcul = (formule: string, nom = 'x_test'): ClasseurCalcul => {
    const c = classeurExemple();
    return { ...c, calcul: [...c.calcul, { titre: 'Test', lignes: [{ grandeur: 'Essai', symbole: 'x', nom, formule, valeur: 1, unite: '-' }] }] };
  };
  it('liste des fonctions permises', () => {
    expect([...FONCTIONS_XLSX_PERMISES].sort()).toEqual(
      ['ABS', 'COS', 'EXP', 'IF', 'LN', 'MAX', 'MIN', 'PI', 'POWER', 'RADIANS', 'ROUNDDOWN', 'ROUNDUP', 'SIN', 'SQRT', 'TAN'].sort()
    );
  });
  it('refuse une fonction hors liste, en la nommant', () => {
    expect(() => classeurDeCalcul(avecCalcul('VLOOKUP(f_ck,1,2)'))).toThrow(/VLOOKUP/);
    expect(() => classeurDeCalcul(avecCalcul('INDIRECT(f_ck)'))).toThrow(/INDIRECT/);
  });
  it('refuse un renvoi a une autre feuille ou a un autre fichier', () => {
    expect(() => classeurDeCalcul(avecCalcul("Feuil2!A1*2"))).toThrow();
    expect(() => classeurDeCalcul(avecCalcul('[autre.xlsx]Feuil1!A1'))).toThrow();
  });
  it('refuse un nom inconnu dans une formule, en le nommant', () => {
    expect(() => classeurDeCalcul(avecCalcul('f_ck*inconnu_9'))).toThrow(/inconnu_9/);
  });
  it('accepte nombres et notation scientifique ; refuse une chaine (une ligne de calcul est numerique)', () => {
    expect(() => classeurDeCalcul(avecCalcul('IF(f_ck>50,1.5E-3,2)'))).not.toThrow();
    expect(() => classeurDeCalcul(avecCalcul('IF(f_ck>50,"haut","bas")'))).toThrow();
  });
  it('controle aussi les formules de sollicitation et de resistance', () => {
    const c = classeurExemple();
    const v = { ...c.verifications[0], resistance: 'v_Rdi_inconnu' };
    expect(() => classeurDeCalcul({ ...c, verifications: [v] })).toThrow(/v_Rdi_inconnu/);
  });
  it('refuse un nom invalide pour Excel ou en double', () => {
    expect(() => classeurDeCalcul(avecCalcul('1', 'c'))).toThrow(/c/);
    expect(() => classeurDeCalcul(avecCalcul('1', 'R'))).toThrow();
    expect(() => classeurDeCalcul(avecCalcul('1', 'A1'))).toThrow(/A1/);
    expect(() => classeurDeCalcul(avecCalcul('1', 'f ck'))).toThrow();
    expect(() => classeurDeCalcul(avecCalcul('1', 'f_ck'))).toThrow(/f_ck/);
  });
  it('refuse une donnee numerique non finie, en nommant la grandeur', () => {
    const c = classeurExemple();
    const g = { ...c.donnees[0], lignes: [{ ...c.donnees[0].lignes[0], valeur: Number.NaN }] };
    expect(() => classeurDeCalcul({ ...c, donnees: [g, ...c.donnees.slice(1)] })).toThrow(/Bras de levier/);
  });
  it('refuse une resistance nulle ou negative', () => {
    const c = classeurExemple();
    const v = { ...c.verifications[0], valeurResistance: 0 };
    expect(() => classeurDeCalcul({ ...c, verifications: [v] })).toThrow(/Cisaillement/);
  });
});

describe('anglais', () => {
  it('blocs, en-tetes, cartouche et verdict', () => {
    definirLangue('en');
    const l = lu(classeurExemple(500));
    const d = ligneDuTexte(l, 'Data');
    const c = ligneDuTexte(l, 'Calculation');
    const v = ligneDuTexte(l, 'Checks');
    expect(entetes(l, d + 1)).toEqual(['Quantity', 'Symbol', 'Value', 'Unit', '', 'Source']);
    expect(entetes(l, c + 1)).toEqual(['Quantity', 'Symbol', 'Value', 'Unit', '', 'Clause']);
    expect(entetes(l, v + 1)).toEqual(['Check', 'Action effect', 'Resistance', 'Ratio', 'Verdict', 'Clause']);
    const textes = [...l.cellules.values()].map((x) => x.texte ?? '');
    for (const e of ['Project', 'Element', 'Tool', 'Standard', 'Annex', 'Date']) expect(textes.some((t) => t.startsWith(e))).toBe(true);
    const r = ligneDe(l, ligneDuTexte(l, 'Cisaillement à l’interface'));
    expect(r.E.formule).toBe(`IF(D${r.D.ligne}<=1,"OK","NOT OK")`);
    expect(r.E.valeur).toBe('NOT OK');
  });
});

describe('nomDeFichierXlsx', () => {
  it('<outil>_<element>_<feuille>_<date>.xlsx, sans accents ni espaces', () => {
    expect(nomDeFichierXlsx('cisaillement-interface', 'Dalle sur prédalles, travée 2', 'Feuille 1', '2026-11-20')).toBe(
      'cisaillement-interface_Dalle-sur-predalles-travee-2_Feuille-1_2026-11-20.xlsx'
    );
  });
  it('parties vides omises', () => {
    expect(nomDeFichierXlsx('silo', '', '  ', '2026-11-20')).toBe('silo_2026-11-20.xlsx');
  });
});

describe('verifierGabaritXlsx', () => {
  const remplacer = (octets: Uint8Array, fichier: string, de: RegExp | string, par: string): Uint8Array => {
    const f = lireZipSansCompression(octets);
    f.set(fichier, (f.get(fichier) ?? '').replace(de, par));
    return zipSansCompression([...f].map(([nom, contenu]) => ({ nom, contenu })));
  };
  it('classeur du generateur : aucune anomalie, en francais comme en anglais', () => {
    expect(verifierGabaritXlsx(classeurDeCalcul(classeurExemple()))).toEqual([]);
    expect(verifierGabaritXlsx(classeurDeCalcul(classeurLong(5, 14)))).toEqual([]);
    definirLangue('en');
    expect(verifierGabaritXlsx(classeurDeCalcul(classeurExemple()))).toEqual([]);
  });
  it('signale une deuxieme feuille', () => {
    const o = remplacer(classeurDeCalcul(classeurExemple()), 'xl/workbook.xml', '</sheets>', '<sheet name="Feuil2" sheetId="2" r:id="rId9"/></sheets>');
    expect(verifierGabaritXlsx(o).length).toBeGreaterThan(0);
  });
  it('signale une mise en page en paysage ou sans ajustement en largeur', () => {
    const o = classeurDeCalcul(classeurExemple());
    expect(verifierGabaritXlsx(remplacer(o, 'xl/worksheets/sheet1.xml', 'orientation="portrait"', 'orientation="landscape"')).join(' ')).toMatch(/orientation/i);
    expect(verifierGabaritXlsx(remplacer(o, 'xl/worksheets/sheet1.xml', / fitToWidth="1"/, '')).length).toBeGreaterThan(0);
  });
  it('signale une feuille non protegee', () => {
    const o = remplacer(classeurDeCalcul(classeurExemple()), 'xl/worksheets/sheet1.xml', /<sheetProtection\b[^>]*\/>/, '');
    expect(verifierGabaritXlsx(o).join(' ')).toMatch(/protection/i);
  });
  it('signale un en-tete de colonnes modifie', () => {
    const o = remplacer(classeurDeCalcul(classeurExemple()), 'xl/worksheets/sheet1.xml', '>Sollicitation<', '>Effort<');
    expect(verifierGabaritXlsx(o).length).toBeGreaterThan(0);
  });
  it('signale un styles.xml qui n est pas celui du gabarit', () => {
    const o = remplacer(classeurDeCalcul(classeurExemple()), 'xl/styles.xml', /EAF1F9/g, 'FFFF00');
    expect(verifierGabaritXlsx(o).join(' ')).toMatch(/style/i);
  });
  it('signale une formule qui renvoie a une autre feuille', () => {
    const o = remplacer(classeurDeCalcul(classeurExemple()), 'xl/worksheets/sheet1.xml', '<f>v_Edi</f>', '<f>Feuil2!A1</f>');
    expect(verifierGabaritXlsx(o).length).toBeGreaterThan(0);
  });
});
