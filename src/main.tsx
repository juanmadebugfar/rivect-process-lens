import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/instrument-sans';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/source-serif-4';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';
import './styles/process.css';
import './styles/views.css';
import './styles/motion.css';
import './styles/report.css';
import { App } from './App';
import { initMotion } from './ui/motion';

initMotion();
const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el elemento #root');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
