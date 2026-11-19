# Song section notes & band formation — frontend implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let editors write per-section notes and define a song's band formation from department functions, scoped per department, and show both in the chord/lyric viewers.

**Architecture:** Two new backend tables (`song_section_note`, `song_formation_function`) hold data per `(songId, departmentId)`; Mayk implements schema/migration/services/actions. The frontend adds a stable section key to the parser, a new "Notas & Banda" form tab, and note strips in the viewers, consuming the agreed action contract. No new permission: editing uses `can("music","updateSong")`.

**Tech Stack:** Next.js 16, React 19, Bun, shadcn/ui, Tailwind 4, Drizzle/Neon, `bun test` + `renderToStaticMarkup`.

**Spec:** `docs/superpowers/specs/2026-11-18-song-notes-and-formation-design.md`

## Global Constraints

- Typography floor >= 11px; click targets >= 24px (prefer `min-h-11` on mobile).
- Notes are plain text outside `chords`; never write them into the chord/lyrics strings.
- Section keys must match the backend helper exactly: `normalizeSectionKey(name)` produces lowercase, accent-stripped, non-alphanumerics → `-`, with `#<occurrence>` for repeats (`introducao#1`, `refrao#2`).
- Server actions are authoritative; client gating is convenience only.
- All song mutations must keep existing cache invalidation paths.
- Responsive patterns: `SongFormDialog` uses Sheet on mobile / Dialog on desktop; `ChordsViewer` is reused inside a rehearsal Drawer with `hideFullscreenButton`.
- Git Flow: `feature/*` from `develop`, atomic Conventional Commits; Mayk owns commits/merges/deploy unless the user asks otherwise.

## Review Focus

- Transposing chords re-parses sections; note keys must not change — Task 1 test `section key stays stable across transposition and section reorder`.
- A song with note keys for sections no longer present in the chord text must surface an orphan bucket — Task 3 test `orphan notes render in Sem seção bucket`.
- Users in multiple departments must not see another department's notes as their own — Task 2 test `arrangements filter by accessible departments`.
- A member without `updateSong` must not see edit controls — Task 3 test `edit control hidden without canUpdate`.
- Fullscreen stage must not gain focusable controls that break its trap — Task 3 test `note strip renders no controls in stage mode without canUpdate`.

---

### Task 1: Stable section key in the parser

**Files:**
- Modify: `apps/app/src/lib/music/chords-utils.ts` (SongSection type ~332-337, parseSongSections ~357-429)
- Test: `apps/app/src/features/songs/__tests__/songs.test.ts`

