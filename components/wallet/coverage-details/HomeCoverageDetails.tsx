"use client"

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

interface HomeCoverageDetailsProps {
  acordData: AcordData
  language: "el" | "en"
}

export function HomeCoverageDetails({ acordData, language }: HomeCoverageDetailsProps) {
  const i18n = getTranslations(language)
  const copy = i18n.coverageDetails
  const homeCopy = copy.home
  const home = acordData.home
  if (!home) return null

  const hasAnyData = Boolean(
    home.enfiaEligible !== undefined ||
    home.catastropheCoverage ||
    home.mortgageeBank ||
    home.technicalAssistancePhone ||
    home.theftCoverageLimit !== undefined ||
    home.insuredValue !== undefined ||
    home.replacementValue !== undefined ||
    home.contentsVsStructure
  )

  if (!hasAnyData) return null

  const formatCurrency = (value: number) =>
    value.toLocaleString(language === "el" ? "el-GR" : "en-GB", { style: "currency", currency: "EUR" })

  return (
    <div className="space-y-3">
      {home.enfiaEligible !== undefined && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Home className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{homeCopy.enfiaEligibility}</span>
          </div>
          {home.enfiaEligible ? (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" /> {copy.eligible}
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <XCircle className="w-3.5 h-3.5" /> {copy.notEligible}
            </span>
          )}
        </div>
      )}

      {home.catastropheCoverage && (
        <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{homeCopy.catastropheCoverage}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 ml-10.5">
            <div className={`flex flex-col items-center p-2 rounded-lg border ${
              home.catastropheCoverage.fire
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            }`}>
              <Flame className={`w-4 h-4 mb-1 ${home.catastropheCoverage.fire ? "text-emerald-600 dark:text-emerald-400" : "text-red-400 dark:text-red-500"}`} />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{homeCopy.fire}</span>
              {home.catastropheCoverage.fire
                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5" />
                : <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5" />}
            </div>
            <div className={`flex flex-col items-center p-2 rounded-lg border ${
              home.catastropheCoverage.earthquake
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            }`}>
              <Mountain className={`w-4 h-4 mb-1 ${home.catastropheCoverage.earthquake ? "text-emerald-600 dark:text-emerald-400" : "text-red-400 dark:text-red-500"}`} />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{homeCopy.earthquake}</span>
              {home.catastropheCoverage.earthquake
                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5" />
                : <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5" />}
            </div>
            <div className={`flex flex-col items-center p-2 rounded-lg border ${
              home.catastropheCoverage.flood
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            }`}>
              <Waves className={`w-4 h-4 mb-1 ${home.catastropheCoverage.flood ? "text-emerald-600 dark:text-emerald-400" : "text-red-400 dark:text-red-500"}`} />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{homeCopy.flood}</span>
              {home.catastropheCoverage.flood
                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5" />
                : <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5" />}
            </div>
          </div>
        </div>
      )}

      {home.technicalAssistancePhone && (
        <a
          href={`tel:${home.technicalAssistancePhone}`}
          className="flex items-center justify-between p-3 rounded-xl bg-teal-50/80 dark:bg-teal-900/20 border border-teal-200/60 dark:border-teal-800/60 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <span className="text-sm font-bold text-teal-700 dark:text-teal-300">{homeCopy.technicalAssistance}</span>
              <p className="text-xs text-teal-600/80 dark:text-teal-400/80">{copy.call}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span className="text-sm font-bold text-teal-700 dark:text-teal-300">{home.technicalAssistancePhone}</span>
          </div>
        </a>
      )}

      {home.mortgageeBank && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{homeCopy.mortgageeBank}</span>
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-white">{home.mortgageeBank}</span>
        </div>
      )}

      {(home.insuredValue !== undefined || home.replacementValue !== undefined) && (
        <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Home className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{homeCopy.valueComparison}</span>
          </div>
          <div className="ml-10.5 space-y-1.5">
            {home.insuredValue !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">{homeCopy.insuredValue}</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(home.insuredValue)}</span>
              </div>
            )}
            {home.replacementValue !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">{homeCopy.replacementValue}</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(home.replacementValue)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {home.theftCoverageLimit !== undefined && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{homeCopy.theftCoverageLimit}</span>
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(home.theftCoverageLimit)}</span>
        </div>
      )}

      {home.contentsVsStructure && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Home className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{homeCopy.contentsVsStructure}</span>
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-white">{home.contentsVsStructure}</span>
        </div>
      )}
    </div>
  )
}
