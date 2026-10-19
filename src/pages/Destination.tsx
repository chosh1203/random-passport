import { motion } from 'motion/react'
import {
  AlertTriangle,
  ArrowLeft,
  Bus,
  CalendarDays,
  Clock3,
  Coins,
  Compass,
  ExternalLink,
  HandHeart,
  Info,
  Landmark,
  Languages,
  MapPin,
  Plane,
  ShieldAlert,
  Stamp as StampIcon,
  Sun,
  UtensilsCrossed,
} from 'lucide-react'
import { useMemo } from 'react'
import { Stamp } from '../components/Stamp'
import { Flag, SectionTitle, SmartImage } from '../components/ui'
import { CONTINENTS } from '../data/continents'
import { useLocalTime, useTrips } from '../hooks/useStores'
import { navigate } from '../hooks/useRoute'
import { getAirport, getDestinationById } from '../lib/destinations'
import { formatDate, sortByDateDesc } from '../lib/stats'
import { requestLaunch } from '../lib/launch'

function launchAgain() {
  requestLaunch()
  navigate('/')
}

export default function DestinationPage({ id }: { id?: string }) {
  const trips = useTrips()
  const latestId = useMemo(() => sortByDateDesc(trips)[0]?.destinationId, [trips])
  const resolvedId = id ?? latestId
  const dest = useMemo(() => getDestinationById(resolvedId), [resolvedId])
  const time = useLocalTime(dest?.timezone)
  const visits = useMemo(() => sortByDateDesc(trips.filter((t) => t.destinationId === dest?.id)), [trips, dest])

  // No destination drawn yet
  if (!id && !latestId) {
    return (
      <EmptyState
        icon={<Compass className="h-6 w-6" />}
        title="아직 발견한 도시가 없습니다"
        body="지구본에서 랜덤 목적지를 뽑으면 이곳에서 도시의 관광지, 음식, 언어와 문화를 탐색할 수 있어요."
      />
    )
  }
  // Unknown id / failed data
  if (!dest) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-6 w-6" />}
        title="목적지 정보를 불러오지 못했습니다"
        body="요청한 도시 데이터가 없거나 유효한 공항 정보가 없습니다. 다른 목적지로 다시 떠나 보세요."
        cta="다른 목적지로 떠나기"
      />
    )
  }

  const quick = [
    { href: '#sec-attractions', label: '주요 관광지', en: 'ATTRACTIONS', icon: Landmark, wiki: dest.attractions[0]?.wiki },
    { href: '#sec-food', label: '대표 음식', en: 'FOOD', icon: UtensilsCrossed, wiki: dest.foods[0]?.wiki },
    { href: '#sec-language', label: '언어 & 통화', en: 'LANGUAGE', icon: Languages, wiki: dest.attractions[1]?.wiki ?? dest.heroImage.wiki },
    { href: '#sec-tips', label: '여행 팁', en: 'TRAVEL TIPS', icon: Info, wiki: dest.attractions[2]?.wiki ?? dest.heroImage.wiki },
  ]

  const extraAirports = dest.airports.slice(1).map(getAirport).filter(Boolean)

  return (
    <div className="pb-24">
      {/* HERO */}
      <section className="relative h-[min(68vh,620px)] min-h-[440px] w-full overflow-hidden">
        <SmartImage wiki={dest.heroImage.wiki} alt={`${dest.city} 풍경`} hue={dest.hue} width={1600} className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/35 to-bg/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg/80 via-bg/20 to-transparent" />

        <div className="relative mx-auto flex h-full max-w-[1280px] flex-col justify-between px-5 pb-12 pt-6 md:px-10 md:pb-20">
          <div className="flex items-center justify-between">
            <button onClick={() => (window.history.length > 1 ? window.history.back() : navigate('/'))} className="btn-ghost shrink-0 whitespace-nowrap !bg-bg/50 backdrop-blur">
              <ArrowLeft className="h-4 w-4" /> 돌아가기
            </button>
            {time && (
              <div className="glass-soft flex items-center gap-2 px-3.5 py-2 text-[13px]">
                <Clock3 className="h-4 w-4 text-cyan" />
                <span className="hidden text-mute sm:inline">현지 시간</span>
                <span className="whitespace-nowrap font-mono text-ink">{time.text}</span>
                <span className="hidden font-mono text-[11px] text-dim sm:inline">{time.offset}</span>
              </div>
            )}
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="eyebrow mb-3 !text-cyan">DESTINATION DISCOVERY · {CONTINENTS[dest.continent].en}</div>
            <h1 className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="font-serif text-[52px] font-semibold leading-[0.95] text-ink drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)] md:text-[84px]">{dest.city}</span>
              <span className="text-[22px] font-medium text-ink/90 md:text-[28px]">{dest.cityKo}</span>
            </h1>
            <div className="mt-1 font-serif text-[20px] italic text-mute md:text-[24px]">/ {dest.localName}</div>
            <div className="mt-4 flex items-center gap-3">
              <Flag code={dest.countryCode} className="h-6 w-9" />
              <span className="font-display text-[15px] tracking-[0.2em] text-ink">{dest.country.toUpperCase()}</span>
              <span className="text-mute">· {dest.countryKo}</span>
            </div>
            <p className="mt-4 max-w-[640px] text-[17px] text-ink/95 md:text-[19px]">“{dest.slogan}”</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-mute">
              <span className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-cyan" />
                <span className="font-mono font-semibold text-ink">{dest.iataCode}</span> {dest.airportName}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-cyan" /> {dest.latitude.toFixed(2)}°, {dest.longitude.toFixed(2)}°
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        {/* Quick tiles */}
        <div className="relative z-10 -mt-6 grid grid-cols-2 gap-3 md:-mt-10 md:grid-cols-4 md:gap-4">
          {quick.map((q, i) => (
            <motion.a
              key={q.href}
              href={q.href}
              onClick={(e) => {
                e.preventDefault()
                document.querySelector(q.href)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="glass group overflow-hidden !rounded-2xl transition hover:-translate-y-1 hover:border-primary/60"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
            >
              <SmartImage wiki={q.wiki} alt={q.label} hue={dest.hue + i * 20} width={500} className="h-24 w-full md:h-28" />
              <div className="flex items-center gap-2.5 px-3.5 py-3">
                <q.icon className="h-4 w-4 text-cyan" />
                <span className="flex-1 text-[14px] font-medium">{q.label}</span>
                <span className="text-dim transition group-hover:translate-x-0.5 group-hover:text-cyan">›</span>
              </div>
            </motion.a>
          ))}
        </div>

        {/* Getting there */}
        {(dest.transfer || extraAirports.length > 0) && (
          <div className="glass-soft mt-6 flex items-start gap-3 px-5 py-4 text-[14px]">
            <Bus className="mt-0.5 h-5 w-5 shrink-0 text-cyan" />
            <div>
              <div className="font-semibold">공항에서 도시까지</div>
              {dest.transfer && <p className="mt-1 text-mute">{dest.transfer}</p>}
              {extraAirports.length > 0 && (
                <p className="mt-1 text-dim">
                  다른 연결 공항: {extraAirports.map((a) => `${a!.nameKo} (${a!.iata})`).join(', ')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Your visit */}
        {visits.length > 0 && (
          <div className="glass mt-6 flex flex-col items-center gap-5 px-5 py-5 sm:flex-row">
            <div className="paper flex h-[112px] w-[112px] shrink-0 items-center justify-center rounded-xl">
              <Stamp trip={visits[0]} id={`dest-${visits[0].tripId}`} size={100} />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="eyebrow !text-primary">YOUR VISIT</div>
              <div className="mt-1 text-[16px] font-semibold">
                {formatDate(visits[0].visitedAt, 'long')} 입국 · 이 도시를 {visits.length}번 방문했어요
              </div>
              <p className="mt-1 text-[14px] text-mute">“{visits[0].memo || dest.slogan}”</p>
            </div>
            <a href="#/passport" className="btn-ghost">
              <StampIcon className="h-4 w-4" /> 여권에서 보기
            </a>
          </div>
        )}

        {/* Attractions */}
        <section id="sec-attractions" className="scroll-mt-24 pt-14">
          <SectionTitle en="ATTRACTIONS" ko="대표 관광지" icon={<Landmark className="h-4 w-4" />} />
          <div className="grid gap-4 md:grid-cols-3">
            {dest.attractions.map((a, i) => (
              <motion.article
                key={a.name}
                className="glass overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.08 }}
              >
                <SmartImage wiki={a.wiki} alt={a.nameKo} hue={dest.hue + i * 25} width={700} className="aspect-[4/3] w-full" label={a.name} />
                <div className="p-5">
                  <h3 className="text-[17px] font-semibold">{a.nameKo}</h3>
                  <div className="font-serif text-[15px] italic text-dim">{a.name}</div>
                  <p className="mt-2 text-[14px] leading-relaxed text-mute">{a.description}</p>
                  <div className="mt-3 flex items-center gap-1.5 text-[12px] text-cyan">
                    <MapPin className="h-3.5 w-3.5" /> {a.location}
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        {/* Food */}
        <section id="sec-food" className="scroll-mt-24 pt-14">
          <SectionTitle en="LOCAL FOOD" ko="대표 음식" icon={<UtensilsCrossed className="h-4 w-4" />} />
          <div className="grid gap-4 md:grid-cols-2">
            {dest.foods.map((f, i) => (
              <motion.article
                key={f.name}
                className="glass flex overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.08 }}
              >
                <SmartImage wiki={f.wiki} alt={f.nameKo} hue={dest.hue + 30 + i * 30} width={500} className="w-[38%] min-w-[130px] shrink-0" label={f.name} />
                <div className="p-5">
                  <h3 className="text-[17px] font-semibold">{f.nameKo}</h3>
                  <div className="font-serif text-[15px] italic text-dim">{f.name}</div>
                  <p className="mt-2 text-[14px] leading-relaxed text-mute">{f.description}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        {/* Language & currency & culture */}
        <section id="sec-language" className="scroll-mt-24 pt-14">
          <SectionTitle en="LANGUAGE · CURRENCY · CULTURE" ko="언어 · 통화 · 현지 문화" icon={<Languages className="h-4 w-4" />} />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="glass p-6">
              <div className="flex items-center gap-2 text-cyan">
                <Languages className="h-4 w-4" /> <span className="eyebrow !text-cyan">LANGUAGE</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {dest.languages.names.map((n) => (
                  <span key={n} className="rounded-full border border-line bg-surface-light/60 px-3 py-1 text-[13px]">
                    {n}
                  </span>
                ))}
              </div>
              <div className="mt-5 rounded-xl border border-line/70 bg-bg/40 p-4">
                <div className="hud-label">현지 인사말</div>
                <div className="mt-1.5 font-serif text-[24px] leading-tight text-ink">{dest.languages.greeting.local}</div>
                <div className="mt-1 text-[14px] text-mute">
                  [{dest.languages.greeting.reading}] · {dest.languages.greeting.meaning}
                </div>
              </div>
            </div>

            <div className="glass p-6">
              <div className="flex items-center gap-2 text-cyan">
                <Coins className="h-4 w-4" /> <span className="eyebrow !text-cyan">CURRENCY</span>
              </div>
              <div className="mt-4 flex items-end gap-3">
                <span className="font-mono text-[44px] font-semibold leading-none text-ink">{dest.currency.code}</span>
              </div>
              <div className="mt-2 text-[16px]">{dest.currency.name}</div>
              {dest.currency.note && <p className="mt-2 text-[13px] text-mute">{dest.currency.note}</p>}
              <p className="mt-4 flex items-start gap-2 rounded-lg border border-line/60 bg-bg/40 p-3 text-[12px] leading-relaxed text-dim">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                실시간 환율은 제공하지 않습니다. 출국 전 은행·환전소에서 최신 환율을 확인하세요.
              </p>
            </div>

            <div className="glass p-6">
              <div className="flex items-center gap-2 text-cyan">
                <HandHeart className="h-4 w-4" /> <span className="eyebrow !text-cyan">LOCAL CULTURE</span>
              </div>
              <ul className="mt-4 space-y-3">
                {dest.culture.map((c) => (
                  <li key={c} className="flex gap-3 text-[14px] leading-relaxed text-mute">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan shadow-[0_0_8px_#78d7ff]" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Tips */}
        <section id="sec-tips" className="scroll-mt-24 pt-14">
          <SectionTitle en="TRAVEL TIPS" ko="여행 팁 및 주의사항" icon={<Info className="h-4 w-4" />} />
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { icon: Bus, title: '교통수단', body: dest.travelTips.transport },
              { icon: HandHeart, title: '현지 문화와 예절', body: dest.travelTips.etiquette },
              { icon: Sun, title: '여행하기 좋은 계절', body: dest.travelTips.bestSeason },
              { icon: ShieldAlert, title: '안전 관련 주의사항', body: dest.travelTips.safety },
            ].map((t) => (
              <div key={t.title} className="glass-soft flex gap-4 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface-light/60 text-cyan">
                  <t.icon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="font-semibold">{t.title}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-mute">{t.body}</p>
                </div>
              </div>
            ))}
            <div className="glass-soft flex gap-4 border-[#e0a85a]/40 p-5 md:col-span-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e0a85a]/50 bg-[#e0a85a]/10 text-[#e0a85a]">
                <CalendarDays className="h-4.5 w-4.5" />
              </span>
              <div className="flex-1">
                <h3 className="font-semibold">입국 및 비자 안내 <span className="ml-1 rounded bg-[#e0a85a]/15 px-1.5 py-0.5 text-[11px] font-medium text-[#e0a85a]">참고 정보</span></h3>
                <p className="mt-1 text-[14px] leading-relaxed text-mute">
                  비자 면제 여부, 체류 가능 기간, 여권 유효기간 조건은 수시로 바뀝니다. 이 사이트는 입국 규정을 확정적으로 안내하지 않으니, 출국 전 반드시 외교부 해외안전여행과 {dest.countryKo} 대사관 공식 안내를 확인하세요.
                </p>
                <a href="https://www.0404.go.kr" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-cyan hover:underline">
                  외교부 해외안전여행 (0404.go.kr) <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <p className="text-mute">다음엔 어디로 가게 될까요?</p>
          <button className="btn-primary" onClick={launchAgain}>
            <Plane className="h-5 w-5 -rotate-45" /> TAKE ME SOMEWHERE UNKNOWN
          </button>
          <p className="max-w-[560px] text-[12px] text-dim">사진: Wikipedia / Wikimedia Commons. 여행 정보는 참고용이며 현지 사정에 따라 달라질 수 있습니다.</p>
        </div>
      </div>
    </div>
  )
}

export function EmptyState({ icon, title, body, cta = '첫 탐험 떠나기' }: { icon: React.ReactNode; title: string; body: string; cta?: string }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[560px] flex-col items-center justify-center px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface-light/60 text-cyan shadow-[0_0_30px_rgba(50,157,255,0.35)]">{icon}</span>
      <h1 className="mt-5 text-[22px] font-semibold">{title}</h1>
      <p className="mt-2 text-mute">{body}</p>
      <button className="btn-primary mt-8" onClick={launchAgain}>
        <Plane className="h-5 w-5 -rotate-45" /> {cta}
      </button>
    </div>
  )
}
