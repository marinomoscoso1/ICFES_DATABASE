import { Markdown, MarkdownText } from './Markdown'
import { areaById, difficultyLabel } from '../lib/icfes'
import type { Explanation, OptionId, Question } from '../lib/icfes'

interface QuestionCardProps {
  question: Question
  index: number
  chosen: OptionId | null
  explanation: Explanation | null
  explaining: boolean
  onChoose: (option: OptionId) => void
  onExplain: () => void
}

const optionTone = (option: OptionId, chosen: OptionId | null, answer: OptionId): string => {
  if (chosen === null) return 'border-ink-700 bg-ink-900 hover:border-ink-600'
  if (option === answer) return 'border-emerald-500/50 bg-emerald-500/10 text-zinc-100'
  if (option === chosen) return 'border-rose-500/50 bg-rose-500/10 text-zinc-100'
  return 'border-ink-700 bg-ink-900 opacity-60'
}

function ChainOfThought({ explanation }: { explanation: Explanation }) {
  return (
    <div className="space-y-3 rounded-md border border-ink-700 bg-ink-800/60 p-4">
      <p className="text-[0.7rem] uppercase tracking-wider text-zinc-500">Cómo debiste pensarlo</p>
      {explanation.steps.length > 0 ? (
        <ol className="space-y-2 text-sm text-zinc-300">
          {explanation.steps.map((step, index) => (
            <li key={index} className="flex gap-3">
              <span className="tabular-nums text-zinc-600">{index + 1}</span>
              <span>
                <MarkdownText text={step} />
              </span>
            </li>
          ))}
        </ol>
      ) : null}
      {explanation.keyIdea === '' ? null : (
        <p className="text-sm text-zinc-300">
          <span className="text-[0.7rem] uppercase tracking-wider text-zinc-500">Idea clave · </span>
          <MarkdownText text={explanation.keyIdea} />
        </p>
      )}
      {explanation.whyWrong === '' ? null : (
        <p className="text-sm text-rose-300">
          <span className="text-[0.7rem] uppercase tracking-wider text-rose-400/70">
            Dónde falló tu opción ·{' '}
          </span>
          <MarkdownText text={explanation.whyWrong} />
        </p>
      )}
      {explanation.takeaway === '' ? null : (
        <p className="text-sm text-amber-300">
          <span className="text-[0.7rem] uppercase tracking-wider text-amber-400/70">
            Para recordar ·{' '}
          </span>
          <MarkdownText text={explanation.takeaway} />
        </p>
      )}
    </div>
  )
}

export function QuestionCard({
  question,
  index,
  chosen,
  explanation,
  explaining,
  onChoose,
  onExplain,
}: QuestionCardProps) {
  const answered = chosen !== null
  const right = chosen === question.answer

  return (
    <article className="space-y-4 rounded-lg border border-ink-700 bg-ink-900 p-4 sm:p-5">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <p className="text-[0.7rem] uppercase tracking-wider text-zinc-400">
          {index + 1}. {areaById(question.area).label}
        </p>
        <p className="whitespace-nowrap text-[0.7rem] text-zinc-500">
          {difficultyLabel(question.difficulty)}
          {answered ? (
            <span className={right ? ' text-emerald-400' : ' text-rose-400'}>
              {' '}
              · {right ? 'correcta' : `incorrecta · era ${question.answer}`}
            </span>
          ) : null}
        </p>
      </header>

      {question.context === '' ? null : (
        <Markdown
          className="rounded-md border border-ink-700 bg-ink-800/50 p-3 text-sm text-zinc-400"
          text={question.context}
        />
      )}

      <Markdown className="text-sm text-zinc-100" text={question.prompt} />

      <ul className="space-y-2">
        {question.options.map((option) => (
          <li key={option.id}>
            <button
              className={`flex w-full gap-3 rounded-md border px-3 py-2 text-left text-sm text-zinc-300 transition-colors ${optionTone(option.id, chosen, question.answer)}`}
              disabled={answered}
              type="button"
              onClick={() => onChoose(option.id)}
            >
              <span className="text-zinc-500">{option.id}</span>
              <span>
                <MarkdownText text={option.text} />
              </span>
            </button>
          </li>
        ))}
      </ul>

      {answered ? (
        <div className="space-y-3">
          {explanation === null ? (
            <button className="btn" disabled={explaining} type="button" onClick={onExplain}>
              {explaining ? 'Pensando…' : 'Explícame cómo debí pensarlo'}
            </button>
          ) : (
            <ChainOfThought explanation={explanation} />
          )}
          {question.competency === '' ? null : (
            <p className="text-xs text-zinc-600">Evalúa: {question.competency}</p>
          )}
        </div>
      ) : null}
    </article>
  )
}
