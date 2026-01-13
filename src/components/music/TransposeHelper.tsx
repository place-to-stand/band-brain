"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  transposeProgression,
  getInterval,
  getPreferredNotation,
  NOTES_SHARP,
  NOTES_FLAT,
  type NoteNotation,
} from "@/lib/music/transposition";

interface TransposeHelperProps {
  initialKey?: string;
  initialProgression?: string;
  className?: string;
  onTranspose?: (result: { key: string; progression: string }) => void;
}

export function TransposeHelper({
  initialKey = "C",
  initialProgression = "",
  className,
  onTranspose,
}: TransposeHelperProps) {
  const [originalKey, setOriginalKey] = useState(initialKey);
  const [targetKey, setTargetKey] = useState(initialKey);
  const [progression, setProgression] = useState(initialProgression);
  const [notation, setNotation] = useState<NoteNotation>("sharp");

  const notes = notation === "flat" ? NOTES_FLAT : NOTES_SHARP;

  const semitones = useMemo(() => {
    return getInterval(originalKey, targetKey);
  }, [originalKey, targetKey]);

  const transposedProgression = useMemo(() => {
    if (!progression.trim()) return "";
    const result = transposeProgression(progression, semitones, notation);
    return typeof result === "string" ? result : result.join(" ");
  }, [progression, semitones, notation]);

  const handleKeyChange = (newTargetKey: string) => {
    setTargetKey(newTargetKey);
    // Auto-select appropriate notation based on target key
    const preferredNotation = getPreferredNotation(newTargetKey);
    setNotation(preferredNotation);
  };

  const handleTransposeUp = () => {
    const currentIndex = notes.indexOf(targetKey);
    if (currentIndex !== -1) {
      const newIndex = (currentIndex + 1) % 12;
      handleKeyChange(notes[newIndex]);
    }
  };

  const handleTransposeDown = () => {
    const currentIndex = notes.indexOf(targetKey);
    if (currentIndex !== -1) {
      const newIndex = (currentIndex - 1 + 12) % 12;
      handleKeyChange(notes[newIndex]);
    }
  };

  const handleApply = () => {
    if (onTranspose && transposedProgression) {
      onTranspose({ key: targetKey, progression: transposedProgression });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Transpose</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Original Key */}
        <div className="space-y-2">
          <Label>Original Key</Label>
          <div className="flex flex-wrap gap-1">
            {notes.map((note) => (
              <Button
                key={note}
                variant={originalKey === note ? "default" : "outline"}
                size="sm"
                className="h-8 w-10"
                onClick={() => setOriginalKey(note)}
              >
                {note}
              </Button>
            ))}
          </div>
        </div>

        {/* Target Key */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Target Key</Label>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTransposeDown}
              >
                -1
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTransposeUp}
              >
                +1
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {notes.map((note) => (
              <Button
                key={note}
                variant={targetKey === note ? "default" : "outline"}
                size="sm"
                className="h-8 w-10"
                onClick={() => handleKeyChange(note)}
              >
                {note}
              </Button>
            ))}
          </div>
        </div>

        {/* Interval Display */}
        {semitones !== 0 && (
          <div className="text-center text-sm text-muted-foreground">
            Transposing {semitones > 6 ? semitones - 12 : semitones} semitone
            {Math.abs(semitones > 6 ? semitones - 12 : semitones) !== 1 ? "s" : ""}{" "}
            ({semitones > 6 ? "down" : "up"})
          </div>
        )}

        {/* Notation Toggle */}
        <div className="flex gap-2">
          <Button
            variant={notation === "sharp" ? "default" : "outline"}
            size="sm"
            onClick={() => setNotation("sharp")}
          >
            Sharps (#)
          </Button>
          <Button
            variant={notation === "flat" ? "default" : "outline"}
            size="sm"
            onClick={() => setNotation("flat")}
          >
            Flats (b)
          </Button>
        </div>

        {/* Chord Progression Input */}
        <div className="space-y-2">
          <Label htmlFor="progression">Chord Progression</Label>
          <Textarea
            id="progression"
            value={progression}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setProgression(e.target.value)}
            placeholder="Enter chords (e.g., Am F C G)"
            className="font-mono"
            rows={3}
          />
        </div>

        {/* Transposed Result */}
        {transposedProgression && (
          <div className="space-y-2">
            <Label>Transposed</Label>
            <div className="p-3 bg-muted rounded-md font-mono text-lg">
              {transposedProgression}
            </div>
          </div>
        )}

        {/* Apply Button */}
        {onTranspose && transposedProgression && (
          <Button onClick={handleApply} className="w-full">
            Apply Transposition
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
