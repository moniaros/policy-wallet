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

interface HealthCoverageDetailsProps {
  acordData: AcordData
  language: "el" | "en"
}

export function HealthCoverageDetails({ acordData, language }: HealthCoverageDetailsProps) {
  const isGreek = language === "el"
  const health = acordData.health
  if (!health) return null

  const copy = {
    hospitalClass: isGreek ? "Κλάση Νοσοκομείου" : "Hospital Class",
    coordinationCentre: isGreek ? "Κέντρο Συντονισμού" : "Coordination Centre",
    annualCheckup: isGreek ? "Ετήσιο Check-up" : "Annual Check-up",
    directBilling: isGreek ? "Απευθείας Χρέωση" : "Direct Billing",
    waitingPeriods: isGreek ? "Περίοδοι Αναμονής" : "Waiting Periods",
    outpatientLimit: isGreek ? "Όριο Εξωτερικών Ιατρείων" : "Outpatient Limit",
    deductiblePerClaim: isGreek ? "Απαλλαγή ανά Αξίωση" : "Deductible per Claim",
    included: isGreek ? "Περιλαμβάνεται" : "Included",
    notIncluded: isGreek ? "Δεν περιλαμβάνεται" : "Not included",
    available: isGreek ? "Διαθέσιμη" : "Available",
    notAvailable: isGreek ? "Μη διαθέσιμη" : "Not available",
    daysRemaining: isGreek ? "ημέρες" : "days",
    endsOn: isGreek ? "Λήγει" : "Ends",
    call: isGreek ? "Κλήση" : "Call",
  }

  const hasAnyData = health.hospitalClass || health.coordinationCentre?.name ||
    health.annualCheckupIncluded !== undefined || health.directBillingAvailable !== undefined ||
    (health.waitingPeriods && health.waitingPeriods.length > 0) ||
    health.outpatientLimit !== undefined || health.deductiblePerClaim !== undefined

  if (!hasAnyData) return null

  return (
    <div className="space-y-3">
      {health.hospitalClass && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{copy.hospitalClass}</span>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            {health.hospitalClass}
          </span>
        </div>
      )}

      {health.coordinationCentre?.name && (
        <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{copy.coordinationCentre}</span>
          </div>
          <div className="ml-10.5 space-y-1">
            <p className="text-sm text-slate-900 dark:text-white font-medium">{health.coordinationCentre.name}</p>
            {health.coordinationCentre.phone && (
              <a
                href={`tel:${health.coordinationCentre.phone}`}
                className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
              >
                <Phone className="w-3.5 h-3.5" />
                {health.coordinationCentre.phone}
              </a>
            )}
          </div>
        </div>
      )}

      {health.annualCheckupIncluded !== undefined && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{copy.annualCheckup}</span>
          </div>
          {health.annualCheckupIncluded ? (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> {copy.included}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold text-slate-400 dark:text-slate-500">
              <XCircle className="w-4 h-4" /> {copy.notIncluded}
            </span>
          )}
        </div>
      )}

      {health.directBillingAvailable !== undefined && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{copy.directBilling}</span>
          </div>
          {health.directBillingAvailable ? (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> {copy.available}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold text-slate-400 dark:text-slate-500">
              <XCircle className="w-4 h-4" /> {copy.notAvailable}
            </span>
          )}
        </div>
      )}

      {health.waitingPeriods && health.waitingPeriods.length > 0 && (
        <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{copy.waitingPeriods}</span>
          </div>
          <div className="ml-10.5 space-y-1.5">
            {health.waitingPeriods.map((wp, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">{wp.type || "-"}</span>
                <span className="text-slate-900 dark:text-white font-medium">
                  {wp.endDate
                    ? `${copy.endsOn} ${new Date(wp.endDate).toLocaleDateString(isGreek ? "el-GR" : "en-GB")}`
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
        <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{copy.outpatientLimit}</span>
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {health.outpatientLimit.toLocaleString(isGreek ? "el-GR" : "en-GB", { style: "currency", currency: "EUR" })}
            </span>
          </div>
        </div>
      )}

      {health.deductiblePerClaim !== undefined && (
        <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{copy.deductiblePerClaim}</span>
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {health.deductiblePerClaim.toLocaleString(isGreek ? "el-GR" : "en-GB", { style: "currency", currency: "EUR" })}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
