import { useState } from 'react'
import { GradeCalculator } from './components/GradeCalculator'
import { Reviewer } from './components/Reviewer'

type Mode = 'calculadora' | 'revisor'

const tabs: { id: Mode; label: string; hint: string }[] = [
  {
    id: 'calculadora',
    label: 'Calculadora de notas',
    hint: 'Notas ponderadas, guardadas en este navegador. Nada sale de tu dispositivo.',
  },
  {
    id: 'revisor',
    label: 'Revisor tesis-antítesis',
    hint: 'Dos modelos de Groq debaten tu taller hasta acordar si quedó bien o mal.',
  },
]

export default function App() {
  const [mode, setMode] = useState<Mode>('calculadora')
  const active = tabs.find((tab) => tab.id === mode) ?? tabs[0]

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-5 py-10 sm:py-16">
      <header className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              aria-current={tab.id === mode}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                tab.id === mode
                  ? 'border-zinc-500 bg-ink-800 text-zinc-100'
                  : 'border-ink-700 text-zinc-500 hover:text-zinc-300'
              }`}
              type="button"
              onClick={() => setMode(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-600">{active.hint}</p>
      </header>

      {mode === 'calculadora' ? <GradeCalculator /> : <Reviewer />}
    </main>
  )
}
