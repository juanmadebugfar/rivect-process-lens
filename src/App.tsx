import { useEffect, useRef, useState } from 'react';
import { exportToJson, parseImport } from './domain/serialize';
import { useStore } from './state/store';
import { useAnalysis } from './ui/analysis';
import { FictionalChip } from './ui/components/Chips';
import { Menu } from './ui/components/Menu';
import { Toast } from './ui/components/Toast';
import { downloadText, readFileText, slug } from './ui/fileio';
import { KpiStrip } from './ui/KpiStrip';
import { Sidebar } from './ui/Sidebar';
import { TABS, useHashRoute, type TabId } from './ui/useHashRoute';
import { AssumptionsView } from './ui/views/AssumptionsView';
import { DiagnosisView } from './ui/views/DiagnosisView';
import { FindingsView } from './ui/views/FindingsView';
import { ProcessView } from './ui/views/ProcessView';
import { ScenarioView } from './ui/views/ScenarioView';

export function App() {
  const projects = useStore((s) => s.projects);
  const activeId = useStore((s) => s.activeId);
  const project = projects.find((p) => p.id === activeId) ?? null;
  const analysis = useAnalysis(project);
  const [tab, go] = useHashRoute();
  const [navOpen, setNavOpen] = useState(false);
  const selectStage = useStore((s) => s.selectStage);
  const patchProject = useStore((s) => s.patchProject);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const savedAt = useStore((s) => s.savedAt);
  const saveFailed = useStore((s) => s.saveFailed);
  const importProjects = useStore((s) => s.importProjects);
  const restoreSamples = useStore((s) => s.restoreSamples);
  const notify = useStore((s) => s.notify);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const result = parseImport(await readFileText(file));
      if (!result.ok) {
        notify('error', result.error);
      } else {
        importProjects(result.projects);
        notify(
          'success',
          `Se importaron ${result.projects.length} proceso(s).${result.warnings.length ? ` Avisos: ${result.warnings.slice(0, 2).join(' ')}` : ''}`,
        );
      }
    } catch {
      notify('error', 'No se pudo leer el archivo.');
    } finally {
      // Permite volver a elegir el mismo archivo después de corregirlo.
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const openStage = (id: string) => {
    selectStage(id);
    go('proceso');
  };

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="btn ghost nav-toggle" aria-expanded={navOpen} aria-controls="sidebar" onClick={() => setNavOpen((o) => !o)}>
          Procesos
        </button>
        <div className="brand" aria-label="RIVECT Process Lens">
          <span className="mark" aria-hidden="true" />
          <span className="brand-name">RIVECT</span>
          <span className="brand-sub">Process Lens</span>
        </div>
        {project ? (
          <div className="current">
            <input className="title-input" aria-label="Nombre del proceso" data-testid="project-title" value={project.name} maxLength={160} onChange={(e) => patchProject({ name: e.target.value })} />
            {project.fictional ? <FictionalChip /> : null}
          </div>
        ) : (
          <div className="current" />
        )}
        <div className="top-actions">
          <button type="button" className="btn ghost" onClick={undo} disabled={!canUndo} data-testid="undo" title="Deshacer (Ctrl+Z)">
            Deshacer
          </button>
          <button type="button" className="btn ghost" onClick={redo} disabled={!canRedo} data-testid="redo" title="Rehacer (Ctrl+Shift+Z)">
            Rehacer
          </button>
          <Menu label="Datos" ariaLabel="Menú de datos" testId="data-menu">
            {(close) => (
              <>
                <button
                  type="button"
                  className="menu-item"
                  disabled={!project}
                  data-testid="export-project"
                  onClick={() => {
                    if (project) downloadText(`${slug(project.name)}.rivect.json`, exportToJson([project]), 'application/json');
                    close();
                  }}
                >
                  Exportar este proceso (JSON)
                </button>
                <button
                  type="button"
                  className="menu-item"
                  data-testid="export-all"
                  onClick={() => {
                    downloadText('rivect-process-lens.json', exportToJson(projects), 'application/json');
                    close();
                  }}
                  disabled={projects.length === 0}
                >
                  Exportar todos (JSON)
                </button>
                <button
                  type="button"
                  className="menu-item"
                  data-testid="import"
                  onClick={() => {
                    fileInput.current?.click();
                    close();
                  }}
                >
                  Importar JSON…
                </button>
                <button
                  type="button"
                  className="menu-item"
                  onClick={() => {
                    restoreSamples();
                    close();
                  }}
                >
                  Restaurar casos de ejemplo
                </button>
              </>
            )}
          </Menu>
          <input ref={fileInput} type="file" accept="application/json,.json" className="sr-only" data-testid="import-input" aria-label="Archivo JSON a importar" tabIndex={-1} onChange={(e) => void onImport(e.target.files?.[0])} />
          <span className={`save-state ${saveFailed ? 'bad' : ''}`} role="status" data-testid="save-state">
            {saveFailed ? 'No se pudo guardar' : savedAt ? 'Guardado en este navegador' : 'Local'}
          </span>
        </div>
      </header>

      <div className="body">
        <div id="sidebar" className={`side-wrap ${navOpen ? 'open' : ''}`}>
          <Sidebar onNavigate={() => setNavOpen(false)} />
        </div>
        <main className="main" id="main">
          {project && analysis ? (
            <>
              <div className="tabbar" role="tablist" aria-label="Secciones">
                {TABS.map((t) => (
                  <TabButton key={t.id} id={t.id} active={tab === t.id} onSelect={go} count={t.id === 'hallazgos' ? analysis.findings.length : undefined}>
                    {t.label}
                  </TabButton>
                ))}
              </div>
              {tab !== 'diagnostico' ? <KpiStrip project={project} analysis={analysis} /> : null}
              <div className="tabpanel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} data-testid={`panel-${tab}`}>
                {tab === 'proceso' ? <ProcessView project={project} analysis={analysis} /> : null}
                {tab === 'hallazgos' ? <FindingsView project={project} analysis={analysis} onOpenStage={openStage} onEditThresholds={() => go('supuestos')} /> : null}
                {tab === 'escenario' ? <ScenarioView project={project} analysis={analysis} /> : null}
                {tab === 'supuestos' ? <AssumptionsView project={project} /> : null}
                {tab === 'diagnostico' ? <DiagnosisView project={project} analysis={analysis} /> : null}
              </div>
            </>
          ) : (
            <EmptyState />
          )}
        </main>
      </div>
      <Toast />
    </div>
  );
}

