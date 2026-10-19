import { AnimatePresence, motion } from 'motion/react'
import { BarChart3, BookOpen, Compass, Globe2, Menu, Settings, Stamp as StampIcon, UserCircle2, X } from 'lucide-react'
import { useState } from 'react'
import type { Route } from '../hooks/useRoute'
import { Logo } from './ui'

const PRIMARY = [
  { href: '#/', en: 'EXPLORE', ko: '탐험', match: ['home'], icon: Globe2 },
  { href: '#/destination', en: 'DISCOVER', ko: '발견', match: ['destination'], icon: Compass },
  { href: '#/collection', en: 'COLLECT', ko: '수집', match: ['collection'], icon: StampIcon },
] as const

const SECONDARY = [
  { href: '#/passport', label: '디지털 여권', en: 'PASSPORT', match: 'passport', icon: BookOpen },
  { href: '#/stats', label: '여행 기록 & 통계', en: 'TRAVEL LOG', match: 'stats', icon: BarChart3 },
] as const

export function TopNav({ route, overlay = false }: { route: Route; overlay?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <header
      className={`z-50 w-full ${overlay ? 'absolute left-0 top-0' : 'sticky top-0 border-b border-line/60 bg-bg/80 backdrop-blur-xl'}`}
    >
      <div className="mx-auto flex h-[68px] max-w-[1600px] items-center justify-between gap-6 px-5 md:px-8">
        <a href="#/" className="shrink-0" aria-label="RANDOM PASSPORT 홈">
          <Logo className="h-[30px] w-auto md:h-[34px]" />
        </a>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="주요 메뉴">
          {PRIMARY.map((item, i) => {
            const active = (item.match as readonly string[]).includes(route.name)
            return (
              <div key={item.en} className="flex items-center">
                {i > 0 && <span className="mx-1 text-dim">·</span>}
                <a
                  href={item.href}
                  className={`group relative rounded-full border border-transparent px-3 py-1.5 font-display text-[11px] tracking-[0.26em] transition ${
                    active ? 'nav-pill-active' : 'text-mute hover:text-ink'
                  }`}
                  aria-current={active ? 'page' : undefined}
                  title={item.ko}
                >
                  {item.en}
                </a>
              </div>
            )
          })}
          <span className="mx-3 h-4 w-px bg-line" />
          {SECONDARY.map((item) => {
            const active = route.name === item.match
            return (
              <a
                key={item.href}
                href={item.href}
                className={`ml-1 rounded-lg border px-3.5 py-1.5 text-[13px] font-medium transition ${
                  active ? 'nav-pill-active' : 'border-line/70 text-mute hover:border-primary/60 hover:text-ink'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </a>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="#/settings"
            className={`hidden rounded-full p-1.5 transition lg:inline-flex ${route.name === 'settings' ? 'text-cyan' : 'text-mute hover:text-ink'}`}
            aria-label="설정"
            title="설정"
          >
            <UserCircle2 className="h-6 w-6" strokeWidth={1.5} />
          </a>
          <button className="rounded-full p-1.5 text-mute transition hover:text-ink lg:hidden" onClick={() => setOpen(true)} aria-label="메뉴 열기">
            <Menu className="h-6 w-6" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[90] bg-[#020812]/70 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
            <motion.nav
              className="glass absolute right-3 top-3 w-[min(320px,calc(100vw-24px))] p-4"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              aria-label="모바일 메뉴"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="eyebrow">MENU</span>
                <button onClick={() => setOpen(false)} className="rounded-full p-1.5 text-mute hover:text-ink" aria-label="메뉴 닫기">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {[...PRIMARY.map((p) => ({ href: p.href, label: p.ko, en: p.en, icon: p.icon, active: (p.match as readonly string[]).includes(route.name) })),
                ...SECONDARY.map((s) => ({ href: s.href, label: s.label, en: s.en, icon: s.icon, active: route.name === s.match })),
                { href: '#/settings', label: '설정', en: 'SETTINGS', icon: Settings, active: route.name === 'settings' }].map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`mb-1 flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition ${l.active ? 'nav-pill-active' : 'text-mute hover:bg-surface-light/60 hover:text-ink'}`}
                >
                  <l.icon className="h-4.5 w-4.5" />
                  <span className="flex-1 text-[15px]">{l.label}</span>
                  <span className="font-display text-[10px] tracking-[0.2em] text-dim">{l.en}</span>
                </a>
              ))}
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
