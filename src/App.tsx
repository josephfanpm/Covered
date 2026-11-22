import { useEffect, useRef } from 'react'
import { Band } from '@/components/Band'
import { Phone } from '@/components/Phone'
import { Stats } from '@/components/Stats'
import { VisitDetail } from '@/components/VisitDetail'
import { VisitList } from '@/components/VisitList'
import { useSim } from '@/lib/useSim'
import { defaultPhone } from '@/lib/view'

export default function App() {
  const sim = useSim()
  const open = sim.sim.open.find((o) => o.visitId === sim.selectedId) ?? null
  const phoneCaregiver = open ? (sim.phoneId ?? defaultPhone(open)) : null

  // On a phone the detail sits below the list, so bring it into view when a visit is picked.
  const detail = useRef<HTMLDivElement>(null)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (window.matchMedia('(max-width: 1023px)').matches) {
      detail.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [sim.selectedId])

  return (
    <div className="min-h-dvh">
      <Band sim={sim} />
      <main className="mx-auto max-w-[1440px] px-4 pt-6 pb-16 sm:px-8 sm:pt-8">
        <Stats sim={sim.sim} />
        <div className="mt-8 grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_340px]">
          <VisitList sim={sim.sim} selectedId={sim.selectedId} onSelect={sim.select} />
          <div ref={detail} className="scroll-mt-4">
            {open ? (
              <VisitDetail
                key={open.visitId}
                sim={sim.sim}
                open={open}
                phoneId={phoneCaregiver}
                onShowTexts={sim.setPhoneId}
                onAssign={(caregiverId) => sim.assignByHand(open.visitId, caregiverId)}
              />
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-slate-600">Pick a visit to see who can take it.</p>
            )}
          </div>
          {open && phoneCaregiver && (
            <div className="lg:col-start-2 xl:col-start-3">
              <Phone sim={sim.sim} caregiverId={phoneCaregiver} onAnswer={sim.answer} />
            </div>
          )}
        </div>
      </main>
      <footer className="border-t">
        <p className="mx-auto max-w-[1440px] px-4 py-6 text-sm text-slate-600 sm:px-8">
          Covered is a prototype. The agency, caregivers, clients and visits are invented, and the numbers describe this simulated day only.
        </p>
      </footer>
    </div>
  )
}
