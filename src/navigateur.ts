/**
 * Les seuls points qui touchent au navigateur pour faire sortir un document.
 * Aucune donnee ne quitte le poste : il n'y a ni serveur ni requete reseau.
 */

/** Telecharge un contenu texte sous le nom donne. */
export function telecharger(nomFichier: string, contenu: string, typeMime: string): void {
  const blob = new Blob([contenu], { type: typeMime });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  URL.revokeObjectURL(url);
}

/**
 * Ouvre un document HTML dans un nouvel onglet, ou le telecharge si
 * l'ouverture est bloquee.
 *
 * L'ouverture d'onglet est bloquee par defaut chez beaucoup d'utilisateurs :
 * un bouton qui ne fait rien SANS RIEN DIRE est pire qu'un telechargement
 * inattendu. Rend `true` si l'onglet a ete ouvert.
 */
export function ouvrirOuTelecharger(nomFichier: string, html: string): boolean {
  let onglet: Window | null = null;
  try {
    onglet = window.open('', '_blank') ?? null;
  } catch {
    onglet = null;
  }
  if (onglet !== null) {
    try {
      onglet.document.write(html);
      onglet.document.close();
      return true;
    } catch {
      // repli ci-dessous
    }
  }
  telecharger(nomFichier, html, 'text/html;charset=utf-8');
  return false;
}
