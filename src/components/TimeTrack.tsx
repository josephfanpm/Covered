import { CALL_THRESHOLD } from '@/sim/engine'
import type { Minutes, OpenVisit, Visit } from '@/sim/types'
import { formatClock, formatTime } from '@/sim/util'

const DOT: Record<string, string> = {
  pending: 'var(--brand-700)',
  accepted: 'var(--good-600)',
  declined: 'var(--bad-500)',
  expired: 'var(--slate-400)',
  withdrawn: 'var(--slate-400)',
}

/**
 * The run-up to a visit, from the call-out to the start time.
 * Blue is time used, orange is the last stretch where a phone call is needed, dots are texts sent.
 */
export function TimeTrack({ open, visit, now, compact = false }: { open: OpenVisit; visit: Visit; now: Minutes; compact?: boolean }) {
  const from = open.openedAt
  const to = visit.start
  const span = Math.max(1, to - from)
  const pct = (t: Minutes) => `${Math.min(100, Math.max(0, ((t - from) / span) * 100))}%`
  const stopped = open.status === 'covered' ? (open.coveredAt as Minutes) : Math.min(now, to)
  const callAt = to - CALL_THRESHOLD
  const live = open.status === 'offering' || open.status === 'needs_call'

  return (
    <div className={compact ? '' : 'pt-6'}>
      <div className={`relative ${compact ? 'h-1' : 'h-2'} rounded-full bg-slate-200`}>
        {callAt > from && <div className="absolute inset-y-0 right-0 rounded-r-full bg-orange" style={{ left: pct(callAt) }} />}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: pct(stopped),
            background: open.status === 'covered' ? 'var(--good-400)' : open.status === 'missed' ? 'var(--bad-500)' : 'var(--sky)',
          }}
        />
        {!compact &&
          open.offers.map((offer) => (
            <span
              key={offer.caregiverId}
              className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
              style={{ left: pct(offer.sentAt), background: DOT[offer.status] }}
            />
          ))}
        {!compact && live && (
          <span className="tabular absolute -top-6 -translate-x-1/2 text-xs font-semibold whitespace-nowrap text-brand-700" style={{ left: pct(now) }}>
            {formatTime(now)}
            <span aria-hidden className="absolute top-full left-1/2 h-7 w-px -translate-x-1/2 bg-brand-700" />
          </span>
        )}
      </div>
      {!compact && (
        <div className="tabular mt-2 flex justify-between text-xs text-slate-600">
          <span>Called out {formatClock(from)}</span>
          <span>Starts {formatClock(to)}</span>
        </div>
      )}
    </div>
  )
}
