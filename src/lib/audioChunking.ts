/**
 * Audio Chunking Utilities
 *
 * Client-side audio file splitting for Whisper API compatibility.
 * Whisper has a 25MB per-request limit, so large files are split
 * into chunks with overlap to prevent word cutoffs.
 */

import { supabase } from '@/integrations/supabase/client';

const WHISPER_MAX_SIZE_BYTES = 24 * 1024 * 1024; // 24MB (safety margin)
const OVERLAP_SECONDS = 8; // 8 second overlap between chunks (increased for better merge accuracy)
const MIN_OVERLAP_WORDS = 2; // Minimum words to consider for overlap detection
const MAX_OVERLAP_WORDS = 25; // Maximum words to scan for overlap

// Yield helper to keep the UI responsive during heavy CPU work
async function yieldToMainThread(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

export interface AudioChunk {
  index: number;
  blob: Blob;
  startTime: number;
  endTime: number;
}

export interface ChunkTranscriptionResult {
  chunkIndex: number;
  transcript: string;
  processingTimeMs: number;
}

export interface TranscriptionProgress {
  phase: 'loading' | 'decoding' | 'chunking' | 'transcribing' | 'merging' | 'done' | 'error';
  currentChunk?: number;
  totalChunks?: number;
  message: string;
}

/**
 * Check if a file needs chunking based on size
 */
export function needsChunking(file: File | Blob): boolean {
  return file.size > WHISPER_MAX_SIZE_BYTES;
}

/**
 * Estimate number of chunks needed for a file (rough estimate based on bytes)
 */
export function estimateChunks(fileSizeBytes: number): number {
  if (fileSizeBytes <= WHISPER_MAX_SIZE_BYTES) return 1;
  return Math.ceil(fileSizeBytes / WHISPER_MAX_SIZE_BYTES);
}

/**
 * Split an audio file into chunks using Web Audio API.
 *
 * IMPORTANT: We compute chunk duration based on decoded PCM (WAV) bitrate,
 * not the original compressed file size. Otherwise a small compressed file
 * can expand to a huge WAV chunk and freeze/crash the tab.
 */
export async function splitAudioIntoChunks(
  audioFile: File | Blob,
  onProgress?: (progress: TranscriptionProgress) => void
): Promise<AudioChunk[]> {
  onProgress?.({ phase: 'loading', message: 'Chargement du fichier audio...' });

  const arrayBuffer = await audioFile.arrayBuffer();

  onProgress?.({ phase: 'decoding', message: 'Décodage audio...' });

  const audioContext = new AudioContext();
  let audioBuffer: AudioBuffer;

  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const duration = audioBuffer.duration;
    const sampleRate = audioBuffer.sampleRate;
    const numberOfChannels = audioBuffer.numberOfChannels;

    console.log(`[audioChunking] Audio: ${duration.toFixed(1)}s, ${sampleRate}Hz, ${numberOfChannels} channels`);

    // PCM bitrate (16-bit): sampleRate * channels * 2 bytes
    const pcmBytesPerSecond = sampleRate * numberOfChannels * 2;

    // Safety margin: 90% of allowed size
    const maxChunkDuration = (WHISPER_MAX_SIZE_BYTES / pcmBytesPerSecond) * 0.9;

    // Ensure chunkDuration is always larger than overlap
    const chunkDuration = Math.max(OVERLAP_SECONDS + 10, maxChunkDuration);

    // Step between chunk starts
    const step = Math.max(1, chunkDuration - OVERLAP_SECONDS);

    const numChunks = Math.ceil(duration / step);
    console.log(`[audioChunking] Splitting into ${numChunks} chunks of ~${chunkDuration.toFixed(1)}s each (step=${step.toFixed(1)}s)`);

    onProgress?.({
      phase: 'chunking',
      message: `Découpage en ${numChunks} segments...`,
      totalChunks: numChunks,
    });

    const chunks: AudioChunk[] = [];

    for (let i = 0; i < numChunks; i++) {
      const startTime = i * step;
      const endTime = Math.min(startTime + chunkDuration, duration);

      const startSample = Math.floor(startTime * sampleRate);
      const endSample = Math.ceil(endTime * sampleRate);
      const chunkLength = Math.max(1, endSample - startSample);

      // Create a new buffer for this chunk
      const chunkBuffer = audioContext.createBuffer(numberOfChannels, chunkLength, sampleRate);

      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sourceData = audioBuffer.getChannelData(channel);
        const destData = chunkBuffer.getChannelData(channel);
        destData.set(sourceData.subarray(startSample, endSample));
      }

      // Encode chunk to WAV (CPU-heavy)
      const chunkBlob = await encodeAudioBufferToWav(chunkBuffer, onProgress, i, numChunks);

      chunks.push({
        index: i,
        blob: chunkBlob,
        startTime,
        endTime,
      });

      console.log(
        `[audioChunking] Chunk ${i}: ${startTime.toFixed(1)}s - ${endTime.toFixed(1)}s, size: ${(chunkBlob.size / 1024 / 1024).toFixed(2)} MB`
      );

      // Give the UI a breath between chunks
      await yieldToMainThread();
    }

    return chunks;
  } catch (error) {
    console.error('[audioChunking] Failed to decode/split audio:', error);

    if (error instanceof Error && error.message.includes('Impossible de décoder')) {
      throw error;
    }

    throw new Error('Erreur pendant le découpage audio. Essayez un autre format (MP3/M4A/WAV).');
  } finally {
    try {
      await audioContext.close();
    } catch {
      // ignore
    }
  }
}

