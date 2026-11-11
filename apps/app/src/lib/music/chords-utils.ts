/**
 * Utilitários para Cifras, Transposição de Tons e Estrutura de Seções Musicais
 */

export const STANDARD_TONES = [
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
  "Ab",
  "A",
  "A#",
  "Bb",
  "B",
  "Cm",
  "C#m",
  "Dm",
  "D#m",
  "Ebm",
  "Em",
  "Fm",
  "F#m",
  "Gm",
  "G#m",
  "Abm",
  "Am",
  "A#m",
  "Bbm",
  "Bm",
] as const;

export const STANDARD_TIME_SIGNATURES = [
  "4/4",
  "6/8",
  "3/4",
  "2/4",
  "12/8",
  "5/4",
] as const;

// Escala cromática com sustenidos
const CHROMATIC_SHARP = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

// Escala cromática com bemóis
const CHROMATIC_FLAT = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

const NOTE_NAME_MAP: Record<string, number> = {
  C: 0,
  "B#": 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  F: 5,
  "E#": 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
  Cb: 11,
};

/**
 * Transpõe uma única nota ou acorde (ex: "G", "F#m7", "Bb/D") pelo número de semitons.
 */
export function transposeChord(chord: string, semitones: number): string {
  if (semitones === 0 || !chord.trim()) return chord;

  // Tratar acorde invertido com baixo (ex: D/F# -> transpõe D e F# separadamente)
  if (chord.includes("/")) {
    const parts = chord.split("/");
    return parts.map((part) => transposeChord(part, semitones)).join("/");
  }

  // Identificar nota raiz (ex: C#, Bb, G)
  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return chord;

  const root = match[1];
  const suffix = match[2];

  const noteIndex = NOTE_NAME_MAP[root];
  if (noteIndex === undefined) return chord;

  let newIndex = (noteIndex + semitones) % 12;
  if (newIndex < 0) newIndex += 12;

  // Se a raiz original usava bemol (# vs b), tenta preservar escala correspondente
  const useFlat = root.includes("b") || (!root.includes("#") && semitones < 0);
  const newRoot = useFlat ? CHROMATIC_FLAT[newIndex] : CHROMATIC_SHARP[newIndex];

  return `${newRoot}${suffix}`;
}

/**
 * Expressão regular aprimorada para detecção de cifras incluindo notação brasileira (ex: 7M, 7+, °, sus4).
 */
export const CHORD_REGEX =
  /\b[A-G][#b]?(?:maj|min|dim|aug|sus|add|m|M|º|°|[0-9#b\(\)\+\-])*(?:\/[A-G][#b]?)?(?![A-Za-z0-9#º°\(\)])/g;

/**
 * Verifica se uma linha textual é uma linha de acordes/cifras.
 */
export function isChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Se for comentário de seção [Refrão], [Intro]
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) return false;

  // Linhas de tablatura (ex: e|---0-2-3---|)
  if (/^[eBGDAE]?\|[-0-9pbrh\/~\s|]+$/i.test(trimmed)) return false;

  CHORD_REGEX.lastIndex = 0;
  const matches = trimmed.match(CHORD_REGEX);
  if (!matches) return false;

  const words = trimmed.split(/\s+/);
  const chordCount = matches.length;

  return (
    chordCount >= 1 &&
    (chordCount / words.length >= 0.4 ||
      (words.length <= 4 && chordCount >= words.length * 0.5))
  );
}

/**
 * Transpõe um texto de cifra completo linha por linha preservando seções e letras.
 */
