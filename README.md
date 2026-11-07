# aedificium-ui

Primitives d'interface communes aux outils de calcul de la suite
[Aedificium web](https://henri421.github.io/WebAedificium/) : `section-uls`,
`poinconnement`, `assemblages-ec3`.

Seulement ce qui doit se comporter **à l'identique** d'un outil à l'autre :

| Primitive | Rôle |
| --- | --- |
| `JETONS`, `valeursDesJetons` | bloc `:root` de l'identité graphique, embarqué dans les documents exportés |
| `echapper` | échappement HTML/SVG |
| `nombreAffiche` | nombre affiché : 3 décimales au plus, sans zéros inutiles (`1,2`, `0`) |
| `tauxAffiche` | taux arrondi vers le verdict, sans zéros inutiles (`0,999`, `1`) |
| `notationHtml` | notation en HTML sûr : `M_Ed` → `M<sub>Ed</sub>`, `sigma_s` → `σ<sub>s</sub>`, `mm2` → `mm²` |
| `notationSvg` | notation dans un `<text>` SVG, décalages par `dy` : `l_0^2` |
| `notationTexte` | notation en texte brut (CSV) : `M_Ed` → `MEd`, `gamma_M0` → `γM0` |
| `nombreFr`, `lireNombre` | nombres à la française ; jamais de NaN ni de « -0 » à l'écran |
| `tauxFr` | taux arrondi **vers le verdict** : jamais « 1,000 » à côté d'un verdict contraire |
| `svgAutonome` | dessin exporté avec ses styles en ligne |
| `csv`, `resultatsEnCsv` | CSV pour tableur français (point-virgule, BOM, aucun bloc omis) |
| `telecharger`, `ouvrirOuTelecharger` | sortie des documents, sans serveur |

Les formulaires, la persistance et les vues restent propres à chaque outil.
La décision est motivée dans `WebAedificium/DECISION-interface-commune.md`.

## Langue

Depuis la v1.5.0, chaque app existe en français (`index.html`) et en anglais
(`en/index.html`), avec une seule compilation. Au démarrage, l'app appelle
`definirLangue(langueDuDocument(document))` avant tout rendu ; les nombres
(point décimal en anglais), le CSV (virgule en séparateur en anglais) et la
note suivent alors la langue. `lienDeLangue` donne le bouton FR / EN de la barre ;
`traducteur` traduit les phrases du noyau de calcul, et
`constatsAffichage(texte, { langue: 'en' })` y chasse les restes de français.

## Projets et feuilles de calcul (v1.6.0)

Deuxième exception à la règle : la persistance des **projets de la suite**
(étape 9.5 du plan). Toutes les apps sont publiées sur la même origine
(`henri421.github.io`) et partagent une base IndexedDB `aedificium`.

- `src/projets.ts` : moteur pur, sans import. Arborescence projet → dossiers →
  éléments → calculs (une app) → feuilles. Une feuille est complète, ou
  **héritée** d'une autre : elle ne stocke que ce qui diffère (`surcharges`,
  chemin JSON → valeur) et suit sa feuille d'origine pour le reste. Fichier
  `aedificium-projet/1`.
- `src/projets-stockage.ts` : dépôt IndexedDB partagé, dépôt en mémoire.
- `src/feuilles-dom.ts` : `brancherFeuilles({ app, nomApp, conteneur, lire,
  charger, libelle?, marquer? })`, la barre des feuilles d'une app (onglets,
  dupliquer, copie indépendante, statut à justifier / étude, détacher,
  champs propres avec retour à l'origine, « Ranger dans un projet… »).
  L'app appelle `barre.signaler()` après chaque saisie.

Le hub (sans compilation) charge une copie de `projets.ts` et
`projets-stockage.ts` sans types, générée par `_banc-local/copier-projets.mjs`.

## Éditeur de dessin

Seule exception à cette règle : l'éditeur de nœuds et de barres, commun à MBT et à
equilibre-statique (`src/editeur.ts` pour la logique pure, `src/editeur-dom.ts`
pour le branchement des événements). Il ne dessine rien et ne garde pas le modèle :
il traduit le pointeur et le clavier en actions ; l'app tient l'état et redessine.
Voir [`PLAN.md`](PLAN.md).

## Utilisation

Dépendance Git épinglée sur une étiquette, en `devDependencies` : Vite
l'embarque à la construction, aucun outil n'a de dépendance de production.

```json
"devDependencies": { "aedificium-ui": "github:henri421/aedificium-ui#v1.1.0" }
```

Le paquet expose ses sources TypeScript (`exports` → `src/index.ts`) : pas
d'étape de construction, le typage strict du consommateur s'y applique.

## Développement

```bash
npm install
npm test
npm run typecheck
```

## Licence

MIT — voir [LICENSE](LICENSE), sans garantie d'aucune sorte.
