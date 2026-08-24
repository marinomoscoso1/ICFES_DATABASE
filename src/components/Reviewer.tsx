import { useEffect, useRef, useState } from 'react'
import { DebateMessage } from './DebateMessage'
import { ReviewSettingsPanel } from './ReviewSettingsPanel'
import { VerdictCard } from './VerdictCard'
import { readDocumentFile, TEXT_EXTENSIONS } from '../lib/documentFile'
import { groqChat } from '../lib/groq'
import type { ChatMessage } from '../lib/groq'
import { answerFollowUp, runReview } from '../lib/review'
import type { DebateTurn, Verdict } from '../lib/review'
import { createId } from '../lib/storage'
import { loadSettings, saveSettings } from '../lib/reviewSettings'
import type { ReviewSettings } from '../lib/reviewSettings'

type EntryBody =
  | { kind: 'turn'; turn: DebateTurn }
  | { kind: 'verdict'; verdict: Verdict }
  | { kind: 'user' | 'assistant' | 'error'; text: string }

type Entry = EntryBody & { id: string }

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : 'Algo salió mal al hablar con Groq.'

export function Reviewer() {
  const [settings, setSettings] = useState<ReviewSettings>(loadSettings)
  const [document, setDocument] = useState('')
  const [brief, setBrief] = useState('')
  const [fileName, setFileName] = useState('')
  const [entries, setEntries] = useState<Entry[]>([])
  const [question, setQuestion] = useState('')
  const [status, setStatus] = useState<'idle' | 'debating' | 'answering'>('idle')
  const [review, setReview] = useState<{ turns: DebateTurn[]; verdict: Verdict } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [entries])

  const busy = status !== 'idle'
  const patchSettings = (patch: Partial<ReviewSettings>) =>
    setSettings((current) => ({ ...current, ...patch }))
  const push = (entry: EntryBody) => setEntries((current) => [...current, { ...entry, id: createId() }])

  const pickFile = async (file: File | undefined) => {
    if (!file) return
    try {
      setDocument(await readDocumentFile(file))
      setFileName(file.name)
    } catch (error) {
      setFileName('')
      push({ kind: 'error', text: errorText(error) })
    }
  }

  const startReview = async () => {
    if (busy) return
    if (settings.apiKey.trim() === '') {
      push({ kind: 'error', text: 'Agrega tu API key de Groq en la configuración.' })
      return
    }
    if (document.trim() === '') {
      push({ kind: 'error', text: 'Sube un archivo de texto o pega el trabajo a revisar.' })
      return
    }

    setStatus('debating')
    setReview(null)
    setEntries([])
    try {
      const result = await runReview({
        document,
        brief,
        chat: groqChat,
        apiKey: settings.apiKey.trim(),
        thesisModel: settings.thesisModel,
        antithesisModel: settings.antithesisModel,
        judgeModel: settings.judgeModel,
        maxRounds: settings.maxRounds,
        onTurn: (turn) => {
          if (turn.role !== 'sintesis') push({ kind: 'turn', turn })
        },
      })
      setReview(result)
      push({ kind: 'verdict', verdict: result.verdict })
    } catch (error) {
      push({ kind: 'error', text: errorText(error) })
    } finally {
      setStatus('idle')
    }
  }

  const ask = async () => {
    const text = question.trim()
    if (busy || text === '' || !review) return
    setQuestion('')
    push({ kind: 'user', text })
    setStatus('answering')
    try {
      const history = entries
        .filter((entry): entry is Entry & { kind: 'user' | 'assistant' } =>
          entry.kind === 'user' || entry.kind === 'assistant',
        )
        .map<ChatMessage>((entry) => ({
          role: entry.kind === 'user' ? 'user' : 'assistant',
          content: entry.text,
        }))
      const answer = await answerFollowUp({
        question: text,
        document,
        brief,
        turns: review.turns,
        verdict: review.verdict,
        history,
        chat: groqChat,
        apiKey: settings.apiKey.trim(),
        model: settings.judgeModel,
      })
      push({ kind: 'assistant', text: answer })
    } catch (error) {
      push({ kind: 'error', text: errorText(error) })
    } finally {
      setStatus('idle')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <ReviewSettingsPanel settings={settings} onChange={patchSettings} />

      <section className="grid gap-3 rounded-lg border border-ink-700 bg-ink-900 p-4">
        <label className="grid gap-1">
          <span className="px-1 text-[0.7rem] uppercase tracking-wider text-zinc-500">
            Consigna del taller (opcional)
          </span>
          <input
            className="field"
            placeholder="Ej: ensayo de 2 páginas sobre la Revolución Francesa con 3 fuentes"
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
          />
        </label>

        <label className="grid gap-1">
          <span className="px-1 text-[0.7rem] uppercase tracking-wider text-zinc-500">
            Trabajo a revisar {fileName ? `— ${fileName}` : ''}
          </span>
          <textarea
            className="field min-h-40 resize-y font-mono text-xs leading-relaxed"
            placeholder="Pega aquí el texto del taller, o sube un archivo."
            value={document}
            onChange={(event) => {
              setDocument(event.target.value)
              setFileName('')
            }}
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="btn cursor-pointer">
            Subir archivo
            <input
              accept={TEXT_EXTENSIONS.join(',')}
              className="hidden"
              type="file"
              onChange={(event) => {
                void pickFile(event.target.files?.[0])
                event.target.value = ''
              }}
            />
          </label>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-600">{document.trim().length} caracteres</span>
            <button className="btn" disabled={busy} type="button" onClick={() => void startReview()}>
              {status === 'debating' ? 'Debatiendo…' : 'Revisar con tesis-antítesis'}
            </button>
          </div>
        </div>
      </section>

      {entries.length === 0 && !busy ? (
        <p className="rounded-lg border border-dashed border-ink-700 p-6 text-center text-sm text-zinc-600">
          Dos modelos van a debatir tu trabajo: uno defiende que quedó bien y el otro que quedó mal,
          ronda tras ronda, hasta llegar a un acuerdo.
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {entries.map((entry) => {
          if (entry.kind === 'turn') return <DebateMessage key={entry.id} turn={entry.turn} />
          if (entry.kind === 'verdict') return <VerdictCard key={entry.id} verdict={entry.verdict} />
          if (entry.kind === 'error')
            return (
              <p
                key={entry.id}
                className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-300"
              >
                {entry.text}
              </p>
            )
          return (
            <p
              key={entry.id}
              className={
                entry.kind === 'user'
                  ? 'self-end rounded-lg border border-ink-700 bg-ink-800 px-4 py-2 text-sm text-zinc-200'
                  : 'rounded-lg border border-ink-700 bg-ink-900 px-4 py-3 text-sm whitespace-pre-wrap text-zinc-300'
              }
            >
              {entry.text}
            </p>
          )
        })}
        {busy ? <p className="text-sm text-zinc-600">Pensando…</p> : null}
        <div ref={bottomRef} />
      </div>

      <form
        className="sticky bottom-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void ask()
        }}
      >
        <input
          className="field"
          disabled={review === null || busy}
          placeholder={
            review === null ? 'Primero corre la revisión' : 'Pregunta sobre el veredicto…'
          }
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button className="btn" disabled={review === null || busy || question.trim() === ''} type="submit">
          Enviar
        </button>
      </form>
    </div>
  )
}
