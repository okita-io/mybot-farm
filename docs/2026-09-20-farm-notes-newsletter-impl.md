# mybot.farm — Farm Notes signup (implementation plan)

**Status:** plan for Cursor / local implementation  
**Date:** 2026-09-20  
**Repo:** `okita-io/mybot-farm` (Next.js under `web/`)  
**Goal:** “Sign up to stay informed” list for new stalls + install notes. Bot/API can message subscribers later. **Do not use AgentMail** (transactional; unverified cap ~10 sends/day; no audiences).

---

## 1. Product decisions (locked from Manager chat)

### Copy (v1)

| Surface | Text |
|--------|------|
| **Headline** | New stalls when they land — not when you remember to check. |
| **Sub** | Whole agents and teams for Grok Bot, Hermes, and OpenClaw. Occasional, no fluff. |
| **Button** | Get farm notes |
| **Micro (footer)** | Farm updates · New stalls + install notes. No weekly digests. → **Subscribe** |

**A/B later:** headline above vs *When a new plantable pack drops, we’ll tell you.* / button *Notify me*.

**Cadence:** do not promise weekly until ops is ready. Ship as “occasional.” `[NEED: send cadence]` before first real blast.

### Placement

| Priority | Where | Why |
|----------|--------|-----|
| **P0** | Site footer (all pages) | Always available; doesn’t fight Browse / Plant / Sell |
| **P0** | Homepage mid-block after **Open bots** grid (or after **Teams are first-class**), before long How-To / WebMCP / FAQ | “Looked around, not planting yet” |
| **P1** | `/about` near “Start here” | Explain-mode readers |
| **Skip v1** | Hero, `/sell`, install pages, stall CTAs, sticky modals | Wrong intent / blocks plant job |

### Provider

**Recommend: Resend Audiences** (API-first, Vercel-friendly, Cursor plugin id `5188`).

Alternatives if Resend is rejected: Loops (product updates), Buttondown/Beehiiv (classic newsletter UI), Nitrosend/Migma (agent-native marketing). Same UX; swap the server adapter.

**Out of scope:** AgentMail for this list.

---

## 2. Architecture

```
[ FarmNotesSignup form ]
        │  POST JSON { email, source, honeypot? }
        ▼
[ POST /api/newsletter/subscribe ]  (Next.js route)
        │  validate email, rate-limit, optional Turnstile
        ▼
[ Resend Contacts / Audiences API ]
        │  audienceId = FARM_NOTES
        ▼
[ Confirmation UI ]  “You’re on the list.”
```

**Sending later (not v1 UI):** Manager / farm bot drafts → human approve → `POST` Resend Broadcast (or single-send loop) to audience. Keep **send-on-behalf** rules: never auto-blast without Alex approval.

Optional later: Clerk-signed-in users get one-click subscribe with email prefilled (still store in Resend, not only Clerk).

---

## 3. Env / secrets (Vercel + `.env.example`)

Add to `web/.env.example` (empty values only — never commit real keys):

```bash
# Resend — Farm Notes audience (newsletter / product updates)
RESEND_API_KEY=
RESEND_AUDIENCE_ID=
# Optional: From address must be a verified Resend domain
RESEND_FROM_EMAIL=notes@mybot.farm
# Optional botched-signup honeypot / abuse
# NEXT_PUBLIC_TURNSTILE_SITE_KEY=
# TURNSTILE_SECRET_KEY=
```

Vercel: set `RESEND_API_KEY`, `RESEND_AUDIENCE_ID` on Production (+ Preview if you want to test).  
Domain: verify `mybot.farm` (or subdomain) in Resend for deliverability before first send.

Privacy: update `/privacy` to mention email collection for Farm Notes, Resend as processor, unsubscribe via Resend links.

---

## 4. Repo touchpoints (expected)

| Area | Likely path | Work |
|------|-------------|------|
| Footer | `web/src/components/site-footer.tsx` | Compact email row + link to privacy |
| Home | `web/src/app/page.tsx` (or home section components) | Mid-page `FarmNotesSignup` block |
| About (P1) | `web/src/app/about/page.tsx` | Same component, `source="about"` |
| Component | `web/src/components/farm-notes-signup.tsx` (new) | Client form: email, status, a11y |
| API | `web/src/app/api/newsletter/subscribe/route.ts` (new) | Validate + Resend upsert |
| Lib | `web/src/lib/resend.ts` or `web/src/lib/newsletter.ts` (new) | Thin client wrapper |
| Site copy | `web/src/lib/site.ts` | Optional strings for headline/sub/button |
| Env docs | `web/.env.example` | Document vars |
| Privacy | `web/src/app/privacy/page.tsx` (or MDX) | Disclosure + unsubscribe |
| llms.txt | `web/public/llms.txt` | One line: Farm Notes signup exists (optional) |

Reuse existing `Container`, border/muted styles from footer so it doesn’t look bolted on.

---

## 5. API contract

**`POST /api/newsletter/subscribe`**

Request:

```json
{
  "email": "human@example.com",
  "source": "footer" | "home" | "about",
  "website": ""
}
```

`website` = honeypot (must be empty). Reject if filled.

