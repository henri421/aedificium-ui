/**
 * Note de calcul en PDF, composee directement (pdfmake), sans passer par
 * l'impression d'une page web : cartouche encadre en premiere page, en-tete et
 * pied de page sur chaque page, sections numerotees, formules encadrees,
 * verdicts en couleur.
 *
 * `definitionNotePdf` est pure (testable sans navigateur) ; `noteDeCalculPdf`
 * et `telechargerNotePdf` vivent dans le navigateur : ils recopient les styles
 * calcules des figures dans leurs attributs, puis chargent pdfmake au clic
 * seulement (environ 2 Mo avec la police).
 */

import { type BlocResultat } from './csv';
import { tauxAffiche } from './format';
import { langueCourante } from './langue';
import { notationSegments } from './notation';
import { SECTIONS_NOTE, motsNote, type ElementNote, type NoteDeCalcul, type SectionNote, type VerificationNote } from './note';

/** Couleurs de la charte (jetons), en clair pour le PDF. */
const C = {
  texte: '#1a1a1a',
  doux: '#4a4842',
  faible: '#6a6862',
  bordure: '#c8c6c0',
  douce: '#eceae4',
  appui: '#f2f1ec',
  accent: '#1e5aa8',
  accentDoux: '#eaf1f9',
  ok: '#1f6f3f',
  okFond: '#eaf4ee',
  alerte: '#8a6d00',
  alerteFond: '#fdf6e3',
  refus: '#a52121',
  refusFond: '#f8ecec',
};

const TITRES_EN: Record<SectionNote, string> = {
  geometrie: 'Geometry', materiaux: 'Materials', hypotheses: 'Assumptions', charges: 'Load cases',
  combinaisons: 'Load combinations', calculs: 'Calculations and checks', conclusions: 'Conclusions',
};

/** Glyphes absents de la police du PDF, remplaces par un equivalent lisible. */
const SUBSTITUTIONS: [RegExp, string][] = [[/∛/g, '³√'], [/→/g, '->'], [/∈/g, '∊'], [/⌀/g, 'Ø'], [/​/g, '']];
const propre = (s: string): string => SUBSTITUTIONS.reduce((t, [a, b]) => t.replace(a, b), s);

// Types minimaux de la definition pdfmake (le paquet n'en fournit pas).
type Contenu = Record<string, unknown> | string | Contenu[];
export interface DefinitionPdf {
  pageSize: string;
  pageMargins: number[];
  info: Record<string, string>;
  defaultStyle: Record<string, unknown>;
  styles: Record<string, Record<string, unknown>>;
  header: (page: number, total: number) => Contenu;
  footer: (page: number, total: number) => Contenu;
  content: Contenu[];
}

/** Texte a notation (indices, exposants, grecques) en morceaux pdfmake. */
export function textePdf(source: string, style: Record<string, unknown> = {}): Contenu {
  const morceaux = notationSegments(source).map((s) =>
    s.position === 'normal' ? { text: propre(s.texte) } : { text: propre(s.texte), [s.position === 'indice' ? 'sub' : 'sup']: true });
  return { text: morceaux, ...style };
}

/** Filets fins horizontaux, sans traits verticaux. */
const filets = (entete: boolean) => ({
  hLineWidth: (i: number, n: { table: { body: unknown[] } }) => (i === 0 || i === n.table.body.length ? 0 : i === 1 && entete ? 0.8 : 0.4),
  vLineWidth: () => 0,
  hLineColor: (i: number) => (i === 1 && entete ? C.bordure : C.douce),
  paddingLeft: (i: number) => (i === 0 ? 0 : 6),
  paddingRight: () => 6,
  paddingTop: () => 3,
  paddingBottom: () => 3,
});

function bloc(b: BlocResultat): Contenu[] {
  const avecSymbole = b.lignes.some((l) => l.symbole !== '');
  const sortie: Contenu[] = [{ ...(textePdf(b.titre, { style: 'h3' }) as object) }];
  if (b.lignes.length > 0) {
    // Valeurs longues (references d'annexe...) : colonne large, retour a la
    // ligne permis ; sinon elles debordaient de la page.
    const longues = b.lignes.some((l) => l.valeur.length > 28);
    const largeurs = longues ? (avecSymbole ? [70, '30%', '*'] : ['35%', '*']) : (avecSymbole ? [70, '*', 'auto'] : ['*', 'auto']);
    sortie.push({
      table: {
        widths: largeurs,
        body: b.lignes.map((l) => [
          ...(avecSymbole ? [textePdf(l.symbole, { color: C.doux })] : []),
          textePdf(l.libelle),
          textePdf(l.valeur, { alignment: 'right', noWrap: !longues }),
        ]),
      },
      layout: filets(false),
      margin: [0, 0, 0, 4],
    });
  }
  if (b.note !== null) sortie.push(textePdf(b.note, { color: C.doux, margin: [0, 2, 0, 4] }));
  return [{ stack: sortie, unbreakable: b.lignes.length <= 14, margin: [0, 0, 0, 6] }];
}

