/**
 * Shared AssemblyAI transcription utilities
 * Replaces whisper-utils.ts
 * Used by: process-voice-transcription, transcribe-audio-chunk
 */

const ASSEMBLYAI_API_URL = "https://api.assemblyai.com/v2";

/**
 * Upload audio data to AssemblyAI and get an upload URL
 */
export async function uploadToAssemblyAI(
  audioData: Uint8Array | ArrayBuffer,
  apiKey: string,
  timeoutMs = 120_000,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("upload_timeout"), timeoutMs);

  try {
    const response = await fetch(`${ASSEMBLYAI_API_URL}/upload`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/octet-stream",
      },
      body: audioData instanceof ArrayBuffer ? new Uint8Array(audioData) : audioData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`assemblyai_upload_error: ${response.status} - ${errorText.slice(0, 500)}`);
    }

    const data = await response.json();
    console.log(`[AssemblyAI] Upload complete: ${data.upload_url?.slice(0, 60)}...`);
    return data.upload_url;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Start a transcription job on AssemblyAI
 */
export async function startTranscription(
  audioUrl: string,
  apiKey: string,
  options?: {
    language_code?: string;
    speech_model?: string;
    speaker_labels?: boolean;
  },
): Promise<string> {
  const body: Record<string, unknown> = {
    audio_url: audioUrl,
    language_code: options?.language_code ?? "fr",
  };

  // Use best model if specified
  if (options?.speech_model) {
    body.speech_model = options.speech_model;
  }

  // Enable speaker diarization if requested
  if (options?.speaker_labels) {
    body.speaker_labels = true;
  }

  const response = await fetch(`${ASSEMBLYAI_API_URL}/transcript`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`assemblyai_start_error: ${response.status} - ${errorText.slice(0, 500)}`);
  }

  const data = await response.json();
  console.log(`[AssemblyAI] Transcription started: id=${data.id}, status=${data.status}`);
  return data.id;
}

/**
 * Poll for transcription completion
 */
export async function pollTranscription(
  transcriptId: string,
  apiKey: string,
  options?: {
    pollIntervalMs?: number;
    maxWaitMs?: number;
  },
): Promise<{ text: string; audio_duration: number | null; words: unknown[]; utterances: unknown[] | null }> {
  const { pollIntervalMs = 3000, maxWaitMs = 300_000 } = options ?? {};
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const response = await fetch(`${ASSEMBLYAI_API_URL}/transcript/${transcriptId}`, {
      headers: { Authorization: apiKey },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`assemblyai_poll_error: ${response.status} - ${errorText.slice(0, 500)}`);
    }

    const data = await response.json();

    if (data.status === "completed") {
      console.log(`[AssemblyAI] Transcription completed: ${data.text?.length ?? 0} chars, duration=${data.audio_duration}s, utterances=${data.utterances?.length ?? 0}`);
      return {
        text: data.text ?? "",
        audio_duration: data.audio_duration ?? null,
        words: data.words ?? [],
        utterances: data.utterances ?? null,
      };
    }

    if (data.status === "error") {
      throw new Error(`assemblyai_transcription_error: ${data.error ?? "Unknown error"}`);
    }

    // status is "queued" or "processing" — wait and retry
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  throw new Error(`ASSEMBLYAI_TIMEOUT: Transcription did not complete within ${Math.round(maxWaitMs / 1000)}s.`);
}

/**
 * Full transcription pipeline: upload → start → poll
 * Replaces transcribeWithWhisperBlob
 */
export async function transcribeWithAssemblyAI(
  audioData: Uint8Array | ArrayBuffer,
  apiKey: string,
  options?: {
    language_code?: string;
    speech_model?: string;
    maxWaitMs?: number;
    pollIntervalMs?: number;
  },
): Promise<{ text: string; audio_duration: number | null }> {
  const sizeKB = (audioData instanceof ArrayBuffer ? audioData.byteLength : audioData.length) / 1024;
  console.log(`[AssemblyAI] Full pipeline: size=${sizeKB.toFixed(1)} KB`);

  // 1) Upload
  const uploadUrl = await uploadToAssemblyAI(audioData, apiKey);

  // 2) Start transcription
  const transcriptId = await startTranscription(uploadUrl, apiKey, {
    language_code: options?.language_code,
    speech_model: options?.speech_model,
  });

  // 3) Poll for result
  const result = await pollTranscription(transcriptId, apiKey, {
    maxWaitMs: options?.maxWaitMs ?? 300_000,
    pollIntervalMs: options?.pollIntervalMs ?? 3000,
  });

  return { text: result.text, audio_duration: result.audio_duration };
}

/**
 * Transcribe from a public/signed audio URL (no upload needed)
 * AssemblyAI can fetch directly from URLs
 */
export async function transcribeFromUrl(
  audioUrl: string,
  apiKey: string,
  options?: {
    language_code?: string;
    speech_model?: string;
    maxWaitMs?: number;
    pollIntervalMs?: number;
  },
): Promise<{ text: string; audio_duration: number | null }> {
  console.log(`[AssemblyAI] URL pipeline: ${audioUrl.slice(0, 60)}...`);

  // Start transcription directly from URL (no upload step)
  const transcriptId = await startTranscription(audioUrl, apiKey, {
    language_code: options?.language_code,
    speech_model: options?.speech_model,
  });

  const result = await pollTranscription(transcriptId, apiKey, {
    maxWaitMs: options?.maxWaitMs ?? 300_000,
    pollIntervalMs: options?.pollIntervalMs ?? 3000,
  });

  return { text: result.text, audio_duration: result.audio_duration };
}
