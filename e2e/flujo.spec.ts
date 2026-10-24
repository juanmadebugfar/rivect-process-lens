import { expect, gotoTab, num, openProject, selectStageByName, test } from './fixtures';

test.describe('casos sectoriales', () => {
  const cases = [
    { name: /Estudio contable/, stages: 9, client: /Estudio Contable Ficticio/, stage: 'Digitación de comprobantes' },
    { name: /Clínica/, stages: 10, client: /Consultorio Ficticio/, stage: 'Registro en historia clínica' },
    { name: /Estudio jurídico/, stages: 12, client: /Estudio Jurídico Ficticio/, stage: 'Redacción de escrito o contrato' },
  ];

  test('hay tres casos ficticios identificados', async ({ app }) => {
    await expect(app.getByTestId('project-item')).toHaveCount(3);
    await expect(app.getByText('Datos ficticios').first()).toBeVisible();
  });

  for (const c of cases) {
    test(`caso navegable: ${c.name}`, async ({ app }) => {
      await openProject(app, c.name);
      await expect(app.getByTestId('stage-node')).toHaveCount(c.stages);
      await selectStageByName(app, c.stage);
      await expect(app.getByTestId('stage-name')).toHaveValue(c.stage);

      await gotoTab(app, 'hallazgos');
      expect(await app.getByTestId('finding-row').count()).toBeGreaterThan(2);
      await gotoTab(app, 'escenario');
      await expect(app.getByTestId('compare-row')).toHaveCount(c.stages);
      expect(num(await app.getByTestId('res-net').textContent())).toBeGreaterThan(0);
      await gotoTab(app, 'supuestos');
      await expect(app.getByTestId('role-row').first()).toBeVisible();
      await gotoTab(app, 'diagnostico');
      await expect(app.getByTestId('report-client')).toHaveText(c.client);
      await expect(app.getByRole('heading', { name: 'Siguientes pasos' })).toBeVisible();
    });
  }

  test('los tres casos producen resultados distintos', async ({ app }) => {
    const hours: number[] = []; // costo mensual del tiempo
    for (const c of cases) {
      await openProject(app, c.name);
      hours.push(num(await app.getByTestId('kpi-cost').locator('.kpi-value').textContent()));
    }
    expect(new Set(hours).size).toBe(3);
  });
});

