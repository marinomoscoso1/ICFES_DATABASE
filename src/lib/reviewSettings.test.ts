import { describe, expect, it } from 'vitest'
import { defaultSettings, parseSettings } from './reviewSettings'
import { unsupportedFileMessage } from './documentFile'

describe('parseSettings', () => {
  it('keeps stored values and clamps the round count', () => {
    const settings = parseSettings(JSON.stringify({ apiKey: 'gsk', thesisModel: 'm', maxRounds: 99 }))
    expect(settings).toEqual({ ...defaultSettings(), apiKey: 'gsk', thesisModel: 'm', maxRounds: 6 })
  })

  it('replaces models Groq retired with the current defaults', () => {
    const settings = parseSettings(JSON.stringify({ thesisModel: 'llama-3.3-70b-versatile' }))
    expect(settings?.thesisModel).toBe(defaultSettings().thesisModel)
  })

  it('falls back to null on junk', () => {
    expect(parseSettings(null)).toBeNull()
    expect(parseSettings('not json')).toBeNull()
  })
})

describe('unsupportedFileMessage', () => {
  it('accepts text formats', () => {
    expect(unsupportedFileMessage('taller.md')).toBeNull()
    expect(unsupportedFileMessage('Taller.TXT')).toBeNull()
  })

  it('explains what to do with binary documents', () => {
    expect(unsupportedFileMessage('taller.pdf')).toContain('copia el texto')
    expect(unsupportedFileMessage('taller.png')).toContain('No puedo leer')
  })
})
