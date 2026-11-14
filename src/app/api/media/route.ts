import { NextResponse } from 'next/server';

export const maxDuration = 60;

async function describeSubjectFromPhoto(referenceImage: string): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey || !referenceImage.startsWith('data:image/')) return '';

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.8-27b',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Describe the person in this photo for an editorial portrait: nationality/region (e.g. Indian/South Asian), gender, approximate age, face shape, exact hairstyle, eyebrows/eyes/smile, and glasses/jewelry in 20 family-friendly words.',
              },
              {
                type: 'image_url',
                image_url: { url: referenceImage },
              },
            ],
          },
        ],
        temperature: 0.2,
        reasoning_effort: 'low',
        max_tokens: 140,
      }),
    });

    if (!res.ok) return '';
    const data = await res.json();
    return (data?.choices?.[0]?.message?.content || '').replace(/["\n]/g, ' ').trim();
  } catch {
    return '';
  }
}

async function runFlux(accountId: string, apiToken: string, prompt: string) {
  return fetch(
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
      }),
    }
  );
}

async function generateCloudflareImage(
  accountId: string,
  apiToken: string,
  prompt: string,
  subjectDescription = ''
): Promise<string> {
  const safeUserPrompt = prompt.trim() || 'royal portrait in front of a grand palace';
  const primaryPrompt = subjectDescription
    ? `Family-friendly photorealistic portrait of ${subjectDescription}, fully dressed in elegant modest attire, ${safeUserPrompt}, cinematic lighting, 8k`
    : `Family-friendly photorealistic portrait, fully dressed in elegant modest attire, ${safeUserPrompt}, cinematic lighting, 8k`;

  let fluxRes = await runFlux(accountId, apiToken, primaryPrompt);

  if (!fluxRes.ok) {
    const errText = await fluxRes.text();
    if (errText.includes('8007') || errText.toLowerCase().includes('nsfw')) {
      fluxRes = await runFlux(
        accountId,
        apiToken,
        `Safe, family-friendly editorial portrait of ${safeUserPrompt}, fully clothed, high quality photography, 8k`
      );
    } else {
      throw new Error(`Cloudflare AI error (${fluxRes.status}): ${errText.slice(0, 200)}`);
    }
  }

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

    const subjectDescription = referenceImage ? await describeSubjectFromPhoto(referenceImage) : '';

    if (type === 'video') {
      const scenes = [
        { suffix: 'wide establishing cinematic shot, golden hour lighting', caption: 'Scene 1 • Establishing Shot' },
        { suffix: 'medium tracking shot in motion, dynamic camera angle', caption: 'Scene 2 • Dynamic Motion' },
        { suffix: 'close-up dramatic portrait shot, shallow depth of field', caption: 'Scene 3 • Close-Up Focus' },
        { suffix: 'epic wide finale shot, dramatic sunset sky', caption: 'Scene 4 • Cinematic Finale' },
      ];

      const frames = [];
      for (const scene of scenes) {
        const url = await generateCloudflareImage(accountId, apiToken, `${prompt}, ${scene.suffix}`, subjectDescription);
        frames.push({ url, caption: scene.caption });
      }
      return NextResponse.json({ frames });
    }

    const url = await generateCloudflareImage(accountId, apiToken, prompt, subjectDescription);
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error('Media API Error:', err);
    return NextResponse.json({ error: err?.message || 'Media generation failed.' }, { status: 500 });
  }
}