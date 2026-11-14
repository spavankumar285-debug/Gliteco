import { NextResponse } from 'next/server';

export const maxDuration = 60;

async function generateCloudflareImage(
  accountId: string,
  apiToken: string,
  prompt: string,
  referenceImage?: string
): Promise<string> {
  // If a reference photo is provided, use Cloudflare's img2img model so the actual face/subject is preserved
  if (referenceImage && referenceImage.startsWith('data:image/')) {
    const base64Data = referenceImage.split(',')[1];
    const imageBytes = Array.from(Buffer.from(base64Data, 'base64'));

    const img2imgRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/runwayml/stable-diffusion-v1-5-img2img`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `${prompt}, keep exact same person face and identity, photorealistic, high quality, sharp focus, 8k`,
          image: imageBytes,
          strength: 0.55,
          guidance: 7.5,
          num_steps: 20,
        }),
      }
    );

    if (img2imgRes.ok) {
      const arrayBuf = await img2imgRes.arrayBuffer();
      const outBase64 = Buffer.from(arrayBuf).toString('base64');
      return `data:image/png;base64,${outBase64}`;
    }
  }

  // Standard text-to-image generation with FLUX.1 Schnell
  const fluxRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: `${prompt}, ultra detailed, photorealistic, cinematic lighting, 8k resolution`,
        num_steps: 6,
      }),
    }
  );

  if (!fluxRes.ok) {
    const errText = await fluxRes.text();
    throw new Error(`Cloudflare AI error (${fluxRes.status}): ${errText.slice(0, 200)}`);
  }

  const json = await fluxRes.json();
  const b64 = json?.result?.image;
  if (!b64) {
    throw new Error('Cloudflare did not return an image.');
  }
  return `data:image/jpeg;base64,${b64}`;
}

export async function POST(req: Request) {
  try {
    const { prompt, type = 'image', referenceImage } = await req.json();
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      return NextResponse.json(
        { error: 'Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN in Vercel environment variables.' },
        { status: 500 }
      );
    }

    if (type === 'video') {
      const scenes = [
        { suffix: 'wide establishing cinematic shot, golden hour lighting', caption: 'Scene 1 • Establishing Shot' },
        { suffix: 'medium tracking shot in motion, dynamic camera angle', caption: 'Scene 2 • Dynamic Motion' },
        { suffix: 'close-up dramatic portrait shot, shallow depth of field', caption: 'Scene 3 • Close-Up Focus' },
        { suffix: 'epic wide finale shot, dramatic sunset sky', caption: 'Scene 4 • Cinematic Finale' },
      ];

      const frames = [];
      for (const scene of scenes) {
        const url = await generateCloudflareImage(accountId, apiToken, `${prompt}, ${scene.suffix}`, referenceImage);
        frames.push({ url, caption: scene.caption });
      }
      return NextResponse.json({ frames });
    }

    const url = await generateCloudflareImage(accountId, apiToken, prompt, referenceImage);
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error('Media API Error:', err);
    return NextResponse.json({ error: err?.message || 'Media generation failed.' }, { status: 500 });
  }
}