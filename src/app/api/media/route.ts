import { NextResponse } from 'next/server';

export const maxDuration = 60;

async function describeSubjectFromImage(imageDataUrl: string): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    throw new Error('Missing GROQ_API_KEY in environment variables.');
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen/qwen3.8-27b',
      temperature: 0.2,
      max_tokens: 180,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe the main person or subject in this image in one concise, vivid visual phrase for an image generator (include approximate age, gender, skin tone, hair color/style, facial hair/glasses if any, facial expression, and outfit). Output ONLY the visual description, no intro text.',
            },
            {
              type: 'image_url',
              image_url: { url: imageDataUrl },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq Vision error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || 'the person from the reference photo';
}

async function generateCloudflareImage(prompt: string): Promise<string> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_API_ACCOUNT_ID;
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
    const {
      prompt,
      type,
      referenceImage,
    }: { prompt: string; type: 'image' | 'video'; referenceImage?: string } = await req.json();

    if (!prompt?.trim() && !referenceImage) {
      return NextResponse.json({ error: 'Prompt or reference image is required.' }, { status: 400 });
    }

    const cleaned =
      (prompt || '')
        .replace(
          /\b(can you|please|could you|generate|create|draw|make|design|render|paint|transform|put|place|dress|animate|turn|convert|show|give|send|want|need)\b/gi,
          ''
        )
        .replace(
          /\b(me|an?|the|this|person|face|boy|girl|man|woman)?\s*(short|hd|4k|realistic|real|high quality|ai|animated)?\s*(image|images|pic|pics|picture|pictures|photo|photos|photograph|logo|poster|banner|illustration|wallpaper|avatar|portrait|video|videos|animation|reel|movie|clip|commercial)\s*(of|for|showing|with|about|in|into)?\b/gi,
          ''
        )
        .replace(/\s+/g, ' ')
        .trim() || (prompt || 'cinematic portrait').trim();

    // If a photo was attached, extract the subject's visual identity with Groq Vision first
    let subjectPrefix = '';
    if (referenceImage) {
      const subjectDescription = await describeSubjectFromImage(referenceImage);
      subjectPrefix = `${subjectDescription}, `;
    }

    const finalSubject = `${subjectPrefix}${cleaned}`;

    if (type === 'video') {
      const sceneSpecs = [
        {
          prompt: `${finalSubject}, wide establishing cinematic shot, golden hour lighting, ultra detailed 8k, photorealistic`,
          caption: `Scene 1 • Establishing view: ${cleaned}`,
        },
        {
          prompt: `${finalSubject}, dynamic close-up portrait action shot, dramatic depth of field, sharp focus, 8k`,
          caption: `Scene 2 • Close-up perspective: ${cleaned}`,
        },
        {
          prompt: `${finalSubject}, medium tracking cinematic shot, vibrant atmosphere, natural lighting, 8k`,
          caption: `Scene 3 • Dynamic angle: ${cleaned}`,
        },
        {
          prompt: `${finalSubject}, epic grand finale shot, dramatic cinematic lighting, ultra detailed 8k`,
          caption: `Scene 4 • Finale: ${cleaned}`,
        },
      ];

      const frames = await Promise.all(
        sceneSpecs.map(async (s) => ({
          url: await generateCloudflareImage(s.prompt),
          caption: s.caption,
        }))
      );

      return NextResponse.json({ frames });
    }

    const enhancedPrompt = `${finalSubject}, ultra detailed, photorealistic, cinematic lighting, 8k resolution, sharp focus`;
    const imageUrl = await generateCloudflareImage(enhancedPrompt);

    return NextResponse.json({ url: imageUrl });
  } catch (err: any) {
    console.error('Media API Error:', err);
    return NextResponse.json({ error: err?.message || 'Media generation failed.' }, { status: 500 });
  }
}