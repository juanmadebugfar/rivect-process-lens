import { test as base, expect, type Page } from '@playwright/test';
import { gotoTab, num, selectStageByName, test } from './fixtures';

test.describe('simulación del recorrido (movimiento desactivado por automatización)', () => {
  test('recorre las 9 etapas y compara con la vista propuesta', async ({ app }) => {
    await expect(app.locator('html')).toHaveAttribute('data-motion', 'off');
    await app.getByTestId('simulate').click();
    await expect(app.getByTestId('sim-hud')).toBeVisible();
    await expect(app.getByTestId('sim-result')).toContainText('Completo: 14,4 días');
    await expect(app.locator('.stage-node.sim-done')).toHaveCount(9);
    await app.getByTestId('sim-close').click();
    await expect(app.getByTestId('sim-hud')).toHaveCount(0);
    await expect(app.locator('.stage-node.sim-done')).toHaveCount(0);

    await app.getByRole('radio', { name: 'Propuesto' }).check({ force: true });
    await app.getByTestId('simulate').click();
    await expect(app.getByTestId('sim-result')).toContainText('Completo: 11,2 días');
    await expect(app.getByTestId('sim-result')).toContainText('% más corto que el actual (14,4 días)');
  });

  test('cambiar de proceso detiene la simulación', async ({ app }) => {
    await app.getByTestId('simulate').click();
    await app.getByTestId('project-item').filter({ hasText: /Clínica/ }).click();
    await expect(app.getByTestId('sim-hud')).toHaveCount(0);
    await expect(app.locator('.stage-node.sim-done')).toHaveCount(0);
  });

  test('la simulación refleja los datos editados (más espera, ciclo más largo)', async ({ app }) => {
    await selectStageByName(app, 'Revisión del contador');
    await app.getByTestId('stage-wait').fill('48'); // +32 h hábiles sobre el camino crítico
    await app.getByTestId('simulate').click();
    // (115,3 + 32) / 8 = 18,4 días
    await expect(app.getByTestId('sim-result')).toContainText('18,4 días');
  });

  test('las miniaturas de flujo se dibujan en la lista de procesos', async ({ app }) => {
    await expect(app.locator('svg.thumb')).toHaveCount(3);
    expect(await app.locator('svg.thumb').first().locator('circle').count()).toBe(9);
    expect(await app.locator('svg.thumb').first().locator('line').count()).toBe(9);
  });

  test('sin procesos con etapas no se puede simular', async ({ app }) => {
    await app.getByTestId('new-project').click();
    await app.getByTestId('new-project-name').fill('Vacío');
    await app.getByTestId('create-project').click();
    await expect(app.getByTestId('simulate')).toBeDisabled();
  });
});

base.describe('movimiento activo (forzado)', () => {
  async function open(page: Page, extra?: () => Promise<void>) {
    const problems: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') problems.push(m.text());
    });
    page.on('pageerror', (e) => problems.push(e.message));
    await page.addInitScript(() => window.localStorage.setItem('rivect:motion', '1'));
    await extra?.();
    await page.goto('/');
    await page.waitForSelector('[data-testid=stage-node]');
    return problems;
  }

  base('activa el movimiento y las etapas terminan visibles tras la entrada escalonada', async ({ page }) => {
    const problems = await open(page);
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    await page.waitForTimeout(1500);
    const opacities = await page.locator('.stage-node').evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity));
    expect(opacities).toHaveLength(9);
    expect(opacities.every((o) => o === '1')).toBe(true);
    expect(problems).toEqual([]);
  });

  base('el camino crítico muestra pulsos de datos', async ({ page }) => {
    await open(page);
    expect(await page.getByTestId('edge-dot').count()).toBeGreaterThan(3);
    await expect(page.locator('.edge-flow').first()).toBeAttached();
  });

  base('los indicadores se animan y terminan exactamente en el valor calculado', async ({ page }) => {
    const problems = await open(page);
    const hours = () => page.getByTestId('kpi-hours').locator('.kpi-value > span').first();
    await expect(hours()).toHaveAttribute('data-value', /48[89]/);
    await selectStageByName(page, 'Digitación de comprobantes');
    await page.getByTestId('stage-minutes').fill('30'); // -42 h/mes
    await expect.poll(async () => num(await hours().textContent()), { timeout: 4000 }).toBe(447);
    await expect(hours()).toHaveAttribute('data-value', /^446\.7/);
    expect(problems).toEqual([]);
  });

  base('la simulación corre unos segundos con estados intermedios y termina completa', async ({ page }) => {
    const problems = await open(page);
    await page.getByTestId('simulate').click();
    await expect(page.locator('.stage-node.sim-running').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.sn-status.running').first()).toBeVisible();
    // Mientras corre hay conexiones con circulación rápida
    await expect.poll(() => page.locator('.edge-flow.fast').count(), { timeout: 6000 }).toBeGreaterThan(0);
    await expect(page.getByTestId('sim-result')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.stage-node.sim-done')).toHaveCount(9);
    expect(problems).toEqual([]);
  });

  base('con reducción de movimiento del sistema no hay animación', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await open(page);
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
    await expect(page.getByTestId('edge-dot')).toHaveCount(0);
    await context.close();
  });

  base('cambiar de pestaña con movimiento no deja contenido oculto', async ({ page }) => {
    await open(page);
    for (const t of ['hallazgos', 'escenario', 'supuestos', 'diagnostico', 'proceso'] as const) {
      await gotoTab(page, t);
      await page.waitForTimeout(700);
      const opacity = await page.getByTestId(`panel-${t}`).locator('.tab-enter').evaluate((e) => getComputedStyle(e).opacity);
      expect(opacity).toBe('1');
    }
  });
});
