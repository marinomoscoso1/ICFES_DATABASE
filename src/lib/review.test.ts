import { describe, expect, it, vi } from 'vitest'
import { answerFollowUp, parseJsonObject, runReview } from './review'
import type { ChatFn, ChatRequest } from './groq'

const debater = (veredicto: string, resumen = 'resumen') =>
  JSON.stringify({ veredicto, confianza: 0.8, resumen, puntos: ['punto'] })

const judgeReply = JSON.stringify({
  veredicto: 'bien',
  puntaje: 84,
  resumen: 'Cumple la consigna.',
  fortalezas: ['estructura clara'],
  problemas: ['faltan citas'],
  acciones: ['agregar bibliografía'],
})

/** Fake chat that replies from a queue and records every request. */
const fakeChat = (replies: string[]) => {
  const requests: ChatRequest[] = []
  const chat: ChatFn = (request) => {
    requests.push(request)
    return Promise.resolve(replies[requests.length - 1] ?? judgeReply)
  }
  return { chat, requests }
}

const base = {
  document: 'Ensayo sobre la fotosíntesis.',
  apiKey: 'key',
  thesisModel: 'model-a',
  antithesisModel: 'model-b',
}

describe('runReview', () => {
  it('stops as soon as both debaters share a verdict', async () => {
    const { chat, requests } = fakeChat([debater('bien'), debater('bien'), judgeReply])
    const result = await runReview({ ...base, chat })

    expect(requests).toHaveLength(3)
    expect(result.turns.map((turn) => turn.role)).toEqual(['tesis', 'antitesis'])
    expect(result.verdict.agreed).toBe(true)
    expect(result.verdict.rounds).toBe(1)
    expect(result.verdict.score).toBe(84)
    expect(result.verdict.actions).toEqual(['agregar bibliografía'])
  })

  it('debates again while the verdicts differ and lets the judge decide', async () => {
    const { chat } = fakeChat([
      debater('bien'),
      debater('mal'),
      debater('bien'),
      debater('mal'),
      JSON.stringify({ veredicto: 'mal', puntaje: 40, resumen: 'No cumple.', problemas: ['sin fuentes'] }),
    ])
    const result = await runReview({ ...base, chat, maxRounds: 2 })

    expect(result.turns).toHaveLength(4)
    expect(result.verdict.agreed).toBe(false)
    expect(result.verdict.stance).toBe('mal')
    expect(result.verdict.rounds).toBe(2)
    expect(result.verdict.strengths).toEqual([])
  })

  it('uses each debater model and passes the transcript to the rival', async () => {
    const { chat, requests } = fakeChat([debater('bien', 'quedó bien'), debater('bien'), judgeReply])
    await runReview({ ...base, chat, judgeModel: 'model-judge' })

    expect(requests.map((request) => request.model)).toEqual(['model-a', 'model-b', 'model-judge'])
    expect(requests[0].messages[1].content).not.toContain('DEBATE HASTA AHORA')
    expect(requests[1].messages[1].content).toContain('quedó bien')
  })

  it('streams every turn, including the synthesis', async () => {
    const { chat } = fakeChat([debater('mal'), debater('mal'), judgeReply])
    const onTurn = vi.fn()
    await runReview({ ...base, chat, onTurn })

    expect(onTurn.mock.calls.map(([turn]) => turn.role)).toEqual(['tesis', 'antitesis', 'sintesis'])
  })

  it('survives debaters that answer with prose instead of JSON', async () => {
    const { chat } = fakeChat(['El trabajo está impecable.', debater('bien'), 'el juez divaga'])
    const result = await runReview({ ...base, chat })

    expect(result.turns[0].summary).toBe('El trabajo está impecable.')
    expect(result.turns[0].stance).toBe('bien')
    expect(result.verdict.score).toBeNull()
    expect(result.verdict.summary).toContain('coincidieron')
  })

  it('rejects an empty document', async () => {
    const { chat } = fakeChat([])
    await expect(runReview({ ...base, chat, document: '   ' })).rejects.toThrow('No hay texto')
  })
})

describe('parseJsonObject', () => {
  it('reads JSON wrapped in fences and prose', () => {
    expect(parseJsonObject('Claro:\n```json\n{"a":1}\n```\nEso es todo.')).toEqual({ a: 1 })
  })

  it('returns null when there is no object', () => {
    expect(parseJsonObject('sin json')).toBeNull()
    expect(parseJsonObject('{roto')).toBeNull()
  })
})

describe('answerFollowUp', () => {
  it('sends the verdict and the previous chat turns as context', async () => {
    const { chat, requests } = fakeChat(['Mejora la introducción.'])
    const answer = await answerFollowUp({
      question: '¿Qué corrijo primero?',
      document: 'Ensayo',
      turns: [{ role: 'tesis', round: 1, stance: 'bien', confidence: 0.9, summary: 'ok', points: [] }],
      verdict: {
        stance: 'bien',
        score: 84,
        agreed: true,
        rounds: 1,
        summary: 'Cumple la consigna.',
        strengths: [],
        issues: [],
        actions: [],
      },
      history: [{ role: 'user', content: 'hola' }],
      chat,
      apiKey: 'key',
      model: 'model-a',
    })

    expect(answer).toBe('Mejora la introducción.')
    const messages = requests[0].messages
    expect(messages[1].content).toContain('VEREDICTO: bien (84/100)')
    expect(messages.at(-1)?.content).toBe('¿Qué corrijo primero?')
  })
})
