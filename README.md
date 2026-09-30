# aedificium-ui

Primitives d'interface communes aux outils de calcul de la suite
[Aedificium web](https://henri421.github.io/WebAedificium/) : `section-uls`,
`poinconnement`, `assemblages-ec3`.

Seulement ce qui doit se comporter **à l'identique** d'un outil à l'autre :

| Primitive | Rôle |
| --- | --- |
| `JETONS`, `valeursDesJetons` | bloc `:root` de l'identité graphique, embarqué dans les documents exportés |
| `echapper` | échappement HTML/SVG |
| `nombreFr`, `lireNombre` | nombres à la française ; jamais de NaN ni de « -0 » à l'écran |
| `tauxFr` | taux arrondi **vers le verdict** : jamais « 1,000 » à côté d'un verdict contraire |
| `svgAutonome` | dessin exporté avec ses styles en ligne |
| `csv`, `resultatsEnCsv` | CSV pour tableur français (point-virgule, BOM, aucun bloc omis) |
| `telecharger`, `ouvrirOuTelecharger` | sortie des documents, sans serveur |

Les formulaires, la persistance et les vues restent propres à chaque outil.
La décision est motivée dans `WebAedificium/DECISION-interface-commune.md`.

## Utilisation

Dépendance Git épinglée sur une étiquette, en `devDependencies` : Vite
l'embarque à la construction, aucun outil n'a de dépendance de production.

```json
"devDependencies": { "aedificium-ui": "github:henri421/aedificium-ui#v1.0.0" }
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
