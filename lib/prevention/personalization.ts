import type { PreventionItem, ProgressView, BenefitUseView } from './types'

export type StepReason = 'planned' | 'changed' | 'clarification' | 'benefit' | 'habit'
export function usageForItem(item: PreventionItem, uses: BenefitUseView[]) {
    return item.period ? uses.find(u => u.itemKey === item.id && u.periodKey === item.period!.key) : undefined
}
export function chooseNextStep(items: PreventionItem[], progress: ProgressView[], uses: BenefitUseView[] = []) {
    const choices = items.flatMap(item => {
        if (item.state === 'historical') return []
        const p = progress.find(p => p.itemKey === item.id)
        const changed = !!p?.sourceVersion && p.sourceVersion !== item.sourceVersion
        // A new source requests a review, not an automatic reactivation of an unwanted action.
        if (p && ['done', 'dismissed', 'later'].includes(p.status)) return []
        const use = usageForItem(item, uses)
        if (use?.status === 'used' && use.sourceVersion === item.sourceVersion) return []
        const reason: StepReason = changed ? 'changed' : p?.status === 'planned' ? 'planned' : item.kind === 'benefit' && (item.state !== 'documented' || item.issues?.length || p?.knowsProcedure === false) ? 'clarification' : item.kind === 'benefit' ? 'benefit' : 'habit'
        const rank = reason === 'planned' ? 0 : reason === 'changed' ? 1 : reason === 'clarification' && p ? 2 : reason === 'benefit' || reason === 'clarification' ? 3 : 4
        return [{ item, reason, rank, progress: p }]
    })
    return choices.sort((a, b) => a.rank - b.rank || (a.progress?.plannedFor ?? '9999').localeCompare(b.progress?.plannedFor ?? '9999') || Number(a.progress?.helpful === false) - Number(b.progress?.helpful === false) || a.item.id.localeCompare(b.item.id))[0] ?? null
}
