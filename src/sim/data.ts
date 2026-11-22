import { advance, callOut } from './engine'
import type { Branch, Caregiver, Client, Language, Minutes, SimState, Skill, Visit, World } from './types'
import { seeded, travelMinutes } from './util'

// Everything in this file is invented. No real agency, caregiver or client data is used.

export const AGENCY = 'Wrenfield Home Care'
export const DAY_START: Minutes = 6 * 60
export const DEMO_START: Minutes = 7 * 60 + 40
export const DAY_END: Minutes = 21 * 60
const SEED = 3227

const CAREGIVER_NAMES = [
  'Amara Okafor', 'Luis Herrera', 'Mei Chen', 'Grace Tolentino', 'Daniela Souza', 'Hannah Whitlock',
  'Marcus Bell', 'Priya Nair', 'Rosa Jimenez', 'Tomasz Nowak', 'Angela Reyes', 'Kwame Mensah',
  'Sofia Almeida', 'Jin Park', 'Fatima Rahman', 'Carlos Vega', 'Ling Zhao', 'Naomi Adler',
  'Isabel Cruz', 'Devon Carter', 'Maribel Santos', 'Ruth Abara', 'Elena Petrova', 'Joy Bautista',
  'Andre Lima', 'Yan Liu', 'Camila Ortiz', 'Beth Larkin', 'Samuel Otieno', 'Teresa Molina',
]

const CLIENT_NAMES = [
  'Dorothy Keane', 'Walter Briggs', 'Elena Marquez', 'Harold Finch', 'Wei Zhang', 'Margaret Doyle',
  'Rafael Pinto', 'Edith Sorensen', 'Lourdes Ramos', 'Frank Abbott', 'Rosalind Hayes', 'Arthur Lindqvist',
  'Carmen Delgado', 'Stanley Novak', 'Hui Lin', 'Beatrice Marsh', 'Joao Ferreira', 'Irene Castellano',
  'George Whitaker', 'Pilar Navarro', 'Vivian Osei', 'Leonard Baum', 'Consuelo Ibarra', 'Mabel Thornton',
  'Ernesto Villar', 'June Ashby', 'Min Wu', 'Clara Benedetti', 'Ronald Pike', 'Estela Morales',
  'Agnes Holloway', 'Victor Salas', 'Florence Tate', 'Bing Huang', 'Norma Quintero', 'Albert Rusk',
  'Teodora Lacson', 'Helen Fairbank', 'Manuel Rocha', 'Sylvia Brandt', 'Ignacio Fuentes', 'Opal Greer',
]

const OTHER_LANGUAGES: Language[] = ['Spanish', 'Mandarin', 'Tagalog', 'Portuguese']

const round1 = (n: number) => Math.round(n * 10) / 10

