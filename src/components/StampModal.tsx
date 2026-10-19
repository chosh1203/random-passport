import { ArrowRight, Calendar, Plane } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { TripRecord } from '../data/types'
import { formatDate } from '../lib/stats'
import { travelStore } from '../lib/storage'
import { getDestinationById } from '../lib/destinations'
import { Stamp } from './Stamp'
import { Flag, Modal, SmartImage } from './ui'

/** Trip detail: stamp, photo, info and an editable one-line memo */
export function TripModal({ trip, onClose }: { trip: TripRecord | null; onClose: () => void }) {
  const [memo, setMemo] = useState('')
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    setMemo(trip?.memo ?? '')
    setSaved(false)
  }, [trip])
  const dest = trip ? getDestinationById(trip.destinationId) : null

  return (
    <Modal open={!!trip} onClose={onClose} labelledBy="trip-title" wide>
      {trip && (
        <div className="grid md:grid-cols-[1.1fr_1fr]">
          <div className="relative min-h-[220px]">
            <SmartImage wiki={dest?.heroImage.wiki ?? trip.city} alt={trip.city} hue={dest?.hue} width={900} className="absolute inset-0 h-full w-full md:rounded-l-2xl" label={trip.city} />
            <div className="absolute inset-0 bg-gradient-to-t from-bg/90 via-transparent to-transparent md:rounded-l-2xl" />
            <div className="paper absolute bottom-4 left-4 rounded-xl p-1.5 shadow-xl">
              <Stamp trip={trip} id={`modal-${trip.tripId}`} size={104} />
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-2">
              <Flag code={trip.countryCode} className="h-4 w-6" />
              <span className="font-display text-[12px] tracking-[0.2em] text-mute">{trip.country.toUpperCase()}</span>
            </div>
            <h2 id="trip-title" className="mt-2 font-serif text-[34px] font-semibold leading-none">{trip.city}</h2>
            <div className="mt-1 text-mute">
              {trip.cityKo}, {trip.countryKo}
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-[13px]">
              <div className="glass-soft p-3">
                <dt className="hud-label flex items-center gap-1.5">
                  <Plane className="h-3 w-3" /> AIRPORT
                </dt>
                <dd className="mt-1 font-mono text-[18px] font-semibold">{trip.iataCode}</dd>
              </div>
              <div className="glass-soft p-3">
                <dt className="hud-label flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> ENTRY
                </dt>
                <dd className="mt-1 text-[14px] font-semibold">{formatDate(trip.visitedAt, 'long')}</dd>
              </div>
            </dl>
            <label className="mt-5 block">
              <span className="hud-label">한 줄 여행 메모</span>
              <div className="mt-1.5 flex gap-2">
                <input
                  value={memo}
                  maxLength={60}
                  onChange={(e) => {
                    setMemo(e.target.value)
                    setSaved(false)
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-line bg-bg/60 px-3 py-2 text-[14px] text-ink outline-none transition focus:border-primary focus:shadow-[0_0_0_3px_rgba(50,157,255,0.2)]"
                  placeholder="이 여행을 한 줄로 남겨 보세요"
                />
                <button
                  className="btn-ghost !px-4"
                  onClick={() => {
                    travelStore.updateMemo(trip.tripId, memo.trim())
                    setSaved(true)
                  }}
                >
                  {saved ? '저장됨' : '저장'}
                </button>
              </div>
            </label>
            {dest && (
              <a href={`#/destination/${dest.id}`} onClick={onClose} className="btn-ghost mt-6 w-full justify-center !border-primary/70 !bg-primary/15">
                도시 정보 다시 보기 <ArrowRight className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