test.describe('edición y recálculo', () => {
  test('cambiar minutos de una etapa recalcula horas, costo y resultados', async ({ app }) => {
    await selectStageByName(app, 'Digitación de comprobantes');
    // 45 min × 1,12 (12% retrabajo) × 150 / 60 = 126 h
    await expect(app.getByTestId('stage-hours')).toContainText('126');
    const before = num(await app.getByTestId('kpi-hours').locator('.kpi-value').textContent());
    expect(before).toBeCloseTo(489, 0);

    await app.getByTestId('stage-minutes').fill('30');
    // 30 × 1,12 × 150 / 60 = 84 h  →  total baja 42 h
    await expect(app.getByTestId('stage-hours')).toContainText('84');
    const after = num(await app.getByTestId('kpi-hours').locator('.kpi-value').textContent());
    expect(after).toBeCloseTo(before - 42, 0);
  });

  test('acepta coma decimal y rechaza texto sin romper el valor', async ({ app }) => {
    await selectStageByName(app, 'Digitación de comprobantes');
    await app.getByTestId('stage-minutes').fill('7,5');
    await expect(app.getByTestId('stage-hours')).toContainText('21'); // 7,5 × 1,12 × 150 / 60 = 21
    await app.getByTestId('stage-minutes').fill('abc');
    await expect(app.getByTestId('stage-minutes')).toHaveAttribute('aria-invalid', 'true');
    await expect(app.getByTestId('stage-hours')).toContainText('21');
    await app.getByTestId('stage-minutes').blur();
    await expect(app.getByTestId('stage-minutes')).toHaveValue('7,5');
  });

  test('cambiar la unidad de frecuencia usa los días hábiles del proceso', async ({ app }) => {
    await selectStageByName(app, 'Recepción de documentación del cliente');
    await app.getByTestId('stage-freq').fill('2');
    await app.getByTestId('stage-freq-unit').selectOption('dia');
    // 2 × 21 = 42 ocurrencias; 10 min × 42 / 60 = 7 h
    await expect(app.getByTestId('stage-hours')).toContainText('7');
    await gotoTab(app, 'supuestos');
    await app.getByTestId('workdays').fill('20');
    await gotoTab(app, 'proceso');
    await selectStageByName(app, 'Recepción de documentación del cliente');
    await expect(app.getByTestId('stage-hours')).toContainText('6,7'); // 2 × 20 × 10 / 60
  });

  test('el costo por hora de un rol actualiza el costo del tiempo', async ({ app }) => {
    const cost = () => app.getByTestId('kpi-cost').locator('.kpi-value').textContent();
    const before = num(await cost());
    await gotoTab(app, 'supuestos');
    await app.getByTestId('role-cost').first().fill('1040'); // el doble del rol administrativo
    const after = num(await cost());
    expect(after).toBeGreaterThan(before * 1.4);
  });

  test('agregar, conectar, desconectar, eliminar y deshacer una etapa', async ({ app }) => {
    const nodes = app.getByTestId('stage-node');
    await expect(nodes).toHaveCount(9);
    await app.getByTestId('add-stage').click();
    await expect(nodes).toHaveCount(10);
    await app.getByTestId('stage-name').fill('Etapa de prueba');
    await expect(app.locator('[data-testid=stage-node][data-stage-name="Etapa de prueba"]')).toBeVisible();

    await app.getByTestId('connect-target').selectOption({ label: 'Archivo y legajo digital' });
    await app.getByTestId('connect-add').click();
    await expect(app.getByTestId('disconnect')).toHaveCount(1);
    await app.getByTestId('disconnect').click();
    await expect(app.getByTestId('disconnect')).toHaveCount(0);

    await app.getByTestId('delete-stage').click();
    await expect(nodes).toHaveCount(9);
    await app.getByTestId('toast').getByRole('button', { name: 'Deshacer' }).click();
    await expect(nodes).toHaveCount(10);
  });

  test('conectar arrastrando entre los puntos de dos etapas', async ({ app }) => {
    await app.getByTestId('new-project').click();
    await app.getByTestId('new-project-name').fill('Proceso con arrastre');
    await app.getByTestId('create-project').click();
    await app.getByTestId('add-stage').click();
    await app.getByTestId('stage-name').fill('Origen');
    await app.getByTestId('add-stage').click();
    await app.getByTestId('stage-name').fill('Destino');
    await app.getByTestId('arrange').click();
    const src = app.locator('[data-testid=stage-node]', { hasText: 'Origen' }).locator('.react-flow__handle.source');
    const dst = app.locator('[data-testid=stage-node]', { hasText: 'Destino' }).locator('.react-flow__handle.target');
    const a = await src.boundingBox();
    const b = await dst.boundingBox();
    if (!a || !b) throw new Error('sin handles');
    await app.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await app.mouse.down();
    await app.mouse.move(b.x + b.width / 2 - 20, b.y + b.height / 2, { steps: 8 });
    await app.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 4 });
    await app.mouse.up();
    await expect(app.locator('.react-flow__edge')).toHaveCount(1);
  });

  test('el selector de conexiones no ofrece la propia etapa', async ({ app }) => {
    await selectStageByName(app, 'Archivo y legajo digital');
    const options = await app.getByTestId('connect-target').locator('option').allTextContents();
    expect(options).not.toContain('Archivo y legajo digital');
  });

  test('mover una etapa persiste tras recargar', async ({ app }) => {
    const node = app.locator('[data-testid=stage-node]', { hasText: 'Conciliación bancaria' });
    const box = await node.boundingBox();
    if (!box) throw new Error('sin caja');
    await app.mouse.move(box.x + 60, box.y + 14);
    await app.mouse.down();
    await app.mouse.move(box.x + 60, box.y + 14 + 90, { steps: 8 });
    await app.mouse.up();
    const moved = await node.boundingBox();
    expect(moved?.y).toBeGreaterThan(box.y + 60);
    await app.waitForTimeout(500); // guardado diferido
    await app.reload();
    await app.waitForSelector('[data-testid=stage-node]');
    const again = await app.locator('[data-testid=stage-node]', { hasText: 'Conciliación bancaria' }).boundingBox();
    expect(Math.abs((again?.y ?? 0) - (moved?.y ?? 0))).toBeLessThan(40);
  });
});

