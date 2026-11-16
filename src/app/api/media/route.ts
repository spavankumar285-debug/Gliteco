import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

export const maxDuration = 60;

type MediaType = 'image' | 'video';

type MediaRequest = {
  prompt?: unknown;
  type?: unknown;
  referenceImage?: unknown;
};

type Size = { width: number; height: number };

const MODEL = '@cf/black-forest-labs/flux-2-klein-9b';
const TEXT_MODEL = '@cf/meta/llama-3.1-8b-instruct';

const MAX_PROMPT_LENGTH = 2000;
const MAX_REFERENCE_LENGTH = 15_000_000;
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
// FLUX.2 Klein needs reference images below 512x512.
const REFERENCE_LIMIT = 511;

const IMAGE_SIZE: Size = { width: 1024, height: 1024 };
const VIDEO_FRAME_SIZE: Size = { width: 1024, height: 576 }; // 16:9, no padding bars

function errorResponse(message: string, status: number, code?: string) {
  return NextResponse.json(
    { error: message, ...(code ? { code } : {}) },
    { status }
  );
}

function isTimeout(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'TimeoutError' || error.name === 'AbortError')
  );
}

function safeErrorMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  return 'Media generation failed.';
}

// --------------------------------------------------
// PROMPT UNDERSTANDING
// Rewrites the user's request (any language, typos, slang)
// into one clear English prompt. Falls back to the original.
// --------------------------------------------------

async function enhancePrompt(
  accountId: string,
  apiToken: string,
  userPrompt: string,
  hasReference: boolean,
  kind: MediaType
): Promise<string> {
  if (!userPrompt) return userPrompt;

  const system = [
    'You rewrite a user request into ONE clear English prompt for an AI image generator.',
    'Fix spelling, translate to English, and keep EVERY subject, place, clothing item, color, object and action the user mentioned.',
    'Never add new people or change the requested place.',
    'Be concrete and visual, 30 to 60 words, in plain descriptive sentences.',
    hasReference
      ? 'A photo of the person is provided separately. Do NOT describe their face. Say "the person" and describe only the requested scene, clothing, pose and place.'
      : '',
    kind === 'video'
      ? 'The result will be used for a short cinematic video, so describe one strong visual scene with motion-friendly framing.'
      : '',
    'Output only the final prompt, no quotes, no explanation.',
  ]
    .filter(Boolean)
    .join(' ');

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${TEXT_MODEL}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 200,
        }),
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) return userPrompt;

    const data = await response.json().catch(() => null);
    const text = data?.result?.response;

    if (typeof text === 'string') {
      const cleaned = text.trim().replace(/^["']|["']$/g, '');
      if (cleaned.length >= 10 && cleaned.length <= 800) return cleaned;
    }
  } catch (error) {
    console.warn('Prompt enhancement skipped:', error);
  }

  return userPrompt;
}

// --------------------------------------------------
// REFERENCE IMAGE PROCESSING
// --------------------------------------------------

async function prepareReferenceImage(value: unknown): Promise<Buffer> {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Please upload a valid reference photo.');
  }

  const input = value.trim();

  if (input.length > MAX_REFERENCE_LENGTH) {
    throw new Error(
      'Reference photo is too large. Please upload a smaller image.'
    );
  }

  let base64 = input;

  if (input.startsWith('data:')) {
    const match = input.match(
      /^data:image\/(?:jpeg|jpg|png|webp|gif|tiff|avif);base64,([\s\S]+)$/i
    );

    if (!match) {
      throw new Error('Unsupported photo format. Use JPG, PNG or WebP.');
    }

    base64 = match[1];
  } else if (/^https?:\/\//i.test(input)) {
    throw new Error(
      'Please upload the photo as image data, not a remote URL.'
    );
  }

  base64 = base64.replace(/\s/g, '');

  if (
    !base64 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(base64) ||
    base64.length % 4 === 1
  ) {
    throw new Error('Invalid reference image data.');
  }

  const source = Buffer.from(base64, 'base64');

  if (!source.length || source.length > MAX_INPUT_BYTES) {
    throw new Error('Invalid image size. Please upload a smaller photo.');
  }

  try {
    const metadata = await sharp(source, {
      limitInputPixels: 40_000_000,
      failOn: 'error',
    }).metadata();

    const supportedFormats = ['jpeg', 'png', 'webp', 'gif', 'tiff', 'avif'];

    if (
      !metadata.width ||
      !metadata.height ||
      !supportedFormats.includes(metadata.format || '')
    ) {
      throw new Error('Unsupported image format.');
    }

    return await sharp(source, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({
        width: REFERENCE_LIMIT,
        height: REFERENCE_LIMIT,
        fit: 'inside',
        withoutEnlargement: true,
        kernel: 'lanczos3',
      })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 95, mozjpeg: true })
      .toBuffer();
  } catch (error) {
    if (error instanceof Error && error.message === 'Unsupported image format.') {
      throw error;
    }

    console.error('Reference processing error:', error);

    throw new Error(
      'Unable to process the uploaded photo. Please try another image.'
    );
  }
}

