import type { Caregiver, Client, Minutes, Visit, World } from './types'
import { formatTime, travelMinutes } from './util'

/** Points each factor can contribute. They add up to 100. */
export const WEIGHTS = { continuity: 40, travel: 30, hours: 15, fit: 15 } as const

export const OVERTIME_HOURS = 40
/** The latest a replacement may arrive once late arrivals are allowed. */
export const LATE_LIMIT = 45

/** How late a replacement can be for this visit: never more than 45 minutes, and always leaving at least half an hour of care. */
export function lateLimit(visit: Visit): Minutes {
  return Math.max(0, Math.min(LATE_LIMIT, visit.end - visit.start - 30))
}

/** Travel longer than this scores zero for the travel factor. */
const TRAVEL_CEILING = 45

export interface Candidate {
  caregiver: Caregiver
  eligible: boolean
  /** Why they can't take the visit. Empty when eligible. */
  blockers: string[]
  score: number
  parts: { continuity: number; travel: number; hours: number; fit: number }
  facts: {
    priorVisits: number
    travelMin: Minutes
    /** Where they would be coming from. */
    from: string
    /** Minutes after the start time they would arrive. Zero when on time. */
    lateBy: Minutes
    hoursAfter: number
    overtime: boolean
    otherBranch: boolean
    speaksLanguage: boolean
  }
}

export interface RankOptions {
  now: Minutes
  /** Late in the day the search widens: other branches and overtime are allowed. */
  widened: boolean
  /** Caregivers who have called out today. They aren't offered other visits the same day. */
  calledOut?: string[]
  /** Close to the start, arriving late is better than nobody arriving. */
  allowLate?: boolean
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

export function priorVisitCount(world: World, caregiverId: string, clientId: string): number {
  return world.priorVisits[`${caregiverId}|${clientId}`] ?? 0
}

export function hoursToday(world: World, caregiverId: string): number {
  return world.visits
    .filter((v) => v.caregiverId === caregiverId)
    .reduce((sum, v) => sum + (v.end - v.start) / 60, 0)
}

/** Scores one caregiver for one open visit, and lists anything that rules them out. */
export function assess(world: World, visit: Visit, caregiver: Caregiver, opts: RankOptions): Candidate {
  const client = world.clients.find((c) => c.id === visit.clientId) as Client
  const clientOf = (v: Visit) => world.clients.find((c) => c.id === v.clientId) as Client
  const blockers: string[] = []

  const theirs = world.visits
    .filter((v) => v.caregiverId === caregiver.id && v.id !== visit.id)
    .sort((a, b) => a.start - b.start)
  const overlap = theirs.find((v) => v.start < visit.end && v.end > visit.start)
  const before = [...theirs].reverse().find((v) => v.end <= visit.start)
  const after = theirs.find((v) => v.start >= visit.end)

  const fromPoint = before ? clientOf(before).home : caregiver.home
  const travelMin = travelMinutes(fromPoint, client.home)
  const from = before ? `their ${formatTime(before.start)} visit` : 'home'

  if (opts.calledOut?.includes(caregiver.id)) blockers.push('Called out today')

  if (!caregiver.shift) {
    blockers.push('Unavailable today')
  } else if (visit.start < caregiver.shift.start || visit.end > caregiver.shift.end) {
    blockers.push(`Works ${formatTime(caregiver.shift.start)}–${formatTime(caregiver.shift.end)} today`)
  }

  let lateBy = 0
  if (overlap) {
    blockers.push(`Has a visit at ${formatTime(overlap.start)}`)
  } else {
    const freeFrom = before ? before.end : opts.now
    lateBy = Math.max(0, Math.max(freeFrom, opts.now) + travelMin - visit.start)
    if (lateBy > 0 && !(opts.allowLate && lateBy <= lateLimit(visit))) {
      blockers.push(before ? `Can't get there from their ${formatTime(before.start)} visit in time` : "Can't get there in time")
    }
    if (after && visit.end + travelMinutes(client.home, clientOf(after).home) > after.start) {
      blockers.push(`Would be late for their ${formatTime(after.start)} visit`)
    }
  }

  const missing = client.needs.filter((need) => !caregiver.skills.includes(need))
  if (missing.length > 0) blockers.push(`Not trained for ${missing.join(', ').toLowerCase()}`)
  if (client.hasCat && caregiver.catAllergy) blockers.push('Allergic to cats')

  const otherBranch = caregiver.branch !== client.branch
  if (otherBranch && !opts.widened) blockers.push(`${caregiver.branch} branch`)

  const hoursAfter = caregiver.hoursBeforeToday + hoursToday(world, caregiver.id) + (visit.end - visit.start) / 60
  const overtime = hoursAfter > OVERTIME_HOURS
  if (overtime && !opts.widened) blockers.push(`Would reach ${Math.round(hoursAfter)} hours this week`)

  const priorVisits = priorVisitCount(world, caregiver.id, client.id)
  const speaksLanguage = caregiver.languages.includes(client.language)

  const parts = {
    // Rises quickly over the first few visits, then levels off: 1 visit ≈ 9, 4 ≈ 25, 12 ≈ 38.
    continuity: WEIGHTS.continuity * (1 - Math.exp(-priorVisits / 4)),
    travel: WEIGHTS.travel * clamp01(1 - travelMin / TRAVEL_CEILING),
    // Full marks at 24 hours or fewer this week, none at 40.
    hours: WEIGHTS.hours * clamp01((OVERTIME_HOURS - hoursAfter) / 16),
    fit: speaksLanguage ? WEIGHTS.fit : 0,
  }
  // Every minute late costs a point, so on-time caregivers are asked first.
  const score = Math.max(0, Math.round(parts.continuity + parts.travel + parts.hours + parts.fit - lateBy))

  return {
    caregiver,
    eligible: blockers.length === 0,
    blockers,
    score,
    parts,
    facts: { priorVisits, travelMin, from, lateBy, hoursAfter, overtime, otherBranch, speaksLanguage },
  }
}

/** Every caregiver assessed for the visit: eligible ones first, best score first. */
export function rankCandidates(world: World, visit: Visit, opts: RankOptions): Candidate[] {
  return world.caregivers
    .map((c) => assess(world, visit, c, opts))
    .sort(
      (a, b) =>
        Number(b.eligible) - Number(a.eligible) || b.score - a.score || a.caregiver.id.localeCompare(b.caregiver.id),
    )
}
