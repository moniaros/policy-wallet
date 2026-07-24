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
import { calendarDaysUntil } from "@/lib/policy-status"

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
  const motor = acordData.motor
  if (!motor) return null

  const hasAnyData = Boolean(
    motor.coverageTier ||
    motor.accidentDeclarationPhone ||
    motor.roadsideAssistancePhone ||
    (motor.namedDrivers && motor.namedDrivers.length > 0) ||
    motor.greenCardExpiry ||
    motor.ownVehicleDamage !== undefined ||
    motor.glassBreakage !== undefined
  )

  if (!hasAnyData) return null

  const greenCardStatus = (() => {
    if (!motor.greenCardExpiry) return null
    const expiry = new Date(motor.greenCardExpiry)
    // Athens calendar days. Math.floor on a fractional negative made a Green Card
    // valid until tonight come out at -1 and read "expired" — on a document a
    // driver may be about to rely on at a border.
    const daysUntil = calendarDaysUntil(expiry, new Date())
    if (daysUntil < 0) return "expired"
    if (daysUntil <= 30) return "expiring"
    return "valid"
  })()

  return (
    <div className="space-y-3">
      {motor.coverageTier && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{hints?.comprehensive ? <GlossaryHint hint={hints.comprehensive} /> : motorCopy.coverageTier}</span>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint border border-primary/20 dark:border-primary/30 capitalize">
            {motor.coverageTier.replace(/_/g, " ")}
          </span>
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
              <p className="text-xs text-red-700/80 dark:text-red-400/80">{copy.call}</p>
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
                  <span className="text-xs text-black/55 dark:text-white/60 font-mono">
                    {motorCopy.license}: {driver.licenseNumber}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {motor.greenCardExpiry && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <div>
              <span className="text-sm font-semibold text-black/75 dark:text-white/80">{hints?.greenCard ? <GlossaryHint hint={hints.greenCard} /> : motorCopy.greenCard}</span>
              <p className="text-xs text-black/55 dark:text-white/60">
                {copy.expires}: {new Date(motor.greenCardExpiry).toLocaleDateString(language === "el" ? "el-GR" : "en-GB")}
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
            <span className="flex items-center gap-1 text-xs font-bold text-black/55 dark:text-white/50">
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
            <span className="flex items-center gap-1 text-xs font-bold text-black/55 dark:text-white/50">
              <XCircle className="w-4 h-4" /> {copy.notCovered}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
