import { useState } from 'react'
import { GROQ_MODELS } from '../lib/groq'
import type { ReviewSettings } from '../lib/reviewSettings'

interface GroqSettingsPanelProps {
  settings: ReviewSettings
  onChange: (patch: Partial<ReviewSettings>) => void
  /** The reviewer needs a model per debater; the rest only use the judge model. */
  debate?: boolean
}

function ModelField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-1">
      <span className="px-1 text-[0.7rem] uppercase tracking-wider text-zinc-500">{label}</span>
      <input
        className="field"
        list="groq-models"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

export function GroqSettingsPanel({ settings, onChange, debate = false }: GroqSettingsPanelProps) {
  // Uncontrolled after mount: closing it while the user types would swallow keystrokes.
  const [open, setOpen] = useState(settings.apiKey === '')

  return (
    <details
      className="rounded-lg border border-ink-700 bg-ink-900 p-4 text-sm"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer text-zinc-400">
        Configuración de Groq {settings.apiKey === '' ? '— falta la API key' : '— lista'}
      </summary>

      <datalist id="groq-models">
        {GROQ_MODELS.map((model) => (
          <option key={model} value={model} />
        ))}
      </datalist>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-1">
          <span className="px-1 text-[0.7rem] uppercase tracking-wider text-zinc-500">API key</span>
          <input
            autoComplete="off"
            className="field font-mono"
            placeholder="gsk_..."
            type="password"
            value={settings.apiKey}
            onChange={(event) => onChange({ apiKey: event.target.value })}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          {debate ? (
            <>
              <ModelField
                label="Modelo tesis"
                value={settings.thesisModel}
                onChange={(thesisModel) => onChange({ thesisModel })}
              />
              <ModelField
                label="Modelo antítesis"
                value={settings.antithesisModel}
                onChange={(antithesisModel) => onChange({ antithesisModel })}
              />
            </>
          ) : null}
          <ModelField
            label={debate ? 'Modelo juez' : 'Modelo'}
            value={settings.judgeModel}
            onChange={(judgeModel) => onChange({ judgeModel })}
          />
        </div>
        {debate ? (
          <label className="grid gap-1 sm:w-40">
            <span className="px-1 text-[0.7rem] uppercase tracking-wider text-zinc-500">
              Rondas máximas
            </span>
            <input
              className="field text-right"
              max={6}
              min={1}
              type="number"
              value={settings.maxRounds}
              onChange={(event) => onChange({ maxRounds: Number(event.target.value) })}
            />
          </label>
        ) : null}
        <p className="text-xs text-zinc-600">
          La key se guarda solo en este navegador (la misma para las dos secciones) y viaja directo a{' '}
          <a
            className="underline hover:text-zinc-400"
            href="https://console.groq.com/keys"
            rel="noreferrer"
            target="_blank"
          >
            api.groq.com
          </a>
          . Groq tiene un plan gratuito con límites por minuto.
        </p>
      </div>
    </details>
  )
}
