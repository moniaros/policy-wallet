import { describe, expect, it } from 'vitest'

import { mapWalletErrorToMessage } from '@/lib/i18n/wallet-error'

const t = {
  analysis: {
    errors: {
      tokenLimit: 'analysis.tokenLimit',
      schema: 'analysis.schema',
      timeout: 'analysis.timeout',
      document: 'analysis.document',
      auth: 'analysis.auth',
      unavailable: 'analysis.unavailable',
      generic: 'analysis.generic',
    },
  },
  wallet: {
    failedAnswer: 'wallet.failedAnswer',
    batchUpload: {
      saveFailed: 'wallet.batch.saveFailed',
    },
    errors: {
      unauthorized: 'wallet.unauthorized',
      policyNotFound: 'wallet.policyNotFound',
      noActiveAgent: 'wallet.noActiveAgent',
      limitReached: 'wallet.limitReached',
      tokenLimit: 'wallet.tokenLimit',
      aiUnavailable: 'wallet.aiUnavailable',
      analysisFailed: 'wallet.analysisFailed',
      shareFailed: 'wallet.shareFailed',
      revokeFailed: 'wallet.revokeFailed',
      deleteUnauthorized: 'wallet.deleteUnauthorized',
      addFailed: 'wallet.addFailed',
      updateFailed: 'wallet.updateFailed',
      questionFailed: 'wallet.questionFailed',
      copyFailed: 'wallet.copyFailed',
      generic: 'wallet.generic',
    },
  },
  errors: {
    somethingWentWrong: 'errors.somethingWentWrong',
    unauthorized: 'errors.unauthorized',
  },
}

describe('mapWalletErrorToMessage', () => {
  it('maps token budget failures to translated token-limit copy', () => {
    const result = mapWalletErrorToMessage(
      new Error('Analysis run did not complete: monthly_limit_reached'),
      t,
      'analysis'
    )

    expect(result).toBe('analysis.tokenLimit')
  })

  it('maps schema failures to translated schema copy', () => {
    const result = mapWalletErrorToMessage(
      new Error('Invalid prompt: messages do not match the ModelMessage[] schema.'),
      t,
      'analysis'
    )

    expect(result).toBe('analysis.schema')
  })

  it('maps timeout/deadline failures to translated timeout copy', () => {
    const result = mapWalletErrorToMessage(
      new Error('Upstream deadline exceeded timeout'),
      t,
      'analysis'
    )

    expect(result).toBe('analysis.timeout')
  })

  it('falls back to context-specific translated message for unknown errors', () => {
    const result = mapWalletErrorToMessage(new Error('unexpected'), t, 'updatePolicy')
    expect(result).toBe('wallet.updateFailed')
  })

  it('maps copy failures to translated copy error', () => {
    const result = mapWalletErrorToMessage(new Error('failed to copy to clipboard'), t, 'copy')
    expect(result).toBe('wallet.copyFailed')
  })
})
