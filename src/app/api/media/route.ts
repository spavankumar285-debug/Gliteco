
import { NextResponse } from 'next/server';
import sharp from 'sharp';

export const maxDuration = 60;

type MediaType = 'image' | 'video';

type MediaRequest = {
  prompt?: unknown;
  type?: unknown;
  referenceImage?: unknown;
};

const MODEL = '@cf/black-forest-labs/flux-2-klein-9b';

const MAX_PROMPT_LENGTH = 2000;
const MAX_REFERENCE_LENGTH = 15_000_000;
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const REFERENCE_LIMIT = 511;

function errorResponse(
  message: string,
  status: number,
  code?: string
) {
  return NextResponse.json(
    { error: message, ...(code ? { code } : {}) },
    { status }
  );
}

function isTimeout(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'TimeoutError' ||
      error.name === 'AbortError')
  );
}

function safeErrorMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  return 'Media generation failed.';
}

// --------------------------------------------------
// REFERENCE IMAGE PROCESSING
// --------------------------------------------------

async function prepareReferenceImage(
  value: unknown
): Promise<Buffer> {
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
      throw new Error(
        'Unsupported photo format. Use JPG, PNG or WebP.'
      );
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

  if (
    !source.length ||
    source.length > MAX_INPUT_BYTES
  ) {
    throw new Error(
      'Invalid image size. Please upload a smaller photo.'
    );
  }

  try {
    const metadata = await sharp(source, {
      limitInputPixels: 40_000_000,
      failOn: 'error',
    }).metadata();

    const supportedFormats = [
      'jpeg',
      'png',
      'webp',
      'gif',
      'tiff',
      'avif',
    ];

    if (
      !metadata.width ||
      !metadata.height ||
      !supportedFormats.includes(metadata.format || '')
    ) {
      throw new Error('Unsupported image format.');
    }

    // FLUX.2 Klein requires input images below 512x512.
    // Keep the original aspect ratio.
    return await sharp(source, {
      limitInputPixels: 40_000_000,
    })
      .rotate()
      .resize({
        width: REFERENCE_LIMIT,
        height: REFERENCE_LIMIT,
        fit: 'inside',
        withoutEnlargement: true,
        kernel: 'lanczos3',
      })
      .flatten({ background: '#ffffff' })
      .jpeg({
        quality: 94,
        mozjpeg: true,
      })
      .toBuffer();

  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Unsupported image format.'
    ) {
      throw error;
    }

    console.error('Reference processing error:', error);

    throw new Error(
      'Unable to process the uploaded photo. Please try another image.'
    );
  }
}

// --------------------------------------------------
// REFERENCE EDITING INSTRUCTIONS
// --------------------------------------------------

function buildImagePrompt(
  userPrompt: string,
  hasReference: boolean
): string {
  const requestedPrompt =
    userPrompt ||
    'Create a beautiful professional cinematic portrait.';

  if (!hasReference) {
    return [
      'Create a professional, high-quality photorealistic image.',
      requestedPrompt,
      'Natural lighting, realistic textures, detailed composition.',
      'Family-friendly editorial photography.',
    ].join(' ');
  }

  return `
REFERENCE IMAGE EDITING — GLITECO AI

Use input_image_0 as the primary reference.

IDENTITY PRESERVATION:
- Keep the same recognizable person from the reference.
- Preserve facial identity as closely as possible.
- Maintain the original facial structure and proportions.
- Preserve recognizable eyes, nose, lips, jawline and facial characteristics.
- Maintain the original apparent age and natural skin tone.
- Do not invent a different person.
- Do not unnecessarily beautify, reshape or distort the face.

APPEARANCE CONTROL:
- Follow the user's explicitly requested changes.
- If clothing is not mentioned, retain the original clothing.
- If hairstyle is not mentioned, retain the original hairstyle.
- If pose is not mentioned, retain the original pose.
- If accessories are not mentioned, retain recognizable original accessories.
- Do not change unrelated visual details.

COMPOSITION:
- Maintain the original person's recognizable appearance.
- Preserve realistic body proportions and anatomy.
- Avoid distorted hands, fingers, eyes and facial features.
- Keep natural lighting and realistic shadows.
- Maintain visual consistency between the person and environment.

EDITING REQUEST:
${requestedPrompt}

QUALITY CONTROL:
- Professional photorealistic photography.
- Detailed textures and natural colors.
- Clean image composition.
- No artificial borders.
- No unintended black patches.
- No random blurred regions.
- No duplicated body parts.
- No distorted facial features.
- No unwanted visual artifacts.

Generate the requested edited image using the reference as guidance.
Do not replace the reference person with an unrelated person.
`.trim();
}

// --------------------------------------------------
// CLOUDFLARE IMAGE GENERATION
// --------------------------------------------------