function etape(e: Extract<ElementNote, { type: 'etape' }>): Contenu {
  const lignes: Contenu[] = [];
  if (e.clause) lignes.push(textePdf(e.clause, { fontSize: 8, color: C.faible, margin: [0, 0, 0, 2] }));
  lignes.push(textePdf(e.formule));
  lignes.push({ text: [{ text: '= ' }, textePdf(e.substituee)] });
  lignes.push({ text: [{ text: '= ' }, textePdf(e.resultat, { bold: true })] });
  return {
    table: { widths: ['*'], body: [[{ stack: lignes, fillColor: C.appui, margin: [8, 5, 8, 5] }]] },
    layout: { hLineWidth: () => 0, vLineWidth: (i: number) => (i === 0 ? 2 : 0), vLineColor: () => C.accent, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
    unbreakable: true,
    margin: [0, 3, 0, 7],
  };
}

function tableau(e: Extract<ElementNote, { type: 'tableau' }>): Contenu {
  const corps = [
    e.entetes.map((h) => textePdf(h, { bold: true, color: C.doux, fontSize: 8.5 })),
    ...e.lignes.map((l) => l.map((c) => textePdf(c))),
  ];
  return {
    stack: [
      ...(e.titre ? [textePdf(e.titre, { style: 'h3' })] : []),
      { table: { headerRows: 1, widths: e.entetes.map(() => '*'), body: corps }, layout: filets(true) },
    ],
    margin: [0, 2, 0, 8],
  };
}

/** Figure : SVG deja autonome (styles recopies dans les attributs). */
function figure(e: Extract<ElementNote, { type: 'figure' }>, svg: string | undefined): Contenu {
  if (!svg) return '';
  const largeur = /viewBox="[\d.\s-]+ ([\d.]+) ([\d.]+)"/.exec(svg);
  const ratio = largeur ? Number(largeur[2]) / Number(largeur[1]) : 0.6;
  // Largeur 380 pt au plus, hauteur 240 pt au plus : une figure tient dans une
  // demi-page et laisse moins de blanc quand elle passe a la page suivante.
  const w = Math.min(380, 240 / ratio);
  return {
    stack: [
      { svg, width: w, alignment: 'center' },
      ...(e.legende ? [textePdf(e.legende, { fontSize: 8.5, italics: true, color: C.faible, alignment: 'center', margin: [0, 4, 0, 0] })] : []),
    ],
    unbreakable: true,
    margin: [0, 4, 0, 10],
  };
}

function element(e: ElementNote, svg: (s: string) => string | undefined): Contenu[] {
  switch (e.type) {
    case 'bloc': return bloc(e.bloc);
    case 'etape': return [etape(e)];
    case 'figure': return [figure(e, svg(e.svg))];
    case 'tableau': return [tableau(e)];
    case 'liste': return [{ ul: e.items.map((i) => textePdf(i)), margin: [0, 0, 0, 6] }];
    case 'texte': return [textePdf(e.texte, { margin: [0, 0, 0, 6] })];
  }
}

function conclusions(v: VerificationNote[]): Contenu[] {
  const m = motsNote();
  const chiffrees = v.filter((x) => x.taux !== null);
  const cle = (x: VerificationNote) => (Number.isFinite(x.taux) ? (x.taux as number) : Infinity);
  const det = chiffrees.length > 0 ? chiffrees.reduce((a, b) => (cle(b) > cle(a) ? b : a)) : null;
  const ok = (x: VerificationNote) => x.ok && (x.taux === null || Number.isFinite(x.taux));
  const taux = (x: VerificationNote) => (x.taux === null ? '—' : tauxAffiche(x.taux));
  const corps = [
    [m.verification, m.clause, m.taux, m.verdict].map((h, i) => ({ text: h, bold: true, color: C.doux, fontSize: 8.5, alignment: i >= 2 ? 'center' : 'left' })),
    ...v.map((x) => [
      textePdf(x.nom),
      textePdf(x.clause ?? '', { color: C.doux }),
      { text: taux(x), alignment: 'center', bold: x === det },
      { text: ok(x) ? m.satisfaite : m.nonSatisfaite, alignment: 'center', bold: true, color: ok(x) ? C.ok : C.refus, fillColor: ok(x) ? C.okFond : C.refusFond },
    ]),
  ];
  const sortie: Contenu[] = [{ table: { headerRows: 1, widths: ['*', 90, 50, 80], body: corps }, layout: filets(true), margin: [0, 2, 0, 8] }];
  if (det !== null) {
    sortie.push({
      table: { widths: ['*'], body: [[{ text: [{ text: `${m.determinante}${m.deuxPoints} `, bold: true }, textePdf(det.nom), { text: ` (${m.taux.toLowerCase()} ${taux(det)})` }], fillColor: C.accentDoux, color: C.texte, margin: [8, 5, 8, 5] }]] },
      layout: 'noBorders',
    });
  }
  // Tableau et encadre de la determinante ensemble : jamais l'encadre seul en page.
  return [{ stack: sortie, unbreakable: v.length <= 20 }];
}

/**
 * Definition pdfmake de la note. `figures` donne, pour le SVG d'un element
 * `figure`, sa version autonome (styles en attributs) ; une figure absente est omise.
 */
export function definitionNotePdf(note: NoteDeCalcul, figures: (svg: string) => string | undefined = () => undefined): DefinitionPdf {
  const c = note.cartouche;
  const m = motsNote();
  const en = langueCourante() === 'en';
  const outil = `${c.outil}${c.version ? ` ${c.version}` : ''}`;
  const cartouche = [
    [m.projet, c.projet],
    [m.element, c.element],
    [m.norme, c.norme],
    [m.outil.charAt(0).toUpperCase() + m.outil.slice(1), `Aedificium · ${outil}`],
    [m.date, c.date],
  ];
  const contenu: Contenu[] = [
    { text: m.note, style: 'titre' },
    textePdf(c.element, { fontSize: 12, color: C.doux, margin: [0, 0, 0, 12] }),
    {
      table: {
        widths: [90, '*'],
        body: cartouche.map(([k, v]) => [
          { text: k, bold: true, color: C.doux, fillColor: C.appui, fontSize: 9 },
          textePdf(v.trim() === '' ? '—' : v),
        ]),
      },
      layout: { hLineWidth: () => 0.6, vLineWidth: () => 0.6, hLineColor: () => C.bordure, vLineColor: () => C.bordure, paddingLeft: () => 7, paddingRight: () => 7, paddingTop: () => 4, paddingBottom: () => 4 },
      margin: [0, 0, 0, 14],
    },
  ];
  for (const a of note.avertissements ?? []) {
    contenu.push({
      table: { widths: ['*'], body: [[{ ...(textePdf(a) as object), color: C.alerte, fillColor: C.alerteFond, margin: [8, 5, 8, 5] }]] },
      layout: { hLineWidth: () => 0, vLineWidth: (i: number) => (i === 0 ? 2 : 0), vLineColor: () => C.alerte, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
      margin: [0, 0, 0, 6],
    });
  }
  let i = 0;
  for (const s of SECTIONS_NOTE) {
    const corps: Contenu[] = s.cle === 'conclusions'
      ? (note.verifications.length ? conclusions(note.verifications) : [])
      : (note.sections[s.cle] ?? []).filter((e) => !(e.type === 'liste' && e.items.length === 0)).flatMap((e) => element(e, figures));
    if (corps.length === 0) continue;
    i += 1;
    // Titre lie a son premier bloc : jamais seul en bas de page.
    const [premier, ...reste] = corps;
    contenu.push({
      stack: [
        { text: `${i}. ${en ? TITRES_EN[s.cle] : s.titre}`, style: 'h2' },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 511, y2: 0, lineWidth: 0.8, lineColor: C.accent }], margin: [0, 0, 0, 8] },
        premier,
      ],
      unbreakable: true,
    });
    contenu.push(...reste);
  }
  const petit = { fontSize: 7.5, color: C.faible };
  return {
    pageSize: 'A4',
    pageMargins: [42, 56, 42, 48],
    info: { title: `${m.note} — ${c.element}`, subject: c.norme, creator: `Aedificium · ${outil}`, producer: 'Aedificium' },
    defaultStyle: { font: 'Roboto', fontSize: 9.5, lineHeight: 1.2, color: C.texte },
    styles: {
      titre: { fontSize: 20, bold: true, color: C.texte, margin: [0, 0, 0, 2] },
      h2: { fontSize: 12.5, bold: true, color: C.accent, margin: [0, 14, 0, 3] },
      h3: { fontSize: 10, bold: true, margin: [0, 6, 0, 3] },
    },
    header: (page) => (page === 1 ? '' : {
      columns: [{ text: `Aedificium · ${outil}`, ...petit }, { ...(textePdf(`${c.projet} — ${c.element}`) as object), ...petit, alignment: 'right' }],
      margin: [42, 24, 42, 0],
    }),
    footer: (page, total) => ({
      stack: [
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 511, y2: 0, lineWidth: 0.4, lineColor: C.bordure }] },
        { columns: [{ text: `${m.note} · ${c.date}`, ...petit }, { text: `${m.page.charAt(0).toUpperCase() + m.page.slice(1)} ${page} / ${total}`, ...petit, alignment: 'right' }], margin: [0, 4, 0, 0] },
      ],
      margin: [42, 14, 42, 0],
    }),
    content: contenu,
  };
}

