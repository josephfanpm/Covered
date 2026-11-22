/** Minutes since midnight on the simulated day. */
export type Minutes = number

/** A point on an invented city grid, in kilometres. No real places are used. */
export interface Point {
  x: number
  y: number
}

export type Branch = 'East' | 'West'

export type Skill =
  | 'Lift transfers'
  | 'Dementia care'
  | 'Medication reminders'
  | 'Catheter care'
  | 'Bathing'
  | 'Meal prep'

export type Language = 'English' | 'Spanish' | 'Mandarin' | 'Tagalog' | 'Portuguese'

export interface Caregiver {
  id: string
  name: string
  firstName: string
  role: 'HHA' | 'CNA' | 'LPN'
  branch: Branch
  home: Point
  skills: Skill[]
  languages: Language[]
  catAllergy: boolean
  /** Hours they can work today, or null if they marked themselves unavailable. */
  shift: { start: Minutes; end: Minutes } | null
  /** Hours already worked this week before today. */
  hoursBeforeToday: number
  /** Simulated behaviour: how often they answer a text, and how quickly. */
  replyRate: number
  replyMinutes: number
}

export interface Client {
  id: string
  name: string
  branch: Branch
  home: Point
  needs: Skill[]
  language: Language
  hasCat: boolean
}

export interface Visit {
  id: string
  clientId: string
  start: Minutes
  end: Minutes
  caregiverId: string | null
}

export interface World {
  agency: string
  caregivers: Caregiver[]
  clients: Client[]
  visits: Visit[]
  /** Visits in the last 90 days, keyed by `${caregiverId}|${clientId}`. */
  priorVisits: Record<string, number>
}

export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'withdrawn'

export interface Offer {
  caregiverId: string
  wave: number
  score: number
  sentAt: Minutes
  replyBy: Minutes
  status: OfferStatus
  respondedAt?: Minutes
  /** The reply the simulation will give if nobody answers on the phone first. */
  planned: { at: Minutes; yes: boolean } | null
}

export type OpenStatus = 'offering' | 'needs_call' | 'covered' | 'missed'

export interface OpenVisit {
  visitId: string
  calledOutBy: string
  openedAt: Minutes
  status: OpenStatus
  wave: number
  offers: Offer[]
  coveredBy?: string
  coveredAt?: Minutes
  /** How it was covered: a text offer, or the scheduler assigning by hand. */
  coveredVia?: 'offer' | 'scheduler'
}

export interface TextMessage {
  id: number
  caregiverId: string
  visitId: string
  at: Minutes
  from: 'agency' | 'caregiver'
  body: string
}

export interface LogEntry {
  at: Minutes
  visitId: string
  kind: 'callout' | 'offer' | 'yes' | 'no' | 'expired' | 'covered' | 'widened' | 'call' | 'missed'
  text: string
}

export interface SimState {
  seed: number
  now: Minutes
  world: World
  open: OpenVisit[]
  texts: TextMessage[]
  log: LogEntry[]
  nextTextId: number
  calloutCount: number
}
