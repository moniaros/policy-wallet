"use client"

import { GlossaryHint } from "@/components/insurance/GlossaryHint"
import type { PolicyGlossaryHints } from "@/lib/glossary/hints"
import {
  Phone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Car,
  Shield,
  Users,
  CreditCard,
} from "lucide-react"
import type { AcordData } from "@/types/domain"
import { getTranslations } from "@/lib/i18n"
import { formatCurrency } from "@/lib/i18n/format"
import { calendarDaysUntil } from "@/lib/policy-status"
import { motorSection } from "@/lib/wallet/coverage-sections"
import { parsePolicyDate, formatPolicyDate } from "@/lib/wallet/policy-detail"
import { classifyMotorCoverageTier, tierCoversOwnVehicle } from "@/lib/wallet/motor-coverage-tier"

interface MotorCoverageDetailsProps {
  /** Resolved server-side — the 62KB glossary must not ship here. */
  hints?: PolicyGlossaryHints | null
  acordData: AcordData
  language: "el" | "en"
}

export function MotorCoverageDetails({ acordData, language, hints }: MotorCoverageDetailsProps) {
  const i18n = getTranslations(language)
  const copy = i18n.coverageDetails
  const motorCopy = copy.motor
  // Canonical `vehicle` section first, legacy `motor` alias as fallback.
  const motor = motorSection(acordData)
  if (!motor) return null

  const hasAnyData = Boolean(
    motor.coverageTier ||
    motor.accidentDeclarationPhone ||
    motor.roadsideAssistancePhone ||
    (motor.namedDrivers && motor.namedDrivers.length > 0) ||
    motor.greenCardExpiry ||
    motor.ownVehicleDamage !== undefined ||
    motor.glassBreakage !== undefined ||
    motor.deductible !== undefined ||
    motor.estimatedMarketValue !== undefined
  )

  if (!hasAnyData) return null

  const fmtMoney = (value: number) => formatCurrency(value, language === "el" ? "el" : "en", { decimals: 0 })

  // The extracted string, parsed the way every other date on this page is.
  //
  // `new Date("03-01-2027")` does not fail on a Greek-order date — it returns
  // 1 MARCH, because V8 reads bare numeric dates as US month-first. A Green Card
  // expiring on 3 January was therefore displayed as valid until 1 March, two
  // months past the day it stops proving anything at a border. A Greek month
  // name ("1 Μαρτίου 2027") produced an Invalid Date, and Intl THROWS on those,
  // so it took the whole policy page down mid-render.
  const greenCardExpiry = parsePolicyDate(motor.greenCardExpiry)

  const greenCardStatus = (() => {
    if (!greenCardExpiry) return null
    // Athens calendar days. Math.floor on a fractional negative made a Green Card
    // valid until tonight come out at -1 and read "expired" — on a document a
    // driver may be about to rely on at a border.
    const daysUntil = calendarDaysUntil(greenCardExpiry, new Date())
    if (daysUntil < 0) return "expired"
    if (daysUntil <= 30) return "expiring"
    return "valid"
  })()

  // Recognised tiers get the market term in the reader's language; anything we
  // do not recognise is shown verbatim rather than guessed at.
  const tier = classifyMotorCoverageTier(motor.coverageTier)
  const tierLabel =
    tier === "comprehensive" ? motorCopy.comprehensive
      : tier === "third_party_fire_theft" ? motorCopy.thirdPartyFireTheft
        : tier === "third_party" ? motorCopy.thirdParty
          : motor.coverageTier

  return (
    <div className="space-y-3">
      {motor.coverageTier && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            {/* The glossary term behind this hint is «Μικτή ασφάλεια» — the
                definition of COMPREHENSIVE cover. It was shown as the row's
                label whatever the tier, so a third-party-only policy carried a
                label that, on hover, explained cover the holder does not have.
                Attach it only when the policy actually is comprehensive. */}
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{tier === "comprehensive" && hints?.comprehensive ? <GlossaryHint hint={hints.comprehensive} /> : motorCopy.coverageTier}</span>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
            tierCoversOwnVehicle(tier)
              ? "bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint border-primary/20 dark:border-primary/30"
              : "bg-black/[0.04] dark:bg-white/10 text-black/75 dark:text-white/80 border-black/10 dark:border-white/15"
          } ${tier ? "" : "capitalize"}`}>
            {tierLabel}
          </span>
        </div>
      )}

      {/* The excess — what the holder pays before the insurer does — and the
          market value that caps a total-loss payout. Both extracted, neither
          shown until now. */}
      {motor.deductible !== undefined && (
        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-[#92400E] dark:text-amber-400" />
              </div>
              <span className="text-sm font-semibold text-black/75 dark:text-white/80">{motorCopy.deductible}</span>
            </div>
            <span className="text-sm font-bold text-black dark:text-white">{fmtMoney(motor.deductible)}</span>
          </div>
          <p className="mt-1.5 ml-10.5 text-xs leading-relaxed text-muted-foreground">{motorCopy.deductibleHint}</p>
        </div>
      )}

      {motor.estimatedMarketValue !== undefined && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <Car className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{motorCopy.marketValue}</span>
          </div>
          <span className="text-sm font-bold text-black dark:text-white">{fmtMoney(motor.estimatedMarketValue)}</span>
        </div>
      )}

      {motor.accidentDeclarationPhone && (
        <a
          href={`tel:${motor.accidentDeclarationPhone}`}
          className="flex items-center justify-between p-3 rounded-xl bg-red-50/80 dark:bg-red-900/20 border border-red-200/60 dark:border-red-800/60 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-700 dark:text-red-400" />
            </div>
            <div>
              <span className="text-sm font-bold text-red-700 dark:text-red-300">{motorCopy.accidentDeclaration}</span>
              <p className="text-xs text-red-700 dark:text-red-400/80">{copy.call}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-red-700 dark:text-red-400" />
            <span className="text-sm font-bold text-red-700 dark:text-red-300">{motor.accidentDeclarationPhone}</span>
          </div>
        </a>
      )}

      {motor.roadsideAssistancePhone && (
        <a
          href={`tel:${motor.roadsideAssistancePhone}`}
          className="flex items-center justify-between p-3 rounded-xl bg-[#FEF3C7]/60 dark:bg-amber-900/30 border border-amber-200/60 dark:border-amber-800/60 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Car className="w-4 h-4 text-[#92400E] dark:text-amber-400" />
            </div>
            <div>
              <span className="text-sm font-bold text-[#92400E] dark:text-amber-300">{hints?.roadside ? <GlossaryHint hint={hints.roadside} /> : motorCopy.roadsideAssistance}</span>
              <p className="text-xs text-[#92400E]/80 dark:text-amber-400/80">{copy.call}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-[#92400E] dark:text-amber-400" />
            <span className="text-sm font-bold text-[#92400E] dark:text-amber-300">{motor.roadsideAssistancePhone}</span>
          </div>
        </a>
      )}

      {motor.namedDrivers && motor.namedDrivers.length > 0 && (
        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <Users className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{motorCopy.namedDrivers}</span>
          </div>
          <div className="ml-10.5 space-y-1.5">
            {motor.namedDrivers.map((driver, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-black dark:text-white font-medium">{driver.name || "-"}</span>
                {driver.licenseNumber && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {motorCopy.license}: {driver.licenseNumber}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {greenCardExpiry && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <div>
              <span className="text-sm font-semibold text-black/75 dark:text-white/80">{hints?.greenCard ? <GlossaryHint hint={hints.greenCard} /> : motorCopy.greenCard}</span>
              <p className="text-xs text-muted-foreground">
                {copy.expires}: {formatPolicyDate(motor.greenCardExpiry, language === "el" ? "el-GR" : "en-GB")}
              </p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
            greenCardStatus === "expired"
              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
              : greenCardStatus === "expiring"
                ? "bg-amber-100 dark:bg-amber-900/30 text-[#92400E] dark:text-amber-300 border-amber-200 dark:border-amber-800"
                : "bg-primary-soft dark:bg-primary/15 text-[#166534] dark:text-mint border-primary/20 dark:border-primary/30"
          }`}>
            {greenCardStatus === "expired" ? copy.expired : greenCardStatus === "expiring" ? copy.expiringSoon : copy.valid}
          </span>
        </div>
      )}

      {motor.ownVehicleDamage !== undefined && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <Car className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{motorCopy.ownVehicleDamage}</span>
          </div>
          {motor.ownVehicleDamage ? (
            <span className="flex items-center gap-1 text-xs font-bold text-[#166534] dark:text-mint">
              <CheckCircle2 className="w-4 h-4" /> {copy.covered}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
              <XCircle className="w-4 h-4" /> {copy.notCovered}
            </span>
          )}
        </div>
      )}

      {motor.glassBreakage !== undefined && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{motorCopy.glassBreakage}</span>
          </div>
          {motor.glassBreakage ? (
            <span className="flex items-center gap-1 text-xs font-bold text-[#166534] dark:text-mint">
              <CheckCircle2 className="w-4 h-4" /> {copy.covered}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
              <XCircle className="w-4 h-4" /> {copy.notCovered}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
