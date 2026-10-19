import { motion } from 'motion/react'
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Compass,
  Globe2,
  Home as HomeIcon,
  Layers,
  ListOrdered,
  MapPin,
  Plane,
  Settings as SettingsIcon,
  Shuffle,
  Stamp as StampIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PassportCover } from '../components/PassportCover'
import { Stamp } from '../components/Stamp'
import { TripModal } from '../components/StampModal'
import { Flag, MiniEarth, SmartImage } from '../components/ui'
import { CONTINENT_COUNT } from '../data/continents'
import type { TripRecord } from '../data/types'
import { useTrips } from '../hooks/useStores'
import { navigate } from '../hooks/useRoute'
import { getDestinationById, totalCountriesInPool } from '../lib/destinations'
import { requestLaunch } from '../lib/launch'
import { computeStats, formatDate, sortByDateDesc } from '../lib/stats'

function launch() {
  requestLaunch()
  navigate('/')
}

export function Sidebar({ active }: { active: 'stats' | 'settings' }) {
  const items = [
    { label: '홈', icon: HomeIcon, onClick: () => navigate('/'), key: 'home' },
    { label: '랜덤 여행', icon: Shuffle, onClick: launch, key: 'random' },
    { label: '여행 기록 & 통계', icon: BarChart3, onClick: () => navigate('/stats'), key: 'stats' },
    { label: '디지털 여권', icon: BookOpen, onClick: () => navigate('/passport'), key: 'passport' },
    { label: '설정', icon: SettingsIcon, onClick: () => navigate('/settings'), key: 'settings' },
  ]
  return (
    <aside className="hidden w-[210px] shrink-0 lg:block">
      <nav className="glass sticky top-[88px] flex flex-col gap-1 p-3" aria-label="대시보드 메뉴">
        {items.map((it) => {
          const on = it.key === active
          return (
            <button
              key={it.key}
              onClick={it.onClick}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[14px] transition ${
                on ? 'bg-primary/25 text-white shadow-[0_0_20px_rgba(50,157,255,0.45),inset_0_0_0_1px_rgba(120,215,255,0.5)]' : 'text-mute hover:bg-surface-light/70 hover:text-ink'
              }`}
              aria-current={on ? 'page' : undefined}
            >
              <it.icon className="h-4.5 w-4.5" />
              {it.label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

export default function Stats() {
  const trips = useTrips()
  const stats = useMemo(() => computeStats(trips), [trips])
  const recent = useMemo(() => sortByDateDesc(trips), [trips])
  const [showAll, setShowAll] = useState(false)
  const [selected, setSelected] = useState<TripRecord | null>(null)
  const poolCountries = totalCountriesInPool()
  const empty = trips.length === 0

  const cards = [
    { icon: Globe2, label: '방문 국가 수', value: stats.countries, sub: `/ ${poolCountries}개국` },
    { icon: MapPin, label: '방문 도시 수', value: stats.cities, sub: '도시' },
    { icon: Layers, label: '방문한 대륙 수', value: stats.continents, sub: `/ ${CONTINENT_COUNT}` },
    { icon: StampIcon, label: '총 여행 기록 수', value: stats.trips, sub: '회' },
    { icon: CalendarDays, label: '첫 탐험 날짜', value: stats.firstDate ? formatDate(stats.firstDate) : '—', sub: '', small: true },
  ]

  return (
    <div className="mx-auto flex max-w-[1600px] gap-6 px-4 pb-20 pt-6 md:px-8">
      <Sidebar active="stats" />

      <div className="min-w-0 flex-1">
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          {/* MAIN */}
          <div className="min-w-0 space-y-6">
            {/* Banner */}
            <section className="glass relative overflow-hidden px-6 py-8 md:px-9 md:py-10">
              <MiniEarth className="pointer-events-none absolute -right-16 -top-24 h-[340px] w-[340px] opacity-90 md:right-6 md:h-[380px] md:w-[380px]" />
              <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/70 to-transparent" />
              <div className="relative">
                <div className="eyebrow !text-primary">TRAVEL LOG & STATS</div>
                <h1 className="mt-2 text-[28px] font-semibold md:text-[34px]">여행 기록 & 통계</h1>
                <p className="mt-2 text-mute">“지금까지의 여행이 당신만의 이야기가 됩니다.”</p>
              </div>
            </section>

            {/* Stat cards */}
            <section className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-5">
              {cards.map((c, i) => (
                <motion.div
                  key={c.label}
                  className="glass flex items-center gap-3.5 px-4 py-4"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface-light/60 text-cyan">
                    <c.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[12px] text-mute">{c.label}</div>
                    <div className="flex items-baseline gap-1">
                      <span className={`font-mono font-semibold text-ink ${c.small ? 'text-[17px]' : 'text-[26px] leading-tight'}`}>{c.value}</span>
                      {c.sub && <span className="text-[12px] text-dim">{c.sub}</span>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </section>

            {empty && (
              <section className="glass flex flex-col items-center gap-4 px-6 py-12 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface-light/60 text-cyan shadow-[0_0_30px_rgba(50,157,255,0.35)]">
                  <Compass className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-[20px] font-semibold">아직 여행 기록이 없어요</h2>
                  <p className="mt-1 text-mute">첫 랜덤 여행을 떠나면 방문 국가, 도시, 대륙 통계가 이곳에 쌓입니다.</p>
                </div>
                <button className="btn-primary" onClick={launch}>
                  <Plane className="h-5 w-5 -rotate-45" /> 첫 탐험 떠나기
                </button>
              </section>
            )}

            {/* Recent trips */}
            {!empty && (
              <section className="glass p-5 md:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-[16px] font-semibold">
                    <ListOrdered className="h-4.5 w-4.5 text-cyan" /> 최근 여행 기록
                  </h2>
                  {recent.length > 4 && (
                    <button className="text-[13px] text-cyan hover:underline" onClick={() => setShowAll((v) => !v)}>
                      {showAll ? '접기' : `더보기 (${recent.length})`} →
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                  {(showAll ? recent : recent.slice(0, 4)).map((t) => {
                    const d = getDestinationById(t.destinationId)
                    return (
                      <button
                        key={t.tripId}
                        onClick={() => setSelected(t)}
                        className="group overflow-hidden rounded-xl border border-line/70 bg-bg/40 text-left transition hover:-translate-y-1 hover:border-primary/60 hover:shadow-[0_0_24px_rgba(50,157,255,0.3)]"
                      >
                        <SmartImage wiki={d?.heroImage.wiki ?? t.city} alt={t.city} hue={d?.hue} width={500} className="aspect-[16/10] w-full" label={t.city} />
                        <div className="p-3.5">
                          <div className="flex items-center gap-2">
                            <Flag code={t.countryCode} className="h-3.5 w-5" />
                            <span className="truncate font-semibold">{t.cityKo}</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[12px] text-dim">
                            <span className="truncate">{t.countryKo} · <span className="font-mono text-mute">{t.iataCode}</span></span>
                            <span className="font-mono">{formatDate(t.visitedAt)}</span>
                          </div>
                          <p className="mt-2 line-clamp-1 text-[12px] italic text-mute">“{t.memo || d?.slogan || '메모 없음'}”</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Charts */}
            {!empty && (
              <section className="grid gap-6 lg:grid-cols-2">
                <div className="glass p-5 md:p-6">
                  <h2 className="text-[16px] font-semibold">대륙별 방문 국가 비율</h2>
                  <p className="text-[12px] text-dim">국가는 중복 없이 한 번만 집계됩니다.</p>
                  <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row">
                    <div className="relative h-[176px] w-[176px] shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={stats.byContinent} dataKey="value" nameKey="name" innerRadius={56} outerRadius={84} paddingAngle={stats.byContinent.length > 1 ? 2 : 0} stroke="#0c1b2e" strokeWidth={2} isAnimationActive>
                            {stats.byContinent.map((c) => (
                              <Cell key={c.id} fill={c.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTip unit="개국" />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-mono text-[28px] font-semibold">{stats.countries}</span>
                        <span className="text-[11px] text-dim">개국</span>
                      </div>
                    </div>
                    <ul className="w-full space-y-2" aria-label="대륙별 범례">
                      {stats.byContinent
                        .slice()
                        .sort((a, b) => b.value - a.value)
                        .map((c) => (
                          <li key={c.id} className="flex items-center gap-2.5 text-[13px]">
                            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />
                            <span className="flex-1 whitespace-nowrap text-mute">{c.name}</span>
                            <span className="font-mono text-ink">{c.value}</span>
                            <span className="w-10 text-right font-mono text-dim">{Math.round((c.value / Math.max(stats.countries, 1)) * 100)}%</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>

                <div className="glass p-5 md:p-6">
                  <h2 className="text-[16px] font-semibold">월별 여행 기록 추이</h2>
                  <p className="text-[12px] text-dim">최근 6개월, 여행 기록 수</p>
                  <div className="mt-4 h-[210px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.monthly} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="rgba(120,170,230,0.12)" />
                        <XAxis dataKey="label" tick={{ fill: '#a5bbd3', fontSize: 12 }} axisLine={{ stroke: 'rgba(120,170,230,0.25)' }} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: '#6c84a0', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: 'rgba(50,157,255,0.08)' }} content={<ChartTip unit="회" />} />
                        <Bar dataKey="count" name="여행" fill="#3987e5" radius={[4, 4, 0, 0]} maxBarSize={34} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass p-5 md:p-6">
                  <h2 className="text-[16px] font-semibold">방문 도시 목록</h2>
                  <ul className="mt-3 max-h-[260px] divide-y divide-line/50 overflow-y-auto pr-1 scrollbar-thin">
                    {stats.cityList.map((c) => (
                      <li key={c.destinationId}>
                        <a href={`#/destination/${c.destinationId}`} className="flex items-center gap-3 py-2.5 text-[14px] transition hover:text-cyan">
                          <Flag code={c.countryCode} className="h-3.5 w-5" />
                          <span className="flex-1">
                            {c.cityKo} <span className="text-dim">· {c.countryKo}</span>
                          </span>
                          <span className="font-mono text-[12px] text-mute">{c.visits}회</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                {stats.latest && (
                  <button onClick={() => setSelected(stats.latest)} className="glass group relative overflow-hidden text-left">
                    <SmartImage
                      wiki={getDestinationById(stats.latest.destinationId)?.heroImage.wiki ?? stats.latest.city}
                      alt={stats.latest.city}
                      hue={getDestinationById(stats.latest.destinationId)?.hue}
                      width={800}
                      className="absolute inset-0 h-full w-full transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-bg/10" />
                    <div className="relative flex h-full min-h-[240px] flex-col justify-end p-6">
                      <div className="eyebrow !text-cyan">LATEST DISCOVERY</div>
                      <div className="mt-1 text-[13px] text-mute">가장 최근에 탐험한 도시</div>
                      <div className="mt-2 font-serif text-[36px] font-semibold leading-none">{stats.latest.city}</div>
                      <div className="mt-1 flex items-center gap-2 text-[14px]">
                        <Flag code={stats.latest.countryCode} className="h-3.5 w-5" />
                        {stats.latest.cityKo}, {stats.latest.countryKo} · <span className="font-mono text-mute">{formatDate(stats.latest.visitedAt)}</span>
                      </div>
                    </div>
                  </button>
                )}
              </section>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            <section className="glass p-5">
              <h2 className="eyebrow mb-4">PASSPORT SUMMARY · 여권 요약</h2>
              <div className="flex gap-4">
                <PassportCover compact className="h-[150px] w-[106px] shrink-0" />
                <div className="flex flex-col justify-between">
                  <div>
                    <div className="text-[14px] font-semibold">나의 여권</div>
                    <div className="mt-2 text-[12px] text-mute">총 방문 국가</div>
                    <div className="font-mono text-[30px] font-semibold leading-none">{stats.countries}</div>
                    <div className="mt-2 text-[12px] text-mute">수집한 입국 도장</div>
                    <div className="font-mono text-[18px] font-semibold">
                      {stats.trips} <span className="text-[12px] text-dim">개</span>
                    </div>
                  </div>
                  <a href="#/passport" className="btn-ghost mt-3 !px-3.5 !py-1.5 !text-[12px]">
                    여권 보기 →
                  </a>
                </div>
              </div>
            </section>

            <section className="glass p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="eyebrow">STAMP COLLECTION</h2>
                <a href="#/collection" className="text-[12px] text-cyan hover:underline">
                  더보기 →
                </a>
              </div>
              {stats.countryStamps.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-[13px] text-mute">
                  첫 입국 도장을 기다리고 있어요.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {stats.countryStamps.slice(0, 9).map((t) => (
                    <button
                      key={t.countryCode}
                      onClick={() => setSelected(t)}
                      className="paper flex aspect-square items-center justify-center rounded-lg transition hover:scale-[1.04]"
                      title={`${t.countryKo} · ${t.cityKo}`}
                    >
                      <Stamp trip={t} id={`col-${t.tripId}`} size={84} className="h-[88%] w-[88%]" />
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <TripModal trip={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function ChartTip({ active, payload, unit }: { active?: boolean; payload?: { name?: string; value?: number; payload?: { label?: string; name?: string; color?: string } }[]; unit: string }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  const name = p.payload?.label ?? p.payload?.name ?? p.name
  return (
    <div className="glass-soft px-3 py-2 text-[12px]">
      <div className="text-mute">{name}</div>
      <div className="font-mono text-[15px] font-semibold text-ink">
        {p.value} {unit}
      </div>
    </div>
  )
}
