import { NextResponse } from 'next/server';

export const maxDuration = 60;

async function generateCloudflareImage(
  prompt: string,
  width = 1024,
  height = 1024,
  seed?: number
): Promise<string> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error('Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN in environment variables.');
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        steps: 6,
        width,
        height,
        ...(typeof seed === 'number' ? { seed } : {}),
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cloudflare AI error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const base64Image = data?.result?.image;
  if (!base64Image) {
    throw new Error('Cloudflare Workers AI returned no image data.');
  }

  return `data:image/jpeg;base64,${base64Image}`;
}

export async function POST(req: Request) {
  try {
    const { prompt, type }: { prompt: string; type: 'image' | 'video' } = await req.json();

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    const cleaned =
      prompt
        .replace(
          /\b(can you|please|could you|generate|create|draw|make|design|render|paint|show|give|send|want|need)\b/gi,
          ''
        )
        .replace(
          /\b(me|an?|the)?\s*(short|hd|4k|realistic|real|high quality|ai|animated)?\s*(image|images|pic|pics|picture|pictures|photo|photos|photograph|logo|poster|banner|illustration|wallpaper|avatar|portrait|video|videos|animation|reel|movie|clip|commercial)\s*(of|for|showing|with|about)?\b/gi,
          ''
        )
        .replace(/\s+/g, ' ')
        .trim() || prompt.trim();

    if (type === 'video') {
      const baseSeed = Math.floor(Math.random() * 100000);
      const sceneSpecs = [
        {
          prompt: `${cleaned}, wide establishing cinematic shot, golden hour lighting, ultra detailed 8k, photorealistic`,
          caption: `Scene 1 • Establishing view: ${cleaned}`,
          seed: baseSeed + 1,
        },
        {
          prompt: `${cleaned}, dynamic close-up action shot, dramatic depth of field, sharp focus, 8k`,
          caption: `Scene 2 • Close-up perspective: ${cleaned}`,
          seed: baseSeed + 2,
        },
        {
          prompt: `${cleaned}, sweeping aerial drone view, vibrant cinematic atmosphere, 8k`,
          caption: `Scene 3 • Aerial cinematic angle: ${cleaned}`,
          seed: baseSeed + 3,
        },
        {
          prompt: `${cleaned}, epic grand finale shot, dramatic lighting, ultra detailed 8k`,
          caption: `Scene 4 • Finale: ${cleaned}`,
          seed: baseSeed + 4,
        },
      ];

      const frames = await Promise.all(
        sceneSpecs.map(async (s) => ({
          url: await generateCloudflareImage(s.prompt, 1024, 576, s.seed),
          caption: s.caption,
        }))
      );

      return NextResponse.json({ frames });
    }

    const enhancedPrompt = `${cleaned}, ultra detailed, photorealistic, cinematic lighting, 8k resolution, sharp focus`;
    const imageUrl = await generateCloudflareImage(enhancedPrompt, 1024, 1024);

    return NextResponse.json({ url: imageUrl });
  } catch (err: any) {
    console.error('Media API Error:', err);
    return NextResponse.json({ error: err?.message || 'Cloudflare image generation failed.' }, { status: 500 });
  }
}