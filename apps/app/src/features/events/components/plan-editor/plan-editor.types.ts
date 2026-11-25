import type { QuickDrawerSong } from "@/components/songs/song-quick-drawer";
import type { PersonOption, SongOption } from "../plan-item-dialog";

export type { PersonOption };

export type RawPlanItem = {
  id: string;
  eventId: string;
  sectionId: string | null;
  type: string;
  title: string;
  description: string | null;
  durationSeconds: number;
  order: number;
  personId: string | null;
  customResponsible: string | null;
  songId?: string | null;
  song?: QuickDrawerSong | null;
  person?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    user?: { image?: string | null } | null;
  } | null;
};

export type PlanEditorProps = {
  eventId: string;
  eventTitle: string;
  startsAt: Date;
  endsAt: Date;
  planItems: RawPlanItem[];
  people: PersonOption[];
  songs?: SongOption[];
  canManage: boolean;
};
