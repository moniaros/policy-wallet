"use client"

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

interface HealthCoverageDetailsProps {
  acordData: AcordData
  language: "el" | "en"
}

export function HealthCoverageDetails({ acordData, language }: HealthCoverageDetailsProps) {
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
    health.outpatientLimit !== undefined ||
    health.deductiblePerClaim !== undefined
  )

  if (!hasAnyData) return null

  return (
    <div className="space-y-3">
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
                className="inline-flex items-center gap-1.5 text-sm text-primary dark:text-mint font-semibold hover:underline"
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
            <span className="flex items-center gap-1 text-xs font-bold text-black/45 dark:text-white/50">
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
            <span className="flex items-center gap-1 text-xs font-bold text-black/45 dark:text-white/50">
              <XCircle className="w-4 h-4" /> {copy.notAvailable}
            </span>
          )}
        </div>
      )}

      {health.waitingPeriods && health.waitingPeriods.length > 0 && (
        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-4 h-4 text-[#B45309] dark:text-amber-400" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{healthCopy.waitingPeriods}</span>
          </div>
          <div className="ml-10.5 space-y-1.5">
            {health.waitingPeriods.map((wp, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-black/60 dark:text-white/65">{wp.type || "-"}</span>
                <span className="text-black dark:text-white font-medium">
                  {wp.endDate
                    ? `${copy.endsOn} ${new Date(wp.endDate).toLocaleDateString(language === "el" ? "el-GR" : "en-GB")}`
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
              {health.outpatientLimit.toLocaleString(language === "el" ? "el-GR" : "en-GB", { style: "currency", currency: "EUR" })}
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
              <span className="text-sm font-semibold text-black/75 dark:text-white/80">{healthCopy.deductiblePerClaim}</span>
            </div>
            <span className="text-sm font-bold text-black dark:text-white">
              {health.deductiblePerClaim.toLocaleString(language === "el" ? "el-GR" : "en-GB", { style: "currency", currency: "EUR" })}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