// --------------------------------------------------
// PROMPT BUILDING
// FLUX has no negative prompt: long "No ..." lists can
// actually add those things. Keep it short and positive.
// --------------------------------------------------

function buildImagePrompt(userPrompt: string, hasReference: boolean): string {
  const requested =
    userPrompt || 'a beautiful professional cinematic portrait';

  if (!hasReference) {
    return `${requested}. Photorealistic, natural lighting, realistic textures, sharp detail, well-composed.`;
  }

  return [
    'Edit this photo of the person.',
    'Keep the exact same person: identical face, facial features, skin tone and apparent age.',
    `Apply this change: ${requested}.`,
    'Keep everything the request does not mention (clothing, hairstyle, pose) unchanged.',
    'Photorealistic, natural lighting, realistic shadows, sharp detail, natural hands.',
  ].join(' ');
}

// --------------------------------------------------
// CLOUDFLARE IMAGE GENERATION
// --------------------------------------------------

async function runFlux(
  accountId: string,
  apiToken: string,
  prompt: string,
  size: Size,
  referenceImage?: Buffer
): Promise<Response> {
  const form = new FormData();

  form.append('prompt', prompt);
  form.append('width', String(size.width));
  form.append('height', String(size.height));

  if (referenceImage) {
    const imageBlob = new Blob([new Uint8Array(referenceImage)], {
      type: 'image/jpeg',
    });
    form.append('input_image_0', imageBlob, 'reference.jpg');
  }

  return fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}` },
      body: form,
      signal: AbortSignal.timeout(45000),
    }
  );
}

async function runFluxWithRetry(
  accountId: string,
  apiToken: string,
  prompt: string,
  size: Size,
  referenceImage?: Buffer
): Promise<Response> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await runFlux(
      accountId,
      apiToken,
      prompt,
      size,
      referenceImage
    );

    if (response.ok) return response;

    const errorText = await response.clone().text();

    const isDailyQuotaError =
      response.status === 429 && errorText.includes('4006');

    const transientFailure =
      !isDailyQuotaError &&
      ([429, 500, 502, 503, 504].includes(response.status) ||
        errorText.includes('"code":3043'));

    if (!transientFailure || attempt === maxAttempts) return response;

    console.warn(
      `Cloudflare temporary failure. Retry ${attempt}/${maxAttempts - 1}`,
      response.status,
      errorText.slice(0, 200)
    );

    await new Promise((resolve) => setTimeout(resolve, attempt * 800));
  }

  throw new Error('Cloudflare retry limit reached.');
}

// --------------------------------------------------
// OUTPUT VALIDATION
// --------------------------------------------------

async function normalizeGeneratedImage(image: string): Promise<string> {
  let base64 = image;

  if (image.startsWith('data:')) {
    const match = image.match(
      /^data:image\/(?:jpeg|jpg|png|webp);base64,([\s\S]+)$/i
    );

    if (!match) {
      throw new Error('Image provider returned an unsupported image format.');
    }

    base64 = match[1];
  }

  base64 = base64.replace(/\s/g, '');

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    throw new Error('Image provider returned invalid image data.');
  }

  const buffer = Buffer.from(base64, 'base64');

  if (!buffer.length || buffer.length > 20 * 1024 * 1024) {
    throw new Error('Generated image is empty or too large.');
  }

  try {
    const metadata = await sharp(buffer, {
      limitInputPixels: 40_000_000,
      failOn: 'error',
    }).metadata();

    if (
      !metadata.width ||
      !metadata.height ||
      !['jpeg', 'png', 'webp'].includes(metadata.format || '')
    ) {
      throw new Error('Invalid generated image format.');
    }

    const output = await sharp(buffer)
      .rotate()
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 94, mozjpeg: true })
      .toBuffer();

    return `data:image/jpeg;base64,${output.toString('base64')}`;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Invalid generated image format.'
    ) {
      throw error;
    }

    throw new Error(
      'Generated image could not be validated. Please try again.'
    );
  }
}

async function generateOpenRouterImage(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OpenRouter API key is missing.');
  }

  const response = await fetch('https://openrouter.ai/api/v1/images', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'recraft/recraft-v4.1-flash-v2:free',
      prompt,
    }),
    signal: AbortSignal.timeout(45000),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `OpenRouter error (${response.status}): ${JSON.stringify(data).slice(0, 300)}`
    );
  }

  const image = data?.data?.[0]?.b64_json;

  if (typeof image !== 'string' || !image) {
    throw new Error('OpenRouter returned no valid image.');
  }

  return normalizeGeneratedImage(image);
}

async function generateCloudflareImage(
  accountId: string,
  apiToken: string,
  prompt: string,
  size: Size,
  referenceImage?: Buffer
): Promise<string> {
  const primaryPrompt = buildImagePrompt(prompt, Boolean(referenceImage));

  let response = await runFluxWithRetry(
    accountId,
    apiToken,
    primaryPrompt,
    size,
    referenceImage
  );

  if (!response.ok) {
    const errorText = await response.text();

    if (
      response.status === 429 &&
      errorText.includes('4006') &&
      !referenceImage
    ) {
      console.warn('Cloudflare daily quota exhausted. Switching to OpenRouter.');
      return await generateOpenRouterImage(primaryPrompt);
    }

    const isSafetyError =
      errorText.includes('8007') || errorText.toLowerCase().includes('nsfw');

    if (!isSafetyError) {
      console.error(
        'Cloudflare generation error:',
        response.status,
        errorText.slice(0, 500)
      );

      throw new Error(
        `Cloudflare AI error (${response.status}): ${errorText.slice(0, 300)}`
      );
    }

    response = await runFluxWithRetry(
      accountId,
      apiToken,
      `Safe, family-friendly, fully clothed editorial image. ${primaryPrompt}`,
      size,
      referenceImage
    );

    if (!response.ok) {
      const retryText = await response.text();
      throw new Error(
        `Cloudflare AI retry failed (${response.status}): ${retryText.slice(0, 300)}`
      );
    }
  }

  const data = await response.json().catch(() => null);

  if (data?.success === false) {
    throw new Error(
      data?.errors?.[0]?.message || 'Cloudflare image generation failed.'
    );
  }

  const image = data?.result?.image;

  if (typeof image !== 'string' || !image) {
    console.error(
      'Unexpected Cloudflare response:',
      JSON.stringify(data).slice(0, 1000)
    );
    throw new Error('Cloudflare returned no valid image.');
  }

  return normalizeGeneratedImage(image);
}

// --------------------------------------------------
// VIDEO: frames -> smooth cinematic clip
//
// Fixes vs. the old version:
//  - old code looped each image for 3s AND ran zoompan with d=75,
//    so ffmpeg rendered ~75x too many frames (very slow, huge file).
//    Each image is now a single input frame; zoompan makes the 75 frames.
//  - images are upscaled first so the zoom is smooth, not jittery
//  - alternating zoom-in / zoom-out and crossfades between scenes
// --------------------------------------------------

const CLIP_SECONDS = 3;
const FADE_SECONDS = 0.6;
const FPS = 25;

async function createVideoFromFrames(
  frames: { url: string; caption: string }[]
): Promise<Buffer> {
  const binary = ffmpegPath;

  if (!binary) throw new Error('FFmpeg binary not found.');
  if (frames.length < 2) throw new Error('At least two frames are required.');

  const dir = await mkdtemp(path.join(tmpdir(), 'gliteco-video-'));

  try {
    const inputPaths: string[] = [];

    for (let i = 0; i < frames.length; i++) {
      const base64 = frames[i].url.replace(/^data:image\/jpeg;base64,/, '');
      const imagePath = path.join(dir, `frame-${i}.jpg`);
      await writeFile(imagePath, Buffer.from(base64, 'base64'));
      inputPaths.push(imagePath);
    }

    const outputPath = path.join(dir, 'gliteco-video.mp4');
    const args: string[] = [];

    for (const input of inputPaths) {
      args.push('-i', input);
    }

    const frameCount = CLIP_SECONDS * FPS;

    const filters = inputPaths.map((_, i) => {
      const zoomExpr =
        i % 2 === 0
          ? `'min(zoom+0.0012,1.15)'`
          : `'if(eq(on,0),1.15,max(zoom-0.0012,1.0))'`;

      return (
        `[${i}:v]scale=1920:1080:force_original_aspect_ratio=increase,` +
        `crop=1920:1080,` +
        `zoompan=z=${zoomExpr}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'` +
        `:d=${frameCount}:s=1280x720:fps=${FPS},` +
        `format=yuv420p,setsar=1[v${i}]`
      );
    });

    // Chain crossfades between the clips.
    let last = 'v0';
    for (let i = 1; i < inputPaths.length; i++) {
      const offset = ((CLIP_SECONDS - FADE_SECONDS) * i).toFixed(2);
      const out = i === inputPaths.length - 1 ? 'outv' : `x${i}`;
      filters.push(
        `[${last}][v${i}]xfade=transition=fade:duration=${FADE_SECONDS}:offset=${offset}[${out}]`
      );
      last = out;
    }

    args.push(
      '-filter_complex', filters.join(';'),
      '-map', '[outv]',
      '-an',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-y', outputPath
    );

    await new Promise<void>((resolve, reject) => {
      const child = spawn(binary, args, {
        stdio: ['ignore', 'ignore', 'pipe'],
      });

      let stderr = '';

      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on('error', reject);

      child.on('close', (code: number | null) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg failed: ${stderr.slice(-1200)}`));
      });
    });

    return await readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// --------------------------------------------------
// SERVER-SIDE SAFETY LIMITS (protects your Cloudflare quota)
// Kept in memory: works on a single running server and resets when it
// restarts. For real enforcement later, store this in a database.
// --------------------------------------------------

const IP_DAILY_POINTS = 12;      // per IP per day (page limit is 6 per browser)
const GLOBAL_DAILY_POINTS = 150; // whole app per day, a hard stop for your costs

const usage = new Map<string, number>();
let globalDay = '';
let globalPoints = 0;

function checkAndCount(ip: string, cost: number): string | null {
  const day = new Date().toISOString().slice(0, 10);

  if (day !== globalDay) {
    globalDay = day;
    globalPoints = 0;
    usage.clear();
  }

  if (globalPoints + cost > GLOBAL_DAILY_POINTS) {
    return 'We have reached today\'s free limit. Please come back tomorrow.';
  }

  const used = usage.get(ip) || 0;
  if (used + cost > IP_DAILY_POINTS) {
    return 'You have used all your free tries for today. Please come back tomorrow.';
  }

  usage.set(ip, used + cost);
  globalPoints += cost;
  return null;
}

// --------------------------------------------------
// API ENDPOINT
// --------------------------------------------------

export async function POST(req: Request) {
  try {
    let body: MediaRequest;

    try {
      body = await req.json();
    } catch {
      return errorResponse('Invalid JSON request.', 400, 'INVALID_REQUEST');
    }

    if (!body || typeof body !== 'object') {
      return errorResponse('Invalid request body.', 400);
    }

    const rawPrompt =
      typeof body.prompt === 'string' ? body.prompt.trim() : '';

    const type: MediaType =
      body.type === undefined ? 'image' : (body.type as MediaType);

    if (type !== 'image' && type !== 'video') {
      return errorResponse(
        'Unsupported media type. Use image or video.',
        400,
        'INVALID_MEDIA_TYPE'
      );
    }

    if (rawPrompt.length > MAX_PROMPT_LENGTH) {
      return errorResponse(
        'Prompt is too long. Maximum length is 2000 characters.',
        400,
        'PROMPT_TOO_LONG'
      );
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      return errorResponse(
        'Cloudflare configuration is missing. Please check server environment variables.',
        500,
        'MISSING_CONFIGURATION'
      );
    }

    let referenceImage: Buffer | undefined;

    if (
      body.referenceImage !== undefined &&
      body.referenceImage !== null &&
      body.referenceImage !== ''
    ) {
      try {
        referenceImage = await prepareReferenceImage(body.referenceImage);
      } catch (error) {
        return errorResponse(
          safeErrorMessage(error),
          400,
          'INVALID_REFERENCE_IMAGE'
        );
      }
    }

    const forwarded = req.headers.get('x-forwarded-for') || '';
    const ip = forwarded.split(',')[0].trim() || 'local';
    const limitMessage = checkAndCount(ip, type === 'video' ? 3 : 1);

    if (limitMessage) {
      return errorResponse(limitMessage, 429, 'DAILY_LIMIT');
    }

    // Understand the request ONCE (not once per video frame).
    const prompt = await enhancePrompt(
      accountId,
      apiToken,
      rawPrompt,
      Boolean(referenceImage),
      type
    );

    // ----------------------------------------------
    // VIDEO
    // ----------------------------------------------

    if (type === 'video') {
      // Camera framing only. We no longer force "golden hour" or "sunset"
      // because that overrode what the user actually asked for.
      const scenes = [
        { suffix: 'wide establishing shot', caption: 'Scene 1 - Establishing Shot' },
        { suffix: 'medium shot, dynamic camera angle', caption: 'Scene 2 - Dynamic Motion' },
        { suffix: 'close-up shot, shallow depth of field', caption: 'Scene 3 - Close-Up Focus' },
      ];

      const base = prompt || 'A cinematic visual story';

      const frames = await Promise.all(
        scenes.map(async (scene) => {
          const url = await generateCloudflareImage(
            accountId,
            apiToken,
            `${base}, ${scene.suffix}`,
            VIDEO_FRAME_SIZE,
            referenceImage
          );
          return { url, caption: scene.caption };
        })
      );

      const videoBuffer = await createVideoFromFrames(frames);

      return new NextResponse(new Uint8Array(videoBuffer), {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Disposition': 'inline; filename="gliteco-video.mp4"',
          'Cache-Control': 'no-store',
        },
      });
    }

    // ----------------------------------------------
    // SINGLE IMAGE / REFERENCE EDITING
    // ----------------------------------------------

    const url = await generateCloudflareImage(
      accountId,
      apiToken,
      prompt,
      IMAGE_SIZE,
      referenceImage
    );

    return NextResponse.json({
      url,
      model: MODEL,
      referenceEditing: Boolean(referenceImage),
    });
  } catch (error: unknown) {
    console.error('Gliteco Media API Error:', error);

    const timeout = isTimeout(error);

    const message = safeErrorMessage(error);
    const quotaHit = message.includes('4006') || message.includes('429');

    return errorResponse(
      timeout
        ? 'This is taking too long. Please try again in a minute.'
        : quotaHit
        ? 'Our AI is very busy right now. Please try again a little later.'
        : 'Something went wrong. Please try again.',
      timeout ? 504 : quotaHit ? 429 : 502,
      timeout
        ? 'GENERATION_TIMEOUT'
        : quotaHit
        ? 'SERVICE_BUSY'
        : 'MEDIA_GENERATION_FAILED'
    );
  }
}
