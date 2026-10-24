import { readFileSync } from 'node:fs';
import { AxeBuilder } from '@axe-core/playwright';
import { asciiTmpFile, expect, gotoTab, openProject, selectStageByName, test } from './fixtures';

test.describe('diagnóstico y exportación', () => {
  test('el diagnóstico contiene todas las secciones y refleja los datos editados', async ({ app }) => {
    await gotoTab(app, 'diagnostico');
    const report = app.getByTestId('report');
    for (const h of ['Resumen', 'Proceso actual', 'Problemas identificados', 'Mejoras propuestas (hipótesis)', 'Impacto estimado (no demostrado)', 'Supuestos', 'Limitaciones', 'Siguientes pasos']) {
      await expect(report.getByRole('heading', { name: h })).toBeVisible();
    }
    await expect(report.getByText('Datos ficticios — caso ilustrativo')).toBeVisible();
    await app.getByTestId('meta-client').fill('Cliente de prueba S.A.');
    await expect(app.getByTestId('report-client')).toHaveText('Cliente de prueba S.A.');
    await app.getByTestId('meta-steps').fill('Primer paso propio\nSegundo paso propio');
    await expect(report.getByText('Primer paso propio')).toBeVisible();
    await expect(report.getByText('Segundo paso propio')).toBeVisible();
  });

  test('descarga el diagnóstico en Markdown con el contenido esperado', async ({ app }) => {
    await gotoTab(app, 'diagnostico');
    const [download] = await Promise.all([app.waitForEvent('download'), app.getByTestId('download-md').click()]);
    expect(download.suggestedFilename()).toMatch(/^diagnostico-.*\.md$/);
    const path = await download.path();
    const md = readFileSync(path, 'utf8');
    expect(md).toContain('# Diagnóstico preliminar de proceso');
    expect(md).toContain('## Impacto estimado (no demostrado)');
    expect(md).toContain('Datos ficticios');
    expect(md).toContain('Digitación de comprobantes');
  });

  test('la impresión genera un PDF solo con el informe', async ({ app }, testInfo) => {
    await gotoTab(app, 'diagnostico');
    await app.emulateMedia({ media: 'print' });
    await expect(app.locator('.topbar')).toBeHidden();
    await expect(app.locator('.d-side')).toBeHidden();
    await expect(app.getByTestId('report')).toBeVisible();
    const pdf = await app.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    const out = testInfo.outputPath('diagnostico.pdf');
    const { writeFileSync } = await import('node:fs');
    writeFileSync(out, pdf);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(20_000);
    const { execFileSync } = await import('node:child_process');
    const text = execFileSync('pdftotext', ['-layout', out, '-'], { encoding: 'utf8' });
    expect(text).toContain('Diagnóstico preliminar de proceso');
    expect(text).toContain('Siguientes pasos');
    expect(text).toContain('Limitaciones');
    expect(text).not.toContain('Restaurar casos de ejemplo'); // la interfaz no se imprime
    const info = execFileSync('pdfinfo', [out], { encoding: 'utf8' });
    expect(Number(/Pages:\s+(\d+)/.exec(info)?.[1])).toBeGreaterThanOrEqual(2);
  });

  test('exporta e importa datos estructurados (ida y vuelta)', async ({ app }) => {
    await selectStageByName(app, 'Digitación de comprobantes');
    await app.getByTestId('stage-minutes').fill('33');
    await app.getByTestId('project-title').fill('Contable exportado');
    await app.getByTestId('data-menu').click();
    const [download] = await Promise.all([app.waitForEvent('download'), app.getByTestId('export-project').click()]);
    const file = asciiTmpFile('export.json');
    await download.saveAs(file);
    const json = JSON.parse(readFileSync(file, 'utf8'));
    expect(json.format).toBe('rivect-process-lens');
    expect(json.projects[0].stages.find((s: { name: string }) => s.name === 'Digitación de comprobantes').activeMinutes).toBe(33);

    await app.getByTestId('data-menu').click();
    await app.getByTestId('import').click();
    await app.getByTestId('import-input').setInputFiles(file);
    await expect(app.getByTestId('toast')).toContainText('Se importaron 1 proceso');
    await expect(app.getByTestId('project-item')).toHaveCount(4);
    await expect(app.getByTestId('project-title')).toHaveValue(/importado/);
    await selectStageByName(app, 'Digitación de comprobantes');
    await expect(app.getByTestId('stage-minutes')).toHaveValue('33');
  });

  test('rechaza archivos inválidos con un mensaje claro y sin alterar los datos', async ({ app }) => {
    const bad = asciiTmpFile('malo.json');
    const { writeFileSync } = await import('node:fs');
    writeFileSync(bad, '{"format":"otra-cosa"}');
    await app.getByTestId('import-input').setInputFiles(bad);
    await expect(app.getByTestId('toast')).toContainText('no es una exportación de RIVECT');
    writeFileSync(bad, 'esto no es json');
    await app.getByTestId('import-input').setInputFiles(bad);
    await expect(app.getByTestId('toast')).toContainText('JSON válido');
    await expect(app.getByTestId('project-item')).toHaveCount(3);
  });
});

