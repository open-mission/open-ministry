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
 * Expressão regular para encontrar cifras em linhas de cifras.
 */
const CHORD_REGEX = /\b[A-G][#b]?(?:m|maj|min|dim|aug|sus[24]?|add[29]|7|9|11|13|6|4)*(?:\/[A-G][#b]?)?\b/g;

/**
 * Transpõe um texto de cifra completo linha por linha.
 */
export function transposeChordsText(text: string, semitones: number): string {
  if (semitones === 0 || !text) return text;

  const lines = text.split("\n");

  const transposedLines = lines.map((line) => {
    // Se a linha for vazia ou for comentário de seção (ex: [Refrão], [Intro]), mantém
    if (!line.trim() || line.trim().startsWith("[") && line.trim().endsWith("]")) {
      return line;
    }

    // Testa se a linha parece conter acordes (alta proporção de notas musicais e espaços)
    const matches = line.match(CHORD_REGEX);
    if (!matches) return line;

    // Se mais de 40% das palavras forem acordes ou a linha for curta com acordes, transpõe
    const words = line.trim().split(/\s+/);
    const chordCount = matches.length;
    const isChordLine = chordCount >= 1 && (chordCount / words.length >= 0.4 || words.length <= 4);

    if (!isChordLine) {
      return line;
    }

    return line.replace(CHORD_REGEX, (match) => transposeChord(match, semitones));
  });

  return transposedLines.join("\n");
}
