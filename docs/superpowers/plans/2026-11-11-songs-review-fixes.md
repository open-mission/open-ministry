# Songs Module Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the verified review gaps and complete shared, accessible manual ordering for the church songs repertoire.

**Architecture:** Keep service usage and permission enforcement server-side; expose actions in the client independently from song CRUD controls. Add organization-wide manual order to the song table, write it through a permission-checked server action, and use the already-installed dnd-kit sensors only in the unfiltered manual-sort view. Keep chord-viewer key helpers pure and share the existing streaming-link renderer between detail surfaces.

**Tech Stack:** Next.js 16.4.5 App Router, React 19, Bun, Drizzle ORM, Neon/Postgres, dnd-kit core/sortable, Bun tests.

**Spec:** `docs/superpowers/specs/2026-11-11-songs-review-fixes-design.md`

## Global Constraints

- Read relevant guides from `apps/app/node_modules/next/dist/docs/` before writing Next.js code; installed Next.js is 16.4.5.
- Do not add dependencies; `@dnd-kit/core` and `@dnd-kit/sortable` are already installed.
- Capo is an integer from 0 through 12 and is stored as PostgreSQL `smallint`.
- Service usage and next-service selection include only events where `event.kind = 'service'`.
- Reordering is organization-wide, persisted, and authorized with `music.updateSong`; the add-to-service action remains authorized by `music.read` and event-scoped `schedules.editPlan`.
- Reordering is available only in manual sort mode with no active filters/search; keyboard and pointer input must both work.
- UI copy remains pt-BR and follows the existing visual system.
- Keep changes on `feature/songs-module-overhaul`, use Conventional Commits, and merge to `develop` with `--no-ff` per repository Git Flow.
- Run app tests plus root `bun run lint`, `bun run typecheck`, and `bun run build`; the prior build was blocked by DNS failure resolving `fonts.googleapis.com`, so retry and report accurately if still blocked.

## Review Focus

- Generic events must not inflate culto counts or become next-service destinations; test mixed `service`/`event` usage rows and an upcoming generic event before a service.
- Reorder requests must reject duplicate, missing, or foreign-organization IDs without changing any position; test each invalid shape.
- A user who can read songs but cannot manage song records must still see the add-to-next-service action; server permission checks must still reject an unauthorized event.
- Stage shortcuts must not consume keys from the rest of the page or from focused inputs, selects, links, and buttons; test active/inactive scope and control focus.
- Filtered lists must not silently alter the relative positions of hidden songs; test the unfiltered/manual-only reorder guard.

---

### Task 1: Restrict usage and next-service queries to actual services

**Files:**
- Modify: `apps/app/src/lib/song-usage.ts`
- Modify: `apps/app/src/lib/songs.ts`
- Test: `apps/app/src/lib/__tests__/songs.test.ts`

**Interfaces:**
- `SongUsageRow` carries `eventKind: string`; `summarizeSongUsage` and `buildSongUsageMap` ignore rows whose `eventKind !== "service"`.
- Database usage/history/next-event queries also filter `schema.event.kind` to `"service"`.

- [x] **Step 1: Add failing usage tests**
  - Add mixed service/event fixtures and assert only service rows affect `nextEvent`, `lastEvent`, `eventCount`, and `planItemCount`.
  - Add a database-query/action test where the nearest future generic event is skipped in favor of the next future service.
- [x] **Step 2: Run focused tests and confirm the expected failure**

Run: `bun test --preload ./src/test/setup.ts ./src/lib/__tests__/songs.test.ts` from `apps/app`.

Expected: the new generic-event assertions fail before production changes.
- [x] **Step 3: Filter usage, history, and next-service data**
  - Add `eventKind` to the usage query and filter its SQL by `kind = "service"`.
  - Add the same service-kind condition to `getSong` plan-item history and `getNextEventForSong`.
  - Make the pure usage helpers defensively ignore non-service rows.
- [x] **Step 4: Re-run focused tests**

Expected: all service-only usage and selection assertions pass.
- [x] **Step 5: Commit**

Commit message: `fix(songs): exclude generic events from service usage`

### Task 2: Expose add-to-next-service independently of song CRUD

**Files:**
- Modify: `apps/app/src/app/(app)/dashboard/songs/page.tsx`
- Modify: `apps/app/src/app/(app)/dashboard/songs/[songId]/page.tsx`
- Modify: `apps/app/src/features/songs/components/songs-list-view.tsx`
- Modify: `apps/app/src/features/songs/components/song-card.tsx`
- Modify: `apps/app/src/features/songs/components/song-detail-view.tsx`
- Modify: `apps/app/src/features/songs/components/song-detail-header-actions.tsx`
- Test: relevant songs action/component tests under `apps/app/src/lib/__tests__/`

