# Calendar subscription (ICS) — design

Date: 2026-11-19
Branch: `develop` (backend by Mayk; frontend hook by Erick)
Status: **plan only** — nothing implemented, no migration generated.

## Intent

Church members want the events they care about — services, rehearsals and,
above all, the schedules where they are assigned — mirrored in the calendar they
already use (Apple Calendar, Google Calendar, Outlook), without opening the app
every day. The request is an "subscribe once, it keeps updating" feed.

The correct mechanism for that is a **public ICS URL per subscriber**. Calendar
clients poll the URL on their own schedule and merge changes into the local
calendar. There is no push: "automatic" means "on the client's next refresh".

## What the codebase already gives us

- Recurring events are **materialized as rows**: `createEventAction` calls
  `generateOccurrences()` (`lib/recurrence-utils.ts`, cap `MAX_RECURRENCE_INSTANCES = 104`)
  and inserts one `event` row per occurrence with a shared `seriesId`.
  → The feed does **not** need `RRULE`, `EXDATE` or `RECURRENCE-ID` logic. One
  `event` row = one `VEVENT`.
- Assignments are already normalized: `schedule` (one per event) →
  `schedule_assignment` (`scheduleId`, `departmentId`, `functionId`, `personId`).
- `person.userId` links a member to the Better Auth `user` (unique per
  organization), so a feed can be resolved from the logged-in user.
- `event.kind` is `service | event | rehearsal` (`lib/event-options.ts`).
- There is a precedent for token-based public access: `event.publicShareToken`
  (`/share/cronograma/[token]`, `/api/events/[eventId]/plan/pdf`).
- Organization timezone is still hardcoded as `America/Sao_Paulo`
  (`EVENT_TIME_ZONE`); `user.timezone` exists but is per user.

## Goals

1. A **personal feed** per member containing the services/rehearsals they can
   see plus a clear marker on the ones where they are assigned.
2. A **church feed** with only the events explicitly published, for people who
   just want the church calendar (no assignment data).
3. Token lifecycle: generate, rotate/revoke, last-used tracking — no session
   cookie needed by the calendar client.
4. Correct, spec-compliant ICS: CRLF, 75-octet folding, escaped text, stable
   UIDs, UTC times, `text/calendar; charset=utf-8`.
5. Cheap: one request = a few indexed queries, no N+1, no per-poll writes.

## Non-goals

- **Two-way sync** with Google/Apple (creating events in the app from the
  calendar). That requires Google OAuth verification, `watch` channels and
  quota management — a separate project.
- Instant delivery. ICS is pull-based.
- Sharing other members' schedules or personal data in a feed.
- RSS/JSON feeds, webhooks, or e-mail digests.

## Architecture

### 1. Data model — new table `calendar_feed`

| column | type | notes |
| --- | --- | --- |
| `id` | text PK | `randomUUID()` |
| `organization_id` | text FK → organization, cascade | tenant scope |
| `person_id` | text FK → person, cascade, nullable | `null` = church feed |
| `token_hash` | text unique | SHA-256 of the raw token (hex) |
| `label` | text | e.g. "iPhone do João", "Feed da igreja" |
| `include_services` | boolean default true | church services (`kind = 'service'`) |
| `include_rehearsals` | boolean default true | rehearsals (`kind = 'rehearsal'`) |
| `include_department_events` | boolean default true | events of departments the person belongs to |
| `include_assignments` | boolean default true | only feed events where the person is assigned |
| `is_church_feed` | boolean default false | `true` ⇒ public feed keyed by org slug |
| `revoked_at` | timestamp nullable | rotation sets it instead of deleting |
| `last_used_at` | timestamp nullable | throttled write at most 1×/hour |
| `created_by_user_id` | text nullable | audit |
| `created_at` / `updated_at` | timestamp | project pattern |

Indexes: unique `token_hash`; `organization_id`; `(organization_id, person_id)`.

**Token handling:** generate 32 random bytes, `base64url` (43 chars). Store only
the SHA-256 hash and return the raw token **once**, at creation/rotation (same
policy as an API key). Losing the URL = rotate; nothing is recoverable from the
database. Rotation: set `revoked_at = now()`, insert a new row.

If the team prefers "see my link any time", the alternative is storing the token
encrypted with an app secret — that weakens the "DB leak" posture, so it is a
decision, not a detail.

Alternative considered: reusing `event.publicShareToken` or a column on
`person`. Rejected — per-member feeds need independent revocation, multiple
devices and a "church" variant.

