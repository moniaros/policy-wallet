"use client"

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

interface PetCoverageDetailsProps {
  acordData: AcordData
  language: "el" | "en"
}

export function PetCoverageDetails({ acordData, language }: PetCoverageDetailsProps) {
  const isGreek = language === "el"
  const pet = acordData.pet
  if (!pet) return null

  const copy = {
    microchipNumber: isGreek ? "Αριθμός Microchip" : "Microchip Number",
    annualLimit: isGreek ? "Ετήσιο Όριο" : "Annual Limit",
    used: isGreek ? "Χρησιμοποιημένο" : "Used",
    remaining: isGreek ? "Υπόλοιπο" : "Remaining",
    leishmaniaCoverage: isGreek ? "Κάλυψη Λεϊσμανίασης" : "Leishmania Coverage",
    covered: isGreek ? "Καλύπτεται" : "Covered",
    notCovered: isGreek ? "Δεν καλύπτεται" : "Not covered",
    breedDiseases: isGreek ? "Ασθένειες Φυλής" : "Breed-Specific Diseases",
    directVetPayment: isGreek ? "Απευθείας Πληρωμή Κτηνιάτρου" : "Direct Vet Payment",
    available: isGreek ? "Διαθέσιμη" : "Available",
    notAvailable: isGreek ? "Μη διαθέσιμη" : "Not available",
    waitingPeriods: isGreek ? "Περίοδοι Αναμονής" : "Waiting Periods",
    daysRemaining: isGreek ? "ημέρες" : "days",
    endsOn: isGreek ? "Λήγει" : "Ends",
    copied: isGreek ? "Αντιγράφηκε" : "Copied",
    tapToCopy: isGreek ? "Πατήστε για αντιγραφή" : "Tap to copy",
  }

  const hasAnyData = pet.microchipNumber || pet.annualLimitTotal !== undefined ||
    pet.leishmaniaCovered !== undefined ||
    (pet.breedSpecificDiseases && pet.breedSpecificDiseases.length > 0) ||
    pet.directVetPayment !== undefined ||
    (pet.waitingPeriods && pet.waitingPeriods.length > 0)

  if (!hasAnyData) return null

  const handleCopyMicrochip = async () => {
    if (!pet.microchipNumber) return
    try {
      await navigator.clipboard.writeText(pet.microchipNumber)
      toast.success(copy.copied)
    } catch {
      toast.error("Failed to copy")
    }
  }

  const usagePercent = pet.annualLimitTotal
    ? Math.min(((pet.annualLimitUsed ?? 0) / pet.annualLimitTotal) * 100, 100)
    : 0

  const formatCurrency = (value: number) =>
    value.toLocaleString(isGreek ? "el-GR" : "en-GB", { style: "currency", currency: "EUR" })

  return (
    <div className="space-y-3">
      {pet.microchipNumber && (
        <button
          onClick={handleCopyMicrochip}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Heart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-left">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{copy.microchipNumber}</span>
              <p className="text-xs text-slate-500 dark:text-slate-400">{copy.tapToCopy}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">{pet.microchipNumber}</span>
            <Copy className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </button>
      )}

      {pet.annualLimitTotal !== undefined && (
        <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{copy.annualLimit}</span>
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(pet.annualLimitTotal)}</span>
          </div>
          <div className="ml-10.5">
            <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${usagePercent > 80 ? "bg-red-500" : usagePercent > 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {copy.used}: {formatCurrency(pet.annualLimitUsed ?? 0)}
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {copy.remaining}: {formatCurrency(pet.annualLimitTotal - (pet.annualLimitUsed ?? 0))}
              </span>
            </div>
          </div>
        </div>
      )}

      {pet.leishmaniaCovered !== undefined && (
        <div className={`flex items-center justify-between p-3 rounded-xl border ${
          pet.leishmaniaCovered
            ? "bg-emerald-50/80 dark:bg-emerald-900/20 border-emerald-200/60 dark:border-emerald-800/60"
            : "bg-red-50/80 dark:bg-red-900/20 border-red-200/60 dark:border-red-800/60"
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              pet.leishmaniaCovered
                ? "bg-emerald-100 dark:bg-emerald-900/30"
                : "bg-red-100 dark:bg-red-900/30"
            }`}>
              <Bug className={`w-4 h-4 ${pet.leishmaniaCovered ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`} />
            </div>
            <span className={`text-sm font-bold ${
              pet.leishmaniaCovered
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-red-700 dark:text-red-300"
            }`}>{copy.leishmaniaCoverage}</span>
          </div>
          {pet.leishmaniaCovered ? (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
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
        <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{copy.breedDiseases}</span>
          </div>
          <div className="ml-10.5 flex flex-wrap gap-1.5">
            {pet.breedSpecificDiseases.map((disease, i) => (
              <span key={i} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                {disease}
              </span>
            ))}
          </div>
        </div>
      )}

      {pet.directVetPayment !== undefined && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{copy.directVetPayment}</span>
          </div>
          {pet.directVetPayment ? (
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

      {pet.waitingPeriods && pet.waitingPeriods.length > 0 && (
        <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{copy.waitingPeriods}</span>
          </div>
          <div className="ml-10.5 space-y-1.5">
            {pet.waitingPeriods.map((wp, i) => (
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
    </div>
  )
}
