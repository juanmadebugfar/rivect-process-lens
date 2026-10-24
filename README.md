# RIVECT Process Lens

Herramienta **interna** de RIVECT para usar durante reuniones comerciales: se dibuja el proceso actual de un cliente,
se detectan cuellos de botella y tareas repetitivas con reglas visibles, se simula un escenario con soluciones
tecnológicas y se genera un diagnóstico preliminar imprimible.

- Funciona **100 % en el navegador**: sin backend, sin servicios externos, sin claves, sin IA de pago.
- Los datos se guardan en `localStorage` del navegador y se pueden exportar/importar como JSON.
- Incluye tres casos **ficticios** claramente identificados: estudio contable, clínica/consultorio y estudio jurídico.
- No duplica Pulso Radar (investigación y relaciones comerciales): Process Lens solo trabaja el proceso operativo del cliente.

> Los números que muestra son **estimaciones bajo supuestos**, nunca ahorros demostrados. Ver "Cómo se calcula" en la pestaña *Supuestos*.

## Requisitos

- Node.js 20 o superior (probado con 22) y npm.

## Comandos

```bash
npm install            # instala dependencias
npm run dev            # servidor de desarrollo en http://localhost:5173
npm run build          # compila a dist/
npm run preview        # sirve dist/ en http://localhost:4173

npm run typecheck      # TypeScript estricto
npm run lint           # ESLint
npm run test           # pruebas unitarias (Vitest)
npm run test:e2e       # pruebas end-to-end (Playwright, Chromium)
npm run check          # typecheck + lint + unitarias + build
npm run screenshots    # regenera docs/screenshots con la app real
```

Las pruebas E2E levantan solas `npm run build && npm run preview`. Playwright usa el Chromium ya instalado en el entorno
(`PLAYWRIGHT_BROWSERS_PATH`); en una máquina nueva ejecutar una vez `npx playwright install chromium`.
`@playwright/test` está fijado en `1.63.0` para coincidir con ese navegador.

## Uso rápido

1. Elija un caso en la lista de **Procesos** (o cree uno con *+ Nuevo*).
2. **Proceso**: arrastre las etapas, conecte arrastrando desde el punto derecho de una etapa hacia otra
   (o desde el panel de la etapa), edite sus parámetros y observe cómo cambian los indicadores superiores.
   *Simular recorrido* ejecuta el flujo etapa por etapa con el calendario real del modelo.
3. **Hallazgos**: cuellos de botella, tareas repetitivas y oportunidades, con la regla y los valores que las activaron.
4. **Escenario**: asigne soluciones a las etapas, mueva el *factor de realización* y compare actual vs. propuesto.
5. **Supuestos**: moneda, días hábiles, costo por hora de cada rol y umbrales de las reglas.
6. **Diagnóstico**: informe listo para *Imprimir / guardar PDF*, descarga en Markdown y exportación de datos JSON.

Atajos: `Ctrl/Cmd+Z` deshacer, `Ctrl/Cmd+Shift+Z` rehacer, `Supr` elimina la etapa o conexión seleccionada.
Guía para reuniones: [`DEMO_COMERCIAL.md`](DEMO_COMERCIAL.md).

## Stack

| Pieza | Elección | Motivo |
|---|---|---|
| UI | React 19 + TypeScript estricto + Vite | Estándar, rápido, mantenible por un equipo chico |
| Lienzo de nodos | `@xyflow/react` (React Flow 12) | Librería madura para editores de flujo; nodos y conexiones propios |
| Estado | Zustand | Un store pequeño, sin boilerplate; historial propio para deshacer |
| Validación | Zod 4 | Un solo esquema da tipos y validación de datos importados/guardados |
| Movimiento | GSAP | Líneas de tiempo para la simulación y números animados; todo respeta `prefers-reduced-motion` |
| Estilos | CSS propio con variables | Sin framework: identidad visual propia y cero dependencias de diseño |
| Pruebas | Vitest + Playwright (+ axe-core) | Cálculos en unitarias; flujos, PDF y accesibilidad en E2E |

Decisiones y alternativas descartadas: [`docs/DECISIONES.md`](docs/DECISIONES.md).

## Estructura

```
src/
  domain/    Lógica pura y testeada: esquema, cálculo, reglas, grafo, calendario, diagnóstico, casos de ejemplo
  state/     Store (Zustand), historial y persistencia en localStorage
  ui/        Componentes, vistas (Proceso, Hallazgos, Escenario, Supuestos, Diagnóstico) y movimiento
  styles/    Tokens, base, vistas, movimiento e informe (@media print)
e2e/         Pruebas end-to-end y generador de capturas
docs/        Criterios de aceptación, decisiones y capturas
```

## Datos y privacidad

- Nada sale del navegador. No hay telemetría ni llamadas de red de la aplicación; la política CSP del `index.html` lo restringe.
- **No cargue datos personales ni de clientes reales sin su autorización.** Los casos incluidos son inventados.
  Para trabajar con un cliente real, cree un proceso nuevo (queda sin la marca "ficticio").
- El navegador guarda los datos por perfil: borrar datos del sitio los elimina. Exporte el JSON para conservarlos.

## Capturas

Ver [`docs/screenshots`](docs/screenshots) (generadas con `npm run screenshots`).
