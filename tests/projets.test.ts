import { describe, expect, it } from 'vitest';

import {
  ErreurProjet,
  ajouterCalcul,
  ajouterDossier,
  ajouterElement,
  appliquer,
  champsSurcharges,
  cheminDuNoeud,
  creerProjet,
  definirStatut,
  deplacer,
  depotEnMemoire,
  detacherFeuille,
  difference,
  donneesDeFeuille,
  dupliquer,
  dupliquerFeuille,
  ecrireFeuille,
  exporterProjet,
  importerProjet,
  renommer,
  revenirAOrigine,
  supprimerFeuille,
  supprimerNoeud,
  trouverCalcul,
  trouverNoeud,
  type Calcul,
  type Json,
  type Projet,
} from '../src/index';

/** Saisie d'un mur en L, au format de son JSON (valeurs en texte, comme les apps). */
const MUR = {
  format: 'mur-en-l/1',
  generation: '1re',
  geometrie: { hauteur: '2', epaisseurVoile: '0.25', talon: '1.2', patin: '0.4' },
  beton: { classe: 'C25/30' },
  sol: { phi: '30', gamma: '18' },
  bandes: [{ nature: 'Q', q: '10', distance: '0', largeur: '5' }],
} as const;

const APP = { app: 'mur-en-l', adresse: 'https://henri421.github.io/mur-en-l/', nom: 'Mur en L' };

function murEnQuatreFeuilles(): { p: Projet; c: Calcul; ids: string[] } {
  const p = creerProjet('Immeuble rue X');
  const e = ajouterElement(p, null, 'M1 — mur de soutènement');
  const c = ajouterCalcul(p, e.id, APP, MUR as unknown as Json);
  const f1 = c.feuilles[0].id;
  const ids = [f1];
  for (const h of ['2.8', '3.5', '4.2']) {
    const f = dupliquerFeuille(c, f1);
    const d = donneesDeFeuille(c, f.id) as { geometrie: { hauteur: string } };
    d.geometrie.hauteur = h;
    ecrireFeuille(c, f.id, d as unknown as Json);
    ids.push(f.id);
  }
  return { p, c, ids };
}

const hauteur = (c: Calcul, id: string): string => (donneesDeFeuille(c, id) as { geometrie: { hauteur: string } }).geometrie.hauteur;
const classe = (c: Calcul, id: string): string => (donneesDeFeuille(c, id) as { beton: { classe: string } }).beton.classe;

describe('difference et appliquer', () => {
  it('ne garde que les champs changes, et les recompose', () => {
    const v = { ...MUR, geometrie: { ...MUR.geometrie, hauteur: '3' } };
    const d = difference(MUR as unknown as Json, v as unknown as Json);
    expect(d).toEqual({ 'geometrie/hauteur': '3' });
    expect(appliquer(MUR as unknown as Json, d)).toEqual(v);
  });
  it('une liste se surcharge d un bloc', () => {
    const v = { ...MUR, bandes: [] };
    const d = difference(MUR as unknown as Json, v as unknown as Json);
    expect(d).toEqual({ bandes: [] });
    expect(appliquer(MUR as unknown as Json, d)).toEqual(v);
  });
  it('champ retire, champ ajoute, changement de forme', () => {
    const base = { a: 1, b: { c: 2 }, d: 'x' } as Json;
    const v = { b: 5, d: { e: 'y' }, f: true } as Json;
    expect(appliquer(base, difference(base, v))).toEqual(v);
  });
  it('les cles contenant / ou ~ sont echappees', () => {
    const base = { 'a/b': { '~c': 1 } } as Json;
    const v = { 'a/b': { '~c': 2 } } as Json;
    const d = difference(base, v);
    expect(Object.keys(d)).toEqual(['a~1b/~0c']);
    expect(appliquer(base, d)).toEqual(v);
  });
});

