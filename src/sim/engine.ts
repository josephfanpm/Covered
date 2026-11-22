import { assess, lateLimit, rankCandidates } from './rank'
import type { Caregiver, Client, LogEntry, Minutes, Offer, OpenVisit, SimState, Visit } from './types'
import { formatClock, formatRange, formatTime, hashUnit } from './util'

/** How the offers change as the visit gets closer. */
export interface Stage {
  key: 'steady' | 'quick' | 'wide' | 'urgent'
  label: string
  /** Applies while the visit is more than this many minutes away. */
  fromMinutesOut: number
  /** How many caregivers hold an offer at once. */
  batch: number
  /** Minutes each caregiver gets to reply. */
  replyWindow: number
  /** Other branches and overtime allowed. */
  widened: boolean
}

export const STAGES: Stage[] = [
  { key: 'steady', label: 'One at a time, 15 min to reply', fromMinutesOut: 240, batch: 1, replyWindow: 15, widened: false },
  { key: 'quick', label: 'One at a time, 8 min to reply', fromMinutesOut: 120, batch: 1, replyWindow: 8, widened: false },
  { key: 'wide', label: 'Two at a time, any branch, overtime allowed', fromMinutesOut: 60, batch: 2, replyWindow: 5, widened: true },
  { key: 'urgent', label: 'Three at a time, 3 min to reply', fromMinutesOut: 0, batch: 3, replyWindow: 3, widened: true },
]

/** Inside this many minutes with nobody confirmed, the scheduler is told to phone. */
export const CALL_THRESHOLD = 30

export function stageFor(minutesToStart: Minutes): Stage {
  return STAGES.find((s) => minutesToStart > s.fromMinutesOut) ?? STAGES[STAGES.length - 1]
}

const visitOf = (s: SimState, id: string) => s.world.visits.find((v) => v.id === id) as Visit
const clientOf = (s: SimState, v: Visit) => s.world.clients.find((c) => c.id === v.clientId) as Client
const caregiverOf = (s: SimState, id: string) => s.world.caregivers.find((c) => c.id === id) as Caregiver

function text(s: SimState, caregiverId: string, visitId: string, from: 'agency' | 'caregiver', body: string) {
  s.texts.push({ id: s.nextTextId++, caregiverId, visitId, at: s.now, from, body })
}

/** Tells the client or their family what is happening with their visit. */
function notify(s: SimState, visitId: string, body: string) {
  s.notices.push({ at: s.now, visitId, body })
}

function log(s: SimState, visitId: string, kind: LogEntry['kind'], body: string) {
  s.log.push({ at: s.now, visitId, kind, text: body })
}

/** Chance a caregiver says yes, from how good the match is. A simulation assumption, not a measured rate. */
export function acceptChance(score: number): number {
  return 0.08 + 0.5 * (score / 100)
}

/** Everyone who has dropped a visit today. */
export function calledOutToday(s: SimState): string[] {
  return s.open.map((o) => o.calledOutBy)
}

function hasPendingElsewhere(s: SimState, caregiverId: string, visitId: string): boolean {
  return s.open.some(
    (o) => o.visitId !== visitId && o.offers.some((f) => f.caregiverId === caregiverId && f.status === 'pending'),
  )
}

