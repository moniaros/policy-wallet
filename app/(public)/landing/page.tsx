"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
    Shield, Sparkles, TrendingDown, Brain, Lock, Users,
    FileText, Smartphone, CheckCircle, ArrowRight, Star,
    Zap, Globe, Award, ChevronDown
} from "lucide-react"
import Link from "next/link"
import { HeroSection, StatsBar } from "@/components/landing/HeroSection"
import { ValueSection } from "@/components/landing/ValueSection"
import { AISection } from "@/components/landing/AISection"
import { HowItWorksSection } from "@/components/landing/HowItWorksSection"
import { TestimonialsSection } from "@/components/landing/TestimonialsSection"
import { CTASection } from "@/components/landing/CTASection"
import { Footer } from "@/components/landing/Footer"
import { ScrollToTop } from "@/components/landing/ScrollToTop"

type Language = 'el' | 'en'

const translations = {
    el: {
        // Hero Section
        hero: {
            badge: "🇬🇷 Ελληνική Εφαρμογή #1 για Ασφάλειες",
            title: "Όλα τα Ασφαλιστήριά σας",
            titleHighlight: "σε Ένα Μέρος",
            subtitle: "Με τη δύναμη της τεχνητής νοημοσύνης, ανακαλύψτε κενά κάλυψης, εξοικονομήστε χρήματα και προστατέψτε καλύτερα ό,τι αγαπάτε.",
            ctaPrimary: "Ξεκινήστε Δωρεάν",
            ctaSecondary: "Δείτε Demo",
            trustedBy: "Εμπιστεύονται πάνω από 5,000+ Έλληνες",
            stats: {
                policies: "10,000+ Ασφαλιστήρια",
                savings: "€2.5M Εξοικονομήσεις",
                users: "5,000+ Χρήστες"
            }
        },

        // Value Propositions
        values: {
            title: "Γιατί το PolicyWallet;",
            subtitle: "Η πλατφόρμα που αλλάζει τον τρόπο διαχείρισης των ασφαλειών σας",

            forPolicyholders: {
                title: "Για Ασφαλισμένους",
                subtitle: "Τέλος στα χαμένα ασφαλιστήρια και τις πολλαπλές εφαρμογές",
                features: [
                    {
                        icon: "📱",
                        title: "Ένα Μέρος για Όλα",
                        description: "Δεν χρειάζεται να κατεβάζετε 10 διαφορετικές εφαρμογές από κάθε ασφαλιστική. Όλα τα ασφαλιστήρια σας σε μία εφαρμογή."
                    },
                    {
                        icon: "🤖",
                        title: "AI που σας Προστατεύει",
                        description: "Η τεχνητή νοημοσύνη αναλύει αυτόματα τα ασφαλιστήριά σας και εντοπίζει κενά κάλυψης πριν τα χρειαστείτε."
                    },
                    {
                        icon: "💰",
                        title: "Εξοικονόμηση Χρημάτων",
                        description: "Ανακαλύψτε περιττές καλύψεις και λάβετε προσωποποιημένες προτάσεις για να πληρώνετε λιγότερα."
                    },
                    {
                        icon: "🔒",
                        title: "100% Ασφαλής",
                        description: "Κρυπτογράφηση τραπεζικού επιπέδου. Τα δεδομένα σας είναι πάντα ασφαλή και ιδιωτικά."
                    }
                ]
            },

            forAgents: {
                title: "Για Ασφαλιστές",
                subtitle: "Αυξήστε την παραγωγικότητα και την ικανοποίηση πελατών",
                features: [
                    {
                        icon: "⚡",
                        title: "Γρηγορότερη Εξυπηρέτηση",
                        description: "Δείτε όλα τα ασφαλιστήρια των πελατών σας σε ένα dashboard. Προσφέρετε συμβουλές σε δευτερόλεπτα, όχι ώρες."
                    },
                    {
                        icon: "🎯",
                        title: "Έξυπνες Ευκαιρίες",
                        description: "Το AI εντοπίζει αυτόματα ευκαιρίες cross-selling και upselling με βάση πραγματικά κενά κάλυψης."
                    },
                    {
                        icon: "📊",
                        title: "Αξιόπιστη Συμβουλευτική",
                        description: "Αναλύσεις με AI που βασίζονται σε χιλιάδες ασφαλιστήρια. Δώστε συμβουλές με εμπιστοσύνη."
                    },
                    {
                        icon: "🤝",
                        title: "Καλύτερες Σχέσεις",
                        description: "Οι πελάτες βλέπουν την αξία σας άμεσα. Χτίστε εμπιστοσύνη με διαφάνεια και εξυπνάδα."
                    }
                ]
            }
        },

        // AI Features
        ai: {
            badge: "Τεχνητή Νοημοσύνη",
            title: "Η Δύναμη του AI",
            titleHighlight: "στην Υπηρεσία σας",
            subtitle: "Προηγμένη τεχνολογία που καταλαβαίνει τα ασφαλιστήριά σας καλύτερα από οποιονδήποτε άνθρωπο",

            features: [
                {
                    title: "Καλύτερη Κατανόηση",
                    description: "Το AI διαβάζει και κατανοεί αυτόματα κάθε ασφαλιστήριο - ακόμα και τα πιο περίπλοκα. Απλές εξηγήσεις για κάθε όρο.",
                    icon: Brain,
                    color: "from-purple-500 to-purple-600"
                },
                {
                    title: "Καλύτερη Χρήση",
                    description: "Μάθετε πώς να χρησιμοποιήσετε σωστά τις καλύψεις σας. Ειδοποιήσεις για λήξεις, ανανεώσεις και αξιοποίηση επιδομάτων.",
                    icon: Zap,
                    color: "from-yellow-500 to-orange-500"
                },
                {
                    title: "Εξοικονόμηση Χρημάτων",
                    description: "Εντοπίστε διπλές καλύψεις, περιττά ασφάλειστρα και λάβετε προτάσεις για οικονομικότερες επιλογές.",
                    icon: TrendingDown,
                    color: "from-emerald-500 to-green-600"
                },
                {
                    title: "Αξιόπιστη Συμβουλευτική",
                    description: "Αναλύσεις που βασίζονται σε πραγματικά δεδομένα από χιλιάδες ασφαλιστήρια. Προτάσεις που μπορείτε να εμπιστευτείτε.",
                    icon: Award,
                    color: "from-blue-500 to-indigo-600"
                },
                {
                    title: "Ασφάλεια Πληροφοριών",
                    description: "Κρυπτογράφηση 256-bit, compliance με GDPR, και zero-knowledge architecture. Τα δεδομένα σας είναι ΜΟΝΟ δικά σας.",
                    icon: Lock,
                    color: "from-red-500 to-pink-600"
                }
            ]
        },

        // How It Works
        howItWorks: {
            title: "Πώς Λειτουργεί",
            subtitle: "Τρία απλά βήματα για να προστατεύσετε καλύτερα ό,τι αγαπάτε",
            steps: [
                {
                    number: "01",
                    title: "Ανεβάστε τα Ασφαλιστήριά σας",
                    description: "Φωτογραφήστε ή ανεβάστε PDF. Το AI αναλύει αυτόματα τα πάντα.",
                    icon: FileText
                },
                {
                    number: "02",
                    title: "Λάβετε Ανάλυση AI",
                    description: "Σε δευτερόλεπτα, δείτε κενά κάλυψης, προτάσεις και εξοικονομήσεις.",
                    icon: Sparkles
                },
                {
                    number: "03",
                    title: "Δράστε με Εμπιστοσύνη",
                    description: "Συνδεθείτε με agent ή διαχειριστείτε μόνοι σας. Η επιλογή είναι δική σας.",
                    icon: CheckCircle
                }
            ]
        },

        // Social Proof
        testimonials: {
            title: "Τι Λένε οι Χρήστες μας",
            subtitle: "Πάνω από 5,000 Έλληνες εμπιστεύονται ήδη το PolicyWallet",
            items: [
                {
                    name: "Μαρία Παπαδοπούλου",
                    role: "Ιδιοκτήτρια Επιχείρησης, Αθήνα",
                    avatar: "MP",
                    rating: 5,
                    text: "Ανακάλυψα ότι πλήρωνα διπλή κάλυψη για το αυτοκίνητό μου! Εξοικονόμησα €450 τον χρόνο. Το PolicyWallet πληρώθηκε μόνο του."
                },
                {
                    name: "Νίκος Γεωργίου",
                    role: "Ασφαλιστής, Θεσσαλονίκη",
                    avatar: "ΝΓ",
                    rating: 5,
                    text: "Ως agent, το PolicyWallet μου δίνει υπερδύναμη. Βλέπω αμέσως τι χρειάζονται οι πελάτες μου και τους εξυπηρετώ 10x πιο γρήγορα."
                },
                {
                    name: "Ελένη Κωνσταντίνου",
                    role: "Μητέρα 3 Παιδιών, Πάτρα",
                    avatar: "ΕΚ",
                    rating: 5,
                    text: "Δεν καταλάβαινα τίποτα από ζωής και υγείας. Το AI μου τα εξήγησε όλα απλά και μου έδειξε που έχω κενά. Αισθάνομαι πιο ασφαλής τώρα."
                }
            ]
        },

        // CTA Section
        cta: {
            title: "Προστατέψτε το Μέλλον σας",
            titleHighlight: "Σήμερα",
            subtitle: "Εγγραφείτε δωρεάν και ανακαλύψτε τι χάνετε σε λιγότερο από 2 λεπτά",
            ctaPrimary: "Ξεκινήστε Τώρα - Δωρεάν",
            ctaSecondary: "Μιλήστε με Agent",
            features: [
                "✓ Δωρεάν για πάντα για ατομικούς χρήστες",
                "✓ Χωρίς πιστωτική κάρτα",
                "✓ Ανάλυση AI σε όλα τα ασφαλιστήρια",
                "✓ 100% ασφαλές και ιδιωτικό"
            ]
        },

        // Footer
        footer: {
            tagline: "PolicyWallet - Η #1 Ελληνική Πλατφόρμα Διαχείρισης Ασφαλειών",
            rights: "© 2026 PolicyWallet. Με την επιφύλαξη παντός δικαιώματος.",
            products: "Προϊόντα",
            forUsers: "Για Χρήστες",
            forAgents: "Για Ασφαλιστές",
            company: "Εταιρεία",
            about: "Σχετικά",
            careers: "Καριέρες",
            blog: "Blog",
            legal: "Νομικά",
            privacy: "Απόρρητο",
            terms: "Όροι"
        }
    },

    en: {
        // Hero Section
        hero: {
            badge: "🌍 Greece's #1 Insurance Management App",
            title: "All Your Insurance Policies",
            titleHighlight: "in One Place",
            subtitle: "Powered by AI, discover coverage gaps, save money, and protect what you love better.",
            ctaPrimary: "Start Free",
            ctaSecondary: "Watch Demo",
            trustedBy: "Trusted by 5,000+ Greeks",
            stats: {
                policies: "10,000+ Policies",
                savings: "€2.5M Savings",
                users: "5,000+ Users"
            }
        },

        // Value Propositions
        values: {
            title: "Why PolicyWallet?",
            subtitle: "The platform changing how you manage insurance",

            forPolicyholders: {
                title: "For Policyholders",
                subtitle: "No more lost policies or multiple apps",
                features: [
                    {
                        icon: "📱",
                        title: "One Place for Everything",
                        description: "No need to download 10 different apps from each insurer. All your policies in one app."
                    },
                    {
                        icon: "🤖",
                        title: "AI that Protects You",
                        description: "AI automatically analyzes your policies and finds coverage gaps before you need them."
                    },
                    {
                        icon: "💰",
                        title: "Save Money",
                        description: "Discover unnecessary coverage and get personalized recommendations to pay less."
                    },
                    {
                        icon: "🔒",
                        title: "100% Secure",
                        description: "Bank-level encryption. Your data is always safe and private."
                    }
                ]
            },

            forAgents: {
                title: "For Agents",
                subtitle: "Increase productivity and customer satisfaction",
                features: [
                    {
                        icon: "⚡",
                        title: "Faster Service",
                        description: "See all your client's policies in one dashboard. Provide advice in seconds, not hours."
                    },
                    {
                        icon: "🎯",
                        title: "Smart Opportunities",
                        description: "AI automatically finds cross-selling and upselling opportunities based on real coverage gaps."
                    },
                    {
                        icon: "📊",
                        title: "Trusted Advisory",
                        description: "AI analysis based on thousands of policies. Give advice with confidence."
                    },
                    {
                        icon: "🤝",
                        title: "Better Relationships",
                        description: "Clients see your value immediately. Build trust through transparency and intelligence."
                    }
                ]
            }
        },

        // AI Features
        ai: {
            badge: "Artificial Intelligence",
            title: "The Power of AI",
            titleHighlight: "at Your Service",
            subtitle: "Advanced technology that understands your policies better than any human",

            features: [
                {
                    title: "Better Understanding",
                    description: "AI reads and understands every policy automatically - even the most complex ones. Simple explanations for every term.",
                    icon: Brain,
                    color: "from-purple-500 to-purple-600"
                },
                {
                    title: "Better Usage",
                    description: "Learn how to use your coverage properly. Alerts for expiry, renewals, and benefit utilization.",
                    icon: Zap,
                    color: "from-yellow-500 to-orange-500"
                },
                {
                    title: "Save Money",
                    description: "Find duplicate coverage, unnecessary premiums, and get suggestions for more economical options.",
                    icon: TrendingDown,
                    color: "from-emerald-500 to-green-600"
                },
                {
                    title: "Trusted Advisory",
                    description: "Analysis based on real data from thousands of policies. Recommendations you can trust.",
                    icon: Award,
                    color: "from-blue-500 to-indigo-600"
                },
                {
                    title: "Information Security",
                    description: "256-bit encryption, GDPR compliance, and zero-knowledge architecture. Your data is ONLY yours.",
                    icon: Lock,
                    color: "from-red-500 to-pink-600"
                }
            ]
        },

        // How It Works
        howItWorks: {
            title: "How It Works",
            subtitle: "Three simple steps to better protect what you love",
            steps: [
                {
                    number: "01",
                    title: "Upload Your Policies",
                    description: "Take a photo or upload PDF. AI analyzes everything automatically.",
                    icon: FileText
                },
                {
                    number: "02",
                    title: "Get AI Analysis",
                    description: "In seconds, see coverage gaps, recommendations, and savings.",
                    icon: Sparkles
                },
                {
                    number: "03",
                    title: "Act with Confidence",
                    description: "Connect with an agent or manage yourself. The choice is yours.",
                    icon: CheckCircle
                }
            ]
        },

        // Social Proof
        testimonials: {
            title: "What Our Users Say",
            subtitle: "Over 5,000 Greeks already trust PolicyWallet",
            items: [
                {
                    name: "Maria Papadopoulou",
                    role: "Business Owner, Athens",
                    avatar: "MP",
                    rating: 5,
                    text: "I discovered I was paying for double car coverage! Saved €450 per year. PolicyWallet paid for itself."
                },
                {
                    name: "Nikos Georgiou",
                    role: "Insurance Agent, Thessaloniki",
                    avatar: "NG",
                    rating: 5,
                    text: "As an agent, PolicyWallet gives me superpowers. I instantly see what my clients need and serve them 10x faster."
                },
                {
                    name: "Eleni Konstantinou",
                    role: "Mother of 3, Patras",
                    avatar: "EK",
                    rating: 5,
                    text: "I didn't understand anything about life and health insurance. AI explained everything simply and showed me my gaps. I feel safer now."
                }
            ]
        },

        // CTA Section
        cta: {
            title: "Protect Your Future",
            titleHighlight: "Today",
            subtitle: "Sign up free and discover what you're missing in less than 2 minutes",
            ctaPrimary: "Start Now - Free",
            ctaSecondary: "Talk to Agent",
            features: [
                "✓ Free forever for individuals",
                "✓ No credit card required",
                "✓ AI analysis on all policies",
                "✓ 100% secure and private"
            ]
        },

        // Footer
        footer: {
            tagline: "PolicyWallet - Greece's #1 Insurance Management Platform",
            rights: "© 2026 PolicyWallet. All rights reserved.",
            products: "Products",
            forUsers: "For Users",
            forAgents: "For Agents",
            company: "Company",
            about: "About",
            careers: "Careers",
            blog: "Blog",
            legal: "Legal",
            privacy: "Privacy",
            terms: "Terms"
        }
    }
}

