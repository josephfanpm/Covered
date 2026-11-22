import { Car, ChevronDown, Clock, Languages, MessageSquareText, Repeat2, UserRoundCheck } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { caregiverOf, clientOf, isActive, statusOf, visitOf } from '@/lib/view'
import { calledOutToday, STAGES, stageFor } from '@/sim/engine'
import { type Candidate, rankCandidates, WEIGHTS } from '@/sim/rank'
import type { Offer, OpenVisit, SimState } from '@/sim/types'
import { formatClock, formatRange, formatWait } from '@/sim/util'
import { StatusLine } from './StatusLine'
import { TimeTrack } from './TimeTrack'

const PARTS = [
  { key: 'continuity', label: 'Knows the client', color: 'var(--brand-600)' },
  { key: 'travel', label: 'Short drive', color: 'var(--sky)' },
  { key: 'hours', label: 'Has hours left', color: 'var(--orange)' },
  { key: 'fit', label: 'Speaks the language', color: 'var(--slate-400)' },
] as const

const ZONE_SWATCH = ['var(--brand-100)', 'var(--brand-200)', 'var(--urgent-100)', 'var(--urgent-200)']

function offerNote(offer: Offer): { text: string; className: string } {
  switch (offer.status) {
    case 'pending':
      return { text: `Texted ${formatClock(offer.sentAt)}. Reply due ${formatClock(offer.replyBy)}.`, className: 'text-brand-700' }
    case 'accepted':
      return { text: `Said yes at ${formatClock(offer.respondedAt ?? offer.sentAt)}`, className: 'text-good-600' }
    case 'declined':
      return { text: `Said no at ${formatClock(offer.respondedAt ?? offer.sentAt)}`, className: 'text-bad-600' }
    case 'expired':
      return { text: `Texted ${formatClock(offer.sentAt)}. No reply.`, className: 'text-slate-600' }
    case 'withdrawn':
      return { text: 'Offer withdrawn once the visit was covered', className: 'text-slate-600' }
  }
}