function sendOffers(s: SimState, open: OpenVisit, stage: Stage, count: number): number {
  const visit = visitOf(s, open.visitId)
  const client = clientOf(s, visit)
  const already = new Set(open.offers.map((f) => f.caregiverId))
  const allowLate = open.status === 'needs_call'
  const picks = rankCandidates(s.world, visit, { now: s.now, widened: stage.widened, calledOut: calledOutToday(s), allowLate })
    .filter((c) => c.eligible && !already.has(c.caregiver.id) && !hasPendingElsewhere(s, c.caregiver.id, open.visitId))
    .slice(0, count)
  if (picks.length === 0) return 0

  open.wave += 1
  for (const pick of picks) {
    const cg = pick.caregiver
    const replyBy = Math.min(s.now + stage.replyWindow, visit.start + (allowLate ? lateLimit(visit) : 0))
    const replies = hashUnit(s.seed, 'replies', open.visitId, cg.id) < cg.replyRate
    const delay = 1 + Math.floor(hashUnit(s.seed, 'delay', open.visitId, cg.id) * cg.replyMinutes * 2)
    const yes = hashUnit(s.seed, 'yes', open.visitId, cg.id) < acceptChance(pick.score)
    const offer: Offer = {
      caregiverId: cg.id,
      wave: open.wave,
      score: pick.score,
      sentAt: s.now,
      replyBy,
      status: 'pending',
      planned: replies && s.now + delay < replyBy ? { at: s.now + delay, yes } : null,
    }
    open.offers.push(offer)

    const known =
      pick.facts.priorVisits > 0
        ? ` You've seen ${client.name.split(' ')[0]} ${pick.facts.priorVisits} ${pick.facts.priorVisits === 1 ? 'time' : 'times'}.`
        : ''
    const late = pick.facts.lateBy > 0 ? ` You'd arrive about ${pick.facts.lateBy} min late, and we'll let them know.` : ''
    text(
      s,
      cg.id,
      open.visitId,
      'agency',
      `Hi ${cg.firstName}, can you cover a visit today with ${client.name}, ${formatRange(visit.start, visit.end)}?${known} It's ${pick.facts.travelMin} min from ${pick.facts.from}.${late} Reply YES or NO by ${formatClock(replyBy)}.`,
    )
    log(s, open.visitId, 'offer', `Offered to ${cg.name}`)
  }
  return picks.length
}

function cover(s: SimState, open: OpenVisit, caregiverId: string, via: 'offer' | 'scheduler' | 'moved') {
  const visit = visitOf(s, open.visitId)
  const client = clientOf(s, visit)
  const cg = caregiverOf(s, caregiverId)
  const original = caregiverOf(s, open.calledOutBy)
  const lateBy = assess(s.world, visit, cg, { now: s.now, widened: true, allowLate: true }).facts.lateBy
  if (lateBy > 0) open.lateBy = lateBy
  visit.caregiverId = caregiverId
  open.status = 'covered'
  open.coveredBy = caregiverId
  open.coveredAt = s.now
  open.coveredVia = via

  for (const offer of open.offers) {
    if (offer.caregiverId === caregiverId) {
      offer.status = 'accepted'
      offer.respondedAt = s.now
    } else if (offer.status === 'pending') {
      offer.status = 'withdrawn'
      text(s, offer.caregiverId, open.visitId, 'agency', `Thanks, the ${formatTime(open.movedFrom ?? visit.start)} visit is now covered.`)
    }
  }
  text(
    s,
    caregiverId,
    open.visitId,
    'agency',
    `You're confirmed for ${client.name}, ${formatRange(visit.start, visit.end)}. ${lateBy > 0 ? 'Please head over now.' : "It's on your schedule now."}`,
  )
  const first = client.name.split(' ')[0]
  if (via === 'moved') {
    notify(s, open.visitId, `Hi ${first}, your visit today has moved to ${formatRange(visit.start, visit.end)} with ${cg.firstName}.`)
    log(s, open.visitId, 'covered', `Moved to ${formatClock(visit.start)} with ${cg.name}`)
  } else {
    const when = lateBy > 0 ? `around ${formatClock(visit.start + lateBy)}, a little later than planned` : `at ${formatClock(visit.start)}`
    notify(s, open.visitId, `Hi ${first}, ${cg.firstName} will be with you today ${when}, in place of ${original.firstName}.`)
    log(s, open.visitId, 'covered', via === 'offer' ? `Covered by ${cg.name}` : `Assigned to ${cg.name} by the scheduler`)
  }

  // Their other pending offers may no longer fit around this visit.
  for (const other of s.open) {
    if (other.visitId === open.visitId) continue
    const pending = other.offers.find((f) => f.caregiverId === caregiverId && f.status === 'pending')
    if (!pending) continue
    const otherVisit = visitOf(s, other.visitId)
    if (!assess(s.world, otherVisit, cg, { now: s.now, widened: true }).eligible) {
      pending.status = 'withdrawn'
      text(s, caregiverId, other.visitId, 'agency', `No need to reply about the ${formatTime(otherVisit.start)} visit. It no longer fits your day.`)
    }
  }
}

function decline(s: SimState, open: OpenVisit, offer: Offer) {
  offer.status = 'declined'
  offer.respondedAt = s.now
  text(s, offer.caregiverId, open.visitId, 'caregiver', 'NO')
  text(s, offer.caregiverId, open.visitId, 'agency', 'No problem. Thanks for the quick reply.')
  log(s, open.visitId, 'no', `${caregiverOf(s, offer.caregiverId).name} said no`)
}