**Interfaces:**
- Consumes: `parseSongSections(text)` existing behavior.
- Produces: `normalizeSectionKey(name: string): string`; `withSectionKeys(sections: SongSection[]): SongSection[]` assigning stable `key`; `SongSection` gains `key: string`. Backend uses the same normalization (Mayk's contract).

- [ ] **Step 1: Write failing tests**

```ts
import { normalizeSectionKey, parseSongSections } from "@/lib/music/chords-utils";

it("normaliza nome de seção com acentos e ocorrência", () => {
  expect(normalizeSectionKey("Refrão")).toBe("refrao");
  expect(normalizeSectionKey("Primeira Parte")).toBe("primeira-parte");
});

it("gera chaves estáveis com ocorrência para seções repetidas", () => {
  const sections = parseSongSections("[Refrão]A\n[Verso]B\n[Refrão]C");
  expect(sections.map((s) => s.key)).toEqual(["refrao#1", "verso#1", "refrao#2"]);
});

it("mantém a chave estável ao transpor e reordenar o texto", () => {
  const before = parseSongSections("[Intro]A\n[Refrão]B");
  const after = parseSongSections("[Intro]C\n[Refrão]D");
  expect(before.map((s) => s.key)).toEqual(after.map((s) => s.key));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/app && bun test --preload ./src/test/setup.ts src/features/songs/__tests__/songs.test.ts`
Expected: FAIL — `normalizeSectionKey` is not exported / `key` missing.

- [ ] **Step 3: Implement in `apps/app/src/lib/music/chords-utils.ts`**

Export `normalizeSectionKey(name: string): string`: trim, `normalize("NFD").replace(/\p{Diacritic}/gu, "")`, lowercase, replace `/[^a-z0-9]+/g` with `-`, strip leading/trailing `-`, fallback `"secao"`. In `parseSongSections`, after building each section, compute `key = `${normalizeSectionKey(name)}#${occurrence}`` with an occurrence counter keyed by the normalized base; assign it to `key`. Add `key: string` to `SongSection`. Keep `id` unchanged for React keys.

- [ ] **Step 4: Run test to verify it passes**

Run: same as Step 2.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/app/src/lib/music/chords-utils.ts apps/app/src/features/songs/__tests__/songs.test.ts
git commit -m "feat(songs): add stable section key for notes"
```

---

### Task 2: Arrangement types, actions client, and department selector

**Files:**
- Create: `apps/app/src/features/songs/lib/song-arrangements.ts`
- Create: `apps/app/src/features/songs/hooks/use-song-arrangements.ts`
- Create: `apps/app/src/features/songs/components/department-arrangement-picker.tsx`
- Test: `apps/app/src/features/songs/__tests__/song-arrangements.test.tsx`

**Interfaces:**
- Consumes: Task 1 `normalizeSectionKey`; backend actions from `app/actions/songs.ts` (Mayk contracts below).
- Produces: `SongSectionNoteMap = Record<string,string>`; `DepartmentArrangement = { departmentId: string; departmentName: string; notes: SongSectionNoteMap; selectedFunctionIds: string[]; functions?: { id: string; name: string }[] }` (backend já popula `functions` para a aba de formação); `DepartmentOption = { id: string; name: string }`; `DepartmentArrangementPicker({ departments, value, onChange })`.

Backend action contracts (Mayk implements; adjust names only if his differ, reconcile before UI work):
```
getSongArrangementsAction(songId: string): Promise<{ ok: true; departments: DepartmentArrangement[] } | { ok: false; error: string }>
saveSongSectionNotesAction(songId: string, departmentId: string, notes: SongSectionNoteMap): Promise<{ ok: true } | { ok: false; error: string }>
saveSongFormationAction(songId: string, departmentId: string, functionIds: string[]): Promise<{ ok: true } | { ok: false; error: string }>
```

- [ ] **Step 1: Write failing test**

```tsx
// mock getSongArrangementsAction returning two departments, one with music active
const departments = [
  { id: "dep-1", name: "Louvor", notes: { refrao: "Só guitarra" }, selectedFunctionIds: [] },
  { id: "dep-2", name: "Mídia", notes: {}, selectedFunctionIds: [] },
];
// assert hook filters to the departments the user belongs to (mock context: dep-1 only)
expect(result.current.departments.map((d) => d.id)).toEqual(["dep-1"]);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/app && bun test --preload ./src/test/setup.ts src/features/songs/__tests__/song-arrangements.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement types and hook**

Define the types above in `lib/song-arrangements.ts`. In `hooks/use-song-arrangements.ts`, expose `useSongArrangements(songId, accessibleDepartmentIds: string[])` returning `{ departments, isLoading, error, setNotes, setFormation }`, calling `getSongArrangementsAction` and filtering to `accessibleDepartmentIds`. `setNotes`/`setFormation` call the save actions and refresh via `router.refresh()`.

- [ ] **Step 4: Implement `DepartmentArrangementPicker`**

Native `Select`-based control (`@/components/ui/native-select`), `aria-label="Departamento da formação"`, options from `DepartmentOption[]`, `min-h-11 sm:min-h-9`, no text below 11px.

- [ ] **Step 5: Run test to verify it passes**

Run: same as Step 2. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/app/src/features/songs/lib/song-arrangements.ts apps/app/src/features/songs/hooks/use-song-arrangements.ts apps/app/src/features/songs/components/department-arrangement-picker.tsx apps/app/src/features/songs/__tests__/song-arrangements.test.tsx
git commit -m "feat(songs): add arrangement types and department picker"
```

---

### Task 3: Note strips in ChordsViewer and SongLyricsViewer

**Files:**
- Modify: `apps/app/src/features/songs/components/chords-viewer.tsx` (props ~68-79, sectionsView ~680-705, columnsView ~707-732)
- Modify: `apps/app/src/features/songs/components/song-lyrics-viewer.tsx` (~45-60)
- Create: `apps/app/src/features/songs/components/section-note-strip.tsx`
- Test: `apps/app/src/features/songs/__tests__/section-note-strip.test.tsx`

**Interfaces:**
- Consumes: Task 1 `SongSection.key`; Task 2 `SongSectionNoteMap`.
- Produces: `SectionNoteStrip({ note, sectionKey, canEdit, onEdit })`; `ChordsViewerProps` gains `sectionNotes?: SongSectionNoteMap`, `canEditNotes?: boolean`, `onEditNote?: (sectionKey: string) => void`; `SongLyricsViewerProps` gains `sectionNotes?: SongSectionNoteMap`.

- [ ] **Step 1: Write failing tests**

```tsx
it("mostra a nota da seção e nada mais sem permissão de edição", () => {
  const html = renderToStaticMarkup(createElement(SectionNoteStrip, {
    note: "Só guitarra e violão", sectionKey: "intro#1", canEdit: false,
  }));
  expect(html).toContain("Só guitarra e violão");
  expect(html).not.toContain("Editar nota");
});

it("renderiza nota órfã em bucket Sem seção", () => {
  const html = renderToStaticMarkup(createElement(SectionNoteStrip, {
    note: "Antes era refrão", sectionKey: "refrao#1", canEdit: false, orphan: true,
  }));
  expect(html).toContain("Sem seção");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/app && bun test --preload ./src/test/setup.ts src/features/songs/__tests__/section-note-strip.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `SectionNoteStrip`**

Small `div` with `text-[11px]`/`text-xs`, `border-l-2 border-primary/30 pl-2`, note text, and an optional edit `Button` (`min-h-9`, `aria-label="Editar nota de <section>"`) only when `canEdit && onEdit`. `orphan` adds a "Sem seção" badge.

- [ ] **Step 4: Plumb into `ChordsViewer`**

Add the three props. In `sectionsView` and `columnsView`, render `<SectionNoteStrip>` under the section header for `sectionNotes?.[section.key]`. Orphan notes: for keys in `sectionNotes` not present in any section, append a "Sem seção" `Card` after the mapped sections (guarded to avoid duplicates in both views; render only in `sectionsView` and `continuous` when `sectionNotes` present). Do not add focusable elements in stage mode when `canEditNotes` is false (satisfies Review Focus).

- [ ] **Step 5: Plumb into `SongLyricsViewer`**

Add `sectionNotes?: SongSectionNoteMap`; render the same strip under each section header.

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd apps/app && bun test --preload ./src/test/setup.ts src/features/songs/__tests__/section-note-strip.test.tsx src/features/songs/__tests__/songs.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/app/src/features/songs/components/section-note-strip.tsx apps/app/src/features/songs/components/chords-viewer.tsx apps/app/src/features/songs/components/song-lyrics-viewer.tsx apps/app/src/features/songs/__tests__/section-note-strip.test.tsx
git commit -m "feat(songs): show per-section notes in viewers"
```

---

### Task 4: "Notas & Banda" tab in SongFormDialog

**Files:**
- Modify: `apps/app/src/features/songs/components/song-form-dialog.tsx` (tabs ~413-435, payload ~300-314, submit ~317-327)
- Test: `apps/app/src/features/songs/__tests__/song-arrangements-form.test.tsx`

**Interfaces:**
- Consumes: Task 2 `useSongArrangements`, `DepartmentArrangementPicker`, types; Task 1 `parseSongSections`.
- Produces: form tab `value="notas-banda"`; submit calls `saveSongSectionNotesAction` and `saveSongFormationAction`.

- [ ] **Step 1: Write failing test**

```tsx
it("renderiza aba Notas & Banda com campos por seção e funções", () => {
  const html = renderToStaticMarkup(createElement(SongFormDialog, {
    open: true, canUpdate: true,
    initialData: { title: "Teste", chords: "[Intro]A\n[Refrão]B", ... },
  }));
  expect(html).toContain("Notas &amp; Banda");
  // with arrangements mocked: textarea for intro#1 and refrao#1, function checkboxes
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/app && bun test --preload ./src/test/setup.ts src/features/songs/__tests__/song-arrangements-form.test.tsx`
Expected: FAIL — tab text missing.

- [ ] **Step 3: Implement the tab**

Add `TabsTrigger value="notas-banda"` and a `TabsContent` containing: `DepartmentArrangementPicker`, a textarea per `parseSongSections(chords/lyrics)` key bound to `notes[sectionKey]`, and a checkbox list of the selected department's `departmentFunction` rows. The MVP stores only function IDs (no quantity/detail). Gate the whole tab on `canUpdate`; read-only users see a plain list of notes/formation instead.

- [ ] **Step 4: Wire saves**

On submit (or on each tab's "Salvar notas"/"Salvar formação" buttons), call the two save actions with the selected `departmentId`, then `toast.success`/`toast.error` and `router.refresh()`. Keep the existing song save path untouched.

- [ ] **Step 5: Run test to verify it passes**

Run: same as Step 2. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/app/src/features/songs/components/song-form-dialog.tsx apps/app/src/features/songs/__tests__/song-arrangements-form.test.tsx
git commit -m "feat(songs): add notes and formation tab"
```

---

### Task 5: Plumb arrangements into all viewer call sites

**Files:**
- Modify: `apps/app/src/app/(app)/dashboard/songs/[songId]/page.tsx` (load arrangements)
- Modify: `apps/app/src/features/songs/components/song-detail-view.tsx` (~39-49, ~245-270)
- Modify: `apps/app/src/features/songs/components/song-quick-drawer.tsx` (~160-168)
- Modify: `apps/app/src/features/rehearsals/components/song-chords-sheet.tsx` (~151-160)
- Test: `apps/app/src/features/songs/__tests__/song-arrangements-plumbing.test.tsx`

**Interfaces:**
- Consumes: Task 3 viewer props; Task 2 arrangements hook/types.
- Produces: detail page passes `sectionNotes`/`canEditNotes` to `ChordsViewer` and `SongLyricsViewer`; drawer/sheet pass notes only (no edit controls, `hideFullscreenButton` preserved).

- [ ] **Step 1: Write failing test**

```tsx
it("passa sectionNotes ao ChordsViewer e esconde edição sem canUpdate", () => {
  // render SongDetailView with mocked arrangements and canUpdate=false
  const html = renderToStaticMarkup(createElement(SongDetailView, {...}));
  expect(html).toContain("Só guitarra");
  expect(html).not.toContain("Editar nota");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/app && bun test --preload ./src/test/setup.ts src/features/songs/__tests__/song-arrangements-plumbing.test.tsx`
Expected: FAIL — note text absent.

- [ ] **Step 3: Implement plumbing**

Detail page loads `getSongArrangementsAction(songId)` (or calls the service in RSC) and passes the selected department's `notes`/`formation` plus `canUpdate` and `onEditNote` (opens the form tab) to the viewers. Quick drawer and rehearsal sheet fetch arrangements with the same action and pass `sectionNotes` with `canEditNotes={false}`; keep `hideFullscreenButton`.

- [ ] **Step 4: Run test to verify it passes**

Run: same as Step 2. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/app/src/app/'(app)'/dashboard/songs/'[songId]'/page.tsx apps/app/src/features/songs/components/song-detail-view.tsx apps/app/src/features/songs/components/song-quick-drawer.tsx apps/app/src/features/rehearsals/components/song-chords-sheet.tsx apps/app/src/features/songs/__tests__/song-arrangements-plumbing.test.tsx
git commit -m "feat(songs): surface arrangements across viewers"
```

---

### Task 6: Full validation

**Files:** none (verification only).

- [ ] **Step 1: Run root checks**

Run: `bunx turbo run typecheck lint test --force`
Expected: 5/5 typecheck, 3/3 lint with 0 errors, all tests pass.

- [ ] **Step 2: Run app build**

Kill orphan builds (`pkill -9 -f next-build`), then `cd apps/app && bun run build > /tmp/song-notes-build.log 2>&1; echo EXIT=$?; tail -12 /tmp/song-notes-build.log`
Expected: `EXIT=0`.

- [ ] **Step 3: Report** branch, changed files, validation evidence, and pending items (backend tables/actions from Mayk; physical device check) to the channel.
