# Songs module review fixes — design

Date: 2026-11-11  
Branch: `feature/songs-module-overhaul`  
Related implementation plan: `docs/superpowers/plans/2026-11-11-songs-module-overhaul.md`

## Intent

Close the verified review gaps in the songs-module overhaul and complete its
planned manual-reordering interaction. Church teams use the repertoire together,
so service history, add-to-service actions, keyboard controls, and ordering must
match the shared schedule and permissions model.

## Goals

- Count and show only events whose `kind` is `service` as cultos in song usage,
  history, and next-service selection.
- Make “Adicionar ao próximo culto” discoverable to people who can read the
  repertoire even if they cannot create, edit, or delete songs. The server action
  remains authoritative and checks permission for the selected event.
- Scope chord-viewer shortcuts to the active fullscreen stage view, ignore
  interactive controls, and define `T` as focus the target-tone selector and `C`
  as copy the current chord sheet. Preserve the existing transpose/font/fullscreen
  keys.
- Keep target-key choices in the original song’s major/minor mode because chord
  transposition preserves chord quality.
- Consolidate quick-drawer streaming links using the existing shared helper,
  including YouTube Music and the search-vs-direct labels.
- Store capo as PostgreSQL `smallint`, matching the 0–12 validation contract.
- Add organization-wide manual song order, persisted in the database and shared
  across users/devices. Use the already-installed dnd-kit pointer and keyboard
  sensors; expose reordering only in “Ordem manual” mode and only to users with
  `music.updateSong` permission. Disable drag reordering while search or other
  filters are active, so hidden songs cannot make the visible order ambiguous.
- Append newly created songs after the current manual order. Existing rows receive
  a deterministic initial order based on title and ID.

## Non-goals

- Changing the incumbent visual identity or redesigning the songs surfaces.
- Persisting per-user filter/sort preferences.
- Changing chord qualities to support parallel major/minor mode conversion.
- Replacing server-side permission checks with client-only gating.
- Adding a new dependency.

## Approaches considered for manual ordering

1. **Shared database order (selected):** add a song ordering field and an
   authorized reorder action, then use dnd-kit in the list. The whole team gets
   one stable order on every device. This needs a migration and a manual sort
   mode, but best matches a church-wide repertoire.
2. **Browser-local order:** save IDs in localStorage. This avoids a migration,
   but produces different orders per user/device and can become stale as songs
   are added or removed, so it does not fit the shared-team workflow.

## Design decisions

- Persist one integer order per song within its organization; seed current rows
  deterministically and append later-created songs.
- Reordering sends the complete organization song-ID order to a server action.
  The action verifies update permission and organization ownership before writing
  positions. UI restrictions are convenience only; server authorization is the
  security boundary.
- Reorder only when manual sorting is selected and no filters/search are active.
  Pointer drag and keyboard sorting use the installed dnd-kit packages.
- Show the add-to-service action separately from song mutation actions. The
  existing action continues to validate music read access and event-specific
  schedule-edit permission.
- Filter database-backed usage/history/next-event queries by `event.kind =
  'service'`; generic events remain outside song-service counts.
- Use the existing `getStreamingLinks` and `streamingLinkLabel` helpers in the
  quick drawer rather than a second platform-specific rendering path.

## Constraints and verification

- Follow the installed Next.js 16 and Turborepo documentation before changing
  their APIs/configuration; this design does not require either change.
- Preserve the repository’s `feature/*` → `develop` Git Flow and Conventional
  Commit rules.
- Add behavior tests before production changes. Run app tests, root lint,
  typecheck, and build. The previous build attempt was blocked because this
  environment cannot resolve `fonts.googleapis.com` for the existing Google-font
  imports; retry the build and report that blocker if it remains.
