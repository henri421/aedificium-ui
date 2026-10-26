/**
 * Tests d'acceptation de la note de calcul commune (etape 8, lot 8.7).
 *
 * Ordre voulu par l'utilisateur : Geometrie, Materiaux, Hypotheses, Cas de
 * charges, Combinaisons de charges, Calculs et verifications, Conclusions.
 * Une section sans contenu n'apparait pas. Les conclusions sont un tableau
 * genere depuis les verifications, sans verdict global.
 */

import { describe, expect, it } from 'vitest';

import {
  SECTIONS_NOTE,
  STYLE_NOTE,
  noteDeCalculHtml,
  texteVisible,
  type ElementNote,
  type NoteDeCalcul,
} from '../src/index';

const CARTOUCHE = {
  projet: 'Immeuble Les Tilleuls',
  element: 'Poutre P12, niveau R+1',
  date: '2026-10-26',
  norme: 'EN 1992-1-1:2004',
  outil: 'poutres-continues',
};

const bloc = (titre: string): ElementNote => ({
  type: 'bloc',
  bloc: { titre, lignes: [{ symbole: 'L', libelle: 'longueur', valeur: '5 m' }], note: null },
});

function noteComplete(): NoteDeCalcul {
  return {
    cartouche: CARTOUCHE,
    sections: {
      calculs: [
        { type: 'etape', formule: 'V_Rd,s = A_sw / s · z · f_ywd · cot theta', substituee: '0,503 · 486 · 435 · 2,5', resultat: '265,9 kN', clause: '§6.2.3 (6.8)' },
        { type: 'figure', svg: '<svg viewBox="0 0 10 10"><rect class="m" width="1" height="1"/></svg>', legende: 'ELU, moment fléchissant' },
      ],
      combinaisons: [{ type: 'tableau', titre: 'Combinaisons', entetes: ['Nom', 'Expression'], lignes: [['ELU', '1,35 G + 1,5 Q']] }],
      geometrie: [bloc('Poutre'), { type: 'figure', svg: '<svg viewBox="0 0 10 10"><line class="g"/></svg>', legende: 'Schéma statique' }],
      materiaux: [bloc('Béton armé')],
      hypotheses: [{ type: 'liste', items: ['Calcul élastique linéaire au premier ordre.', 'gamma_c = 1,5 (valeur recommandée)'] }],
      charges: [bloc('Charges')],
    },
    verifications: [
      { nom: 'Flexion, travée 1', taux: 0.62, ok: true, clause: '§6.1' },
      { nom: 'Effort tranchant, appui 2', taux: 0.9996, ok: true, clause: '§6.2.3' },
      { nom: 'Flèche, travée 2', taux: 1.0004, ok: false, clause: '§7.4' },
    ],
  };
}

/** Titres h2, dans l'ordre, texte visible. */
const titres = (html: string): string[] => [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => texteVisible(m[1]).trim());

