import { GROQ_MODELS } from '../lib/groq'
import type { ReviewSettings } from '../lib/reviewSettings'

interface ReviewSettingsPanelProps {
  settings: ReviewSettings
  onChange: (patch: Partial<ReviewSettings>) => void
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

export function ReviewSettingsPanel({ settings, onChange }: ReviewSettingsPanelProps) {
  return (
    <details className="rounded-lg border border-ink-700 bg-ink-900 p-4 text-sm" open={settings.apiKey === ''}>
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
          <ModelField
            label="Modelo juez"
            value={settings.judgeModel}
            onChange={(judgeModel) => onChange({ judgeModel })}
          />
        </div>
        <label className="grid gap-1 sm:w-40">
          <span className="px-1 text-[0.7rem] uppercase tracking-wider text-zinc-500">Rondas máximas</span>
          <input
            className="field text-right"
            max={6}
            min={1}
            type="number"
            value={settings.maxRounds}
            onChange={(event) => onChange({ maxRounds: Number(event.target.value) })}
          />
        </label>
        <p className="text-xs text-zinc-600">
          La key se guarda solo en este navegador y viaja directo a{' '}
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