Migration `0037_*.sql` via `drizzle-kit generate`, plus the usual **RLS policies
and grants** for `app_authenticated` (SELECT/INSERT/UPDATE scoped by
`organization_id`), mirroring `0036_fearless_scarecrow`. The public endpoints
read with the service connection; they are not reachable through RLS clients.

### 2. Endpoints

| route | auth | purpose |
| --- | --- | --- |
| `GET /api/calendar/feed/[token]` | token in path | personal or church feed |
| `POST /api/calendar/feed` | session | create feed (server action preferred, see below) |
| `DELETE /api/calendar/feed` | session | rotate/revoke |

Prefer **server actions** for create/rotate (`features/settings/actions/*`),
consistent with the rest of the app, and keep only the GET as a route handler.

Public GET requirements:

- `Content-Type: text/calendar; charset=utf-8`
- `Content-Disposition: inline; filename="openministry.ics"`
- `ETag` = SHA-256 of the body; `If-None-Match` → `304`
- `Cache-Control: private, max-age=300`
- Unknown token → `404` (no distinction between "never existed" and "revoked"),
  revoked → same `404` to avoid leaking which tokens were valid
- rate limit per token/IP if the existing infra allows; otherwise rely on
  entropy + `ETag` and document the gap
- never read cookies, never redirect to login

`last_used_at` is updated fire-and-forget at most once per hour per feed.

### 3. Feed content (selection rules)

Personal feed, resolved from `token → feed.personId`:

1. `person.userId = feed person` and same `organizationId`; if the person was
   deleted or has no user, the feed returns an empty calendar rather than 404.
2. Window: `starts_at >= now() - 30 days` and `starts_at <= now() + 12 months`.
   Hard cap of ~1,500 events; truncate from the oldest, log a warning.
3. Included events:
   - `kind = 'service'` when `include_services`;
   - `kind = 'rehearsal'` when `include_rehearsals` **and** the event is linked
     to a department the person belongs to (`department_member`);
   - other events linked to the person's departments when
     `include_department_events`.
4. Assignment marker: the event is in `schedule_assignment` for
   `schedule.eventId = event.id` and `personId = feed.personId`.
   `SUMMARY` becomes `Escala: <title>`, and `DESCRIPTION` lists the person's own
   department/function pairs only.
5. **Never** include other people's names, notes from `schedule.notes`,
   availability, or anything outside the member's visibility in the app.

Church feed (`is_church_feed = true`): events where the new
`event.include_in_public_calendar` flag is `true` and `event.kind IN ('service','event')`.
No assignments, no school-style internal notes, no rehearsal repertoire unless
explicitly published.

Event visibility must reuse the app's existing permission logic where possible
(`can("agenda", "read")`, department visibility) instead of a second, divergent
rule set — the feed is a view, not a second authorization system.

### 4. ICS payload

Per `VEVENT` (one per materialized `event` row):

- `UID: evt-<eventId>@openministry.online` — stable across edits and refreshes,
  so clients update instead of duplicating.
- `DTSTAMP: now` (UTC), `LAST-MODIFIED: event.updatedAt`,
  `SEQUENCE: floor(updatedAt / 1000) % 2^31` — forces clients to accept edits.
- `DTSTART`/`DTEND` in **UTC** (`YYYYMMDDTHHMMSSZ`). No `VTIMEZONE` block; the
  client renders in its own zone. `X-WR-TIMEZONE:America/Sao_Paulo` only for
  display defaults.
- `SUMMARY`: `event.title`; `Escala: ` prefix for own assignments.
- `LOCATION`: `event.location`.
- `DESCRIPTION`: app deep link `https://app.openministry.online/dashboard/events/<id>`,
  plus own function(s), plus `event.description` (sanitized to plain text).
- `STATUS: CONFIRMED`.
- Escaping: `\` → `\\`, `;` → `\;`, `,` → `\,`, newline → `\n`; fold at 75
  **octets** with `CRLF + space`; UTF-8 bytes (accented Portuguese must not be
  split mid-character).
- Calendar headers: `VERSION:2.0`, `CALSCALE:GREGORIAN`, `METHOD:PUBLISH`,
  `PRODID:-//OpenMinistry//Calendar Feed//PT-BR`, `X-WR-CALNAME`,
  `X-WR-CALDESC`, `X-PUBLISHED-TTL:PT1H`, `REFRESH-INTERVAL;VALUE=DURATION:PT1H`.
- Optional `VALARM` at `-PT2H`, **off by default** (the app already sends push
  and e-mail; a calendar alarm doubles it).

