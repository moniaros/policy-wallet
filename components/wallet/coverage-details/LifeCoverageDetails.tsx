"use client"

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
} from "lucide-react"
import type { AcordData } from "@/types/domain"
import { getTranslations } from "@/lib/i18n"

interface LifeCoverageDetailsProps {
  acordData: AcordData
  language: "el" | "en"
}

export function LifeCoverageDetails({ acordData, language }: LifeCoverageDetailsProps) {
  const i18n = getTranslations(language)
  const copy = i18n.coverageDetails
  const lifeCopy = copy.life
  const life = acordData.life
  if (!life) return null

  const hasAnyData = Boolean(
    life.currentFundValue !== undefined ||
    life.ytdGrowth !== undefined ||
    life.taxFreeAtMaturity !== undefined ||
    life.guaranteedPercentage !== undefined ||
    life.surrenderValue !== undefined ||
    life.lastPremiumDate ||
    (acordData.beneficiaries && acordData.beneficiaries.length > 0)
  )

  if (!hasAnyData) return null

  const formatCurrency = (value: number) =>
    value.toLocaleString(language === "el" ? "el-GR" : "en-GB", { style: "currency", currency: "EUR" })

  return (
    <div className="space-y-3">
      {life.currentFundValue !== undefined && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200/60 dark:border-emerald-800/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{lifeCopy.fundValue}</span>
            </div>
            <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(life.currentFundValue)}</span>
          </div>
          {life.ytdGrowth !== undefined && (
            <div className="mt-2 ml-12.5 flex items-center gap-1.5">
              {life.ytdGrowth >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500 dark:text-red-400" />
              )}
              <span className={`text-sm font-bold ${life.ytdGrowth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                {life.ytdGrowth > 0 ? "+" : ""}{life.ytdGrowth.toFixed(2)}%
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{lifeCopy.ytdGrowth}</span>
            </div>
          )}
        </div>
      )}

      {life.taxFreeAtMaturity !== undefined && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{lifeCopy.taxFreeAtMaturity}</span>
          </div>
          {life.taxFreeAtMaturity ? (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" /> {copy.taxFree}
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              {copy.taxable}
            </span>
          )}
        </div>
      )}

      {(life.guaranteedPercentage !== undefined || life.unitLinkedPercentage !== undefined) && (
        <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <PieChart className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{lifeCopy.guaranteedVsUnitLinked}</span>
          </div>
          <div className="ml-10.5">
            <div className="w-full h-4 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
              {life.guaranteedPercentage !== undefined && (
                <div
                  className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-l-full"
                  style={{ width: `${life.guaranteedPercentage}%` }}
                />
              )}
              {life.unitLinkedPercentage !== undefined && (
                <div
                  className="h-full bg-violet-500 dark:bg-violet-400"
                  style={{ width: `${life.unitLinkedPercentage}%` }}
                />
              )}
            </div>
            <div className="flex justify-between mt-1.5 text-xs font-semibold">
              <span className="text-emerald-600 dark:text-emerald-400">
                {lifeCopy.guaranteed}: {life.guaranteedPercentage ?? 0}%
              </span>
              <span className="text-violet-600 dark:text-violet-400">
                {lifeCopy.unitLinked}: {life.unitLinkedPercentage ?? 0}%
              </span>
            </div>
          </div>
        </div>
      )}

      {acordData.beneficiaries && acordData.beneficiaries.length > 0 && (
        <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{lifeCopy.beneficiaries}</span>
          </div>
          <div className="ml-10.5 space-y-1.5">
            {acordData.beneficiaries.map((ben, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-900 dark:text-white font-medium">{ben.name || "-"}</span>
                <div className="flex items-center gap-2">
                  {ben.relationship && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">{ben.relationship}</span>
                  )}
                  {ben.percentage !== undefined && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {ben.percentage}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {life.surrenderValue !== undefined && (
        <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">{lifeCopy.surrenderValue}</span>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80">{lifeCopy.surrenderWarning}</p>
              </div>
            </div>
            <span className="text-sm font-bold text-amber-700 dark:text-amber-300">{formatCurrency(life.surrenderValue)}</span>
          </div>
        </div>
      )}

      {life.lastPremiumDate && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{lifeCopy.lastPremiumDate}</span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lifeCopy.paidOn} {new Date(life.lastPremiumDate).toLocaleDateString(language === "el" ? "el-GR" : "en-GB")}
              </p>
            </div>
          </div>
          {life.lastPremiumAmount !== undefined && (
            <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(life.lastPremiumAmount)}</span>
          )}
        </div>
      )}
    </div>
  )
}
