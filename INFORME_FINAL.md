# Informe final — RIVECT Process Lens

Rama: `claude/sharp-mayer-77h7i8` · Pull request: https://github.com/juanmadebugfar/rivect-process-lens/pull/1 (sin merge). Estado: **flujo de negocio completo y utilizable**; verificaciones automáticas pasando.
Todo lo afirmado abajo como "verificado" fue ejecutado en esta sesión; lo que no se pudo probar figura en
*Limitaciones reales* y *No verificado*.

## 1. Qué se construyó

Aplicación web local (React 19 + TypeScript + Vite) con cinco secciones: **Proceso** (editor de nodos con simulación),
**Hallazgos** (reglas transparentes), **Escenario** (simulación de mejoras con fórmulas y sensibilidad), **Supuestos**
(roles, moneda, umbrales, fórmulas y límites) y **Diagnóstico** (informe imprimible). Tres casos ficticios de sectores
distintos, persistencia local, exportación/importación JSON y exportación del diagnóstico a PDF (impresión) y Markdown.

Tamaño: ~4.900 líneas de código de aplicación y ~1.400 de pruebas. Build: JS 678 kB (215 kB gzip) + CSS 55 kB (13 kB gzip).

## 2. Herramientas realmente disponibles en el entorno

| Herramienta pedida | Estado | Uso |
|---|---|---|
| Playwright | Disponible (Chromium preinstalado, v1.63) | Pruebas E2E, PDF real, capturas, depuración visual |
| Context7 | Disponible | Documentación de React Flow, Zustand y GSAP |
| GitHub (MCP) | Disponible | Push de la rama y pull request |
| Frontend Design (skill) | **No instalado** en esta sesión | Reemplazado por revisión visual propia con capturas reales |
| Ralph Loop | **No instalado** | Reemplazado por las rondas de revisión descritas en la sección 5 |
| Recursos web sugeridos (Magic UI, Aceternity, 21st.dev, Uiverse, Rive, ScrollTrigger) | Sitios **sin resolución DNS** desde el sandbox | No se pudieron inspeccionar; ver `docs/DECISIONES.md` para qué se adoptó como idea y por qué no como código |

## 3. Funcionalidades verificadas

| Criterio | Cómo se verificó | Resultado |
|---|---|---|
| Crear/editar/eliminar/conectar etapas | E2E: botón, inspector, lista, teclado (Supr), arrastre entre puertos, conexión por selector, deshacer | OK |
| Parámetros por etapa (duración, espera, frecuencia, tipo, % manual, potencial, retrabajo, personas, rol, procedencia) | E2E + unitarias de cálculo con valores verificados a mano | OK |
| Cuellos de botella y repetitivas con reglas transparentes | Unitarias por regla (CB1–CB5, TR1, OP1), umbrales editables en E2E | OK |
| Comparativa actual vs. propuesto | E2E: lienzo (vista propuesta), tabla con barras, KPIs, simulación | OK |
| Recálculo al cambiar variables | E2E: minutos, frecuencia/unidad, días hábiles, costo por hora, umbrales, realización, cobertura, inversión, horizonte | OK |
| Fórmulas, supuestos, límites, evidencia vs. hipótesis | Visibles en Supuestos/Escenario/Diagnóstico (E2E); lenguaje sin "garantiza/demostrado" (unitaria) | OK |
| Tres casos sectoriales distintos | Unitarias (esquema, integridad, resultados, diferencias estructurales) + E2E de navegación completa | OK |
| Diagnóstico comercial | Unitarias del generador + E2E de secciones y edición | OK |
| Exportar diagnóstico imprimible/PDF | E2E genera el PDF real (`page.pdf`), lo convierte con `pdftotext` y comprueba contenido, ≥2 páginas y ausencia de la interfaz; revisado a mano renderizando las 5 páginas a imagen | OK |
| Exportar/importar datos estructurados | E2E ida y vuelta; archivos inválidos; unitarias de saneamiento y seguridad | OK |
| Persistencia local | E2E: recarga, posición de nodos, datos corruptos → aviso + copia de respaldo | OK |
| Sin errores de consola | Las E2E principales (fixture compartida) y las de movimiento fallan ante `console.error/warning` o excepciones | OK (build de producción; en desarrollo `npm run dev` solo mostró avisos informativos de Vite/React) |
| Accesibilidad básica | axe-core (WCAG 2 A/AA) sin violaciones graves/críticas en las 5 secciones; pestañas con flechas; lista de etapas como alternativa al lienzo | OK |
| Responsividad | E2E: sin desbordamiento horizontal a 390, 768 y 1440 px en las 5 secciones | OK |
| Movimiento | E2E con movimiento forzado: entrada escalonada termina visible, pulsos en el camino crítico, números terminan en el valor exacto, simulación con estados intermedios, desactivado con `prefers-reduced-motion` | OK |
| Carga | E2E: 100 etapas importadas, editadas y recalculadas en ~1 s | OK |
| `npm run dev` | Probado: levanta y renderiza los 9 nodos del primer caso | OK |

## 4. Pruebas ejecutadas (resultado final)

- `npm run check` (typecheck estricto + ESLint + Vitest + build): **pasa**.
- Vitest: **71 pruebas en 6 archivos** (cálculo, grafo/ciclos, reglas, calendario de simulación, diagnóstico/Markdown,
  casos de ejemplo, serialización, saneamiento, seguridad de importación y store con historial).
