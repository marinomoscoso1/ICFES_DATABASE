export type Inline =
  | { type: 'text'; value: string }
  | { type: 'strong'; value: string }
  | { type: 'em'; value: string }
  | { type: 'code'; value: string }
  | { type: 'link'; value: string; href: string }

export type Block =
  | { type: 'paragraph'; inline: Inline[] }
  | { type: 'heading'; level: number; inline: Inline[] }
  | { type: 'list'; ordered: boolean; items: Inline[][] }
  | { type: 'code'; value: string }
  | { type: 'quote'; inline: Inline[] }

const INLINE =
  /`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*|(?<![\w_])_([^_\n]+)_(?![\w_])|\[([^\]]+)\]\(([^)\s]+)\)/g

const SAFE_HREF = /^(https?:\/\/|mailto:)/i

export function parseInline(source: string): Inline[] {
  const inline: Inline[] = []
  let last = 0

  const pushText = (value: string) => {
    if (value !== '') inline.push({ type: 'text', value })
  }

  INLINE.lastIndex = 0
  let match = INLINE.exec(source)
  while (match !== null) {
    pushText(source.slice(last, match.index))
    const [, code, strongStar, strongScore, emStar, emScore, linkText, href] = match

    if (code !== undefined) inline.push({ type: 'code', value: code })
    else if (strongStar !== undefined) inline.push({ type: 'strong', value: strongStar })
    else if (strongScore !== undefined) inline.push({ type: 'strong', value: strongScore })
    else if (emStar !== undefined) inline.push({ type: 'em', value: emStar })
    else if (emScore !== undefined) inline.push({ type: 'em', value: emScore })
    else if (linkText !== undefined && href !== undefined) {
      if (SAFE_HREF.test(href)) inline.push({ type: 'link', value: linkText, href })
      else pushText(match[0])
    }

    last = match.index + match[0].length
    match = INLINE.exec(source)
  }

  pushText(source.slice(last))
  return inline
}

const BULLET = /^\s{0,3}[-*+]\s+(.*)$/
const NUMBERED = /^\s{0,3}\d+[.)]\s+(.*)$/
const HEADING = /^(#{1,6})\s+(.*)$/
const QUOTE = /^>\s?(.*)$/
const FENCE = /^\s*```/

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let paragraph: string[] = []

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    blocks.push({ type: 'paragraph', inline: parseInline(paragraph.join('\n')) })
    paragraph = []
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]

    if (FENCE.test(line)) {
      flushParagraph()
      const code: string[] = []
      index += 1
      while (index < lines.length && !FENCE.test(lines[index])) {
        code.push(lines[index])
        index += 1
      }
      blocks.push({ type: 'code', value: code.join('\n') })
      continue
    }

    if (line.trim() === '') {
      flushParagraph()
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      flushParagraph()
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        inline: parseInline(heading[2]),
      })
      continue
    }

    const quote = QUOTE.exec(line)
    if (quote) {
      flushParagraph()
      blocks.push({ type: 'quote', inline: parseInline(quote[1]) })
      continue
    }

    const bullet = BULLET.exec(line)
    const numbered = NUMBERED.exec(line)
    if (bullet || numbered) {
      flushParagraph()
      const ordered = bullet === null
      const items: Inline[][] = []
      while (index < lines.length) {
        const item = ordered ? NUMBERED.exec(lines[index]) : BULLET.exec(lines[index])
        if (!item) break
        items.push(parseInline(item[1]))
        index += 1
      }
      index -= 1
      blocks.push({ type: 'list', ordered, items })
      continue
    }

    paragraph.push(line)
  }

  flushParagraph()
  return blocks
}
