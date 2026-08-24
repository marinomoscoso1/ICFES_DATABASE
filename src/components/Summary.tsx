import type { CourseStats } from '../lib/grades'
import { formatScore } from '../lib/grades'
import { WeightBar } from './WeightBar'

interface SummaryProps {
  stats: CourseStats
  maxScore: number
  targetScore: number
  weightGap: number
}

const verdict = (stats: CourseStats, maxScore: number, targetScore: number): string => {
  switch (stats.status) {
    case 'empty':
      return 'Agrega los ítems de tu nota final para ver cómo vas.'
    case 'finished':
      return `Todo está calificado. Nota final: ${formatScore(stats.earned)}.`
    case 'secured':
      return `Meta asegurada — ya llevas ${formatScore(stats.earned)} de ${formatScore(targetScore)}.`
    case 'impossible':
      return `Fuera de alcance: aun sacando ${formatScore(maxScore)} en todo llegarías a ${formatScore(stats.maxAchievable)}.`
    default:
      return `Necesitas ${formatScore(stats.requiredOnPending)} en el ${stats.pendingWeight}% que falta.`
  }
}

const tone: Record<CourseStats['status'], string> = {
  empty: 'text-zinc-500',
  finished: 'text-zinc-300',
  secured: 'text-emerald-400',
  reachable: 'text-amber-300',
  impossible: 'text-rose-400',
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-[0.7rem] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 text-xl tabular-nums text-zinc-100">{value}</p>
      {hint ? <p className="text-xs text-zinc-600">{hint}</p> : null}
    </div>
  )
}

export function Summary({ stats, maxScore, targetScore, weightGap }: SummaryProps) {
  return (
    <section className="space-y-5 rounded-lg border border-ink-700 bg-ink-900 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <p className="text-[0.7rem] uppercase tracking-wider text-zinc-500">Nota acumulada</p>
          <p className="whitespace-nowrap text-4xl font-light tabular-nums text-zinc-50">
            {formatScore(stats.earned)}
            <span className="text-lg text-zinc-600"> / {formatScore(maxScore)}</span>
          </p>
        </div>
        <p className={`text-sm sm:max-w-[22rem] sm:text-right ${tone[stats.status]}`}>
          {verdict(stats, maxScore, targetScore)}
        </p>
      </div>

      <WeightBar gradedWeight={stats.gradedWeight} pendingWeight={stats.pendingWeight} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat
          hint={`${stats.gradedWeight}% calificado`}
          label="Promedio actual"
          value={formatScore(stats.currentAverage)}
        />
        <Stat
          hint={`${stats.pendingWeight}% por calificar`}
          label="Pendiente"
          value={`${stats.pendingWeight}%`}
        />
        <Stat hint="si sacas el máximo" label="Mejor caso" value={formatScore(stats.maxAchievable)} />
        <Stat
          hint={stats.pendingWeight > 0 ? 'en lo que falta' : 'no queda nada por calificar'}
          label="Necesitas"
          value={stats.status === 'reachable' ? formatScore(stats.requiredOnPending) : '—'}
        />
      </div>

      {weightGap !== 0 ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
          {weightGap > 0
            ? `Los pesos suman ${100 - weightGap}% — falta asignar ${weightGap}%.`
            : `Los pesos suman ${100 - weightGap}% — hay ${-weightGap}% de más.`}
        </p>
      ) : null}
    </section>
  )
}
