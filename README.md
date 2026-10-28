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
