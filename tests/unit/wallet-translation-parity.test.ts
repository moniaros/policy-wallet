import { describe, expect, it } from 'vitest'

import { en } from '@/lib/i18n/translations/en'
import { el } from '@/lib/i18n/translations/el'

function getAtPath(obj: Record<string, any>, path: string) {
  return path.split('.').reduce<any>((acc, key) => (acc ? acc[key] : undefined), obj)
}

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) return [prefix]
  if (!value || typeof value !== 'object') return [prefix]

  const out: string[] = []
  for (const key of Object.keys(value as Record<string, unknown>)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key
    out.push(...flattenKeys((value as Record<string, unknown>)[key], nextPrefix))
  }
  return out
}

describe('wallet translation parity', () => {
  const namespaces = ['common', 'nav', 'wallet', 'policyStatus', 'analysis.errors', 'coverageDetails']

  it('keeps en/el keysets aligned for wallet runtime namespaces', () => {
    for (const namespace of namespaces) {
      const enNode = getAtPath(en as any, namespace)
      const elNode = getAtPath(el as any, namespace)

      expect(enNode, `${namespace} missing in en`).toBeDefined()
      expect(elNode, `${namespace} missing in el`).toBeDefined()

      const enKeys = flattenKeys(enNode, namespace).sort()
      const elKeys = flattenKeys(elNode, namespace).sort()
      expect(elKeys).toEqual(enKeys)
    }
  })

  it('includes required nav/common/policy status keys used by wallet runtime', () => {
    expect((en as any).nav.policies).toBeDefined()
    expect((el as any).nav.policies).toBeDefined()

    expect((en as any).common.save).toBeDefined()
    expect((el as any).common.save).toBeDefined()

    expect((en as any).policyStatus.incomplete).toBeDefined()
    expect((el as any).policyStatus.incomplete).toBeDefined()
  })
})