describe('heritage des feuilles : le mur en 4 tronçons', () => {
  it('chaque feuille garde sa hauteur, la feuille 2 ne stocke que H', () => {
    const { c, ids } = murEnQuatreFeuilles();
    expect(ids.map((id) => hauteur(c, id))).toEqual(['2', '2.8', '3.5', '4.2']);
    expect(champsSurcharges(c, ids[1])).toEqual(['geometrie/hauteur']);
    expect(champsSurcharges(c, ids[0])).toEqual([]);
  });

  it('changer le beton de la feuille 1 change les 3 autres', () => {
    const { c, ids } = murEnQuatreFeuilles();
    const d = donneesDeFeuille(c, ids[0]) as { beton: { classe: string } };
    d.beton.classe = 'C30/37';
    ecrireFeuille(c, ids[0], d as unknown as Json);
    expect(ids.map((id) => classe(c, id))).toEqual(['C30/37', 'C30/37', 'C30/37', 'C30/37']);
    expect(ids.map((id) => hauteur(c, id))).toEqual(['2', '2.8', '3.5', '4.2']);
  });

  it('une feuille qui surcharge aussi le beton garde le sien', () => {
    const { c, ids } = murEnQuatreFeuilles();
    const d3 = donneesDeFeuille(c, ids[2]) as { beton: { classe: string } };
    d3.beton.classe = 'C35/45';
    ecrireFeuille(c, ids[2], d3 as unknown as Json);
    const d1 = donneesDeFeuille(c, ids[0]) as { beton: { classe: string } };
    d1.beton.classe = 'C30/37';
    ecrireFeuille(c, ids[0], d1 as unknown as Json);
    expect(classe(c, ids[2])).toBe('C35/45');
    expect(classe(c, ids[1])).toBe('C30/37');
  });

  it('revenir a l origine sur H rend la valeur de la feuille 1', () => {
    const { c, ids } = murEnQuatreFeuilles();
    revenirAOrigine(c, ids[1], ['geometrie/hauteur']);
    expect(hauteur(c, ids[1])).toBe('2');
    expect(champsSurcharges(c, ids[1])).toEqual([]);
  });

  it('revenir a l origine sur un groupe retire aussi ses sous-champs', () => {
    const { c, ids } = murEnQuatreFeuilles();
    revenirAOrigine(c, ids[3], ['geometrie']);
    expect(hauteur(c, ids[3])).toBe('2');
  });

  it('detacher puis modifier la feuille 1 : la feuille detachee ne bouge plus', () => {
    const { c, ids } = murEnQuatreFeuilles();
    detacherFeuille(c, ids[1]);
    const d = donneesDeFeuille(c, ids[0]) as { beton: { classe: string } };
    d.beton.classe = 'C30/37';
    ecrireFeuille(c, ids[0], d as unknown as Json);
    expect(classe(c, ids[1])).toBe('C25/30');
    expect(hauteur(c, ids[1])).toBe('2.8');
    expect(classe(c, ids[2])).toBe('C30/37');
  });

  it('supprimer la feuille 1 tant que d autres en heritent est refuse', () => {
    const { c, ids } = murEnQuatreFeuilles();
    expect(() => supprimerFeuille(c, ids[0])).toThrow(ErreurProjet);
    for (const id of ids.slice(1)) detacherFeuille(c, id);
    supprimerFeuille(c, ids[0]);
    expect(c.feuilles).toHaveLength(3);
    expect(c.active).not.toBe(ids[0]);
  });

  it('la derniere feuille ne se supprime pas', () => {
    const { c, ids } = murEnQuatreFeuilles();
    for (const id of ids.slice(1)) supprimerFeuille(c, id);
    expect(() => supprimerFeuille(c, ids[0])).toThrow(/au moins une feuille/);
  });

  it('heritage en chaine : F5 herite de F4 qui herite de F1', () => {
    const { c, ids } = murEnQuatreFeuilles();
    const f5 = dupliquerFeuille(c, ids[3]);
    expect(hauteur(c, f5.id)).toBe('4.2');
    const d = donneesDeFeuille(c, ids[0]) as { sol: { phi: string } };
    d.sol.phi = '32';
    ecrireFeuille(c, ids[0], d as unknown as Json);
    expect((donneesDeFeuille(c, f5.id) as { sol: { phi: string } }).sol.phi).toBe('32');
  });

  it('copie independante, statut, noms suivants', () => {
    const { c, ids } = murEnQuatreFeuilles();
    const f = dupliquerFeuille(c, ids[3], false);
    expect(f.origine).toBeNull();
    expect(f.nom).toBe('Feuille 5');
    definirStatut(c, f.id, 'etude');
    expect(c.feuilles.find((x) => x.id === f.id)?.statut).toBe('etude');
    expect(c.active).toBe(f.id);
  });

  it('un cycle d heritage est detecte', () => {
    const { c, ids } = murEnQuatreFeuilles();
    c.feuilles[0].origine = ids[1];
    expect(() => donneesDeFeuille(c, ids[2])).toThrow(/circulaire/);
  });
});

