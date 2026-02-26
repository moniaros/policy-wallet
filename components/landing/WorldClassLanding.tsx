"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Inter } from "next/font/google"
import { ArrowRight, Menu, X } from "lucide-react"
import { trackLandingEvent } from "@/lib/landing/analytics"
import type { LandingLocale } from "@/types/landing-content"

const inter = Inter({
  subsets: ["latin", "greek"],
  weight: ["400", "500", "600", "700"],
})

interface WorldClassLandingProps {
  locale: LandingLocale
}

export function WorldClassLanding({ locale }: WorldClassLandingProps) {
  const isGreek = locale === "el"
  const t = (el: string, en: string) => (isGreek ? el : en)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    trackLandingEvent("page_view_landing", {
      locale,
      page_variant: "policywallet_arc_style_v2",
    })
  }, [locale])

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isMobileMenuOpen])

  const trackCta = (location: string) =>
    trackLandingEvent("cta_clicked_hero", {
      locale,
      cta: "start_free",
      location,
    })

  return (
    <div className={`${inter.className} min-h-screen bg-white text-[#0F172A] selection:bg-[#206756]/20 selection:text-[#0F172A]`}>

      {/* HEADER - Floating Pill */}
      <header className="fixed top-4 left-4 right-4 z-50">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between rounded-full bg-white/80 px-6 backdrop-blur-xl border border-gray-200/50 shadow-sm transition-all duration-300">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center text-[20px] font-bold tracking-tight">
            <span className="text-[#0F172A]">Policy</span><span className="text-[#64748B]">Wallet</span>
          </Link>

          {/* Nav Links (Desktop) */}
          <nav className="hidden items-center gap-8 font-medium text-[#475569] md:flex text-[14px]">
            <Link href="/product" className="hover:text-[#0F172A] transition-colors">{t("Προϊόντα", "Products")}</Link>
            <Link href="#solutions" className="hover:text-[#0F172A] transition-colors">{t("Λύσεις", "Solutions")}</Link>
            <Link href="/company" className="hover:text-[#0F172A] transition-colors">{t("Εταιρεία", "Company")}</Link>
            <Link href="/pricing" className="hover:text-[#0F172A] transition-colors">{t("Τιμολόγηση", "Pricing")}</Link>
          </nav>

          {/* Actions (Desktop) */}
          <div className="hidden md:flex items-center gap-5">
            <div className="flex items-center gap-2">
              <Link href="/el" className={`text-xs font-semibold transition-colors ${locale === 'el' ? 'text-[#0F172A]' : 'text-[#64748B] hover:text-[#0F172A]'}`}>EL</Link>
              <span className="text-[#E2E8F0]">|</span>
              <Link href="/en" className={`text-xs font-semibold transition-colors ${locale === 'en' ? 'text-[#0F172A]' : 'text-[#64748B] hover:text-[#0F172A]'}`}>EN</Link>
            </div>
            <Link
              href="/auth/signin?source=landing_nav_login"
              className="font-medium text-[#0F172A] hover:text-[#206756] transition-colors text-[14px]"
            >
              {t("Σύνδεση", "Log in")}
            </Link>
            <Link
              href="/auth/signup?role=policyholder&source=landing_nav"
              onClick={() => trackCta("nav")}
              className="rounded-full bg-[#29685B] px-5 py-2 text-[14px] font-bold text-white transition-colors hover:bg-[#1C4E44]"
            >
              {t("Ξεκινήστε", "Get started")}
            </Link>
          </div>

          {/* Hamburger (Mobile) */}
          <button
            className="md:hidden p-2 -mr-2 text-[#0F172A]"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* FULL-SCREEN MOBILE MENU (Arc Style) */}
      <div
        className={`fixed inset-0 z-[100] bg-[#29685B] backdrop-blur-3xl text-white flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isMobileMenuOpen ? "translate-y-0" : "-translate-y-full"
          }`}
      >
        <div className="flex h-16 items-center justify-between px-6 pt-4 max-w-[1400px] w-full mx-auto">
          <Link href="/" className="inline-flex items-center text-[20px] font-bold tracking-tight" onClick={() => setIsMobileMenuOpen(false)}>
            <span className="text-white">Policy</span><span className="text-white/80">Wallet</span>
          </Link>
          <button
            className="p-2 -mr-2 text-white hover:bg-white/10 rounded-full transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-1 flex-col justify-center px-8 sm:px-12 pb-24 max-w-[1400px] w-full mx-auto">
          <nav className="flex flex-col gap-6 text-[44px] sm:text-[56px] font-medium tracking-tight mb-12 leading-tight">
            <Link href="/product" className="text-white hover:text-white/80 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
              {t("Προϊόντα", "Products")}
            </Link>
            <Link href="/company" className="text-white hover:text-white/80 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
              {t("Εταιρεία", "Company")}
            </Link>
            <Link href="/pricing" className="text-white hover:text-white/80 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
              {t("Τιμολόγηση", "Pricing")}
            </Link>
            <div className="flex items-center gap-4 mt-4 text-[18px] font-bold">
              <Link href="/el" className={`transition-colors ${locale === 'el' ? 'text-white' : 'text-white/50'}`} onClick={() => setIsMobileMenuOpen(false)}>EL</Link>
              <span className="text-white/20">|</span>
              <Link href="/en" className={`transition-colors ${locale === 'en' ? 'text-white' : 'text-white/50'}`} onClick={() => setIsMobileMenuOpen(false)}>EN</Link>
            </div>
          </nav>

          <div className="flex flex-col gap-4 mt-auto">
            <Link
              href="/auth/signin?source=landing_nav_login"
              className="w-full rounded-2xl bg-[#1C4E44] border border-transparent px-6 py-4 text-center text-[18px] font-bold text-white transition-colors hover:bg-[#143B33]"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t("Σύνδεση", "Log in")}
            </Link>
            <Link
              href="/auth/signup?role=policyholder&source=landing_nav"
              className="w-full rounded-2xl bg-[#337D6F] px-6 py-4 text-center text-[18px] font-bold text-white transition-transform active:scale-[0.98] hover:bg-[#2C6E61]"
              onClick={() => {
                trackCta("mobile_nav")
                setIsMobileMenuOpen(false)
              }}
            >
              {t("Ξεκινήστε", "Get started")}
            </Link>
          </div>
        </div>
      </div>

      <main className="pt-32 lg:pt-40">

        {/* HERO SECTION */}
        <section className="px-6 lg:px-12">
          <div className="mx-auto max-w-[900px] text-center">
            <h1 className="text-[46px] lg:text-[68px] leading-[1.05] tracking-[-0.04em] font-medium text-[#0F172A] mb-8">
              {t("ΟΛΑ τα συμβόλαια σου οργανωμένα, σε ΕΝΑ Wallet", "Your Smart Insurance Wallet Powered by AI")}
            </h1>
            <p className="mx-auto max-w-[680px] text-[20px] lg:text-[22px] leading-[1.5] text-[#475569] mb-10">
              {t("Συγκεντρώστε τα συμβόλαια, κατανοήστε δυσνόητους όρους, ξεκλειδώστε ξεχασμένες καλύψεις και συμβουλευτείτε την AI τεχνολογία μας. Υποστηρίζει 99% των Ασφαλιστικών—όλα σε μία ενιαία πλατφόρμα.", "Maximize your insurance benefits with intelligent insights and preventive care reminders—all in one place. Get personalized recommendations to optimize your coverage, close gaps, and save money.")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/signup?role=policyholder&source=landing_hero"
                onClick={() => trackCta("hero")}
                className="w-full sm:w-auto rounded-full bg-[#29685B] px-8 py-3.5 text-[16px] font-bold text-white transition-colors hover:bg-[#1C4E44]"
              >
                {t("Ξεκινήστε τώρα", "Get started")}
              </Link>
              <Link
                href="mailto:hello@policywallet.com"
                className="w-full sm:w-auto rounded-full bg-white px-8 py-3.5 border border-gray-200 text-[16px] font-bold text-[#0F172A] transition-colors hover:bg-gray-50"
              >
                {t("Επικοινωνία", "Contact us")}
              </Link>
            </div>
          </div>
        </section>

        {/* HERO DASHBOARD IMAGE */}
        <section className="px-6 lg:px-12 mt-16 lg:mt-24 mb-32">
          <div className="mx-auto max-w-[1240px] relative rounded-[8px] sm:rounded-[12px] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.12)] border border-[#E5E5E5] bg-white aspect-[16/10] md:aspect-[16/9]">
            {/* Use generated mockup */}
            <Image
              src="/images/hero_dashboard_mockup_1771963947200.png"
              alt="PolicyWallet interface"
              fill
              className="object-cover object-top"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white/30 to-transparent pointer-events-none" />
          </div>
        </section>

        {/* 3 CARDS FEATURES */}
        <section className="px-6 lg:px-12 py-24 bg-white" id="products">
          <div className="mx-auto max-w-[1240px]">
            <h2 className="text-[36px] lg:text-[44px] font-medium tracking-[-0.03em] mb-12 max-w-xl leading-[1.1] text-[#1A1A1A]">
              {t("Ψηφιακό πορτοφόλι σχεδιασμένο για την ασφαλιστική ανάπτυξή σας", "Policy Management accounts built for scale")}
            </h2>

            <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-8 pt-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden -mx-6 px-6 lg:mx-0 lg:px-0">
              {/* Card 1 - Soft Blue / Motor */}
              <Link href="/product/motor" className="shrink-0 w-[85vw] md:w-[400px] snap-center lg:snap-align-none group flex flex-col justify-between h-[400px] rounded-[8px] bg-[#D7E4ED] p-10 cursor-pointer overflow-hidden relative transition-transform hover:scale-[1.02]">
                <div className="z-10">
                  <span className="inline-flex bg-white px-3 py-1 rounded-[4px] text-[11px] font-semibold tracking-wider uppercase text-[#1A1A1A]">
                    {t("Οχήματα", "Motor & Liability")}
                  </span>
                  <h3 className="text-[28px] font-medium mt-8 tracking-[-0.02em] leading-[1.1] max-w-[90%] text-[#1A1A1A]">
                    {t("Έλεγχος πραγματικής αξίας", "Real-time market tracking")}
                  </h3>
                </div>
                <div className="z-10">
                  <p className="text-[#1A1A1A]/70 text-[16px] max-w-[260px] mb-8 leading-snug">
                    {t("Ασφαλίστε την πραγματική αξία του οχήματός σας και εντοπίστε κενά οδικής βοήθειας.", "Track vehicle values and verify roadside assistance coverages instantly.")}
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-[#1A1A1A] font-medium text-[15px] group-hover:underline decoration-1 underline-offset-4">
                    {t("Μάθετε περισσότερα", "Learn more")} <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>

              {/* Card 2 - Soft Green / Property */}
              <Link href="/product/property" className="shrink-0 w-[85vw] md:w-[400px] snap-center lg:snap-align-none group flex flex-col justify-between h-[400px] rounded-[8px] bg-[#DCEBDA] p-10 cursor-pointer overflow-hidden relative transition-transform hover:scale-[1.02]">
                <div className="z-10">
                  <span className="inline-flex bg-white px-3 py-1 rounded-[4px] text-[11px] font-semibold tracking-wider uppercase text-[#1A1A1A]">
                    {t("Ακίνητα", "Property & Home")}
                  </span>
                  <h3 className="text-[28px] font-medium mt-8 tracking-[-0.02em] leading-[1.1] max-w-[90%] text-[#1A1A1A]">
                    {t("Εκπτώσεις ΕΝΦΙΑ", "ENFIA compliance")}
                  </h3>
                </div>
                <div className="z-10">
                  <p className="text-[#1A1A1A]/70 text-[16px] max-w-[260px] mb-8 leading-snug">
                    {t("Ελέγξτε τις καλύψεις φυσικών καταστροφών και διασφαλίστε το Rebuild Cost του ακινήτου σας.", "Analyze rebuild costs and strictly evaluate natural disaster coverage for tax deductions.")}
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-[#1A1A1A] font-medium text-[15px] group-hover:underline decoration-1 underline-offset-4">
                    {t("Μάθετε περισσότερα", "Learn more")} <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>

              {/* Card 3 - Soft Sand / Health */}
              <Link href="/product/health" className="shrink-0 w-[85vw] md:w-[400px] snap-center lg:snap-align-none group flex flex-col justify-between h-[400px] rounded-[8px] bg-[#EBE5D9] p-10 cursor-pointer overflow-hidden relative transition-transform hover:scale-[1.02]">
                <div className="z-10">
                  <span className="inline-flex bg-white px-3 py-1 rounded-[4px] text-[11px] font-semibold tracking-wider uppercase text-[#1A1A1A]">
                    {t("Υγεία", "Health & Life")}
                  </span>
                  <h3 className="text-[28px] font-medium mt-8 tracking-[-0.02em] leading-[1.1] max-w-[90%] text-[#1A1A1A]">
                    {t("Έλεγχος συμμετοχής", "Out-of-Pocket Trackers")}
                  </h3>
                </div>
                <div className="z-10">
                  <p className="text-[#1A1A1A]/70 text-[16px] max-w-[260px] mb-8 leading-snug">
                    {t("Οπτικοποιήστε τα μέγιστα όρια πληρωμών και αποκτήστε πρόσβαση στα κέντρα συντονισμού άμεσα.", "Visualize max out-of-pocket limits and access coordination centers immediately.")}
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-[#1A1A1A] font-medium text-[15px] group-hover:underline decoration-1 underline-offset-4">
                    {t("Μάθετε περισσότερα", "Learn more")} <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>

              {/* Card 4 - Soft Purple / Cyber */}
              <Link href="/product/cyber" className="shrink-0 w-[85vw] md:w-[400px] snap-center lg:snap-align-none group flex flex-col justify-between h-[400px] rounded-[8px] bg-[#E6DDF2] p-10 cursor-pointer overflow-hidden relative transition-transform hover:scale-[1.02]">
                <div className="z-10">
                  <span className="inline-flex bg-white px-3 py-1 rounded-[4px] text-[11px] font-semibold tracking-wider uppercase text-[#1A1A1A]">
                    {t("Κυβερνοασφάλεια", "Cyber Risk")}
                  </span>
                  <h3 className="text-[28px] font-medium mt-8 tracking-[-0.02em] leading-[1.1] max-w-[90%] text-[#1A1A1A]">
                    {t("Ανταπόκριση επιθέσεων", "Incident Response")}
                  </h3>
                </div>
                <div className="z-10">
                  <p className="text-[#1A1A1A]/70 text-[16px] max-w-[260px] mb-8 leading-snug">
                    {t("Ελέγξτε τις καλύψεις σας για ransomware και Business Interruption πριν συμβεί το οτιδήποτε.", "Validate your ransomware coverage and verify business interruption limits before a breach.")}
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-[#1A1A1A] font-medium text-[15px] group-hover:underline decoration-1 underline-offset-4">
                    {t("Μάθετε περισσότερα", "Learn more")} <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>

              {/* Card 5 - Soft Coral / Group Health */}
              <Link href="/product/group-health" className="shrink-0 w-[85vw] md:w-[400px] snap-center lg:snap-align-none group flex flex-col justify-between h-[400px] rounded-[8px] bg-[#F2E3DF] p-10 cursor-pointer overflow-hidden relative transition-transform hover:scale-[1.02]">
                <div className="z-10">
                  <span className="inline-flex bg-white px-3 py-1 rounded-[4px] text-[11px] font-semibold tracking-wider uppercase text-[#1A1A1A]">
                    {t("Ομαδική Υγεία", "Group Health")}
                  </span>
                  <h3 className="text-[28px] font-medium mt-8 tracking-[-0.02em] leading-[1.1] max-w-[90%] text-[#1A1A1A]">
                    {t("Εταιρικές παροχές", "Corporate benefits")}
                  </h3>
                </div>
                <div className="z-10">
                  <p className="text-[#1A1A1A]/70 text-[16px] max-w-[260px] mb-8 leading-snug">
                    {t("Συνδυάστε τις παροχές του ομαδικού σας με την ατομική σας ασφάλιση.", "Combine deeply your corporate medical benefits with personal plans to minimize exposure.")}
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-[#1A1A1A] font-medium text-[15px] group-hover:underline decoration-1 underline-offset-4">
                    {t("Μάθετε περισσότερα", "Learn more")} <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>

              {/* Card 6 - Soft Lime / Group Pension */}
              <Link href="/product/group-pension" className="shrink-0 w-[85vw] md:w-[400px] snap-center lg:snap-align-none group flex flex-col justify-between h-[400px] rounded-[8px] bg-[#E7EDD7] p-10 cursor-pointer overflow-hidden relative transition-transform hover:scale-[1.02]">
                <div className="z-10">
                  <span className="inline-flex bg-white px-3 py-1 rounded-[4px] text-[11px] font-semibold tracking-wider uppercase text-[#1A1A1A]">
                    {t("Συνταξιοδοτικά", "Group Pension")}
                  </span>
                  <h3 className="text-[28px] font-medium mt-8 tracking-[-0.02em] leading-[1.1] max-w-[90%] text-[#1A1A1A]">
                    {t("Φορολογικές ελαφρύνσεις", "Tax deductions")}
                  </h3>
                </div>
                <div className="z-10">
                  <p className="text-[#1A1A1A]/70 text-[16px] max-w-[260px] mb-8 leading-snug">
                    {t("Αναλύστε την απόδοση των κεφαλαίων σας και εκμεταλλευτείτε τις φοροαπαλλαγές.", "Monitor fund growth and securely log premium contributions for tax deduction claims.")}
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-[#1A1A1A] font-medium text-[15px] group-hover:underline decoration-1 underline-offset-4">
                    {t("Μάθετε περισσότερα", "Learn more")} <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* DUAL PANELS SECTION */}
        <section className="px-6 lg:px-12 py-24 bg-white" id="solutions">
          <div className="mx-auto max-w-[1240px]">
            <h2 className="text-[36px] lg:text-[44px] font-medium tracking-[-0.03em] mb-12 max-w-2xl leading-[1.1] text-[#1A1A1A]">
              {t("Για να έχετε απόλυτη γνώση και έλεγχο των συμβολαίων σας", "Intelligent solutions to support your growth")}
            </h2>

            <div className="flex flex-col gap-6">
              {/* Top Light Panel - Pet */}
              <div className="rounded-[8px] bg-[#F7F7F7] p-8 lg:p-16 flex flex-col lg:flex-row gap-12 items-center">
                <div className="flex-1 lg:pr-12">
                  <span className="inline-flex bg-white border border-[#E5E5E5] px-3 py-1 rounded-[4px] text-[11px] font-semibold tracking-wider uppercase text-[#1A1A1A]">
                    {t("Κατοικίδια", "Pet Safety")}
                  </span>
                  <h3 className="text-[32px] font-medium mt-6 mb-4 tracking-[-0.02em] leading-[1.1]">{t("Κλείστε τα κρυφά παραθυράκια", "Close hidden exclusion loopholes")}</h3>
                  <p className="text-[#707070] text-[18px] leading-relaxed max-w-[420px]">
                    {t("Εξάγουμε προϋπάρχουσες παθήσεις και επαληθεύουμε αν έχετε την απαραίτητη κάλυψη Leishmania (Καλαζάρ).", "Extract pre-existing condition exclusions and verify strictly necessary vector disease coverages.")}
                  </p>
                  <Link href="/product/pet" className="inline-flex items-center gap-1.5 mt-8 text-[#1A1A1A] font-medium text-[15px] hover:underline decoration-1 underline-offset-4">
                    {t("Μάθετε περισσότερα", "Learn more")} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="flex-1 w-full bg-white rounded-[8px] p-6 lg:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-[#E5E5E5]">
                  <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#F0F0F0] rounded flex items-center justify-center text-[#1A1A1A] font-semibold text-sm">Pt</div>
                      <div>
                        <div className="font-medium text-[#1A1A1A]">Golden Retriever Age 4</div>
                        <div className="text-sm text-[#707070]">Limit Reached: 20%</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-[#1A1A1A]">€ 1,250</div>
                      <div className="text-sm text-[#707070]">Premium</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-[13px] font-medium text-[#707070] uppercase tracking-wider mb-2">
                      <span>Coverage Risk</span>
                      <span className="text-[#0F172A]">Leishmania Covered ✓</span>
                    </div>
                    <div className="w-full bg-[#F0F0F0] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#0F172A] w-[45%] h-full rounded-full transition-all duration-1000"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Dark Panel */}
              <div className="rounded-[8px] bg-[#1A1C1D] text-white p-8 lg:p-16 flex flex-col lg:flex-row gap-12 items-center">
                <div className="flex-1 lg:pr-12">
                  <span className="inline-flex bg-[#2D2E2F] px-3 py-1 rounded-[4px] text-[11px] font-semibold tracking-wider uppercase text-white">
                    {t("Διαχείριση", "Workflow")}
                  </span>
                  <h3 className="text-[32px] font-medium mt-6 mb-4 tracking-[-0.02em] leading-[1.1]">{t("Αυτοματοποιήστε την ανανέωση", "Outsource your renewal workflow")}</h3>
                  <p className="text-[#A0A0A0] text-[18px] leading-relaxed max-w-[420px]">
                    {t("Χρησιμοποιήστε τα δεδομένα σας για να κλειδώσετε την ιδανική τιμή χωρίς να επαναλαμβάνετε την υποβολή πληροφοριών.", "Leverage your stored policy data to instantly lock in customized rates without repeatedly submitting paperwork.")}
                  </p>
                  <Link href="/product" className="inline-flex items-center gap-1.5 mt-8 text-white font-medium text-[15px] hover:underline decoration-1 underline-offset-4">
                    {t("Μάθετε περισσότερα", "Learn more")} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="flex-1 w-full bg-[#222425] border border-white/5 rounded-[8px] p-6 lg:p-8">
                  <div className="space-y-4">
                    <div className="p-4 bg-[#1A1C1D] rounded border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-sm">✓</div>
                        <span className="text-sm">Scan & extract data</span>
                      </div>
                      <span className="text-xs text-[#A0A0A0]">Complete</span>
                    </div>
                    <div className="p-4 bg-[#1A1C1D] rounded border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-sm">✓</div>
                        <span className="text-sm">Compare market rates</span>
                      </div>
                      <span className="text-xs text-[#A0A0A0]">Complete</span>
                    </div>
                    <div className="p-4 bg-white rounded border border-white flex items-center justify-between shadow-lg text-[#1A1C1D]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#1A1C1D] text-sm font-bold">➜</div>
                        <span className="text-sm font-medium">Auto-renew policy</span>
                      </div>
                      <span className="text-xs">Pending approval</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 COLUMNS ABSTRACT ICONS */}
        <section className="px-6 lg:px-12 py-24 bg-white">
          <div className="mx-auto max-w-[1240px]">
            <h2 className="text-[36px] lg:text-[44px] font-medium tracking-[-0.03em] mb-16 max-w-2xl leading-[1.1] text-[#1A1A1A]">
              {t("Enterprise-grade ασφάλεια και υποστήριξη για όλους", "Enterprise-grade security and support comes standard")}
            </h2>

            <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
              {/* Feature 1 */}
              <div className="flex flex-col">
                <div className="h-32 w-32 relative mb-6">
                  <div className="absolute inset-0 bg-[#F5F5F5] rounded-[8px]"></div>
                  <div className="absolute bottom-4 left-4 w-12 h-12 bg-[#D7E4ED] rounded-[4px]"></div>
                  <div className="absolute top-8 right-8 w-16 h-8 bg-[#1A1C1D] rounded-[4px]"></div>
                  <div className="absolute bottom-8 right-12 w-4 h-16 bg-[#64748B] rounded-[2px]"></div>
                </div>
                <h4 className="text-[20px] font-medium mb-3 tracking-[-0.01em] text-[#1A1A1A]">{t("Κρυπτογράφηση συμφωνα με τα πρότυπα της Ε.Ε.", "Bank-level security")}</h4>
                <p className="text-[#707070] text-[16px] leading-[1.6]">
                  {t("Κάθε αρχείο προστατεύεται με αλγόριθμο 256-bit AES σε transit και at rest.", "SOC 2 Type II certified. Files are protected with 256-bit AES encryption in transit and at rest.")}
                </p>
              </div>

              {/* Feature 2 */}
              <div className="flex flex-col">
                <div className="h-32 w-32 relative mb-6">
                  <div className="absolute inset-0 bg-[#F5F5F5] rounded-[8px]"></div>
                  <div className="absolute top-6 left-6 w-14 h-14 border-[3px] border-[#1A1C1D] rounded-[4px]"></div>
                  <div className="absolute bottom-6 right-6 w-14 h-14 bg-[#DCEBDA] rounded-[4px]"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-[#64748B] rounded-[2px]"></div>
                </div>
                <h4 className="text-[20px] font-medium mb-3 tracking-[-0.01em] text-[#1A1A1A]">{t("Διαχείρηση Δεδομένων & GDPR", "Data autonomy")}</h4>
                <p className="text-[#707070] text-[16px] leading-[1.6]">
                  {t("Εσείς ελέγχετε με ποιον μοιράζεστε τα δεδομένα σας. Διαγράψτε δεδομένα και προσβάσεις με ενα κλικ.", "You control who you share your data with. Revoke agent access instantly, at any time.")}
                </p>
              </div>

              {/* Feature 3 */}
              <div className="flex flex-col">
                <div className="h-32 w-32 relative mb-6">
                  <div className="absolute inset-0 bg-[#F5F5F5] rounded-[8px]"></div>
                  <div className="absolute top-0 right-0 w-0 h-0 border-[64px] border-transparent border-t-[#EBE5D9] border-r-[#EBE5D9] rounded-tr-[8px]"></div>
                  <div className="absolute bottom-4 left-4 w-16 h-16 bg-[#1A1C1D] rounded-tl-[16px] rounded-br-[4px] rounded-bl-[4px] rounded-tr-[4px]"></div>
                </div>
                <h4 className="text-[20px] font-medium mb-3 tracking-[-0.01em] text-[#1A1A1A]">{t("Βοήθεια Όταν Τη Χρειάζεστε", "Support on demand")}</h4>
                <p className="text-[#707070] text-[16px] leading-[1.6]">
                  {t("Η ομάδα μας είναι διαθέσιμη για να σας βοηθήσει με κάθε βήμα.", "Our dedicated support team is standing by to help you with every step via live chat.")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIAL & FINAL CTA */}
        <section className="bg-[#1A1C1D] text-white">
          <div className="mx-auto max-w-[1400px] grid lg:grid-cols-2">
            {/* Left - Large Portrait */}
            <div className="relative h-[400px] lg:h-auto w-full lg:order-last border-b lg:border-b-0 lg:border-l border-white/10">
              <Image
                src="/images/testimonial_portrait_1771963947699.png"
                alt="Client Testimony"
                fill
                className="object-cover"
              />
            </div>
            {/* Right - Content & CTA */}
            <div className="p-10 lg:p-24 flex flex-col justify-center">
              <blockquote className="text-[28px] lg:text-[36px] font-medium tracking-[-0.02em] leading-[1.2] mb-12 text-white max-w-xl">
                "PolicyWallet shifts the paradigm of personal insurance. It provides the transparency and tools adults actually need to protect their wealth securely."
              </blockquote>
              <div className="mb-24 flex items-center gap-4">
                <div>
                  <div className="text-[14px] font-medium text-white mb-0.5">Alexandros K.</div>
                  <div className="text-[14px] text-[#A0A0A0]">Premium Insurance Client</div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-16">
                <h2 className="text-[36px] lg:text-[48px] font-medium tracking-[-0.03em] leading-[1.1] mb-8 text-white max-w-md">
                  {t("Ξεκινήστε τώρα.", "Start optimizing your coverage.")}
                </h2>
                <div>
                  <Link
                    href="/auth/signup"
                    className="inline-flex rounded-[4px] bg-[#89D9B2] px-6 py-3 text-[16px] font-bold text-[#1A1A1A] transition-opacity hover:opacity-90"
                  >
                    {t("Ξεκινήστε", "Get started")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-white py-16 px-6 lg:px-12 border-t border-[#F0F0F0]">
        <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center text-[20px] font-bold tracking-tight mb-4">
              <span className="text-[#1A1A1A]">Policy</span><span className="text-[#64748B]">Wallet</span>
            </Link>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#1A1A1A] mb-4">{t("Προϊόντα", "Products")}</p>
            <ul className="space-y-3 text-[14px] text-[#707070]">
              <li><Link href="#products" className="hover:text-[#1A1A1A] transition-colors">{t("Διαχείριση", "Storage")}</Link></li>
              <li><Link href="#solutions" className="hover:text-[#1A1A1A] transition-colors">{t("AI Insights", "AI Insights")}</Link></li>
              <li><Link href="#products" className="hover:text-[#1A1A1A] transition-colors">{t("Συνεργασία", "Network")}</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#1A1A1A] mb-4">{t("Εταιρεία", "Company")}</p>
            <ul className="space-y-3 text-[14px] text-[#707070]">
              <li><Link href="/company" className="hover:text-[#1A1A1A] transition-colors">{t("Σχετικά", "About")}</Link></li>
              <li><Link href="/privacy" className="hover:text-[#1A1A1A] transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-[#1A1A1A] transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#1A1A1A] mb-4">{t("Λογαριασμός", "Account")}</p>
            <ul className="space-y-3 text-[14px] text-[#707070]">
              <li><Link href="/auth/signin" className="hover:text-[#1A1A1A] transition-colors">Log in</Link></li>
              <li><Link href="/auth/signup" className="hover:text-[#1A1A1A] transition-colors">Get started</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  )
}
