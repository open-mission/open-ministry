import { describe, expect, it } from "bun:test";

import {
  STANDARD_TONES,
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
});