describe('arborescence du projet', () => {
  function projet(): { p: Projet; r1: string; fond: string; p1: string } {
    const p = creerProjet('Immeuble rue X');
    const r1 = ajouterDossier(p, null, 'R+1').id;
    const fond = ajouterDossier(p, null, 'Fondations').id;
    const p1 = ajouterElement(p, r1, 'P1').id;
    ajouterCalcul(p, p1, { app: 'section-uls', adresse: '', nom: 'Section' }, { b: '300' });
    return { p, r1, fond, p1 };
  }

  it('chemin d un calcul pour le fil d Ariane', () => {
    const { p, p1 } = projet();
    const e = trouverNoeud(p, p1)?.noeud;
    const c = e?.type === 'element' ? e.calculs[0] : null;
    expect(cheminDuNoeud(p, c?.id ?? '')).toEqual(['R+1', 'P1', 'Section']);
  });

  it('deplacer un element, renommer le dossier, exporter et reimporter : tout est identique', () => {
    const { p, fond, p1, r1 } = projet();
    deplacer(p, p1, fond);
    renommer(p, r1, 'Niveau 1');
    const relu = importerProjet(exporterProjet(p));
    expect(relu).toEqual(p);
    expect(cheminDuNoeud(relu, p1)).toEqual(['Fondations', 'P1']);
  });

  it('un dossier n entre pas dans un de ses sous-dossiers', () => {
    const { p, r1 } = projet();
    const sous = ajouterDossier(p, r1, 'Zone A').id;
    expect(() => deplacer(p, r1, sous)).toThrow(ErreurProjet);
    expect(() => deplacer(p, r1, r1)).toThrow(ErreurProjet);
  });

  it('dupliquer un element : copies independantes, heritage interne conserve', () => {
    const { p, c, ids } = murEnQuatreFeuilles();
    const e = p.enfants[0];
    const idCopie = dupliquer(p, e.id);
    const copieE = trouverNoeud(p, idCopie)?.noeud;
    if (copieE?.type !== 'element') throw new Error('copie absente');
    const cc = copieE.calculs[0];
    expect(cc.id).not.toBe(c.id);
    expect(cc.feuilles.map((f) => f.id)).not.toContain(ids[0]);
    // L'heritage interne pointe vers la copie de la feuille 1, pas vers l'original.
    expect(cc.feuilles[1].origine).toBe(cc.feuilles[0].id);
    const d = donneesDeFeuille(c, ids[0]) as { beton: { classe: string } };
    d.beton.classe = 'C30/37';
    ecrireFeuille(c, ids[0], d as unknown as Json);
    expect(classe(cc, cc.feuilles[1].id)).toBe('C25/30');
    expect(copieE.nom).toBe('M1 — mur de soutènement (copie)');
  });

  it('supprimer un calcul puis un dossier', () => {
    const { p, p1, r1 } = projet();
    const e = trouverNoeud(p, p1)?.noeud;
    if (e?.type !== 'element') throw new Error();
    supprimerNoeud(p, e.calculs[0].id);
    expect(e.calculs).toHaveLength(0);
    supprimerNoeud(p, r1);
    expect(trouverNoeud(p, p1)).toBeNull();
  });

  it('import : format inconnu ou arbre incoherent refuses net', () => {
    expect(() => importerProjet('pas du json')).toThrow(/illisible/);
    expect(() => importerProjet('{"format":"autre/1"}')).toThrow(/Format inconnu/);
    const { p } = murEnQuatreFeuilles();
    const t = JSON.parse(exporterProjet(p));
    t.enfants[0].calculs[0].feuilles[1].origine = 'absente';
    expect(() => importerProjet(JSON.stringify(t))).toThrow(/incohérent/);
  });

  it('trouverCalcul retrouve l element', () => {
    const { p, c } = murEnQuatreFeuilles();
    expect(trouverCalcul(p, c.id)?.element.nom).toBe('M1 — mur de soutènement');
  });
});

describe('depot en memoire', () => {
  it('ecrire, lister, lire, supprimer', async () => {
    const d = depotEnMemoire();
    const { p } = murEnQuatreFeuilles();
    await d.ecrire(p);
    expect((await d.lister()).map((x) => x.nom)).toEqual(['Immeuble rue X']);
    expect(await d.lire(p.id)).toEqual(p);
    await d.supprimer(p.id);
    expect(await d.lire(p.id)).toBeNull();
  });
});
