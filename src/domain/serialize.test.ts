import { describe, expect, it } from 'vitest';
import { cloneProject } from './factory';
import { autoLayout } from './layout';
import { sampleProjects } from './samples';
import { exportToJson, parseImport, parseStored, sanitizeProject } from './serialize';

const [first] = sampleProjects();
if (!first) throw new Error('sin muestras');

describe('exportar / importar', () => {
  it('ida y vuelta conserva los datos', () => {
    const res = parseImport(exportToJson(sampleProjects(), new Date('2026-01-01T00:00:00Z')));
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.projects).toEqual(sampleProjects());
      expect(res.warnings).toEqual([]);
    }
  });

  it('rechaza JSON inválido, formato ajeno y datos fuera de rango', () => {
    expect(parseImport('{no es json')).toMatchObject({ ok: false });
    expect(parseImport('{"a":1}')).toMatchObject({ ok: false });
    expect(parseImport('[]')).toMatchObject({ ok: false });
    const bad = JSON.parse(exportToJson([first])) as { projects: Array<{ stages: Array<{ manualPct: number }> }> };
    const st = bad.projects[0]?.stages[0];
    if (!st) throw new Error('fixture');
    st.manualPct = 250;
    const res = parseImport(JSON.stringify(bad));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain('manualPct');
  });

  it('rechaza archivos demasiado grandes', () => {
    expect(parseImport('x'.repeat(5 * 1024 * 1024 + 1))).toMatchObject({ ok: false });
  });

  it('repara referencias rotas y lo informa', () => {
    const p = structuredClone(first);
    p.connections.push({ id: 'x', source: 'no-existe', target: p.stages[0]?.id ?? '' });
    p.connections.push({ id: 'self', source: p.stages[0]?.id ?? '', target: p.stages[0]?.id ?? '' });
    const st = p.stages[0];
    if (st) st.roleId = 'rol-fantasma';
    p.proposal.assignments.fantasma = 'recordatorios';
    const { project, warnings } = sanitizeProject(p);
    expect(project.connections.length).toBe(first.connections.length);
    expect(project.stages[0]?.roleId).toBeNull();
    expect(project.proposal.assignments.fantasma).toBeUndefined();
    expect(warnings.length).toBeGreaterThanOrEqual(3);
  });

  it('parseStored devuelve null ante datos corruptos', () => {
    expect(parseStored('basura')).toBeNull();
    expect(parseStored('{"version":1,"activeId":null,"projects":[{"id":1}]}')).toBeNull();
    expect(parseStored(JSON.stringify({ version: 1, activeId: first.id, projects: [first] }))?.projects).toHaveLength(1);
  });
});

describe('cloneProject', () => {
  it('genera ids nuevos y mantiene la estructura', () => {
    const c = cloneProject(first, 'Copia');
    expect(c.id).not.toBe(first.id);
    expect(c.stages).toHaveLength(first.stages.length);
    expect(c.stages.every((s) => !first.stages.some((o) => o.id === s.id))).toBe(true);
    const ids = new Set(c.stages.map((s) => s.id));
    expect(c.connections.every((x) => ids.has(x.source) && ids.has(x.target))).toBe(true);
    expect(Object.keys(c.proposal.assignments).every((k) => ids.has(k))).toBe(true);
    expect(c.stages.every((s) => c.roles.some((r) => r.id === s.roleId))).toBe(true);
  });
});

describe('autoLayout', () => {
  it('ubica cada etapa a la derecha o en una banda posterior respecto de sus predecesoras', () => {
    const pos = autoLayout(first.stages, first.connections);
    for (const c of first.connections) {
      const a = pos.get(c.source);
      const b = pos.get(c.target);
      expect(a && b && (b.x > a.x || b.y > a.y)).toBe(true);
    }
  });

  it('no superpone etapas', () => {
    for (const p of sampleProjects()) {
      const pos = [...autoLayout(p.stages, p.connections).values()].map((v) => `${v.x},${v.y}`);
      expect(new Set(pos).size).toBe(pos.length);
    }
  });

  it('con una sola banda la disposición es de izquierda a derecha', () => {
    const pos = autoLayout(first.stages, first.connections, 99);
    for (const c of first.connections) {
      expect(pos.get(c.target)?.x).toBeGreaterThan(pos.get(c.source)?.x ?? Infinity);
    }
  });
});

describe('seguridad de la importación', () => {
  it('no contamina prototipos con claves peligrosas', () => {
    const doc = JSON.parse(exportToJson([first])) as { projects: Array<{ proposal: { assignments: Record<string, string> } }> };
    const raw = JSON.stringify(doc).replace('"assignments":{', '"assignments":{"__proto__":"recordatorios","constructor":"recordatorios",');
    const res = parseImport(raw);
    expect(({} as Record<string, unknown>).recordatorios).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'recordatorios')).toBe(false);
    if (res.ok) {
      const keys = Object.keys(res.projects[0]?.proposal.assignments ?? {});
      expect(keys).not.toContain('__proto__');
      expect(keys).not.toContain('constructor');
    }
  });

  it('rechaza textos más largos que el límite y estructuras gigantes', () => {
    const doc = JSON.parse(exportToJson([first])) as { projects: Array<{ name: string }> };
    const p0 = doc.projects[0];
    if (!p0) throw new Error('fixture');
    p0.name = 'x'.repeat(500);
    expect(parseImport(JSON.stringify(doc)).ok).toBe(false);
  });

  it('los textos con HTML se conservan como texto (React los escapa al mostrar)', () => {
    const doc = JSON.parse(exportToJson([first])) as { projects: Array<{ name: string }> };
    const p0 = doc.projects[0];
    if (!p0) throw new Error('fixture');
    p0.name = '<img src=x onerror=alert(1)>';
    const res = parseImport(JSON.stringify(doc));
    expect(res.ok && res.projects[0]?.name).toBe('<img src=x onerror=alert(1)>');
  });
});