test.describe('hallazgos', () => {
  test('los umbrales editables recalculan los hallazgos y cada hallazgo abre su etapa', async ({ app }) => {
    await gotoTab(app, 'hallazgos');
    const before = await app.getByTestId('finding-row').count();
    await expect(app.locator('[data-testid=finding-row][data-rule=CB1]').first()).toContainText('umbral 8 h');
    await gotoTab(app, 'supuestos');
    await app.getByTestId('th-waitHours').fill('30');
    await gotoTab(app, 'hallazgos');
    const after = await app.getByTestId('finding-row').count();
    expect(after).toBeLessThan(before);
    await expect(app.locator('[data-testid=finding-row][data-rule=CB1]').first()).toContainText('umbral 30 h');

    await app.getByTestId('finding-row').first().getByRole('button').click();
    await expect(app.getByTestId('panel-proceso')).toBeVisible();
    await expect(app.getByTestId('inspector')).toBeVisible();
  });
});

test.describe('escenario', () => {
  test('el factor de realización recalcula y a 0% no hay ahorro', async ({ app }) => {
    await gotoTab(app, 'escenario');
    const net = async () => num(await app.getByTestId('res-net').textContent());
    const base = await net();
    expect(base).toBeGreaterThan(0);
    await app.getByTestId('realization').fill('100');
    expect(await net()).toBeGreaterThan(base);
    await app.getByTestId('realization').fill('0');
    expect(await net()).toBeLessThan(0);
    await expect(app.getByText('no es positivo')).toBeVisible();
    await expect(app.getByTestId('total-proposed-hours')).toHaveText(/^488,8$/);
  });

  test('asignar y quitar una solución cambia horas, inversión y recupero', async ({ app }) => {
    await gotoTab(app, 'escenario');
    const setup = async () => num(await app.getByTestId('res-setup').textContent());
    const row = app.locator('[data-testid=compare-row]', { hasText: 'Liquidación de impuestos' });
    const select = row.getByTestId('assign-solution');
    const before = await setup();
    await select.selectOption('plantillas_documentos');
    // La solución se aplica, pero "plantillas" ya estaba en uso: el costo no se duplica.
    expect(await setup()).toBe(before);
    await select.selectOption('tablero_alertas');
    expect(await setup()).toBeGreaterThan(before);
    await expect(app.getByTestId('solution-card')).toHaveCount(6);
    await select.selectOption('');
    expect(await setup()).toBe(before);
  });

  test('una solución no recomendada para la actividad se advierte', async ({ app }) => {
    await gotoTab(app, 'escenario');
    const row = app.locator('[data-testid=compare-row]', { hasText: 'Liquidación de impuestos' });
    await row.getByTestId('assign-solution').selectOption('agenda_online');
    await expect(row.getByText('No pensada para este tipo de actividad')).toBeVisible();
    await expect(app.getByText('no está pensada para su tipo de actividad')).toBeVisible();
  });

  test('editar la inversión de una solución cambia recupero y neto al horizonte', async ({ app }) => {
    await gotoTab(app, 'escenario');
    const horizon = async () => num(await app.getByTestId('res-horizon').textContent());
    const before = await horizon();
    await app.getByTestId('setup-portal_recepcion').fill('0');
    expect(await horizon()).toBeGreaterThan(before);
    await app.getByTestId('horizon').fill('24');
    expect(await horizon()).toBeGreaterThan(before + 100000);
  });

  test('muestra fórmulas, sensibilidad y la distinción evidencia/hipótesis', async ({ app }) => {
    await gotoTab(app, 'escenario');
    await expect(app.getByTestId('sensitivity').locator('tbody tr')).toHaveCount(4);
    await expect(app.getByTestId('explain')).toContainText('% manual');
    await expect(app.getByText('Estimación bajo supuestos')).toBeVisible();
    await expect(app.getByText('Qué se sabe y qué se supone')).toBeVisible();
    await gotoTab(app, 'supuestos');
    await expect(app.getByText('Límites del modelo')).toBeVisible();
    await expect(app.getByText('reducción = % manual')).toBeVisible();
  });

  test('la vista propuesta del lienzo refleja el escenario', async ({ app }) => {
    await app.getByRole('radio', { name: 'Propuesto' }).check({ force: true });
    await expect(app.locator('.stage-node.proposed').first()).toBeVisible();
    await expect(app.locator('.stage-node .delta').first()).toBeVisible();
  });
});