**Interfaces:**
- Add explicit `canAddToNextService` props through list/detail components, separate from `canManage` / `canUpdate` / `canDelete`.
- Song pages pass `true` only after their existing `music.read` gate; `addSongToNextServiceAction` remains the final authorization boundary.

- [x] **Step 1: Add a regression test for a read-only song user**
  - Verify add-to-next-service visibility is independent of create/update/delete capability.
  - Verify the action still returns a permission error for a user without event-scoped `schedules.editPlan`.
- [x] **Step 2: Run the focused test and confirm failure**
- [x] **Step 3: Thread the separate capability through list cards and detail actions**
  - Keep edit/group/delete controls behind their current song-management capability.
  - Render the add action for music readers even when all song-mutation controls are absent.
- [x] **Step 4: Re-run the focused test**
- [x] **Step 5: Commit**

Commit message: `fix(songs): show service shortcut to repertoire readers`

### Task 3: Correct chord-viewer shortcuts and target-key choices

**Files:**
- Modify: `apps/app/src/lib/music/chords-utils.ts`
- Modify: `apps/app/src/lib/__tests__/songs.test.ts`
- Modify: `apps/app/src/features/songs/components/chords-viewer.tsx`

**Interfaces:**
- Add a pure helper that returns target tones in the same major/minor mode as the original tone.
- Handle shortcuts only when the fullscreen stage viewer is active and the event target is not an interactive control.
- `T` focuses the target-tone select; `C` copies the transposed chord sheet.

- [x] **Step 1: Add failing tests for same-mode targets and shortcut mapping/scope**
  - For `C`, target options contain major keys only; for `Am`, minor keys only.
  - Outside fullscreen or when an interactive control is focused, the shortcut helper returns no action.
  - In fullscreen, `T` maps to focus target tone and `C` maps to copy.
- [x] **Step 2: Run focused tests and confirm failure**
- [x] **Step 3: Implement pure tone/shortcut helpers and use them in the viewer**
  - Remove the window-wide side effects for normal detail-page browsing.
  - Keep existing `+`, `-`, `0`, arrows, `F`, and `Escape` behavior inside stage mode.
- [x] **Step 4: Re-run focused tests**
- [x] **Step 5: Commit**

Commit message: `fix(songs): scope stage shortcuts and preserve key mode`

### Task 4: Consolidate quick-drawer streaming links

**Files:**
- Modify: `apps/app/src/features/songs/components/song-quick-drawer.tsx`
- Reuse: `apps/app/src/features/songs/components/song-streaming-links.ts`

**Interfaces:**
- Use `getStreamingLinks(song)` and `streamingLinkLabel(link)` for the quick drawer’s platforms menu.

- [x] **Step 1: Add a focused test for the shared link list and search/direct labels if not already covered**
- [x] **Step 2: Run the focused test and confirm failure if it tests a new case**
- [x] **Step 3: Replace separate YouTube/Spotify badges with the consolidated menu, including YouTube Music and search-vs-direct copy**
- [x] **Step 4: Re-run the focused test and lint the component**
- [x] **Step 5: Commit**

Commit message: `fix(songs): consolidate quick drawer audio links`

### Task 5: Persist capo as smallint and add shared song order

**Files:**
- Modify: `apps/app/src/db/schema/songs.ts`
- Modify: `packages/db/src/schema/songs.ts`
- Add: generated migration and snapshot under `packages/db/src/migrations/`
- Modify: `apps/app/src/lib/songs.ts`
- Modify: `apps/app/src/app/actions/songs.ts`
- Modify: `apps/app/src/app/api/songs/route.ts`
- Modify: `apps/app/src/features/songs/components/songs-list-view.tsx`
- Modify: `apps/app/src/features/songs/components/song-card.tsx`
- Add: focused ordering helper and tests in `apps/app/src/lib/`
- Test: `apps/app/src/lib/__tests__/songs.test.ts` and new order/action tests

**Interfaces:**
- Add `sortOrder: integer` to song records and keep `capo` as PostgreSQL `smallint`.
- Add pure `moveSongId(ids: string[], activeId: string, overId: string): string[]` for deterministic reordering.
- Add `reorderSongsAction(orderedSongIds: string[]): Promise<SongActionResult>`; require `music.updateSong`, verify the submitted IDs exactly match songs in the current organization, then update all positions in one transaction.
- New song creation in server action and REST POST appends after the organization’s current maximum `sortOrder`.