/**
 * Encode an AudioBuffer to WAV format.
 * This is CPU & memory heavy; we yield periodically to prevent UI freeze.
 */
async function encodeAudioBufferToWav(
  audioBuffer: AudioBuffer,
  onProgress?: (progress: TranscriptionProgress) => void,
  chunkIndex?: number,
  totalChunks?: number
): Promise<Blob> {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;

  onProgress?.({
    phase: 'chunking',
    currentChunk: typeof chunkIndex === 'number' ? chunkIndex + 1 : undefined,
    totalChunks,
    message:
      typeof chunkIndex === 'number' && typeof totalChunks === 'number'
        ? `Encodage WAV ${chunkIndex + 1}/${totalChunks}...`
        : 'Encodage WAV...',
  });

  // Preload channel data views
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numberOfChannels; ch++) {
    channels.push(audioBuffer.getChannelData(ch));
  }

  // Interleaved 16-bit PCM (little-endian)
  const pcmData = new Int16Array(length * numberOfChannels);

  const YIELD_EVERY_FRAMES = 131072; // ~3s at 44.1kHz

  for (let i = 0; i < length; i++) {
    const base = i * numberOfChannels;

    for (let ch = 0; ch < numberOfChannels; ch++) {
      const s = Math.max(-1, Math.min(1, channels[ch][i]));
      pcmData[base + ch] = s < 0 ? (s * 0x8000) : (s * 0x7fff);
    }

    if (i > 0 && i % YIELD_EVERY_FRAMES === 0) {
      await yieldToMainThread();
    }
  }

  // Create WAV header
  const wavBuffer = new ArrayBuffer(44 + pcmData.byteLength);
  const view = new DataView(wavBuffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.byteLength, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true); // byte rate
  view.setUint16(32, numberOfChannels * 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.byteLength, true);

  // Write PCM data
  const wavBytes = new Uint8Array(wavBuffer);
  wavBytes.set(new Uint8Array(pcmData.buffer), 44);

  return new Blob([wavBytes], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Transcribe a single audio chunk via backend function
 */
export async function transcribeChunk(
  chunk: AudioChunk,
  language: string = 'fr'
): Promise<ChunkTranscriptionResult> {
  const formData = new FormData();
  formData.append('file', chunk.blob, `chunk_${chunk.index}.wav`);
  formData.append('language', language);
  formData.append('chunk_index', String(chunk.index));

  const { data, error } = await supabase.functions.invoke('transcribe-audio-chunk', {
    body: formData,
  });

  if (error) {
    throw new Error(`Chunk ${chunk.index} failed: ${error.message}`);
  }

  if (!data?.ok) {
    throw new Error(`Chunk ${chunk.index} error: ${data?.message || 'Unknown error'}`);
  }

  return {
    chunkIndex: data.chunk_index,
    transcript: data.transcript,
    processingTimeMs: data.processing_time_ms,
  };
}

/**
 * Transcribe all chunks in parallel (with concurrency limit)
 */
export async function transcribeAllChunks(
  chunks: AudioChunk[],
  language: string = 'fr',
  onProgress?: (progress: TranscriptionProgress) => void,
  maxConcurrency: number = 2
): Promise<ChunkTranscriptionResult[]> {
  const results: ChunkTranscriptionResult[] = [];

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < chunks.length; i += maxConcurrency) {
    const batch = chunks.slice(i, i + maxConcurrency);

    const batchResults = await Promise.all(
      batch.map(async (chunk) => {
        onProgress?.({
          phase: 'transcribing',
          currentChunk: chunk.index + 1,
          totalChunks: chunks.length,
          message: `Transcription segment ${chunk.index + 1}/${chunks.length}...`,
        });

        const result = await transcribeChunk(chunk, language);
        return result;
      })
    );

    results.push(...batchResults);

    // Yield between batches too
    await yieldToMainThread();
  }

  // Sort by chunk index to maintain order
  results.sort((a, b) => a.chunkIndex - b.chunkIndex);
  return results;
}

/**
 * Merge transcriptions from multiple chunks.
 * Handles overlap by detecting and removing duplicated content.
 */
/**
 * Merge transcriptions from all chunks, intelligently removing overlaps
 */