export function buildWorld(seed = SEED): World {
  const rand = seeded(seed)
  const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)]
  const between = (lo: number, hi: number) => lo + rand() * (hi - lo)
  // Fisher–Yates, so the order depends only on the seed and not on the browser's sort.
  const shuffle = <T,>(items: T[]) => {
    const out = [...items]
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }
  const place = (branch: Branch) => ({ x: round1(branch === 'West' ? between(0, 7) : between(7, 14)), y: round1(between(0, 10)) })

  const caregivers: Caregiver[] = CAREGIVER_NAMES.map((name, i) => {
    const branch: Branch = i % 2 === 0 ? 'East' : 'West'
    const roleRoll = rand()
    const role = roleRoll < 0.55 ? 'HHA' : roleRoll < 0.9 ? 'CNA' : 'LPN'
    // Everyone can do meal prep and bathing. The harder skills are spread unevenly.
    const skills: Skill[] = ['Meal prep', 'Bathing']
    if (rand() < 0.75) skills.push('Medication reminders')
    if (rand() < 0.55) skills.push('Dementia care')
    if (rand() < 0.5) skills.push('Lift transfers')
    if (role !== 'HHA' && rand() < 0.6) skills.push('Catheter care')
    const languages: Language[] = ['English']
    if (rand() < 0.45) languages.push(pick(OTHER_LANGUAGES))
    const shiftRoll = rand()
    const shift =
      shiftRoll < 0.5
        ? { start: 7 * 60, end: 15 * 60 + 30 }
        : shiftRoll < 0.72
          ? { start: 9 * 60, end: 18 * 60 }
          : shiftRoll < 0.88
            ? { start: 12 * 60, end: 20 * 60 + 30 }
            : null
    return {
      id: `cg${String(i + 1).padStart(2, '0')}`,
      name,
      firstName: name.split(' ')[0],
      role,
      branch,
      home: place(branch),
      skills,
      languages,
      catAllergy: rand() < 0.15,
      shift,
      hoursBeforeToday: Math.round(rand() < 0.2 ? between(33, 38) : between(12, 30)),
      replyRate: round1(between(0.45, 0.9)),
      replyMinutes: Math.round(between(2, 8)),
    }
  })

  const clients: Client[] = CLIENT_NAMES.map((name, i) => {
    const branch: Branch = i % 2 === 0 ? 'East' : 'West'
    const needs: Skill[] = [pick(['Meal prep', 'Bathing'] as Skill[])]
    const extra = rand()
    if (extra < 0.3) needs.push('Medication reminders')
    else if (extra < 0.5) needs.push('Dementia care')
    else if (extra < 0.65) needs.push('Lift transfers')
    else if (extra < 0.72) needs.push('Catheter care')
    return {
      id: `cl${String(i + 1).padStart(2, '0')}`,
      name,
      branch,
      home: place(branch),
      needs,
      language: rand() < 0.3 ? pick(OTHER_LANGUAGES) : 'English',
      hasCat: rand() < 0.2,
    }
  })

  // Who has been seeing whom: one regular caregiver per client, plus a couple who have filled in.
  const priorVisits: Record<string, number> = {}
  const regulars = new Map<string, string[]>()
  for (const client of clients) {
    const able = caregivers.filter(
      (c) => c.branch === client.branch && client.needs.every((n) => c.skills.includes(n)) && !(client.hasCat && c.catAllergy),
    )
    const order = shuffle(able).slice(0, 4)
    regulars.set(client.id, order.map((c) => c.id))
    order.forEach((c, rank) => {
      priorVisits[`${c.id}|${client.id}`] = rank === 0 ? Math.round(between(10, 28)) : Math.round(between(1, 6))
    })
  }

  // Today's schedule. Each visit goes to the client's regular if they are free, otherwise a fill-in.
  const visits: Visit[] = []
  const freeFor = (cg: Caregiver, client: Client, start: Minutes, end: Minutes) => {
    if (!cg.shift || start < cg.shift.start || end > cg.shift.end) return false
    return visits
      .filter((v) => v.caregiverId === cg.id)
      .every((v) => {
        const other = clients.find((c) => c.id === v.clientId) as Client
        const gap = travelMinutes(other.home, client.home)
        return v.end + gap <= start || end + gap <= v.start
      })
  }
  const slots: [Minutes, number][] = []
  for (let start = 7 * 60; start <= 17 * 60 + 30; start += 30) slots.push([start, pick([60, 90, 120, 120, 180])])
  let n = 0
  for (const client of clients) {
    const visitsToday = rand() < 0.4 ? 2 : 1
    for (let k = 0; k < visitsToday; k++) {
      // A few tries to find a time when one of the client's usual caregivers is free.
      for (let attempt = 0; attempt < 5; attempt++) {
        const [start, length] = pick(slots)
        const end = start + length
        if (visits.some((v) => v.clientId === client.id && v.start < end + 90 && v.end + 90 > start)) continue
        const order = regulars.get(client.id) ?? []
        const cg = order.map((id) => caregivers.find((c) => c.id === id) as Caregiver).find((c) => freeFor(c, client, start, end))
        if (!cg) continue
        visits.push({ id: `v${String(++n).padStart(2, '0')}`, clientId: client.id, start, end, caregiverId: cg.id })
        break
      }
    }
  }
  visits.sort((a, b) => a.start - b.start || a.id.localeCompare(b.id))

  return { agency: AGENCY, caregivers, clients, visits, priorVisits }
}

/** The assigned visit starting closest to a target time that hasn't already been dropped. */
function visitNear(state: SimState, target: Minutes): Visit | undefined {
  const dropped = new Set(state.open.map((o) => o.calledOutBy))
  return state.world.visits
    .filter((v) => v.caregiverId && !dropped.has(v.caregiverId) && v.start > state.now + 45)
    .sort((a, b) => Math.abs(a.start - target) - Math.abs(b.start - target) || a.id.localeCompare(b.id))[0]
}

/** Call-outs that have already come in before the demo opens: [minute it arrived, roughly when the visit starts]. */
const MORNING_CALLOUTS: [Minutes, Minutes][] = [
  [6 * 60 + 5, 8 * 60],
  [6 * 60 + 35, 9 * 60 + 30],
  [7 * 60 + 12, 8 * 60],
  [7 * 60 + 20, 13 * 60],
  [7 * 60 + 36, 10 * 60],
]

/** The state the demo opens on: 7:40 AM, with the morning's call-outs already worked by the engine. */
export function initialState(seed = SEED): SimState {
  let state: SimState = {
    seed,
    now: DAY_START,
    world: buildWorld(seed),
    open: [],
    texts: [],
    notices: [],
    log: [],
    nextTextId: 1,
    calloutCount: 0,
  }
  for (const [at, target] of MORNING_CALLOUTS) {
    state = advance(state, at)
    const visit = visitNear(state, target)
    if (visit) state = callOut(state, visit.id)
  }
  return advance(state, DEMO_START)
}

/** Picks the visit for the "Simulate a call-out" button: the next assigned visit one to three hours away. */
export function nextCallOutTarget(state: SimState): Visit | undefined {
  const dropped = new Set(state.open.map((o) => o.visitId))
  const upcoming = state.world.visits.filter((v) => v.caregiverId && !dropped.has(v.id) && v.start > state.now + 20)
  const ideal = upcoming.filter((v) => v.start >= state.now + 60 && v.start <= state.now + 180)
  const pool = ideal.length > 0 ? ideal : upcoming
  if (pool.length === 0) return undefined
  return pool[Math.floor(seeded(state.seed + state.calloutCount * 7919)() * pool.length)]
}