- [x] **Step 1: Add failing tests for ID movement, invalid reorder payloads, and deterministic migration/default behavior**
  - Assert moving an item before/after another preserves all IDs exactly once.
  - Assert duplicate, missing, and foreign IDs are rejected without writes.
  - Assert new songs append after the maximum position.
- [x] **Step 2: Run focused tests and confirm the expected failures**
- [x] **Step 3: Add schema fields and generate the migration**
  - Use `smallint` for `capo`.
  - Add integer `sort_order`, backfilled per organization in `(title, id)` order.
  - Read the installed Drizzle/Neon guidance before selecting transaction APIs.
- [x] **Step 4: Implement append-order creation and the authorized reorder action**
  - Use one transaction for the complete position update.
  - Reject non-unique or incomplete organization song ID lists before writing.
- [x] **Step 5: Re-run focused helper/action tests**
- [x] **Step 6: Commit**

Commit message: `feat(songs): persist shared manual repertoire order`

### Task 6: Add accessible pointer and keyboard reordering

**Files:**
- Modify: `apps/app/src/app/(app)/dashboard/songs/page.tsx`
- Modify: `apps/app/src/features/songs/components/songs-list-view.tsx`
- Modify: `apps/app/src/features/songs/components/song-card.tsx`
- Add: `apps/app/src/features/songs/components/sortable-song-card.tsx`
- Test: `apps/app/src/lib/__tests__/songs.test.ts` for the reorder guard/merge helper

**Interfaces:**
- Add `canReorder` from the server page using `can("music", "updateSong")`.
- Add a “Ordem manual” sort option that sorts by `sortOrder` and title as a deterministic tie-breaker.
- Render a 44px accessible drag handle only for authorized users in manual mode with no active filters/search.
- Use dnd-kit `PointerSensor`, `KeyboardSensor`, and `sortableKeyboardCoordinates`; after drop, call `reorderSongsAction` with the complete unfiltered order.

- [x] **Step 1: Add failing tests for the manual-sort/active-filter reorder guard and full-list order calculation**
- [x] **Step 2: Run focused tests and confirm failure**
- [x] **Step 3: Implement dnd-kit sortable cards with pointer and keyboard sensors**
  - Reuse the existing card presentation; keep drag activation on a dedicated button, not the card/link surface.
  - Announce the handle purpose and keyboard instructions accessibly.
  - Preserve optimistic visual order and restore it with an error toast if the action fails.
- [x] **Step 4: Re-run the order tests and verify the route/type integration**
- [x] **Step 5: Commit**

Commit message: `feat(songs): add accessible manual song reordering`

### Task 7: Full verification and integration

**Files:**
- Update: `docs/superpowers/plans/2026-11-11-songs-review-fixes.md` checkboxes/results

- [x] **Step 1: Run app tests**

Run: `bun run test` from `apps/app`.

Expected: all tests pass.
- [x] **Step 2: Run repository lint and typecheck**

Run: `bun run lint` and `bun run typecheck` from the repository root.

Expected: exit 0; report existing warnings separately.
- [x] **Step 3: Run repository build**

Run: `bun run build` from the repository root.

Expected: exit 0; if Google Fonts DNS still fails, record the exact external blocker without changing font/product code.
- [x] **Step 4: Review final diff against this spec and all review focus cases**
- [x] **Step 5: Commit any final review fixes with Conventional Commit messages**
- [ ] **Step 6: Merge `feature/songs-module-overhaul` into `develop` with `--no-ff`, verify the merged test suite, and delete the feature branch**


#### Verification results

- App tests: `bun run test` — 284 passed, 2 skipped, 0 failed (48 files).
- Root lint: `bun run lint` — exit 0; 21 warnings remain in unrelated files.
- Root typecheck: `bun run typecheck` — exit 0.
- Root build: `bun run build` attempted; the app build is blocked because DNS returns `ENOTFOUND fonts.googleapis.com` while Next.js fetches Fraunces and Geist. No font or product code was changed.
- Final review: no Critical findings; stage shortcuts were additionally scoped to the fullscreen element. Deferred Minor: the next-service query has predicate coverage but no DB fixture asserting the selected service end-to-end.
- Commits: `f2b12d6` (manual reorder UI), `5ffd373` (fullscreen shortcut scope).
- Integration merge remains pending.
