# Calculadora de notas

Aplicación web minimalista para saber cómo vas en una materia: listas los ítems que componen la nota
final con su porcentaje, escribes las notas que ya tienes y te dice el promedio que necesitas en lo
que falta para llegar a tu meta.

Todo vive en el navegador (`localStorage`): sin cuentas, sin backend, sin datos saliendo del dispositivo.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS
- Vitest para la lógica de notas
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
