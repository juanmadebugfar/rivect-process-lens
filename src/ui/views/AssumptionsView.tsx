import { SOLUTIONS } from '../../domain/constants';
import { fmtMoney } from '../../domain/format';
import { RULES, type RuleId } from '../../domain/findings';
import type { Project, Thresholds } from '../../domain/types';
import { MODEL_LIMITS } from '../../domain/constants';
import { FORMULAS } from '../../domain/formulas';
import { useStore } from '../../state/store';
import { NumberField, SelectField, TextField } from '../components/fields';

const THRESHOLD_FIELDS: Array<{ key: keyof Thresholds; rule: RuleId; label: string; unit: string }> = [
  { key: 'waitHours', rule: 'CB1', label: 'Espera mínima', unit: 'h hábiles' },
  { key: 'cycleSharePct', rule: 'CB2', label: 'Peso mínimo en el ciclo', unit: '%' },
  { key: 'loadSharePct', rule: 'CB3', label: 'Carga mínima sobre el total', unit: '%' },
  { key: 'reworkPct', rule: 'CB5', label: 'Retrabajo mínimo', unit: '%' },
  { key: 'repetitiveOccurrences', rule: 'TR1', label: 'Ocurrencias mínimas', unit: '/mes' },
  { key: 'repetitiveManualPct', rule: 'TR1', label: 'Intervención manual mínima', unit: '%' },
  { key: 'highPotentialPct', rule: 'OP1', label: 'Potencial mínimo', unit: '%' },
];

export function AssumptionsView({ project }: { project: Project }) {
  const patchProject = useStore((s) => s.patchProject);
  const patchThresholds = useStore((s) => s.patchThresholds);
  const addRole = useStore((s) => s.addRole);
  const updateRole = useStore((s) => s.updateRole);
  const removeRole = useStore((s) => s.removeRole);
  const usedRoles = new Set(project.stages.map((s) => s.roleId));

  return (
    <div className="assumptions-view">
      <section className="a-col" aria-labelledby="a-general">
        <h2 id="a-general" className="group-title">
          Parámetros generales
        </h2>
        <div className="form-grid">
          <TextField label="Nombre del proceso" value={project.name} maxLength={160} onChange={(name) => patchProject({ name })} />
          <SelectField
            label="Moneda"
            value={project.currency}
            options={[
              { value: 'USD', label: 'Dólares (US$)' },
              { value: 'UYU', label: 'Pesos uruguayos ($U)' },
            ]}
            onChange={(currency) => patchProject({ currency })}
            hint="Es una etiqueta: no convierte importes ya cargados."
            testId="project-currency"
          />
          <NumberField label="Días hábiles por mes" value={project.workdaysPerMonth} min={1} max={31} onChange={(workdaysPerMonth) => patchProject({ workdaysPerMonth })} testId="workdays" hint="Convierte frecuencias por día o semana a por mes." />
          <NumberField label="Horas por jornada" value={project.hoursPerDay} min={1} max={24} onChange={(hoursPerDay) => patchProject({ hoursPerDay })} hint="Solo para expresar esperas en días." />
        </div>

        <h2 className="group-title">Roles y costo por hora</h2>
        <p className="muted small">Costo cargado (sueldo, cargas y gastos asociados) en {project.currency}. Es el único dato de costo que alimenta los resultados.</p>
        <div className="table-wrap">
<table className="table roles-table">
          <thead>
            <tr>
              <th scope="col">Rol</th>
              <th scope="col" className="r">
                Costo por hora
              </th>
              <th scope="col">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {project.roles.map((r) => (
              <tr key={r.id} data-testid="role-row">
                <td>
                  <TextField label={`Nombre del rol ${r.name}`} value={r.name} maxLength={80} onChange={(name) => updateRole(r.id, { name })} className="bare" />
                </td>
                <td className="r">
                  <NumberField label={`Costo por hora de ${r.name}`} value={r.hourlyCost} onChange={(hourlyCost) => updateRole(r.id, { hourlyCost })} className="bare" testId="role-cost" />
                </td>
                <td className="r">
                  <button
                    type="button"
                    className="btn ghost danger"
                    aria-label={`Eliminar rol ${r.name}`}
                    onClick={() => removeRole(r.id)}
                    title={usedRoles.has(r.id) ? 'Las etapas con este rol quedarán sin rol' : undefined}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
</div>
        <button type="button" className="btn" data-testid="add-role" onClick={addRole}>
          + Agregar rol
        </button>
      </section>

      <section className="a-col" aria-labelledby="a-thresholds">
        <h2 id="a-thresholds" className="group-title">
          Umbrales de las reglas
        </h2>
        <p className="muted small">Cambiarlos recalcula los hallazgos al instante. Los valores por defecto son criterios de trabajo, no estándares.</p>
        <div className="form-grid">
          {THRESHOLD_FIELDS.map((f) => (
            <NumberField
              key={f.key}
              label={`${f.rule} · ${f.label}`}
              unit={f.unit}
              value={project.thresholds[f.key]}
              max={f.unit === '%' ? 100 : undefined}
              onChange={(v) => patchThresholds({ [f.key]: v })}
              hint={RULES[f.rule].title}
              testId={`th-${f.key}`}
            />
          ))}
        </div>

        <h2 className="group-title">Cómo se calcula</h2>
        <dl className="formulas">
          {FORMULAS.map((f) => (
            <div key={f.id}>
              <dt>{f.label}</dt>
              <dd>
                <code>{f.expression}</code>
                {f.note ? <span className="muted small">{f.note}</span> : null}
              </dd>
            </div>
          ))}
        </dl>

        <h2 className="group-title">Límites del modelo</h2>
        <ul className="limits">
          {MODEL_LIMITS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>

        <h2 className="group-title">Catálogo de soluciones (referencias)</h2>
        <p className="muted small">Valores de referencia internos en US$ para sembrar el escenario; se editan por proyecto en la pestaña Escenario. No son una oferta.</p>
        <ul className="catalog">
          {Object.values(SOLUTIONS).map((s) => (
            <li key={s.id}>
              <strong>{s.name}</strong>
              <span className="muted small">
                Inversión de referencia {fmtMoney(s.referenceSetupUsd, 'USD')} · mantenimiento {fmtMoney(s.referenceMonthlyUsd, 'USD')}/mes
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
