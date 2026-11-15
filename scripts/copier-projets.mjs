// Copie des modules d'aedificium-ui, sans leurs types, dans les outils sans
// compilation (hub, schema-statique, regard) : audit du 10/11/2026, R12.
//
// Source unique : src/<nom>.ts. Les copies portent un en-tete « GENERE » et ne
// se modifient pas a la main.
//
//   node scripts/copier-projets.mjs <dossier> <nom>...           ecrit les copies
//   node scripts/copier-projets.mjs --verif <dossier> <nom>...   compare, code 1 si une copie differe
//
// Exemple (CI du hub) : node ../ui/scripts/copier-projets.mjs --verif projets projets projets-stockage
// Necessite Node >= 22.13 (stripTypeScriptTypes).
import { stripTypeScriptTypes } from 'node:module';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('../src/', import.meta.url));
const normal = (t) => t.replace(/\r\n/g, '\n');

/** Le JavaScript genere pour le module `nom`, en-tete compris. */
export function genere(nom) {
  const ts = readFileSync(join(src, `${nom}.ts`), 'utf8');
  let js = stripTypeScriptTypes(ts, { mode: 'strip' });
  js = js.replace(/from '\.\/(projets|projets-stockage|langue)'/g, "from './$1.js'");
  const tete = `// GENERE depuis aedificium-ui/src/${nom}.ts par aedificium-ui/scripts/copier-projets.mjs.
// Ne pas modifier a la main.
`;
  return normal(tete + js);
}

/** Ecrit (ou compare) les copies ; rend la liste des modules qui differaient. */
export function copier(dossier, noms, verifSeulement = false) {
  const differents = [];
  if (!verifSeulement) mkdirSync(dossier, { recursive: true });
  for (const nom of noms) {
    const cible = join(dossier, `${nom}.js`);
    const attendu = genere(nom);
    const actuel = existsSync(cible) ? normal(readFileSync(cible, 'utf8')) : null;
    if (actuel === attendu) continue;
    differents.push(nom);
    if (!verifSeulement) writeFileSync(cible, attendu);
  }
  return differents;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const verif = args[0] === '--verif';
  const [dossier, ...noms] = verif ? args.slice(1) : args;
  if (!dossier || noms.length === 0) {
    console.error('usage : node scripts/copier-projets.mjs [--verif] <dossier> <nom>...');
    process.exit(2);
  }
  const d = copier(dossier, noms, verif);
  if (d.length === 0) console.log(`${dossier} : copies a jour (${noms.join(', ')})`);
  else if (verif) {
    console.error(`${dossier} : copies perimees (${d.join(', ')}) ; regenerer avec node scripts/copier-projets.mjs ${dossier} ${noms.join(' ')}`);
    process.exitCode = 1;
  } else console.log(`${dossier} : ecrit ${d.join(', ')}`);
}
