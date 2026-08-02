import { describe, expect, it } from 'vitest'
import { defaultState, parseState } from './storage'

describe('parseState', () => {
  it('rejects empty, malformed or empty-course payloads', () => {
    expect(parseState(null)).toBeNull()
    expect(parseState('not json')).toBeNull()
    expect(parseState('{"courses":[]}')).toBeNull()
    expect(parseState('[1,2,3]')).toBeNull()
  })

  it('round-trips a valid state', () => {
    const state = defaultState()
    expect(parseState(JSON.stringify(state))).toEqual(state)
  })

  it('repairs missing or invalid fields', () => {
    const parsed = parseState(
      JSON.stringify({
        courses: [{ id: 'a', items: [{ id: 'i', weight: 'oops', score: 'oops' }] }],
        activeCourseId: 'missing',
      }),
    )
    expect(parsed?.activeCourseId).toBe('a')
    expect(parsed?.courses[0].maxScore).toBe(5)
    expect(parsed?.courses[0].items[0]).toMatchObject({ weight: 0, score: null })
  })
})
