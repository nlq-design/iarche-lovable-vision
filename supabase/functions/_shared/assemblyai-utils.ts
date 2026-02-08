/**
 * Shared AssemblyAI transcription utilities (v11.0)
 * Used by: process-voice-transcription, transcribe-audio-chunk
 * 
 * Features enabled:
 * - speech_model: "best" (high-precision)
 * - Speaker Diarization
 * - Auto Language Detection
 * - Sentiment Analysis
 * - Entity Detection
 * - Auto Chapters
 * - Content Safety (Moderation)
 * - Word-level Timestamps
 * - Custom Vocabulary (word_boost)
 * - Multichannel Audio
 */

const ASSEMBLYAI_API_URL = "https://api.assemblyai.com/v2";

// ============= TYPES =============

export interface AssemblyAITranscriptionOptions {
  language_code?: string | null; // null = auto-detect
  speech_model?: string; // "best" | "nano" | default
  speaker_labels?: boolean;
  sentiment_analysis?: boolean;
  entity_detection?: boolean;
  auto_chapters?: boolean;
  content_safety?: boolean;
  word_boost?: string[];
  boost_param?: "low" | "default" | "high";
  multichannel?: boolean;
  language_detection?: boolean; // auto-detect language
  maxWaitMs?: number;
  pollIntervalMs?: number;
}

export interface AssemblyAIWord {
  text: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: string;
}

export interface AssemblyAISentiment {
  text: string;
  start: number;
  end: number;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  confidence: number;
  speaker?: string;
}

export interface AssemblyAIEntity {
  entity_type: string;
  text: string;
  start: number;
  end: number;
}

export interface AssemblyAIChapter {
  summary: string;
  gist: string;
  headline: string;
  start: number;
  end: number;
}

export interface AssemblyAIContentSafetyLabel {
  label: string;
  confidence: number;
  severity: number;
}

export interface AssemblyAIContentSafetyResult {
  text: string;
  labels: AssemblyAIContentSafetyLabel[];
  sentences_idx_start: number;
  sentences_idx_end: number;
  timestamp: { start: number; end: number };
}

export interface AssemblyAIUtterance {
  speaker: string;
  text: string;
  start: number;
  end: number;
  confidence: number;
  words: AssemblyAIWord[];
}

export interface AssemblyAIFullResult {
  text: string;
  audio_duration: number | null;
  language_code: string | null;
  words: AssemblyAIWord[];
  utterances: AssemblyAIUtterance[] | null;
  sentiment_analysis_results: AssemblyAISentiment[] | null;
  entities: AssemblyAIEntity[] | null;
  chapters: AssemblyAIChapter[] | null;
  content_safety_labels: {
    status: string;
    results: AssemblyAIContentSafetyResult[];
    summary: Record<string, number>;
    severity_score_summary: Record<string, { low: number; medium: number; high: number }>;
  } | null;
}

// ============= UPLOAD =============

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

// ============= START TRANSCRIPTION =============

export async function startTranscription(
  audioUrl: string,
  apiKey: string,
  options?: AssemblyAITranscriptionOptions,
): Promise<string> {
  const body: Record<string, unknown> = {
    audio_url: audioUrl,
    // Use "best" speech model by default for highest accuracy
    speech_model: options?.speech_model ?? "best",
  };

  // Language: null/undefined = auto-detect, string = specific language
  if (options?.language_detection || options?.language_code === null || options?.language_code === undefined) {
    // Omit language_code to let AssemblyAI auto-detect
    body.language_detection = true;
    console.log(`[AssemblyAI] Language: auto-detect`);
  } else {
    body.language_code = options.language_code;
    console.log(`[AssemblyAI] Language: ${options.language_code}`);
  }

  // Speaker Diarization
  if (options?.speaker_labels) {
    body.speaker_labels = true;
  }

  // Sentiment Analysis
  if (options?.sentiment_analysis) {
    body.sentiment_analysis = true;
  }

  // Entity Detection
  if (options?.entity_detection) {
    body.entity_detection = true;
  }

  // Auto Chapters
  if (options?.auto_chapters) {
    body.auto_chapters = true;
  }

  // Content Safety / Moderation
  if (options?.content_safety) {
    body.content_safety = true;
  }

  // Custom Vocabulary (word boost)
  if (options?.word_boost && options.word_boost.length > 0) {
    body.word_boost = options.word_boost;
    body.boost_param = options.boost_param ?? "high";
    console.log(`[AssemblyAI] Custom vocabulary: ${options.word_boost.length} terms, boost=${body.boost_param}`);
  }

  // Multichannel Audio
  if (options?.multichannel) {
    body.multichannel = true;
    console.log(`[AssemblyAI] Multichannel audio enabled`);
  }

  const features = Object.entries(body)
    .filter(([k]) => ['speaker_labels', 'sentiment_analysis', 'entity_detection', 'auto_chapters', 'content_safety', 'language_detection', 'multichannel'].includes(k))
    .filter(([, v]) => v === true)
    .map(([k]) => k);
  console.log(`[AssemblyAI] Features: speech_model=${body.speech_model}, ${features.join(', ') || 'none'}`);

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

// ============= POLL =============

export async function pollTranscription(
  transcriptId: string,
  apiKey: string,
  options?: {
    pollIntervalMs?: number;
    maxWaitMs?: number;
  },
): Promise<AssemblyAIFullResult> {
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
      const featureLog = [
        `chars=${data.text?.length ?? 0}`,
        `duration=${data.audio_duration}s`,
        `lang=${data.language_code}`,
        data.utterances?.length ? `utterances=${data.utterances.length}` : null,
        data.sentiment_analysis_results?.length ? `sentiments=${data.sentiment_analysis_results.length}` : null,
        data.entities?.length ? `entities=${data.entities.length}` : null,
        data.chapters?.length ? `chapters=${data.chapters.length}` : null,
        data.content_safety_labels?.results?.length ? `safety=${data.content_safety_labels.results.length}` : null,
      ].filter(Boolean).join(', ');
      
      console.log(`[AssemblyAI] Completed: ${featureLog}`);
      
      return {
        text: data.text ?? "",
        audio_duration: data.audio_duration ?? null,
        language_code: data.language_code ?? null,
        words: data.words ?? [],
        utterances: data.utterances ?? null,
        sentiment_analysis_results: data.sentiment_analysis_results ?? null,
        entities: data.entities ?? null,
        chapters: data.chapters ?? null,
        content_safety_labels: data.content_safety_labels ?? null,
      };
    }

    if (data.status === "error") {
      throw new Error(`assemblyai_transcription_error: ${data.error ?? "Unknown error"}`);
    }

    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  throw new Error(`ASSEMBLYAI_TIMEOUT: Transcription did not complete within ${Math.round(maxWaitMs / 1000)}s.`);
}

