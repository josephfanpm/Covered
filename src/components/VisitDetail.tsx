import { BellRing, CalendarClock, ChevronDown, MessageSquareText, UserRoundCheck } from 'lucide-react'
import { Popover } from '@base-ui/react/popover'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { caregiverOf, clientOf, isActive, statusOf, visitOf } from '@/lib/view'
import { calledOutToday, laterTimes, stageFor } from '@/sim/engine'
import { type Candidate, rankCandidates } from '@/sim/rank'
import type { Offer, OpenVisit, SimState } from '@/sim/types'
import { formatClock, formatRange } from '@/sim/util'
import { StatusLine } from './StatusLine'
import { TimeTrack } from './TimeTrack'

/** How many not-yet-asked caregivers to show before "Show everyone". */
const UP_NEXT = 3

function offerNote(offer: Offer): { text: string; className: string } {
  switch (offer.status) {
    case 'pending':
      return { text: `Reply due ${formatClock(offer.replyBy)}`, className: 'font-semibold text-brand-700' }
    case 'accepted':
      return { text: 'Said yes', className: 'font-semibold text-good-600' }
    case 'declined':
      return { text: 'Said no', className: 'text-slate-600' }
    case 'expired':
      return { text: 'No reply', className: 'text-slate-600' }
    case 'withdrawn':
      return { text: 'Not needed', className: 'text-slate-600' }
  }
}

/** The two or three facts that explain where someone ranks. The rest is behind the match score. */
function facts(c: Candidate, clientFirstName: string): string {
  const f = c.facts
  const parts = [
    f.priorVisits === 0 ? `New to ${clientFirstName}` : `${f.priorVisits} ${f.priorVisits === 1 ? 'visit' : 'visits'} with ${clientFirstName}`,
    `${f.travelMin} min away`,
  ]
  if (f.lateBy > 0) parts.push(`${f.lateBy} min late`)
  if (f.overtime) parts.push('overtime')
  if (f.otherBranch) parts.push(`${c.caregiver.branch} branch`)
  return parts.join(', ')
}

/** What the match score is made of: each factor, and how many of its points this caregiver got. */
function matchParts(c: Candidate, clientFirstName: string): { label: string; got: number; of: number }[] {
  const p = c.parts
  return [
    { label: `Knows ${clientFirstName}`, got: Math.round(p.continuity), of: 40 },
    { label: 'Short drive', got: Math.round(p.travel), of: 30 },
    { label: 'Hours left this week', got: Math.round(p.hours), of: 15 },
    { label: 'Speaks the language', got: Math.round(p.fit), of: 15 },
  ]
}

