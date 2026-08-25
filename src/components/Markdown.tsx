import { parseInline, parseMarkdown } from '../lib/markdown'
import type { Inline } from '../lib/markdown'

function InlineNodes({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((node, index) => {
        if (node.type === 'strong')
          return (
            <strong key={index} className="font-medium text-zinc-100">
              {node.value}
            </strong>
          )
        if (node.type === 'em')
          return (
            <em key={index} className="italic text-zinc-200">
              {node.value}
            </em>
          )
        if (node.type === 'code')
          return (
            <code
              key={index}
              className="rounded border border-ink-700 bg-ink-800 px-1 py-px font-mono text-[0.85em] text-zinc-200"
            >
              {node.value}
            </code>
          )
        if (node.type === 'link')
          return (
            <a
              key={index}
              className="text-zinc-100 underline underline-offset-2 hover:text-zinc-300"
              href={node.href}
              rel="noreferrer noopener"
              target="_blank"
            >
              {node.value}
            </a>
          )
        return <span key={index}>{node.value}</span>
      })}
    </>
  )
}

/** Renders a single line of markdown: negritas, cursivas, código y enlaces. */
export function MarkdownText({ text }: { text: string }) {
  return <InlineNodes nodes={parseInline(text)} />
}

const headingSize = (level: number): string => {
  if (level <= 2) return 'text-sm font-medium text-zinc-100'
  return 'text-[0.7rem] uppercase tracking-wider text-zinc-500'
}

/** Renders the markdown a model returns using the app's visual style. */
export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks = parseMarkdown(text)

  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      {blocks.map((block, index) => {
        if (block.type === 'heading')
          return (
            <p key={index} className={headingSize(block.level)}>
              <InlineNodes nodes={block.inline} />
            </p>
          )
        if (block.type === 'code')
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-md border border-ink-700 bg-ink-800 p-3 font-mono text-xs leading-relaxed text-zinc-300"
            >
              {block.value}
            </pre>
          )
        if (block.type === 'quote')
          return (
            <p key={index} className="border-l-2 border-ink-700 pl-3 text-zinc-400">
              <InlineNodes nodes={block.inline} />
            </p>
          )
        if (block.type === 'list')
          return (
            <ul key={index} className="space-y-1">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex gap-2">
                  <span className="tabular-nums text-zinc-600">
                    {block.ordered ? `${itemIndex + 1}.` : '—'}
                  </span>
                  <span>
                    <InlineNodes nodes={item} />
                  </span>
                </li>
              ))}
            </ul>
          )
        return (
          <p key={index} className="whitespace-pre-wrap">
            <InlineNodes nodes={block.inline} />
          </p>
        )
      })}
    </div>
  )
}
