/**
 * Shared Whisper transcription utilities
 * Used by: process-voice-transcription, transcribe-audio-chunk
 */

const WHISPER_API_URL = "https://api.openai.com/v1/audio/transcriptions";

/**
 * Get file extension from MIME type for Whisper API
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "m4a",
    "audio/m4a": "m4a",
    "audio/x-m4a": "m4a",
    "audio/aac": "m4a",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/wave": "wav",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/flac": "flac",
    "audio/x-flac": "flac",
    "video/mp4": "mp4",
    "video/webm": "webm",
  };

  return mimeToExt[mimeType.toLowerCase()] || "mp3";
}

/**
 * Detect audio format from magic bytes
 */
export function detectAudioFormatFromMagic(bytes: Uint8Array): { mime: string; ext: string } | null {
  const startsWithAscii = (ascii: string) => {
    if (bytes.length < ascii.length) return false;
    for (let i = 0; i < ascii.length; i++) {
      if (bytes[i] !== ascii.charCodeAt(i)) return false;
    }
    return true;
  };

  const matchAsciiAt = (offset: number, ascii: string) => {
    if (bytes.length < offset + ascii.length) return false;
    for (let i = 0; i < ascii.length; i++) {
      if (bytes[offset + i] !== ascii.charCodeAt(i)) return false;
    }
    return true;
  };

  // OGG container (often Opus-in-OGG for Telegram voice notes)
  if (startsWithAscii("OggS")) return { mime: "audio/ogg", ext: "ogg" };

  // WAV (RIFF....WAVE)
  if (startsWithAscii("RIFF") && matchAsciiAt(8, "WAVE")) return { mime: "audio/wav", ext: "wav" };

  // FLAC
  if (startsWithAscii("fLaC")) return { mime: "audio/flac", ext: "flac" };

  // WebM / Matroska
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { mime: "audio/webm", ext: "webm" };
  }

  // MP3 (ID3 tag or frame sync)
  if (startsWithAscii("ID3") || (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) {
    return { mime: "audio/mpeg", ext: "mp3" };
  }

  // MP4/M4A family: ....ftyp
  if (matchAsciiAt(4, "ftyp")) {
    return { mime: "audio/mp4", ext: "mp4" };
  }

  return null;
}

/**
 * Transcribe audio using Whisper API with blob input
 */
export async function transcribeWithWhisperBlob(
  audioBlob: Blob,
  openaiApiKey: string,
  options?: {
    language?: string;
    timeoutMs?: number;
  }
): Promise<string> {
  const { language = "fr", timeoutMs = 90000 } = options || {};

  const ext = getExtensionFromMimeType(audioBlob.type);
  const fileName = `audio.${ext}`;
  console.log(`[Whisper] Blob transcription: ${fileName}, size=${(audioBlob.size / 1024).toFixed(1)} KB, timeout=${Math.round(timeoutMs / 1000)}s`);

  const formData = new FormData();
  formData.append("file", audioBlob, fileName);
  formData.append("model", "whisper-1");
  formData.append("language", language);
  formData.append("response_format", "text");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);

  try {
    let response: Response;
    try {
      response = await fetch(WHISPER_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiApiKey}`,
        },
        body: formData,
        signal: controller.signal,
      });
    } catch (e) {
      const msg = String((e as Error)?.message ?? e);
      if (msg.includes("timeout") || msg.includes("abort")) {
        throw new Error(`WHISPER_TIMEOUT: Transcription took too long (>${Math.round(timeoutMs / 1000)}s).`);
      }
      throw e;
    }

    if (response.status === 413) {
      throw new Error("WHISPER_MAX_SIZE: File exceeds Whisper API limit (25MB). Chunking or compression required.");
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`whisper_api_error: ${response.status} - ${errorText.slice(0, 500)}`);
    }

    return (await response.text()).trim();
  } finally {
    clearTimeout(timeout);
  }
}