export function transposeChordsText(text: string, semitones: number): string {
  if (semitones === 0 || !text) return text;

  const lines = text.split("\n");

  const transposedLines = lines.map((line) => {
    // Linha vazia
    if (!line.trim()) return line;

    // Se for cabeçalho de seção pura (ex: [Refrão], [Intro]), mantém
    if (line.trim().startsWith("[") && line.trim().endsWith("]")) {
      return line;
    }

    // Se começar com tag de seção inline (ex: [Intro] D A6 D A6), preserva a tag e transpõe o restante
    const inlineSectionMatch = line.match(/^(\[[^\]]+\]\s*)(.*)$/);
    if (inlineSectionMatch) {
      const tagPrefix = inlineSectionMatch[1];
      const rest = inlineSectionMatch[2];
      if (isChordLine(rest)) {
        CHORD_REGEX.lastIndex = 0;
        return `${tagPrefix}${rest.replace(CHORD_REGEX, (match) => transposeChord(match, semitones))}`;
      }
      return line;
    }

    // Testa se a linha é de acordes
    if (!isChordLine(line)) {
      return line;
    }

    CHORD_REGEX.lastIndex = 0;
    return line.replace(CHORD_REGEX, (match) => transposeChord(match, semitones));
  });

  return transposedLines.join("\n");
}

export type ChordLineToken =
  | { type: "chord"; value: string }
  | { type: "text"; value: string };

/**
 * Tokeniza uma linha de acordes preservando os espaços em branco para alinhamento monoespaçado perfeito.
 */
export function tokenizeChordLine(line: string): ChordLineToken[] {
  const tokens: ChordLineToken[] = [];
  let lastIndex = 0;

  CHORD_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = CHORD_REGEX.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: "text",
        value: line.slice(lastIndex, match.index),
      });
    }

    tokens.push({
      type: "chord",
      value: match[0],
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < line.length) {
    tokens.push({
      type: "text",
      value: line.slice(lastIndex),
    });
  }

  return tokens;
}

export type SongSectionType =
  | "intro"
  | "verse"
  | "pre-chorus"
  | "chorus"
  | "bridge"
  | "solo"
  | "outro"
  | "generic";

export type SongSection = {
  id: string;
  name: string;
  type: SongSectionType;
  content: string;
};

/**
 * Classifica semanticamente o tipo da seção musical com base no nome.
 */
export function classifySectionType(name: string): SongSectionType {
  const n = name.toLowerCase();
  if (/intro|introdu[çc]/i.test(n)) return "intro";
  if (/pr[eé]-?refr|pre-?chorus/i.test(n)) return "pre-chorus";
  if (/refr|chorus|coro/i.test(n)) return "chorus";
  if (/ponte|bridge/i.test(n)) return "bridge";
  if (/solo|instrumental|interl[uú]d|passagem/i.test(n)) return "solo";
  if (/final|outro|encerramento/i.test(n)) return "outro";
  if (/verso|parte|estrofe/i.test(n)) return "verse";
  return "generic";
}

/**
 * Converte um texto de cifra ou letra em seções estruturadas identificando [Nome da Seção].
 */
export function parseSongSections(text: string): SongSection[] {
  if (!text || !text.trim()) return [];

  // Divide por delimitadores [Nome da Seção]
  const parts = text.split(/(?=\[[^\]]+\])/).filter((p) => p.trim());
  if (parts.length === 0) return [];

  // Caso o texto não tenha tags [Seção]
  if (parts.length === 1 && !parts[0].trim().startsWith("[")) {
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());
    if (paragraphs.length > 1) {
      return paragraphs.map((p, idx) => {
        const firstLine = p.split("\n")[0].trim();
        const headerMatch = firstLine.match(
          /^(Verso\s*\d*|Primeira\s*Parte|Segunda\s*Parte|Refr[aã]o|Ponte|Intro|Coro|Final):?\s*$/i,
        );
        if (headerMatch) {
          const sectionName = headerMatch[1].replace(/:$/, "").trim();
          const rest = p.split("\n").slice(1).join("\n").trim();
          return {
            id: `section-${idx}`,
            name: sectionName,
            type: classifySectionType(sectionName),
            content: rest,
          };
        }

        return {
          id: `section-${idx}`,
          name: `Estrofe ${idx + 1}`,
          type: "verse" as const,
          content: p.trim(),
        };
      });
    }

    return [
      {
        id: "section-0",
        name: "Música Completa",
        type: "generic",
        content: text.trim(),
      },
    ];
  }

  const sections: SongSection[] = [];

  for (let idx = 0; idx < parts.length; idx++) {
    const part = parts[idx].trim();
    const match = part.match(/^\[([^\]]+)\]\s*([\s\S]*)$/);

    if (match) {
      const rawName = match[1].trim();
      const content = match[2].trim();
      sections.push({
        id: `section-${idx}-${rawName.toLowerCase().replace(/\s+/g, "-")}`,
        name: rawName,
        type: classifySectionType(rawName),
        content,
      });
    } else {
      sections.push({
        id: `section-${idx}`,
        name: idx === 0 ? "Introdução" : `Seção ${idx + 1}`,
        type: "generic",
        content: part,
      });
    }
  }

  return sections;
}

