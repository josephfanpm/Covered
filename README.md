# Covered: filling open home care visits after a call-out

When a caregiver calls out, Covered ranks the agency's own caregivers for the visit, texts the offer in order, and escalates as the start time nears. It is a working prototype that runs on a simulated day.

**[Try the live demo](https://josephfanpm.github.io/Covered/)** · [Design system](DESIGN.md)

![The scheduler's view: open visits on the left, the ranked caregivers for one visit in the middle, a caregiver's phone on the right](docs/screenshot.png)

This is an independent portfolio project. The agency, caregivers, clients and visits are invented, and no real agency data is used.

## At a glance

| | |
|---|---|
| **Problem** | A caregiver calls out and a client is expecting someone in a few hours. Finding a replacement means working down a list by phone, one call at a time. |
| **User** | The scheduler at a home care agency with several branches. |
| **Solution** | Rank the agency's own caregivers for the open visit, text the offer in order, ask more people faster as the start gets closer, and tell the scheduler when to pick up the phone. If nobody can make it on time, offer a late arrival or a later time, and keep the client informed. |
| **Result** | A working prototype with 17 tests on the ranking and offer logic. No real-world result: every number in the demo comes from a simulated day. |
| **My role** | Product and build: the problem, the ranking and escalation rules, the trade-offs, and the prototype. |

## Problem

A home care visit happens in a client's home at a set time. When the caregiver calls out that morning, someone else has to be found before the client is left waiting.

Scheduling software can list the open visit and a shortlist of caregivers who match. The slow part comes after that:

| Step the scheduler still does by hand | What goes wrong |
|---|---|
| Decide who to ask first | The best match is often not the first name on the list. A caregiver the client already knows is better care and more likely to say yes. |
| Ask, then wait | Each call or text is a wait of unknown length. The scheduler is also handling other open visits at the same time. |
| Know when to move on | Wait too long on one person and the visit runs out of time. Ask everyone at once and the best match loses out to whoever replies fastest. |
| Know when to bend the rules | Overtime or a caregiver from another branch is worth it an hour before the visit, and not worth it five hours before. |

Covered is a prototype of that part.

<!-- TODO(Joseph): add real evidence for the problem if you have it (scheduler interviews, industry call-out or missed-visit rates). None is claimed here. -->

## Target users

- **Schedulers and care coordinators** at home care agencies, who cover call-outs alongside the rest of the day's schedule.
- **Caregivers**, who get a text they can answer with one word and can see why they were asked.

<!-- TODO(Joseph): no user research was done for this prototype. Add any conversations with schedulers or agency operators here if you have them. -->

## Solution

- **Open visits, soonest first.** Each one shows how long is left and where it stands: texting someone, phone needed, covered or missed.
- **A short ranked list with reasons.** For the selected visit, the caregivers still in play and the next few to be asked, each with how many times they have seen the client, the drive from where they will be, and a match score out of 100. "Show everyone" adds the rest of the team, including who can't take it and why.
- **Offers by text, in order.** The first YES gets the visit. Anyone else still holding an offer is told it's covered.
- **Escalation on a clock.** A time track on each visit shows how the offers change as the start gets closer.
- **A handoff to the scheduler.** When time is short or nobody is left to text, the visit is flagged "Phone needed" and an Assign button appears beside each caregiver who can still take it.
- **A fallback when nobody can make it on time.** Once a visit is flagged, caregivers who would arrive up to 45 minutes late are added to the list, and the two best later times that day are offered as a one-click move.
- **The client is kept informed.** They get a message when the visit is at risk, when a replacement is confirmed (with the new arrival time if it is late or moved), and if it can't be covered.
- **The caregiver's side.** A phone shows the texts each caregiver received. In the demo you can reply YES or NO for them, or let the simulation answer.

### How the ranking works

Some things rule a caregiver out. The rest are scored.

**Ruled out if they:**

- have a visit that overlaps, or can't get there by the start time (once a visit is flagged for a phone call, arriving up to 45 minutes late is allowed, as long as at least 30 minutes of the visit is left)
- would be late for their next visit
- aren't working today, or the visit falls outside their hours
- aren't trained for something the client needs
- are allergic to the client's cat
- called out themselves today

**Scored out of 100 on:**

| Factor | Points | Why |
|---|---|---|
| Knows the client | 40 | Rises fast over the first few visits and then levels off: 1 visit is about 9 points, 4 is about 25, 12 is about 38. |
| Short drive | 30 | Measured from where they will be (their previous visit that day), not from home. Zero at 45 minutes. |
| Has hours left | 15 | Full marks at 24 hours or fewer this week, none at 40. |
| Speaks the client's language | 15 | |

### How the offers escalate

| Time until the visit | Asked at once | Time to reply | Who can be asked |
|---|---|---|---|
| More than 4 hours | 1 | 15 min | Same branch, no overtime |
| 2 to 4 hours | 1 | 8 min | Same branch, no overtime |
| 1 to 2 hours | 2 | 5 min | Any branch, overtime allowed |
| Last hour | 3 | 3 min | Any branch, overtime allowed |

Under 30 minutes with nobody confirmed, or when nobody is left to text, the visit is flagged for a phone call. If a branch runs out of people early, the search widens straight away.

### What happens when nobody says yes

1. **The client is told** the visit is at risk and a replacement is being arranged.
2. **Late arrivals are allowed.** Texts keep going out, now including caregivers who would arrive late. Every minute late costs a point of match score, so on-time caregivers are still asked first.
3. **The scheduler gets two more options:** an Assign button beside each caregiver who can still take it, and the two best later times that day, with caregivers the client already knows ahead of strangers.
4. **The visit is marked missed** only when nobody could arrive late enough to be useful. The client is told and the office calls them.

## My role

I built Covered with Claude Code as a pair programmer. I set the product direction: the problem, what rules a caregiver out, the four scoring factors and their weights, the escalation stages, and when the product hands the visit back to a person. I reviewed the logic and the tests behind each rule.

<!-- TODO(Joseph): confirm this matches what you'd say in an interview. Add a line on your background (nursing, staffing marketplaces) if you want it here. -->

## Key decisions and trade-offs

| Decision | Options | Chose | Gave up | Why |
|---|---|---|---|---|
| **Who gets asked** | The agency's own caregivers · an outside pool of workers | Own caregivers only | A visit nobody on staff can take stays open | Clients are matched to an agency and its people. An outside pool is a different business, with its own recruiting, credentialing and liability. |
| **How offers go out** | Text everyone at once · one at a time · one at a time, then small groups | One at a time far from the start, groups of two and three near it | Speed early on. A visit five hours away can take longer to fill. | Texting everyone gives the visit to whoever replies fastest. Asking in order gives the best match a fair chance while there is still time. |
| **What ranks highest** | Closest caregiver · fewest hours · knows the client | Knows the client (40 of 100 points) | Some longer drives | In a client's home, a familiar face matters more than in a facility. It is also the easier yes. |
| **How continuity is scored** | Count every past visit equally · level off | Levels off after the first few visits | Fine distinctions between long-standing caregivers | The gap between a stranger and someone with 4 visits matters. The gap between 12 and 20 doesn't, and shouldn't outweigh a 30-minute drive. |
| **Where travel is measured from** | Home · previous visit that day | Previous visit | Simplicity. It needs the day's schedule, not just an address. | A caregiver finishing a visit two streets away is closer than one who lives nearby but is across town at 9:00. |
| **Overtime and other branches** | Never · always · only when time is short | Only under 2 hours out, or once the branch has nobody left | Some earlier fills, and some overtime cost late | Overtime is cheaper than a missed visit and more expensive than a regular fill. The clock decides which one is at stake. |
| **Rules vs. scores** | Score everything · hard rules for safety and schedule | Hard rules for training, allergies, schedule clashes and time off | A near-match can't be offered even in an emergency | An untrained caregiver or a double-booking is not a worse option. It is not an option. |
| **Who confirms** | Scheduler approves each yes · first yes wins | First yes wins, automatically | The scheduler's final say on each fill | A yes that waits for approval can expire. Only people the rules allow are ever asked, and the scheduler takes over once a visit is flagged for a phone call. |
| **When to hand over** | Keep texting until the start · flag for a phone call | Flag at 30 minutes, or when nobody is left to text | Full automation | A text can be missed. Close to the start, a call from a person is the better tool, and the product should say so. |
| **Late or not at all** | Never offer a late arrival · allow it from the start · allow it only once the visit is flagged | Only once flagged, up to 45 minutes, with at least 30 minutes of care left | Some on-time purity. A flagged visit can be filled by someone who arrives late. | A caregiver 20 minutes late is far better than no visit. Allowing it earlier would let late arrivals crowd out people who can be on time. |
| **Moving the visit** | Never · automatically · offer it to the scheduler | Offered to the scheduler, two options, only once flagged | Automation. A person has to choose and agree it with the client. | A new time changes the client's day, so a person should make that call. Caregivers the client knows come first because a later visit with a familiar face is an easier ask. |
| **Telling the client** | Only if the visit is missed · at every step · when it is at risk and when it is settled | At risk, then the outcome | Silence while texts are still going out normally | Most call-outs are covered before the client would notice. Telling them at the point of real risk, and again with a name and a time, is honest without causing worry over every call-out. |
| **After a call-out** | Still offer them other visits · leave them out for the day | Left out for the day | A caregiver who dropped one visit but could do a later one | Someone who just called out is usually unavailable, and the text would read badly. |
| **Showing the reasoning** | Show only the order · show everything · show the top reasons, the rest on request | Two facts and a match score per caregiver. The score opens a small card with its four parts, and every rule-out is one step away | Some detail at a glance | A scheduler won't trust an order they can't check. A screen that shows every factor for every caregiver is too much to read at 7 AM. |
| **Demo data** | Random each load · fixed simulated day | Fixed seed, the same day every time | Variety | Anyone opening the demo sees the same state, and the tests can assert on it. |

**Known gaps:** the score weights, reply windows and the 45-minute late limit are my starting assumptions and have not been tuned on real data. A caregiver who doesn't reply is never texted again for that visit. Moving a visit assumes the client agrees to the new time. Every open visit is treated as equally urgent, whatever the client needs. The simulation's reply rates are invented, so the demo can't show whether this fills more visits than a scheduler with a phone.

## Success metrics

**Measured (from the repo):**

| What | Result | Source |
|---|---|---|
| Logic tests | 17 tests on ranking, rule-outs, escalation stages, replies, late arrivals, moving a visit, client messages and double-booking | [`engine.test.ts`](src/sim/engine.test.ts) |
| Same day every load | The simulated day is rebuilt from a fixed seed and compared for equality in a test | [`data.ts`](src/sim/data.ts) |
| The simulated day at 7:40 AM | 4 call-outs: 2 covered (3 and 15 minutes after the call-out), 1 being texted, 1 flagged for a phone call after 11 texts | Live demo |
| The same day left untouched | Ends with 3 of 4 covered and 1 missed, the visit that was flagged for a phone call. Assigning or moving it by hand covers it. | Live demo |

These describe how the prototype behaves on invented data. They are not evidence that the approach works at a real agency.

**KPIs I would track with a real agency (proposed, not measured):**

| KPI | Why |
|---|---|
| Share of call-outs covered before the start time | The outcome that matters to the client |
| Time from call-out to a confirmed replacement | Whether ordered texting is faster than phoning down a list |
| Share of fills by a caregiver the client has seen before | Whether speed is costing continuity |
| Share of visits that reach "Phone needed" | How much work still lands on the scheduler |
| Share of flagged visits saved by a late arrival or a move | Whether the fallback works, or visits are still being missed |
| Minutes late on late arrivals | Whether the 45-minute limit is the right line |
| Overtime hours added by late fills | The cost of widening the search |
| Share of texts answered, and how fast | Whether the reply windows fit how caregivers use their phones |
| Call-outs by caregivers who accepted a fill | Whether quick yeses turn into kept visits |

## Roadmap

Ordered by how much each item would teach about whether the idea works.

| | Item | Why |
|---|---|---|
| **Next** | Run it against a real agency's past call-outs | Shows whether the ranking would have picked the caregiver who took the visit, before anything is sent to anyone |
| **Next** | Let the agency set the weights and the overtime threshold | These are the agency's trade-offs to make, not the product's |
| **Next** | Real text messages | The phone on screen is a stand-in |
| **Next** | Rank open visits by what the client needs | A missed medication or lift-transfer visit is more serious than a missed meal-prep visit, and the scheduler's calls should go there first |
| **Next** | Record why a visit was missed | Lets the agency see patterns: a skill nobody has, a branch that is short on a weekday |
| **Later** | Flag visits likely to be called out before it happens | Covering a visit the night before is easier than at 7 AM |
| **Later** | Client preferences beyond language and pets | Many clients have people they do and don't want |

No RICE scores: there is no usage data to estimate reach honestly.

## Technical overview

A static single-page app with no backend. The whole simulation runs in the browser.

| Area | Choice |
|---|---|
| Stack | React 19, TypeScript, Vite, Tailwind CSS v4, [shadcn/ui](https://ui.shadcn.com), [lucide-react](https://lucide.dev) icons |
| Ranking | [`src/sim/rank.ts`](src/sim/rank.ts): rule-outs, the four scoring factors and their weights in one place |
| Offers | [`src/sim/engine.ts`](src/sim/engine.ts): escalation stages, replies, cover, withdraw and hand-off, as functions that take a state and return a new one |
| Simulated day | [`src/sim/data.ts`](src/sim/data.ts): 30 caregivers, 42 clients and 53 visits on an invented street grid, generated from a fixed seed |
| Tests | [`src/sim/engine.test.ts`](src/sim/engine.test.ts) (Vitest) |
| Design | [DESIGN.md](DESIGN.md) holds the colours, type and rules. Colours are generated from contrast ratios with Adobe Leonardo ([`scripts/palette.mjs`](scripts/palette.mjs)). |
| CI/CD | [`deploy.yml`](.github/workflows/deploy.yml) runs the tests and a type-checked build, then deploys to GitHub Pages on every push to `main` |

## Running it locally

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # ranking and offer logic tests
npm run build
```

## Limitations

- All data is simulated. How often caregivers reply, how fast, and how likely they are to say yes are assumptions built into the demo.
- No real messages are sent to caregivers or clients. No logins, no saved data, and no connection to a scheduling system.
- Driving time is estimated from a street grid, not from a map.
- It covers one day at one agency. Recurring visits, multi-day cover and payroll rules are out of scope.

## Credits

Product and prototype by Joseph Fan.

<!-- TODO(Joseph): no LICENSE file. Add one if you want others to reuse the code, or note "All rights reserved." -->