function TabButton({ id, active, onSelect, count, children }: { id: TabId; active: boolean; onSelect: (t: TabId) => void; count?: number; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={active}
      aria-controls={`panel-${id}`}
      tabIndex={active ? 0 : -1}
      className={`tab ${active ? 'on' : ''}`}
      data-testid={`tab-${id}`}
      onClick={() => onSelect(id)}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const i = TABS.findIndex((t) => t.id === id);
        const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
        if (next) {
          onSelect(next.id);
          requestAnimationFrame(() => document.getElementById(`tab-${next.id}`)?.focus());
        }
      }}
    >
      {children}
      {count !== undefined ? <span className="tab-count num">{count}</span> : null}
    </button>
  );
}

function EmptyState() {
  const createProject = useStore((s) => s.createProject);
  const restoreSamples = useStore((s) => s.restoreSamples);
  return (
    <div className="empty-state">
      <h1>No hay un proceso abierto</h1>
      <p>Cree un proceso en blanco o recupere los tres casos de ejemplo (datos ficticios).</p>
      <div className="row">
        <button type="button" className="btn primary" onClick={() => createProject('Proceso nuevo')}>
          Crear proceso
        </button>
        <button type="button" className="btn" onClick={restoreSamples}>
          Restaurar casos de ejemplo
        </button>
      </div>
    </div>
  );
}
