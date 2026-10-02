import type { BenefitRules, ContractIssue, EvidenceRef, BenefitComposition } from './contracts'
import type { AttentionAreaId } from '@/lib/protection/domains'
import type { ExtractionSource } from '@/lib/services/ai/extraction-citations'

export type Localized = { el: string; en: string }
export type BenefitState = 'documented' | 'clarify' | 'conflicting' | 'historical'
export type ProgressChoice = 'planned' | 'done' | 'later' | 'dismissed' | 'clear'
export interface BenefitTerm { key: string; value: string; source?: ExtractionSource; evidence?: EvidenceRef }
export interface PreventionItem {
    id: string
    policyId: string
    kind: 'benefit' | 'action' | 'preparation'
    title: Localized
    description: Localized
    domains: AttentionAreaId[]
    state: BenefitState
    sourceVersion: string
    rules?: BenefitRules
    period?: { key: string; start: string; end: string } | null
    periods?: Array<{ key: string; start: string; end: string }>
    issues?: ContractIssue[]
    activationUnconfirmed?: boolean
    conditions?: Array<{ text: string; source?: EvidenceRef }>
    conflicts?: BenefitComposition['benefits'][number]['conflicts']
    healthRelated: boolean
    legacyCheckup?: boolean
    costType?: 'free_service' | 'discount' | 'not_stated'
    terms: BenefitTerm[]
    source?: ExtractionSource
    documentId: string | null
    runId: string | null
    extractedAt: string | null
    contactPhone?: string
    contactUrl?: string
    reference?: { title: string; url: string }
}
export interface PreventionPolicy {
    id: string
    label: string
    domains: AttentionAreaId[]
    historical: boolean
    items: PreventionItem[]
    sourceChanged?: boolean
}
export interface ProgressView {
    itemKey: string
    status: string
    remindAt: string | null
    sourceVersion: string | null
    barrier: string | null
    helpful: boolean | null
    periodKey?: string | null
    knowsProcedure?: boolean | null
    plannedFor?: string | null
}
export const HEALTH_PROGRESS_CONSENT = 'prevention-2026-10-v1'
export const BARRIERS = ['information', 'time', 'access', 'cost', 'clarification'] as const

export interface BenefitUseView { itemKey: string; periodKey: string; sourceVersion: string; status: string; usedOn: string | null }
