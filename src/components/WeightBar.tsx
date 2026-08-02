interface WeightBarProps {
  gradedWeight: number
  pendingWeight: number
}

const pct = (value: number): string => `${Math.max(0, Math.min(100, value))}%`

export function WeightBar({ gradedWeight, pendingWeight }: WeightBarProps) {
  const unassigned = Math.max(0, 100 - gradedWeight - pendingWeight)

  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
      <div className="bg-emerald-400/80" style={{ width: pct(gradedWeight) }} title="Calificado" />
      <div className="bg-zinc-500/60" style={{ width: pct(pendingWeight) }} title="Pendiente" />
      <div className="bg-transparent" style={{ width: pct(unassigned) }} title="Sin asignar" />
    </div>
  )
}
