import { useState } from 'react';
import { SECTOR_LABELS } from '../domain/constants';
import { useStore } from '../state/store';
import { Menu } from './components/Menu';

function Dots() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="currentColor">
      <circle cx="2.5" cy="7" r="1.4" />
      <circle cx="7" cy="7" r="1.4" />
      <circle cx="11.5" cy="7" r="1.4" />
    </svg>
  );
}

export function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const projects = useStore((s) => s.projects);
  const activeId = useStore((s) => s.activeId);
  const selectProject = useStore((s) => s.selectProject);
  const createProject = useStore((s) => s.createProject);
  const duplicateProject = useStore((s) => s.duplicateProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const restoreSamples = useStore((s) => s.restoreSamples);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  return (
    <nav className="sidebar" aria-label="Procesos">
      <div className="sb-head">
        <h2 className="panel-title">Procesos</h2>
        <button type="button" className="btn small" data-testid="new-project" onClick={() => setCreating((c) => !c)} aria-expanded={creating}>
          + Nuevo
        </button>
      </div>
      {creating ? (
        <form
          className="new-project"
          onSubmit={(e) => {
            e.preventDefault();
            createProject(name);
            setName('');
            setCreating(false);
            onNavigate();
          }}
        >
          <label htmlFor="new-name" className="field-label">
            Nombre del proceso
          </label>
          <input id="new-name" data-testid="new-project-name" className="input" value={name} maxLength={160} autoFocus onChange={(e) => setName(e.target.value)} placeholder="Ej.: Alta de clientes" />
          <div className="row">
            <button type="submit" className="btn primary small" data-testid="create-project">
              Crear
            </button>
            <button type="button" className="btn ghost small" onClick={() => setCreating(false)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
      {projects.length === 0 ? <p className="muted small">No hay procesos. Cree uno o restaure los casos de ejemplo.</p> : null}
      <ul className="project-list">
        {projects.map((p) => (
          <li key={p.id} className={p.id === activeId ? 'on' : ''}>
            <button
              type="button"
              className="project-btn"
              aria-current={p.id === activeId ? 'true' : undefined}
              data-testid="project-item"
              onClick={() => {
                selectProject(p.id);
                onNavigate();
              }}
            >
              <span className="p-name">{p.name}</span>
              <span className="p-meta">
                {SECTOR_LABELS[p.sector]} · <span className="num">{p.stages.length}</span> etapas
                {p.fictional ? <span className="p-fict"> · ficticio</span> : null}
              </span>
            </button>
            <Menu label={<Dots />} ariaLabel={`Acciones de ${p.name}`} align="start" testId={p.id === activeId ? 'project-menu' : undefined}>
              {(close) => (
                <>
                  <button
                    type="button"
                    className="menu-item"
                    onClick={() => {
                      duplicateProject(p.id);
                      close();
                    }}
                  >
                    Duplicar
                  </button>
                  <button
                    type="button"
                    className="menu-item danger"
                    data-testid="delete-project"
                    onClick={() => {
                      deleteProject(p.id);
                      close();
                    }}
                  >
                    Eliminar
                  </button>
                </>
              )}
            </Menu>
          </li>
        ))}
      </ul>
      <button type="button" className="link small" data-testid="restore-samples" onClick={restoreSamples}>
        Restaurar casos de ejemplo
      </button>
    </nav>
  );
}
