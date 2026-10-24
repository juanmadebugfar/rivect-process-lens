import type { RefObject } from 'react';
import { fmtLead, fmtNum } from '../../domain/format';
import type { SimState } from './useSimulation';

interface Props {
  sim: SimState;
  hoursPerDay: number;
  clockRef: RefObject<HTMLElement | null>;
  barRef: RefObject<HTMLElement | null>;
  onStop: () => void;
  onReplay: () => void;
}

/** Panel flotante con el reloj del recorrido simulado; al terminar compara actual y propuesto. */
export function SimHud({ sim, hoursPerDay, clockRef, barRef, onStop, onReplay }: Props) {
  const total = fmtLead(sim.totalHours, hoursPerDay);
  const diff = sim.mode === 'propuesto' && sim.otherHours > 0 ? ((sim.otherHours - sim.totalHours) / sim.otherHours) * 100 : null;
  return (
    <div className="sim-hud" data-testid="sim-hud" role="status" aria-live="polite">
      <span className="sim-title">Simulación · {sim.mode === 'actual' ? 'actual' : 'propuesta'}</span>
      <div className="sim-clock num">
        <output ref={clockRef as RefObject<HTMLOutputElement>}>{sim.finished ? total : '0 h'}</output>
        <span className="muted"> / {total}</span>
      </div>
      <div className="sim-track" aria-hidden="true">
        <span ref={barRef as RefObject<HTMLSpanElement>} style={sim.finished ? { width: '100%' } : undefined} />
      </div>
      {sim.finished ? (
        <div className="sim-result" data-testid="sim-result" title="Tiempo comprimido; usa las esperas y duraciones del modelo, no mediciones reales.">
          <strong>Completo: {total} hábiles</strong>
          {diff !== null ? (
            <span>
              {diff > 0.05 ? ` · ${fmtNum(diff)}% más corto que el actual (${fmtLead(sim.otherHours, hoursPerDay)})` : ' · sin diferencia frente al actual'}
            </span>
          ) : null}
          <span className="muted"> · tiempo comprimido, según el modelo</span>
        </div>
      ) : (
        <span className="muted small sim-note">Cada etapa arranca cuando terminan las anteriores.</span>
      )}
      <div className="sim-actions">
        {sim.finished ? (
          <button type="button" className="btn small" onClick={onReplay} data-testid="sim-replay">
            Repetir
          </button>
        ) : null}
        <button type="button" className="btn ghost small" onClick={onStop} data-testid="sim-close">
          Cerrar
        </button>
      </div>
    </div>
  );
}
