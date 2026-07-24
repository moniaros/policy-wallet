"use client"

import { useState } from "react"
import { ShieldCheck, ShieldOff, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import type { AcordData } from "@/types/domain"
import type { LineOfBusiness } from "@/types/enums"
import { getTranslations } from "@/lib/i18n"
import { formatExtractedAmount } from "@/lib/i18n/amount-format"
import { HealthCoverageDetails } from "./HealthCoverageDetails"
import { MotorCoverageDetails } from "./MotorCoverageDetails"
import { HomeCoverageDetails } from "./HomeCoverageDetails"
import { LifeCoverageDetails } from "./LifeCoverageDetails"
import { PetCoverageDetails } from "./PetCoverageDetails"

interface CoverageTabViewProps {
  acordData: AcordData
  lineOfBusiness: LineOfBusiness
  language: "el" | "en"
}

export function CoverageTabView({ acordData, lineOfBusiness, language }: CoverageTabViewProps) {
  const [activeTab, setActiveTab] = useState<"covered" | "not_covered">("covered")
  const i18n = getTranslations(language)
  const copy = i18n.coverageDetails

  const renderTypeSpecificDetails = () => {
    switch (lineOfBusiness) {
      case "health":
        return <HealthCoverageDetails acordData={acordData} language={language} />
      case "motor":
        return <MotorCoverageDetails acordData={acordData} language={language} />
      case "home":
        return <HomeCoverageDetails acordData={acordData} language={language} />
      case "life":
        return <LifeCoverageDetails acordData={acordData} language={language} />
      case "pet":
        return <PetCoverageDetails acordData={acordData} language={language} />
      default:
        return null
    }
  }

  const hasCoverages = Boolean(acordData.coverages && acordData.coverages.length > 0)
  const hasExclusions = Boolean(acordData.exclusions && acordData.exclusions.length > 0)
  const typeSpecific = renderTypeSpecificDetails()
  const hasCoveredContent = typeSpecific !== null || hasCoverages

  return (
    <div className="space-y-4">
      <div className="flex rounded-xl bg-black/5 dark:bg-white/5 p-1 border border-black/10 dark:border-white/15">
        <button
          onClick={() => setActiveTab("covered")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "covered"
              ? "bg-white dark:bg-white/10 text-primary dark:text-mint shadow-sm"
              : "text-black/55 dark:text-white/60 hover:text-black/75 dark:hover:text-white/80"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          {copy.whatsCovered}
        </button>
        <button
          onClick={() => setActiveTab("not_covered")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "not_covered"
              ? "bg-white dark:bg-white/10 text-red-700 dark:text-red-400 shadow-sm"
              : "text-black/55 dark:text-white/60 hover:text-black/75 dark:hover:text-white/80"
          }`}
        >
          <ShieldOff className="w-4 h-4" />
          {copy.whatsNotCovered}
          {hasExclusions && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-kicker font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
              {acordData.exclusions!.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "covered" && (
        <div className="space-y-4">
          {typeSpecific}

          {hasCoverages && (
            <div className="space-y-3">
              {typeSpecific && (
                <h3 className="text-sm font-semibold text-black/60 dark:text-white/65 uppercase tracking-wider px-1">
                  {copy.structuredCoverages}
                </h3>
              )}
              {acordData.coverages!.map((coverage, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-primary-soft dark:bg-primary/15 flex items-center justify-center mt-0.5 flex-shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#166534] dark:text-mint" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-black dark:text-white">{coverage.name}</p>
                      {coverage.description && (
                        <p className="text-xs text-black/55 dark:text-white/60 mt-0.5">{coverage.description}</p>
                      )}
                      {coverage.explanation && (
                        <p className="text-xs text-black/55 dark:text-white/60 mt-0.5">
                          {language === "el" ? coverage.explanation.el : coverage.explanation.en}
                        </p>
                      )}
                      {(coverage.limit || coverage.deductible) && (
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {coverage.limit && (
                            <span className="px-2 py-0.5 rounded-full text-micro font-semibold bg-[#EFF6FF] dark:bg-blue-900/30 text-[#1E40AF] dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                              {copy.limit}: {formatExtractedAmount(coverage.limit, language)}
                            </span>
                          )}
                          {coverage.deductible && (
                            <span className="px-2 py-0.5 rounded-full text-micro font-semibold bg-[#FEF3C7]/60 dark:bg-amber-900/30 text-[#92400E] dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                              {copy.deductible}: {formatExtractedAmount(coverage.deductible, language)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!hasCoveredContent && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center mb-3">
                <ShieldCheck className="w-6 h-6 text-black/55 dark:text-white/50" />
              </div>
              <p className="text-sm font-semibold text-black/60 dark:text-white/65">{copy.noCoverageData}</p>
              <p className="text-xs text-black/55 dark:text-white/50 mt-1">{copy.noCoverageDataDesc}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "not_covered" && (
        <div className="space-y-3">
          {hasExclusions ? (
            <>
              {acordData.exclusions!.map((exclusion, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50/60 dark:bg-red-900/10 border border-red-200/60 dark:border-red-800/40"
                >
                  <div className="w-6 h-6 rounded-md bg-red-100 dark:bg-red-900/30 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <XCircle className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                  </div>
                  <p className="text-sm text-red-800 dark:text-red-300 font-medium">{exclusion}</p>
                </div>
              ))}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-[#FEF3C7]/60 dark:bg-amber-900/10 border border-amber-200/40 dark:border-amber-800/30">
                <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-[#92400E] dark:text-amber-400">{copy.exclusionsDisclaimer}</p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center mb-3">
                <ShieldOff className="w-6 h-6 text-black/55 dark:text-white/50" />
              </div>
              <p className="text-sm font-semibold text-black/60 dark:text-white/65">{copy.noExclusions}</p>
              <p className="text-xs text-black/55 dark:text-white/50 mt-1">{copy.noExclusionsDesc}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