test.describe('persistencia', () => {
  test('los cambios sobreviven a una recarga', async ({ app }) => {
    await app.getByTestId('project-title').fill('Proceso renombrado');
    await expect(app.getByTestId('save-state')).toContainText('Guardado');
    await app.reload();
    await app.waitForSelector('[data-testid=stage-node]');
    await expect(app.getByTestId('project-title')).toHaveValue('Proceso renombrado');
  });

  test('crear, duplicar y eliminar procesos; restaurar ejemplos', async ({ app }) => {
    await app.getByTestId('new-project').click();
    await app.getByTestId('new-project-name').fill('Mi proceso');
    await app.getByTestId('create-project').click();
    await expect(app.getByTestId('project-item')).toHaveCount(4);
    await expect(app.getByTestId('project-title')).toHaveValue('Mi proceso');
    await expect(app.getByText('Este proceso no tiene etapas.')).toBeVisible();

    await app.getByTestId('project-menu').click();
    await app.getByRole('button', { name: 'Duplicar' }).click();
    await expect(app.getByTestId('project-item')).toHaveCount(5);

    await app.getByTestId('project-menu').click();
    await app.getByTestId('delete-project').click();
    await expect(app.getByTestId('project-item')).toHaveCount(4);
    await app.getByTestId('toast').getByRole('button', { name: 'Deshacer' }).click();
    await expect(app.getByTestId('project-item')).toHaveCount(5);

    // Eliminar todos los ejemplos y restaurarlos
    for (let i = 0; i < 5; i++) {
      await app.getByTestId('project-menu').click();
      await app.getByTestId('delete-project').click();
    }
    await expect(app.getByTestId('project-item')).toHaveCount(0);
    await expect(app.getByText('No hay un proceso abierto')).toBeVisible();
    await app.getByTestId('restore-samples').click();
    await expect(app.getByTestId('project-item')).toHaveCount(3);
  });

  test('un diagnóstico de proceso vacío no falla', async ({ app }) => {
    await app.getByTestId('new-project').click();
    await app.getByTestId('new-project-name').fill('Vacío');
    await app.getByTestId('create-project').click();
    await gotoTab(app, 'diagnostico');
    await expect(app.getByText('El proceso todavía no tiene etapas cargadas.')).toBeVisible();
    await gotoTab(app, 'escenario');
    await gotoTab(app, 'hallazgos');
  });

  test('datos corruptos en localStorage se recuperan con aviso y copia de respaldo', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(e.message));
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('rivect-process-lens:v1', '{"version":1,"projects":[{"id":5}]}');
        sessionStorage.setItem('seeded', '1');
      }
    });
    await page.goto('/');
    await page.waitForSelector('[data-testid=stage-node]');
    await expect(page.getByTestId('toast')).toContainText('datos guardados estaban dañados');
    await expect(page.getByTestId('project-item')).toHaveCount(3);
    const backup = await page.evaluate(() => localStorage.getItem('rivect-process-lens:v1:corrupt-backup'));
    expect(backup).toContain('"id":5');
    expect(problems).toEqual([]);
  });
});

test.describe('navegación, accesibilidad y responsividad', () => {
  test('la ruta por hash cambia de sección y funciona atrás/adelante', async ({ app }) => {
    await gotoTab(app, 'escenario');
    expect(app.url()).toContain('#/escenario');
    await gotoTab(app, 'diagnostico');
    await app.goBack();
    await expect(app.getByTestId('panel-escenario')).toBeVisible();
    await app.goto('/#/hallazgos');
    await expect(app.getByTestId('panel-hallazgos')).toBeVisible();
  });

  test('las pestañas se manejan con flechas del teclado', async ({ app }) => {
    await app.getByTestId('tab-proceso').focus();
    await app.keyboard.press('ArrowRight');
    await expect(app.getByTestId('panel-hallazgos')).toBeVisible();
    await expect(app.getByTestId('tab-hallazgos')).toBeFocused();
  });

  test('deshacer y rehacer con teclado', async ({ app }) => {
    await app.getByTestId('add-stage').click();
    await expect(app.getByTestId('stage-node')).toHaveCount(10);
    await app.getByTestId('project-title').blur();
    await app.locator('.react-flow__pane').click({ position: { x: 5, y: 5 } });
    await app.keyboard.press('Control+z');
    await expect(app.getByTestId('stage-node')).toHaveCount(9);
    await app.keyboard.press('Control+Shift+z');
    await expect(app.getByTestId('stage-node')).toHaveCount(10);
  });

  for (const tab of ['proceso', 'hallazgos', 'escenario', 'supuestos', 'diagnostico'] as const) {
    test(`axe: sin violaciones graves en ${tab}`, async ({ app }) => {
      await gotoTab(app, tab);
      if (tab === 'proceso') await selectStageByName(app, 'Digitación de comprobantes');
      const results = await new AxeBuilder({ page: app }).withTags(['wcag2a', 'wcag2aa']).analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
    });
  }

  for (const width of [390, 768, 1440]) {
    test(`sin desbordamiento horizontal a ${width}px`, async ({ app }) => {
      await app.setViewportSize({ width, height: 900 });
      await openProject(app, /Estudio jurídico/);
      for (const tab of ['proceso', 'hallazgos', 'escenario', 'supuestos', 'diagnostico'] as const) {
        await gotoTab(app, tab);
        const over = await app.evaluate(() => {
          const panel = document.querySelector('.tabpanel') as HTMLElement;
          return { doc: document.documentElement.scrollWidth - window.innerWidth, panel: panel.scrollWidth - panel.clientWidth };
        });
        // Las tablas anchas tienen su propio scroll interno (.table-wrap); el panel no debe desbordar.
        expect(over.doc, `documento en ${tab}`).toBeLessThanOrEqual(1);
        expect(over.panel, `panel en ${tab}`).toBeLessThanOrEqual(1);
      }
    });
  }
});
