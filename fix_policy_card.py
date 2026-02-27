import sys

path = r'c:\Users\admin\Documents\GitHub\PolicyWalletPlatform\New folder\product-plan\policy-wallet\components\wallet\PolicyCard.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('bg-white/70 dark:bg-stone-800/70 backdrop-blur-xl border border-stone-200/60 dark:border-stone-700/60 rounded-[2rem] p-6 lg:p-7 shadow-sm hover:shadow-2xl hover:shadow-teal-500/10 dark:hover:shadow-teal-400/5 hover:-translate-y-1.5 transition-all duration-500 cursor-pointer overflow-hidden active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-emerald-500', 'bg-[#FFFFFF] dark:bg-[#111111] border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 lg:p-7 shadow-[0_2px_12px_rgb(0,0,0,0.02)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden arc-card outline-none focus-visible:ring-2 focus-visible:ring-[#1FDC86]')

overlay_str = '<div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-white/5 pointer-events-none" />\n\n            {/* Spotlight effect on hover */}\n            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[radial-gradient(circle_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(20,184,166,0.06),transparent_70%)] transition-opacity duration-700 pointer-events-none" />\n\n            '

content = content.replace(overlay_str, '')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
