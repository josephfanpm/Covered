import { dayStats } from '@/sim/engine'
import type { SimState } from '@/sim/types'
import { formatWait, median } from '@/sim/util'

function Stat({ value, label, alert = false }: { value: string; label: string; alert?: boolean }) {
  return (
    <div className="flex flex-col-reverse gap-0.5">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className={`tabular text-2xl leading-tight font-bold ${alert ? 'text-urgent-600' : 'text-ink'}`}>{value}</dd>
    </div>
  )
}

/** Today's numbers. All of them come from the simulated day, not from a real agency. */
export function Stats({ sim }: { sim: SimState }) {
  const stats = dayStats(sim)
  const typical = median(stats.minutesToCover)
  return (
    <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:flex sm:flex-wrap sm:gap-x-12">
      <Stat value={`${stats.covered} of ${stats.callouts}`} label="Call-outs covered today" />
      <Stat value={typical === null ? 'None yet' : formatWait(typical)} label="Typical time to cover" />
      <Stat value={String(stats.open)} label="Open now" />
      <Stat value={String(stats.needsCall)} label="Need a phone call" alert={stats.needsCall > 0} />
      {stats.missed > 0 && <Stat value={String(stats.missed)} label="Missed" alert />}
    </dl>
  )
}
