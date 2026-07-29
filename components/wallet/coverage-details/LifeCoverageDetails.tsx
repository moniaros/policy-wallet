"use client"

import { GlossaryHint } from "@/components/insurance/GlossaryHint"
import type { PolicyGlossaryHints } from "@/lib/glossary/hints"
import { formatCurrency } from "@/lib/i18n/format"
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Shield,
  Wallet,
  AlertTriangle,
  Users,
  Calendar,
  PieChart,
  UserPlus,
  Info,
} from "lucide-react"
import type { AcordData } from "@/types/domain"
import { getTranslations } from "@/lib/i18n"
import { lifeSection } from "@/lib/wallet/coverage-sections"

import { formatPolicyDate } from "@/lib/wallet/policy-detail"
interface LifeCoverageDetailsProps {
  /** Resolved server-side — the 62KB glossary must not ship here. */
  hints?: PolicyGlossaryHints | null
  acordData: AcordData
  language: "el" | "en"
}

export function LifeCoverageDetails({ acordData, language, hints }: LifeCoverageDetailsProps) {
  const i18n = getTranslations(language)
  const copy = i18n.coverageDetails
  const lifeCopy = copy.life
  // Canonical `lifeAndInvestment` section first, legacy `life` alias as fallback.
  const life = lifeSection(acordData)
  if (!life) return null

  const hasAnyData = Boolean(
    life.deathBenefit !== undefined ||
    life.cashValue !== undefined ||
    life.maturityDate ||
    life.currentFundValue !== undefined ||
    life.ytdGrowth !== undefined ||
    life.taxFreeAtMaturity !== undefined ||
    life.guaranteedPercentage !== undefined ||
    life.surrenderValue !== undefined ||
    life.lastPremiumDate ||
    (acordData.beneficiaries && acordData.beneficiaries.length > 0)
  )

  if (!hasAnyData) return null

  // Shared formatter — these three files each carried an identical private copy.
  const fmt = (value: number) => formatCurrency(value, language === "el" ? "el" : "en", { decimals: 2 })
  const fmt0 = (value: number) => formatCurrency(value, language === "el" ? "el" : "en", { decimals: 0 })

  return (
    <div className="space-y-3">
      {/* The protection amount: what the policy pays the beneficiaries on death.
          The panel showed only the investment side, so a term-life policy (no
          fund, no surrender) rendered nothing — omitting the one figure that IS
          the policy. Leads, in the affirmative treatment fund value uses. */}
      {life.deathBenefit !== undefined && (
        <div className="p-4 rounded-xl bg-primary-tint dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary dark:text-mint" />
              </div>
              <span className="text-sm font-semibold text-black/75 dark:text-white/80">{lifeCopy.deathBenefit}</span>
            </div>
            <span className="text-xl font-black text-primary dark:text-mint">{fmt0(life.deathBenefit)}</span>
          </div>
          <p className="mt-1.5 ml-12.5 text-xs leading-relaxed text-muted-foreground">{lifeCopy.deathBenefitHint}</p>
        </div>
      )}

      {life.cashValue !== undefined && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{lifeCopy.cashValue}</span>
          </div>
          <span className="text-sm font-bold text-black dark:text-white">{fmt(life.cashValue)}</span>
        </div>
      )}

      {life.maturityDate && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{lifeCopy.maturityDate}</span>
          </div>
          <span className="text-sm font-bold text-black dark:text-white">{formatPolicyDate(life.maturityDate, language === "el" ? "el-GR" : "en-GB")}</span>
        </div>
      )}

      {life.currentFundValue !== undefined && (
        <div className="p-4 rounded-xl bg-primary-tint dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary dark:text-mint" />
              </div>
              <span className="text-sm font-semibold text-black/75 dark:text-white/80">{lifeCopy.fundValue}</span>
            </div>
            <span className="text-xl font-black text-primary dark:text-mint">{fmt(life.currentFundValue)}</span>
          </div>
          {life.ytdGrowth !== undefined && (
            <div className="mt-2 ml-12.5 flex items-center gap-1.5">
              {life.ytdGrowth >= 0 ? (
                <TrendingUp className="w-4 h-4 text-[#166534] dark:text-mint" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500 dark:text-red-400" />
              )}
              <span className={`text-sm font-bold ${life.ytdGrowth >= 0 ? "text-[#166534] dark:text-mint" : "text-red-500 dark:text-red-400"}`}>
                {life.ytdGrowth > 0 ? "+" : ""}{life.ytdGrowth.toFixed(2)}%
              </span>
              <span className="text-xs text-muted-foreground">{lifeCopy.ytdGrowth}</span>
            </div>
          )}
          {/* A retail investment return shown to a policyholder without this is
              a disclosure gap, not a styling choice. */}
          {life.ytdGrowth !== undefined && (
            <p className="mt-1.5 ml-12.5 text-xs leading-relaxed text-muted-foreground">
              {lifeCopy.pastPerformanceNote}
            </p>
          )}
        </div>
      )}

      {life.taxFreeAtMaturity !== undefined && (
        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary dark:text-mint" />
              </div>
              <span className="text-sm font-semibold text-black/75 dark:text-white/80">{lifeCopy.taxFreeAtMaturity}</span>
            </div>
            {life.taxFreeAtMaturity ? (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary-soft dark:bg-primary/15 text-[#166534] dark:text-mint border border-primary/20 dark:border-primary/30">
                <CheckCircle2 className="w-3.5 h-3.5" /> {copy.taxFree}
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-[#92400E] dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                {copy.taxable}
              </span>
            )}
          </div>
          {/* Greek life-policy taxation at maturity turns on the contract type,
              the holding period and the law in force years from now. Stating it
              as a settled product benefit is tax advice this product cannot give. */}
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{lifeCopy.taxNote}</p>
        </div>
      )}

      {(life.guaranteedPercentage !== undefined || life.unitLinkedPercentage !== undefined) && (
        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <PieChart className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{lifeCopy.guaranteedVsUnitLinked}</span>
          </div>
          <div className="ml-10.5">
            <div className="w-full h-4 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden flex">
              {life.guaranteedPercentage !== undefined && (
                <div
                  className="h-full bg-primary dark:bg-mint rounded-l-full"
                  style={{ width: `${life.guaranteedPercentage}%` }}
                />
              )}
              {life.unitLinkedPercentage !== undefined && (
                <div
                  className="h-full bg-black/30 dark:bg-white/30"
                  style={{ width: `${life.unitLinkedPercentage}%` }}
                />
              )}
            </div>
            <div className="flex justify-between mt-1.5 text-xs font-semibold">
              <span className="text-primary dark:text-mint">
                {lifeCopy.guaranteed}: {life.guaranteedPercentage ?? 0}%
              </span>
              <span className="text-muted-foreground">
                {lifeCopy.unitLinked}: {life.unitLinkedPercentage ?? 0}%
              </span>
            </div>
            {/* The bar renders the guaranteed share in the affirmative colour and
                the unit-linked share in neutral grey, which reads as "mostly
                fine" — the inverse of where the risk actually sits. */}
            {life.unitLinkedPercentage !== undefined && life.unitLinkedPercentage > 0 && (
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {lifeCopy.unitLinkedRiskNote}
              </p>
            )}
          </div>
        </div>
      )}

      {acordData.beneficiaries && acordData.beneficiaries.length > 0 && (
        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{hints?.beneficiary ? <GlossaryHint hint={hints.beneficiary} /> : lifeCopy.beneficiaries}</span>
          </div>
          <div className="ml-10.5 space-y-1.5">
            {acordData.beneficiaries.map((ben, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-black dark:text-white font-medium">{ben.name || "-"}</span>
                <div className="flex items-center gap-2">
                  {ben.relationship && (
                    <span className="text-xs text-muted-foreground">{ben.relationship}</span>
                  )}
                  {ben.percentage !== undefined && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#EFF6FF] dark:bg-blue-900/30 text-[#1E40AF] dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {ben.percentage}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* Servicing nudge (guidance, not extracted data): beneficiary
              designations go stale after life events and are among the most
              costly things a policyholder forgets to update. */}
          <p className="ml-10.5 mt-2.5 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary dark:text-mint" />
            {lifeCopy.beneficiaryReviewNote}
          </p>
        </div>
      )}

      {/* No beneficiary was extracted. Hedged deliberately — "not found in this
          document", never "you have none" — and conditional on a death benefit,
          so investment-only holders are not alarmed. The estate/probate
          consequence is the reason this silence was worth breaking. */}
      {(!acordData.beneficiaries || acordData.beneficiaries.length === 0) && (
        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-semibold text-black/75 dark:text-white/80">
                {hints?.beneficiary ? <GlossaryHint hint={hints.beneficiary} /> : lifeCopy.beneficiaryMissingTitle}
              </span>
              <p className="mt-0.5 text-xs leading-relaxed text-black/60 dark:text-white/65">{lifeCopy.beneficiaryMissingNote}</p>
            </div>
          </div>
        </div>
      )}

      {life.surrenderValue !== undefined && (
        <div className="p-3 rounded-xl bg-[#FEF3C7]/60 dark:bg-amber-900/30 border border-amber-200/60 dark:border-amber-800/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-[#92400E] dark:text-amber-400" />
              </div>
              <div>
                <span className="text-sm font-semibold text-[#92400E] dark:text-amber-300">{hints?.surrender ? <GlossaryHint hint={hints.surrender} /> : lifeCopy.surrenderValue}</span>
                <p className="text-xs text-[#92400E] dark:text-amber-400/80">{lifeCopy.surrenderWarning}</p>
              </div>
            </div>
            <span className="text-sm font-bold text-[#92400E] dark:text-amber-300">{fmt(life.surrenderValue)}</span>
          </div>
        </div>
      )}

      {life.lastPremiumDate && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <div>
              <span className="text-sm font-semibold text-black/75 dark:text-white/80">{lifeCopy.lastPremiumDate}</span>
              <p className="text-xs text-muted-foreground">
                {lifeCopy.paidOn} {formatPolicyDate(life.lastPremiumDate, language === "el" ? "el-GR" : "en-GB")}
              </p>
            </div>
          </div>
          {life.lastPremiumAmount !== undefined && (
            <span className="text-sm font-bold text-black dark:text-white">{fmt(life.lastPremiumAmount)}</span>
          )}
        </div>
      )}
    </div>
  )
}
