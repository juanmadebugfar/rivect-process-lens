import { buildSample } from './build';

/** Caso FICTICIO: estudio jurídico con pocos asuntos de alto valor, plazos y revisión de socios. */
export const juridicoSample = () =>
  buildSample({
    id: 'sample-juridico',
    name: 'Estudio jurídico — ciclo de vida de un asunto',
    sector: 'juridico',
    currency: 'USD',
    roles: [
      { id: 'r-para', name: 'Paralegal / asistente', hourlyCost: 18 },
      { id: 'r-asoc', name: 'Abogado/a asociado/a', hourlyCost: 45 },
      { id: 'r-socio', name: 'Socio/a', hourlyCost: 95 },
    ],
    stages: [
      { key: 'consulta', name: 'Consulta inicial con el cliente', role: 'r-socio', activity: 'especializado', minutes: 60, waitHours: 24, freq: [12, 'mes'], manual: 100, potential: 10, evidence: 'declarado' },
      { key: 'conflictos', name: 'Verificación de conflicto de intereses', role: 'r-para', activity: 'revision', minutes: 20, waitHours: 8, freq: [12, 'mes'], manual: 90, potential: 60, evidence: 'supuesto', notes: 'Se consulta una planilla y el correo; no hay registro único de partes.', solution: 'integracion_sistemas' },
      { key: 'alta', name: 'Alta de expediente y carga de datos', role: 'r-para', activity: 'captura', minutes: 25, freq: [12, 'mes'], manual: 95, potential: 65, rework: 10, evidence: 'declarado', solution: 'portal_recepcion' },
      { key: 'relevamiento', name: 'Relevamiento de documentación', role: 'r-para', activity: 'comunicacion', minutes: 45, waitHours: 72, freq: [12, 'mes'], manual: 90, potential: 45, evidence: 'supuesto', solution: 'recordatorios' },
      { key: 'redaccion', name: 'Redacción de escrito o contrato', role: 'r-asoc', activity: 'documento', minutes: 240, freq: [20, 'mes'], manual: 100, potential: 35, rework: 25, evidence: 'declarado', notes: 'Se parte de modelos guardados en carpetas personales.', solution: 'plantillas_documentos' },
      { key: 'revision', name: 'Revisión del socio', role: 'r-socio', activity: 'revision', minutes: 40, waitHours: 48, freq: [20, 'mes'], manual: 100, potential: 15, evidence: 'declarado', solution: 'flujo_aprobacion' },
      { key: 'aprobacion', name: 'Aprobación del cliente', role: 'r-asoc', activity: 'decision', minutes: 10, waitHours: 72, freq: [20, 'mes'], manual: 100, potential: 40, evidence: 'supuesto', solution: 'recordatorios' },
      { key: 'presentacion', name: 'Presentación ante sede / firma', role: 'r-para', activity: 'documento', minutes: 45, freq: [20, 'mes'], manual: 85, potential: 40, evidence: 'declarado', solution: 'plantillas_documentos' },
      { key: 'plazos', name: 'Control de plazos y vencimientos', role: 'r-para', activity: 'revision', minutes: 30, freq: [1, 'dia'], manual: 100, potential: 70, evidence: 'medido', notes: 'Revisión diaria de la planilla de vencimientos.', solution: 'tablero_alertas' },
      { key: 'avance', name: 'Informe de avance al cliente', role: 'r-asoc', activity: 'comunicacion', minutes: 20, freq: [30, 'mes'], manual: 95, potential: 65, evidence: 'supuesto', solution: 'recordatorios' },
      { key: 'honorarios', name: 'Registro de horas y facturación de honorarios', role: 'r-asoc', activity: 'captura', minutes: 15, freq: [1, 'dia'], people: 4, manual: 90, potential: 70, rework: 12, evidence: 'declarado', solution: 'integracion_sistemas' },
      { key: 'cobranza', name: 'Cobranza', role: 'r-para', activity: 'comunicacion', minutes: 10, waitHours: 120, freq: [20, 'mes'], manual: 90, potential: 60, evidence: 'supuesto', solution: 'recordatorios' },
    ],
    links: [
      ['consulta', 'conflictos'],
      ['conflictos', 'alta'],
      ['alta', 'relevamiento'],
      ['relevamiento', 'redaccion'],
      ['redaccion', 'revision'],
      ['revision', 'aprobacion'],
      ['aprobacion', 'presentacion'],
      ['presentacion', 'plazos'],
      ['plazos', 'avance'],
      ['presentacion', 'honorarios'],
      ['honorarios', 'cobranza'],
    ],
    meta: {
      clientName: 'Estudio Jurídico Ficticio (caso ilustrativo)',
      context:
        'Estudio de 7 profesionales con pocos asuntos de alto valor. El riesgo principal es perder un plazo; el costo principal es el tiempo de socios y asociados en revisión y redacción.',
      observations: 'Datos inventados para demostración. No se modela ningún asunto ni cliente real.',
      nextSteps: [
        'Relevar cuántos escritos parten de un modelo reutilizable y cuántos son a medida.',
        'Revisar con los socios qué decisiones de revisión podrían delegarse con criterios claros.',
        'Evaluar con el equipo cómo se registran hoy los plazos y qué alertas existen.',
      ],
    },
  });
