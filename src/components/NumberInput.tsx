import { useEffect, useState } from 'react'

interface NumberInputProps {
  value: number | null
  onChange: (value: number | null) => void
  label: string
  placeholder?: string
  suffix?: string
  className?: string
  invalid?: boolean
}

const parse = (raw: string): number | null => {
  const trimmed = raw.trim().replace(',', '.')
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

/** Numeric field that keeps what the user typed (".", "3.", "") instead of fighting it. */
export function NumberInput({
  value,
  onChange,
  label,
  placeholder,
  suffix,
  className = '',
  invalid = false,
}: NumberInputProps) {
  const [text, setText] = useState(value === null ? '' : String(value))

  useEffect(() => {
    setText((current) => (parse(current) === value ? current : value === null ? '' : String(value)))
  }, [value])

  return (
    <div className="relative">
      <input
        aria-label={label}
        className={`field tabular-nums ${suffix ? 'pr-7' : ''} ${
          invalid ? 'border-rose-500/70 text-rose-300' : ''
        } ${className}`}
        inputMode="decimal"
        placeholder={placeholder}
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          onChange(parse(event.target.value))
        }}
      />
      {suffix ? (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-500">
          {suffix}
        </span>
      ) : null}
    </div>
  )
}
