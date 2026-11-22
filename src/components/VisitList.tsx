import { clientOf, isActive, statusOf, visitOf } from '@/lib/view'
import type { OpenVisit, SimState } from '@/sim/types'
import { formatDuration, formatRange } from '@/sim/util'
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
        className={`relative block w-full overflow-hidden rounded-xl border bg-surface p-4 text-left transition-colors hover:border-spruce-400 aria-[current=true]:border-spruce-700 aria-[current=true]:shadow-[inset_4px_0_0_0_var(--spruce-700)] ${active ? '' : 'bg-transparent'}`}
      >
        {justCovered && <span aria-hidden className="covered-sheen pointer-events-none absolute inset-0" />}
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-base font-bold text-ink">{client.name}</span>
          {active && (
            <span className={`tabular shrink-0 text-sm font-semibold ${open.status === 'needs_call' ? 'text-marigold-600' : 'text-slate-600'}`}>
              in {formatDuration(visit.start - sim.now)}
            </span>
          )}
        </div>
        <div className="tabular mt-0.5 text-sm text-slate-600">{formatRange(visit.start, visit.end)}</div>
        {active && (
          <div className="mt-3">
            <TimeTrack open={open} visit={visit} now={sim.now} compact />
          </div>
        )}
        <StatusLine tone={status.tone} text={status.text} className="mt-3" />
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
    <nav aria-label="Call-outs today" className="flex flex-col gap-6">
      <section>
        <h2 className="text-lg font-bold text-ink">Open visits</h2>
        {active.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
            Every visit is covered. Simulate a call-out to open one.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {active.map((o) => (
              <Row key={o.visitId} sim={sim} open={o} selected={o.visitId === selectedId} onSelect={() => onSelect(o.visitId)} />
            ))}
          </ul>
        )}
      </section>
      {done.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-ink">Earlier today</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {done.map((o) => (
              <Row key={o.visitId} sim={sim} open={o} selected={o.visitId === selectedId} onSelect={() => onSelect(o.visitId)} />
            ))}
          </ul>
        </section>
      )}
    </nav>
  )
}
