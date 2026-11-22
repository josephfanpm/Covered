import type { Caregiver, Client, OpenVisit, SimState, Visit } from '@/sim/types'
import { formatWait } from '@/sim/util'

export const visitOf = (sim: SimState, id: string) => sim.world.visits.find((v) => v.id === id) as Visit
export const clientOf = (sim: SimState, visit: Visit) => sim.world.clients.find((c) => c.id === visit.clientId) as Client
export const caregiverOf = (sim: SimState, id: string) => sim.world.caregivers.find((c) => c.id === id) as Caregiver

export const isActive = (o: OpenVisit) => o.status === 'offering' || o.status === 'needs_call'

export type Tone = 'working' | 'urgent' | 'good' | 'bad'

/** One line that says where an open visit stands. */
export function statusOf(sim: SimState, open: OpenVisit): { tone: Tone; text: string } {
  const pending = open.offers.filter((f) => f.status === 'pending').map((f) => caregiverOf(sim, f.caregiverId).firstName)
  if (open.status === 'covered') {
    const who = caregiverOf(sim, open.coveredBy as string).name
    return { tone: 'good', text: `Covered by ${who} in ${formatWait((open.coveredAt as number) - open.openedAt)}` }
  }
  if (open.status === 'missed') return { tone: 'bad', text: 'Missed. Nobody confirmed in time.' }
  if (open.status === 'needs_call') {
    return { tone: 'urgent', text: pending.length ? `Phone needed. Still texting ${pending.join(', ')}.` : 'Phone needed' }
  }
  return { tone: 'working', text: pending.length ? `Texting ${pending.join(', ')}` : 'Finding the next caregiver' }
}

/** Whose phone to show for a visit when nobody has been picked: whoever is being asked right now. */
export function defaultPhone(open: OpenVisit): string {
  const pending = open.offers.find((f) => f.status === 'pending')
  return pending?.caregiverId ?? open.coveredBy ?? open.offers[open.offers.length - 1]?.caregiverId ?? open.calledOutBy
}
