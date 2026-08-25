/**
 * Password gate for the public deployment. It keeps casual visitors out of the
 * Groq key baked into the build; it is not real security, since everything here
 * runs in the browser.
 */
const PASSWORD_HASH = '2f0a5e76649c2867056323b956903fb20048f11a817d5a1a5df16bcd32cd72b9'

export const UNLOCK_KEY = 'app-gate:v1'

/** With no key baked in, every user brings their own, so there is nothing to lock. */
export const gateEnabled = (): boolean => buildApiKey() !== ''

export const buildApiKey = (): string => import.meta.env.VITE_GROQ_API_KEY ?? ''

const sha256 = async (value: string): Promise<string> => {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export const checkPassword = async (input: string): Promise<boolean> =>
  (await sha256(input.trim().toLowerCase())) === PASSWORD_HASH

export function isUnlocked(): boolean {
  try {
    return localStorage.getItem(UNLOCK_KEY) === PASSWORD_HASH
  } catch {
    return false
  }
}

export function rememberUnlock(): void {
  try {
    localStorage.setItem(UNLOCK_KEY, PASSWORD_HASH)
  } catch {
    // Private mode: the session still works, it just asks again next time.
  }
}
