import { describe, expect, it } from 'vitest'

const { scanContent } = require('../../scripts/check-i18n-hardcoded.js')

describe('check-i18n-hardcoded scanner', () => {
  it('flags bilingual hardcoded ternary UI copy', () => {
    const content = "const text = language === 'el' ? 'Κάλυψη' : 'Coverage'\n"
    const findings = scanContent(content, 'x.tsx')
    expect(findings.some((f: any) => f.rule === 'bilingual-ternary')).toBe(true)
  })

  it('allows locale formatting ternaries', () => {
    const content = "const locale = language === 'el' ? 'el-GR' : 'en-GB'\n"
    const findings = scanContent(content, 'x.tsx')
    expect(findings).toHaveLength(0)
  })

  it('flags literal toast messages', () => {
    const content = "toast.error('Failed to save policy')\n"
    const findings = scanContent(content, 'x.tsx')
    expect(findings.some((f: any) => f.rule === 'literal-toast')).toBe(true)
  })

  it('flags UI fallback literals with text content', () => {
    const content = "const label = displayLabel || 'Unknown policy'\n"
    const findings = scanContent(content, 'x.tsx')
    expect(findings.some((f: any) => f.rule === 'literal-fallback')).toBe(true)
  })

  it('allows non-UI fallback constants and allowed locale/currency fallbacks', () => {
    const content = [
      "const code = response.statusText || 'BATCH_EXTRACT_FAILED'",
      "const locale = t.common.locale || 'el-GR'",
      "const currency = policy.currency || 'EUR'",
    ].join('\n')

    const findings = scanContent(content, 'x.tsx')
    expect(findings).toHaveLength(0)
  })

  it('respects inline ignore marker', () => {
    const content = "toast.error('raw message') // i18n-hardcoded-ignore\n"
    const findings = scanContent(content, 'x.tsx')
    expect(findings).toHaveLength(0)
  })
})
