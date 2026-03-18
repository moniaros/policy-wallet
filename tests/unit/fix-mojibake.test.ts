import { describe, expect, it } from 'vitest'

import { fixMojibakeText } from '@/lib/i18n/fix-mojibake'

describe('fixMojibakeText', () => {
  it('decodes cp1252-style mojibake Greek text', () => {
    const expected = '\u03A6\u03CC\u03C1\u03C4\u03C9\u03C3\u03B7...'
    const value = Buffer.from(expected, 'utf8').toString('latin1')
    expect(fixMojibakeText(value)).toBe(expected)
  })

  it('leaves valid text unchanged', () => {
    const value = '\u0391\u03C0\u03BF\u03B8\u03AE\u03BA\u03B5\u03C5\u03C3\u03B7...'
    expect(fixMojibakeText(value)).toBe(value)
  })
})