/** Contenu de toutes les balises <style>. */
const styles = (html: string): string => [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');

/** Contenu de la section dont le titre contient `nom`, jusqu'au h2 suivant. */
function section(html: string, nom: string): string {
  const parties = html.split(/<h2[^>]*>/);
  const p = parties.find((x) => texteVisible(x.split('</h2>')[0]).includes(nom));
  return p === undefined ? '' : p.split('</h2>').slice(1).join('</h2>');
}

describe('SECTIONS_NOTE', () => {
  it('les sept sections, dans l ordre de l utilisateur', () => {
    expect(SECTIONS_NOTE.map((s) => s.cle)).toEqual(['geometrie', 'materiaux', 'hypotheses', 'charges', 'combinaisons', 'calculs', 'conclusions']);
    expect(SECTIONS_NOTE.map((s) => s.titre)).toEqual([
      'Géométrie',
      'Matériaux',
      'Hypothèses',
      'Cas de charges',
      'Combinaisons de charges',
      'Calculs et vérifications',
      'Conclusions',
    ]);
  });
});

describe('noteDeCalculHtml — ordre et omission', () => {
  it('ordre fixe, quel que soit l ordre des cles recues, sections numerotees', () => {
    expect(titres(noteDeCalculHtml(noteComplete()))).toEqual([
      '1. Géométrie',
      '2. Matériaux',
      '3. Hypothèses',
      '4. Cas de charges',
      '5. Combinaisons de charges',
      '6. Calculs et vérifications',
      '7. Conclusions',
    ]);
  });

  it('une section absente ou vide n apparait pas ; la numerotation reste continue', () => {
    const n = noteComplete();
    delete n.sections.combinaisons;
    n.sections.charges = [];
    expect(titres(noteDeCalculHtml(n))).toEqual([
      '1. Géométrie',
      '2. Matériaux',
      '3. Hypothèses',
      '4. Calculs et vérifications',
      '5. Conclusions',
    ]);
  });

  it('sans verification, pas de section Conclusions', () => {
    const n = noteComplete();
    n.verifications = [];
    expect(titres(noteDeCalculHtml(n))).not.toContain('7. Conclusions');
    expect(titres(noteDeCalculHtml(n)).some((t) => t.includes('Conclusions'))).toBe(false);
  });

  it('une liste vide ne fait pas exister la section', () => {
    const n = noteComplete();
    n.sections.hypotheses = [{ type: 'liste', items: [] }];
    expect(titres(noteDeCalculHtml(n)).some((t) => t.includes('Hypothèses'))).toBe(false);
  });

  it('une cle conclusions passee dans sections est ignoree : les conclusions ne se saisissent pas', () => {
    const n = noteComplete() as NoteDeCalcul & { sections: Record<string, ElementNote[]> };
    (n.sections as Record<string, ElementNote[]>).conclusions = [{ type: 'liste', items: ['Élément vérifié.'] }];
    const html = noteDeCalculHtml(n);
    expect(texteVisible(html)).not.toContain('Élément vérifié.');
  });
});

describe('noteDeCalculHtml — cartouche et document', () => {
  const html = noteDeCalculHtml(noteComplete(), '.m { fill: red; }');

  it('cartouche : projet, element, norme, date, outil', () => {
    const t = texteVisible(html);
    for (const v of Object.values(CARTOUCHE)) expect(t).toContain(v);
    expect(html).toMatch(/<title>[^<]*Poutre P12, niveau R\+1[^<]*<\/title>/);
  });

  it('document autonome : doctype, lang fr, aucun script ni ressource externe', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toMatch(/<html lang="fr">/);
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/(src|href)="https?:/);
  });

  it('styles : ceux de l app puis STYLE_NOTE, dans la page', () => {
    expect(html).toContain('.m { fill: red; }');
    expect(html).toContain(STYLE_NOTE);
  });

  it('impression : cartouche et numero de page en marge de chaque page, pas de coupure dans un bloc', () => {
    expect(STYLE_NOTE).toMatch(/@page/);
    expect(STYLE_NOTE).toMatch(/break-inside:\s*avoid/);
    expect(html).toMatch(/counter\(page\)/);
    expect(html).toMatch(/counter\(pages\)/);
    // Le cartouche est repete dans la marge : il figure dans les styles, en
    // contenu CSS (`content: "…"`) d'une boite de marge de @page.
    const css = styles(html);
    expect(css).toMatch(/content:\s*"[^"]*Immeuble Les Tilleuls/);
    expect(css).toMatch(/content:\s*"[^"]*Poutre P12, niveau R\+1/);
  });

  it('le cartouche dans la regle @page est echappe pour une chaine CSS', () => {
    const n = noteComplete();
    n.cartouche = { ...CARTOUCHE, projet: 'Projet "A" \\ B', element: '</style><b>x</b>' };
    const h = noteDeCalculHtml(n);
    expect(styles(h)).toContain('Projet \\"A\\" \\\\ B');
    expect(h).not.toContain('</style><b>');
  });

  it('texte echappe et notation rendue partout', () => {
    const n = noteComplete();
    n.cartouche = { ...CARTOUCHE, element: 'Poutre <P12> & co' };
    n.sections.materiaux = [{ type: 'bloc', bloc: { titre: 'f_ck', lignes: [{ symbole: 'gamma_c', libelle: 'coefficient', valeur: '1,5' }], note: null } }];
    const h = noteDeCalculHtml(n);
    expect(h).toContain('Poutre &lt;P12&gt; &amp; co');
    expect(h).not.toContain('<P12>');
    expect(h).toContain('f<sub>ck</sub>');
    expect(h).toContain('γ<sub>c</sub>');
    expect(texteVisible(h)).not.toMatch(/_/);
  });

  it('avertissements : rendus avant la premiere section', () => {
    const n = noteComplete();
    n.avertissements = ['Les données saisies ont changé depuis ce calcul.'];
    const h = noteDeCalculHtml(n);
    const i = h.indexOf('Les données saisies ont changé');
    expect(i).toBeGreaterThan(0);
    expect(i).toBeLessThan(h.search(/<h2/));
  });
});

