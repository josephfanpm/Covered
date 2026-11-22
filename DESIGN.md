---
name: Covered
description: A scheduler's tool for filling open home care visits. Calm, legible, and built around the clock.
colors:
  paper: "#F0F3F2"
  surface: "#FFFFFF"
  ink: "#162629"
  text-muted: "#445558"
  line: "#D3DBDA"
  primary: "#004247"
  primary-tint: "#DCEDEB"
  urgent: "#F5B82E"
  urgent-text: "#764800"
  urgent-tint: "#FCE8C2"
  good: "#035F33"
  bad: "#9B2713"
typography:
  family: "Atkinson Hyperlegible Next"
  display:
    fontSize: 3.4rem
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: -0.025em
  title:
    fontSize: 1.75rem
    fontWeight: 800
    lineHeight: 1.2
  heading:
    fontSize: 1.125rem
    fontWeight: 700
  body:
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  small:
    fontSize: 0.875rem
    lineHeight: 1.45
rounded:
  control: 8px
  row: 12px
  panel: 16px
  phone: 28px
spacing:
  unit: 4px
  gutter: 32px
  panel-padding: 28px
  page-max: 1440px
---

# Covered design system

## Who it is for

A scheduler at a home care agency, early in the morning, with a phone in one hand. A caregiver has just called out and a client is expecting someone at 9:00. The screen has one job: show which visits are open, how long is left, and who gets asked next. Everything else stays quiet.

## What makes it look like itself

1. **The clock is the subject.** Every open visit carries a time track that runs from the call-out to the start time. Its bands show how the offers change as the visit gets closer. This is the one element that is allowed to be bold.
2. **Dawn, once.** The top band is a deep spruce sky with marigold coming up on the right, because this work happens at 7 AM. It is the only gradient in the product. Below it the page is flat.
3. **A typeface chosen for reading under pressure.** Atkinson Hyperlegible Next was drawn so that similar characters can't be confused. Times, names and numbers are the content here, so one family does every job and weight does the hierarchy.

## Colour

Ramps are generated with Adobe Leonardo from target contrast ratios against the page background (`scripts/palette.mjs`), so each step is picked for readability first. Step 500 of any ramp is 4.5:1 on paper and step 600 is 7:1.

| Role | Token | Use |
|---|---|---|
| Paper `#F0F3F2` | `--paper` | Page background. Cool, not cream. |
| Surface `#FFFFFF` | `--surface` | Panels and rows that can be acted on. |
| Ink `#162629` | `--slate-800` | Text. |
| Muted `#445558` | `--slate-600` | Secondary text. Never lighter than this for words. |
| Spruce `#004247` | `--spruce-700` | Primary. Selected state, time already used, the caregiver's own texts. |
| Marigold `#F5B82E` | `--marigold-300` | Urgency only: the last stretch of the time track, the main call to action. Text on it is always spruce or ink. |
| Marigold text `#764800` | `--marigold-600` | "Phone needed" and other urgent words on a light background. |
| Moss `#035F33` | `--moss-600` | Covered. |
| Brick `#9B2713` | `--brick-600` | Said no, or missed. |

Status is never colour alone. Each state has its own icon and its own words.

## Type

One family, Atkinson Hyperlegible Next (self-hosted, variable weight). Sentence case everywhere. No all-caps labels. Numbers that change or line up use tabular figures (`.tabular`).

- Display 3.4rem / 800, for the single headline.
- Title 1.75rem / 800, for the client's name on the selected visit.
- Heading 1.125rem / 700, for section names.
- Body 1rem / 400. Small 0.875rem for supporting facts.
- Lines stay under about 60 characters.

## Layout

Phone first. One column on a phone: summary numbers, open visits, the selected visit, then the caregiver's phone. From 1024px the list sits left of the detail. From 1280px the phone takes a third column.

```
┌──────────────────────────────── dawn band ────────────────────────────────┐
│ Covered                                               7:42 AM  ▶  1× 4×  │
│ Headline, one sentence, [Simulate a call-out]                             │
└───────────────────────────────────────────────────────────────────────────┘
  2 of 4 covered     9 min typical     2 open     1 needs a phone call

  Open visits        ┌ Selected visit ───────────────┐   Caregiver's phone
  ▌Arthur L.  1h47   │ Name            9:30–10:30 AM │   ┌──────────────┐
   Vivian O.  2h17   │ ━━━━━━━●━━━━━━━━━━━ time track │   │ texts        │
  Earlier today      │ 1  Priya   ▮▮▮▮▯  84  Said no  │   │              │
   Lourdes R.  ✓     │ 2  Devon   ▮▮▮▮▯  83  [Assign] │   │ [YES]  [NO]  │
                     └───────────────────────────────┘   └──────────────┘
```

Everything is left-aligned. The ranked list is numbered because it is a real order: it is the sequence the offers go out in.

## Shape and depth

- Controls 8px, list rows 12px, panels 16px, the phone 28px. Radius grows with the size of the thing.
- Borders, not shadows. The only shadow is the hard 2px edge under the main button.
- A row that can be acted on is white. A finished one drops back to the paper colour.

## Motion

- The clock ticks and the time track fills. That is data, not decoration.
- A new text or a new offer slides up 6px as it arrives.
- When a visit is covered, one light sweep crosses its row, once.
- Under reduced motion the animated sky is not loaded at all and the static gradient stays.

## Components

Built on shadcn/ui (copied into `src/components/ui`) and Tailwind. Icons are Lucide only.

- **Time track**: rounded bar, bands tinted from spruce to marigold, a spruce fill for time used, dots for each text sent, a labelled marker for now.
- **Status line**: icon plus words. Working (spruce, message icon), phone needed (marigold text, phone icon), covered (moss, check), missed (brick, cross).
- **Score bar**: four segments that add up to the match score, in the same order as the legend above the list.
- **Phone**: thick ink bezel, agency texts in grey on the left, the caregiver's replies in spruce on the right, YES and NO as 48px buttons.

## Words

- Short labels, sentence case, plain verbs. A button says what it does: "Simulate a call-out", "Assign", "Reply YES".
- Say the answer first: "Covered by Rosa Jimenez in 3 min", not "Status: covered".
- Blockers are stated as facts about the day: "Has a visit at 9:30", "Allergic to cats".
- Always say the data is simulated wherever a number could be mistaken for a result.

## Don't

- No second accent colour. Marigold means time is running out and nothing else.
- No gradients outside the top band.
- No identical card grids. Rows are rows.
- No all-caps eyebrow labels, no mono type for numbers, no arrows on buttons.
- No status shown by colour alone.
