"use server";

export {
  searchOnlineSongsAction,
  fetchLyricsDetailsAction,
  createSongAction,
  updateSongAction,
  deleteSongAction,
} from "@/app/actions/songs";
export type { SongActionResult } from "@/app/actions/songs";
