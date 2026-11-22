import { useEffect, useRef } from 'react'
import { Phone } from '@/components/Phone'
import { TopBar } from '@/components/TopBar'
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
      <TopBar sim={sim} />
      <main className="mx-auto grid max-w-[1440px] gap-6 px-4 pt-6 pb-16 sm:px-8 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_320px]">
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
              onMove={(caregiverId, start) => sim.move(open.visitId, caregiverId, start)}
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
      </main>
    </div>
  )
}
