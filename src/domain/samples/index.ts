import type { Project } from '../types';
import { clinicaSample } from './clinica';
import { contableSample } from './contable';
import { juridicoSample } from './juridico';

export const sampleProjects = (): Project[] => [contableSample(), clinicaSample(), juridicoSample()];
