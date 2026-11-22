import { CircleCheck, CircleX, MessageSquareText, PhoneCall } from 'lucide-react'
import type { Tone } from '@/lib/view'

const STYLE: Record<Tone, { icon: typeof CircleCheck; className: string }> = {
  working: { icon: MessageSquareText, className: 'text-brand-700' },
  urgent: { icon: PhoneCall, className: 'text-urgent-600' },
  good: { icon: CircleCheck, className: 'text-good-600' },
  bad: { icon: CircleX, className: 'text-bad-600' },
}

/** Status as an icon plus words, never colour alone. */
export function StatusLine({ tone, text, className = '' }: { tone: Tone; text: string; className?: string }) {
  const { icon: Icon, className: toneClass } = STYLE[tone]
  return (
    <span className={`inline-flex items-start gap-1.5 text-sm font-semibold ${toneClass} ${className}`}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{text}</span>
    </span>
  )
}
