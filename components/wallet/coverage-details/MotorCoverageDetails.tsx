"use client"

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

interface MotorCoverageDetailsProps {
  acordData: AcordData
  language: "el" | "en"
}

export function MotorCoverageDetails({ acordData, language }: MotorCoverageDetailsProps) {
  const isGreek = language === "el"
  const motor = acordData.motor
  if (!motor) return null

  const copy = {
    coverageTier: isGreek ? "Βαθμίδα Κάλυψης" : "Coverage Tier",
    accidentDeclaration: isGreek ? "Δήλωση Ατυχήματος" : "Accident Declaration",
    roadsideAssistance: isGreek ? "Οδική Βοήθεια" : "Roadside Assistance",
    namedDrivers: isGreek ? "Κατονομαζόμενοι Οδηγοί" : "Named Drivers",
    greenCard: isGreek ? "Πράσινη Κάρτα" : "Green Card",
    ownVehicleDamage: isGreek ? "Ίδιες Ζημιές" : "Own Vehicle Damage",
    glassBreakage: isGreek ? "Θραύση Κρυστάλλων" : "Glass Breakage",
    expires: isGreek ? "Λήγει" : "Expires",
    expiringSoon: isGreek ? "Λήγει σύντομα" : "Expiring soon",
    expired: isGreek ? "Έχει λήξει" : "Expired",
    valid: isGreek ? "Σε ισχύ" : "Valid",
    covered: isGreek ? "Καλύπτεται" : "Covered",
    notCovered: isGreek ? "Δεν καλύπτεται" : "Not covered",
    call: isGreek ? "Κλήση" : "Call",
    license: isGreek ? "Δίπλωμα" : "License",
  }

  const hasAnyData = motor.coverageTier || motor.accidentDeclarationPhone ||
    motor.roadsideAssistancePhone || (motor.namedDrivers && motor.namedDrivers.length > 0) ||
    motor.greenCardExpiry || motor.ownVehicleDamage !== undefined || motor.glassBreakage !== undefined

  if (!hasAnyData) return null

  const greenCardStatus = (() => {
    if (!motor.greenCardExpiry) return null
    const expiry = new Date(motor.greenCardExpiry)
    const now = new Date()
    const daysUntil = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntil < 0) return "expired"
    if (daysUntil <= 30) return "expiring"
    return "valid"
  })()

  return (
    <div className="space-y-3">
      {motor.coverageTier && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{copy.coverageTier}</span>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 capitalize">
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
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <span className="text-sm font-bold text-red-700 dark:text-red-300">{copy.accidentDeclaration}</span>
              <p className="text-xs text-red-600/80 dark:text-red-400/80">{copy.call}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-sm font-bold text-red-700 dark:text-red-300">{motor.accidentDeclarationPhone}</span>
          </div>
        </a>
      )}

      {motor.roadsideAssistancePhone && (
        <a
          href={`tel:${motor.roadsideAssistancePhone}`}
          className="flex items-center justify-between p-3 rounded-xl bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/60 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Car className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <span className="text-sm font-bold text-amber-700 dark:text-amber-300">{copy.roadsideAssistance}</span>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/80">{copy.call}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-bold text-amber-700 dark:text-amber-300">{motor.roadsideAssistancePhone}</span>
          </div>
        </a>
      )}

      {motor.namedDrivers && motor.namedDrivers.length > 0 && (
        <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{copy.namedDrivers}</span>
          </div>
          <div className="ml-10.5 space-y-1.5">
            {motor.namedDrivers.map((driver, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-slate-900 dark:text-white font-medium">{driver.name || "-"}</span>
                {driver.licenseNumber && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {copy.license}: {driver.licenseNumber}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {motor.greenCardExpiry && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{copy.greenCard}</span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {copy.expires}: {new Date(motor.greenCardExpiry).toLocaleDateString(isGreek ? "el-GR" : "en-GB")}
              </p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
            greenCardStatus === "expired"
              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
              : greenCardStatus === "expiring"
                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
          }`}>
            {greenCardStatus === "expired" ? copy.expired : greenCardStatus === "expiring" ? copy.expiringSoon : copy.valid}
          </span>
        </div>
      )}

      {motor.ownVehicleDamage !== undefined && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Car className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{copy.ownVehicleDamage}</span>
          </div>
          {motor.ownVehicleDamage ? (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> {copy.covered}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold text-slate-400 dark:text-slate-500">
              <XCircle className="w-4 h-4" /> {copy.notCovered}
            </span>
          )}
        </div>
      )}

      {motor.glassBreakage !== undefined && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{copy.glassBreakage}</span>
          </div>
          {motor.glassBreakage ? (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> {copy.covered}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold text-slate-400 dark:text-slate-500">
              <XCircle className="w-4 h-4" /> {copy.notCovered}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