async function runFlux(
  accountId: string,
  apiToken: string,
  prompt: string,
  referenceImage?: Buffer
): Promise<Response> {
  const form = new FormData();

  form.append('prompt', prompt);
  form.append('width', '1024');
  form.append('height', '1024');

  if (referenceImage) {
    const imageBlob = new Blob(
      [new Uint8Array(referenceImage)],
      { type: 'image/jpeg' }
    );

    form.append(
      'input_image_0',
      imageBlob,
      'reference.jpg'
    );
  }

  return fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      body: form,
      signal: AbortSignal.timeout(50000),
    }
  );
}

// --------------------------------------------------
// OUTPUT VALIDATION
// --------------------------------------------------

async function normalizeGeneratedImage(
  image: string
): Promise<string> {
  let base64 = image;

  if (image.startsWith('data:')) {
    const match = image.match(
      /^data:image\/(?:jpeg|jpg|png|webp);base64,([\s\S]+)$/i
    );

    if (!match) {
      throw new Error('Cloudflare returned an unsupported image format.');
    }

    base64 = match[1];
  }

  base64 = base64.replace(/\s/g, '');

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    throw new Error('Cloudflare returned invalid image data.');
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

    // Normalize output to a clean JPEG.
    const output = await sharp(buffer)
      .rotate()
      .flatten({ background: '#ffffff' })
      .jpeg({
        quality: 94,
        mozjpeg: true,
      })
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
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

// --------------------------------------------------
// GENERATION ENGINE
// --------------------------------------------------
async function createVideoFromFrames(
  frames: { url: string; caption: string }[]
): Promise<Buffer> {
  const binary = ffmpegPath;

  if (!binary) {
    throw new Error('FFmpeg binary not found.');
  }

  if (frames.length < 2) {
    throw new Error('At least two frames are required.');
  }

  const dir = await mkdtemp(path.join(tmpdir(), 'gliteco-video-'));

  try {
    const inputPaths: string[] = [];

    for (let i = 0; i < frames.length; i++) {
      const base64 = frames[i].url.replace(
        /^data:image\/jpeg;base64,/,
        ''
      );

      const imagePath = path.join(dir, `frame-${i}.jpg`);

      await writeFile(imagePath, Buffer.from(base64, 'base64'));
      inputPaths.push(imagePath);
    }

    const outputPath = path.join(dir, 'gliteco-video.mp4');
    const args: string[] = [];

    for (const input of inputPaths) {
      args.push('-loop', '1', '-t', '3', '-i', input);
    }

    const filters = inputPaths.map(
      (_, i) =>
        `[${i}:v]scale=1280:720:force_original_aspect_ratio=decrease,` +
        `pad=1280:720:(ow-iw)/2:(oh-ih)/2,` +
        `zoompan=z='min(zoom+0.0008,1.08)':d=75:s=1280x720:fps=25,` +
        `setsar=1[v${i}]`
    );

    const concatInputs = inputPaths
      .map((_, i) => `[v${i}]`)
      .join('');

    filters.push(
      `${concatInputs}concat=n=${inputPaths.length}:v=1:a=0[outv]`
    );

    args.push(
      '-filter_complex', filters.join(';'),
      '-map', '[outv]',
      '-an',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
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
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg failed: ${stderr.slice(-1200)}`));
        }
      });
    });

    return await readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function generateOpenRouterImage(
  prompt: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OpenRouter API key is missing.');
  }

  const response = await fetch(
    'https://openrouter.ai/api/v1/images',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'recraft/recraft-v4.1-flash-v2:free',
        prompt,
      }),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      `OpenRouter error (${response.status}): ${
        JSON.stringify(data).slice(0, 300)
      }`
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
  referenceImage?: Buffer
): Promise<string> {
  const primaryPrompt = buildImagePrompt(
    prompt,
    Boolean(referenceImage)
  );

let response = await runFluxWithRetry(
  accountId,
  apiToken,
  primaryPrompt,
  referenceImage
);

async function runFluxWithRetry(
  accountId: string,
  apiToken: string,
  prompt: string,
  referenceImage?: Buffer
): Promise<Response> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await runFlux(
      accountId,
      apiToken,
      prompt,
      referenceImage
    );

    if (response.ok) {
      return response;
    }

    const errorText = await response.clone().text();

    const isDailyQuotaError =
  response.status === 429 &&
  errorText.includes('4006');

const transientFailure =
  !isDailyQuotaError &&
  (
    [429, 500, 502, 503, 504].includes(response.status) ||
    errorText.includes('"code":3043')
  );
    if (!transientFailure || attempt === maxAttempts) {
      return response;
    }

    console.warn(
      `Cloudflare temporary failure. Retry ${attempt}/${maxAttempts - 1}`,
      response.status,
      errorText.slice(0, 200)
    );

    await new Promise(resolve =>
      setTimeout(resolve, attempt * 800)
    );
  }

  throw new Error('Cloudflare retry limit reached.');
}


  if (!response.ok) {
    const errorText = await response.text();
  if (
      response.status === 429 &&
      errorText.includes('4006') &&
      !referenceImage
) {
  console.warn(
    'Cloudflare daily quota exhausted. Switching to OpenRouter.'
  );

  return await generateOpenRouterImage(primaryPrompt);
}

    const isSafetyError =
      errorText.includes('8007') ||
      errorText.toLowerCase().includes('nsfw');

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

    // Keep the existing safety retry.
    response = await runFlux(
      accountId,
      apiToken,
      `
        Create a safe, family-friendly, fully clothed editorial image.
        ${primaryPrompt}
      `,
      referenceImage
    );
  }

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Cloudflare AI retry failed (${response.status}): ${errorText.slice(0, 300)}`
    );
  }

  const data = await response.json().catch(() => null);

  if (data?.success === false) {
    const message =
      data?.errors?.[0]?.message ||
      'Cloudflare image generation failed.';

    throw new Error(message);
  }

  const image = data?.result?.image;

  if (typeof image !== 'string' || !image) {
    console.error(
      'Unexpected Cloudflare response:',
      JSON.stringify(data).slice(0, 1000)
    );

    throw new Error(
      'Cloudflare returned no valid image.'
    );
  }

  return normalizeGeneratedImage(image);
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
      return errorResponse(
        'Invalid JSON request.',
        400,
        'INVALID_REQUEST'
      );
    }

    if (!body || typeof body !== 'object') {
      return errorResponse(
        'Invalid request body.',
        400
      );
    }

    const prompt =
      typeof body.prompt === 'string'
        ? body.prompt.trim()
        : '';

    const type: MediaType =
      body.type === undefined
        ? 'image'
        : (body.type as MediaType);

    if (type !== 'image' && type !== 'video') {
      return errorResponse(
        'Unsupported media type. Use image or video.',
        400,
        'INVALID_MEDIA_TYPE'
      );
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return errorResponse(
        'Prompt is too long. Maximum length is 2000 characters.',
        400,
        'PROMPT_TOO_LONG'
      );
    }

    const accountId =
      process.env.CLOUDFLARE_ACCOUNT_ID;

    const apiToken =
      process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      return errorResponse(
        'Cloudflare configuration is missing. Please check server environment variables.',
        500,
        'MISSING_CONFIGURATION'
      );
    }

    // ----------------------------------------------
    // REFERENCE IMAGE
    // ----------------------------------------------

    let referenceImage: Buffer | undefined;

    if (
      body.referenceImage !== undefined &&
      body.referenceImage !== null &&
      body.referenceImage !== ''
    ) {
      try {
        referenceImage = await prepareReferenceImage(
          body.referenceImage
        );
      } catch (error) {
        return errorResponse(
          safeErrorMessage(error),
          400,
          'INVALID_REFERENCE_IMAGE'
        );
      }
    }

    // ----------------------------------------------
    // VIDEO GENERATION — FOUR FRAME FEATURE
    // ----------------------------------------------

    if (type === 'video') {
      const scenes = [
        {
          suffix:
            'wide establishing cinematic shot, golden hour lighting',
          caption: 'Scene 1 • Establishing Shot',
        },
        {
          suffix:
            'medium tracking shot in motion, dynamic camera angle',
          caption: 'Scene 2 • Dynamic Motion',
        },
        {
          suffix:
            'close-up dramatic portrait shot, shallow depth of field',
          caption: 'Scene 3 • Close-Up Focus',
        },
        {
          suffix:
            'epic wide finale shot, dramatic sunset sky',
          caption: 'Scene 4 • Cinematic Finale',
        },
      ];

      const frames: {
        url: string;
        caption: string;
      }[] = [];

      for (const scene of scenes) {
        const url = await generateCloudflareImage(
          accountId,
          apiToken,
          `${prompt || 'A cinematic visual story'}, ${scene.suffix}`,
          referenceImage
        );

        frames.push({
          url,
          caption: scene.caption,
        });
      }

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
    // SINGLE IMAGE GENERATION / REFERENCE EDITING
    // ----------------------------------------------

    const url = await generateCloudflareImage(
      accountId,
      apiToken,
      prompt,
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

    return errorResponse(
      timeout
        ? 'AI generation timed out. Please try again.'
        : safeErrorMessage(error),
      timeout ? 504 : 502,
      timeout
        ? 'GENERATION_TIMEOUT'
        : 'MEDIA_GENERATION_FAILED'
    );
  }
}
