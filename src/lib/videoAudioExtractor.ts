/**
 * Client-side audio extraction from video files using ffmpeg.wasm.
 *
 * ROI: a 1h HD video ≈ 1 GB; extracted Opus/M4A audio ≈ 30-50 MB.
 * Uploading audio instead of video divides Supabase Storage costs by ~20x
 * and removes the need for resumable uploads on most files.
 *
 * - Lazy-loaded (ffmpeg core ~30 MB) — only when a video is actually selected
 * - Single-threaded core: works without COOP/COEP headers (Lovable preview safe)
 * - Output: MP3 mono 16 kHz 64 kbps (AssemblyAI-optimal, smallest size)
 */

const VIDEO_MIME_PREFIX = "video/";
const VIDEO_EXTENSIONS = ["mp4", "mov", "webm", "mkv", "avi", "m4v", "3gp", "ogv"];

export function isVideoFile(file: File): boolean {
  if (file.type?.startsWith(VIDEO_MIME_PREFIX)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return !!ext && VIDEO_EXTENSIONS.includes(ext);
}

type Progress = (ratio: number) => void;

// Module-level singleton — keeps the wasm core loaded between extractions
let ffmpegPromise: Promise<any> | null = null;

async function getFFmpeg() {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { toBlobURL } = await import("@ffmpeg/util");
      const ffmpeg = new FFmpeg();
      // Single-threaded core (no SharedArrayBuffer required).
      // jsDelivr is primary (more reliable for large wasm than unpkg);
      // unpkg kept as fallback in case jsDelivr is unreachable.
      const CDN_BASES = [
        "https://cdn.jsdelivr.net/npm/@ffmpeg/[email protected]/dist/umd",
        "https://unpkg.com/@ffmpeg/[email protected]/dist/umd",
      ];
      const loadFromBase = async (baseURL: string) => {
        const [coreURL, wasmURL] = await Promise.all([
          toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
          toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
        ]);
        await ffmpeg.load({ coreURL, wasmURL });
      };
      let lastErr: unknown;
      for (const base of CDN_BASES) {
        try {
          await loadFromBase(base);
          return ffmpeg;
        } catch (err) {
          console.warn(`[ffmpeg] CDN failed (${base}), trying next`, err);
          lastErr = err;
        }
      }
      // Reset so a subsequent attempt can retry instead of caching the failure.
      ffmpegPromise = null;
      throw lastErr ?? new Error("ffmpeg-core: all CDNs unreachable");
    })();
  }
  return ffmpegPromise;
}

/**
 * Extract mono 16 kHz MP3 audio from a video file.
 * Returns a new File ready to upload to Storage.
 */
export async function extractAudioFromVideo(
  video: File,
  onProgress?: Progress,
): Promise<File> {
  const ffmpeg = await getFFmpeg();
  const { fetchFile } = await import("@ffmpeg/util");

  const ts = Date.now();
  const ext = video.name.split(".").pop()?.toLowerCase() || "mp4";
  const inputName = `in_${ts}.${ext}`;
  const baseName = video.name.replace(/\.[^.]+$/, "");

  const progressHandler = ({ progress }: { progress: number }) => {
    if (onProgress && progress >= 0 && progress <= 1) onProgress(progress);
  };
  ffmpeg.on("progress", progressHandler);

  const cleanup = async (name: string) => {
    try { await ffmpeg.deleteFile(name); } catch { /* noop */ }
  };

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(video));

    // ---- Fast path: stream-copy the audio track (no re-encode).
    // Most MP4/MOV/M4V contain AAC → remux to .m4a in ~1-2s even for 1h videos.
    // AssemblyAI accepts m4a/aac natively.
    const fastOut = `out_${ts}.m4a`;
    try {
      await ffmpeg.exec([
        "-i", inputName,
        "-vn",
        "-acodec", "copy",
        "-movflags", "+faststart",
        fastOut,
      ]);
      const data = await ffmpeg.readFile(fastOut);
      const buf = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
      if (buf.byteLength > 1024) {
        const audioBuffer = buf.slice().buffer;
        await cleanup(fastOut);
        return new File([audioBuffer], `${baseName}.m4a`, { type: "audio/mp4" });
      }
      await cleanup(fastOut);
    } catch (err) {
      console.warn("[ffmpeg] stream-copy failed, falling back to MP3 re-encode", err);
      await cleanup(fastOut);
    }

    // ---- Fallback: re-encode to MP3 mono 16 kHz (slower but universal).
    const slowOut = `out_${ts}.mp3`;
    await ffmpeg.exec([
      "-i", inputName,
      "-vn",
      "-ac", "1",
      "-ar", "16000",
      "-b:a", "64k",
      "-f", "mp3",
      slowOut,
    ]);
    const data = await ffmpeg.readFile(slowOut);
    const buf = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
    const audioBuffer = buf.slice().buffer;
    await cleanup(slowOut);
    return new File([audioBuffer], `${baseName}.mp3`, { type: "audio/mpeg" });
  } finally {
    ffmpeg.off("progress", progressHandler);
    await cleanup(inputName);
  }
}
