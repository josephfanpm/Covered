import { FastForward, Pause, PhoneOff, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Sim } from '@/lib/useSim'
import { dayStats } from '@/sim/engine'
import { formatClock, formatWait, median } from '@/sim/util'

const iconButton =
  'inline-flex size-11 items-center justify-center rounded-lg text-ink hover:bg-slate-100 aria-pressed:bg-brand-100 aria-pressed:text-brand-700'

/** One slim bar: what this is, the clock, and the one action that starts the demo. */
export function TopBar({ sim }: { sim: Sim }) {
  const stats = dayStats(sim.sim)
  const typical = median(stats.minutesToCover)

  return (
    <header className="border-b bg-surface">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 sm:px-8">
        <h1 className="text-xl font-extrabold tracking-tight text-ink">Covered</h1>

        <p className="tabular order-last w-full text-sm text-slate-600 lg:order-none lg:w-auto">
          <strong className="font-bold text-ink">
            {stats.covered} of {stats.callouts}
          </strong>{' '}
          call-outs covered
          {typical !== null && (
            <>
              , typically in <strong className="font-bold text-ink">{formatWait(typical)}</strong>
            </>
          )}
          . Simulated data.
        </p>

        <div className="ml-auto flex items-center gap-1">
          <span className="tabular mr-2 text-base font-semibold whitespace-nowrap text-ink" aria-label="Simulated time">
            {formatClock(sim.sim.now)}
          </span>
          {sim.dayOver ? (
            <button type="button" onClick={sim.restart} aria-label="Restart the day" className={iconButton}>
              <RotateCcw className="size-4" aria-hidden />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => sim.setPlaying(!sim.playing)}
                aria-label={sim.playing ? 'Pause the clock' : 'Start the clock'}
                className={iconButton}
              >
                {sim.playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
              </button>
              <button
                type="button"
                onClick={() => sim.setSpeed(sim.speed === 1 ? 4 : 1)}
                aria-pressed={sim.speed === 4}
                aria-label="Run the clock faster"
                className={iconButton}
              >
                <FastForward className="size-4" aria-hidden />
              </button>
            </>
          )}
          <Button
            onClick={sim.simulateCallOut}
            disabled={!sim.canCallOut}
            className="ml-2 h-11 bg-orange px-4 text-sm font-bold text-brand-800 hover:bg-urgent-300"
          >
            <PhoneOff aria-hidden /> Simulate a call-out
          </Button>
        </div>
      </div>
    </header>
  )
}
