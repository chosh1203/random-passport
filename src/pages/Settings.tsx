import { Ban, Database, Repeat, Trash2, Wind } from 'lucide-react'
import { useState } from 'react'
import { EXCLUDED_CITIES } from '../data/exclusions'
import { useSettings, useTrips } from '../hooks/useStores'
import { getDestinationPool } from '../lib/destinations'
import { settingsStore, travelStore } from '../lib/storage'
import { Sidebar } from './Stats'

export default function Settings() {
  const settings = useSettings()
  const trips = useTrips()
  const [confirm, setConfirm] = useState(false)

  return (
    <div className="mx-auto flex max-w-[1600px] gap-6 px-4 pb-20 pt-6 md:px-8">
      <Sidebar active="settings" />
      <div className="min-w-0 max-w-[860px] flex-1 space-y-6">
        <header>
          <div className="eyebrow !text-primary">SETTINGS</div>
          <h1 className="mt-1 text-[28px] font-semibold md:text-[34px]">설정</h1>
        </header>

        <section className="glass divide-y divide-line/60">
          <Row icon={<Repeat className="h-4.5 w-4.5" />} title="직전 목적지 제외" desc="같은 도시가 연속으로 나오지 않도록 바로 전 목적지를 추첨에서 뺍니다.">
            <Toggle on={settings.avoidRepeat} onChange={(v) => settingsStore.set({ avoidRepeat: v })} label="직전 목적지 제외" />
          </Row>
          <Row icon={<Wind className="h-4.5 w-4.5" />} title="모션" desc="‘시스템’은 운영체제의 동작 줄이기 설정을 따릅니다. ‘줄이기’는 비행 시간과 카메라 이동을 짧게 만듭니다.">
            <div className="flex rounded-full border border-line p-1 text-[13px]">
              {(
                [
                  ['system', '시스템'],
                  ['reduced', '줄이기'],
                  ['full', '전체'],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => settingsStore.set({ motion: k })}
                  className={`rounded-full px-3 py-1 transition ${settings.motion === k ? 'bg-primary/30 text-white' : 'text-mute hover:text-ink'}`}
                  aria-pressed={settings.motion === k}
                >
                  {l}
                </button>
              ))}
            </div>
          </Row>
        </section>

        <section className="glass p-6">
          <div className="flex items-center gap-2">
            <Ban className="h-4.5 w-4.5 text-cyan" />
            <h2 className="font-semibold">추첨에서 제외되는 유명 도시</h2>
          </div>
          <p className="mt-1 text-[13px] text-mute">
            국가 전체가 아니라 도시 단위로 제외합니다. 현재 추첨 대상은 <span className="font-mono text-ink">{getDestinationPool().length}</span>개 도시입니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {EXCLUDED_CITIES.map((c) => (
              <span key={c.name} className="rounded-full border border-line/70 bg-bg/40 px-3 py-1 text-[13px] text-mute line-through decoration-primary/60">
                {c.nameKo}
              </span>
            ))}
          </div>
        </section>

        <section className="glass p-6">
          <div className="flex items-center gap-2">
            <Database className="h-4.5 w-4.5 text-cyan" />
            <h2 className="font-semibold">여행 데이터</h2>
          </div>
          <p className="mt-1 text-[13px] text-mute">기록은 이 브라우저(localStorage)에만 저장됩니다. 현재 {trips.length}개의 여행 기록이 있습니다.</p>
          <div className="mt-4">
            {!confirm ? (
              <button className="btn-ghost !border-[#ff7b7b]/50 !text-[#ffb3b3]" onClick={() => setConfirm(true)} disabled={trips.length === 0} style={{ opacity: trips.length === 0 ? 0.5 : 1 }}>
                <Trash2 className="h-4 w-4" /> 모든 기록 초기화
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[14px]">여권 도장과 통계가 모두 삭제됩니다. 계속할까요?</span>
                <button
                  className="btn-ghost !border-[#ff7b7b] !bg-[#ff7b7b]/15 !text-[#ffd0d0]"
                  onClick={() => {
                    travelStore.clear()
                    setConfirm(false)
                  }}
                >
                  삭제
                </button>
                <button className="btn-ghost" onClick={() => setConfirm(false)}>
                  취소
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function Row({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface-light/60 text-cyan">{icon}</span>
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        <div className="mt-0.5 text-[13px] text-mute">{desc}</div>
      </div>
      {children}
    </div>
  )
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 rounded-full border transition ${on ? 'border-primary bg-primary/40 shadow-[0_0_14px_rgba(50,157,255,0.5)]' : 'border-line bg-surface-light'}`}
    >
      <span className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white transition-all ${on ? 'left-[24px]' : 'left-[3px]'}`} />
    </button>
  )
}
