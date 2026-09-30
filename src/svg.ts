/**
 * SVG autonome : un dessin de la page, rendu lisible hors d'elle.
 */

const DECLARATION_XML = '<?xml version="1.0" encoding="UTF-8"?>';
const NAMESPACE_SVG = 'http://www.w3.org/2000/svg';

/** Les styles voyagent dans un CDATA : ils contiennent des `>` et des `&`. */
function baliseStyle(styles: string): string {
  return `<style type="text/css"><![CDATA[\n${styles}\n]]></style>`;
}

/**
 * Enveloppe un SVG de la page dans un document autonome, styles INLINES.
 *
 * `styles` doit porter les jetons ET les regles de peinture du dessin : les
 * jetons seuls definissent des couleurs sans en appliquer aucune, et le
 * dessin sortirait en aplat noir.
 *
 * N'en retient que le SVG : ce que la page place autour est du HTML, et le
 * laisser casserait le XML. Rien d'exploitable : un document vide mais VALIDE,
 * plutot qu'un fichier tronque que le lecteur ne saurait pas ouvrir.
 */
export function svgAutonome(svg: string, styles: string): string {
  const debut = /<svg\b[^>]*>/i.exec(svg);
  const fin = svg.lastIndexOf('</svg>');
  if (debut === null || fin < debut.index) {
    return `${DECLARATION_XML}\n<svg xmlns="${NAMESPACE_SVG}">${baliseStyle(styles)}</svg>`;
  }
  const ouverture = /\bxmlns\s*=/.test(debut[0])
    ? debut[0]
    : debut[0].replace(/^<svg\b/i, `<svg xmlns="${NAMESPACE_SVG}"`);
  return `${DECLARATION_XML}\n${ouverture}${baliseStyle(styles)}${svg.slice(debut.index + debut[0].length, fin)}</svg>`;
}