/** The match score. Hover, focus or tap opens a small card with the breakdown, so the list never shifts. */
function MatchScore({ candidate, clientFirstName }: { candidate: Candidate; clientFirstName: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={150}
        className="tabular inline-flex h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-sm text-slate-600 underline decoration-slate-300 decoration-dotted underline-offset-4 hover:bg-slate-100 data-[popup-open]:bg-slate-100"
      >
        Match <strong className="font-bold text-ink">{candidate.score}</strong>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={4}>
          <Popover.Popup className="w-64 rounded-xl border bg-surface p-4 text-sm shadow-[0_8px_24px_-8px_rgb(26_35_52/0.25)] outline-none">
            <Popover.Title className="font-bold text-ink">
              {candidate.caregiver.firstName}'s match: {candidate.score} of 100
            </Popover.Title>
            <dl className="tabular mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-slate-600">
              {matchParts(candidate, clientFirstName).map((part) => (
                <div key={part.label} className="contents">
                  <dt>{part.label}</dt>
                  <dd className="text-right">
                    <span className="font-semibold text-ink">{part.got}</span> of {part.of}
                  </dd>
                </div>
              ))}
              {candidate.facts.lateBy > 0 && (
                <div className="contents">
                  <dt>Arriving late</dt>
                  <dd className="text-right font-semibold text-ink">−{candidate.facts.lateBy}</dd>
                </div>
              )}
            </dl>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

function Row({
  position,
  candidate,
  clientFirstName,
  note,
  pending = false,
  children,
}: {
  position: number
  candidate: Candidate
  clientFirstName: string
  note?: { text: string; className: string }
  pending?: boolean
  children?: React.ReactNode
}) {
  return (
    <li className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-3 ${pending ? 'animate-arrive' : ''}`}>
      <span className="tabular w-5 shrink-0 text-right text-sm text-slate-500">{position}</span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-3">
          <span className="font-bold text-ink">{candidate.caregiver.name}</span>
          {note && (
            <span className={`inline-flex items-center gap-1.5 text-sm ${note.className}`}>
              {pending && <span aria-hidden className="size-2 animate-pulse rounded-full bg-sky" />}
              {note.text}
            </span>
          )}
        </p>
        <p className="text-sm text-slate-600">{facts(candidate, clientFirstName)}</p>
      </div>
      <MatchScore candidate={candidate} clientFirstName={clientFirstName} />
      <span className="flex w-full shrink-0 justify-end gap-1 empty:hidden sm:w-auto">{children}</span>
    </li>
  )
}

export function VisitDetail({
  sim,
  open,
  phoneId,
  onShowTexts,
  onAssign,
  onMove,
}: {
  sim: SimState
  open: OpenVisit
  phoneId: string | null
  onShowTexts: (caregiverId: string) => void
  onAssign: (caregiverId: string) => void
  onMove: (caregiverId: string, start: number) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const visit = visitOf(sim, open.visitId)
  const client = clientOf(sim, visit)
  const firstName = client.name.split(' ')[0]
  const status = statusOf(sim, open)
  const active = isActive(open)
  const stage = stageFor(visit.start - sim.now)

  // While the visit is open, everyone is ranked as of now. The wider pool shows once the search has widened.
  const widened = stage.widened || sim.log.some((l) => l.visitId === open.visitId && l.kind === 'widened')
  const canAssign = open.status === 'needs_call'
  // Once a visit needs a phone call, arriving late is allowed and moving it becomes an option.
  const ranked = rankCandidates(sim.world, visit, { now: sim.now, widened, calledOut: calledOutToday(sim), allowLate: canAssign })
  const later = canAssign ? laterTimes(sim, open.visitId) : []
  const notice = sim.notices.filter((n) => n.visitId === open.visitId).at(-1)
  const byId = new Map(ranked.map((c) => [c.caregiver.id, c]))
  const offeredIds = new Set(open.offers.map((f) => f.caregiverId))
  const upNext = active ? ranked.filter((c) => c.eligible && !offeredIds.has(c.caregiver.id)) : []
  const blocked = active ? ranked.filter((c) => !c.eligible && !offeredIds.has(c.caregiver.id)) : []

  // Keep the list short: people still in play, then the next few. Everyone who said no is one line.
  const declined = open.offers.filter((f) => f.status === 'declined')
  // Once a visit is settled, only the person who took it stays on screen. Everyone else is one line.
  const inPlay = open.offers.filter((f) => (active ? f.status !== 'declined' : f.status === 'accepted'))
  const noReply = open.offers.filter((f) => f.status === 'expired' || f.status === 'withdrawn').length
  const shownNext = showAll ? upNext : upNext.slice(0, UP_NEXT)
  const hidden = upNext.length - shownNext.length + (showAll ? 0 : blocked.length)
  const needs = [client.needs.join(', '), client.language !== 'English' ? `speaks ${client.language}` : ''].filter(Boolean).join(', ')

  return (
    <article aria-labelledby="visit-title" className="rounded-2xl border bg-surface p-5 sm:p-7">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div>
          <h2 id="visit-title" className="text-2xl leading-tight font-extrabold tracking-tight text-ink">
            {client.name}
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">{needs}</p>
        </div>
        <span className="tabular text-lg font-semibold text-ink">{formatRange(visit.start, visit.end)}</span>
      </header>

      <TimeTrack open={open} visit={visit} now={sim.now} />

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <StatusLine tone={status.tone} text={status.text} className="text-base" />
        {active && <span className="text-sm text-slate-600">Asking {stage.label.charAt(0).toLowerCase() + stage.label.slice(1)}</span>}
      </div>
      {notice && (
        <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-600">
          <BellRing className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Client told at {formatClock(notice.at)}: {notice.body}
          </span>
        </p>
      )}

      <ol className="mt-3 divide-y border-t" aria-label={active ? 'Who is asked, in order' : 'Who was asked'}>
        {inPlay.map((offer, i) => {
          const candidate = byId.get(offer.caregiverId) as Candidate
          return (
            <Row
              key={offer.caregiverId}
              position={i + 1}
              candidate={candidate}
              clientFirstName={firstName}
              note={offer.status === 'accepted' && open.coveredVia !== 'offer' ? { text: 'Assigned', className: 'font-semibold text-good-600' } : offerNote(offer)}
              pending={offer.status === 'pending'}
            >
              {canAssign && candidate.eligible && <AssignButton onClick={() => onAssign(offer.caregiverId)} />}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onShowTexts(offer.caregiverId)}
                aria-pressed={phoneId === offer.caregiverId}
                aria-label={`Show ${candidate.caregiver.firstName}'s texts`}
                className="size-11 text-slate-600 aria-pressed:bg-brand-100 aria-pressed:text-brand-700"
              >
                <MessageSquareText aria-hidden />
              </Button>
            </Row>
          )
        })}

        {shownNext.map((candidate, i) => (
          <Row
            key={candidate.caregiver.id}
            position={inPlay.length + i + 1}
            candidate={candidate}
            clientFirstName={firstName}
            note={i === 0 ? { text: 'Next', className: 'text-slate-600' } : undefined}
          >
            {canAssign && <AssignButton onClick={() => onAssign(candidate.caregiver.id)} />}
          </Row>
        ))}

        {active && inPlay.length + upNext.length === 0 && (
          <li className="py-4 text-sm text-slate-600">Nobody on the team can take this visit.</li>
        )}
      </ol>

      {active && declined.length > 0 && (
        <p className="border-t py-3 text-sm text-slate-600">
          Said no: {declined.map((f) => caregiverOf(sim, f.caregiverId).name).join(', ')}
        </p>
      )}
      {!active && open.offers.length > 0 && (
        <p className="border-t py-3 text-sm text-slate-600">
          {open.offers.length} texted: {declined.length} said no, {noReply} didn't reply.
        </p>
      )}

      {later.length > 0 && (
        <ul className="border-t" aria-label="Move the visit to a later time">
          {later.map((option) => {
            const cg = caregiverOf(sim, option.caregiverId)
            return (
              <li key={option.caregiverId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                <CalendarClock className="size-5 shrink-0 text-slate-500" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">Move to {formatRange(option.start, option.end)}</p>
                  <p className="text-sm text-slate-600">
                    {cg.name}, {option.priorVisits === 0 ? `new to ${firstName}` : `${option.priorVisits} ${option.priorVisits === 1 ? 'visit' : 'visits'} with ${firstName}`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => onMove(option.caregiverId, option.start)}
                  className="h-11 border-brand-500 px-3 text-sm font-semibold text-brand-700 hover:bg-brand-100 hover:text-brand-800"
                >
                  Move
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      {showAll && blocked.length > 0 && (
        <ul className="border-t py-2 text-sm">
          {blocked.map((c) => (
            <li key={c.caregiver.id} className="flex justify-between gap-3 py-1">
              <span className="text-ink">{c.caregiver.name}</span>
              <span className="text-right text-slate-600">{c.blockers[0]}</span>
            </li>
          ))}
        </ul>
      )}

      {active && (hidden > 0 || showAll) && (
        <Button variant="ghost" onClick={() => setShowAll(!showAll)} aria-expanded={showAll} className="mt-1 -ml-2 h-11 px-2 text-sm font-semibold">
          <ChevronDown className={`transition-transform ${showAll ? 'rotate-180' : ''}`} aria-hidden />
          {showAll ? 'Show fewer' : `Show everyone (${hidden} more)`}
        </Button>
      )}
    </article>
  )
}

function AssignButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" onClick={onClick} className="h-11 border-brand-500 px-3 text-sm font-semibold text-brand-700 hover:bg-brand-100 hover:text-brand-800">
      <UserRoundCheck aria-hidden /> Assign
    </Button>
  )
}
