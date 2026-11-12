# Songs module overhaul

Date: 2026-11-11
Branch: `feature/songs-module-overhaul`
Source: UI critique of `/dashboard/songs`, `/dashboard/songs/[songId]` and related dialogs/viewers.

## Goal

Resolve every P1 and P2 finding from the songs module critique, plus the cheap minor
observations, without introducing new libraries or changing unrelated modules.

## Tasks

### 0. Remove duplicated songs UI

- Make `apps/app/src/features/songs/components/*` the canonical implementation.
- Replace `apps/app/src/components/songs/*` duplicates with re-exports.
- Replace feature copies of `lib/songs`, `lib/music/*`, `hooks/use-songs` and
  `app/actions/songs` with re-exports of the live files.
- Verify imports with `rg "components/songs|features/songs"` and the test suite.

### 1. Capo end-to-end

- Add `capo` (smallint, default 0) to both Drizzle schemas.
- Generate a migration in `packages/db`; sync `apps/app/src/db/schema/songs.ts`.
- Add `capo` to `songInputSchema` (int 0–12) and keep `undefined` on partial updates.
- Persist capo in `createSongAction`, `updateSongAction`, REST POST/PATCH, import.
- Parse/round-trip capo in chords parser, show capo in the viewer with a target-key
  selector, transpose correctly (display chords for the shape key + capo).
- Show capo in song detail and song card metadata.

### 2. Repertoire intelligence

- Add a usage helper that returns the next service, last service, distinct service
  count and usage history for a song.
- Order plan-item usage by event date, not creation date.
- `getSong`: stop stale caching and remove unused `createdBy` PII.
- List/detail filters: missing chords, missing lyrics, usage; sorting by usage.
- Add "adicionar ao próximo culto" server action with permission checks, revalidation
  and cache invalidation; wire it into card/detail actions.
- Add a "sem letra/sem cifra" counters strip.

### 3. Viewer and stage mode

- Persist font size and view mode in localStorage.
- Toolbar: capo, target key, font controls, view toggle with 44px targets.
- Keyboard shortcuts (`+`/`-`, `T`, `C`, arrows, `Esc`, fullscreen).
- Fullscreen dialog with focus trap, `aria-modal`, labelled controls.
- Tone helper for key signatures/semitones.

### 4. Accessibility

- Visible focus rings on interactive controls (inputs, buttons, cards, tabs).
- Combobox semantics for collection picker (role, aria-expanded, listbox/option,
  keyboard navigation).
- `aria-pressed` on toggles; `aria-label` on icon-only buttons.
- Contrast fixes (muted metadata, badge colors), remove zoom lock, `motion-safe`
  pulse, mobile labels for icon buttons.

### 5. Visual noise and secondary flows

- Consolidate streaming links into one menu; declared availability source.
- Reduce section color palette; metadata at 12px.
- Rename "Kanban" to "Colunas"; tabs horizontally scroll on mobile.
- Real drag-and-drop on the list board (pointer + keyboard reorder).
- Reset/dirty guard in import dialog; preview with capo; search vs. exact link.
- Reset manual form; standardize "Grupo"; fix counts; restore X in search dialog.
- H1 line-clamp, dedupe tags, accent-insensitive search.
- Add Músicas to mobile nav and PageInfo.

### 6. Verification

- `bun test --preload ./src/test/setup.ts` (app workspace).
- `bun run lint`, `bun run typecheck`, `bun run build`.
- Run the impeccable detector on changed UI files.
- Commit in Conventional Commits; merge into `develop` with `--no-ff`.
