import { useEffect, useState } from 'react'
import { QuestionCard } from './QuestionCard'
import { GROQ_MODELS, groqChat } from '../lib/groq'
import {
  AREAS,
  DIFFICULTIES,
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  explainQuestion,
  generateTest,
  scoreTest,
} from '../lib/icfes'
import type { AreaId, Difficulty, Explanation, OptionId, Question } from '../lib/icfes'
import { loadIcfesSettings, saveIcfesSettings } from '../lib/icfesSettings'
import type { IcfesSettings } from '../lib/icfesSettings'
import { loadSettings, saveSettings } from '../lib/reviewSettings'
import type { ReviewSettings } from '../lib/reviewSettings'
import { createId } from '../lib/storage'

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : 'Algo salió mal al hablar con Groq.'

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
        active
          ? 'border-zinc-500 bg-ink-800 text-zinc-100'
          : 'border-ink-700 text-zinc-500 hover:text-zinc-300'
      }`}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  )
}

export function IcfesPractice() {
  const [groq, setGroq] = useState<ReviewSettings>(loadSettings)
  const [prefs, setPrefs] = useState<IcfesSettings>(loadIcfesSettings)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, OptionId>>({})
  const [explanations, setExplanations] = useState<Record<string, Explanation>>({})
  const [explaining, setExplaining] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(groq.apiKey === '')
  const [error, setError] = useState('')

  useEffect(() => {
    saveIcfesSettings(prefs)
  }, [prefs])

  const score = scoreTest(questions, answers)

  const toggleArea = (area: AreaId) =>
    setPrefs((current) => ({
      ...current,
      areas: current.areas.includes(area)
        ? current.areas.filter((entry) => entry !== area)
        : [...current.areas, area],
    }))

  const patchGroq = (patch: Partial<ReviewSettings>) =>
    setGroq((current) => {
      const next = { ...current, ...patch }
      saveSettings(next)
      return next
    })

  const generate = async () => {
    if (generating) return
    if (groq.apiKey.trim() === '') {
      setError('Agrega tu API key de Groq en la configuración.')
      return
    }
    if (prefs.areas.length === 0) {
      setError('Elige al menos un área.')
      return
    }

    setError('')
    setGenerating(true)
    setQuestions([])
    setAnswers({})
    setExplanations({})
    try {
      await generateTest({
        areas: prefs.areas,
        difficulty: prefs.difficulty,
        count: prefs.count,
        chat: groqChat,
        apiKey: groq.apiKey.trim(),
        model: groq.judgeModel,
        makeId: createId,
        onQuestions: (batch) => setQuestions((current) => [...current, ...batch]),
      })
    } catch (caught) {
      setError(errorText(caught))
    } finally {
      setGenerating(false)
    }
  }

  const explain = async (question: Question) => {
    if (explaining !== null) return
    setExplaining(question.id)
    setError('')
    try {
      const explanation = await explainQuestion({
        question,
        chosen: answers[question.id] ?? null,
        chat: groqChat,
        apiKey: groq.apiKey.trim(),
        model: groq.judgeModel,
      })
      setExplanations((current) => ({ ...current, [question.id]: explanation }))
    } catch (caught) {
      setError(errorText(caught))
    } finally {
      setExplaining(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <details
        className="rounded-lg border border-ink-700 bg-ink-900 p-4 text-sm"
        open={settingsOpen}
        onToggle={(event) => setSettingsOpen(event.currentTarget.open)}
      >
        <summary className="cursor-pointer text-zinc-400">
          Configuración de Groq {groq.apiKey === '' ? '— falta la API key' : '— lista'}
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="px-1 text-[0.7rem] uppercase tracking-wider text-zinc-500">API key</span>
            <input
              autoComplete="off"
              className="field font-mono"
              placeholder="gsk_..."
              type="password"
              value={groq.apiKey}
              onChange={(event) => patchGroq({ apiKey: event.target.value })}
            />
          </label>
          <label className="grid gap-1">
            <span className="px-1 text-[0.7rem] uppercase tracking-wider text-zinc-500">Modelo</span>
            <input
              className="field"
              list="groq-models-icfes"
              value={groq.judgeModel}
              onChange={(event) => patchGroq({ judgeModel: event.target.value })}
            />
            <datalist id="groq-models-icfes">
              {GROQ_MODELS.map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
          </label>
        </div>
        <p className="mt-3 text-xs text-zinc-600">
          Es la misma key del revisor: se guarda solo en este navegador.
        </p>
      </details>

      <section className="grid gap-4 rounded-lg border border-ink-700 bg-ink-900 p-4">
        <div className="grid gap-2">
          <span className="px-1 text-[0.7rem] uppercase tracking-wider text-zinc-500">
            Áreas (puedes combinarlas)
          </span>
          <div className="flex flex-wrap gap-2">
            {AREAS.map((area) => (
              <Chip
                key={area.id}
                active={prefs.areas.includes(area.id)}
                label={area.label}
                onClick={() => toggleArea(area.id)}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <span className="px-1 text-[0.7rem] uppercase tracking-wider text-zinc-500">Dificultad</span>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map((difficulty) => (
              <Chip
                key={difficulty.id}
                active={prefs.difficulty === difficulty.id}
                label={difficulty.label}
                onClick={() =>
                  setPrefs((current) => ({ ...current, difficulty: difficulty.id as Difficulty }))
                }
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="grid gap-1 sm:w-40">
            <span className="px-1 text-[0.7rem] uppercase tracking-wider text-zinc-500">Preguntas</span>
            <input
              className="field text-right"
              max={MAX_QUESTIONS}
              min={MIN_QUESTIONS}
              type="number"
              value={prefs.count}
              onChange={(event) =>
                setPrefs((current) => ({ ...current, count: Number(event.target.value) }))
              }
            />
          </label>
          <button className="btn" disabled={generating} type="button" onClick={() => void generate()}>
            {generating ? 'Generando…' : questions.length > 0 ? 'Nuevo test' : 'Generar test'}
          </button>
        </div>
      </section>

      {error === '' ? null : (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-300">
          {error}
        </p>
      )}

      {questions.length === 0 && !generating ? (
        <p className="rounded-lg border border-dashed border-ink-700 p-6 text-center text-sm text-zinc-600">
          Elige áreas y dificultad para generar un simulacro tipo ICFES. Después de responder cada
          pregunta puedes pedir la cadena de pensamiento que debiste seguir.
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        {questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            chosen={answers[question.id] ?? null}
            explaining={explaining === question.id}
            explanation={explanations[question.id] ?? null}
            index={index}
            question={question}
            onChoose={(option) => setAnswers((current) => ({ ...current, [question.id]: option }))}
            onExplain={() => void explain(question)}
          />
        ))}
        {generating ? <p className="text-sm text-zinc-600">Escribiendo preguntas…</p> : null}
      </div>

      {questions.length > 0 ? (
        <p className="sticky bottom-4 rounded-lg border border-ink-700 bg-ink-900/95 px-4 py-3 text-sm text-zinc-300">
          {score.correct}/{score.total} correctas
          <span className="text-zinc-600">
            {' '}
            · {score.answered} respondidas · {score.percentage}%
          </span>
        </p>
      ) : null}
    </div>
  )
}
