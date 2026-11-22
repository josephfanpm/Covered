import { CALL_THRESHOLD, STAGES } from '@/sim/engine'
import type { Minutes, OpenVisit, Visit } from '@/sim/types'
import { formatClock, formatTime } from '@/sim/util'

const ZONE_FILL: Record<string, string> = {
  steady: 'var(--spruce-100)',
  quick: 'var(--spruce-200)',
  wide: 'var(--marigold-100)',
  urgent: 'var(--marigold-200)',
}

const DOT: Record<string, string> = {
  pending: 'var(--spruce-700)',
  accepted: 'var(--moss-600)',
  declined: 'var(--brick-500)',
  expired: 'var(--slate-400)',
  withdrawn: 'var(--slate-400)',
}

/**
 * The run-up to a visit, from the call-out to the start time.
 * Bands show how the offers change as the visit gets closer; dots are the texts sent so far.
 */
export function TimeTrack({ open, visit, now, compact = false }: { open: OpenVisit; visit: Visit; now: Minutes; compact?: boolean }) {
  const from = open.openedAt
  const to = visit.start
  const span = Math.max(1, to - from)
  const pct = (t: Minutes) => `${Math.min(100, Math.max(0, ((t - from) / span) * 100))}%`
  const stopped = open.status === 'covered' ? (open.coveredAt as Minutes) : Math.min(now, to)

  // Each stage as a slice of the track, clipped to what is visible.
  const zones = STAGES.map((stage, i) => {
    const zoneStart = to - (i === 0 ? Number.POSITIVE_INFINITY : STAGES[i - 1].fromMinutesOut)
    const zoneEnd = to - stage.fromMinutesOut
    return { stage, start: Math.max(from, zoneStart), end: Math.min(to, zoneEnd) }
  }).filter((z) => z.end > z.start)

  const callAt = to - CALL_THRESHOLD
  const height = compact ? 'h-1.5' : 'h-3'

  return (
    <div className={compact ? '' : 'pt-6 pb-6'}>
      <div className={`relative ${height} rounded-full bg-slate-100`}>
        {zones.map((z) => (
          <div
            key={z.stage.key}
            className="absolute inset-y-0 first:rounded-l-full last:rounded-r-full"
            style={{ left: pct(z.start), width: `calc(${pct(z.end)} - ${pct(z.start)})`, background: ZONE_FILL[z.stage.key] }}
          />
        ))}
        {callAt > from && (
          <div
            className="absolute inset-y-0 rounded-r-full"
            style={{ left: pct(callAt), right: 0, background: 'var(--marigold-300)' }}
          />
        )}
        {/* Time already used. */}
        <div
          className="absolute inset-y-0 left-0 rounded-l-full"
          style={{
            width: pct(stopped),
            background: open.status === 'covered' ? 'var(--moss-400)' : open.status === 'missed' ? 'var(--brick-500)' : 'var(--spruce-700)',
            opacity: 0.9,
          }}
        />
        {!compact &&
          open.offers.map((offer) => (
            <span
              key={offer.caregiverId}
              className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
              style={{ left: pct(offer.sentAt), background: DOT[offer.status] }}
            />
          ))}
        {!compact && (open.status === 'offering' || open.status === 'needs_call') && (
          <span className="absolute -top-6 -translate-x-1/2 text-xs font-semibold whitespace-nowrap text-spruce-700" style={{ left: pct(now) }}>
            <span className="tabular">{formatTime(now)}</span>
            <span aria-hidden className="absolute top-full left-1/2 h-9 w-px -translate-x-1/2 bg-spruce-700" />
          </span>
        )}
      </div>
      {!compact && (
        <div className="tabular mt-2 flex justify-between text-xs text-slate-600">
          <span>Called out {formatClock(from)}</span>
          <span>Visit starts {formatClock(to)}</span>
        </div>
      )}
    </div>
  )
}
