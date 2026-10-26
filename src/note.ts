import { type BlocResultat } from './csv';
import { echapper, tauxAffiche } from './format';
import { JETONS } from './jetons';
import { notationHtml } from './notation';

/** Ordre fixe des sections de la note. */
export type SectionNote = 'geometrie' | 'materiaux' | 'hypotheses' | 'charges' | 'combinaisons' | 'calculs' | 'conclusions';
export const SECTIONS_NOTE: readonly { cle: SectionNote; titre: string }[] = [
  { cle: 'geometrie', titre: 'Géométrie' },
  { cle: 'materiaux', titre: 'Matériaux' },
  { cle: 'hypotheses', titre: 'Hypothèses' },
  { cle: 'charges', titre: 'Cas de charges' },
  { cle: 'combinaisons', titre: 'Combinaisons de charges' },
  { cle: 'calculs', titre: 'Calculs et vérifications' },
  { cle: 'conclusions', titre: 'Conclusions' },
];
export type ElementNote =
  | { type: 'bloc'; bloc: BlocResultat }
  | { type: 'etape'; formule: string; substituee: string; resultat: string; clause?: string }
  | { type: 'figure'; svg: string; legende?: string }
  | { type: 'tableau'; titre?: string; entetes: string[]; lignes: string[][] }
  | { type: 'liste'; items: string[] }
  | { type: 'texte'; texte: string };
/** `taux: null` : verification sans ratio (dispositions constructives…), jugee sur `ok` seul. */
export interface VerificationNote { nom: string; taux: number | null; ok: boolean; clause?: string }
export interface CartoucheNote { projet: string; element: string; date: string; norme: string; outil: string }
export interface NoteDeCalcul {
  cartouche: CartoucheNote;
  sections: Partial<Record<Exclude<SectionNote, 'conclusions'>, ElementNote[]>>;
  verifications: VerificationNote[];
  avertissements?: string[];
}

/**
 * Feuille de la note : jetons communs, mise en page d'ecran et d'impression.
 * Les jetons sont inclus pour que la note reste lisible meme sans styles de l'app.
 */
export const STYLE_NOTE = `${JETONS}
@page { size: A4; margin: 18mm 16mm 20mm; }
body {
  margin: 0 auto;
  max-width: 190mm;
  padding: 12mm 10mm;
  background: var(--surface);
  color: var(--texte);
  font-family: var(--sans);
  font-size: 10.5pt;
  line-height: 1.45;
}
header { margin-bottom: 1.2em; border-bottom: 2px solid var(--bordure); padding-bottom: 0.6em; }
header h1 { margin: 0 0 0.4em; font-size: 1.6em; }
header p { margin: 0.1em 0; color: var(--texte-doux); }
h2 { font-family: var(--sans); font-size: 1.2em; margin: 1.4em 0 0.5em; padding-bottom: 0.2em; border-bottom: 1px solid var(--bordure-douce); break-after: avoid; }
h3 { font-family: var(--sans); font-size: 1em; margin: 1em 0 0.4em; }
p { margin: 0.4em 0; }
.avertissement { color: var(--alerte); background: var(--alerte-fond); border-left: 3px solid var(--alerte); padding: 0.5em 0.8em; margin: 0.6em 0; }
.bloc, .etape, figure, table { break-inside: avoid; }
.etape { font-family: var(--mono); background: var(--surface-appui); border-left: 3px solid var(--bordure); padding: 0.4em 0.8em; margin: 0.6em 0; }
.etape .clause { display: block; color: var(--texte-faible); font-family: var(--sans); font-size: 0.9em; margin-bottom: 0.2em; }
figure { margin: 0.8em 0; text-align: center; }
figcaption { color: var(--texte-faible); font-size: 0.9em; margin-top: 0.3em; }
table { border-collapse: collapse; width: 100%; margin: 0.6em 0; }
caption { text-align: left; font-weight: 600; padding-bottom: 0.3em; }
th, td { text-align: left; padding: 0.3em 0.5em; border-bottom: 1px solid var(--bordure-douce); vertical-align: top; }
th { font-family: var(--sans); font-weight: 600; border-bottom-color: var(--bordure); }
.bloc table td:first-child { font-family: var(--mono); white-space: nowrap; }
ul { margin: 0.5em 0; padding-left: 1.4em; }
@media print { body { max-width: none; padding: 0; } }`;

/** Raccourci d'echappement du texte affiche. */
const n = notationHtml;
/** Echappe un texte insere dans une chaine CSS. */
const css = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/</g, '\\3c ').replace(/\n/g, '\\a ');

