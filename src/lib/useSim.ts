import { useCallback, useEffect, useMemo, useState } from 'react'
import { DAY_END, initialState, nextCallOutTarget } from '@/sim/data'
import { advance, assign, callOut, reply } from '@/sim/engine'
import type { OpenVisit, SimState } from '@/sim/types'

export type Speed = 1 | 4

const isActive = (o: OpenVisit) => o.status === 'offering' || o.status === 'needs_call'

/** The open visit a scheduler would look at first: the one starting soonest that still needs someone. */
function mostUrgent(sim: SimState): string | null {
  const startOf = (o: OpenVisit) => sim.world.visits.find((v) => v.id === o.visitId)?.start ?? 0
  const active = sim.open.filter(isActive).sort((a, b) => startOf(a) - startOf(b))
  return active[0]?.visitId ?? sim.open[sim.open.length - 1]?.visitId ?? null
}

/** Holds the simulated day and moves its clock: one simulated minute per second at 1×. */
export function useSim() {
  const [sim, setSim] = useState<SimState>(() => initialState())
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState<Speed>(1)
  const [selectedId, setSelectedId] = useState<string | null>(() => mostUrgent(initialState()))
  const [phoneId, setPhoneId] = useState<string | null>(null)

  const dayOver = sim.now >= DAY_END

  useEffect(() => {
    if (!playing || dayOver) return
    const timer = setInterval(() => setSim((s) => advance(s, s.now + 1)), 1000 / speed)
    return () => clearInterval(timer)
  }, [playing, speed, dayOver])

  const select = useCallback((visitId: string) => {
    setSelectedId(visitId)
    setPhoneId(null)
  }, [])

  const canCallOut = useMemo(() => !dayOver && nextCallOutTarget(sim) !== undefined, [sim, dayOver])

  const simulateCallOut = useCallback(() => {
    const target = nextCallOutTarget(sim)
    if (!target) return
    setSim(callOut(sim, target.id))
    setSelectedId(target.id)
    setPhoneId(null)
  }, [sim])

  const answer = useCallback(
    (visitId: string, caregiverId: string, yes: boolean) => setSim((s) => reply(s, visitId, caregiverId, yes)),
    [],
  )

  const assignByHand = useCallback(
    (visitId: string, caregiverId: string) => {
      setSim((s) => assign(s, visitId, caregiverId))
      setPhoneId(caregiverId)
    },
    [],
  )

  const restart = useCallback(() => {
    const fresh = initialState()
    setSim(fresh)
    setSelectedId(mostUrgent(fresh))
    setPhoneId(null)
    setPlaying(true)
  }, [])

  return {
    sim,
    playing,
    speed,
    dayOver,
    selectedId,
    phoneId,
    canCallOut,
    setPlaying,
    setSpeed,
    select,
    setPhoneId,
    simulateCallOut,
    answer,
    assignByHand,
    restart,
  }
}

export type Sim = ReturnType<typeof useSim>
