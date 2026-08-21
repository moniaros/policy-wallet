"use client"

import { GlossaryHint } from "@/components/insurance/GlossaryHint"
import type { PolicyGlossaryHints } from "@/lib/glossary/hints"
import {
  Building2,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  Stethoscope,
  ShieldCheck,
} from "lucide-react"
import type { AcordData } from "@/types/domain"
import { getTranslations } from "@/lib/i18n"
import { formatCurrency } from "@/lib/i18n/format"

import { formatPolicyDate } from "@/lib/wallet/policy-detail"
interface HealthCoverageDetailsProps {
  /** Resolved server-side — the 62KB glossary must not ship to this page. */
  hints?: PolicyGlossaryHints | null
  acordData: AcordData
  language: "el" | "en"
}

export function HealthCoverageDetails({ acordData, language, hints }: HealthCoverageDetailsProps) {
  const i18n = getTranslations(language)
  const copy = i18n.coverageDetails
  const healthCopy = copy.health
  const health = acordData.health
  if (!health) return null

  const hasAnyData = Boolean(
    health.hospitalClass ||
    health.coordinationCentre?.name ||
    health.annualCheckupIncluded !== undefined ||
    health.directBillingAvailable !== undefined ||
    (health.waitingPeriods && health.waitingPeriods.length > 0) ||
    health.annualLimit !== undefined ||
    health.roomAndBoardLimit !== undefined ||
    health.outOfPocketMax !== undefined ||
    health.outpatientLimit !== undefined ||
    health.deductiblePerClaim !== undefined
  )

  if (!hasAnyData) return null

  // Every money amount on this card goes through `fmt` for a consistent format.
  // Outpatient limit and deductible previously used a raw toLocaleString with
  // 2 decimals, so they read "1.500,00 €" beside a "15.000 €" annual limit —
  // mixed decimals on the same card. Health figures are round; 0 decimals, like
  // the annual limit / room&board / out-of-pocket above.
  const fmt = (value: number) => formatCurrency(value, language === "el" ? "el" : "en", { decimals: 0 })

  return (
    <div className="space-y-3">
      {/* The single most consequential number on a health policy: the ceiling on
          what the insurer pays in a year. The panel extracted it and every other
          coverage limit but rendered none of them — only outpatient. Annual limit
          leads, in the affirmative treatment life's fund value uses. */}
      {health.annualLimit !== undefined && (
        <div className="p-4 rounded-xl bg-primary-tint dark:bg-primary/15 border border-primary/20 dark:border-primary/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-primary dark:text-mint" />
              </div>
              <span className="text-sm font-semibold text-black/75 dark:text-white/80">{healthCopy.annualLimit}</span>
            </div>
            <span className="text-xl font-black text-primary dark:text-mint">{fmt(health.annualLimit)}</span>
          </div>
        </div>
      )}

      {health.roomAndBoardLimit !== undefined && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{healthCopy.roomAndBoardLimit}</span>
          </div>
          <span className="text-sm font-bold text-black dark:text-white">{fmt(health.roomAndBoardLimit)}</span>
        </div>
      )}

      {health.outOfPocketMax !== undefined && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-[#92400E] dark:text-amber-400" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{healthCopy.outOfPocketMax}</span>
          </div>
          <span className="text-sm font-bold text-black dark:text-white">{fmt(health.outOfPocketMax)}</span>
        </div>
      )}
      {health.hospitalClass && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{healthCopy.hospitalClass}</span>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint border border-primary/20 dark:border-primary/30">
            {health.hospitalClass}
          </span>
        </div>
      )}

      {health.coordinationCentre?.name && (
        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{healthCopy.coordinationCentre}</span>
          </div>
          <div className="ml-10.5 space-y-1">
            <p className="text-sm text-black dark:text-white font-medium">{health.coordinationCentre.name}</p>
            {health.coordinationCentre.phone && (
              <a
                href={`tel:${health.coordinationCentre.phone}`}
                className="min-h-[44px] inline-flex items-center gap-1.5 text-sm text-primary dark:text-mint font-semibold hover:underline"
              >
                <Phone className="w-3.5 h-3.5" />
                {health.coordinationCentre.phone}
              </a>
            )}
          </div>
        </div>
      )}

      {health.annualCheckupIncluded !== undefined && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{healthCopy.annualCheckup}</span>
          </div>
          {health.annualCheckupIncluded ? (
            <span className="flex items-center gap-1 text-xs font-bold text-[#166534] dark:text-mint">
              <CheckCircle2 className="w-4 h-4" /> {copy.included}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
              <XCircle className="w-4 h-4" /> {copy.notIncluded}
            </span>
          )}
        </div>
      )}

      {health.directBillingAvailable !== undefined && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{healthCopy.directBilling}</span>
          </div>
          {health.directBillingAvailable ? (
            <span className="flex items-center gap-1 text-xs font-bold text-[#166534] dark:text-mint">
              <CheckCircle2 className="w-4 h-4" /> {copy.available}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
              <XCircle className="w-4 h-4" /> {copy.notAvailable}
            </span>
          )}
        </div>
      )}

      {health.waitingPeriods && health.waitingPeriods.length > 0 && (
        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-4 h-4 text-[#92400E] dark:text-amber-400" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">
              {hints?.waitingPeriod ? <GlossaryHint hint={hints.waitingPeriod} /> : healthCopy.waitingPeriods}
            </span>
          </div>
          <div className="ml-10.5 space-y-1.5">
            {health.waitingPeriods.map((wp, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-black/60 dark:text-white/65">{wp.type || "-"}</span>
                <span className="text-black dark:text-white font-medium">
                  {wp.endDate
                    ? `${copy.endsOn} ${formatPolicyDate(wp.endDate, language === "el" ? "el-GR" : "en-GB")}`
                    : wp.durationDays
                      ? `${wp.durationDays} ${copy.daysRemaining}`
                      : "-"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {health.outpatientLimit !== undefined && (
        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-primary dark:text-mint" />
              </div>
              <span className="text-sm font-semibold text-black/75 dark:text-white/80">{healthCopy.outpatientLimit}</span>
            </div>
            <span className="text-sm font-bold text-black dark:text-white">
              {fmt(health.outpatientLimit)}
            </span>
          </div>
        </div>
      )}

      {health.deductiblePerClaim !== undefined && (
        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <span className="text-sm font-semibold text-black/75 dark:text-white/80">
                {hints?.deductible ? <GlossaryHint hint={hints.deductible} /> : healthCopy.deductiblePerClaim}
              </span>
            </div>
            <span className="text-sm font-bold text-black dark:text-white">
              {fmt(health.deductiblePerClaim)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