// ============= SINGLE STATUS CHECK (no polling loop) =============

/**
 * Check the status of an AssemblyAI transcription once (no loop).
 * Returns the full result if completed, or { status, id } if still processing.
 */
export async function checkTranscriptionOnce(
  transcriptId: string,
  apiKey: string,
): Promise<{ status: 'completed'; result: AssemblyAIFullResult } | { status: 'queued' | 'processing' | 'error'; id: string; error?: string }> {
  const response = await fetch(`${ASSEMBLYAI_API_URL}/transcript/${transcriptId}`, {
    headers: { Authorization: apiKey },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`assemblyai_check_error: ${response.status} - ${errorText.slice(0, 500)}`);
  }

  const data = await response.json();

  if (data.status === "completed") {
    return {
      status: 'completed',
      result: {
        text: data.text ?? "",
        audio_duration: data.audio_duration ?? null,
        language_code: data.language_code ?? null,
        words: data.words ?? [],
        utterances: data.utterances ?? null,
        sentiment_analysis_results: data.sentiment_analysis_results ?? null,
        entities: data.entities ?? null,
        chapters: data.chapters ?? null,
        content_safety_labels: data.content_safety_labels ?? null,
      },
    };
  }

  if (data.status === "error") {
    return { status: 'error', id: transcriptId, error: data.error ?? "Unknown AssemblyAI error" };
  }

  return { status: data.status as 'queued' | 'processing', id: transcriptId };
}

// ============= FULL PIPELINE =============

export async function transcribeWithAssemblyAI(
  audioData: Uint8Array | ArrayBuffer,
  apiKey: string,
  options?: AssemblyAITranscriptionOptions,
): Promise<AssemblyAIFullResult> {
  const sizeKB = (audioData instanceof ArrayBuffer ? audioData.byteLength : audioData.length) / 1024;
  console.log(`[AssemblyAI] Full pipeline: size=${sizeKB.toFixed(1)} KB`);

  const uploadUrl = await uploadToAssemblyAI(audioData, apiKey);
  const transcriptId = await startTranscription(uploadUrl, apiKey, options);
  return await pollTranscription(transcriptId, apiKey, {
    maxWaitMs: options?.maxWaitMs ?? 300_000,
    pollIntervalMs: options?.pollIntervalMs ?? 3000,
  });
}

// ============= URL PIPELINE =============

export async function transcribeFromUrl(
  audioUrl: string,
  apiKey: string,
  options?: AssemblyAITranscriptionOptions,
): Promise<AssemblyAIFullResult> {
  console.log(`[AssemblyAI] URL pipeline: ${audioUrl.slice(0, 60)}...`);

  const transcriptId = await startTranscription(audioUrl, apiKey, options);
  return await pollTranscription(transcriptId, apiKey, {
    maxWaitMs: options?.maxWaitMs ?? 300_000,
    pollIntervalMs: options?.pollIntervalMs ?? 3000,
  });
}

// ============= DEFAULT OPTIONS (all features enabled) =============

/**
 * Returns the standard set of AssemblyAI options with all features enabled.
 * Custom vocabulary can be appended per-workspace.
 */
export function getDefaultTranscriptionOptions(overrides?: Partial<AssemblyAITranscriptionOptions>): AssemblyAITranscriptionOptions {
  return {
    speech_model: "best",
    language_code: null, // auto-detect
    language_detection: true,
    speaker_labels: true,
    sentiment_analysis: true,
    entity_detection: true,
    auto_chapters: true,
    content_safety: true,
    multichannel: false, // Enable only when explicitly needed (stereo audio)
    word_boost: [],
    boost_param: "high",
    maxWaitMs: 300_000,
    pollIntervalMs: 3000,
    ...overrides,
  };
}