test.describe('interacción directa con el lienzo', () => {
  test('la tecla Suprimir elimina la etapa seleccionada y se puede deshacer', async ({ app }) => {
    const node = app.locator('[data-testid=stage-node]', { hasText: 'Archivo y legajo digital' });
    await node.click();
    await app.locator('.react-flow__node.selected').focus();
    await app.keyboard.press('Delete');
    await expect(app.getByTestId('stage-node')).toHaveCount(8);
    await app.getByTestId('toast').getByRole('button', { name: 'Deshacer' }).click();
    await expect(app.getByTestId('stage-node')).toHaveCount(9);
  });

  test('seleccionar una conexión y suprimirla la desconecta', async ({ app }) => {
    const edges = app.locator('.react-flow__edge');
    const before = await edges.count();
    // El primer tramo puede quedar fuera de la vista: se dispara el clic sobre el elemento de la conexión.
    await edges.nth(1).evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await expect(app.locator('.react-flow__edge.selected')).toHaveCount(1);
    await app.keyboard.press('Delete');
    await expect(edges).toHaveCount(before - 1);
  });

  test('la lista de etapas permite seleccionar y editar sin usar el lienzo', async ({ app }) => {
    await app.getByTestId('toggle-list').click();
    await expect(app.getByTestId('stage-row')).toHaveCount(9);
    await app.getByTestId('stage-row').nth(3).click();
    await expect(app.getByTestId('stage-name')).toHaveValue('Conciliación bancaria');
    await app.getByTestId('stage-name').fill('Conciliación renombrada');
    await expect(app.getByTestId('stage-row').nth(3)).toContainText('Conciliación renombrada');
    await app.getByTestId('close-inspector').click();
    await expect(app.getByTestId('inspector')).toHaveCount(0);
  });

  test('una etapa nueva queda visible en el lienzo', async ({ app }) => {
    for (let i = 0; i < 4; i++) await app.getByTestId('add-stage').click();
    const box = await app.locator('.react-flow__node.selected').boundingBox();
    const canvas = await app.getByTestId('canvas').boundingBox();
    if (!box || !canvas) throw new Error('sin cajas');
    await app.waitForTimeout(400);
    const after = await app.locator('.react-flow__node.selected').boundingBox();
    expect(after?.y).toBeGreaterThanOrEqual(canvas.y - 2);
    expect((after?.y ?? 0) + (after?.height ?? 0)).toBeLessThanOrEqual(canvas.y + canvas.height + 2);
  });
});