export default function LandingPage() {
    const [language, setLanguage] = useState<Language>('el')
    const t = translations[language]

    return (
        <div className="min-h-screen bg-white">
            {/* Language Toggle - Fixed Top Right */}
            <div className="fixed top-6 right-6 z-50">
                <div className="bg-white/90 backdrop-blur-xl border border-slate-200 rounded-full p-1 shadow-lg flex gap-1">
                    <button
                        onClick={() => setLanguage('el')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${language === 'el'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        🇬🇷 ΕΛ
                    </button>
                    <button
                        onClick={() => setLanguage('en')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${language === 'en'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        🇬🇧 EN
                    </button>
                </div>
            </div>

            {/* Hero Section */}
            <HeroSection t={t.hero} />

            {/* Stats Bar */}
            <StatsBar t={t.hero.stats} />

            {/* Value Propositions */}
            <ValueSection t={t.values} />

            {/* AI Features */}
            <AISection t={t.ai} />

            {/* How It Works */}
            <HowItWorksSection t={t.howItWorks} />

            {/* Testimonials */}
            <TestimonialsSection t={t.testimonials} />

            {/* Final CTA */}
            <CTASection t={t.cta} />

            {/* Footer */}
            <Footer t={t.footer} language={language} />

            {/* Scroll to Top Button */}
            <ScrollToTop />
        </div>
    )
}

// ... (Components will continue in next file due to length)
