"use client";

import { useMemo, useReducer } from "react";

import type { SongFormFields, SongFormInitialData } from "./song-form.types";

export function buildSongFormFields(
  initialData?: SongFormInitialData,
): SongFormFields {
  return {
    title: initialData?.title ?? "",
    artist: initialData?.artist ?? "",
    tone: initialData?.tone ?? "",
    capo: initialData?.capo ? String(initialData.capo) : "",
    bpm: initialData?.bpm ? String(initialData.bpm) : "",
    timeSignature: initialData?.timeSignature ?? "4/4",
    lyrics: initialData?.lyrics ?? "",
    chords: initialData?.chords ?? "",
    youtubeUrl: initialData?.youtubeUrl ?? "",
    youtubeMusicUrl: initialData?.youtubeMusicUrl ?? "",
    spotifyUrl: initialData?.spotifyUrl ?? "",
    collection: initialData?.collection ?? "",
    tagsInput: initialData?.tags?.join(", ") ?? "",
  };
}

type SongFormReducerState = {
  fields: SongFormFields;
  showDiscardAlert: boolean;
  showSyncAlert: boolean;
  isMaximized: boolean;
  mobileMusicTab: "chords" | "lyrics";
  selectedDepartmentId: string;
  notesEdits: Record<string, string>;
  formationEdits: string[] | null;
};

type SongFormAction =
  | { type: "setField"; field: keyof SongFormFields; value: string }
  | { type: "syncInitialData"; initialData?: SongFormInitialData }
  | { type: "discardChanges"; initialData?: SongFormInitialData }
  | { type: "setShowDiscardAlert"; open: boolean }
  | { type: "setShowSyncAlert"; open: boolean }
  | { type: "setIsMaximized"; value: boolean }
  | { type: "toggleMaximized" }
  | { type: "setMobileMusicTab"; tab: "chords" | "lyrics" }
  | { type: "selectDepartment"; departmentId: string }
  | { type: "setNoteEdit"; key: string; value: string }
  | { type: "clearNotesEdits" }
  | { type: "setFormationEdits"; value: string[] | null }
  | { type: "resetArrangementEdits" };

function createInitialState(
  initialData?: SongFormInitialData,
): SongFormReducerState {
  return {
    fields: buildSongFormFields(initialData),
    showDiscardAlert: false,
    showSyncAlert: false,
    isMaximized: false,
    mobileMusicTab: "chords",
    selectedDepartmentId: "",
    notesEdits: {},
    formationEdits: null,
  };
}

function songFormReducer(
  state: SongFormReducerState,
  action: SongFormAction,
): SongFormReducerState {
  switch (action.type) {
    case "setField":
      return {
        ...state,
        fields: { ...state.fields, [action.field]: action.value },
      };
    case "syncInitialData":
      return {
        ...state,
        fields: buildSongFormFields(action.initialData),
      };
    case "discardChanges":
      return {
        ...state,
        fields: buildSongFormFields(action.initialData),
        notesEdits: {},
        formationEdits: null,
        showDiscardAlert: false,
        isMaximized: false,
      };
    case "setShowDiscardAlert":
      return { ...state, showDiscardAlert: action.open };
    case "setShowSyncAlert":
      return { ...state, showSyncAlert: action.open };
    case "setIsMaximized":
      return { ...state, isMaximized: action.value };
    case "toggleMaximized":
      return { ...state, isMaximized: !state.isMaximized };
    case "setMobileMusicTab":
      return { ...state, mobileMusicTab: action.tab };
    case "selectDepartment":
      return {
        ...state,
        selectedDepartmentId: action.departmentId,
        notesEdits: {},
        formationEdits: null,
      };
    case "setNoteEdit":
      return {
        ...state,
        notesEdits: { ...state.notesEdits, [action.key]: action.value },
      };
    case "clearNotesEdits":
      return { ...state, notesEdits: {} };
    case "setFormationEdits":
      return { ...state, formationEdits: action.value };
    case "resetArrangementEdits":
      return { ...state, notesEdits: {}, formationEdits: null };
  }
}

export function useSongFormState(initialData?: SongFormInitialData) {
  const [state, dispatch] = useReducer(
    songFormReducer,
    initialData,
    createInitialState,
  );

  const isDirty = useMemo(() => {
    const baseline = buildSongFormFields(initialData);
    return (Object.keys(baseline) as Array<keyof SongFormFields>).some(
      (key) => state.fields[key] !== baseline[key],
    );
  }, [state.fields, initialData]);

  return {
    ...state,
    isDirty,
    setField: (field: keyof SongFormFields, value: string) =>
      dispatch({ type: "setField", field, value }),
    syncInitialData: (nextInitialData?: SongFormInitialData) =>
      dispatch({ type: "syncInitialData", initialData: nextInitialData }),
    discardChanges: (nextInitialData?: SongFormInitialData) =>
      dispatch({ type: "discardChanges", initialData: nextInitialData }),
    setShowDiscardAlert: (open: boolean) =>
      dispatch({ type: "setShowDiscardAlert", open }),
    setShowSyncAlert: (open: boolean) =>
      dispatch({ type: "setShowSyncAlert", open }),
    setIsMaximized: (value: boolean) =>
      dispatch({ type: "setIsMaximized", value }),
    toggleMaximized: () => dispatch({ type: "toggleMaximized" }),
    setMobileMusicTab: (tab: "chords" | "lyrics") =>
      dispatch({ type: "setMobileMusicTab", tab }),
    selectDepartment: (departmentId: string) =>
      dispatch({ type: "selectDepartment", departmentId }),
    setNoteEdit: (key: string, value: string) =>
      dispatch({ type: "setNoteEdit", key, value }),
    clearNotesEdits: () => dispatch({ type: "clearNotesEdits" }),
    setFormationEdits: (value: string[] | null) =>
      dispatch({ type: "setFormationEdits", value }),
    resetArrangementEdits: () => dispatch({ type: "resetArrangementEdits" }),
  };
}
