import { test, expect } from '@playwright/test';

/**
 * Genera las capturas de docs/screenshots con la aplicación real (npm run screenshots).
 * No es una prueba funcional: no se ejecuta con `npm run test:e2e`.
 */
const OUT = 'docs/screenshots';

test.use({ viewport: { width: 1440, height: 900 } });

async function open(page: import('@playwright/test').Page, hash = '') {
  await page.addInitScript(() => localStorage.setItem('rivect:motion', '1'));
  await page.goto(`/${hash}`);
  await page.waitForSelector('[data-testid=stage-node]');
  await page.waitForTimeout(1500);
}

test('capturas', async ({ page }) => {
  test.setTimeout(120_000);
  await open(page);
  await page.screenshot({ path: `${OUT}/01-proceso-contable.png` });

  await page.locator('[data-testid=stage-node]', { hasText: 'Digitación' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/02-inspector-etapa.png` });

  await page.locator('.react-flow__pane').click({ position: { x: 5, y: 5 } });
  await page.getByRole('radio', { name: 'Propuesto' }).check({ force: true });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/03-vista-propuesta.png` });

  await page.getByTestId('simulate').click();
  await page.waitForTimeout(3800);
  await page.screenshot({ path: `${OUT}/04-simulacion-en-curso.png` });
  await expect(page.getByTestId('sim-result')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('sim-close').click();

  for (const [tab, file] of [
    ['hallazgos', '05-hallazgos'],
    ['escenario', '06-escenario'],
    ['supuestos', '07-supuestos'],
    ['diagnostico', '08-diagnostico'],
  ] as const) {
    await page.getByTestId(`tab-${tab}`).click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${file}.png` });
  }

  await page.getByTestId('tab-proceso').click();
  await page.getByTestId('project-item').filter({ hasText: /Clínica/ }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/09-proceso-clinica.png` });

  await page.getByTestId('project-item').filter({ hasText: /Estudio jurídico/ }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/10-proceso-juridico.png` });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/11-movil-proceso.png` });
  await page.getByTestId('tab-escenario').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/12-movil-escenario.png` });
});