- Playwright (`npm run test:e2e`, Chromium): **56 pruebas pasan**; además se ejecutó la suite completa con
  `--repeat-each=2` (110/110) para descartar intermitencias.
- `npm run screenshots` regenera 12 capturas reales en `docs/screenshots/`.

## 5. Rondas de revisión y mejora (Fases E y F)

Cada ronda partió de ejecutar la aplicación, interactuar y mirar capturas; no hubo cambios solo cosméticos.

**Ronda 1 — primera ejecución completa**
- El caso contable salía con neto mensual negativo por volumen y costos mal calibrados → se recalibró (150 clientes, solución más acotada). Una conclusión honesta, pero el ejemplo debe poder ilustrar el método.
- El lienzo lineal quedaba ilegible (zoom ~0,3) → disposición por bandas, lista de etapas colapsable, sin minimapa.
- Nodos de alturas distintas se superponían en la vista propuesta → métricas en dos líneas fijas, etiquetas cortas.
- **Bug real:** tras un archivo inválido, volver a elegir el mismo archivo no disparaba la importación → se reinicia el input siempre.
- Desbordamiento horizontal a 390/768 px (elementos `sr-only` absolutos y tablas sin contenedor) → contenedores con scroll interno.
- Deshacer iba tecla por tecla → ediciones consecutivas del mismo campo se agrupan.
- Importar un archivo con dos procesos de igual id los mezclaba (detectado en la revisión de código, no por una prueba fallida) → ids únicos al importar, con prueba.
- Etapa sin rol: ahora se avisa en el panel, en el lienzo y como limitación del diagnóstico.

**Ronda 2 — después del movimiento y del layout nuevo**
- **Bug real:** una etapa recién agregada podía quedar fuera de la vista → se centra al seleccionarla (prueba nueva).
- El panel lateral ocupaba una columna fija aun sin selección y el caso jurídico (12 etapas) se veía diminuto → panel flotante sobre el lienzo y disposición automática por proporción.
- El HUD de simulación tapaba etapas y el texto final era largo → barra compacta de una línea.
- Miniaturas de flujo ilegibles (escala uniforme) → escalas independientes.
- KPI en móvil ocupaban media pantalla y desbordaban → fila con scroll horizontal.
- Se muestra la atribución de React Flow (se había ocultado sin corresponder; el aviso apareció en desarrollo).
- Se revisó el PDF página por página; el contenido y los saltos son correctos.

## 6. Limitaciones reales

- **Modelo:** los ahorros son *capacidad liberada valorizada* bajo hipótesis (potencial, cobertura, realización). El retrabajo no se reduce con las soluciones. El tiempo de ciclo usa el camino más largo y trata todas las ramas como si ocurrieran siempre (p. ej. el reclamo de documentos ocurre en ~60 % de los casos pero cuenta completo). No se modelan volumen variable, curva de aprendizaje, licencias de terceros ni impuestos.
- **Costos de soluciones:** son referencias internas inventadas para sembrar el escenario; hay que reemplazarlas por cotizaciones reales.
- **Moneda:** etiqueta USD/UYU sin conversión.
- **Datos:** viven en `localStorage` de un navegador (≈5 MB); no hay sincronización ni trabajo multiusuario.
- **Casos de ejemplo:** valores inventados y plausibles; no son benchmarks sectoriales.
- **Lienzo:** los nodos son enfocables, pero conectar solo con teclado se hace desde el panel de la etapa (no arrastrando).
- **PDF:** depende del diálogo de impresión del navegador; el flujo automatizado se probó con Chromium.

### No verificado
Firefox y Safari; dispositivos táctiles reales; lectores de pantalla (solo axe automático); impresión en macOS/Windows
con otras impresoras/controladores; comportamiento con cuota de `localStorage` agotada (el código lo maneja y lo avisa,
pero no hay prueba E2E); tipografías en sistemas sin soporte de fuentes variables.

## 7. Deuda técnica

- Un solo bundle de 678 kB: React Flow y GSAP podrían cargarse perezosamente por vista.
- Algunas vistas (Escenario) son largas; conviene dividirlas en componentes y agregar pruebas de componentes (hoy la UI se cubre con E2E).
- La política de movimiento depende de `navigator.webdriver` y de una bandera en `localStorage` para las pruebas; sería más limpio un parámetro de URL o de build.
- CSS en archivos globales; si el producto crece, migrar a módulos CSS.
- El catálogo de soluciones está en código; debería poder editarse sin tocarlo.
- Faltan pruebas visuales de regresión (capturas de referencia comparadas).

## 8. Próximas mejoras sugeridas

1. Validar el modelo con dos clientes reales y ajustar reglas, umbrales y catálogo con datos medidos.
2. Probabilidad por rama (para que el reclamo cuente al 60 %) y simulación con variabilidad (rangos en vez de puntos).
3. Plantillas de proceso por sector y duplicación entre clientes.
4. Exportar diagnóstico a DOCX y a imagen del flujo para propuestas.
5. Importar etapas desde una planilla (CSV) para acelerar la carga en reunión.
6. Integración opcional con Pulso Radar (solo si se decide; hoy no hay dependencia).
7. Modo oscuro y atajos de teclado para conectar etapas.
