import { clientOf, isActive, statusOf, visitOf } from '@/lib/view'
import type { OpenVisit, SimState } from '@/sim/types'
import { formatClock, formatDuration } from '@/sim/util'
import { StatusLine } from './StatusLine'
import { TimeTrack } from './TimeTrack'

function Row({ sim, open, selected, onSelect }: { sim: SimState; open: OpenVisit; selected: boolean; onSelect: () => void }) {
  const visit = visitOf(sim, open.visitId)
  const client = clientOf(sim, visit)
  const status = statusOf(sim, open)
  const active = isActive(open)
  const justCovered = open.status === 'covered' && sim.now - (open.coveredAt as number) <= 1

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected}
        className="relative block w-full overflow-hidden rounded-lg px-3 py-3 text-left hover:bg-slate-100 aria-[current=true]:bg-surface aria-[current=true]:shadow-[inset_3px_0_0_0_var(--sky)]"
      >
        {justCovered && <span aria-hidden className="covered-sheen pointer-events-none absolute inset-0" />}
        <span className="flex items-baseline justify-between gap-3">
          <span className={`font-bold ${active ? 'text-ink' : 'text-slate-600'}`}>{client.name}</span>
          <span className="tabular shrink-0 text-sm text-slate-600">
            {!active ? formatClock(visit.start) : sim.now < visit.start ? `${formatDuration(visit.start - sim.now)} left` : `${sim.now - visit.start} min late`}
          </span>
        </span>
        <StatusLine tone={status.tone} text={status.text} className="mt-1" />
        {active && (
          <span className="mt-2.5 block">
            <TimeTrack open={open} visit={visit} now={sim.now} compact />
          </span>
        )}
      </button>
    </li>
  )
}

/** Open visits first, soonest start at the top. Finished ones sit underneath. */
export function VisitList({ sim, selectedId, onSelect }: { sim: SimState; selectedId: string | null; onSelect: (id: string) => void }) {
  const start = (o: OpenVisit) => visitOf(sim, o.visitId).start
  const active = sim.open.filter(isActive).sort((a, b) => start(a) - start(b))
  const done = sim.open.filter((o) => !isActive(o)).sort((a, b) => b.openedAt - a.openedAt)

  return (
    <nav aria-label="Call-outs today">
      <h2 className="px-3 text-sm font-bold text-slate-600">Open visits</h2>
      {active.length === 0 ? (
        <p className="px-3 py-3 text-sm text-slate-600">None. Every visit is covered.</p>
      ) : (
        <ul className="mt-1">
          {active.map((o) => (
            <Row key={o.visitId} sim={sim} open={o} selected={o.visitId === selectedId} onSelect={() => onSelect(o.visitId)} />
          ))}
        </ul>
      )}
      {done.length > 0 && (
        <>
          <h2 className="mt-5 px-3 text-sm font-bold text-slate-600">Earlier today</h2>
          <ul className="mt-1">
            {done.map((o) => (
              <Row key={o.visitId} sim={sim} open={o} selected={o.visitId === selectedId} onSelect={() => onSelect(o.visitId)} />
            ))}
          </ul>
        </>
      )}
    </nav>
  )
}