function accept(s: SimState, open: OpenVisit, offer: Offer) {
  text(s, offer.caregiverId, open.visitId, 'caregiver', 'YES')
  log(s, open.visitId, 'yes', `${caregiverOf(s, offer.caregiverId).name} said yes`)
  cover(s, open, offer.caregiverId, 'offer')
}

/** Moves one open visit forward to the current minute. */
function stepVisit(s: SimState, open: OpenVisit) {
  if (open.status === 'covered' || open.status === 'missed') return
  const visit = visitOf(s, open.visitId)

  // A visit is only missed once nobody could still arrive late enough to be useful.
  if (s.now >= visit.start + lateLimit(visit)) {
    open.status = 'missed'
    for (const offer of open.offers) if (offer.status === 'pending') offer.status = 'expired'
    const client = clientOf(s, visit)
    notify(s, open.visitId, `Hi ${client.name.split(' ')[0]}, we're sorry, we couldn't arrange your ${formatClock(visit.start)} visit today. The office will call you now.`)
    log(s, open.visitId, 'missed', 'Nobody confirmed in time')
    return
  }

  for (const offer of open.offers) {
    if (offer.status !== 'pending') continue
    if (offer.planned && offer.planned.at <= s.now) {
      if (offer.planned.yes) {
        accept(s, open, offer)
        return
      }
      decline(s, open, offer)
    } else if (offer.replyBy <= s.now) {
      offer.status = 'expired'
      log(s, open.visitId, 'expired', `No reply from ${caregiverOf(s, offer.caregiverId).name}`)
    }
  }

  const minutesOut = visit.start - s.now
  const stage = stageFor(minutesOut)
  const pending = open.offers.filter((f) => f.status === 'pending').length
  const hadWidened = s.log.some((l) => l.visitId === open.visitId && l.kind === 'widened')
  if (stage.widened && !hadWidened) log(s, open.visitId, 'widened', 'Search widened to any branch and overtime')

  let sent = pending < stage.batch ? sendOffers(s, open, stage, stage.batch - pending) : 0
  // If the branch has run out of people early, widen now instead of waiting for the clock.
  if (sent === 0 && pending === 0 && !stage.widened) {
    sent = sendOffers(s, open, { ...stage, widened: true }, stage.batch)
    if (sent > 0 && !hadWidened) log(s, open.visitId, 'widened', 'Nobody left in the branch. Search widened early.')
  }
  const nobodyLeft = pending === 0 && sent === 0

  if (open.status === 'offering' && (minutesOut <= CALL_THRESHOLD || nobodyLeft)) {
    open.status = 'needs_call'
    const client = clientOf(s, visit)
    notify(
      s,
      open.visitId,
      `Hi ${client.name.split(' ')[0]}, ${caregiverOf(s, open.calledOutBy).firstName} can't make your ${formatClock(visit.start)} visit today. We're arranging someone else and will confirm shortly.`,
    )
    log(s, open.visitId, 'call', nobodyLeft ? 'Nobody left to text. Phone needed.' : `Under ${CALL_THRESHOLD} minutes out. Phone needed.`)
  }
}

function clone(s: SimState): SimState {
  return structuredClone(s)
}

/** Runs the day forward one minute at a time. Returns a new state. */
export function advance(state: SimState, to: Minutes): SimState {
  if (to <= state.now) return state
  const s = clone(state)
  while (s.now < to) {
    s.now += 1
    for (const open of s.open) stepVisit(s, open)
  }
  return s
}

/** A caregiver drops a visit. It opens straight away and the first offer goes out. */
export function callOut(state: SimState, visitId: string): SimState {
  const s = clone(state)
  const visit = visitOf(s, visitId)
  if (!visit.caregiverId || s.open.some((o) => o.visitId === visitId)) return state
  const cg = caregiverOf(s, visit.caregiverId)
  const client = clientOf(s, visit)
  const open: OpenVisit = { visitId, calledOutBy: cg.id, openedAt: s.now, status: 'offering', wave: 0, offers: [] }
  visit.caregiverId = null
  s.open.push(open)
  s.calloutCount += 1
  text(s, cg.id, visitId, 'caregiver', `I can't make my ${formatTime(visit.start)} with ${client.name} today. Sorry.`)
  text(s, cg.id, visitId, 'agency', "Thanks for telling us. We'll get it covered.")
  log(s, visitId, 'callout', `${cg.name} called out`)
  stepVisit(s, open)
  return s
}

