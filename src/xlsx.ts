/**
 * Archive ZIP « stored » (sans compression) et utilitaires du format .xlsx.
 *
 * Un .xlsx est une archive ZIP de fichiers XML (Office Open XML). Les
 * fichiers sont STOCKES sans compression : l'archive est un peu plus grosse,
 * mais aucune bibliotheque n'est necessaire, et Excel l'ouvre sans
 * avertissement. Repris de combinaisons-actions (app/src/xlsx.ts).
 *
 * Fonctions PURES : elles rendent des octets, le telechargement vit ailleurs.
 */

const TABLE_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** CRC-32 (polynome 0xEDB88320), celui qu'exige le format ZIP. */
export function crc32(octets: Uint8Array): number {
  let c = 0xffffffff;
  for (const o of octets) c = TABLE_CRC[(c ^ o) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const SIGNATURE_LOCALE = 0x04034b50;
const SIGNATURE_CENTRALE = 0x02014b50;
const SIGNATURE_FIN = 0x06054b50;

class Tampon {
  octets: number[] = [];
  u16(v: number): void {
    this.octets.push(v & 0xff, (v >>> 8) & 0xff);
  }
  u32(v: number): void {
    this.octets.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
  }
  ajouter(o: Uint8Array | number[]): void {
    for (const x of o) this.octets.push(x);
  }
}

/** Archive ZIP de fichiers stockes sans compression, noms en UTF-8. */
export function zipSansCompression(fichiers: ReadonlyArray<{ nom: string; contenu: string }>): Uint8Array {
  const encodeur = new TextEncoder();
  const corps = new Tampon();
  const central = new Tampon();
  for (const f of fichiers) {
    const nom = encodeur.encode(f.nom);
    const donnees = encodeur.encode(f.contenu);
    const crc = crc32(donnees);
    const decalage = corps.octets.length;
    // En-tete local : signature, version 2.0, drapeau UTF-8 (bit 11), methode 0, date fixe.
    corps.u32(SIGNATURE_LOCALE);
    corps.u16(20);
    corps.u16(0x0800);
    corps.u16(0);
    corps.u16(0);
    corps.u16(0x21);
    corps.u32(crc);
    corps.u32(donnees.length);
    corps.u32(donnees.length);
    corps.u16(nom.length);
    corps.u16(0);
    corps.ajouter(nom);
    corps.ajouter(donnees);
    // Entree du repertoire central.
    central.u32(SIGNATURE_CENTRALE);
    central.u16(20);
    central.u16(20);
    central.u16(0x0800);
    central.u16(0);
    central.u16(0);
    central.u16(0x21);
    central.u32(crc);
    central.u32(donnees.length);
    central.u32(donnees.length);
    central.u16(nom.length);
    central.u16(0);
    central.u16(0);
    central.u16(0);
    central.u16(0);
    central.u32(0);
    central.u32(decalage);
    central.ajouter(nom);
  }
  const debutCentral = corps.octets.length;
  const fin = new Tampon();
  fin.u32(SIGNATURE_FIN);
  fin.u16(0);
  fin.u16(0);
  fin.u16(fichiers.length);
  fin.u16(fichiers.length);
  fin.u32(central.octets.length);
  fin.u32(debutCentral);
  fin.u16(0);
  return Uint8Array.from([...corps.octets, ...central.octets, ...fin.octets]);
}

/**
 * Fichiers d'une archive produite par `zipSansCompression`, dans l'ordre.
 * Leve si une entree est compressee ou si un CRC est faux.
 */
export function lireZipSansCompression(octets: Uint8Array): Map<string, string> {
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
  const decodeur = new TextDecoder('utf-8');
  const fichiers = new Map<string, string>();
  let p = 0;
  while (p + 30 <= octets.length && vue.getUint32(p, true) === SIGNATURE_LOCALE) {
    const methode = vue.getUint16(p + 8, true);
    const crc = vue.getUint32(p + 14, true);
    const taille = vue.getUint32(p + 18, true);
    const longueurNom = vue.getUint16(p + 26, true);
    const longueurExtra = vue.getUint16(p + 28, true);
    const nom = decodeur.decode(octets.subarray(p + 30, p + 30 + longueurNom));
    if (methode !== 0) throw new Error(`Archive : ${nom} est compresse (methode ${methode}) ; seule la methode 0 est lue.`);
    const debut = p + 30 + longueurNom + longueurExtra;
    const donnees = octets.subarray(debut, debut + taille);
    if (crc32(donnees) !== crc) throw new Error(`Archive : CRC faux pour ${nom}.`);
    fichiers.set(nom, decodeur.decode(donnees));
    p = debut + taille;
  }
  return fichiers;
}

/** Lettre(s) de colonne : 0 -> A, 25 -> Z, 26 -> AA. */
export function colonneXlsx(indice: number): string {
  let n = indice + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Texte admis en XML 1.0, echappe. */
export function echapperXml(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
}
