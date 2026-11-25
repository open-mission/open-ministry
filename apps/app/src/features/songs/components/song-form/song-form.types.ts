import type { SongRecord } from "@/lib/songs";

export type SongFormInitialData = {
  title?: string;
  artist?: string;
  tone?: string;
  capo?: number | null;
  bpm?: number | null;
  timeSignature?: string;
  lyrics?: string;
  chords?: string;
  youtubeUrl?: string;
  youtubeMusicUrl?: string;
  spotifyUrl?: string;
  collection?: string | null;
  tags?: string[];
};

export type SongFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songId?: string;
  initialData?: SongFormInitialData;
  existingCollections?: string[];
  onSongCreated?: (song: SongRecord) => void;
  onSongUpdated?: (song: SongRecord) => void;
  /** Aba inicial do formulário (ex.: `notas-banda` ao editar uma nota). */
  initialTab?: string;
  /** Departamento pré-selecionado na aba "Notas & Banda". */
  initialDepartmentId?: string;
  /** Edição de notas/formação exige `can("music", "updateSong")`. */
  canUpdate?: boolean;
};

export type SongFormFields = {
  title: string;
  artist: string;
  tone: string;
  capo: string;
  bpm: string;
  timeSignature: string;
  lyrics: string;
  chords: string;
  youtubeUrl: string;
  youtubeMusicUrl: string;
  spotifyUrl: string;
  collection: string;
  tagsInput: string;
};
