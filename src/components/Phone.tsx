import { Check, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { caregiverOf } from '@/lib/view'
import type { SimState } from '@/sim/types'
import { formatClock } from '@/sim/util'

/** A caregiver's phone: the texts they have had today, and YES / NO when an offer is waiting. */
export function Phone({
  sim,
  caregiverId,
  onAnswer,
}: {
  sim: SimState
  caregiverId: string
  onAnswer: (visitId: string, caregiverId: string, yes: boolean) => void
}) {
  const caregiver = caregiverOf(sim, caregiverId)
  const thread = sim.texts.filter((t) => t.caregiverId === caregiverId)
  const waiting = sim.open.find((o) => o.offers.some((f) => f.caregiverId === caregiverId && f.status === 'pending'))
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [thread.length, caregiverId])

  return (
    <section aria-labelledby="phone-title" className="overflow-hidden rounded-[1.75rem] border-[5px] border-slate-800 bg-surface">
      <h2 id="phone-title" className="border-b px-4 py-2.5 text-center text-sm font-bold text-ink">
        {caregiver.firstName}'s phone
      </h2>
      <div ref={scroller} className="flex max-h-80 min-h-48 flex-col gap-2 overflow-y-auto px-3 py-3" aria-live="polite">
        {thread.length === 0 && <p className="m-auto text-sm text-slate-600">No texts today</p>}
        {thread.map((t) => {
          const mine = t.from === 'caregiver'
          return (
            <div key={t.id} className={`flex max-w-[85%] animate-arrive flex-col ${mine ? 'items-end self-end' : 'items-start self-start'}`}>
              <p className={`rounded-2xl px-3.5 py-2 text-[0.9375rem] leading-snug ${mine ? 'rounded-br-md bg-brand-500 text-white' : 'rounded-bl-md bg-slate-100 text-ink'}`}>
                {t.body}
              </p>
              <span className="tabular mt-0.5 px-1 text-xs text-slate-600">{formatClock(t.at)}</span>
            </div>
          )
        })}
      </div>
      {waiting && (
        <div className="grid grid-cols-2 gap-2 border-t p-3">
          <button
            type="button"
            onClick={() => onAnswer(waiting.visitId, caregiverId, true)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-good-600 text-base font-bold text-white hover:opacity-90"
          >
            <Check className="size-5" aria-hidden /> YES
          </button>
          <button
            type="button"
            onClick={() => onAnswer(waiting.visitId, caregiverId, false)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 text-base font-bold text-ink hover:bg-slate-100"
          >
            <X className="size-5" aria-hidden /> NO
          </button>
        </div>
      )}
    </section>
  )
}
