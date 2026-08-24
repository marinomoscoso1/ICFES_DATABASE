import type { DebateTurn, Role } from '../lib/review'

const roleLabel: Record<Role, string> = {
  tesis: 'Tesis · defiende que quedó bien',
  antitesis: 'Antítesis · sostiene que quedó mal',
  sintesis: 'Síntesis · acuerdo final',
}

const roleTone: Record<Role, string> = {
  tesis: 'border-emerald-500/30 bg-emerald-500/5',
  antitesis: 'border-rose-500/30 bg-rose-500/5',
  sintesis: 'border-zinc-500/40 bg-ink-800',
}

const stanceTone: Record<DebateTurn['stance'], string> = {
  bien: 'text-emerald-400',
  mal: 'text-rose-400',
}

export function DebateMessage({ turn }: { turn: DebateTurn }) {
  return (
    <article className={`space-y-2 rounded-lg border p-4 ${roleTone[turn.role]}`}>
      <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <p className="text-[0.7rem] uppercase tracking-wider text-zinc-400">{roleLabel[turn.role]}</p>
        <p className="whitespace-nowrap text-[0.7rem] text-zinc-500">
          ronda {turn.round} ·{' '}
          <span className={stanceTone[turn.stance]}>
            {turn.stance === 'bien' ? 'quedó bien' : 'quedó mal'}
          </span>{' '}
          · {Math.round(turn.confidence * 100)}%
        </p>
      </header>
      <p className="text-sm text-zinc-200">{turn.summary}</p>
      {turn.points.length > 0 ? (
        <ul className="space-y-1 text-sm text-zinc-400">
          {turn.points.map((point, index) => (
            <li key={index} className="flex gap-2">
              <span className="text-zinc-600">—</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}
