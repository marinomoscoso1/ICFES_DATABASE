import { describe, expect, it } from 'vitest'
import { checkPassword } from './gate'

describe('checkPassword', () => {
  it('acepta la contraseña sin importar espacios ni mayúsculas', async () => {
    await expect(checkPassword('jefferson stivens')).resolves.toBe(true)
    await expect(checkPassword('  Jefferson Stivens  ')).resolves.toBe(true)
  })

  it('rechaza cualquier otra cosa', async () => {
    await expect(checkPassword('')).resolves.toBe(false)
    await expect(checkPassword('jefferson')).resolves.toBe(false)
    await expect(checkPassword('jeffersonstivens')).resolves.toBe(false)
  })
})
