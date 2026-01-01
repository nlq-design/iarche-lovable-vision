# Fly.io Transcription Worker Setup

Ce document décrit comment déployer le worker Node.js sur Fly.io pour gérer les transcriptions audio > 25MB.

## Architecture

```
┌─────────────────┐     ┌─────────────────────────┐     ┌─────────────────┐
│  Frontend       │────>│  trigger-chunked-       │────>│  Fly.io Worker  │
│  (upload)       │     │  transcription (Edge)   │     │  (Node+FFmpeg)  │
└─────────────────┘     └─────────────────────────┘     └────────┬────────┘
                                                                  │
                        ┌─────────────────────────┐               │
                        │  chunked-transcription- │<──────────────┘
                        │  callback (Edge)        │
                        └─────────────────────────┘
```

## 1. Créer le projet Worker

```bash
mkdir iarche-transcription-worker
cd iarche-transcription-worker
npm init -y
```

## 2. Installer les dépendances

```bash
npm install express fluent-ffmpeg @supabase/supabase-js openai
npm install -D typescript @types/express @types/fluent-ffmpeg
```

## 3. Code du Worker

### `src/index.ts`

```typescript
import express from 'express';
import ffmpeg from 'fluent-ffmpeg';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const app = express();
app.use(express.json());

const WORKER_SECRET = process.env.FLY_WORKER_SECRET;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Middleware auth
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  
  const auth = req.headers.authorization;
  if (WORKER_SECRET && auth !== `Bearer ${WORKER_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', ffmpeg: true });
});

app.post('/transcribe', async (req, res) => {
  const { 
    transcription_id, 
    signed_url, 
    file_type, 
    original_filename,
    callback_url,
    supabase_url,
  } = req.body;

  // Acknowledge immediately
  res.json({ job_id: transcription_id, status: 'processing' });

  // Process async
  processTranscription({
    transcription_id,
    signed_url,
    file_type,
    original_filename,
    callback_url,
    supabase_url,
  }).catch(console.error);
});

interface TranscriptionJob {
  transcription_id: string;
  signed_url: string;
  file_type: string;
  original_filename: string;
  callback_url: string;
  supabase_url: string;
}

async function processTranscription(job: TranscriptionJob) {
  const startTime = Date.now();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'transcribe-'));
  const inputFile = path.join(tempDir, `input.${job.file_type || 'mp3'}`);
  const chunksDir = path.join(tempDir, 'chunks');
  
  try {
    await fs.mkdir(chunksDir);
    
    console.log(`[${job.transcription_id}] Downloading file...`);
    
    // Download file
    const response = await fetch(job.signed_url);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(inputFile, buffer);
    
    console.log(`[${job.transcription_id}] File downloaded: ${buffer.length} bytes`);
    
    // Get duration
    const duration = await getAudioDuration(inputFile);
    console.log(`[${job.transcription_id}] Duration: ${duration}s`);
    
    // Split into chunks (10 min each, ~20MB target)
    const chunkDuration = 600; // 10 minutes
    const chunks = await splitAudio(inputFile, chunksDir, chunkDuration);
    console.log(`[${job.transcription_id}] Split into ${chunks.length} chunks`);
    
    // Transcribe each chunk
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const transcripts: { index: number; text: string; start: number; end: number }[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`[${job.transcription_id}] Transcribing chunk ${i + 1}/${chunks.length}...`);
      
      const chunkBuffer = await fs.readFile(chunks[i].path);
      const file = new File([chunkBuffer], `chunk_${i}.mp3`, { type: 'audio/mpeg' });
      
      const result = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        response_format: 'text',
      });
      
      transcripts.push({
        index: i,
        text: result,
        start: i * chunkDuration,
        end: Math.min((i + 1) * chunkDuration, duration),
      });
    }
    
    // Merge transcripts
    const fullText = transcripts
      .sort((a, b) => a.index - b.index)
      .map(t => t.text)
      .join('\n\n');
    
    console.log(`[${job.transcription_id}] Transcription complete, ${fullText.length} chars`);
    
    // Callback success
    await sendCallback(job.callback_url, {
      transcription_id: job.transcription_id,
      status: 'completed',
      transcript_text: fullText,
      chunks_info: transcripts.map(t => ({
        index: t.index,
        start: t.start,
        end: t.end,
        length: t.text.length,
      })),
      processing_time_ms: Date.now() - startTime,
      total_duration_seconds: duration,
    });
    
  } catch (error) {
    console.error(`[${job.transcription_id}] Error:`, error);
    
    await sendCallback(job.callback_url, {
      transcription_id: job.transcription_id,
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      processing_time_ms: Date.now() - startTime,
    });
    
  } finally {
    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
}

async function splitAudio(
  inputFile: string, 
  outputDir: string, 
  chunkDuration: number
): Promise<{ path: string; index: number }[]> {
  return new Promise((resolve, reject) => {
    const chunks: { path: string; index: number }[] = [];
    let index = 0;
    
    ffmpeg(inputFile)
      .audioCodec('libmp3lame')
      .audioBitrate('64k')
      .audioChannels(1)
      .audioFrequency(16000)
      .outputOptions([
        `-f segment`,
        `-segment_time ${chunkDuration}`,
        `-reset_timestamps 1`,
      ])
      .output(path.join(outputDir, 'chunk_%03d.mp3'))
      .on('end', async () => {
        const files = await fs.readdir(outputDir);
        files.sort().forEach((f, i) => {
          chunks.push({ path: path.join(outputDir, f), index: i });
        });
        resolve(chunks);
      })
      .on('error', reject)
      .run();
  });
}

async function sendCallback(url: string, data: Record<string, unknown>) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WORKER_SECRET}`,
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      console.error('Callback failed:', response.status, await response.text());
    }
  } catch (error) {
    console.error('Callback error:', error);
  }
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Worker listening on port ${PORT}`);
});
```

## 4. Dockerfile

```dockerfile
FROM node:20-slim

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 8080

CMD ["node", "dist/index.js"]
```

## 5. fly.toml

```toml
app = "iarche-transcription-worker"
primary_region = "cdg"  # Paris

[build]

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[env]
  NODE_ENV = "production"

[[vm]]
  cpu_kind = "shared"
  cpus = 2
  memory_mb = 1024
```

## 6. Déploiement

```bash
# Login Fly.io
fly auth login

# Créer l'app
fly apps create iarche-transcription-worker

# Configurer les secrets
fly secrets set OPENAI_API_KEY="sk-..."
fly secrets set SUPABASE_SERVICE_ROLE_KEY="eyJ..."
fly secrets set FLY_WORKER_SECRET="your-shared-secret"

# Déployer
fly deploy
```

## 7. Configuration Supabase

Ajouter ces secrets dans Supabase :

```
FLY_WORKER_URL = https://iarche-transcription-worker.fly.dev
FLY_WORKER_SECRET = your-shared-secret (même valeur que Fly)
```

## 8. Test

```bash
curl -X POST https://iarche-transcription-worker.fly.dev/health
# {"status":"ok","ffmpeg":true}
```

## Coûts estimés

- **Fly.io** : ~$5-10/mois pour usage modéré (auto-scale à 0)
- **Whisper API** : $0.006/minute d'audio
- Exemple : 1h d'audio = ~$0.36

## Monitoring

```bash
fly logs -a iarche-transcription-worker
fly status -a iarche-transcription-worker
```
