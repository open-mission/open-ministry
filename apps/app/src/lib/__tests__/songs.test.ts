import { describe, expect, it, mock } from "bun:test";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import {
  classifySectionType,
  extractLyricsFromChords,
  getSemitoneDistance,
  getShapeTone,
  getStageShortcutAction,
  getTargetTones,
  isChordLine,
  parseCifraClubTxt,
  parseSongSections,
  STANDARD_TONES,
  tokenizeChordLine,
  transposeChord,
  transposeChordsText,
} from "@/lib/music/chords-utils";
import {
  generateStreamingSearchLinks,
  isStreamingSearchUrl,
} from "@/lib/music/lyrics-service";
import { songInputSchema } from "@/lib/music/songs-schema";
import {
  buildSongUsageMap,
  summarizeSongUsage,
} from "@/lib/song-usage";

describe("Music Module & Repertoire", () => {
  describe("Chord Transposer Engine", () => {
    it("transposes single chords correctly", () => {
      expect(transposeChord("C", 2)).toBe("D");
      expect(transposeChord("G", -2)).toBe("F");
      expect(transposeChord("A", 1)).toBe("A#");
      expect(transposeChord("Bb", 2)).toBe("C");
      expect(transposeChord("Am", 2)).toBe("Bm");
      expect(transposeChord("F#m7", 1)).toBe("Gm7");
    });

    it("transposes inverted chords with bass notes (e.g. D/F#)", () => {
      expect(transposeChord("D/F#", 2)).toBe("E/G#");
      expect(transposeChord("C/E", 2)).toBe("D/F#");
      expect(transposeChord("G/B", -2)).toBe("F/A");
    });

    it("leaves 0 semitones or empty string unchanged", () => {
      expect(transposeChord("C", 0)).toBe("C");
      expect(transposeChord("", 2)).toBe("");
      expect(transposeChord("   ", 3)).toBe("   ");
    });

    it("transposes full chord text while preserving section tags and lyrics", () => {
      const originalSheet = `[Intro]
G  C  G  C

G                 C
Você é bem-vindo aqui
G                  C
A casa é sua pode entrar
Em7      D        C
Me esvazio de mim`;

      const transposedSheet = transposeChordsText(originalSheet, 2);

      // [Intro] deve ser preservado
      expect(transposedSheet).toContain("[Intro]");

      // G -> A, C -> D
      expect(transposedSheet).toContain("A  D  A  D");

      // Em7 -> F#m7, D -> E, C -> D
      expect(transposedSheet).toContain("F#m7      E        D");

      // A linha de letra deve permanecer inalterada
      expect(transposedSheet).toContain("Você é bem-vindo aqui");
      expect(transposedSheet).toContain("A casa é sua pode entrar");
    });

    it("offers only target tones in the original major or minor mode", () => {
      const majorTones = getTargetTones("C");
      const minorTones = getTargetTones("Am");

      expect(majorTones).toContain("C");
      expect(majorTones.every((tone) => !tone.endsWith("m"))).toBe(true);
      expect(majorTones).not.toContain("Am");
      expect(minorTones).toContain("Am");
      expect(minorTones.every((tone) => tone.endsWith("m"))).toBe(true);
      expect(minorTones).not.toContain("C");
    });

    it("maps stage shortcuts only in fullscreen and outside interactive controls", () => {
      expect(getStageShortcutAction("T", true, false, true)).toBe("focusTone");
      expect(getStageShortcutAction("C", true, false, true)).toBe("copy");
      expect(getStageShortcutAction("+", true, false, true)).toBe(
        "transposeUp",
      );
      expect(getStageShortcutAction("ArrowDown", true, false, true)).toBe(
        "fontSizeDown",
      );
      expect(getStageShortcutAction("Escape", true, false, true)).toBe(
        "close",
      );
      expect(getStageShortcutAction("t", false, false, true)).toBeNull();
      expect(getStageShortcutAction("c", true, true, true)).toBeNull();
    });

    it("does not map stage shortcuts when focus is outside the fullscreen viewer", () => {
      expect(getStageShortcutAction("t", true, false, false)).toBeNull();
    });
  });

  describe("Streaming Search Links Generator", () => {
    it("generates correct search URLs for YouTube, YouTube Music and Spotify", () => {
      const links = generateStreamingSearchLinks("A Casa É Sua", "Casa Worship");

      expect(links.youtube).toContain("https://www.youtube.com/results?search_query=");
      expect(links.youtube).toContain("A%20Casa%20%C3%89%20Sua");
      expect(links.youtube).toContain("Casa%20Worship");

      expect(links.youtubeMusic).toContain("https://music.youtube.com/search?q=");
      expect(links.youtubeMusic).toContain("A%20Casa%20%C3%89%20Sua");

      expect(links.spotify).toContain("https://open.spotify.com/search/");
      expect(links.spotify).toContain("A%20Casa%20%C3%89%20Sua");
    });
  });

  describe("Standard Music Metadata Definitions", () => {
    it("provides all standard chromatic tones and minor keys", () => {
      expect(STANDARD_TONES).toContain("C");
      expect(STANDARD_TONES).toContain("G");
      expect(STANDARD_TONES).toContain("D");
      expect(STANDARD_TONES).toContain("Em");
      expect(STANDARD_TONES).toContain("Am");
      expect(STANDARD_TONES).toContain("F#m");
      expect(STANDARD_TONES.length).toBeGreaterThan(20);
    });
  });

  describe("Song Sections Parser & Chord Syntax Highlighting", () => {
    it("parses bracketed section headers like Cifra Club into structured cards", () => {
      const sheet = `[Intro] D A6 D A6
[Primeira Parte]
D         A6
Os meus olhos viram a salvação
[Refrão]
G           D
Glória nas alturas
[Ponte]
Bm          A
Sempre fiel`;

      const sections = parseSongSections(sheet);
      expect(sections.length).toBe(4);

      expect(sections[0].name).toBe("Intro");
      expect(sections[0].type).toBe("intro");
      expect(sections[0].content).toBe("D A6 D A6");

      expect(sections[1].name).toBe("Primeira Parte");
      expect(sections[1].type).toBe("verse");
      expect(sections[1].content).toContain("Os meus olhos viram a salvação");

      expect(sections[2].name).toBe("Refrão");
      expect(sections[2].type).toBe("chorus");
      expect(sections[2].content).toContain("Glória nas alturas");

      expect(sections[3].name).toBe("Ponte");
      expect(sections[3].type).toBe("bridge");
      expect(sections[3].content).toContain("Sempre fiel");
    });

    it("parses unbracketed lyrics divided by stanzas into verse cards", () => {
      const lyrics = `Primeira estrofe da música
Com versos e adoração

Segunda estrofe da canção
Outra parte para o culto`;

      const sections = parseSongSections(lyrics);
      expect(sections.length).toBe(2);
      expect(sections[0].name).toBe("Estrofe 1");
      expect(sections[1].name).toBe("Estrofe 2");
    });

    it("correctly classifies section types", () => {
      expect(classifySectionType("Intro")).toBe("intro");
      expect(classifySectionType("Introdução")).toBe("intro");
      expect(classifySectionType("Verso 1")).toBe("verse");
      expect(classifySectionType("Primeira Parte")).toBe("verse");
      expect(classifySectionType("Pré-refrão")).toBe("pre-chorus");
      expect(classifySectionType("Refrão")).toBe("chorus");
      expect(classifySectionType("Coro")).toBe("chorus");
      expect(classifySectionType("Ponte")).toBe("bridge");
      expect(classifySectionType("Solo")).toBe("solo");
      expect(classifySectionType("Final")).toBe("outro");
    });

    it("accurately detects chord lines vs lyric lines vs tablature", () => {
      expect(isChordLine("D         A6        F#m     A6/C#")).toBe(true);
      expect(isChordLine("G   C   D   G")).toBe(true);
      expect(isChordLine("Os meus olhos viram a salvação")).toBe(false);
      expect(isChordLine("E eu não temerei o mal que vier")).toBe(false);
      expect(isChordLine("e|---0-2-3---|")).toBe(false);
      expect(isChordLine("[Refrão]")).toBe(false);
    });

    it("tokenizes chord lines preserving exact spacing for monospace alignment", () => {
      const line = "D         A6        F#m     A6/C#     D7M";
      const tokens = tokenizeChordLine(line);

      const reconstructed = tokens.map((t) => t.value).join("");
      expect(reconstructed).toBe(line);

      const chords = tokens.filter((t) => t.type === "chord").map((t) => t.value);
      expect(chords).toEqual(["D", "A6", "F#m", "A6/C#", "D7M"]);
    });

    it("extracts pure lyrics from chord sheets removing chords and tablatures", () => {
      const chordSheet = `[Intro]
C   G   Am   F
e|---0-2-3---|

[Primeira Parte]
C                 G
Entra na minha casa
Am                F
Entra na minha vida

[Refrão]
C           G
Como Zaqueu eu quero subir`;

      const lyrics = extractLyricsFromChords(chordSheet);
      expect(lyrics).not.toContain("C   G   Am   F");
      expect(lyrics).not.toContain("e|---0-2-3---|");
      expect(lyrics).toContain("[Primeira Parte]");
      expect(lyrics).toContain("Entra na minha casa");
      expect(lyrics).toContain("Entra na minha vida");
      expect(lyrics).toContain("[Refrão]");
      expect(lyrics).toContain("Como Zaqueu eu quero subir");
      // O [Intro] puramente instrumental deve ter sido omitido
      expect(lyrics).not.toContain("[Intro]");
    });

    it("parses Cifra Club .txt exports extracting title, artist, tone, chords and lyrics", () => {
      const sampleTxt = `A Casa É Sua
Casa Worship

Tom: E
Capotraste: Sem capo

[Intro] C#m7  A9  E  B4

[Primeira Parte]
        C#m7
Cê é bem-vindo aqui
         A9
A casa é Sua, pode entrar
E          B4
Deixa Teu fogo queimar

[Refrão]
A9         E
Vem me incendiar`;

      const parsed = parseCifraClubTxt(sampleTxt, "Casa Worship - A Casa É Sua.txt");

      expect(parsed.title).toBe("A Casa É Sua");
      expect(parsed.artist).toBe("Casa Worship");
      expect(parsed.tone).toBe("E");
      expect(parsed.capo).toBe(0);
      expect(parsed.chords).toContain("[Intro] C#m7  A9  E  B4");
      expect(parsed.chords).toContain("Cê é bem-vindo aqui");
      expect(parsed.lyrics).toContain("[Primeira Parte]");
      expect(parsed.lyrics).toContain("Cê é bem-vindo aqui");
      expect(parsed.lyrics).not.toContain("C#m7");
    });

    it("parses capo positions from Cifra Club metadata", () => {
      const capoNumber = parseCifraClubTxt(
        "Tom: E\nCapo: 2\n[Intro]\nE  B",
      );
      const capoFret = parseCifraClubTxt(
        "Tom: A\nCapotraste na 4ª casa\n[Intro]\nA  E",
      );

      expect(capoNumber.capo).toBe(2);
      expect(capoFret.capo).toBe(4);
    });
  });

  describe("Capo tone helpers", () => {
    it("calculates signed shortest semitone distances between keys", () => {
      expect(getSemitoneDistance("E", "G")).toBe(3);
      expect(getSemitoneDistance("G", "E")).toBe(-3);
      expect(getSemitoneDistance("F#m", "A")).toBe(3);
      expect(getSemitoneDistance("C", "F#")).toBe(6);
    });

    it("derives the chord shape key from sounding key and capo position", () => {
      expect(getShapeTone("E", 4)).toBe("C");
      expect(getShapeTone("G", 2)).toBe("F");
      expect(getShapeTone("C#m", 2)).toBe("Bm");
      expect(getShapeTone("A", 0)).toBe("A");
      expect(getShapeTone(null, 3)).toBeNull();
    });
  });

  describe("Song input normalization", () => {
    it("coerces capo values and leaves an omitted capo undefined for partial updates", () => {
      const withCapo = songInputSchema.parse({ title: "A Casa", capo: "4" });
      const withoutCapo = songInputSchema.parse({ title: "A Casa" });

      expect(withCapo.capo).toBe(4);
      expect(withoutCapo.capo).toBeUndefined();
      expect(songInputSchema.safeParse({ title: "A Casa", capo: 13 }).success).toBe(
        false,
      );
    });

    it("trims tags and removes empty or case-insensitive duplicates", () => {
      const parsed = songInputSchema.parse({
        title: "A Casa",
        tags: ["  Adoração ", "adoração", "Jesus", "", " Jesus  "],
      });

      expect(parsed.tags).toEqual(["Adoração", "Jesus"]);
    });
  });

  describe("Streaming link classification", () => {
    it("recognizes generated platform search links but not direct media links", () => {
      const searches = generateStreamingSearchLinks("A Casa É Sua", "Casa Worship");

      expect(Object.values(searches).every(isStreamingSearchUrl)).toBe(true);
      expect(
        isStreamingSearchUrl("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC"),
      ).toBe(false);
      expect(isStreamingSearchUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
        false,
      );
      expect(isStreamingSearchUrl("not a URL")).toBe(false);
    });
  });

  describe("Song usage summaries", () => {
    const now = new Date("2026-10-01T12:00:00.000Z");

    it("finds the nearest upcoming and latest past event and counts distinct events", () => {
      const summary = summarizeSongUsage(
        [
          {
            songId: "song-1",
            eventKind: "service",
            itemId: "item-future",
            itemTitle: "Louvor de abertura",
            eventId: "event-future",
            eventTitle: "Culto de domingo",
            startsAt: "2026-10-12T18:00:00.000Z",
            responsible: "  Ana Silva  ",
          },
          {
            songId: "song-1",
            eventKind: "service",
            itemId: "item-past-latest",
            itemTitle: "Adoração",
            eventId: "event-past-latest",
            eventTitle: "Culto da semana passada",
            startsAt: new Date("2026-09-25T18:00:00.000Z"),
            responsible: null,
          },
          {
            songId: "song-1",
            eventKind: "service",
            itemId: "item-past-oldest",
            itemTitle: "Encerramento",
            eventId: "event-past-oldest",
            eventTitle: "Culto anterior",
            startsAt: "2026-09-10T18:00:00.000Z",
          },
        ],
        now,
      );

      expect(summary.nextEvent).toEqual({
        eventId: "event-future",
        eventTitle: "Culto de domingo",
        itemId: "item-future",
        itemTitle: "Louvor de abertura",
        startsAt: new Date("2026-10-12T18:00:00.000Z"),
        responsible: "Ana Silva",
      });
      expect(summary.lastEvent).toEqual({
        eventId: "event-past-latest",
        eventTitle: "Culto da semana passada",
        itemId: "item-past-latest",
        itemTitle: "Adoração",
        startsAt: new Date("2026-09-25T18:00:00.000Z"),
        responsible: null,
      });
      expect(summary.eventCount).toBe(3);
      expect(summary.planItemCount).toBe(3);
    });

    it("ignores generic events when calculating song service usage", () => {
      const summary = summarizeSongUsage(
        [
          {
            songId: "song-1",
            eventKind: "event",
            itemId: "generic-upcoming",
            itemTitle: "Atração",
            eventId: "generic-event",
            eventTitle: "Encontro de jovens",
            startsAt: "2026-10-03T18:00:00.000Z",
          },
          {
            songId: "song-1",
            eventKind: "service",
            itemId: "service-past",
            itemTitle: "Louvor",
            eventId: "service-past",
            eventTitle: "Culto anterior",
            startsAt: "2026-09-20T18:00:00.000Z",
          },
          {
            songId: "song-1",
            eventKind: "service",
            itemId: "service-upcoming",
            itemTitle: "Adoração",
            eventId: "service-upcoming",
            eventTitle: "Culto de domingo",
            startsAt: "2026-10-05T18:00:00.000Z",
          },
        ],
        now,
      );

      expect(summary.nextEvent?.eventId).toBe("service-upcoming");
      expect(summary.lastEvent?.eventId).toBe("service-past");
      expect(summary.eventCount).toBe(2);
      expect(summary.planItemCount).toBe(2);
    });

    it("groups usage rows by song and returns independent summaries", () => {
      const usage = buildSongUsageMap(
        [
          {
            songId: "song-1",
            eventKind: "service",
            itemId: "item-1",
            itemTitle: "Louvor",
            eventId: "event-1",
            eventTitle: "Culto passado",
            startsAt: "2026-09-20T18:00:00.000Z",
          },
          {
            songId: "song-2",
            eventKind: "service",
            itemId: "item-2",
            itemTitle: "Adoração",
            eventId: "event-2",
            eventTitle: "Próximo culto",
            startsAt: "2026-10-05T18:00:00.000Z",
          },
          {
            songId: "song-1",
            eventKind: "event",
            itemId: "generic-item",
            itemTitle: "Atração",
            eventId: "generic-event",
            eventTitle: "Encontro",
            startsAt: "2026-10-02T18:00:00.000Z",
          },
          {
            songId: "song-1",
            eventKind: "service",
            itemId: "item-3",
            itemTitle: "Louvor",
            eventId: "event-3",
            eventTitle: "Próximo culto",
            startsAt: "2026-10-05T18:00:00.000Z",
          },
        ],
        now,
      );

      expect(usage.get("song-1")?.eventCount).toBe(2);
      expect(usage.get("song-1")?.planItemCount).toBe(2);
      expect(usage.get("song-1")?.nextEvent?.eventId).toBe("event-3");
      expect(usage.get("song-2")?.lastEvent).toBeNull();
      expect(usage.get("song-2")?.nextEvent?.eventId).toBe("event-2");
      expect(usage.has("song-3")).toBe(false);
    });
  });

  describe("Next service query", () => {
    it("adds a service-kind predicate so a nearer generic event is skipped", async () => {
      let eventWhere: SQL | undefined;

      mock.module("@/db", () => ({
        db: {
          query: new Proxy(
            {},
            {
              get: (_target, table: string) => ({
                findMany: async () => [],
                findFirst: async (query: { where: SQL }) => {
                  if (table === "event") eventWhere = query.where;
                  return null;
                },
              }),
            },
          ),
        },
      }));

      const { getNextEventForSong } = await import("@/lib/songs");
      await getNextEventForSong("org-1", "song-1");

      expect(eventWhere).toBeDefined();
      const query = new PgDialect().sqlToQuery(eventWhere!);
      expect(query.sql).toContain('"kind" =');
      expect(query.params).toContain("service");
    });
  });
});
