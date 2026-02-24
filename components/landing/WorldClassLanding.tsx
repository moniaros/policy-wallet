"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Inter } from "next/font/google"
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Lock,
  ShieldCheck,
  SmilePlus,
  Sparkles,
  Users,
} from "lucide-react"
import { trackLandingEvent } from "@/lib/landing/analytics"
import type { LandingLocale } from "@/types/landing-content"

const inter = Inter({
  subsets: ["latin", "greek"],
  weight: ["400", "500", "600", "700", "800"],
})

interface WorldClassLandingProps {
  locale: LandingLocale
}

type Plan = {
  name: string
  price: string
  includes: string
  featured?: boolean
}

export function WorldClassLanding({ locale }: WorldClassLandingProps) {
  const isGreek = locale === "el"
  const t = (el: string, en: string) => (isGreek ? el : en)

  useEffect(() => {
    trackLandingEvent("page_view_landing", {
      locale,
      page_variant: "policywallet_v6_landing_refresh",
    })
  }, [locale])

  const trackCta = (location: string) =>
    trackLandingEvent("cta_clicked_hero", {
      locale,
      cta: "start_free",
      location,
    })

  const plans: Plan[] = [
    {
      name: "Free",
      price: "EUR 0/mo",
      includes: t("3 συμβόλαια, βασικό αποθηκευτικό χώρο", "3 policies, basic storage"),
    },
    {
      name: "Pay As You Go",
      price: "EUR 0.99/1M tokens",
      includes: t("Απεριόριστα συμβόλαια, αγορά tokens", "Unlimited policies, buy tokens"),
    },
    {
      name: "Essential",
      price: "EUR 2.99/mo",
      includes: t("1M tokens, gap analysis και Q&A", "1M tokens, gap analysis and Q&A"),
      featured: true,
    },
  ]

  return (
    <div className={`${inter.className} min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 text-slate-900`}>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-slate-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="text-xs font-extrabold tracking-[0.22em] text-slate-900">POLICYWALLET</div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#benefits" className="transition-colors hover:text-blue-700">Features</a>
            <a href="#pricing" className="transition-colors hover:text-blue-700">Pricing</a>
            <a href="#testimonials" className="transition-colors hover:text-blue-700">Testimonials</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href={locale === "el" ? "/" : "/en"}
              className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200/70"
            >
              {locale === "el" ? "EL" : "EN"}
            </Link>
            <Link
              href={locale === "el" ? "/en" : "/"}
              className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200/70"
            >
              {locale === "el" ? "EN" : "EL"}
            </Link>
            <Link
              href="/auth/signin?source=landing_nav_login"
              className="hidden rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:shadow-md sm:block"
            >
              {t("Σύνδεση", "Login")}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="px-4 pt-16 sm:px-6 sm:pt-20">
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Smart Insurance Wallet</p>
            <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.02em] sm:text-5xl">
              {t(
                "Όλα τα ασφαλιστήρια σου σε ένα καθαρό, έξυπνο workspace.",
                "All your policies in one clean, intelligent workspace.",
              )}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-slate-600">
              {t(
                "Αποθήκευσε συμβόλαια, δες έγκαιρα ανανεώσεις και πάρε AI insights που σε βοηθούν να δράσεις γρήγορα. You're covered! 💙",
                "Store policies, stay ahead of renewals, and get AI insights that help you act fast. You're covered! 💙",
              )}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/auth/signup?role=policyholder&source=landing_hero_primary"
                onClick={() => trackCta("hero_primary")}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md"
              >
                {t("Start Free", "Start Free")}
              </Link>
              <Link
                href="/auth/signin?source=landing_hero_secondary"
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:shadow-md"
              >
                {t("Book Demo", "Book Demo")}
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 pt-10 sm:px-6">
          <div className="mx-auto max-w-5xl rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 text-xs text-slate-500">
              <span>PolicyWallet Dashboard</span>
              <span>{t("Ενημερώθηκε 2 λεπτά πριν", "Updated 2 minutes ago")}</span>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_280px]">
              <div className="space-y-3 rounded-lg bg-slate-50 p-3">
                <article className="rounded-md border border-amber-200 bg-amber-50 p-3 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">Motor</p>
                  <p className="mt-1 text-sm font-semibold text-amber-900">{t("Λήγει σε 9 ημέρες", "Expires in 9 days")}</p>
                </article>
                <article className="rounded-md border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Health</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-900">{t("Direct billing ενεργό", "Direct billing active")}</p>
                </article>
                <article className="rounded-md border border-rose-200 bg-rose-50 p-3 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700">AI Insight</p>
                  <p className="mt-1 text-sm font-semibold text-rose-900">{t("ENFIA gap: πιθανή εξοικονόμηση φόρου", "ENFIA gap: possible tax savings")}</p>
                </article>
              </div>
              <aside className="rounded-lg bg-slate-900 p-4 text-white shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">{t("Σύμβουλος", "Advisor")}</p>
                <p className="mt-1 text-sm font-semibold">Nikos Papadakis</p>
                <p className="mt-2 text-xs text-slate-300">{t("Επόμενη ενέργεια: έλεγχος renewal quote", "Next action: review renewal quote")}</p>
                <button className="mt-4 rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-emerald-600 hover:shadow-md">
                  {t("Άνοιγμα chat", "Open chat")}
                </button>
              </aside>
            </div>
          </div>
        </section>

        <section id="benefits" className="px-4 pt-20 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-semibold sm:text-4xl">{t("Built for clarity and confidence", "Built for clarity and confidence")}</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <article className="rounded-md bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
                <p className="text-xl font-semibold">Simplicity</p>
                <p className="mt-2 text-base text-slate-600">{t("Μία εικόνα για όλα τα συμβόλαια.", "One place for every policy.")}</p>
              </article>
              <article className="rounded-md bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
                <p className="text-xl font-semibold">Intelligence</p>
                <p className="mt-2 text-base text-slate-600">{t("AI που εξηγεί όρους και κενά.", "AI that explains terms and gaps.")}</p>
              </article>
              <article className="rounded-md bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
                <p className="text-xl font-semibold">Peace</p>
                <p className="mt-2 text-base text-slate-600">{t("Έγκαιρες υπενθυμίσεις, χωρίς άγχος.", "Timely reminders without stress.")}</p>
              </article>
            </div>
          </div>
        </section>

        <section className="px-4 pt-20 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-semibold sm:text-4xl">{t("How it works", "How it works")}</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <article className="rounded-md bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <p className="mt-3 text-xl font-semibold">{t("1. Add policy", "1. Add policy")}</p>
                <p className="mt-2 text-base text-slate-600">{t("Upload PDF ή φωτογραφία εγγράφου.", "Upload PDF or photo capture.")}</p>
              </article>
              <article className="rounded-md bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
                <BrainCircuit className="h-5 w-5 text-blue-600" />
                <p className="mt-3 text-xl font-semibold">{t("2. AI parsing", "2. AI parsing")}</p>
                <p className="mt-2 text-base text-slate-600">{t("Coverage, exclusions και renewal dates.", "Coverage, exclusions, and renewal dates.")}</p>
              </article>
              <article className="rounded-md bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <p className="mt-3 text-xl font-semibold">{t("3. Act fast", "3. Act fast")}</p>
                <p className="mt-2 text-base text-slate-600">{t("Renew, claim ή share με agent.", "Renew, claim, or share with your agent.")}</p>
              </article>
            </div>
          </div>
        </section>

        <section id="pricing" className="px-4 pt-20 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-semibold sm:text-4xl">{t("Simple pricing", "Simple pricing")}</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {plans.map((plan) => (
                <article
                  key={plan.name}
                  className={`rounded-md p-5 shadow-sm transition-all duration-200 hover:shadow-md ${
                    plan.featured ? "border border-blue-200 bg-blue-50" : "bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-semibold">{plan.name}</p>
                    {plan.featured ? (
                      <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">{t("Most Popular", "Most Popular")}</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-base font-medium text-slate-700">{plan.price}</p>
                  <p className="mt-2 text-base text-slate-600">{plan.includes}</p>
                  {plan.featured ? (
                    <button className="mt-4 w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-emerald-600 hover:shadow-md">
                      {t("Get Essential", "Get Essential")}
                    </button>
                  ) : (
                    <button className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:shadow-md">
                      {t("Choose plan", "Choose plan")}
                    </button>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="testimonials" className="mt-20 bg-slate-900 text-white">
          <div className="mx-auto grid max-w-5xl gap-8 px-4 py-14 md:grid-cols-[220px_1fr] md:items-center sm:px-6">
            <div className="aspect-square rounded-md bg-slate-700" />
            <div>
              <p className="text-base leading-relaxed text-slate-100">
                "PolicyWallet helps our clients stay proactive on renewals and reduce coverage blind spots. The experience is clear, fast, and trustworthy."
              </p>
              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-400">{t("Insurance Advisor", "Insurance Advisor")}</p>
            </div>
          </div>
        </section>

        <section className="bg-slate-900 text-white">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
              {t("Get access to the insurance experience built for scale", "Get access to the insurance experience built for scale")}
            </h2>
            <p className="mt-3 text-base text-slate-300">{t("Ξεκίνα μέσα σε λίγα λεπτά.", "Start in minutes.")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/auth/signup?role=policyholder&source=landing_final"
                onClick={() => trackCta("final")}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md"
              >
                {t("Start Free", "Start Free")}
                <ArrowRight className="ml-2 inline h-4 w-4" />
              </Link>
              <Link
                href="/auth/signin?source=landing_final_login"
                className="rounded-lg border border-slate-500 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800"
              >
                {t("Login", "Login")}
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-5xl space-y-4 text-sm leading-relaxed text-slate-600">
            <p>
              PolicyWallet is a digital insurance organization platform for policy storage, renewal tracking, and collaboration workflows.
              Feature availability depends on document quality, insurer data, subscription plan, and regional limitations.
            </p>
            <p>
              AI-generated summaries are guidance aids. Final coverage or claims decisions should always be validated against official policy documents and licensed professional advice.
            </p>
            <p>
              Security controls include encryption in transit and at rest, consent-driven sharing, and role-scoped access for collaborative workflows.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1fr_1fr_1fr_1.2fr] sm:px-6">
          <div>
            <p className="text-xs font-extrabold tracking-[0.22em] text-slate-900">POLICYWALLET</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("Features", "Features")}</p>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              <li>{t("Policy Wallet", "Policy Wallet")}</li>
              <li>{t("AI Insights", "AI Insights")}</li>
              <li>{t("Renewal Reminders", "Renewal Reminders")}</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("Resources", "Resources")}</p>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              <li><Link href="/privacy" className="hover:text-blue-700">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-blue-700">Terms</Link></li>
              <li><Link href="/auth/signin" className="hover:text-blue-700">Login</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("Trust", "Trust")}</p>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 shadow-sm"><Lock className="h-4 w-4 text-blue-600" /> GDPR ready</p>
              <p className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 shadow-sm"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Encrypted storage</p>
              <p className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 shadow-sm"><Users className="h-4 w-4 text-blue-600" /> Agent collaboration</p>
              <p className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 shadow-sm"><SmilePlus className="h-4 w-4 text-emerald-600" /> {t("Friendly support", "Friendly support")}</p>
            </div>
          </div>
        </div>
      </footer>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white sm:hidden">
        <div className="grid grid-cols-5 text-center text-[11px] font-medium text-slate-600">
          <span className="py-3 text-blue-700">Home</span>
          <span className="py-3">MyWallet</span>
          <span className="py-3">AIInsights</span>
          <span className="py-3">Agent</span>
          <span className="py-3">Settings</span>
        </div>
      </nav>
    </div>
  )
}
