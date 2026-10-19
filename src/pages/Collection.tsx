import { Lock, Plane } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Stamp } from '../components/Stamp'
import { TripModal } from '../components/StampModal'
import { Flag } from '../components/ui'
import { CONTINENTS } from '../data/continents'
import type { ContinentId, TripRecord } from '../data/types'
import { useTrips } from '../hooks/useStores'
import { navigate } from '../hooks/useRoute'
import { getDestinationPool } from '../lib/destinations'
import { requestLaunch } from '../lib/launch'
import { computeStats } from '../lib/stats'

/** COLLECT — every country in the curated pool, stamped or still locked */
export default function Collection() {
  const trips = useTrips()
  const stats = useMemo(() => computeStats(trips), [trips])
  const [filter, setFilter] = useState<ContinentId | 'all'>('all')
  const [selected, setSelected] = useState<TripRecord | null>(null)

  const countries = useMemo(() => {
    const map = new Map<string, { countryCode: string; countryKo: string; country: string; continent: ContinentId; cities: string[] }>()
    getDestinationPool().forEach((d) => {
      const c = map.get(d.countryCode)
      if (c) c.cities.push(d.cityKo)
      else map.set(d.countryCode, { countryCode: d.countryCode, countryKo: d.countryKo, country: d.country, continent: d.continent, cities: [d.cityKo] })
    })
    return [...map.values()].sort((a, b) => a.countryKo.localeCompare(b.countryKo, 'ko'))
  }, [])

  const stampByCountry = useMemo(() => new Map(stats.countryStamps.map((t) => [t.countryCode, t])), [stats])
  const visible = countries.filter((c) => filter === 'all' || c.continent === filter)
  const collected = countries.filter((c) => stampByCountry.has(c.countryCode)).length
  const pct = Math.round((collected / Math.max(countries.length, 1)) * 100)

  return (
    <div className="mx-auto max-w-[1280px] px-5 pb-20 pt-8 md:px-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="eyebrow !text-primary">COLLECT</div>
          <h1 className="mt-1 text-[28px] font-semibold md:text-[34px]">입국 도장 컬렉션</h1>
          <p className="mt-1 text-mute">아직 열리지 않은 칸은 랜덤 여행으로만 채울 수 있어요.</p>
        </div>
        <div className="glass w-full max-w-[340px] px-5 py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-mute">수집 진행도</span>
            <span className="font-mono text-[22px] font-semibold">
              {collected}
              <span className="text-[14px] text-dim"> / {countries.length}개국</span>
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-light">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-cyan shadow-[0_0_10px_rgba(120,215,255,0.7)] transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </header>

      <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="대륙 필터">
        {(['all', ...Object.keys(CONTINENTS)] as (ContinentId | 'all')[]).map((k) => {
          const on = filter === k
          const count = k === 'all' ? countries.length : countries.filter((c) => c.continent === k).length
          if (count === 0) return null
          return (
            <button
              key={k}
              role="tab"
              aria-selected={on}
              onClick={() => setFilter(k)}
              className={`rounded-full border px-4 py-1.5 text-[13px] transition ${on ? 'nav-pill-active' : 'border-line text-mute hover:text-ink'}`}
            >
              {k === 'all' ? '전체' : CONTINENTS[k].ko} <span className="ml-1 font-mono text-[11px] text-dim">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {visible.map((c) => {
          const t = stampByCountry.get(c.countryCode)
          return t ? (
            <button key={c.countryCode} onClick={() => setSelected(t)} className="paper group flex flex-col items-center rounded-xl p-3 text-[#1d2a3c] transition hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(50,157,255,0.6)]">
              <Stamp trip={t} id={`cc-${t.tripId}`} size={150} className="h-auto w-[86%]" />
              <div className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold">
                <Flag code={c.countryCode} className="h-3 w-4.5" /> {c.countryKo}
              </div>
              <div className="text-[11px] text-[#6a7a90]">{t.cityKo}</div>
            </button>
          ) : (
            <div key={c.countryCode} className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line/80 bg-surface/40 p-3 text-center" aria-label={`${c.countryKo} — 아직 미발견`}>
              <div className="flex aspect-square w-[70%] items-center justify-center rounded-full border border-line/60 text-dim">
                <Lock className="h-6 w-6" />
              </div>
              <div className="mt-3 text-[13px] font-medium text-mute">???</div>
              <div className="text-[11px] text-dim">{CONTINENTS[c.continent].ko} · 미발견</div>
            </div>
          )
        })}
      </div>

      {collected < countries.length && (
        <div className="mt-12 flex justify-center">
          <button
            className="btn-primary"
            onClick={() => {
              requestLaunch()
              navigate('/')
            }}
          >
            <Plane className="h-5 w-5 -rotate-45" /> 다음 도장 받으러 가기
          </button>
        </div>
      )}

      <TripModal trip={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
