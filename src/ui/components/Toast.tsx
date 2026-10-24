import { useEffect } from 'react';
import { useStore } from '../../state/store';

export function Toast() {
  const notice = useStore((s) => s.notice);
  const dismiss = useStore((s) => s.dismissNotice);
  const undo = useStore((s) => s.undo);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(dismiss, notice.kind === 'error' ? 9000 : 6000);
    return () => clearTimeout(t);
  }, [notice, dismiss]);

  if (!notice) return null;
  return (
    <div className={`toast ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'} data-testid="toast">
      <span>{notice.text}</span>
      {notice.undo ? (
        <button
          type="button"
          className="btn ghost"
          onClick={() => {
            undo();
            dismiss();
          }}
        >
          Deshacer
        </button>
      ) : null}
      <button type="button" className="btn ghost icon" aria-label="Cerrar aviso" onClick={dismiss}>
        ×
      </button>
    </div>
  );
}
