# Criterios de aceptación — RIVECT Process Lens

Registrados al inicio (Fase A) y verificados al final (ver `INFORME_FINAL.md`).

## Patrones de diseño adoptados (investigación)

- **Value Stream Mapping (Lean):** separar *tiempo de trabajo activo* de *tiempo de espera* por etapa y
  medir *% de retrabajo* (equivalente a "%C&A"). De ahí los campos `activeMinutes`, `waitMinutes`, `reworkPct`.
- **Editor de nodos y conexiones (React Flow / @xyflow):** lienzo con selección, arrastre y conexión por
  handles, más un **inspector lateral** y una **lista de etapas** como alternativa accesible por teclado.
- **Reglas transparentes (rule-based):** cada hallazgo cita la regla, el umbral y los valores que la
  dispararon. Los umbrales son editables. No hay modelos opacos ni IA.
- **Separación evidencia / hipótesis:** cada etapa declara la procedencia del dato (medido, declarado,
  supuesto) y todo ahorro se presenta como *estimación bajo supuestos*, con rango de sensibilidad.

## Criterios funcionales

| # | Criterio | Verificación |
|---|----------|--------------|
| F1 | Crear, editar, eliminar, conectar y desconectar etapas (lienzo e inspector) | E2E |
| F2 | Por etapa: duración activa, espera, frecuencia (día/semana/mes), tipo de actividad, % manual, potencial de automatización, retrabajo, personas, rol, procedencia del dato | E2E + unit |
| F3 | Detección de cuellos de botella y tareas repetitivas con reglas visibles y umbrales editables | Unit + E2E |
| F4 | Comparativa actual vs. propuesto (lienzo, tabla y gráfico) | E2E |
| F5 | Recalcular tiempo y costo al cambiar variables; fórmulas, supuestos y límites visibles; sin ahorros "demostrados" | Unit + E2E |
| F6 | Tres casos sectoriales distintos (contable, clínica, jurídico), datos ficticios identificados | E2E |
| F7 | Diagnóstico comercial: problemas, mejoras, supuestos, limitaciones, siguientes pasos | Unit + E2E |
| F8 | Exportar diagnóstico imprimible/PDF; exportar/importar JSON validado | E2E (PDF real generado) |
| F9 | Persistencia local sin backend, con recuperación ante datos corruptos | Unit + E2E |

## Criterios no funcionales

- `npm install && npm run dev` inicia la app; `npm run check` ejecuta typecheck, lint, tests y build.
- Sin errores de consola en los flujos principales (verificado por E2E).
- Sin desbordamiento horizontal en 390 px / 768 px / 1440 px.
- Controles con etiqueta, foco visible, navegación por teclado en la lista de etapas, contraste AA en texto.
- Sin dependencias de servicios externos ni claves; fuentes autoalojadas; CSP restrictiva.
- Importación de JSON validada con esquema; sin `dangerouslySetInnerHTML`.
