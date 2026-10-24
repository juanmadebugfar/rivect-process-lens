import { useCallback, useEffect, useState } from 'react';

export const TABS = [
  { id: 'proceso', label: 'Proceso' },
  { id: 'hallazgos', label: 'Hallazgos' },
  { id: 'escenario', label: 'Escenario' },
  { id: 'supuestos', label: 'Supuestos' },
  { id: 'diagnostico', label: 'Diagnóstico' },
] as const;
export type TabId = (typeof TABS)[number]['id'];

const parse = (): TabId => {
  const id = window.location.hash.replace(/^#\/?/, '');
  return TABS.some((t) => t.id === id) ? (id as TabId) : 'proceso';
};

/** Enrutado mínimo por hash: permite enlazar y usar atrás/adelante sin dependencias. */
export function useHashRoute(): [TabId, (t: TabId) => void] {
  const [tab, setTab] = useState<TabId>(parse);
  useEffect(() => {
    const onChange = () => setTab(parse());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const go = useCallback((t: TabId) => {
    window.location.hash = `/${t}`;
  }, []);
  return [tab, go];
}
