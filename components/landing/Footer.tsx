"use client"

import Link from "next/link"
import { Shield } from "lucide-react"

interface FooterProps {
    t: {
        tagline: string
        rights: string
        products: string
        forUsers: string
        forAgents: string
        company: string
        about: string
        careers: string
        blog: string
        legal: string
        privacy: string
        terms: string
    }
    language: 'el' | 'en'
}

export function Footer({ t, language }: FooterProps) {
    return (
        <footer className="bg-slate-900 text-slate-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Main Footer Content */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    {/* Brand */}
                    <div className="md:col-span-1">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <Shield className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">PolicyWallet</span>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            {t.tagline}
                        </p>
                    </div>

                    {/* Products */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">{t.products}</h4>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/wallet" className="text-sm hover:text-white transition-colors">
                                    {t.forUsers}
                                </Link>
                            </li>
                            <li>
                                <Link href="/agent" className="text-sm hover:text-white transition-colors">
                                    {t.forAgents}
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">{t.company}</h4>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/about" className="text-sm hover:text-white transition-colors">
                                    {t.about}
                                </Link>
                            </li>
                            <li>
                                <Link href="/careers" className="text-sm hover:text-white transition-colors">
                                    {t.careers}
                                </Link>
                            </li>
                            <li>
                                <Link href="/blog" className="text-sm hover:text-white transition-colors">
                                    {t.blog}
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="text-white font-semibold mb-4">{t.legal}</h4>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/privacy" className="text-sm hover:text-white transition-colors">
                                    {t.privacy}
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms" className="text-sm hover:text-white transition-colors">
                                    {t.terms}
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-slate-800">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        {/* Copyright */}
                        <p className="text-sm text-slate-400">
                            {t.rights}
                        </p>

                        {/* Social Links */}
                        <div className="flex items-center gap-4">
                            <a
                                href="https://linkedin.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors"
                                aria-label="LinkedIn"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                                </svg>
                            </a>

                            <a
                                href="https://twitter.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors"
                                aria-label="Twitter"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                                </svg>
                            </a>

                            <a
                                href="https://facebook.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors"
                                aria-label="Facebook"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
