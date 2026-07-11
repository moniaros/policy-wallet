export {
    FEATURE_GATES,
    PLAN_PRICING,
    FREE_POLICY_LIMIT,
    PLUS_POLICY_LIMIT,
    tierUnlocks,
    recommendedPlan,
    type FeatureKey,
    type FeatureGate,
    type UpgradeTriggerReason,
    type PlanPricing,
} from "./feature-gates"
export { UPGRADE_COPY_EL, type UpgradeTriggerCopy } from "./upgrade-copy.el"
export { UPGRADE_COPY_EN } from "./upgrade-copy.en"

import { UPGRADE_COPY_EL } from "./upgrade-copy.el"
import { UPGRADE_COPY_EN } from "./upgrade-copy.en"
import type { FeatureKey } from "./feature-gates"
import type { UpgradeTriggerCopy } from "./upgrade-copy.el"

export function getUpgradeCopy(featureKey: FeatureKey, language: string): UpgradeTriggerCopy {
    return language === "en" ? UPGRADE_COPY_EN[featureKey] : UPGRADE_COPY_EL[featureKey]
}
