import gsap from 'gsap';
import { useLayoutEffect, useRef } from 'react';
import { motionEnabled } from '../motion';

interface Props {
  value: number;
  format: (n: number) => string;
  className?: string;
}

/** Número que "corre" hacia su nuevo valor cuando cambia un supuesto. Sin movimiento, muestra el valor final. */
export function AnimatedNumber({ value, format, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);
  const fmt = useRef(format);

  // El formateador suele ser una función nueva en cada render: se guarda sin reiniciar la animación.
  useLayoutEffect(() => {
    fmt.current = format;
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!motionEnabled() || shown.current === value) {
      shown.current = value;
      el.textContent = fmt.current(value);
      return;
    }
    const state = { v: shown.current };
    const tween = gsap.to(state, {
      v: value,
      duration: 0.55,
      ease: 'power2.out',
      onUpdate: () => {
        shown.current = state.v;
        el.textContent = fmt.current(state.v);
      },
      onComplete: () => {
        shown.current = value;
        el.textContent = fmt.current(value);
      },
    });
    return () => {
      tween.kill();
    };
  }, [value]);

  return (
    <span ref={ref} className={className} data-value={value}>
      {format(value)}
    </span>
  );
}
