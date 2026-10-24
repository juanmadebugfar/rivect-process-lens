import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test as base, expect, type Page } from '@playwright/test';

/** Fixture: falla cualquier prueba que produzca errores o avisos de consola. */
export const test = base.extend<{ app: Page; consoleProblems: string[] }>({
  consoleProblems: async ({}, use) => {
    await use([]);
  },
  app: async ({ page, consoleProblems }, use) => {
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') consoleProblems.push(`${m.type()}: ${m.text()}`);
    });
    page.on('pageerror', (e) => consoleProblems.push(`pageerror: ${e.message}`));
    await page.goto('/');
    await page.waitForSelector('[data-testid=stage-node]');
    await use(page);
    expect(consoleProblems, 'errores de consola').toEqual([]);
  },
});

export { expect };

/** Texto numérico es-UY ("1.234,5") → número. */
export function num(text: string | null): number {
  const t = (text ?? '').replace('\u2212', '-');
  const m = t.match(/-?[\d.]+(?:,\d+)?/);
  if (!m) return NaN;
  const n = Number(m[0].replace(/\./g, '').replace(',', '.'));
  return /-\s*[^\d]*\d/.test(t.slice(0, (m.index ?? 0) + 1)) && !m[0].startsWith('-') ? -n : n;
}

export async function openProject(page: Page, name: RegExp | string) {
  const item = page.getByTestId('project-item').filter({ hasText: name });
  // En pantallas angostas la lista de procesos es un panel que se abre con un botón.
  if (!(await item.isVisible())) await page.locator('.nav-toggle').click();
  await item.click();
  await page.waitForSelector('[data-testid=stage-node]');
}

export async function gotoTab(page: Page, tab: 'proceso' | 'hallazgos' | 'escenario' | 'supuestos' | 'diagnostico') {
  await page.getByTestId(`tab-${tab}`).click();
  await expect(page.getByTestId(`panel-${tab}`)).toBeVisible();
}

export async function selectStageByName(page: Page, name: string) {
  await page.locator('[data-testid=stage-node]', { hasText: name }).first().click();
  await expect(page.getByTestId('inspector')).toBeVisible();
}

/** Ruta temporal solo ASCII: Chromium no dispara `change` en inputs de archivo con rutas con tildes. */
export function asciiTmpFile(name: string): string {
  return join(mkdtempSync(join(tmpdir(), 'rivect-e2e-')), name);
}