/**
 * Extrai a letra pura a partir de um texto de cifra,
 * removendo linhas de acordes e tablaturas, preservando seções com conteúdo cantado.
 */
export function extractLyricsFromChords(chordsText: string): string {
  if (!chordsText || !chordsText.trim()) return "";
  const lines = chordsText.split("\n");
  const result: string[] = [];
  let prevWasEmpty = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    // Preserva tags de seção isoladas: [Intro], [Primeira Parte], [Refrão], etc.
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      if (result.length > 0 && !prevWasEmpty) {
        result.push("");
      }
      result.push(trimmed);
      prevWasEmpty = false;
      continue;
    }

    // Se a linha começar com tag de seção inline: [Intro] D A6 D A6
    const inlineMatch = trimmed.match(/^(\[[^\]]+\])\s*(.*)$/);
    if (inlineMatch) {
      if (result.length > 0 && !prevWasEmpty) {
        result.push("");
      }
      result.push(inlineMatch[1]);
      const rest = inlineMatch[2].trim();
      if (
        rest &&
        !isChordLine(rest) &&
        !/^[eBGDAE]?\|[-0-9pbrh\/~\s|]+$/i.test(rest)
      ) {
        result.push(rest);
      }
      prevWasEmpty = false;
      continue;
    }

    // Ignora linhas vazias repetidas
    if (!trimmed) {
      if (!prevWasEmpty && result.length > 0) {
        result.push("");
        prevWasEmpty = true;
      }
      continue;
    }

    // Ignora linhas de tablatura (ex: e|---0-2-3---|)
    if (/^[eBGDAE]?\|[-0-9pbrh\/~\s|]+$/i.test(trimmed)) {
      continue;
    }

    // Ignora linhas de acordes
    if (isChordLine(trimmed)) {
      continue;
    }

    // Linha de letra limpa
    result.push(trimmed);
    prevWasEmpty = false;
  }

  // Remove cabeçalhos de seção instrumentais sem versos (ex: [Intro] ou [Solo] sem letra)
  const cleaned: string[] = [];
  for (let i = 0; i < result.length; i++) {
    const line = result[i].trim();
    if (line.startsWith("[") && line.endsWith("]")) {
      let hasContent = false;
      for (let j = i + 1; j < result.length; j++) {
        const next = result[j].trim();
        if (next.startsWith("[") && next.endsWith("]")) {
          break;
        }
        if (next) {
          hasContent = true;
          break;
        }
      }
      if (hasContent) {
        cleaned.push(result[i]);
      }
    } else {
      cleaned.push(result[i]);
    }
  }

  return cleaned.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export type ParsedCifraTxt = {
  title: string;
  artist: string;
  tone: string;
  chords: string;
  lyrics: string;
};

/**
 * Normaliza o formato de um tom musical (ex: "f#m" -> "F#m", "c" -> "C", "bb" -> "Bb")
 */
