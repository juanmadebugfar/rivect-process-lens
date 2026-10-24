/**
 * Política de movimiento. Toda animación pasa por `motionEnabled()`:
 *  - respeta `prefers-reduced-motion`;
 *  - se desactiva bajo automatización (navigator.webdriver) para que las pruebas sean deterministas,
 *    salvo que se fuerce con localStorage['rivect:motion'] = '1' (lo usan las pruebas de movimiento).
 */
export function motionEnabled(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    if (window.localStorage.getItem('rivect:motion') === '1') return true;
  } catch {
    /* sin almacenamiento: se usa la regla por defecto */
  }
  return !navigator.webdriver;
}

/** Publica el estado en <html data-motion> para que el CSS condicione sus animaciones. */
export function initMotion(): void {
  document.documentElement.dataset.motion = motionEnabled() ? 'on' : 'off';
}
