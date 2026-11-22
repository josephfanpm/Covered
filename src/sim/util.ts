import type { Minutes, Point } from './types'

/** Small seeded random generator (mulberry32), so the simulated day is the same on every load. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A stable number in [0, 1) for a set of string keys. */
export function hashUnit(...parts: (string | number)[]): number {
  let h = 2166136261
  for (const ch of parts.join('|')) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  return seeded(h >>> 0)()
}

/** Driving time between two grid points: a fixed 4 minutes plus about 2.2 minutes per km of street grid. */
export function travelMinutes(a: Point, b: Point): Minutes {
  const km = Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
  return Math.round(4 + 2.2 * km)
}

export function formatTime(m: Minutes): string {
  const h24 = Math.floor(m / 60) % 24
  const min = Math.floor(m % 60)
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(min).padStart(2, '0')}`
}

export function formatClock(m: Minutes): string {
  return `${formatTime(m)} ${Math.floor(m / 60) % 24 < 12 ? 'AM' : 'PM'}`
}

/** "1:00–2:00 PM", or "10:00 AM–12:00 PM" when the visit crosses noon. */
export function formatRange(start: Minutes, end: Minutes): string {
  const sameHalf = Math.floor(start / 720) === Math.floor(end / 720)
  return `${sameHalf ? formatTime(start) : formatClock(start)}–${formatClock(end)}`
}

/** "2 h 15 min", "45 min" */
export function formatDuration(m: Minutes): string {
  const mins = Math.max(0, Math.round(m))
  const h = Math.floor(mins / 60)
  const rest = mins % 60
  if (h === 0) return `${rest} min`
  if (rest === 0) return `${h} h`
  return `${h} h ${rest} min`
}

/** How long something took, where anything inside the same minute reads as "under a minute". */
export function formatWait(m: Minutes): string {
  return m < 1 ? 'under a minute' : formatDuration(m)
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}