describe('noteDeCalculHtml — elements', () => {
  const html = noteDeCalculHtml(noteComplete());

  it('bloc sans aucun symbole : pas de colonne symbole vide (2 cellules par ligne)', () => {
    const n = noteComplete();
    n.sections.geometrie = [{ type: 'bloc', bloc: { titre: 'Géométrie', lignes: [{ symbole: '', libelle: 'Forme', valeur: 'rectangle' }, { symbole: '', libelle: 'Aire', valeur: '120 000 mm²' }], note: null } }];
    const g = section(noteDeCalculHtml(n), 'Géométrie');
    for (const tr of g.match(/<tr[\s\S]*?<\/tr>/g) ?? []) expect(tr.match(/<td/g)).toHaveLength(2);
    // Un bloc qui a des symboles garde ses trois colonnes.
    const m = section(html, 'Matériaux');
    expect((m.match(/<tr[\s\S]*?<\/tr>/g) ?? [''])[0].match(/<td/g)).toHaveLength(3);
  });

  it('etape : formule, valeurs substituees, resultat, dans cet ordre, avec la clause', () => {
    const calculs = section(html, 'Calculs');
    const t = texteVisible(calculs);
    const iF = t.indexOf('VRd,s = Asw / s · z · fywd · cot θ');
    const iS = t.indexOf('0,503 · 486 · 435 · 2,5');
    const iR = t.indexOf('265,9 kN');
    expect(iF).toBeGreaterThanOrEqual(0);
    expect(iS).toBeGreaterThan(iF);
    expect(iR).toBeGreaterThan(iS);
    expect(t).toContain('§6.2.3 (6.8)');
  });

  it('figure : le SVG est insere tel quel, dans SA section, avec sa legende', () => {
    expect(section(html, 'Géométrie')).toContain('<line class="g"/>');
    expect(section(html, 'Calculs')).toContain('<rect class="m" width="1" height="1"/>');
    expect(section(html, 'Géométrie')).not.toContain('<rect class="m"');
    expect(texteVisible(section(html, 'Géométrie'))).toContain('Schéma statique');
    expect(section(html, 'Géométrie')).toMatch(/<figure[\s\S]*<svg[\s\S]*<figcaption/);
  });

  it('tableau : en-tetes et cellules', () => {
    const c = section(html, 'Combinaisons');
    expect(c).toMatch(/<th[^>]*>Nom<\/th>/);
    expect(c).toMatch(/<td[^>]*>1,35 G \+ 1,5 Q<\/td>/);
  });

  it('liste : une puce par element', () => {
    const h = section(html, 'Hypothèses');
    expect(h.match(/<li>/g)).toHaveLength(2);
    expect(h).toContain('γ<sub>c</sub> = 1,5');
  });

  it('bloc : titre, lignes et note, motif rendu meme sans ligne', () => {
    const n = noteComplete();
    n.sections.charges = [{ type: 'bloc', bloc: { titre: 'Charges', lignes: [], note: 'Aucune charge.' } }];
    const c = section(noteDeCalculHtml(n), 'Cas de charges');
    expect(texteVisible(c)).toContain('Charges');
    expect(texteVisible(c)).toContain('Aucune charge.');
    expect(texteVisible(section(html, 'Matériaux'))).toContain('5 m');
  });

  it('texte : un paragraphe', () => {
    const n = noteComplete();
    n.sections.geometrie = [{ type: 'texte', texte: 'Poutre sur trois appuis.' }];
    expect(section(noteDeCalculHtml(n), 'Géométrie')).toMatch(/<p[^>]*>Poutre sur trois appuis\.<\/p>/);
  });
});

