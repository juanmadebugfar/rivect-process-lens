import { useMemo } from 'react';
import { calcProject, type ProjectCalc } from '../domain/calc';
import { detectFindings, type Finding } from '../domain/findings';
import type { Project } from '../domain/types';

export interface Analysis {
  calc: ProjectCalc;
  findings: Finding[];
}

/** Cálculo y hallazgos derivados del proyecto; se recalculan en cada cambio. */
export function useAnalysis(project: Project | null): Analysis | null {
  return useMemo(() => {
    if (!project) return null;
    const calc = calcProject(project);
    return { calc, findings: detectFindings(project, calc) };
  }, [project]);
}
