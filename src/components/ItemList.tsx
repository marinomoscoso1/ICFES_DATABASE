import type { GradeItem } from '../types'
import { NumberInput } from './NumberInput'

interface ItemListProps {
  items: GradeItem[]
  maxScore: number
  onChange: (id: string, patch: Partial<GradeItem>) => void
  onRemove: (id: string) => void
  onAdd: () => void
}

export function ItemList({ items, maxScore, onChange, onRemove, onAdd }: ItemListProps) {
  return (
    <section className="space-y-2">
      <div className="grid grid-cols-[1fr_5.5rem_5.5rem_2rem] gap-2 px-1 text-[0.7rem] uppercase tracking-wider text-zinc-500">
        <span>Ítem</span>
        <span className="text-right">Peso</span>
        <span className="text-right">Nota</span>
        <span />
      </div>

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-ink-700 px-3 py-6 text-center text-sm text-zinc-500">
          Aún no hay ítems. Agrega las partes que componen tu nota final.
        </p>
      ) : null}

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="grid grid-cols-[1fr_5.5rem_5.5rem_2rem] items-center gap-2">
            <input
              aria-label="Nombre del ítem"
              className="field"
              placeholder="Parcial, taller, quiz…"
              value={item.name}
              onChange={(event) => onChange(item.id, { name: event.target.value })}
            />
            <NumberInput
              className="text-right"
              invalid={item.weight < 0}
              label={`Peso de ${item.name || 'ítem'}`}
              placeholder="0"
              suffix="%"
              value={item.weight}
              onChange={(weight) => onChange(item.id, { weight: weight ?? 0 })}
            />
            <NumberInput
              className="text-right"
              invalid={item.score !== null && (item.score < 0 || item.score > maxScore)}
              label={`Nota de ${item.name || 'ítem'}`}
              placeholder="—"
              value={item.score}
              onChange={(score) => onChange(item.id, { score })}
            />
            <button
              aria-label={`Eliminar ${item.name || 'ítem'}`}
              className="h-8 w-8 rounded-md text-zinc-600 transition-colors hover:bg-ink-800 hover:text-rose-400"
              type="button"
              onClick={() => onRemove(item.id)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <button className="btn w-full" type="button" onClick={onAdd}>
        + Agregar ítem
      </button>
    </section>
  )
}
