"use client"

import { GlossaryHint } from "@/components/insurance/GlossaryHint"
import type { PolicyGlossaryHints } from "@/lib/glossary/hints"
import { formatCurrency } from "@/lib/i18n/format"
import {
  Phone,
  CheckCircle2,
  XCircle,
  Home,
  Flame,
  Waves,
  Mountain,
  Shield,
  Building2,
  Wrench,
  Lock,
} from "lucide-react"
import type { AcordData } from "@/types/domain"
import { getTranslations } from "@/lib/i18n"
import { homeSection } from "@/lib/wallet/coverage-sections"
import { classifyHomeCoverScope } from "@/lib/wallet/home-cover-scope"

interface HomeCoverageDetailsProps {
  /** Resolved server-side — the 62KB glossary must not ship here. */
  hints?: PolicyGlossaryHints | null
  acordData: AcordData
  language: "el" | "en"
}

export function HomeCoverageDetails({ acordData, language, hints }: HomeCoverageDetailsProps) {
  const i18n = getTranslations(language)
  const copy = i18n.coverageDetails
  const homeCopy = copy.home
  // Canonical `property` section first, legacy `home` alias as fallback.
  const home = homeSection(acordData)
  if (!home) return null

  const hasAnyData = Boolean(
    home.enfiaEligible !== undefined ||
    home.catastropheCoverage ||
    home.mortgageeBank ||
    home.technicalAssistancePhone ||
    home.theftCoverageLimit !== undefined ||
    home.insuredValue !== undefined ||
    home.replacementValue !== undefined ||
    home.estimatedRebuildCost !== undefined ||
    home.contentsVsStructure
  )

  if (!hasAnyData) return null

  // Shared formatter — these three files each carried an identical private copy.
  const fmt = (value: number) => formatCurrency(value, language === "el" ? "el" : "en", { decimals: 2 })

  // Whether the building, its contents, or both are insured — the difference
  // between a burglary claim being paid and being declined. Shown verbatim when
  // the wording is one we do not recognise, never resolved to a guess.
  const scope = classifyHomeCoverScope(home.contentsVsStructure)
  const scopeLabel =
    scope === "both" ? homeCopy.contentsAndStructure
      : scope === "structure_only" ? homeCopy.structureOnly
        : scope === "contents_only" ? homeCopy.contentsOnly
          : home.contentsVsStructure

  return (
    <div className="space-y-3">
      {home.enfiaEligible !== undefined && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <Home className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{homeCopy.enfiaEligibility}</span>
          </div>
          {home.enfiaEligible ? (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary-soft dark:bg-primary/15 text-[#166534] dark:text-mint border border-primary/20 dark:border-primary/30">
              <CheckCircle2 className="w-3.5 h-3.5" /> {copy.eligible}
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-black/5 dark:bg-white/10 text-muted-foreground border border-black/10 dark:border-white/15">
              <XCircle className="w-3.5 h-3.5" /> {copy.notEligible}
            </span>
          )}
        </div>
      )}

      {home.catastropheCoverage && (
        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{homeCopy.catastropheCoverage}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 ml-10.5">
            <div className={`flex flex-col items-center p-2 rounded-lg border ${
              home.catastropheCoverage.fire
                ? "bg-primary-tint dark:bg-primary/15 border-primary/20 dark:border-primary/30"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            }`}>
              <Flame className={`w-4 h-4 mb-1 ${home.catastropheCoverage.fire ? "text-[#166534] dark:text-mint" : "text-red-400 dark:text-red-500"}`} />
              <span className="text-xs font-semibold text-black/75 dark:text-white/80">{homeCopy.fire}</span>
              {home.catastropheCoverage.fire
                ? <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] mt-0.5" />
                : <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5" />}
            </div>
            <div className={`flex flex-col items-center p-2 rounded-lg border ${
              home.catastropheCoverage.earthquake
                ? "bg-primary-tint dark:bg-primary/15 border-primary/20 dark:border-primary/30"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            }`}>
              <Mountain className={`w-4 h-4 mb-1 ${home.catastropheCoverage.earthquake ? "text-[#166534] dark:text-mint" : "text-red-400 dark:text-red-500"}`} />
              <span className="text-xs font-semibold text-black/75 dark:text-white/80">{homeCopy.earthquake}</span>
              {home.catastropheCoverage.earthquake
                ? <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] mt-0.5" />
                : <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5" />}
            </div>
            <div className={`flex flex-col items-center p-2 rounded-lg border ${
              home.catastropheCoverage.flood
                ? "bg-primary-tint dark:bg-primary/15 border-primary/20 dark:border-primary/30"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            }`}>
              <Waves className={`w-4 h-4 mb-1 ${home.catastropheCoverage.flood ? "text-[#166534] dark:text-mint" : "text-red-400 dark:text-red-500"}`} />
              <span className="text-xs font-semibold text-black/75 dark:text-white/80">{homeCopy.flood}</span>
              {home.catastropheCoverage.flood
                ? <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] mt-0.5" />
                : <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5" />}
            </div>
          </div>
        </div>
      )}

      {home.technicalAssistancePhone && (
        <a
          href={`tel:${home.technicalAssistancePhone}`}
          className="flex items-center justify-between p-3 rounded-xl bg-primary-tint dark:bg-primary/15 border border-primary/20 dark:border-primary/30 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <div>
              <span className="text-sm font-bold text-primary dark:text-mint">{homeCopy.technicalAssistance}</span>
              <p className="text-xs text-primary/80 dark:text-mint/80">{copy.call}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-primary dark:text-mint" />
            <span className="text-sm font-bold text-primary dark:text-mint">{home.technicalAssistancePhone}</span>
          </div>
        </a>
      )}

      {home.mortgageeBank && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{homeCopy.mortgageeBank}</span>
          </div>
          <span className="text-sm font-bold text-black dark:text-white">{home.mortgageeBank}</span>
        </div>
      )}

      {(home.insuredValue !== undefined || home.replacementValue !== undefined || home.estimatedRebuildCost !== undefined) && (
        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <Home className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{hints?.underinsurance ? <GlossaryHint hint={hints.underinsurance} /> : homeCopy.valueComparison}</span>
          </div>
          <div className="ml-10.5 space-y-1.5">
            {home.insuredValue !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-black/60 dark:text-white/65">{hints?.sumInsured ? <GlossaryHint hint={hints.sumInsured} /> : homeCopy.insuredValue}</span>
                <span className="font-bold text-black dark:text-white">{fmt(home.insuredValue)}</span>
              </div>
            )}
            {/* The rebuild cost the sum insured is measured against — the
                underinsurance gap is computed from exactly this comparison, yet
                the figure itself was never shown. Placed beside the sum insured
                so the reader can see the two numbers the average clause weighs. */}
            {home.estimatedRebuildCost !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-black/60 dark:text-white/65">{homeCopy.rebuildCost}</span>
                <span className="font-bold text-black dark:text-white">{fmt(home.estimatedRebuildCost)}</span>
              </div>
            )}
            {home.replacementValue !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-black/60 dark:text-white/65">{homeCopy.replacementValue}</span>
                <span className="font-bold text-black dark:text-white">{fmt(home.replacementValue)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {home.theftCoverageLimit !== undefined && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Lock className="w-4 h-4 text-[#92400E] dark:text-amber-400" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{homeCopy.theftCoverageLimit}</span>
          </div>
          <span className="text-sm font-bold text-black dark:text-white">{fmt(home.theftCoverageLimit)}</span>
        </div>
      )}

      {home.contentsVsStructure && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <Home className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{homeCopy.contentsVsStructure}</span>
          </div>
          <span className="text-sm font-bold text-black dark:text-white">{scopeLabel}</span>
        </div>
      )}
    </div>
  )
}
