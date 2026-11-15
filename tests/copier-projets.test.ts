// Copies sans types pour les outils sans compilation (audit R12).
import { describe, expect, it } from 'vitest';
// @ts-expect-error module JavaScript sans declaration de types
import { genere } from '../scripts/copier-projets.mjs';

describe('scripts/copier-projets.mjs', () => {
  it('rend un module JavaScript avec son en-tete, sans annotation de type', () => {
    const js: string = genere('projets-stockage');
    expect(js.startsWith('// GENERE depuis aedificium-ui/src/projets-stockage.ts par aedificium-ui/scripts/copier-projets.mjs.')).toBe(true);
    expect(js).toContain("from './projets.js'");
    expect(js).not.toMatch(/\binterface\s+\w+\s*\{/);
  });
});
