import { seedSolution } from './factory';
import {
  EXPORT_FORMAT,
  EXPORT_VERSION,
  ExportFileSchema,
  StoredStateSchema,
  type ExportFile,
  type Project,
  type StoredState,
} from './types';

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export function buildExport(projects: Project[], now = new Date()): ExportFile {
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: now.toISOString(), projects };
}

export function exportToJson(projects: Project[], now?: Date): string {
  return JSON.stringify(buildExport(projects, now), null, 2);
}

export interface Sanitized {
  project: Project;
  warnings: string[];
}

/**
 * Repara la integridad referencial que el esquema no puede garantizar:
 * conexiones colgantes, duplicadas o a sí mismas, roles inexistentes, asignaciones huérfanas.
 */
export function sanitizeProject(input: Project): Sanitized {
  const warnings: string[] = [];
  const p = structuredClone(input);

  const seen = new Set<string>();
  const stages = p.stages.filter((s) => {
    if (seen.has(s.id)) {
      warnings.push(`Etapa duplicada descartada: "${s.name}".`);
      return false;
    }
    seen.add(s.id);
    return true;
  });
  p.stages = stages;

  const roleIds = new Set(p.roles.map((r) => r.id));
  for (const s of p.stages) {
    if (s.roleId && !roleIds.has(s.roleId)) {
      warnings.push(`La etapa "${s.name}" referenciaba un rol inexistente; quedó sin rol.`);
      s.roleId = null;
    }
  }

  const pairs = new Set<string>();
  const before = p.connections.length;
  p.connections = p.connections.filter((c) => {
    const key = `${c.source}>${c.target}`;
    const ok = seen.has(c.source) && seen.has(c.target) && c.source !== c.target && !pairs.has(key);
    pairs.add(key);
    return ok;
  });
  if (p.connections.length < before) {
    warnings.push(`Se descartaron ${before - p.connections.length} conexión(es) inválida(s) o duplicada(s).`);
  }

  for (const stageId of Object.keys(p.proposal.assignments)) {
    const solutionId = p.proposal.assignments[stageId];
    if (!seen.has(stageId) || !solutionId) {
      delete p.proposal.assignments[stageId];
      warnings.push('Se descartó una asignación de solución a una etapa inexistente.');
      continue;
    }
    p.proposal.solutions[solutionId] ??= seedSolution(solutionId, p.currency);
  }
  return { project: p, warnings };
}

export type ParseResult =
  | { ok: true; projects: Project[]; warnings: string[] }
  | { ok: false; error: string };

function describeZodError(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): string {
  const first = error.issues[0];
  if (!first) return 'El archivo no tiene el formato esperado.';
  const where = first.path.length ? first.path.map(String).join('.') : 'raíz';
  return `El archivo no es válido (${where}: ${first.message}).`;
}

export function parseImport(text: string): ParseResult {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: 'El archivo supera el tamaño máximo permitido (5 MB).' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido.' };
  }
  if (typeof raw === 'object' && raw !== null && (raw as { format?: unknown }).format !== EXPORT_FORMAT) {
    return { ok: false, error: 'El archivo no es una exportación de RIVECT Process Lens.' };
  }
  const parsed = ExportFileSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: describeZodError(parsed.error) };
  const warnings: string[] = [];
  const projects = parsed.data.projects.map((pr) => {
    const s = sanitizeProject(pr);
    s.warnings.forEach((w) => warnings.push(`${pr.name}: ${w}`));
    return s.project;
  });
  return { ok: true, projects, warnings };
}

export function parseStored(text: string): StoredState | null {
  try {
    const parsed = StoredStateSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return null;
    return { ...parsed.data, projects: parsed.data.projects.map((p) => sanitizeProject(p).project) };
  } catch {
    return null;
  }
}
