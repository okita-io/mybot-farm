# Categories — how the market is browsed

**Date:** 2026-09-11  
**Idea:** Shop by **life job**, not by file format. Categories apply to both **agents** and **teams**.

---

## Primary categories (v0 draft)

| Slug | Label | What shows up here |
|------|-------|--------------------|
| `lifestyle` | Lifestyle | Home, family, habits, gifts, health-adjacent reminders (non-clinical) |
| `productivity` | Productivity | Calendar, email triage, personal ops, “don’t drop the ball” |
| `coding` | Coding | Programmer, debugger, reviewer, devops helpers |
| `writing` | Writing | Draft, edit, newsletter, humanizer |
| `marketing` | Marketing | Positioning, social, SEO/AEO, launch checklists |
| `sales` | Sales | Prospecting, follow-ups, call coach (send still human-gated) |
| `research` | Research | Competitive intel, librarians, brief writers |
| `finance-personal` | Personal finance | Budgets, card rewards, bill reminders — scrub bank secrets |
| `creative` | Creative | Image/video workflows, clip desks, brand kits |
| `music` | Music | Venue scouting, booking contacts, set lists, tour ops (send still human-gated) |
| `education` | Education | Tutors, study plans, course builders |
| `ops` | Ops / admin | Inbox zero crews, CRM hygiene, meeting notes |
| `experimental` | Experimental | Weird bots, demos, WebMCP toys |

Listings can take **one primary** + optional **tags** (freeform or curated).

---

## Lifestyle examples (anchor stories)

These make the farmers-market feel human, not only “dev tools”:

- **Birthday & gift remembrancer** — tracks family birthdays, nudges “order/send gift by Friday,” never auto-charges without you.
- **Plant / pet care log** — routines + journal on the agent’s computer.
- **Household inventory** — “do we have spare filters?” with a simple vault.
- **Travel packing co-pilot** — trip-length packing lists + reminders.
- **Thank-you note nudger** — after events, drafts a note; you send.

Coding bots (programmer + debugger **team**) sit beside these — same market, different aisle.

---

## Category rules

1. **Primary category required** for every public bot.  
2. **Teams inherit** the primary of their main job (e.g. programmer+debugger → `coding`) and may add tags (`pair`, `debugging`).  
3. Prefer **outcomes people recognize** over runtime jargon (`lifestyle` not `cron-reminder-agent`).  
4. No medical diagnosis / regulated advice categories without a later policy pass.  
5. SEO/AEO: category pages are real URLs (`/categories/lifestyle`) with short human blurbs.

---

## Suggested URL map

```text
/categories
/categories/lifestyle
/categories/coding
/categories/music
/agents?category=lifestyle
/teams?category=coding
```

---

## Open decisions

- [ ] Fixed enum vs admin-editable categories  
- [ ] Age / safety labeling for lifestyle bots that touch kids’ birthdays (family data scrub)  
- [ ] “Featured in lifestyle” editorial slot vs pure open sort
