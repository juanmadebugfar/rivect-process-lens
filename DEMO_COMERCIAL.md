# Cómo usar Process Lens en una reunión comercial

Guía para el equipo de RIVECT. Dura 30–40 minutos con un cliente potencial. El objetivo **no** es vender una
herramienta ni prometer un ahorro: es **dibujar su proceso con ellos**, mostrar dónde se pierde tiempo y dejar claro
qué habría que medir para decidir si conviene mejorarlo.

## Antes de la reunión (10 minutos)

1. `npm install && npm run dev` (o `npm run build && npm run preview`) y abra la aplicación en el navegador de la reunión.
   Funciona sin internet.
2. Elija el caso de ejemplo del **mismo sector** del cliente para mostrar el método (contable, clínica o jurídico). Son datos
   inventados y están marcados como *Datos ficticios*.
3. Cree un proceso nuevo (*+ Nuevo*) para el cliente real, con un nombre neutro. Eso evita mezclar datos con los ficticios.
4. Cargue en *Supuestos* los **roles** y su costo por hora si el cliente lo comparte; si no, deje los valores de ejemplo
   y dígalo: "son tentativos, los afinamos juntos".
5. Si va a proyectar: use pantalla completa y *Ctrl +* hasta que el lienzo se lea desde el fondo de la sala.
6. **No cargue datos personales** (nombres de pacientes, clientes o casos). Solo etapas, tiempos y frecuencias.

## Guion sugerido

| Min | Qué hacer | Qué decir |
|---|---|---|
| 0–5 | Mostrar el caso de ejemplo de su sector en **Proceso**. Pulsar *Simular recorrido* una vez. | "Esto es un ejemplo inventado. Así se ve un proceso que corre etapa por etapa. Vamos a hacer lo mismo con el suyo." |
| 5–15 | En el proceso del cliente, **agregar etapas** a medida que las cuenta y conectarlas. Para cada una pedir: ¿cuánto tarda trabajando?, ¿cuánto espera?, ¿cuántas veces por mes?, ¿quién lo hace? | "No hace falta exactitud: marcamos cada dato como *medido*, *declarado* o *supuesto*, y después validamos lo que más pesa." |
| 15–20 | Ir a **Hallazgos**. Abrir una regla y leer en voz alta el valor que la activó. | "No es una opinión nuestra: es esta regla con este umbral. Si ustedes piensan que el umbral es otro, lo cambiamos." (*Supuestos → Umbrales*) |
| 20–28 | En **Escenario** asignar una o dos soluciones a las etapas con más horas. Mover el *factor de realización* en vivo. Mostrar *Sensibilidad* y *Cálculo paso a paso*. | "Si todo sale al 100 % pasaría esto; si solo se logra la mitad, esto otro. Lo importante es qué tendríamos que confirmar para saber cuál es el real." |
| 28–35 | Ir a **Diagnóstico**, completar *Cliente*, *Contexto* y *Siguientes pasos*. *Imprimir / guardar PDF*. | "Les dejamos esto como documento preliminar. Los siguientes pasos son medir las etapas marcadas como supuesto." |

## Qué se puede afirmar y qué no

**Se puede decir**
- "Con los datos que cargamos hoy, estas etapas concentran X % de las horas."
- "Si la solución cubriera tanto y se adoptara tanto, la capacidad liberada sería del orden de Y horas por mes."
- "Para decidir, necesitamos medir estas tres etapas durante un ciclo."

**No decir**
- "Van a ahorrar $X." El número es capacidad liberada valorizada a costo por hora; solo es dinero si esa capacidad se
  reasigna o evita una contratación. La herramienta lo escribe así y el diagnóstico también.
- "Esto cuesta X." Los costos de las soluciones son **referencias para cotizar**, no una oferta.
- "La herramienta detectó el problema." Las reglas son criterios de trabajo con umbrales editables; son un punto de partida
  para conversar.

## Preguntas frecuentes del cliente

- **¿Y si mis tiempos no son exactos?** Se marcan como *supuesto*; el diagnóstico dice qué parte de las horas descansa en
  supuestos y propone validar primero las de mayor peso.
- **¿Se puede ver con otro escenario?** Sí: cambie el factor de realización, la cobertura de una solución o su costo;
  todo se recalcula al instante y queda en la tabla de sensibilidad.
- **¿Dónde quedan nuestros datos?** Solo en este navegador. Puede exportar un JSON y borrarlo al terminar.
- **¿Se conecta con nuestros sistemas?** No. Es una herramienta de diagnóstico; la integración sería una etapa posterior.

## Después de la reunión

1. En **Diagnóstico**: revisar el texto, *Imprimir / guardar PDF* (elegir "Guardar como PDF") y, si ayuda, *Descargar Markdown*.
2. *Exportar datos (JSON)* y guardarlo en la carpeta del cliente (no se integra automáticamente con Pulso Radar).
3. Revisar el diagnóstico internamente **antes** de enviarlo: el texto de contexto, observaciones y pasos son editables.
4. Si el cliente avanza: medir las etapas de mayor carga marcadas como *supuesto*, actualizar sus datos y regenerar el diagnóstico.
5. Para una propuesta formal, cotizar aparte: los costos del diagnóstico son placeholders.

## Problemas conocidos al presentar

- Si el navegador bloquea el almacenamiento local (modo privado estricto), la barra superior lo indica y los cambios no se
  conservarán: exporte el JSON antes de cerrar.
- El PDF se genera desde el diálogo de impresión del navegador; probado con Chromium. En otros navegadores verifique la
  vista previa (márgenes y saltos de página).
- Un proceso de 100 etapas se importó y recalculó en menos de 1 segundo en la prueba de carga, pero el lienzo se vuelve ilegible mucho antes: en una reunión conviene agrupar etapas pequeñas (idealmente 8–15).
