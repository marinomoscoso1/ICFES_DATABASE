import { useState } from 'react'
import { checkPassword, rememberUnlock } from '../lib/gate'

export function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (checking) return
    setChecking(true)
    if (await checkPassword(password)) {
      rememberUnlock()
      onUnlock()
    } else {
      setError('Contraseña incorrecta.')
      setChecking(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-4 px-5">
      <h1 className="text-lg text-zinc-200">Herramientas de estudio</h1>
      <form className="grid gap-3" onSubmit={(event) => void submit(event)}>
        <label className="grid gap-1">
          <span className="px-1 text-[0.7rem] uppercase tracking-wider text-zinc-500">Contraseña</span>
          <input
            autoFocus
            className="field"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setError('')
            }}
          />
        </label>
        <button className="btn" disabled={checking} type="submit">
          Entrar
        </button>
      </form>
      {error === '' ? null : <p className="text-sm text-amber-300">{error}</p>}
    </main>
  )
}
