import { describe, expect, it } from "bun:test";

import {
  classifySectionType,
  isChordLine,
  parseSongSections,
  STANDARD_TONES,
  tokenizeChordLine,
  transposeChord,
  transposeChordsText,
} from "@/lib/music/chords-utils";
import { generateStreamingSearchLinks } from "@/lib/music/lyrics-service";

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
  });
});