function ScoreBar({ candidate }: { candidate: Candidate }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Match score ${candidate.score} out of 100`}>
      <div className="flex h-2 w-24 overflow-hidden rounded-full bg-slate-100 sm:w-28">
        {PARTS.map((p) => (
          <span key={p.key} style={{ width: `${candidate.parts[p.key]}%`, background: p.color }} />
        ))}
      </div>
      <span className="tabular w-6 text-right text-sm font-bold text-ink">{candidate.score}</span>
    </div>
  )
}

function Reasons({ candidate, clientFirstName, language }: { candidate: Candidate; clientFirstName: string; language: string }) {
  const f = candidate.facts
  const item = 'inline-flex items-center gap-1.5'
  const icon = 'size-4 shrink-0 text-slate-500'
  return (
    <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
      <li className={item}>
        <Repeat2 className={icon} aria-hidden />
        {f.priorVisits === 0 ? `New to ${clientFirstName}` : `${f.priorVisits} ${f.priorVisits === 1 ? 'visit' : 'visits'} with ${clientFirstName}`}
      </li>
      <li className={item}>
        <Car className={icon} aria-hidden />
        <span className="tabular">{f.travelMin} min</span> from {f.from}
      </li>
      <li className={`${item} ${f.overtime ? 'font-semibold text-urgent-600' : ''}`}>
        <Clock className={icon} aria-hidden />
        <span className="tabular">{Math.round(f.hoursAfter)} h</span> this week{f.overtime ? ', overtime' : ''}
      </li>
      {language !== 'English' && f.speaksLanguage && (
        <li className={item}>
          <Languages className={icon} aria-hidden />
          Speaks {language}
        </li>
      )}
      {f.otherBranch && <li className={item}>{candidate.caregiver.branch} branch</li>}
    </ul>
  )
}

export function VisitDetail({
  sim,
  open,
  phoneId,
  onShowTexts,
  onAssign,
}: {
  sim: SimState
  open: OpenVisit
  phoneId: string | null
  onShowTexts: (caregiverId: string) => void
  onAssign: (caregiverId: string) => void
}) {
  const [showBlocked, setShowBlocked] = useState(false)
  const visit = visitOf(sim, open.visitId)
  const client = clientOf(sim, visit)
  const firstName = client.name.split(' ')[0]
  const status = statusOf(sim, open)
  const active = isActive(open)
  const stage = stageFor(visit.start - sim.now)

  // While the visit is open, everyone is ranked as of now. The wider pool shows once the search has widened.
  const widened = stage.widened || sim.log.some((l) => l.visitId === open.visitId && l.kind === 'widened')
  const ranked = rankCandidates(sim.world, visit, { now: sim.now, widened, calledOut: calledOutToday(sim) })
  const byId = new Map(ranked.map((c) => [c.caregiver.id, c]))
  const offeredIds = new Set(open.offers.map((f) => f.caregiverId))
  const upNext = active ? ranked.filter((c) => c.eligible && !offeredIds.has(c.caregiver.id)) : []
  const blocked = active ? ranked.filter((c) => !c.eligible && !offeredIds.has(c.caregiver.id)) : []

  return (
    <article aria-labelledby="visit-title" className="rounded-2xl border bg-surface p-5 sm:p-7">
      <header>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 id="visit-title" className="text-[1.75rem] leading-tight font-extrabold tracking-tight text-ink">
            {client.name}
          </h2>
          <span className="tabular text-lg font-semibold text-ink">{formatRange(visit.start, visit.end)}</span>
        </div>
        <p className="mt-1 text-slate-600">
          Needs {client.needs.join(' and ').toLowerCase()}.{client.language !== 'English' ? ` Speaks ${client.language}.` : ''}{' '}
          {caregiverOf(sim, open.calledOutBy).name} called out at {formatClock(open.openedAt)}.
        </p>
        <StatusLine tone={status.tone} text={status.text} className="mt-3 text-base" />
      </header>

      <section aria-label="Time left" className="mt-4">
        <TimeTrack open={open} visit={visit} now={sim.now} />
        <ol className="grid gap-x-6 gap-y-1.5 text-sm text-slate-600 sm:grid-cols-2">
          {STAGES.map((s, i) => {
            const current = active && s.key === stage.key
            return (
              <li key={s.key} className={`flex items-start gap-2 ${current ? 'font-semibold text-ink' : ''}`}>
                <span aria-hidden className="mt-1.5 h-2 w-5 shrink-0 rounded-full" style={{ background: ZONE_SWATCH[i] }} />
                <span>
                  {i === 0 ? `More than ${s.fromMinutesOut / 60} h out` : i === STAGES.length - 1 ? 'Last hour' : `Under ${STAGES[i - 1].fromMinutesOut / 60} h out`}
                  : {s.label.charAt(0).toLowerCase() + s.label.slice(1)}
                  {current ? ' (now)' : ''}
                </span>
              </li>
            )
          })}
        </ol>
      </section>

      <section aria-labelledby="ladder-title" className="mt-7">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h3 id="ladder-title" className="text-lg font-bold text-ink">
            {active ? 'Who gets the offer, in order' : 'Who was asked'}
          </h3>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600" aria-label="What the score is made of">
            {PARTS.map((p) => (
              <li key={p.key} className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-full" style={{ background: p.color }} />
                {p.label} <span className="tabular">{WEIGHTS[p.key]}</span>
              </li>
            ))}
          </ul>
        </div>

        <ol className="mt-3 divide-y border-y">
          {open.offers.map((offer, i) => {
            const candidate = byId.get(offer.caregiverId) as Candidate
            const note = offerNote(offer)
            const canAssign = active && offer.status !== 'declined' && candidate.eligible
            return (
              <li key={offer.caregiverId} className={`flex gap-3 py-3.5 sm:gap-4 ${offer.status === 'pending' ? 'animate-arrive' : ''}`}>
                <span className="tabular w-5 shrink-0 pt-0.5 text-right text-sm font-bold text-slate-500">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="font-bold text-ink">
                      {candidate.caregiver.name} <span className="font-normal text-slate-600">{candidate.caregiver.role}</span>
                    </span>
                    <ScoreBar candidate={{ ...candidate, score: offer.score }} />
                  </div>
                  <Reasons candidate={candidate} clientFirstName={firstName} language={client.language} />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${note.className}`}>
                      {offer.status === 'pending' && <span aria-hidden className="size-2 animate-pulse rounded-full bg-brand-700" />}
                      {note.text}
                    </span>
                    <span className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => onShowTexts(offer.caregiverId)}
                        aria-pressed={phoneId === offer.caregiverId}
                        className="h-11 px-3 text-sm font-semibold aria-pressed:border-brand-700 aria-pressed:bg-brand-100 sm:h-9"
                      >
                        <MessageSquareText aria-hidden /> Texts
                      </Button>
                      {canAssign && <AssignButton onClick={() => onAssign(offer.caregiverId)} />}
                    </span>
                  </div>
                </div>
              </li>
            )
          })}

          {upNext.map((candidate, i) => (
            <li key={candidate.caregiver.id} className="flex gap-3 py-3.5 sm:gap-4">
              <span className="tabular w-5 shrink-0 pt-0.5 text-right text-sm font-bold text-slate-500">{open.offers.length + i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="font-bold text-ink">
                    {candidate.caregiver.name} <span className="font-normal text-slate-600">{candidate.caregiver.role}</span>
                  </span>
                  <ScoreBar candidate={candidate} />
                </div>
                <Reasons candidate={candidate} clientFirstName={firstName} language={client.language} />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <span className="text-sm text-slate-600">{i === 0 ? 'Next to be texted' : 'Waiting'}</span>
                  <AssignButton onClick={() => onAssign(candidate.caregiver.id)} />
                </div>
              </div>
            </li>
          ))}

          {active && open.offers.length + upNext.length === 0 && (
            <li className="py-4 text-sm text-slate-600">Nobody on the team can take this visit. It needs a phone call or a new time.</li>
          )}
        </ol>

        {blocked.length > 0 && (
          <div className="mt-3">
            <Button
              variant="ghost"
              onClick={() => setShowBlocked(!showBlocked)}
              aria-expanded={showBlocked}
              className="h-11 px-2 text-sm font-semibold"
            >
              <ChevronDown className={`transition-transform ${showBlocked ? 'rotate-180' : ''}`} aria-hidden />
              {blocked.length} can't take it
            </Button>
            {showBlocked && (
              <ul className="mt-1 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
                {blocked.map((c) => (
                  <li key={c.caregiver.id} className="flex justify-between gap-3 border-b border-slate-100 py-1.5">
                    <span className="font-semibold text-ink">{c.caregiver.name}</span>
                    <span className="text-right text-slate-600">{c.blockers[0]}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!active && open.status === 'covered' && (
          <p className="mt-4 text-sm text-slate-600">
            Covered {formatWait((open.coveredAt as number) - open.openedAt)} after the call-out
            {open.coveredVia === 'scheduler' ? ', assigned by the scheduler.' : ', by text.'}
          </p>
        )}
      </section>
    </article>
  )
}

function AssignButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="h-11 border-brand-700 px-3 text-sm font-semibold text-brand-700 hover:bg-brand-100 hover:text-brand-800 sm:h-9"
    >
      <UserRoundCheck aria-hidden /> Assign
    </Button>
  )
}
