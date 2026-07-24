"use client"

import { formatCurrency } from "@/lib/i18n/format"
import {
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Copy,
  Heart,
  Stethoscope,
  CreditCard,
  Bug,
} from "lucide-react"
import { toast } from "sonner"
import type { AcordData } from "@/types/domain"
import { getTranslations } from "@/lib/i18n"
import { mapWalletErrorToMessage } from "@/lib/i18n/wallet-error"

interface PetCoverageDetailsProps {
  acordData: AcordData
  language: "el" | "en"
}

export function PetCoverageDetails({ acordData, language }: PetCoverageDetailsProps) {
  const i18n = getTranslations(language)
  const copy = i18n.coverageDetails
  const petCopy = copy.pet
  const pet = acordData.pet
  if (!pet) return null

  const hasAnyData = Boolean(
    pet.microchipNumber ||
    pet.annualLimitTotal !== undefined ||
    pet.leishmaniaCovered !== undefined ||
    (pet.breedSpecificDiseases && pet.breedSpecificDiseases.length > 0) ||
    pet.directVetPayment !== undefined ||
    (pet.waitingPeriods && pet.waitingPeriods.length > 0)
  )

  if (!hasAnyData) return null

  const handleCopyMicrochip = async () => {
    if (!pet.microchipNumber) return
    try {
      await navigator.clipboard.writeText(pet.microchipNumber)
      toast.success(copy.copied)
    } catch {
      toast.error(mapWalletErrorToMessage("COPY_FAILED", i18n, "copy"))
    }
  }

  const usagePercent = pet.annualLimitTotal
    ? Math.min(((pet.annualLimitUsed ?? 0) / pet.annualLimitTotal) * 100, 100)
    : 0

  // Shared formatter — these three files each carried an identical private copy.
  const fmt = (value: number) => formatCurrency(value, language === "el" ? "el" : "en", { decimals: 2 })

  return (
    <div className="space-y-3">
      {pet.microchipNumber && (
        <button
          onClick={handleCopyMicrochip}
          className="pw-secondary-button w-full justify-between bg-black/[0.02]"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <div className="text-left">
              <span className="text-sm font-semibold text-black/75 dark:text-white/80">{petCopy.microchipNumber}</span>
              <p className="text-xs text-black/55 dark:text-white/60">{copy.tapToCopy}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-mono font-bold text-black dark:text-white">{pet.microchipNumber}</span>
            <Copy className="w-3.5 h-3.5 text-black/55 dark:text-white/50" />
          </div>
        </button>
      )}

      {pet.annualLimitTotal !== undefined && (
        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary dark:text-mint" />
              </div>
              <span className="text-sm font-semibold text-black/75 dark:text-white/80">{petCopy.annualLimit}</span>
            </div>
            <span className="text-sm font-bold text-black dark:text-white">{fmt(pet.annualLimitTotal)}</span>
          </div>
          <div className="ml-10.5">
            <div className="w-full h-3 rounded-full bg-black/10 dark:bg-white/15 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${usagePercent > 80 ? "bg-red-500" : usagePercent > 50 ? "bg-amber-500" : "bg-primary"}`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs">
              <span className="text-black/55 dark:text-white/60">
                {copy.used}: {fmt(pet.annualLimitUsed ?? 0)}
              </span>
              <span className="font-semibold text-[#166534] dark:text-mint">
                {copy.remaining}: {fmt(pet.annualLimitTotal - (pet.annualLimitUsed ?? 0))}
              </span>
            </div>
          </div>
        </div>
      )}

      {pet.leishmaniaCovered !== undefined && (
        <div className={`flex items-center justify-between p-3 rounded-xl border ${
          pet.leishmaniaCovered
            ? "bg-primary-tint dark:bg-primary/15 border-primary/20 dark:border-primary/30"
            : "bg-red-50/80 dark:bg-red-900/20 border-red-200/60 dark:border-red-800/60"
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              pet.leishmaniaCovered
                ? "bg-primary-soft dark:bg-primary/15"
                : "bg-red-100 dark:bg-red-900/30"
            }`}>
              <Bug className={`w-4 h-4 ${pet.leishmaniaCovered ? "text-[#166534] dark:text-mint" : "text-red-700 dark:text-red-400"}`} />
            </div>
            <span className={`text-sm font-bold ${
              pet.leishmaniaCovered
                ? "text-[#166534] dark:text-mint"
                : "text-red-700 dark:text-red-300"
            }`}>{petCopy.leishmaniaCoverage}</span>
          </div>
          {pet.leishmaniaCovered ? (
            <span className="flex items-center gap-1 text-xs font-bold text-[#166534] dark:text-mint">
              <CheckCircle2 className="w-4 h-4" /> {copy.covered}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold text-red-500 dark:text-red-400">
              <XCircle className="w-4 h-4" /> {copy.notCovered}
            </span>
          )}
        </div>
      )}

      {pet.breedSpecificDiseases && pet.breedSpecificDiseases.length > 0 && (
        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{petCopy.breedSpecificDiseases}</span>
          </div>
          <div className="ml-10.5 flex flex-wrap gap-1.5">
            {pet.breedSpecificDiseases.map((disease, i) => (
              <span key={i} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint border border-primary/20 dark:border-primary/30">
                {disease}
              </span>
            ))}
          </div>
        </div>
      )}

      {pet.directVetPayment !== undefined && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-primary dark:text-mint" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{petCopy.directVetPayment}</span>
          </div>
          {pet.directVetPayment ? (
            <span className="flex items-center gap-1 text-xs font-bold text-[#166534] dark:text-mint">
              <CheckCircle2 className="w-4 h-4" /> {copy.available}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold text-black/55 dark:text-white/50">
              <XCircle className="w-4 h-4" /> {copy.notAvailable}
            </span>
          )}
        </div>
      )}

      {pet.waitingPeriods && pet.waitingPeriods.length > 0 && (
        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/10 dark:border-white/15">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-4 h-4 text-[#92400E] dark:text-amber-400" />
            </div>
            <span className="text-sm font-semibold text-black/75 dark:text-white/80">{petCopy.waitingPeriods}</span>
          </div>
          <div className="ml-10.5 space-y-1.5">
            {pet.waitingPeriods.map((wp, i) => (
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
    </div>
  )
}