Response:

- `200` `{ "ok": true }` — subscribed or already on list (don’t leak which)
- `400` invalid email / honeypot
- `429` rate limited
- `503` Resend misconfigured / upstream failure (generic message)

Server rules:

1. Normalize email (`trim` + lowercase).
2. Basic RFC-ish validation; reject disposable only if you already have a list (optional; skip v1).
3. Rate limit by IP (e.g. Upstash, or simple in-memory for preview + Vercel KV / Neon table if you want durable). Minimum: Resend’s own limits + coarse IP throttle.
4. Upsert contact into `RESEND_AUDIENCE_ID` with metadata `{ source }`.
5. Never log full emails to client-visible errors. Server logs: hash or redact if possible.
6. No auth required (public signup).

Idempotent: re-subscribe same email = success.

---

## 6. UI behavior

### Footer (compact)

- One line: label + email input + button **Subscribe**
- Or: “Farm notes” link that expands / focuses input
- Success: replace form with “You’re on the list.”
- Error: “Couldn’t subscribe — try again.”

### Homepage block (full)

- Headline + sub from §1  
- Email + **Get farm notes**  
- Fine print: “Occasional. Unsubscribe anytime.” → `/privacy`

### A11y

- `<label>` associated with input  
- `aria-live` for success/error  
- Button `disabled` while pending  
- Don’t rely on color alone for errors  

### Mobile

- Stack input + button full width in footer on small screens.

---

## 7. Implementation phases

### Phase 0 — Account (manual, Alex)

1. Create Resend account (or reuse).
2. Verify sending domain for `mybot.farm`.
3. Create Audience **Farm Notes**; copy Audience ID.
4. Create API key (send + audiences). Store only in Vercel / 1Password — not chat.
5. Optional: install Cursor Resend plugin (`5188`) for local agent help.

### Phase 1 — Subscribe path (this PR)

1. Env example + Vercel secrets.
2. `lib/newsletter.ts` + `POST /api/newsletter/subscribe`.
3. `FarmNotesSignup` component (`variant: "footer" | "block"`).
4. Wire footer + homepage mid-block.
5. Privacy blurb.
6. Manual smoke: subscribe test address → appears in Resend audience.

### Phase 2 — About + polish

1. About placement.  
2. Optional Turnstile if spam appears.  
3. Prefill for signed-in Clerk users.

### Phase 3 — First send (ops, not code)

1. Draft “Farm notes #1” (new stalls since launch, Hermes/OpenClaw install links).  
2. Human approve.  
3. Resend Broadcast to audience.  
4. Record cadence decision in this note.

**Bot messaging:** after Phase 1, a bot can call Resend API (or farm admin route) to draft/send — still require human approval for blasts.

---

## 8. Acceptance criteria

- [ ] Footer shows signup on every page using `SiteFooter`.
- [ ] Homepage shows mid-block with recommended headline/sub/button.
- [ ] Valid email → contact in Resend Farm Notes audience with `source` metadata.
- [ ] Invalid / honeypot → 400; no Resend call.
- [ ] Duplicate email → 200 ok (no scary error).
- [ ] Privacy page mentions Farm Notes + Resend + unsubscribe.
- [ ] No secrets in git; `.env.example` has empty placeholders only.
- [ ] Plant / Sell / catalog primary CTAs unchanged in prominence.

---

## 9. Cursor agent prompt (paste when ready to implement)

```text
Implement Farm Notes email signup on okita-io/mybot-farm per docs:

~/Documents/GlobalNotes/mybot-farm/2026-09-20-farm-notes-newsletter-impl.md

Phase 1 only:
- Resend Audiences subscribe via POST /api/newsletter/subscribe
- Component FarmNotesSignup (footer + homepage block variants)
- Wire web/src/components/site-footer.tsx and homepage mid-block after Open bots / Teams
- Update web/.env.example and privacy disclosure
- Do not use AgentMail
- Do not send any broadcast; subscribe only
- Open a PR to main with smoke notes for Alex to set RESEND_* on Vercel
```

---

## 10. Risks / non-goals

| Risk | Mitigation |
|------|------------|
| Spam signups | Honeypot + rate limit; Turnstile if needed |
| Deliverability | Verify domain before first send |
| Accidental blast | No send UI in v1; Manager approval for sends |
| Competing with plant CTA | Mid-block below catalog; footer quiet |
| PII in logs | Redact; Resend is system of record |

**Non-goals v1:** double opt-in (add if EU/CA volume grows), segmentation, in-app preference center, SMS.

---

## 11. Related

- Live site: https://mybot.farm/  
- Footer today: `web/src/components/site-footer.tsx`  
- Earlier affiliate research: defer until volume; list is separate from affiliates  
- Hermes catalog PR (unrelated): https://github.com/NousResearch/hermes-agent/pull/116428  

---

## Open questions for Alex (before or during Phase 0)

1. Resend vs Loops vs Buttondown — confirm **Resend**.  
2. From address: `notes@mybot.farm` vs `hello@…`?  
3. Double opt-in now or later?  
4. Should signed-in sellers auto-see a “get farm notes” checkbox on `/sell`? (recommend no for v1)
