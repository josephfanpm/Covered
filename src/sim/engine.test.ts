import { describe, expect, it } from 'vitest'
import { buildWorld, DEMO_START, initialState } from './data'
import { advance, assign, callOut, dayStats, laterTimes, reply, reschedule, stageFor } from './engine'
import { assess, lateLimit, rankCandidates } from './rank'
import type { Caregiver, Client, OpenVisit, SimState, Visit, World } from './types'
import { travelMinutes } from './util'

const cg = (over: Partial<Caregiver>): Caregiver => ({
  id: 'a',
  name: 'Ada Test',
  firstName: 'Ada',
  role: 'HHA',
  branch: 'East',
  home: { x: 8, y: 5 },
  skills: ['Meal prep', 'Bathing'],
  languages: ['English'],
  catAllergy: false,
  shift: { start: 7 * 60, end: 16 * 60 },
  hoursBeforeToday: 20,
  replyRate: 1,
  replyMinutes: 1,
  ...over,
})

const client: Client = {
  id: 'c1',
  name: 'Dorothy Keane',
  branch: 'East',
  home: { x: 9, y: 5 },
  needs: ['Meal prep'],
  language: 'English',
  hasCat: false,
}

const open: Visit = { id: 'v1', clientId: 'c1', start: 10 * 60, end: 12 * 60, caregiverId: null }

const world = (caregivers: Caregiver[], extra: Partial<World> = {}): World => ({
  agency: 'Test',
  caregivers,
  clients: [client, { ...client, id: 'c2', name: 'Far Client', home: { x: 13, y: 9 } }],
  visits: [open],
  priorVisits: {},
  ...extra,
})

const at8 = { now: 8 * 60, widened: false }

describe('ranking', () => {
  it('puts the caregiver who knows the client ahead of a closer stranger', () => {
    const regular = cg({ id: 'regular', home: { x: 12, y: 8 } })
    const neighbour = cg({ id: 'neighbour', home: { x: 9, y: 5 } })
    const w = world([neighbour, regular], { priorVisits: { 'regular|c1': 14 } })
    expect(rankCandidates(w, open, at8).map((c) => c.caregiver.id)).toEqual(['regular', 'neighbour'])
  })

  it('measures travel from the previous visit, not from home', () => {
    const before: Visit = { id: 'v0', clientId: 'c2', start: 8 * 60, end: 9 * 60, caregiverId: 'a' }
    const w = world([cg({})], { visits: [open, before] })
    const result = assess(w, open, w.caregivers[0], at8)
    expect(result.facts.travelMin).toBe(travelMinutes({ x: 13, y: 9 }, client.home))
    expect(result.facts.from).toBe('their 8:00 visit')
  })

  it('rules out an overlapping visit, missing training, a cat allergy and time off', () => {
    const clash: Visit = { id: 'v0', clientId: 'c2', start: 11 * 60, end: 12 * 60, caregiverId: 'busy' }
    const needy: Client = { ...client, needs: ['Lift transfers'], hasCat: true }
    const w = world(
      [cg({ id: 'busy' }), cg({ id: 'untrained' }), cg({ id: 'allergic', skills: ['Lift transfers'], catAllergy: true }), cg({ id: 'off', skills: ['Lift transfers'], shift: null })],
      { clients: [needy, { ...client, id: 'c2' }], visits: [open, clash] },
    )
    const byId = Object.fromEntries(rankCandidates(w, open, at8).map((c) => [c.caregiver.id, c]))
    expect(byId.busy.blockers).toContain('Has a visit at 11:00')
    expect(byId.untrained.blockers).toContain('Not trained for lift transfers')
    expect(byId.allergic.blockers).toContain('Allergic to cats')
    expect(byId.off.blockers).toContain('Unavailable today')
    expect(Object.values(byId).every((c) => !c.eligible)).toBe(true)
  })

  it('keeps overtime and other branches out until the search widens', () => {
    const w = world([cg({ id: 'tired', hoursBeforeToday: 39 }), cg({ id: 'west', branch: 'West' })])
    expect(rankCandidates(w, open, at8).filter((c) => c.eligible)).toHaveLength(0)
    expect(rankCandidates(w, open, { now: 8 * 60, widened: true }).filter((c) => c.eligible)).toHaveLength(2)
  })

  it('lets someone arrive late only when late arrivals are allowed, and only up to the limit', () => {
    const near = world([cg({ home: { x: 13, y: 9 } })])
    const now = 9 * 60 + 50
    const onTimeOnly = assess(near, open, near.caregivers[0], { now, widened: true })
    const late = assess(near, open, near.caregivers[0], { now, widened: true, allowLate: true })
    expect(onTimeOnly.eligible).toBe(false)
    expect(late.eligible).toBe(true)
    expect(late.facts.lateBy).toBeGreaterThan(0)
    expect(late.facts.lateBy).toBeLessThanOrEqual(lateLimit(open))

    const far = world([cg({ home: { x: 0, y: 0 } })])
    expect(assess(far, open, far.caregivers[0], { now: 10 * 60 + 20, widened: true, allowLate: true }).eligible).toBe(false)
  })

  it("rules out someone who can't arrive before the visit starts", () => {
    const w = world([cg({ home: { x: 0, y: 0 } })])
    const result = assess(w, open, w.caregivers[0], { now: 9 * 60 + 50, widened: true })
    expect(result.blockers).toContain("Can't get there in time")
  })
})

describe('offer stages', () => {
  it('speeds up and widens as the visit gets closer', () => {
    expect(stageFor(300)).toMatchObject({ batch: 1, replyWindow: 15, widened: false })
    expect(stageFor(180)).toMatchObject({ batch: 1, replyWindow: 8, widened: false })
    expect(stageFor(90)).toMatchObject({ batch: 2, widened: true })
    expect(stageFor(20)).toMatchObject({ batch: 3, replyWindow: 3, widened: true })
  })
})

