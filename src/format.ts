/**
 * Mise en forme des nombres et du texte, a la francaise.
 */

/** Echappement de tout texte insere dans du HTML ou du SVG. */
export function echapper(valeur: string): string {
  return valeur
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Nombre a la francaise, virgule decimale.
 *
 * Un NaN ou un infini ne doit JAMAIS atteindre l'ecran : il s'y lirait comme
 * une valeur alors qu'il signale une absence de valeur. On rend un tiret. Un
 * « -0,00 » n'a pas de sens : le signe tombe.
 */
export function nombreFr(valeur: number, decimales: number): string {
  if (!Number.isFinite(valeur)) return '—';
  const texte = valeur.toFixed(decimales).replace('.', ',');
  return /^-0(,0*)?$/.test(texte) ? texte.slice(1) : texte;
}

/**
 * Nombre lu depuis un champ de saisie, ou `null`.
 *
 * La virgule decimale est acceptee. L'infini est refuse : il traverserait sans
 * bruit les tests de finitude d'un noyau et ressortirait en resultat.
 */
export function lireNombre(texte: string): number | null {
  const nettoye = texte.trim().replace(',', '.');
  if (nettoye === '') return null;
  const valeur = Number(nettoye);
  return Number.isFinite(valeur) ? valeur : null;
}

/**
 * Taux de travail arrondi VERS LE VERDICT : par defaut sous 1, par exces
 * au-dessus, virgule decimale.
 *
 * Le piege : 0,9996 arrondi au plus proche s'ecrit « 1,000 » a cote d'un
 * verdict favorable, 1,0004 aussi a cote d'un verdict defavorable. Dans les
 * deux cas le nombre contredit la conclusion. L'egalite exacte reste « 1,000 ».
 */
export function tauxFr(taux: number, decimales = 3): string {
  if (!Number.isFinite(taux)) return 'hors domaine';
  if (taux === 1) return nombreFr(1, decimales);
  const f = 10 ** decimales;
  const arrondi = taux < 1 ? Math.floor(taux * f) / f : Math.ceil(taux * f) / f;
  return nombreFr(arrondi, decimales);
}