/** Proprietes de style recopiees des styles calcules vers les attributs SVG. */
const PROPRIETES = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline'];

/**
 * SVG autonome pour le PDF : rendu hors ecran avec les styles de l'app, styles
 * calcules ecrits en attributs (le moteur SVG du PDF ne lit ni CSS ni variables).
 */
export function svgPourPdf(svg: string, styles: string, doc: Document = document): string {
  const hote = doc.createElement('div');
  // Hors ecran mais visible : un `visibility:hidden` serait herite par chaque
  // trace, que la boucle ci-dessous retirerait alors (figures vides).
  hote.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;pointer-events:none';
  hote.setAttribute('aria-hidden', 'true');
  hote.innerHTML = `<style>${styles}</style>${svg}`;
  doc.body.appendChild(hote);
  try {
    const racine = hote.querySelector('svg');
    if (racine === null) return '';
    const vue = doc.defaultView ?? window;
    for (const n of [racine, ...Array.from(racine.querySelectorAll('*'))]) {
      if (n.tagName.toLowerCase() === 'style') continue;
      const cs = vue.getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' && n !== racine) { n.setAttribute('display', 'none'); continue; }
      for (const p of PROPRIETES) {
        const v = cs.getPropertyValue(p);
        if (v && v !== 'normal' && v !== 'auto') n.setAttribute(p, v);
      }
      n.removeAttribute('class');
      n.removeAttribute('style');
    }
    racine.querySelectorAll('style').forEach((s) => s.remove());
    racine.setAttribute('font-family', 'Roboto');
    if (!racine.getAttribute('viewBox')) {
      const w = racine.getAttribute('width');
      const h = racine.getAttribute('height');
      if (w && h) racine.setAttribute('viewBox', `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
    }
    return new XMLSerializer().serializeToString(racine);
  } finally {
    hote.remove();
  }
}

interface PdfMake {
  createPdf: (d: unknown, layouts?: unknown, fonts?: unknown, vfs?: unknown) => { getBlob: (cb: (b: Blob) => void) => void };
}

/** Charge pdfmake et sa police au premier appel seulement. */
async function chargerPdfMake(): Promise<{ pdf: PdfMake; vfs: unknown }> {
  // pdfmake d'abord : sa police s'y enregistre quand il est global.
  // @ts-ignore : pdfmake 0.2 ne fournit pas de types.
  const p = (await import('pdfmake/build/pdfmake')) as Record<string, unknown>;
  // @ts-ignore : idem pour la police embarquee.
  const f = (await import('pdfmake/build/vfs_fonts')) as Record<string, unknown>;
  const g = globalThis as unknown as Record<string, unknown>;
  const aCreate = (x: unknown): x is PdfMake => typeof (x as PdfMake | undefined)?.createPdf === 'function';
  const pdf = [p.default, p, g.pdfMake, g].find(aCreate);
  if (pdf === undefined) throw new Error('pdfmake introuvable');
  const aPolice = (x: unknown): boolean => typeof x === 'object' && x !== null && 'Roboto-Regular.ttf' in x;
  const vfs = [f.default, f, (g.pdfMake as Record<string, unknown> | undefined)?.vfs, (pdf as unknown as Record<string, unknown>).vfs].find(aPolice);
  return { pdf, vfs };
}

/** Note de calcul en PDF (navigateur). `styles` : feuille des dessins de l'app. */
export async function noteDeCalculPdf(note: NoteDeCalcul, styles = ''): Promise<Blob> {
  const cache = new Map<string, string>();
  const figures = (svg: string): string | undefined => {
    if (!svg) return undefined;
    if (!cache.has(svg)) cache.set(svg, svgPourPdf(svg, styles));
    return cache.get(svg) || undefined;
  };
  const definition = definitionNotePdf(note, figures);
  const { pdf, vfs } = await chargerPdfMake();
  return new Promise((resolve) => pdf.createPdf(definition, undefined, undefined, vfs).getBlob(resolve));
}

/** Construit la note PDF et la telecharge sous `nomFichier`. */
export async function telechargerNotePdf(nomFichier: string, note: NoteDeCalcul, styles = ''): Promise<void> {
  const blob = await noteDeCalculPdf(note, styles);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomFichier;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