export function mergeTranscriptions(results: ChunkTranscriptionResult[]): string {
  if (results.length === 0) return '';
  if (results.length === 1) return results[0].transcript;

  const mergedParts: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const current = results[i].transcript.trim();

    if (i === 0) {
      mergedParts.push(current);
      continue;
    }

    const previous = mergedParts[mergedParts.length - 1];
    const { cleanedCurrent, overlapFound, overlapLength } = removeOverlapAdvanced(previous, current);

    if (overlapFound) {
      console.log(`[mergeTranscriptions] Chunk ${i}: detected ${overlapLength} word overlap`);
      mergedParts.push(cleanedCurrent);
    } else {
      // No overlap detected - check for potential duplication by comparing last/first words
      const lastWords = previous.split(/\s+/).slice(-3).join(' ').toLowerCase();
      const firstWords = current.split(/\s+/).slice(0, 3).join(' ').toLowerCase();
      
      if (lastWords === firstWords && lastWords.length > 5) {
        // Likely duplicate, skip first 3 words of current
        console.log(`[mergeTranscriptions] Chunk ${i}: fallback dedup (${lastWords})`);
        mergedParts.push(current.split(/\s+/).slice(3).join(' '));
      } else {
        mergedParts.push(current);
      }
    }
  }

  return mergedParts.join(' ').replace(/\s+/g, ' ').trim();
}

interface OverlapResult {
  cleanedCurrent: string;
  overlapFound: boolean;
  overlapLength: number;
}

/**
 * Advanced overlap detection with fuzzy matching and partial word handling
 */
function removeOverlapAdvanced(previous: string, current: string): OverlapResult {
  const prevWords = previous.split(/\s+/);
  const currWords = current.split(/\s+/);

  // Scan from larger to smaller overlap
  const maxOverlap = Math.min(MAX_OVERLAP_WORDS, Math.floor(prevWords.length / 2), Math.floor(currWords.length / 2));

  for (let overlap = maxOverlap; overlap >= MIN_OVERLAP_WORDS; overlap--) {
    const prevEnd = prevWords.slice(-overlap);
    const currStart = currWords.slice(0, overlap);

    // Calculate similarity score
    const similarity = calculateSimilarity(prevEnd, currStart);
    
    // Accept if similarity is high enough (>80% match)
    if (similarity >= 0.8) {
      return {
        cleanedCurrent: currWords.slice(overlap).join(' '),
        overlapFound: true,
        overlapLength: overlap,
      };
    }
    
    // Also try with one word less on either side (handles partial word cuts)
    if (overlap > MIN_OVERLAP_WORDS) {
      const prevEndMinus1 = prevWords.slice(-(overlap - 1));
      const currStartPlus1 = currWords.slice(1, overlap);
      
      if (prevEndMinus1.length === currStartPlus1.length && prevEndMinus1.length >= MIN_OVERLAP_WORDS) {
        const similarityAlt = calculateSimilarity(prevEndMinus1, currStartPlus1);
        if (similarityAlt >= 0.85) {
          return {
            cleanedCurrent: currWords.slice(overlap - 1).join(' '),
            overlapFound: true,
            overlapLength: overlap - 1,
          };
        }
      }
    }
  }

  return { cleanedCurrent: current, overlapFound: false, overlapLength: 0 };
}

/**
 * Calculate word-by-word similarity between two arrays
 */
function calculateSimilarity(words1: string[], words2: string[]): number {
  if (words1.length !== words2.length || words1.length === 0) return 0;
  
  let matchScore = 0;
  
  for (let i = 0; i < words1.length; i++) {
    const w1 = words1[i].toLowerCase().replace(/[.,!?;:'"]/g, '');
    const w2 = words2[i].toLowerCase().replace(/[.,!?;:'"]/g, '');
    
    if (w1 === w2) {
      matchScore += 1;
    } else if (levenshteinDistance(w1, w2) <= Math.max(1, Math.floor(w1.length * 0.3))) {
      // Allow ~30% character difference for typos/transcription variance
      matchScore += 0.7;
    }
  }
  
  return matchScore / words1.length;
}

/**
 * Simple Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Use single array for memory efficiency
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], prev, row[j]) + 1;
      row[j - 1] = prev;
      prev = cur;
    }
    row[b.length] = prev;
  }

  return row[b.length];
}

/**
 * Full chunked transcription pipeline
 */
export async function transcribeLargeAudio(
  audioFile: File | Blob,
  language: string = 'fr',
  onProgress?: (progress: TranscriptionProgress) => void
): Promise<string> {
  try {
    const chunks = await splitAudioIntoChunks(audioFile, onProgress);

    const results = await transcribeAllChunks(chunks, language, onProgress);

    onProgress?.({ phase: 'merging', message: 'Fusion des transcriptions...' });

    const mergedText = mergeTranscriptions(results);

    onProgress?.({ phase: 'done', message: 'Transcription complète' });

    return mergedText;
  } catch (error) {
    onProgress?.({
      phase: 'error',
      message: error instanceof Error ? error.message : 'Erreur de transcription',
    });
    throw error;
  }
}