/** A reply typed on the phone, ahead of whatever the simulation had planned. */
export function reply(state: SimState, visitId: string, caregiverId: string, yes: boolean): SimState {
  const s = clone(state)
  const open = s.open.find((o) => o.visitId === visitId)
  const offer = open?.offers.find((f) => f.caregiverId === caregiverId && f.status === 'pending')
  if (!open || !offer) return state
  if (yes) accept(s, open, offer)
  else {
    decline(s, open, offer)
    stepVisit(s, open)
  }
  return s
}

/** The scheduler picks someone by hand, for example after phoning them. */
export function assign(state: SimState, visitId: string, caregiverId: string): SimState {
  const s = clone(state)
  const open = s.open.find((o) => o.visitId === visitId)
  if (!open || open.status === 'covered' || open.status === 'missed') return state
  cover(s, open, caregiverId, 'scheduler')
  return s
}

/** The latest a visit can be moved to on the same day. */
const LAST_END: Minutes = 20 * 60

export interface LaterOption {
  caregiverId: string
  start: Minutes
  end: Minutes
  priorVisits: number
}

/**
 * Later times today when someone could take the visit, one per caregiver, earliest first.
 * Caregivers the client already knows come ahead of strangers.
 */
export function laterTimes(s: SimState, visitId: string, limit = 2): LaterOption[] {
  const visit = visitOf(s, visitId)
  const length = visit.end - visit.start
  const calledOut = calledOutToday(s)
  const firstSlot = Math.ceil((Math.max(visit.start, s.now) + 60) / 30) * 30
  const options: LaterOption[] = []
  for (const cg of s.world.caregivers) {
    for (let start = firstSlot; start + length <= LAST_END; start += 30) {
      const moved = { ...visit, start, end: start + length }
      const c = assess(s.world, moved, cg, { now: s.now, widened: true, calledOut })
      if (c.eligible) {
        options.push({ caregiverId: cg.id, start, end: start + length, priorVisits: c.facts.priorVisits })
        break
      }
    }
  }
  return options
    .sort(
      (a, b) =>
        Number(b.priorVisits > 0) - Number(a.priorVisits > 0) ||
        a.start - b.start ||
        b.priorVisits - a.priorVisits ||
        a.caregiverId.localeCompare(b.caregiverId),
    )
    .slice(0, limit)
}

/** Moves the visit to a later time today with a caregiver who is free then. The scheduler agrees it with the client by phone first. */
export function reschedule(state: SimState, visitId: string, caregiverId: string, start: Minutes): SimState {
  const s = clone(state)
  const open = s.open.find((o) => o.visitId === visitId)
  if (!open || open.status === 'covered' || open.status === 'missed') return state
  const visit = visitOf(s, visitId)
  const moved = { ...visit, start, end: start + (visit.end - visit.start) }
  if (!assess(s.world, moved, caregiverOf(s, caregiverId), { now: s.now, widened: true, calledOut: calledOutToday(s) }).eligible) return state
  open.movedFrom = visit.start
  visit.start = moved.start
  visit.end = moved.end
  cover(s, open, caregiverId, 'moved')
  return s
}

export interface DayStats {
  callouts: number
  covered: number
  open: number
  needsCall: number
  missed: number
  /** Covered as a share of call-outs that are already decided (covered or missed). */
  fillRate: number | null
  minutesToCover: number[]
}

export function dayStats(s: SimState): DayStats {
  const covered = s.open.filter((o) => o.status === 'covered')
  const missed = s.open.filter((o) => o.status === 'missed').length
  const decided = covered.length + missed
  return {
    callouts: s.open.length,
    covered: covered.length,
    open: s.open.filter((o) => o.status === 'offering' || o.status === 'needs_call').length,
    needsCall: s.open.filter((o) => o.status === 'needs_call').length,
    missed,
    fillRate: decided === 0 ? null : covered.length / decided,
    minutesToCover: covered.map((o) => (o.coveredAt as Minutes) - o.openedAt),
  }
}