describe('noteDeCalculHtml — conclusions', () => {
  const html = noteDeCalculHtml(noteComplete());
  const c = section(html, 'Conclusions');
  const t = texteVisible(c);

  it('une ligne par verification, dans l ordre recu, avec clause, taux et verdict', () => {
    expect(c.match(/<tr/g)).toHaveLength(4); // en-tete + 3 verifications
    expect(t.indexOf('Flexion, travée 1')).toBeLessThan(t.indexOf('Effort tranchant, appui 2'));
    expect(t.indexOf('Effort tranchant, appui 2')).toBeLessThan(t.indexOf('Flèche, travée 2'));
    expect(t).toContain('§6.2.3');
  });

  it('taux arrondis vers le verdict, 3 decimales au plus sans zero inutile (tauxAffiche)', () => {
    expect(t).toContain('0,62');
    expect(t).not.toContain('0,620');
    expect(t).toContain('0,999');
    expect(t).toContain('1,001');
    expect(t).not.toContain('1,000');
  });

  it('verdict de chaque ligne : satisfaite / non satisfaite', () => {
    expect(t.match(/non satisfaite/g)).toHaveLength(1);
    expect(t.match(/(?<!non )satisfaite/g)).toHaveLength(2);
  });

  it('verification determinante : le taux le plus eleve', () => {
    expect(t).toMatch(/[Vv]érification déterminante\s*:\s*Flèche, travée 2/);
  });

  it('AUCUN verdict global : la conclusion appartient a l ingenieur', () => {
    expect(t).not.toMatch(/toutes les vérifications/i);
    expect(t).not.toMatch(/(élément|ouvrage|poutre|section)\s+(est\s+)?(vérifiée?|conforme|satisfaisante?)/i);
    expect(t).not.toMatch(/\bconforme\b/i);
  });

  it('taux non fini : « hors domaine », compte comme non satisfaite et determinant', () => {
    const n = noteComplete();
    n.verifications.push({ nom: 'Déversement, zone 3', taux: Number.NaN, ok: false });
    const t2 = texteVisible(section(noteDeCalculHtml(n), 'Conclusions'));
    expect(t2).toContain('hors domaine');
    expect(t2.match(/non satisfaite/g)).toHaveLength(2);
    expect(t2).toMatch(/[Vv]érification déterminante\s*:\s*Déversement, zone 3/);
  });

  it('taux null (verification sans ratio) : « — », verdict selon ok, hors du choix de la determinante', () => {
    const n = noteComplete();
    n.verifications.push({ nom: 'Dispositions constructives', taux: null, ok: true, clause: '§9' });
    n.verifications.push({ nom: 'Espacement des cadres', taux: null, ok: false });
    const t2 = texteVisible(section(noteDeCalculHtml(n), 'Conclusions'));
    expect(t2).toMatch(/Dispositions constructives[\s|]*§9[\s|]*—[\s|]*satisfaite/);
    expect(t2).toMatch(/Espacement des cadres[\s|]*—[\s|]*non satisfaite/);
    expect(t2).not.toContain('hors domaine');
    expect(t2).toMatch(/[Vv]érification déterminante\s*:\s*Flèche, travée 2/);
  });

  it('taux tous null : pas de ligne de verification determinante, le tableau reste', () => {
    const n = noteComplete();
    n.verifications = [{ nom: 'Dispositions constructives', taux: null, ok: true }];
    const t2 = texteVisible(section(noteDeCalculHtml(n), 'Conclusions'));
    expect(t2).toContain('Dispositions constructives');
    expect(t2).not.toMatch(/déterminante/i);
  });

  it('pas de recapitulatif en tete : le tableau n apparait qu une fois, a la fin', () => {
    expect(html.match(/Effort tranchant, appui 2/g)).toHaveLength(1);
    expect(html.lastIndexOf('<h2')).toBeLessThan(html.indexOf('Effort tranchant, appui 2'));
  });
});
