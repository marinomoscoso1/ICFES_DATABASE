# Calculadora de notas + Revisor tesis-antítesis + Práctica ICFES

Tres herramientas para estudiantes en una misma app, elegibles con las pestañas de arriba:

1. **Calculadora de notas** — cómo vas en una materia y qué necesitas en lo que falta.
2. **Revisor tesis-antítesis** — dos LLMs de Groq debaten tu taller hasta acordar si quedó bien o mal.
3. **Práctica ICFES** — simulacros tipo Saber 11 por área y dificultad, con la cadena de pensamiento explicada.

## Calculadora de notas

Aplicación web minimalista para saber cómo vas en una materia: listas los ítems que componen la nota
final con su porcentaje, escribes las notas que ya tienes y te dice el promedio que necesitas en lo
que falta para llegar a tu meta.

Todo vive en el navegador (`localStorage`): sin cuentas, sin backend, sin datos saliendo del dispositivo.

## Revisor tesis-antítesis

Agente de chat que revisa talleres o trabajos escolares/universitarios con un debate dialéctico en vez
de una sola opinión:

1. **Tesis** — un modelo argumenta, con citas del texto, que el trabajo quedó bien.
2. **Antítesis** — otro modelo argumenta que quedó mal.
3. Se responden ronda por ronda; cada uno puede conceder si el otro tiene razón. Cuando ambos veredictos
   coinciden hay **consenso** y el debate termina (máximo configurable de rondas).
4. **Síntesis** — un juez escribe el veredicto final: bien/mal, puntaje 0-100, fortalezas, problemas y
   acciones concretas. Si no hubo consenso, decide él.
5. Después puedes seguir chateando: las preguntas se responden con el debate y el veredicto como contexto.

La lógica del debate está en `src/lib/review.ts` y no depende de la red (el cliente de chat se inyecta),
así que se prueba con modelos falsos en `src/lib/review.test.ts`.

### Configuración

Necesitas una API key gratuita de Groq (<https://console.groq.com/keys>). Se pega en el panel
"Configuración de Groq" y se guarda solo en `localStorage`; las peticiones van del navegador directo a
`api.groq.com`, sin backend. Puedes elegir un modelo distinto para tesis, antítesis y juez
(`openai/gpt-oss-120b`, `qwen/qwen3.6-27b`, etc.); la lista de modelos vigentes de tu key está en
<https://console.groq.com/docs/models>.

El trabajo se pega en el textarea o se sube como archivo de texto (`.txt`, `.md`, `.tex`, código…).
Los `.pdf`/`.docx` son binarios: hay que copiar el texto o exportarlos a texto plano.

## Práctica ICFES

Simulacros de Saber 11 generados con Groq:

- **Áreas** (inglés queda fuera): lectura crítica, matemáticas, sociales y ciudadanas, y ciencias naturales
  separadas en biología, química y física. Se pueden combinar varias en un mismo test.
- **Dificultad** fácil / media / difícil, calibrada a los niveles de desempeño del ICFES.
- **1 a 20 preguntas**, repartidas por turnos entre las áreas elegidas (una llamada por área, indicándole
  al modelo los enunciados ya usados para que no se repita).
- Cada ítem sigue el formato oficial: contexto o texto base, enunciado y cuatro opciones A-D con una sola
  correcta; las preguntas mal formadas que devuelva el modelo se descartan.
- Al responder se marca el acierto o el error y se habilita **"Explícame cómo debí pensarlo"**: un tutor
  reconstruye la cadena de razonamiento paso a paso en el formato `Me dicen … → sé … → entonces …`, dice
  la idea clave, en qué paso se rompe la opción que elegiste y qué recordar para preguntas parecidas.
- La explicación solo aparece después de responder y de pedirla.

Usa la misma API key de Groq del revisor. Las preferencias (áreas, dificultad, cantidad) se guardan en
`localStorage`. La lógica está en `src/lib/icfes.ts` con el cliente de chat inyectado, probada sin red en
`src/lib/icfes.test.ts`.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS
- Vitest para la lógica de notas, del debate y del simulacro
- oxlint

## Cómo correrlo

```bash
nvm use          # Node 22 (Vite 8 requiere >= 20.19)
npm install
npm run dev      # http://localhost:5173
```

| Script              | Qué hace                          |
| ------------------- | --------------------------------- |
| `npm run dev`       | servidor de desarrollo            |
| `npm run build`     | typecheck + build de producción   |
| `npm run preview`   | sirve el build de producción      |
| `npm test`          | pruebas unitarias                 |
| `npm run lint`      | oxlint                            |
| `npm run typecheck` | `tsc -b`                          |

## Cómo se calculan los números

Para una materia con ítems `(peso%, nota)`:

- **Nota acumulada** — `Σ nota × peso / 100`. Los puntos que ya tienes asegurados, en la escala de la materia.
- **Promedio actual** — esa misma suma dividida entre el peso ya calificado: cómo vas en lo que han calificado.
- **Mejor caso** — la nota acumulada más la nota máxima en todos los ítems pendientes.
- **Necesitas** — `(meta − nota acumulada) / peso pendiente × 100`: el promedio que tienes que mantener
  en lo que falta. Si es ≤ 0 la meta ya está asegurada; si supera la escala, la meta es inalcanzable.

Los pesos son libres, así que una materia cuyos ítems no sumen 100% igual se calcula: la app solo
avisa de la diferencia.
