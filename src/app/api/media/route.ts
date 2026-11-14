import { NextResponse } from 'next/server';

export const maxDuration = 60;

async function uploadTempImage(dataUrl: string): Promise<string | null> {
  try {
    const [header, base64] = dataUrl.split(',');
    const mime = header.match(/data:(.*?);/)?.[1] || 'image/jpeg';
    const buffer = Buffer.from(base64, 'base64');
    const blob = new Blob([buffer], { type: mime });

    const form = new FormData();
    form.append('file', blob, 'reference.jpg');

    const res = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: form,
    });
    if (!res.ok) return null;
    const json = await res.json();
    const rawUrl: string | undefined = json?.data?.url;
    if (!rawUrl) return null;
    // Convert tmpfiles viewer URL to direct download URL
    return rawUrl.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');
  } catch {
    return null;
  }
}

async function editWithKontext(referenceImage: string, prompt: string): Promise<string> {
  const publicUrl = await uploadTempImage(referenceImage);
  if (!publicUrl) {
    throw new Error('Could not prepare reference photo for editing. Please try a smaller image.');
  }

  const editPrompt = `${prompt}, preserve the exact same person face, facial features, skin tone, and identity from the input photo, photorealistic, high quality, 8k`;
  const seed = Math.floor(Math.random() * 100000);
  const kontextUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(editPrompt)}?model=kontext&image=${encodeURIComponent(publicUrl)}&width=1024&height=1024&seed=${seed}&nologo=true`;

  const imgRes = await fetch(kontextUrl);
  if (!imgRes.ok) {
    throw new Error(`Face-edit engine busy (${imgRes.status}). Please click Regenerate.`);
  }

  const arrayBuf = await imgRes.arrayBuffer();
  const base64Out = Buffer.from(arrayBuf).toString('base64');
  return `data:image/jpeg;base64,${base64Out}`;
}

async function generateCloudflareImage(accountId: string, apiToken: string, prompt: string): Promise<string> {
  const safePrompt = `Family-friendly photorealistic portrait, ${prompt.trim()}, cinematic lighting, sharp focus, 8k resolution`;

  const fluxRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: safePrompt,
        steps: 6,
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
        const url = referenceImage
          ? await editWithKontext(referenceImage, `${prompt}, ${scene.suffix}`)
          : await generateCloudflareImage(accountId, apiToken, `${prompt}, ${scene.suffix}`);
        frames.push({ url, caption: scene.caption });
      }
      return NextResponse.json({ frames });
    }

    const url = referenceImage
      ? await editWithKontext(referenceImage, prompt)
      : await generateCloudflareImage(accountId, apiToken, prompt);

    return NextResponse.json({ url });
  } catch (err: any) {
    console.error('Media API Error:', err);
    return NextResponse.json({ error: err?.message || 'Media generation failed.' }, { status: 500 });
  }
}