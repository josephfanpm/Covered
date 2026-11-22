import { Check, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { caregiverOf } from '@/lib/view'
import { AGENCY } from '@/sim/data'
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
    <section aria-labelledby="phone-title">
      <h2 id="phone-title" className="text-lg font-bold text-ink">
        {caregiver.firstName}'s phone
      </h2>
      <div className="mt-3 overflow-hidden rounded-[1.75rem] border-[6px] border-slate-800 bg-surface">
        <div className="border-b bg-slate-100 px-4 py-2.5 text-center text-sm font-bold text-ink">{AGENCY}</div>
        <div ref={scroller} className="flex h-80 flex-col gap-2 overflow-y-auto px-3 py-3" aria-live="polite">
          {thread.length === 0 && <p className="m-auto text-sm text-slate-600">No texts today</p>}
          {thread.map((t) => {
            const mine = t.from === 'caregiver'
            return (
              <div key={t.id} className={`flex max-w-[85%] animate-arrive flex-col ${mine ? 'items-end self-end' : 'items-start self-start'}`}>
                <p className={`rounded-2xl px-3.5 py-2 text-[0.9375rem] leading-snug ${mine ? 'rounded-br-md bg-spruce-700 text-white' : 'rounded-bl-md bg-slate-100 text-ink'}`}>
                  {t.body}
                </p>
                <span className="tabular mt-0.5 px-1 text-xs text-slate-600">{formatClock(t.at)}</span>
              </div>
            )
          })}
        </div>
        <div className="border-t p-3">
          {waiting ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onAnswer(waiting.visitId, caregiverId, true)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-moss-600 text-base font-bold text-white hover:opacity-90"
              >
                <Check className="size-5" aria-hidden /> Reply YES
              </button>
              <button
                type="button"
                onClick={() => onAnswer(waiting.visitId, caregiverId, false)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 text-base font-bold text-ink hover:bg-slate-100"
              >
                <X className="size-5" aria-hidden /> Reply NO
              </button>
            </div>
          ) : (
            <p className="py-3 text-center text-sm text-slate-600">No offer waiting for a reply</p>
          )}
        </div>
      </div>
      {waiting && <p className="mt-2 text-sm text-slate-600">Answer for {caregiver.firstName}, or wait and the simulation will.</p>}
    </section>
  )
}
