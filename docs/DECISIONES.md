# Decisiones técnicas y de producto

Formato: decisión → motivo → alternativa descartada.

## Arquitectura

1. **SPA 100 % local (React + TypeScript + Vite), sin backend.**
   Motivo: la herramienta se usa en reuniones, con datos sensibles del cliente; no tener servidor elimina costos,
   despliegues y riesgo de fuga. Alternativa descartada: backend + base de datos (solo se justificaría con trabajo
   multiusuario o integración con Pulso Radar, que hoy no se pide).
2. **Dominio puro separado de la UI (`src/domain`).** Todos los cálculos, reglas, el calendario de simulación y el
   diagnóstico son funciones puras con tests unitarios; la UI solo las invoca. Cambiar una fórmula no toca componentes.
3. **Un solo esquema Zod como fuente de verdad** (`domain/types.ts`): de él salen los tipos, la validación de importaciones
   y la de `localStorage`. Tras validar se repara la integridad referencial (conexiones colgantes, roles inexistentes).
4. **Persistencia en `localStorage` con versión** (`rivect-process-lens:v1`). Si los datos están dañados se conserva una
   copia (`…:corrupt-backup`) y se restauran los ejemplos con un aviso. Guardado diferido 250 ms.
5. **Historial propio (deshacer/rehacer)** con snapshots inmutables que recuerdan el proceso activo. Las ediciones
   consecutivas del mismo campo en 1,5 s se agrupan en un paso (si no, deshacer iría tecla por tecla).
6. **Enrutado por hash** (`#/escenario`): sin dependencia, permite enlazar secciones y usar atrás/adelante.

## Modelo de negocio (transparente por diseño)

7. **Tiempo activo ≠ espera.** Siguiendo Value Stream Mapping, la espera no consume horas de trabajo pero sí alarga el
   tiempo de ciclo. El retrabajo se modela como % que multiplica el tiempo activo.
8. **Ahorro = capacidad liberada valorizada**, no dinero ahorrado. Se dice así en la interfaz y en el diagnóstico.
9. **Reducción = % manual × potencial × cobertura × realización.** Cuatro factores entre 0 y 1: nunca supera la parte
   manual y cada uno es visible y editable. El *potencial* es hipótesis del analista; la *cobertura* es propia de cada
   solución; la *realización* modela adopción real. Se muestra el cálculo paso a paso por etapa y una tabla de sensibilidad.
10. **Evidencia vs. hipótesis:** cada etapa declara si su dato es *medido*, *declarado* o *supuesto* (borde punteado en el
    lienzo). El diagnóstico informa qué % de las horas descansa en supuestos y lista las etapas a validar primero.
11. **Reglas de detección explícitas** (CB1–CB5, TR1, OP1) con umbrales editables; cada hallazgo cita regla y valores.
    No hay modelos opacos ni IA. Prioridad *alta* = 3 o más reglas, o 2 o más de cuello, sobre la misma etapa.
12. **Una moneda por proceso, como etiqueta (USD/UYU) sin conversión.** Evita falsas precisiones por tipo de cambio.
    Los costos de soluciones son referencias a cotizar, no una oferta, y se siembran según la moneda.
13. **Una solución puede cubrir varias etapas y su costo se cuenta una vez** (un portal sirve para varias etapas).
    Se advierte si la solución no es adecuada al tipo de actividad.
14. **Tiempo de ciclo = camino más largo** del grafo. Los ciclos se detectan, se ignoran para ese cálculo y se avisa.

## Interfaz y movimiento

15. **Dirección visual:** papel cálido, tinta casi negra y una sola señal cromática por significado
    (naranja = atención/camino crítico, verde = propuesto, ocre punteado = hipótesis). Tipografías autoalojadas:
    Instrument Sans (interfaz), JetBrains Mono (cifras tabulares) y Source Serif 4 (informe).
16. **Editor de nodos con dos alternativas accesibles:** lista de etapas y panel de la etapa permiten crear, editar y
    conectar sin arrastrar. El panel de la etapa es flotante (como el de un nodo en n8n) para no quitar área al flujo.
17. **Disposición automática por proporción:** elige la cantidad de columnas que acerca el conjunto a la proporción
    de un lienzo típico, de modo que 9–12 etapas se vean legibles sin hacer zoom.
18. **Movimiento con significado** (a pedido de RIVECT, para transmitir sensación de flujo/automatización):
    pulsos que recorren el camino crítico (dirección del trabajo), destello en la etapa cuyo valor se recalcula,
    números que corren hacia su nuevo valor, y *Simular recorrido*, que ejecuta el flujo con el calendario real
    (cada etapa arranca cuando terminan sus predecesoras) comprimido a unos segundos. Se apaga con
    `prefers-reduced-motion` y bajo automatización (`navigator.webdriver`) para que las pruebas sean deterministas;
    las pruebas de movimiento lo fuerzan con `localStorage['rivect:motion']='1'`.
19. **Informe imprimible con CSS `@media print`** en lugar de generar PDF en el cliente: texto seleccionable, sin
    dependencias y con la tipografía del sistema de impresión. Verificado generando el PDF real con Playwright.

## Recursos sugeridos por el equipo: qué se usó y qué no

| Recurso | Decisión | Motivo |
|---|---|---|
| React Flow | **Usado** (núcleo del lienzo) | Documentación consultada con Context7; nodos y conexiones personalizados |
| GSAP | **Usado** (`gsap` core) | Líneas de tiempo de la simulación y tween de números; documentación consultada con Context7 |
| GSAP ScrollTrigger | No usado | Animaría por scroll; el informe debe estar completo al imprimir/exportar y la app no es una página larga |
| Rive | No usado | Requiere archivos `.riv` diseñados en su editor y un runtime WASM; no hay activos y no aporta a un producto de datos |
| Magic UI, Aceternity UI, 21st.dev, Uiverse | No usados como código | Son colecciones de componentes pensadas para Tailwind/framer-motion; sumarían dependencias y una estética decorativa que el brief pide evitar. Se tomó la **idea** (haz de luz sobre la conexión, indicadores de ejecución) y se implementó en SVG/CSS propios. |

Nota: desde el entorno de esta sesión esos sitios no resolvían (sin DNS), por lo que no se pudo inspeccionar su código;
las referencias de patrones salen del conocimiento previo y de la documentación de GSAP y React Flow.

Atribución de React Flow visible en el lienzo (sin suscripción Pro no corresponde ocultarla).

## Seguridad

- CSP restrictiva en `index.html` (`default-src 'self'`; `style-src 'unsafe-inline'` solo porque React Flow aplica estilos en línea).
- Sin `dangerouslySetInnerHTML`; todo texto de usuario se renderiza escapado. Las importaciones se validan con esquema,
  límite de 5 MB y rangos; hay pruebas contra `__proto__`/`constructor` como claves.
- Sin red, cookies ni telemetría. Las fuentes están autoalojadas.
