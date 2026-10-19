import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Loader2, MapPin, Plane, PlaneLanding, PlaneTakeoff, RotateCcw, SkipForward, Sparkles } from 'lucide-react'
import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { TopNav } from '../components/TopNav'
import { Flag, Logo, MiniEarth } from '../components/ui'
import type { ResolvedDestination } from '../data/types'
import type { FlightPhase } from '../globe/GlobeScene'
import { useMediaQuery, useReducedMotion, useSettings, useTrips } from '../hooks/useStores'
import { navigate, type Route } from '../hooks/useRoute'
import { getDestinationPool, getOriginAirport, pickRandomDestination } from '../lib/destinations'
import { distanceKm, estimateFlightTime } from '../lib/distance'
import { consumeLaunch } from '../lib/launch'
import { sortByDateDesc } from '../lib/stats'
import { newTripId, travelStore } from '../lib/storage'
import { makeTrip } from '../lib/trips'

const GlobeScene = lazy(() => import('../globe/GlobeScene').then((m) => ({ default: memo(m.default) })))

const AUTO_ADVANCE_MS = 4200

export default function Home({ route }: { route: Route }) {
  const origin = getOriginAirport()
  const reduced = useReducedMotion()
  const settings = useSettings()
  const trips = useTrips()
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const [phase, setPhase] = useState<FlightPhase>('idle')
  const [dest, setDest] = useState<ResolvedDestination | null>(null)
  const [journeyId, setJourneyId] = useState<string | null>(null)
  const [skipToken, setSkipToken] = useState(0)
  const [ready, setReady] = useState<'loading' | 'ready' | 'error'>('loading')
  const [webglFailed, setWebglFailed] = useState(false)
  const [shuffleName, setShuffleName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [autoAdvance, setAutoAdvance] = useState(true)

  const progressBar = useRef<HTMLDivElement>(null)
  const progressPlane = useRef<HTMLDivElement>(null)
  const savedJourney = useRef<string | null>(null)
  const timers = useRef<number[]>([])

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  const busy = phase === 'selecting' || phase === 'revealed' || phase === 'flying'

  const lastDestinationId = useMemo(() => sortByDateDesc(trips)[0]?.destinationId ?? null, [trips])

  const start = useCallback(() => {
    if (busy) return
    clearTimers()
    setError(null)
    const avoid = settings.avoidRepeat ? (dest?.id ?? lastDestinationId) : null
    const next = pickRandomDestination(avoid)
    if (!next) {
      setError('유효한 목적지 데이터를 찾지 못했습니다. 잠시 후 다시 시도해 주세요.')
      return
    }
    const id = newTripId()
    setDest(next)
    setJourneyId(id)
    setAutoAdvance(true)
    setPhase('selecting')
    if (progressBar.current) progressBar.current.style.width = '0%'

    // slot-machine style city shuffle while "searching"
    const pool = getDestinationPool()
    const iv = window.setInterval(() => setShuffleName(pool[Math.floor(Math.random() * pool.length)].cityKo), 70)
    timers.current.push(
      window.setTimeout(() => {
        window.clearInterval(iv)
        setShuffleName('')
        setPhase('revealed')
        // without WebGL there is no arc to wait for
        if (webglFailed) {
          timers.current.push(window.setTimeout(() => setPhase('flying'), 600))
          timers.current.push(window.setTimeout(() => handleArrive(next, id), 2200))
        }
      }, reduced ? 250 : 1100),
    )
    timers.current.push(iv as unknown as number)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, settings.avoidRepeat, dest, lastDestinationId, reduced, webglFailed])

  const handleArrive = useCallback((d: ResolvedDestination | null, id: string | null) => {
    if (!d || !id) return
    if (savedJourney.current !== id) {
      savedJourney.current = id
      travelStore.addTrip(makeTrip(d, id))
    }
    if (progressBar.current) progressBar.current.style.width = '100%'
    setPhase('arrived')
  }, [])

  // auto transition to the destination page after arrival
  useEffect(() => {
    if (phase !== 'arrived' || !dest || !autoAdvance) return
    const t = window.setTimeout(() => navigate(`/destination/${dest.id}`), AUTO_ADVANCE_MS)
    return () => window.clearTimeout(t)
  }, [phase, dest, autoAdvance])

  // launch requested from another page
  useEffect(() => {
    if (ready === 'loading' && !webglFailed) return
    if (consumeLaunch()) start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, webglFailed, route])

  const journeyRef = useRef<{ dest: ResolvedDestination | null; id: string | null }>({ dest: null, id: null })
  journeyRef.current = { dest, id: journeyId }
  const onReady = useCallback((s: 'ready' | 'error') => setReady(s), [])
  const onArcReady = useCallback(() => setPhase((p) => (p === 'revealed' ? 'flying' : p)), [])
  const onArrive = useCallback(() => handleArrive(journeyRef.current.dest, journeyRef.current.id), [handleArrive])

  const onProgress = useCallback((p: number) => {
    const pct = `${(p * 100).toFixed(1)}%`
    if (progressBar.current) progressBar.current.style.width = pct
    if (progressPlane.current) progressPlane.current.style.left = pct
  }, [])

  const distance = dest ? distanceKm(origin.latitude, origin.longitude, dest.airportLatitude, dest.airportLongitude) : 0

  const showHero = phase === 'idle' || phase === 'selecting'
  const inFlight = phase === 'revealed' || phase === 'flying'

  return (
    <div className="relative h-[100svh] min-h-[620px] w-full overflow-hidden">
      <TopNav route={route} overlay />

      {/* 3D globe */}
      <div
        className={`absolute inset-x-0 top-0 transition-[height] duration-700 lg:!h-full ${showHero ? 'h-[60%]' : 'h-full'}`}
        aria-label="3D 지구본 — 드래그로 회전, 스크롤로 확대·축소"
      >
        {webglFailed ? (
          <div className="flex h-full items-center justify-center lg:justify-end lg:pr-[12vw]">
            <MiniEarth className="h-[min(60vh,560px)] w-[min(60vh,560px)]" />
          </div>
        ) : (
          <ErrorBoundary fallback={null} onError={() => setWebglFailed(true)}>
            <Suspense fallback={null}>
              <GlobeScene
                phase={phase}
                origin={origin}
                destination={dest}
                journeyId={journeyId}
                reducedMotion={reduced}
                skipToken={skipToken}
                shiftRight={isDesktop}
                onReady={onReady}
                onArcReady={onArcReady}
                onProgress={onProgress}
                onArrive={onArrive}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </div>

      {/* vignettes for legibility */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(3,8,16,0.75)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[52%] bg-gradient-to-r from-bg/85 via-bg/40 to-transparent lg:block" style={{ opacity: showHero ? 1 : 0, transition: 'opacity .8s' }} />

      {/* Initial loading */}
      <AnimatePresence>
        {ready === 'loading' && !webglFailed && (
          <motion.div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.8 } }}>
            <div className="flex flex-col items-center gap-3 text-mute">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="hud-label">LOADING EARTH · 지구를 불러오는 중</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO */}
      <AnimatePresence>
        {showHero && (
          <motion.section
            key="hero"
            className="absolute inset-x-0 bottom-8 z-20 px-5 sm:bottom-28 md:px-10 lg:bottom-auto lg:left-[max(4vw,40px)] lg:right-auto lg:top-1/2 lg:w-[min(560px,44vw)] lg:-translate-y-1/2 lg:px-0"
            initial={{ opacity: 0, x: reduced ? 0 : -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduced ? 0 : -40, transition: { duration: 0.5 } }}
            transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <h1 className="sr-only">RANDOM PASSPORT</h1>
            <Logo className="hidden w-full max-w-[520px] drop-shadow-[0_0_30px_rgba(50,157,255,0.25)] lg:block" />
            <div className="mt-6 hidden lg:block">
              <div className="font-display text-[28px] tracking-[0.18em] text-cyan">OFF THE MAP</div>
              <div className="mt-1 font-serif text-[20px] italic tracking-wide text-mute">Discover the Unexpected</div>
            </div>
            <div className="text-center lg:text-left">
              <div className="mb-2 font-display text-[13px] tracking-[0.3em] text-cyan lg:hidden">OFF THE MAP</div>
              <p className="text-[17px] font-semibold leading-snug text-ink sm:text-[19px] md:text-[22px] lg:mt-8">세상에는 아직 당신이 모르는 도시가 있습니다.</p>
              <p className="mx-auto mt-3 max-w-[440px] text-[14px] leading-relaxed text-mute lg:mx-0 lg:text-[15px]">
                유명한 관광지는 잠시 잊고, 한국인이 잘 모르는 이색적인 도시로 떠나는 랜덤 여행. 지금 시작해 보세요.
              </p>
            </div>
            <div className="mt-7 flex flex-col items-center gap-3 lg:mt-10 lg:items-start">
              <button className="btn-primary w-full max-w-[420px] !px-5 !text-[14px] sm:w-auto sm:!px-10 sm:!text-[16px]" onClick={start} disabled={busy || (ready === 'loading' && !webglFailed)} aria-live="polite">
                {phase === 'selecting' ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="min-w-[180px] text-left">목적지 탐색 중 · <span className="text-cyan">{shuffleName || '...'}</span></span>
                  </>
                ) : (
                  <>
                    <Plane className="h-5 w-5 -rotate-45" />
                    TAKE ME SOMEWHERE UNKNOWN
                  </>
                )}
              </button>
              {error && <p className="text-sm text-[#ff9b9b]" role="alert">{error}</p>}
              {trips.length > 0 && phase === 'idle' && (
                <a href="#/stats" className="hud-label hover:text-cyan">지금까지 {new Set(trips.map((t) => t.countryCode)).size}개국 · {trips.length}번의 여행 →</a>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Destination reveal banner */}
      <AnimatePresence>
        {dest && (phase === 'revealed' || phase === 'flying' || phase === 'arrived') && (
          <motion.div
            key={journeyId ?? 'reveal'}
            className="absolute left-1/2 top-[84px] z-20 w-[min(92vw,620px)] -translate-x-1/2 text-center"
            initial={{ opacity: 0, y: -14, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.7 }}
          >
            <div className="hud-label !text-cyan [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">{phase === 'arrived' ? 'ARRIVED · 도착 완료' : 'DESTINATION FOUND · 목적지 공개'}</div>
            <div className="mt-2 flex items-center justify-center gap-3">
              <Flag code={dest.countryCode} className="h-5 w-7" />
              <span className="font-serif text-[34px] font-semibold leading-none text-ink text-glow md:text-[44px]">{dest.city}</span>
            </div>
            <div className="mt-1 text-[15px] font-medium text-ink/90 [text-shadow:0_1px_10px_rgba(0,0,0,0.9)]">
              {dest.cityKo}, {dest.countryKo}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip */}
      {inFlight && (
        <button
          className="btn-ghost absolute bottom-[200px] right-4 z-30 md:bottom-auto md:right-8 md:top-[80px]"
          onClick={() => {
            if (webglFailed) {
              clearTimers()
              handleArrive(dest, journeyId)
              return
            }
            setPhase('flying')
            setSkipToken((n) => n + 1)
          }}
        >
          건너뛰기 <SkipForward className="h-4 w-4" />
        </button>
      )}

      {/* Flight HUD */}
      <AnimatePresence>
        {dest && (inFlight || phase === 'arrived') && (
          <motion.div
            className="absolute inset-x-3 bottom-4 z-20 mx-auto max-w-[860px] md:bottom-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            {phase !== 'arrived' ? (
              <div className="glass grid grid-cols-2 items-center gap-3 px-4 py-4 md:grid-cols-[1fr_auto_1fr] md:gap-6 md:px-7 md:py-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface-light/70 text-cyan sm:flex">
                    <PlaneTakeoff className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="hud-label !text-cyan">출발 · DEP</div>
                    <div className="truncate text-[14px] font-semibold md:text-[15px]">{origin.nameKo} ({origin.iata})</div>
                    <div className="truncate text-[12px] text-dim">Incheon, South Korea</div>
                  </div>
                </div>
                <div className="order-first col-span-2 w-full text-center md:order-none md:col-span-1 md:w-[min(32vw,240px)]">
                  <div className="relative h-[3px] rounded-full bg-surface-light">
                    <div ref={progressBar} className="h-full rounded-full bg-gradient-to-r from-primary to-cyan shadow-[0_0_12px_rgba(120,215,255,0.8)]" style={{ width: '0%' }} />
                    <div ref={progressPlane} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: '0%' }}>
                      <Plane className="h-4 w-4 rotate-45 fill-ink text-ink drop-shadow-[0_0_6px_rgba(120,215,255,1)]" />
                    </div>
                  </div>
                  <div className="mt-3 text-[13px] font-semibold text-ink">{phase === 'flying' ? '비행 중' : '항로 생성 중'}</div>
                  <div className="text-[11px] text-dim">약 {Math.round(distance).toLocaleString()}km · 예상 {estimateFlightTime(distance)}</div>
                </div>
                <div className="flex min-w-0 items-center justify-end gap-3 text-right">
                  <div className="min-w-0">
                    <div className="hud-label !text-cyan">도착 예정 · ARR</div>
                    <div className="truncate text-[14px] font-semibold md:text-[15px]">{dest.airportName} ({dest.iataCode})</div>
                    <div className="truncate text-[12px] text-dim">{dest.city}, {dest.country}</div>
                  </div>
                  <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface-light/70 text-cyan sm:flex">
                    <PlaneLanding className="h-5 w-5" />
                  </span>
                </div>
              </div>
            ) : (
              <ArrivalPanel
                dest={dest}
                autoAdvance={autoAdvance}
                reduced={reduced}
                onStay={() => setAutoAdvance(false)}
                onAgain={() => {
                  setPhase('idle')
                  setTimeout(() => start(), 0)
                }}
              />
            )}
            <p className="mt-2 text-center text-[11px] text-dim">※ 실제 항공 운항 경로가 아닌, 공항 좌표를 기반으로 한 가상 시각화입니다.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Corner HUD */}
      {showHero && (
        <>
          <div className="pointer-events-none absolute bottom-6 left-5 z-10 hidden items-start gap-2.5 md:flex md:left-10">
            <MapPin className="mt-0.5 h-5 w-5 text-cyan" />
            <div>
              <div className="hud-label">DEPARTURE</div>
              <div className="text-[13px] font-medium tracking-wide text-ink">INCHEON, SOUTH KOREA</div>
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-7 left-1/2 z-10 hidden -translate-x-1/2 font-display text-[11px] tracking-[0.42em] text-dim lg:block">
            EXPLORE THE UNEXPECTED
          </div>
          <div className="pointer-events-none absolute bottom-6 right-5 z-10 hidden items-start gap-2.5 md:flex md:right-10">
            <MapPin className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <div className="hud-label">DESTINATION</div>
              <div className="text-[13px] font-medium tracking-wide text-ink">UNKNOWN</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ArrivalPanel({ dest, autoAdvance, reduced, onStay, onAgain }: { dest: ResolvedDestination; autoAdvance: boolean; reduced: boolean; onStay: () => void; onAgain: () => void }) {
  return (
    <div className="glass relative overflow-hidden px-5 py-5 md:px-7">
      {autoAdvance && !reduced && (
        <motion.div
          className="absolute left-0 top-0 h-[2px] bg-gradient-to-r from-primary to-cyan"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: AUTO_ADVANCE_MS / 1000, ease: 'linear' }}
        />
      )}
      <div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/60 bg-primary/15 text-cyan shadow-[0_0_24px_rgba(50,157,255,0.5)]">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-ink">
              {dest.cityKo}에 도착했습니다 · 여권에 입국 도장이 찍혔어요
            </div>
            <div className="mt-0.5 text-[13px] text-mute">“{dest.slogan}”</div>
          </div>
        </div>
        <div className="flex w-full flex-wrap gap-2 md:w-auto md:flex-nowrap">
          <button className="btn-ghost" onClick={onAgain}>
            <RotateCcw className="h-4 w-4" /> 다시 떠나기
          </button>
          {autoAdvance && (
            <button className="btn-ghost" onClick={onStay}>
              지구본에 머무르기
            </button>
          )}
          <a href={`#/destination/${dest.id}`} className="btn-ghost !border-primary !bg-primary/20">
            도시 정보 보기 <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  )
}