Implementation: a small pure module
`features/calendar/lib/ics.ts` (`escapeIcsText`, `foldIcsLine`, `buildCalendar`,
`buildEvent`). ~150 lines, no dependency; it is fully unit-testable. Adding the
`ics` npm package is an option but buys little once folding and escaping are
covered by tests.

### 5. Product surface

- `/dashboard/settings` (or `/dashboard/profile`) gets a card **"Sincronizar
  com meu calendário"**: shows the `webcal://` link right after generation, a
  copy button, an "Add to Google Calendar" link
  (`https://calendar.google.com/calendar/r?cid=webcal://…`), the toggles and a
  "Gerar novo link" (rotate) action. Frontend work — Erick.
- Event form gets **"Publicar no calendário da igreja"** (writes
  `include_in_public_calendar`); church settings get the public feed URL.
  Frontend work — Erick, contract below.
- Onboarding copy must say: **updates arrive when the calendar app refreshes**
  (Google typically every 8–24 h, Apple roughly hourly, Outlook similar).

### 6. Backend contract for the frontend

```
createCalendarFeedAction(input: {
  label?: string;
  includeServices: boolean;
  includeRehearsals: boolean;
  includeDepartmentEvents: boolean;
  includeAssignments: boolean;
}) -> { ok: true; url: string }   // url shown once
rotateCalendarFeedAction(feedId: string) -> { ok: true; url: string }
listCalendarFeedsAction() -> { feeds: Array<{ id, label, createdAt,
  lastUsedAt, revokedAt, webcalUrl: null }> }  // never returns the token
updateCalendarFeedAction(feedId, toggles) -> { ok: true }
```
`webcalUrl` is always `null` on read — the raw token is not recoverable.

## Risks and limits (honest list)

1. **Latency, not real time.** A change can take hours to appear. If a service
   moves, the app notification is still the reliable channel.
2. **The URL is a password.** Google stores it on its servers; a leaked link
   exposes that member's schedule. Rotation must be one click, and the UI must
   say so.
3. **Deleted events.** Removing a row makes it vanish from the feed; most
   clients drop it, some keep a stale entry. A `calendar_tombstone`
   (`STATUS:CANCELLED`, purged after ~90 days) fixes this — planned as phase 3,
   not MVP.
4. **`event.isOverride` / series edits** are already materialized, so no special
   case — but any future change to "expand at read time" would break the feed's
   assumption and must be revisited.
5. **Timezone**: UTC output is safe; the hardcoded `America/Sao_Paulo` remains a
   limitation for churches in other zones (separate task: `organization.timezone`).
6. **No client-side dedupe across two feeds**: subscribing to both the personal
   and church feed shows the same service twice (different UIDs). Document it;
   do not try to be clever.

## Phases

| phase | scope | estimate |
| --- | --- | --- |
| 1 — MVP | table + migration + RLS, token create/rotate actions, `ics.ts` + tests, `GET /api/calendar/feed/[token]` personal feed (services, rehearsals, own assignments), ETag, window cap | ~1 day |
| 1.5 | settings UI + event public toggle (frontend, Erick) | ~0.5 day |
| 2 | church public feed (`include_in_public_calendar`, slug URL, no PII) | ~0.5 day |
| 3 | tombstones (`STATUS:CANCELLED`), optional `VALARM`, usage/last-used metrics, rate limiting | ~0.5 day |
| out | Google Calendar two-way sync / OAuth | separate project |

## Tests

- `ics.test.ts`: folding at exactly 75/76 octets, multi-byte characters,
  escaping of `, ; \ \n`, CRLF line endings, empty calendar still valid, stable
  UID, `SEQUENCE` from `updatedAt`, UTC formatting.
- `feed-builder.test.ts`: window bounds, cap/truncation, assignment marker,
  department scoping, church feed excludes assignments, person with no user
  returns empty.
- Route tests: 200 + content type, `304` on matching `ETag`, `404` for unknown
  and revoked tokens, no `Set-Cookie`, no PII in body.
- Full gate before delivery: `bun test`, `bunx eslint`, `bunx tsc --noEmit`,
  `next build`.

## Decisions needed (Robsom)

1. Personal feed = "everything the member can see" or "only what they are
   assigned to + rehearsals of their department"? (defaults above assume a mix)
2. Is the church feed **public on the internet** (slug URL) or member-only
   (token URL)?
3. Should a rehearsal's repertoire appear in the event description?
4. Keep the device/calendar alarm off by default?
