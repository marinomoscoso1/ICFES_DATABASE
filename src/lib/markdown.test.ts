import { describe, expect, it } from 'vitest'
import { parseInline, parseMarkdown } from './markdown'

describe('parseInline', () => {
  it('separa negritas, cursivas y código del texto plano', () => {
    expect(parseInline('Falta **bibliografía** y el *tono* usa `console.log`')).toEqual([
      { type: 'text', value: 'Falta ' },
      { type: 'strong', value: 'bibliografía' },
      { type: 'text', value: ' y el ' },
      { type: 'em', value: 'tono' },
      { type: 'text', value: ' usa ' },
      { type: 'code', value: 'console.log' },
    ])
  })

  it('acepta guiones bajos para negrita y cursiva', () => {
    expect(parseInline('__muy__ _claro_')).toEqual([
      { type: 'strong', value: 'muy' },
      { type: 'text', value: ' ' },
      { type: 'em', value: 'claro' },
    ])
  })

  it('no rompe palabras con guion bajo interno', () => {
    expect(parseInline('la variable total_score sube')).toEqual([
      { type: 'text', value: 'la variable total_score sube' },
    ])
  })

  it('enlaza solo esquemas seguros', () => {
    expect(parseInline('mira [la norma](https://apa.org)')).toEqual([
      { type: 'text', value: 'mira ' },
      { type: 'link', value: 'la norma', href: 'https://apa.org' },
    ])
    expect(parseInline('[x](javascript:alert(1))')).toEqual([
      { type: 'text', value: '[x](javascript:alert(1)' },
      { type: 'text', value: ')' },
    ])
  })

  it('deja intactos los asteriscos sueltos', () => {
    expect(parseInline('3 * 4 = 12')).toEqual([{ type: 'text', value: '3 * 4 = 12' }])
  })
})

describe('parseMarkdown', () => {
  it('reconoce títulos, listas y párrafos', () => {
    const blocks = parseMarkdown('## Problemas\n\n- Sin fuentes\n- Conclusión débil\n\nEn resumen, mejora.')

    expect(blocks).toEqual([
      { type: 'heading', level: 2, inline: [{ type: 'text', value: 'Problemas' }] },
      {
        type: 'list',
        ordered: false,
        items: [
          [{ type: 'text', value: 'Sin fuentes' }],
          [{ type: 'text', value: 'Conclusión débil' }],
        ],
      },
      { type: 'paragraph', inline: [{ type: 'text', value: 'En resumen, mejora.' }] },
    ])
  })

  it('marca las listas numeradas como ordenadas', () => {
    const blocks = parseMarkdown('1. Agregar fuentes\n2. Reescribir la conclusión')

    expect(blocks).toEqual([
      {
        type: 'list',
        ordered: true,
        items: [
          [{ type: 'text', value: 'Agregar fuentes' }],
          [{ type: 'text', value: 'Reescribir la conclusión' }],
        ],
      },
    ])
  })

  it('conserva los bloques de código sin interpretarlos', () => {
    const blocks = parseMarkdown('Ejemplo:\n\n```py\nx = **2**\n```')

    expect(blocks).toEqual([
      { type: 'paragraph', inline: [{ type: 'text', value: 'Ejemplo:' }] },
      { type: 'code', value: 'x = **2**' },
    ])
  })

  it('agrupa las citas y aplica el formato en línea', () => {
    expect(parseMarkdown('> cita **fuerte**')).toEqual([
      {
        type: 'quote',
        inline: [
          { type: 'text', value: 'cita ' },
          { type: 'strong', value: 'fuerte' },
        ],
      },
    ])
  })

  it('trata el texto sin markdown como un solo párrafo', () => {
    expect(parseMarkdown('El trabajo cumple la consigna.')).toEqual([
      { type: 'paragraph', inline: [{ type: 'text', value: 'El trabajo cumple la consigna.' }] },
    ])
  })
})
