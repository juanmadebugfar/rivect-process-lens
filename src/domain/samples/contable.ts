import { buildSample } from './build';

/** Caso FICTICIO: estudio contable con cartera de clientes pyme y cierre mensual de IVA/BPS. */
export const contableSample = () =>
  buildSample({
    id: 'sample-contable',
    name: 'Estudio contable — cierre mensual de clientes',
    sector: 'contable',
    currency: 'UYU',
    roles: [
      { id: 'r-admin', name: 'Administrativo/a contable', hourlyCost: 520 },
      { id: 'r-contador', name: 'Contador/a', hourlyCost: 1400 },
    ],
    stages: [
      { key: 'recepcion', name: 'Recepción de documentación del cliente', role: 'r-admin', activity: 'comunicacion', minutes: 10, waitHours: 48, freq: [150, 'mes'], manual: 90, potential: 55, evidence: 'declarado', notes: 'Llega por correo, WhatsApp y en papel. El cliente suele enviarla tarde.', solution: 'portal_recepcion' },
      { key: 'reclamo', name: 'Reclamo de documentos faltantes', role: 'r-admin', activity: 'comunicacion', minutes: 12, waitHours: 24, freq: [90, 'mes'], manual: 95, potential: 80, evidence: 'supuesto', notes: 'Se estima que ~60% de los clientes envía incompleto. A confirmar.', solution: 'recordatorios' },
      { key: 'digitacion', name: 'Digitación de comprobantes', role: 'r-admin', activity: 'captura', minutes: 45, freq: [150, 'mes'], manual: 95, potential: 70, rework: 12, evidence: 'medido', notes: 'Cronometrado durante dos cierres por la administradora.', solution: 'extraccion_datos' },
      { key: 'conciliacion', name: 'Conciliación bancaria', role: 'r-admin', activity: 'revision', minutes: 30, freq: [150, 'mes'], manual: 85, potential: 65, rework: 8, evidence: 'declarado', solution: 'integracion_sistemas' },
      { key: 'revision', name: 'Revisión del contador', role: 'r-contador', activity: 'revision', minutes: 25, waitHours: 16, freq: [150, 'mes'], manual: 100, potential: 25, rework: 10, evidence: 'declarado', notes: 'Los cierres se acumulan en los últimos días del plazo.' },
      { key: 'liquidacion', name: 'Liquidación de impuestos', role: 'r-contador', activity: 'especializado', minutes: 35, freq: [150, 'mes'], manual: 80, potential: 30, evidence: 'declarado' },
      { key: 'aprobacion', name: 'Aprobación del cliente', role: 'r-admin', activity: 'decision', minutes: 5, waitHours: 24, freq: [150, 'mes'], manual: 100, potential: 40, evidence: 'supuesto', solution: 'recordatorios' },
      { key: 'presentacion', name: 'Presentación y pago', role: 'r-admin', activity: 'documento', minutes: 20, freq: [150, 'mes'], manual: 90, potential: 60, evidence: 'declarado', solution: 'plantillas_documentos' },
      { key: 'archivo', name: 'Archivo y legajo digital', role: 'r-admin', activity: 'documento', minutes: 8, freq: [150, 'mes'], manual: 100, potential: 85, evidence: 'supuesto', solution: 'plantillas_documentos' },
    ],
    links: [
      ['recepcion', 'reclamo'],
      ['recepcion', 'digitacion'],
      ['reclamo', 'digitacion'],
      ['digitacion', 'conciliacion'],
      ['conciliacion', 'revision'],
      ['revision', 'liquidacion'],
      ['liquidacion', 'aprobacion'],
      ['aprobacion', 'presentacion'],
      ['presentacion', 'archivo'],
    ],
    meta: {
      clientName: 'Estudio Contable Ficticio (caso ilustrativo)',
      context:
        'Estudio de 9 personas con 150 clientes pyme. El cierre mensual de IVA y aportes se concentra en pocos días y depende de que los clientes entreguen a tiempo.',
      observations: 'Datos inventados para demostración. No corresponden a ningún cliente real.',
      nextSteps: [
        'Cronometrar digitación y conciliación en 10 clientes reales durante un cierre.',
        'Relevar qué porcentaje de clientes entrega incompleto y por qué canal.',
        'Validar qué sistema contable se usa hoy y qué formatos de exportación admite.',
      ],
    },
  });
