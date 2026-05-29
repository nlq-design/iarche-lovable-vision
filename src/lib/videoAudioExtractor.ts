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
      // Single-threaded core (no SharedArrayBuffer required)
      const baseURL = "https://unpkg.com/@ffmpeg/[email protected]/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ffmpeg;
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

  const inputName = `in_${Date.now()}.${video.name.split(".").pop() || "mp4"}`;
  const outputName = `out_${Date.now()}.mp3`;

  const progressHandler = ({ progress }: { progress: number }) => {
    if (onProgress && progress >= 0 && progress <= 1) onProgress(progress);
  };
  ffmpeg.on("progress", progressHandler);

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(video));
    // -vn: no video, -ac 1: mono, -ar 16000: 16 kHz, -b:a 64k: 64 kbps
    // AssemblyAI is optimal at 16 kHz mono; lower rates hurt diarization.
    await ffmpeg.exec([
      "-i", inputName,
      "-vn",
      "-ac", "1",
      "-ar", "16000",
      "-b:a", "64k",
      "-f", "mp3",
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    const buffer = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer);
    // Copy into a fresh ArrayBuffer to satisfy the Blob/File constructor signature
    const audioBuffer = buffer.slice().buffer;
    const baseName = video.name.replace(/\.[^.]+$/, "");
    return new File([audioBuffer], `${baseName}.mp3`, { type: "audio/mpeg" });
  } finally {
    ffmpeg.off("progress", progressHandler);
    // Best-effort cleanup — ignore errors if files were never written
    try { await ffmpeg.deleteFile(inputName); } catch { /* noop */ }
    try { await ffmpeg.deleteFile(outputName); } catch { /* noop */ }
  }
}
