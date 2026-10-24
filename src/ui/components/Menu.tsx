import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

interface MenuProps {
  label: ReactNode;
  ariaLabel?: string;
  children: (close: () => void) => ReactNode;
  testId?: string;
  align?: 'start' | 'end';
}

/** Menú desplegable accesible: botón con aria-expanded, cierre con Escape y clic exterior. */
export function Menu({ label, ariaLabel, children, testId, align = 'end' }: MenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="menu" ref={root}>
      <button type="button" className="btn" data-testid={testId} aria-label={ariaLabel} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>
        {label}
        {ariaLabel ? null : <span aria-hidden="true" className="caret" />}
      </button>
      {open ? (
        <div id={panelId} className={`menu-panel align-${align}`} role="group" aria-label={ariaLabel}>
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}
