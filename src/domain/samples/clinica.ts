import { buildSample } from './build';

/** Caso FICTICIO: consultorio con agenda diaria de pacientes, historia clínica y convenios. */
export const clinicaSample = () =>
  buildSample({
    id: 'sample-clinica',
    name: 'Clínica — recorrido del paciente ambulatorio',
    sector: 'clinica',
    currency: 'UYU',
    roles: [
      { id: 'r-recep', name: 'Recepción', hourlyCost: 380 },
      { id: 'r-medico', name: 'Médico/a', hourlyCost: 1900 },
      { id: 'r-enf', name: 'Enfermería', hourlyCost: 650 },
      { id: 'r-fact', name: 'Facturación', hourlyCost: 450 },
    ],
    stages: [
      { key: 'solicitud', name: 'Solicitud de turno (teléfono / mensajería)', role: 'r-recep', activity: 'comunicacion', minutes: 6, waitHours: 2, freq: [20, 'dia'], manual: 95, potential: 70, rework: 5, evidence: 'declarado', solution: 'agenda_online' },
      { key: 'agenda', name: 'Asignación en agenda', role: 'r-recep', activity: 'captura', minutes: 3, freq: [20, 'dia'], manual: 100, potential: 75, rework: 8, evidence: 'supuesto', notes: 'Hay dobles reservas ocasionales.', solution: 'agenda_online' },
      { key: 'recordatorio', name: 'Recordatorio de turno', role: 'r-recep', activity: 'comunicacion', minutes: 3, freq: [18, 'dia'], manual: 100, potential: 90, evidence: 'declarado', solution: 'recordatorios' },
      { key: 'reprogramacion', name: 'Reprogramación por ausencias y cancelaciones', role: 'r-recep', activity: 'comunicacion', minutes: 8, waitHours: 6, freq: [4, 'dia'], manual: 90, potential: 60, evidence: 'supuesto', notes: 'Se estima ~20% de ausentismo. A medir con la agenda.', solution: 'recordatorios' },
      { key: 'admision', name: 'Admisión y verificación de cobertura', role: 'r-recep', activity: 'captura', minutes: 5, freq: [20, 'dia'], manual: 90, potential: 50, rework: 10, evidence: 'declarado', solution: 'portal_recepcion' },
      { key: 'consulta', name: 'Consulta médica', role: 'r-medico', activity: 'especializado', minutes: 25, freq: [20, 'dia'], manual: 100, potential: 5, evidence: 'medido' },
      { key: 'historia', name: 'Registro en historia clínica', role: 'r-medico', activity: 'captura', minutes: 8, freq: [20, 'dia'], manual: 90, potential: 40, rework: 5, evidence: 'declarado', notes: 'Se completa después de la consulta, con el paciente ya retirado.', solution: 'portal_recepcion' },
      { key: 'ordenes', name: 'Órdenes y recetas', role: 'r-medico', activity: 'documento', minutes: 5, freq: [14, 'dia'], manual: 85, potential: 60, evidence: 'supuesto', solution: 'plantillas_documentos' },
      { key: 'facturacion', name: 'Facturación y rendición a convenios', role: 'r-fact', activity: 'documento', minutes: 10, waitHours: 24, freq: [20, 'dia'], manual: 80, potential: 65, rework: 18, evidence: 'declarado', notes: 'Los rechazos de convenios obligan a reenviar.', solution: 'integracion_sistemas' },
      { key: 'seguimiento', name: 'Seguimiento post-consulta', role: 'r-enf', activity: 'comunicacion', minutes: 6, waitHours: 24, freq: [6, 'dia'], manual: 100, potential: 70, evidence: 'supuesto', solution: 'recordatorios' },
    ],
    links: [
      ['solicitud', 'agenda'],
      ['agenda', 'recordatorio'],
      ['recordatorio', 'reprogramacion'],
      ['recordatorio', 'admision'],
      ['reprogramacion', 'admision'],
      ['admision', 'consulta'],
      ['consulta', 'historia'],
      ['consulta', 'ordenes'],
      ['historia', 'facturacion'],
      ['ordenes', 'facturacion'],
      ['ordenes', 'seguimiento'],
    ],
    meta: {
      clientName: 'Consultorio Ficticio (caso ilustrativo)',
      context:
        'Consultorio con 4 profesionales y ~20 pacientes por día. El tiempo de médicos y recepción se consume en tareas administrativas alrededor de la consulta.',
      observations: 'Datos inventados para demostración. No incluye datos de pacientes ni de ninguna institución real.',
      nextSteps: [
        'Medir el ausentismo real de un mes con la agenda actual.',
        'Relevar qué convenios rechazan más facturas y por qué motivo.',
        'Revisar con el equipo médico qué datos de la historia clínica pueden cargarse antes de la consulta.',
      ],
    },
  });
