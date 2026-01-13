import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

const PEAKS_PER_SECOND = 10; // Number of peak samples per second of audio
const MAX_PEAKS = 1000; // Maximum number of peaks to store

/**
 * Compute waveform peaks from an audio file
 * This action fetches the audio file, decodes it, and extracts peak amplitude data
 */
export const computeWaveform = action({
  args: {
    fileId: v.id("songFiles"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    // Get the file URL
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new Error("File not found in storage");
    }

    try {
      // Fetch the audio file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch audio file");
      }

      const arrayBuffer = await response.arrayBuffer();

      // Compute peaks from the audio data
      // Note: In a production environment, you'd use a proper audio decoding library
      // For now, we'll compute a simplified version based on raw bytes
      const peaks = computePeaksFromBuffer(arrayBuffer);

      // Save the peaks to the database
      await ctx.runMutation(internal.waveform.savePeaks, {
        fileId: args.fileId,
        peaks,
      });

      return { success: true, peakCount: peaks.length };
    } catch (error) {
      console.error("Waveform computation failed:", error);
      throw new Error("Failed to compute waveform");
    }
  },
});

/**
 * Save computed peaks to the song file record
 */
export const savePeaks = internalMutation({
  args: {
    fileId: v.id("songFiles"),
    peaks: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }

    await ctx.db.patch(args.fileId, {
      waveformPeaks: args.peaks,
    });
  },
});

/**
 * Compute peaks from an audio buffer
 * This is a simplified implementation that works with raw audio data
 */
function computePeaksFromBuffer(arrayBuffer: ArrayBuffer): number[] {
  const data = new Uint8Array(arrayBuffer);
  const dataLength = data.length;

  // Determine number of samples to generate
  // Estimate audio duration (assuming ~44100 Hz, 16-bit stereo = ~176400 bytes/second)
  const estimatedDuration = dataLength / 176400;
  const targetPeaks = Math.min(
    MAX_PEAKS,
    Math.max(100, Math.floor(estimatedDuration * PEAKS_PER_SECOND))
  );

  const samplesPerPeak = Math.floor(dataLength / targetPeaks);
  const peaks: number[] = [];

  for (let i = 0; i < targetPeaks; i++) {
    const start = i * samplesPerPeak;
    const end = Math.min(start + samplesPerPeak, dataLength);

    // Find the maximum amplitude in this segment
    let max = 0;
    for (let j = start; j < end; j++) {
      // Convert unsigned byte to signed and get absolute value
      const sample = Math.abs(data[j] - 128);
      if (sample > max) {
        max = sample;
      }
    }

    // Normalize to 0-1 range
    peaks.push(max / 128);
  }

  return peaks;
}

/**
 * Compute waveform for a bounce file
 */
export const computeBounceWaveform = action({
  args: {
    bounceId: v.id("bounces"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    // Get the file URL
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new Error("File not found in storage");
    }

    try {
      // Fetch the audio file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch audio file");
      }

      const arrayBuffer = await response.arrayBuffer();
      const peaks = computePeaksFromBuffer(arrayBuffer);

      // Save the peaks to the bounce record
      await ctx.runMutation(internal.waveform.saveBouncePeaks, {
        bounceId: args.bounceId,
        peaks,
      });

      return { success: true, peakCount: peaks.length };
    } catch (error) {
      console.error("Bounce waveform computation failed:", error);
      throw new Error("Failed to compute bounce waveform");
    }
  },
});

/**
 * Save computed peaks to a bounce record
 */
export const saveBouncePeaks = internalMutation({
  args: {
    bounceId: v.id("bounces"),
    peaks: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const bounce = await ctx.db.get(args.bounceId);
    if (!bounce) {
      throw new Error("Bounce not found");
    }

    await ctx.db.patch(args.bounceId, {
      waveformPeaks: args.peaks,
    });
  },
});
