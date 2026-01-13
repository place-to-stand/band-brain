/**
 * Music transposition utilities
 *
 * Handles chord and key transposition with proper handling of
 * sharps (#) and flats (b) notation.
 */

// Notes in order (using sharps)
const NOTES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Notes in order (using flats)
const NOTES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

// Enharmonic equivalents map (flat to sharp)
const ENHARMONIC_TO_SHARP: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
  Cb: "B",
  Fb: "E",
};

// Enharmonic equivalents map (sharp to flat)
const ENHARMONIC_TO_FLAT: Record<string, string> = {
  "C#": "Db",
  "D#": "Eb",
  "F#": "Gb",
  "G#": "Ab",
  "A#": "Bb",
  "B#": "C",
  "E#": "F",
};

// Keys that prefer flat notation
const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"]);

// Minor keys that prefer flat notation
const FLAT_MINOR_KEYS = new Set(["Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm", "Abm"]);

export type NoteNotation = "sharp" | "flat";

/**
 * Normalize a note to its sharp equivalent
 */
export function normalizeToSharp(note: string): string {
  const root = note.match(/^[A-G][#b]?/)?.[0];
  if (!root) return note;

  const normalized = ENHARMONIC_TO_SHARP[root] ?? root;
  return note.replace(root, normalized);
}

/**
 * Normalize a note to its flat equivalent
 */
export function normalizeToFlat(note: string): string {
  const root = note.match(/^[A-G][#b]?/)?.[0];
  if (!root) return note;

  const normalized = ENHARMONIC_TO_FLAT[root] ?? root;
  return note.replace(root, normalized);
}

/**
 * Get the index of a note in the chromatic scale (0-11)
 */
export function getNoteIndex(note: string): number {
  const root = note.match(/^[A-G][#b]?/)?.[0];
  if (!root) return -1;

  const normalizedRoot = ENHARMONIC_TO_SHARP[root] ?? root;
  return NOTES_SHARP.indexOf(normalizedRoot);
}

/**
 * Transpose a single note by a number of semitones
 *
 * @param note - The note to transpose (e.g., "C", "F#", "Bb")
 * @param semitones - Number of semitones to transpose (positive = up, negative = down)
 * @param notation - Whether to use sharps or flats in the result
 * @returns The transposed note
 */
export function transposeNote(
  note: string,
  semitones: number,
  notation: NoteNotation = "sharp"
): string {
  const index = getNoteIndex(note);
  if (index === -1) return note;

  // Handle negative semitones
  const newIndex = ((index + semitones) % 12 + 12) % 12;

  const notes = notation === "flat" ? NOTES_FLAT : NOTES_SHARP;
  return notes[newIndex];
}

/**
 * Transpose a chord (including quality and bass note)
 *
 * @param chord - The chord to transpose (e.g., "Am7", "F#m", "Bb/D")
 * @param semitones - Number of semitones to transpose
 * @param notation - Whether to use sharps or flats in the result
 * @returns The transposed chord
 */
export function transposeChord(
  chord: string,
  semitones: number,
  notation: NoteNotation = "sharp"
): string {
  // Parse the chord: root note, quality, and optional bass note
  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return chord;

  const [, root, rest] = match;

  // Transpose the root note
  const newRoot = transposeNote(root, semitones, notation);

  // Check for slash chord (bass note)
  const slashMatch = rest.match(/(.*)\/([A-G][#b]?)$/);
  if (slashMatch) {
    const [, quality, bassNote] = slashMatch;
    const newBass = transposeNote(bassNote, semitones, notation);
    return `${newRoot}${quality}/${newBass}`;
  }

  return `${newRoot}${rest}`;
}

/**
 * Transpose a chord progression
 *
 * @param progression - Array of chords or a space/comma-separated string
 * @param semitones - Number of semitones to transpose
 * @param notation - Whether to use sharps or flats in the result
 * @returns The transposed progression in the same format as input
 */
export function transposeProgression(
  progression: string | string[],
  semitones: number,
  notation: NoteNotation = "sharp"
): string | string[] {
  if (Array.isArray(progression)) {
    return progression.map((chord) => transposeChord(chord, semitones, notation));
  }

  // Handle string input - split by whitespace or commas
  const chords = progression.split(/[\s,]+/).filter(Boolean);
  const transposed = chords.map((chord) =>
    transposeChord(chord, semitones, notation)
  );

  // Preserve original separator style
  if (progression.includes(",")) {
    return transposed.join(", ");
  }
  return transposed.join(" ");
}

/**
 * Calculate the interval in semitones between two notes/keys
 *
 * @param from - Starting note/key
 * @param to - Target note/key
 * @returns Number of semitones (0-11)
 */
export function getInterval(from: string, to: string): number {
  const fromIndex = getNoteIndex(from);
  const toIndex = getNoteIndex(to);

  if (fromIndex === -1 || toIndex === -1) return 0;

  return ((toIndex - fromIndex) % 12 + 12) % 12;
}

/**
 * Determine the preferred notation for a key
 *
 * @param key - The key (e.g., "C", "F#", "Bbm")
 * @returns "sharp" or "flat"
 */
export function getPreferredNotation(key: string): NoteNotation {
  const root = key.match(/^[A-G][#b]?m?/)?.[0];
  if (!root) return "sharp";

  if (FLAT_KEYS.has(root) || FLAT_MINOR_KEYS.has(root)) {
    return "flat";
  }

  // Check if the root itself uses a flat
  if (root.includes("b")) {
    return "flat";
  }

  return "sharp";
}

/**
 * Transpose a chord progression from one key to another
 *
 * @param progression - The chord progression
 * @param fromKey - Original key
 * @param toKey - Target key
 * @returns The transposed progression
 */
export function transposeToKey(
  progression: string | string[],
  fromKey: string,
  toKey: string
): string | string[] {
  const semitones = getInterval(fromKey, toKey);
  const notation = getPreferredNotation(toKey);
  return transposeProgression(progression, semitones, notation);
}

/**
 * Get all notes in a major scale
 *
 * @param root - The root note of the scale
 * @param notation - Whether to use sharps or flats
 * @returns Array of 7 notes
 */
export function getMajorScale(root: string, notation?: NoteNotation): string[] {
  const intervals = [0, 2, 4, 5, 7, 9, 11];
  const preferredNotation = notation ?? getPreferredNotation(root);

  return intervals.map((interval) =>
    transposeNote(root, interval, preferredNotation)
  );
}

/**
 * Get all notes in a minor scale (natural minor)
 *
 * @param root - The root note of the scale
 * @param notation - Whether to use sharps or flats
 * @returns Array of 7 notes
 */
export function getMinorScale(root: string, notation?: NoteNotation): string[] {
  const intervals = [0, 2, 3, 5, 7, 8, 10];
  const preferredNotation = notation ?? getPreferredNotation(root + "m");

  return intervals.map((interval) =>
    transposeNote(root, interval, preferredNotation)
  );
}

/**
 * Get the relative major/minor of a key
 *
 * @param key - The key (e.g., "C", "Am")
 * @returns The relative key
 */
export function getRelativeKey(key: string): string {
  const isMinor = key.endsWith("m") || key.endsWith("min");
  const root = key.replace(/m(in)?$/, "");

  if (isMinor) {
    // Relative major is 3 semitones up
    return transposeNote(root, 3, getPreferredNotation(root));
  } else {
    // Relative minor is 3 semitones down (9 up)
    return transposeNote(root, 9, getPreferredNotation(root)) + "m";
  }
}

/**
 * Get the parallel major/minor of a key
 *
 * @param key - The key (e.g., "C", "Am")
 * @returns The parallel key
 */
export function getParallelKey(key: string): string {
  const isMinor = key.endsWith("m") || key.endsWith("min");
  const root = key.replace(/m(in)?$/, "");

  if (isMinor) {
    return root; // C minor -> C major
  } else {
    return root + "m"; // C major -> C minor
  }
}

// Export constants for use in UI
export { NOTES_SHARP, NOTES_FLAT };