/** Rend un element de section. */
function el(e: ElementNote): string {
  switch (e.type) {
    case 'bloc': return `<section class="bloc"><h3>${n(e.bloc.titre)}</h3>${e.bloc.lignes.length ? `<table>${e.bloc.lignes.map((l) => `<tr><td>${n(l.symbole)}</td><td>${n(l.libelle)}</td><td>${n(l.valeur)}</td></tr>`).join('')}</table>` : ''}${e.bloc.note === null ? '' : `<p>${n(e.bloc.note)}</p>`}</section>`;
    case 'etape': return `<div class="etape">${e.clause ? `<span class="clause">${n(e.clause)}</span>` : ''}<div>${n(e.formule)}</div><div>= ${n(e.substituee)}</div><div>= ${n(e.resultat)}</div></div>`;
    case 'figure': return `<figure>${e.svg}${e.legende ? `<figcaption>${n(e.legende)}</figcaption>` : ''}</figure>`;
    case 'tableau': return `<table>${e.titre ? `<caption>${n(e.titre)}</caption>` : ''}<tr>${e.entetes.map((h) => `<th>${n(h)}</th>`).join('')}</tr>${e.lignes.map((l) => `<tr>${l.map((c) => `<td>${n(c)}</td>`).join('')}</tr>`).join('')}</table>`;
    case 'liste': return `<ul>${e.items.map((i) => `<li>${n(i)}</li>`).join('')}</ul>`;
    case 'texte': return `<p>${n(e.texte)}</p>`;
  }
}

/** Une liste vide ne fait pas une section. */
const vide = (e: ElementNote) => e.type === 'liste' && e.items.length === 0;

/** Tableau des verifications et verification determinante. */
function conclusions(v: VerificationNote[]): string {
  // Un taux null ne concourt pas : sans ratio, rien a comparer.
  const chiffrees = v.filter((x) => x.taux !== null);
  const cle = (x: VerificationNote) => (Number.isFinite(x.taux) ? (x.taux as number) : Infinity);
  const det = chiffrees.length > 0 ? chiffrees.reduce((a, b) => (cle(b) > cle(a) ? b : a)) : null;
  const ok = (x: VerificationNote) => x.ok && (x.taux === null || Number.isFinite(x.taux));
  const taux = (x: VerificationNote) => (x.taux === null ? '—' : tauxAffiche(x.taux));
  const ligneDet = det === null ? '' : `<p>Vérification déterminante : ${n(det.nom)} (taux ${taux(det)})</p>`;
  return `<table><tr><th>Vérification</th><th>Clause</th><th>Taux</th><th>Verdict</th></tr>${v.map((x) => `<tr><td>${n(x.nom)}</td><td>${n(x.clause ?? '')}</td><td>${taux(x)}</td><td>${ok(x) ? 'satisfaite' : 'non satisfaite'}</td></tr>`).join('')}</table>${ligneDet}`;
}

/** Compose la note de calcul HTML complete. */
export function noteDeCalculHtml(note: NoteDeCalcul, styles = ''): string {
  const c = note.cartouche;
  let i = 0;
  // Sections dans l'ordre fixe ; une section sans contenu disparait.
  const corps = SECTIONS_NOTE.map((s) => {
    const contenu = s.cle === 'conclusions' ? (note.verifications.length ? conclusions(note.verifications) : '') : (note.sections[s.cle] ?? []).filter((e) => !vide(e)).map(el).join('');
    return contenu === '' ? '' : `<section class="partie"><h2>${++i}. ${s.titre}</h2>${contenu}</section>`;
  }).join('');
  // Boites de marge de la page imprimee.
  const marge = `@page { @bottom-left { content: "${css(c.projet)} — ${css(c.element)}"; } @bottom-right { content: "page " counter(page) " / " counter(pages); } }`;
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8" /><title>Note de calcul — ${echapper(c.element)}</title>
<style>${styles}
${STYLE_NOTE}
${marge}</style></head><body>
<header><h1>Note de calcul</h1><p>Projet : ${n(c.projet)}</p><p>Élément : ${n(c.element)}</p><p>Norme : ${n(c.norme)}</p><p>Date : ${n(c.date)} · outil ${n(c.outil)}</p></header>
${(note.avertissements ?? []).map((a) => `<p class="avertissement">${n(a)}</p>`).join('')}
${corps}
</body></html>`;
}
