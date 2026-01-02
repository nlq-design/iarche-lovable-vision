/**
 * Audio Chunking Utilities
 * 
 * Client-side audio file splitting for Whisper API compatibility.
 * Whisper has a 25MB per-request limit, so large files are split
 * into chunks with overlap to prevent word cutoffs.
 */

import { supabase } from '@/integrations/supabase/client';

const WHISPER_MAX_SIZE_BYTES = 24 * 1024 * 1024; // 24MB (safety margin)
const OVERLAP_SECONDS = 5; // 5 second overlap between chunks

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
 * Estimate number of chunks needed for a file
 */
export function estimateChunks(fileSizeBytes: number): number {
  if (fileSizeBytes <= WHISPER_MAX_SIZE_BYTES) return 1;
  return Math.ceil(fileSizeBytes / WHISPER_MAX_SIZE_BYTES);
}

/**
 * Split an audio file into chunks using Web Audio API
 * Each chunk is encoded as a separate audio file
 */
export async function splitAudioIntoChunks(
  audioFile: File | Blob,
  onProgress?: (progress: TranscriptionProgress) => void
): Promise<AudioChunk[]> {
  onProgress?.({ phase: 'loading', message: 'Chargement du fichier audio...' });

  // Read file as ArrayBuffer
  const arrayBuffer = await audioFile.arrayBuffer();
  
  onProgress?.({ phase: 'decoding', message: 'Décodage audio...' });

  // Create AudioContext for decoding
  const audioContext = new AudioContext();
  let audioBuffer: AudioBuffer;
  
  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch (error) {
    console.error('[audioChunking] Failed to decode audio:', error);
    throw new Error('Impossible de décoder le fichier audio. Format non supporté.');
  }

  const duration = audioBuffer.duration;
  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = audioBuffer.numberOfChannels;

  console.log(`[audioChunking] Audio: ${duration.toFixed(1)}s, ${sampleRate}Hz, ${numberOfChannels} channels`);

  // Calculate chunk duration based on file size ratio
  const bytesPerSecond = audioFile.size / duration;
  const maxChunkDuration = WHISPER_MAX_SIZE_BYTES / bytesPerSecond;
  
  // Use 80% of max to leave safety margin
  const chunkDuration = maxChunkDuration * 0.8;
  
  const numChunks = Math.ceil(duration / (chunkDuration - OVERLAP_SECONDS));
  console.log(`[audioChunking] Splitting into ${numChunks} chunks of ~${chunkDuration.toFixed(1)}s each`);

  onProgress?.({ 
    phase: 'chunking', 
    message: `Découpage en ${numChunks} segments...`,
    totalChunks: numChunks 
  });

  const chunks: AudioChunk[] = [];

  for (let i = 0; i < numChunks; i++) {
    const startTime = i * (chunkDuration - OVERLAP_SECONDS);
    const endTime = Math.min(startTime + chunkDuration, duration);
    
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.ceil(endTime * sampleRate);
    const chunkLength = endSample - startSample;

    // Create a new buffer for this chunk
    const chunkBuffer = audioContext.createBuffer(numberOfChannels, chunkLength, sampleRate);
    
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sourceData = audioBuffer.getChannelData(channel);
      const destData = chunkBuffer.getChannelData(channel);
      destData.set(sourceData.subarray(startSample, endSample));
    }

    // Encode chunk to WAV
    const chunkBlob = await encodeAudioBufferToWav(chunkBuffer);
    
    chunks.push({
      index: i,
      blob: chunkBlob,
      startTime,
      endTime,
    });

    console.log(`[audioChunking] Chunk ${i}: ${startTime.toFixed(1)}s - ${endTime.toFixed(1)}s, size: ${(chunkBlob.size / 1024 / 1024).toFixed(2)} MB`);
  }

  await audioContext.close();
  return chunks;
}

/**
 * Encode an AudioBuffer to WAV format
 */
async function encodeAudioBufferToWav(audioBuffer: AudioBuffer): Promise<Blob> {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;
  
  // Interleave channels
  const interleavedLength = length * numberOfChannels;
  const interleaved = new Float32Array(interleavedLength);
  
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      interleaved[i * numberOfChannels + channel] = audioBuffer.getChannelData(channel)[i];
    }
  }

  // Convert to 16-bit PCM
  const pcmData = new Int16Array(interleavedLength);
  for (let i = 0; i < interleavedLength; i++) {
    const s = Math.max(-1, Math.min(1, interleaved[i]));
    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
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
 * Transcribe a single audio chunk via edge function
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
  let completed = 0;

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
        completed++;
        return result;
      })
    );

    results.push(...batchResults);
  }

  // Sort by chunk index to maintain order
  results.sort((a, b) => a.chunkIndex - b.chunkIndex);
  return results;
}

/**
 * Merge transcriptions from multiple chunks
 * Handles overlap by detecting and removing duplicated content
 */
export function mergeTranscriptions(results: ChunkTranscriptionResult[]): string {
  if (results.length === 0) return '';
  if (results.length === 1) return results[0].transcript;

  // Simple merge with overlap detection
  const mergedParts: string[] = [];
  
  for (let i = 0; i < results.length; i++) {
    const current = results[i].transcript.trim();
    
    if (i === 0) {
      mergedParts.push(current);
      continue;
    }

    // Try to detect overlap with previous chunk
    const previous = mergedParts[mergedParts.length - 1];
    const overlapRemoved = removeOverlap(previous, current);
    
    if (overlapRemoved) {
      mergedParts.push(overlapRemoved);
    } else {
      // No overlap detected, just append with space
      mergedParts.push(current);
    }
  }

  return mergedParts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Attempt to detect and remove overlapping text between two strings
 */
function removeOverlap(previous: string, current: string): string | null {
  const prevWords = previous.split(/\s+/);
  const currWords = current.split(/\s+/);
  
  // Look for overlap of 3-15 words at the end of previous / start of current
  const maxOverlap = Math.min(15, Math.floor(prevWords.length / 2), Math.floor(currWords.length / 2));
  
  for (let overlap = maxOverlap; overlap >= 3; overlap--) {
    const prevEnd = prevWords.slice(-overlap).join(' ').toLowerCase();
    const currStart = currWords.slice(0, overlap).join(' ').toLowerCase();
    
    // Fuzzy match (allow for small transcription differences)
    if (prevEnd === currStart || levenshteinDistance(prevEnd, currStart) <= 2) {
      // Found overlap, return current without the overlapping part
      return currWords.slice(overlap).join(' ');
    }
  }
  
  return null;
}

/**
 * Simple Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[b.length][a.length];
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
    // Split into chunks
    const chunks = await splitAudioIntoChunks(audioFile, onProgress);
    
    // Transcribe all chunks
    const results = await transcribeAllChunks(chunks, language, onProgress);
    
    onProgress?.({ phase: 'merging', message: 'Fusion des transcriptions...' });
    
    // Merge transcriptions
    const mergedText = mergeTranscriptions(results);
    
    onProgress?.({ phase: 'done', message: 'Transcription complète' });
    
    return mergedText;
  } catch (error) {
    onProgress?.({ 
      phase: 'error', 
      message: error instanceof Error ? error.message : 'Erreur de transcription' 
    });
    throw error;
  }
}
