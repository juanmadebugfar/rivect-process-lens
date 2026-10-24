import { z } from 'zod';

/**
 * Modelo de dominio. El esquema zod es la única fuente de verdad: de él salen los
 * tipos TypeScript y la validación de datos importados / guardados en localStorage.
 */

export const ACTIVITY_TYPES = [
  'captura',
  'revision',
  'decision',
  'comunicacion',
  'documento',
  'especializado',
  'espera',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const EVIDENCE_LEVELS = ['medido', 'declarado', 'supuesto'] as const;
export type Evidence = (typeof EVIDENCE_LEVELS)[number];

export const FREQUENCY_UNITS = ['dia', 'semana', 'mes'] as const;
export type FrequencyUnit = (typeof FREQUENCY_UNITS)[number];

export const SECTORS = ['contable', 'clinica', 'juridico', 'otro'] as const;
export type Sector = (typeof SECTORS)[number];

export const SOLUTION_IDS = [
  'portal_recepcion',
  'extraccion_datos',
  'recordatorios',
  'plantillas_documentos',
  'integracion_sistemas',
  'flujo_aprobacion',
  'tablero_alertas',
  'agenda_online',
] as const;
export type SolutionId = (typeof SOLUTION_IDS)[number];

const pct = z.number().min(0).max(100);
const text = (max: number) => z.string().max(max);

export const StageSchema = z.object({
  id: text(60).min(1),
  name: text(120),
  roleId: text(60).nullable(),
  activity: z.enum(ACTIVITY_TYPES),
  /** Minutos de trabajo activo por ocurrencia (sin retrabajo). */
  activeMinutes: z.number().min(0).max(100_000),
  /** Horas hábiles de espera / cola por ocurrencia (no consume horas de trabajo). */
  waitHours: z.number().min(0).max(5_000),
  frequency: z.object({
    count: z.number().min(0).max(100_000),
    unit: z.enum(FREQUENCY_UNITS),
  }),
  /** Personas que trabajan en simultáneo en cada ocurrencia. */
  people: z.number().min(0).max(1_000),
  /** % del tiempo activo que es intervención manual. */
  manualPct: pct,
  /** Hipótesis del analista: % del tiempo manual técnicamente automatizable. */
  automationPotential: pct,
  /** % de ocurrencias que requieren rehacer el trabajo. */
  reworkPct: pct,
  evidence: z.enum(EVIDENCE_LEVELS),
  notes: text(2_000),
  x: z.number().min(-100_000).max(100_000),
  y: z.number().min(-100_000).max(100_000),
});
export type Stage = z.infer<typeof StageSchema>;

export const ConnectionSchema = z.object({
  id: text(120).min(1),
  source: text(60).min(1),
  target: text(60).min(1),
});
export type Connection = z.infer<typeof ConnectionSchema>;

export const RoleSchema = z.object({
  id: text(60).min(1),
  name: text(80),
  /** Costo por hora cargado (sueldo + cargas), en la moneda del proyecto. */
  hourlyCost: z.number().min(0).max(1_000_000),
});
export type Role = z.infer<typeof RoleSchema>;

export const ThresholdsSchema = z.object({
  /** CB1: espera mínima (horas hábiles) para marcar espera prolongada. */
  waitHours: z.number().min(0).max(5_000),
  /** CB2: % mínimo del tiempo de ciclo que debe ocupar una etapa del camino crítico. */
  cycleSharePct: pct,
  /** CB3: % mínimo de las horas mensuales totales. */
  loadSharePct: pct,
  /** CB5: % de retrabajo mínimo. */
  reworkPct: pct,
  /** TR1: ocurrencias mensuales mínimas. */
  repetitiveOccurrences: z.number().min(0).max(100_000),
  /** TR1: % manual mínimo. */
  repetitiveManualPct: pct,
  /** OP1: potencial de automatización mínimo. */
  highPotentialPct: pct,
});
export type Thresholds = z.infer<typeof ThresholdsSchema>;

export const ProposalSolutionSchema = z.object({
  solutionId: z.enum(SOLUTION_IDS),
  /** Cobertura: qué parte del potencial automatizable cubre esta solución. */
  coveragePct: pct,
  /** Reducción de la espera que se espera de la solución. */
  waitReductionPct: pct,
  setupCost: z.number().min(0).max(100_000_000),
  monthlyCost: z.number().min(0).max(100_000_000),
});
export type ProposalSolution = z.infer<typeof ProposalSolutionSchema>;

export const ProposalSchema = z.object({
  /** stageId -> solutionId */
  assignments: z.record(z.string(), z.enum(SOLUTION_IDS)),
  solutions: z.record(z.string(), ProposalSolutionSchema),
  /** Factor de realización: adopción real / madurez esperada de la solución. */
  realizationPct: pct,
  horizonMonths: z.number().int().min(1).max(120),
});
export type Proposal = z.infer<typeof ProposalSchema>;

export const MetaSchema = z.object({
  clientName: text(160),
  preparedBy: text(160),
  meetingDate: text(20),
  context: text(3_000),
  observations: text(3_000),
  nextSteps: z.array(text(300)).max(20),
});
export type Meta = z.infer<typeof MetaSchema>;

export const ProjectSchema = z.object({
  id: text(60).min(1),
  name: text(160),
  sector: z.enum(SECTORS),
  /** true = datos ilustrativos inventados (casos de ejemplo). */
  fictional: z.boolean(),
  currency: z.enum(['USD', 'UYU']),
  workdaysPerMonth: z.number().min(1).max(31),
  hoursPerDay: z.number().min(1).max(24),
  roles: z.array(RoleSchema).max(30),
  stages: z.array(StageSchema).max(150),
  connections: z.array(ConnectionSchema).max(600),
  thresholds: ThresholdsSchema,
  proposal: ProposalSchema,
  meta: MetaSchema,
  updatedAt: text(40),
});
export type Project = z.infer<typeof ProjectSchema>;

export const EXPORT_FORMAT = 'rivect-process-lens';
export const EXPORT_VERSION = 1;

export const ExportFileSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  version: z.literal(EXPORT_VERSION),
  exportedAt: text(40),
  projects: z.array(ProjectSchema).min(1).max(50),
});
export type ExportFile = z.infer<typeof ExportFileSchema>;

export const StoredStateSchema = z.object({
  version: z.literal(EXPORT_VERSION),
  activeId: text(60).nullable(),
  projects: z.array(ProjectSchema).max(50),
});
export type StoredState = z.infer<typeof StoredStateSchema>;