describe('the simulated day', () => {
  const start = initialState()
  const openIds = (s: SimState) => s.open.filter((o) => o.status === 'offering' || o.status === 'needs_call')
  /** A visit hours away that at least two people in the branch could take. */
  const roomy = () =>
    start.world.visits.find(
      (v) =>
        v.caregiverId &&
        v.start > start.now + 250 &&
        rankCandidates(start.world, v, { now: start.now, widened: false, calledOut: [...start.open.map((o) => o.calledOutBy), v.caregiverId] }).filter((c) => c.eligible).length >= 2,
    ) as Visit

  it('is the same every time it is built', () => {
    expect(initialState()).toEqual(start)
    expect(buildWorld()).toEqual(buildWorld())
  })

  it('opens at 7:40 with call-outs already in progress', () => {
    expect(start.now).toBe(DEMO_START)
    expect(dayStats(start).covered).toBeGreaterThan(0)
    expect(openIds(start).length).toBeGreaterThan(0)
  })

  it('never double-books a caregiver', () => {
    const end = advance(start, 20 * 60)
    for (const c of end.world.caregivers) {
      const mine = end.world.visits.filter((v) => v.caregiverId === c.id).sort((a, b) => a.start - b.start)
      mine.forEach((v, i) => {
        if (i > 0) expect(mine[i - 1].end).toBeLessThanOrEqual(v.start)
      })
    }
  })

  it('sends one offer at a time when the visit is hours away', () => {
    const target = start.world.visits.find((v) => v.caregiverId && v.start > start.now + 250) as Visit
    const s = callOut(start, target.id)
    const opened = s.open.find((o) => o.visitId === target.id)
    expect(opened?.offers.filter((f) => f.status === 'pending')).toHaveLength(1)
    expect(s.world.visits.find((v) => v.id === target.id)?.caregiverId).toBeNull()
  })

  it('covers the visit and withdraws other offers when someone says yes', () => {
    const target = roomy()
    let s = callOut(start, target.id)
    const offer = s.open.find((o) => o.visitId === target.id)!.offers[0]
    s = reply(s, target.id, offer.caregiverId, true)
    const opened = s.open.find((o) => o.visitId === target.id)
    expect(opened?.status).toBe('covered')
    expect(opened?.offers.some((f) => f.status === 'pending')).toBe(false)
    expect(s.world.visits.find((v) => v.id === target.id)?.caregiverId).toBe(offer.caregiverId)
  })

  it('moves to the next caregiver after a no', () => {
    const target = roomy()
    let s = callOut(start, target.id)
    const first = s.open.find((o) => o.visitId === target.id)!.offers[0].caregiverId
    s = reply(s, target.id, first, false)
    const offers = s.open.find((o) => o.visitId === target.id)!.offers
    expect(offers[0].status).toBe('declined')
    expect(offers.some((f) => f.status === 'pending' && f.caregiverId !== first)).toBe(true)
  })

  it('lets the scheduler assign by hand', () => {
    const waiting = start.open.find((o) => o.status === 'needs_call') as OpenVisit
    const visit = start.world.visits.find((v) => v.id === waiting.visitId) as Visit
    const best = rankCandidates(start.world, visit, { now: start.now, widened: true, calledOut: start.open.map((o) => o.calledOutBy) }).find((c) => c.eligible)
    const s = assign(start, waiting.visitId, best!.caregiver.id)
    expect(s.open.find((o) => o.visitId === waiting.visitId)).toMatchObject({ status: 'covered', coveredVia: 'scheduler' })
  })

  it('tells the client when a visit is at risk, covered or missed', () => {
    const end = advance(start, 20 * 60)
    for (const o of end.open) {
      const said = end.notices.filter((n) => n.visitId === o.visitId).map((n) => n.body)
      if (o.status === 'covered') expect(said.some((b) => b.includes('will be with you') || b.includes('has moved'))).toBe(true)
      if (o.status === 'missed') expect(said.at(-1)).toContain("couldn't arrange")
    }
    const flagged = start.open.find((o) => o.status === 'needs_call') as OpenVisit
    expect(start.notices.some((n) => n.visitId === flagged.visitId && n.body.includes('arranging someone else'))).toBe(true)
  })

  it('can move a flagged visit to a later time with someone who is free then', () => {
    const flagged = start.open.find((o) => o.status === 'needs_call') as OpenVisit
    const before = start.world.visits.find((v) => v.id === flagged.visitId) as Visit
    const option = laterTimes(start, flagged.visitId)[0]
    expect(option.start).toBeGreaterThan(before.start)
    const s = reschedule(start, flagged.visitId, option.caregiverId, option.start)
    const after = s.world.visits.find((v) => v.id === flagged.visitId) as Visit
    expect(after).toMatchObject({ start: option.start, caregiverId: option.caregiverId })
    expect(after.end - after.start).toBe(before.end - before.start)
    expect(s.open.find((o) => o.visitId === flagged.visitId)).toMatchObject({ status: 'covered', coveredVia: 'moved', movedFrom: before.start })
    expect(s.notices.at(-1)?.body).toContain('has moved')
  })

  it('never texts an offer to someone who has called out today', () => {
    const end = advance(start, 20 * 60)
    const calledOut = new Map(end.open.map((o) => [o.calledOutBy, o.openedAt]))
    for (const o of end.open) {
      for (const f of o.offers) {
        const droppedAt = calledOut.get(f.caregiverId)
        if (droppedAt !== undefined) expect(f.sentAt).toBeLessThan(droppedAt)
      }
    }
  })
})
