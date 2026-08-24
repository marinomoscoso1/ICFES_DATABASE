import type { Verdict } from '../lib/review'

function List({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  if (items.length === 0) return null
  return (
    <div className="space-y-1">
      <p className="text-[0.7rem] uppercase tracking-wider text-zinc-500">{title}</p>
      <ul className="space-y-1 text-sm text-zinc-300">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2">
            <span className={tone}>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function VerdictCard({ verdict }: { verdict: Verdict }) {
  const good = verdict.stance === 'bien'
  return (
    <section
      className={`space-y-4 rounded-lg border p-5 ${good ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/5'}`}
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[0.7rem] uppercase tracking-wider text-zinc-500">Veredicto</p>
          <p className={`text-3xl font-light ${good ? 'text-emerald-300' : 'text-rose-300'}`}>
            {good ? 'Quedó bien' : 'Quedó mal'}
            {verdict.score === null ? null : (
              <span className="text-lg tabular-nums text-zinc-500"> · {verdict.score}/100</span>
            )}
          </p>
        </div>
        <p className="text-right text-xs text-zinc-500">
          {verdict.agreed ? 'Consenso' : 'Sin consenso, decidió el juez'} tras {verdict.rounds}{' '}
          {verdict.rounds === 1 ? 'ronda' : 'rondas'}
        </p>
      </div>
      <p className="text-sm text-zinc-200">{verdict.summary}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <List items={verdict.strengths} title="Fortalezas" tone="text-emerald-400" />
        <List items={verdict.issues} title="Problemas" tone="text-rose-400" />
      </div>
      <List items={verdict.actions} title="Qué mejorar" tone="text-amber-300" />
    </section>
  )
}
