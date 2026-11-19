# Song section notes & band formation — design

Date: 2026-11-18
Branch: `develop` (backend schema/services/actions by Mayk; frontend UI by Erick)
Approved by: team member (channel, 2026-11-18 — "aprovado")

## Intent

Church teams read and rehearse songs together. Today a song stores only flat
`chords`/`lyrics` text plus a few global metadata fields: there is no way to
write down practical notes for a specific section ("só guitarra e violão na
introdução", a translation of the chorus) or to record which instruments a
song's band needs. The team wants both, scoped per department (the same song can
be arranged differently by Louvor and by Jovens), readable by everyone with
access to the music module and editable by whoever can edit songs.

This is the first, simple step. A later step will compare band formations across
the songs of a service and warn about conflicting configurations when building
schedules; that warning is a **non-goal** here, but the data model must make it
possible without a rewrite.

## Goals

- Let an authorized editor write a free-text note per section of a song, scoped
  to a department with the `music` module active.
- Show those notes, together with the song's band formation, in the chord and
  lyrics viewers for anyone who can read the song, with a department selector.
- Let an authorized editor define the band formation of a song as a set of the
  department's existing `department_function` rows (e.g. Guitarra, Baixo,
  Bateria). The MVP stores only the `functionId` set; quantity and per-function
  detail are a later enhancement.
- Expose both in the song form (new "Notas & Banda" tab) and inline in the
  viewer (edit button next to each section note).
- Use a stable, shared section key so notes do not silently jump when the chord
  text is edited or transposed.
- Keep the data referentially integral and tenant-scoped so the future
  schedule-conflict check is a simple ID comparison.

## Non-goals

