import { FlaskConical, Pause, PhoneOff, Play, RotateCcw } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import type { Sim } from '@/lib/useSim'
import { AGENCY } from '@/sim/data'
import { formatClock } from '@/sim/util'

const DawnShader = lazy(() => import('./DawnShader'))

/** Only load the animated sky when motion is welcome and the browser can draw it. */
function shaderAllowed() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  const canvas = document.createElement('canvas')
  return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
}

export function Band({ sim }: { sim: Sim }) {
  const [shader] = useState(shaderAllowed)

  return (
    <header className="relative isolate overflow-hidden bg-brand-800 text-white">
      {/* Static dawn: the fallback, and the whole picture under reduced motion. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20"
        style={{
          background:
            'radial-gradient(120% 90% at 85% 115%, #fc8c3a 0%, #d47329 12%, #33a4d6 44%, #002447 80%)',
        }}
      />
      {shader && (
        <div aria-hidden className="absolute inset-0 -z-10">
          <Suspense fallback={null}>
            <DawnShader />
          </Suspense>
        </div>
      )}
      {/* Keeps text readable whatever the sky is doing. */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-r from-brand-800/90 via-brand-800/75 to-brand-800/50 sm:from-brand-800/85 sm:via-brand-800/55 sm:to-transparent" />

      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 pt-4 sm:px-8">
        <div className="flex items-baseline gap-3">
          <span className="text-xl font-extrabold tracking-tight">Covered</span>
          <span className="text-sm text-brand-200">{AGENCY}</span>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-brand-800/80 py-1 pr-1 pl-3">
          <span className="tabular mr-1 text-lg font-semibold" aria-label="Simulated time">
            {formatClock(sim.sim.now)}
          </span>
          {sim.dayOver ? (
            <button
              type="button"
              onClick={sim.restart}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-white/15 px-3 text-sm font-semibold hover:bg-white/25"
            >
              <RotateCcw className="size-4" aria-hidden /> Restart the day
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => sim.setPlaying(!sim.playing)}
                aria-label={sim.playing ? 'Pause the clock' : 'Start the clock'}
                className="inline-flex size-11 items-center justify-center rounded-lg bg-white/15 hover:bg-white/25"
              >
                {sim.playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
              </button>
              <div className="flex rounded-lg bg-white/15 p-1" role="group" aria-label="Clock speed">
                {([1, 4] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sim.setSpeed(s)}
                    aria-pressed={sim.speed === s}
                    className="tabular h-9 min-w-11 rounded-md px-2 text-sm font-semibold aria-pressed:bg-white aria-pressed:text-brand-800"
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 pt-8 pb-9 sm:px-8 sm:pt-12 sm:pb-12">
        <h1 className="max-w-[18ch] text-[2.1rem] leading-[1.05] font-extrabold tracking-tight text-balance sm:text-[3.4rem]">
          Every open visit, covered before it starts.
        </h1>
        <p className="mt-4 max-w-[52ch] text-base text-brand-100 sm:text-lg">
          When a caregiver calls out, Covered ranks your own team, texts the offer in order, and widens the search as the
          visit gets closer.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <button
            type="button"
            onClick={sim.simulateCallOut}
            disabled={!sim.canCallOut}
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-orange px-5 text-base font-bold text-brand-800 shadow-[0_2px_0_0_var(--urgent-600)] transition-transform hover:bg-urgent-300 active:translate-y-0.5 active:shadow-none disabled:opacity-50"
          >
            <PhoneOff className="size-5" aria-hidden /> Simulate a call-out
          </button>
          <span className="inline-flex items-center gap-2 text-sm text-brand-100">
            <FlaskConical className="size-4" aria-hidden /> Simulated data. One minute passes each second.
          </span>
        </div>
      </div>
    </header>
  )
}
