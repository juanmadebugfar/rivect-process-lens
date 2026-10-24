import { EVIDENCE_LABELS } from '../../domain/constants';
import type { Evidence } from '../../domain/types';

export function EvidenceChip({ evidence }: { evidence: Evidence }) {
  return <span className={`chip evidence ${evidence}`}>{EVIDENCE_LABELS[evidence]}</span>;
}

export function FictionalChip() {
  return (
    <span className="chip fictional" title="Los datos de este caso son inventados y solo ilustran el método.">
      Datos ficticios
    </span>
  );
}