- Linking a person to a function on the song itself ("quem toca" stays in each
  service's schedule).
- The cross-song band-conflict detector/alert in schedules.
- Replacing the existing `chords` text with a structured section editor.
- A new permission (`music.manageArrangements`); editing uses the existing
  global `can("music", "updateSong")`.

## Anti-goals (what would make this a failure even if it works)

- Notes keyed by the runtime `section.id` from `parseSongSections`
  (`section-${idx}-${name}`): those IDs change on transposition/reordering and
  notes would drift to the wrong section.
- Storing notes as special lines inside the `chords` text: transposition,
  copy-to-clipboard and lyric extraction would corrupt them.
- Free-text instrument names with no link to `department_function`: the future
  conflict check would need fuzzy text matching instead of ID comparison.

## Approaches considered for persistence

1. **Two relational tables (selected).** `song_section_note` and
   `song_formation_function`, each with `organizationId`, `songId`,
   `departmentId`, RLS, and unique constraints. Requires a migration but gives
   referential integrity, tenant/department scoping, and a direct path to the
   future conflict check (compare `functionId` sets).
2. **Two JSONB columns on `song`.** Cheaper and mirrors the existing `tags`
   field, but cannot enforce department/module validity, cannot efficiently
   answer "which songs need a bassist", and would need a rewrite for the
   conflict feature. Rejected.

Both were shown to the user; they approved approach 1.

## Decisions (approved or settled in conversation)

- **Scope:** per department with `music` active. A song remains organization-wide;
  notes and formation are keyed by `(songId, departmentId)`.
- **Section key:** normalized name with occurrence, e.g. `introducao#1`,
  `refrao#1`. A shared pure helper (`normalizeSectionKey` + occurrence counter)
  in `apps/app/src/lib/music/chords-utils.ts` is used by the parser
  (`parseSongSections`) and by the backend, so client and server derive the same
  key. `SongSection` gains a stable `key` field; the old `id` stays for React
  keys/animation only.
- **Orphan notes:** if a section no longer exists in the chord text, its note is
  not shown silently — it appears under a "Sem seção" bucket so the editor can
  recover or delete it.
- **Band formation:** only `functionId`s of `department_function` are stored
  in the MVP. Who plays is defined in each service's `scheduleAssignment`.
  Quantity/per-function detail and binding people on the song are later
  enhancements.
- **Permissions:** reading for users who can read the song and belong to a
  department with `music` active (admins see all); editing requires global
  `can("music", "updateSong")`. No new catalog permission.
- **Where to view:** a department selector at the top of the viewer. Users in a
  single department see it preselected; users in several pick one; admins can
  pick any.
- **Where to edit:** the song form's new "Notas & Banda" tab and inline edit
  buttons in the viewer for authorized editors.

## Backend contract (implemented by Mayk)

Tables (Neon/Drizzle, with RLS and department validated in the organization with
`music` active):

- `song_section_note`: `id`, `organizationId`, `songId`, `departmentId`,
  `sectionKey`, `sectionLabel`, `note`, `updatedById`, timestamps. Unique on
  `(songId, departmentId, sectionKey)`.
- `song_formation_function`: `id`, `organizationId`, `songId`, `departmentId`,
  `functionId` (FK → `department_function`), `sortOrder`. Unique on
  `(songId, departmentId, functionId)`. The MVP persists function IDs only
  (no quantity/notes per function).

Actions/services:

- `getSongArrangementsAction(songId)` (or RSC load): returns, per `departmentId`
  accessible with `music` active, `{ notes: Record<sectionKey, string>,
  selectedFunctionIds: string[] }` plus labels/quantities/details.
- `saveSongSectionNotesAction(songId, departmentId, notes)` — validates
  `updateSong` and the department link.
- `saveSongFormationAction(songId, departmentId, functionIds: string[])` — same checks.
  Read payload exposes `selectedFunctionIds: string[]` per department, not
  function objects.
- Shared pure `normalizeSectionKey` / occurrence helper exported from
  `chords-utils` and consumed by both parser and backend.

The frontend treats the exact return shapes above as the contract and adjusts
only if Mayk's implementation differs; any mismatch is reconciled before UI work
is marked done.

## Frontend design

- `apps/app/src/lib/music/chords-utils.ts`: add stable `key` to `SongSection`;
  `parseSongSections` assigns keys via the shared helper with an occurrence
  counter per normalized name. Existing `id` remains.
- `SongFormDialog`: add a 4th tab "Notas & Banda" with a department selector,
  the section list detected from `chords` (and `lyrics`) with one textarea per
  section, and a checkbox list of the selected department's `departmentFunction`
  rows (function IDs only in the MVP). Submit through the two new actions.
- `ChordsViewer`: accept `sectionNotes`/`formationBySection` props; render a
  compact note strip under each section header in `sectionsView` and
  `columnsView` (the fullscreen stage reuses these nodes). With `canUpdate`,
  show a small edit button that opens an inline note editor or links to the
  form tab. Orphan notes render in a "Sem seção" card.
- `SongLyricsViewer`: render the same per-section notes on the lyrics tab.
- Plumb new props through the two other `ChordsViewer` call sites:
  `song-quick-drawer.tsx` and `features/rehearsals/components/song-chords-sheet.tsx`.
- Department selector shared component used by the form tab and the viewer;
  options come from departments with `music` active that the user belongs to
  (admin: all).
- Formatting: note text uses `text-xs`/`11px` minimum; edit targets >= 36px.
  Notes are plain text (never inside `chords`), so transposition and copy are
  unaffected. Fullscreen keyboard shortcuts are not intercepted.

## Constraints and verification

- Next.js 16 / Turborepo / Bun, shadcn/ui, Tailwind 4; follow existing patterns
  (`SongFormDialog` responsive Sheet/Dialog, `Tabs`, permission checks server-side).
- Typography floor >= 11px and click targets >= 24px (prefer 36px).
- Server actions remain authoritative; client gating is convenience only.
- All song mutations invalidate the same caches/paths as today.
- Tests: extend `apps/app/src/features/songs/__tests__/songs.test.ts` for the
  section-key helper, and add layout/markup tests for the new form tab and note
  rendering in the viewer (project uses `bun test` + `renderToStaticMarkup`, no
  Testing Library). Run root `typecheck`, `lint`, `test`, and app `build`.
- Git Flow: `feature/*` branch from `develop`, atomic Conventional Commits.
  Mayk owns commits/merges/deploy; Erick leaves frontend changes uncommitted for
  handoff unless asked.