export function normalizeTone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^([A-Ga-g])([#b]?)(m?)$/);
  if (!match) return trimmed;
  const note = match[1].toUpperCase();
  const acc = match[2];
  const minor = match[3].toLowerCase();
  return `${note}${acc}${minor}`;
}

/**
 * Analisa e extrai metadados, cifra e versos limpos de um arquivo de texto (.txt) exportado do Cifra Club.
 */
export function parseCifraClubTxt(
  rawContent: string,
  fileName?: string,
): ParsedCifraTxt {
  const content = (rawContent || "").replace(/\r\n/g, "\n").trim();
  const lines = content.split("\n");

  let extractedTitle = "";
  let extractedArtist = "";
  let extractedTone = "";

  // 1. Tentar extrair do nome do arquivo (ex: "Casa Worship - A Casa É Sua.txt")
  if (fileName) {
    const cleanName = fileName.replace(/\.txt$/i, "").trim();
    if (cleanName.includes(" - ")) {
      const parts = cleanName.split(" - ");
      if (parts.length >= 2) {
        extractedArtist = parts[0].trim();
        extractedTitle = parts.slice(1).join(" - ").trim();
      }
    } else {
      extractedTitle = cleanName;
    }
  }

  // 2. Analisar as primeiras linhas em busca de metadados antes da música começar
  const headerLimit = Math.min(lines.length, 14);
  let chordsStartIndex = 0;

  for (let i = 0; i < headerLimit; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Tom: D / Tom: G#m / Key: A (checar antes de isChordLine, pois "Tom: E" contém a letra/acorde E)
    const toneMatch = line.match(
      /^(?:tom|key|tonalidade):\s*([a-g][#b]?m?)\b/i,
    );
    if (toneMatch) {
      extractedTone = normalizeTone(toneMatch[1]);
      chordsStartIndex = i + 1;
      continue;
    }

    // Título / Música: X
    const titleMatch = line.match(/^(?:m[úu]sica|t[íi]tulo|title):\s*(.+)$/i);
    if (titleMatch) {
      extractedTitle = titleMatch[1].trim();
      chordsStartIndex = i + 1;
      continue;
    }

    // Artista: Y
    const artistMatch = line.match(/^(?:artista|artist|banda):\s*(.+)$/i);
    if (artistMatch) {
      extractedArtist = artistMatch[1].trim();
      chordsStartIndex = i + 1;
      continue;
    }

    // Capotraste / Afinação ignorados no cabeçalho
    if (/^(?:capotraste|capo|afina[çc][ãa]o|tuning):/i.test(line)) {
      chordsStartIndex = i + 1;
      continue;
    }

    // Se encontramos uma seção [Intro], [Primeira Parte] ou uma linha de acordes, os metadados acabaram
    if (/^\[[^\]]+\]/.test(line) || isChordLine(line)) {
      chordsStartIndex = i;
      break;
    }

    // Se for formato "Artista - Música" na primeira linha
    if (i === 0 && line.includes(" - ") && !extractedTitle) {
      const parts = line.split(" - ");
      extractedArtist = parts[0].trim();
      extractedTitle = parts.slice(1).join(" - ").trim();
      chordsStartIndex = i + 1;
      continue;
    }

    // Se as linhas 0 e 1 forem "Título" e "Artista" (formato comum em cópias)
    if (i === 0 && !extractedTitle && !line.includes(":")) {
      extractedTitle = line;
      chordsStartIndex = i + 1;
      continue;
    }
    if (i === 1 && !extractedArtist && !line.includes(":")) {
      extractedArtist = line;
      chordsStartIndex = i + 1;
      continue;
    }
  }

  // 3. O restante do conteúdo é a cifra
  const chordsLines = lines.slice(chordsStartIndex);
  const chords = chordsLines.join("\n").trim();

  // 4. Extrair os versos limpos (letra) da cifra
  const lyrics = extractLyricsFromChords(chords);

  return {
    title: extractedTitle,
    artist: extractedArtist,
    tone: extractedTone,
    chords,
    lyrics,
  };
}
