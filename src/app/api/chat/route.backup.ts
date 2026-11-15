
import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const groqKey = process.env.GROQ_API_KEY;

    if (!groqKey) {
      return NextResponse.json(
        { error: 'Missing GROQ_API_KEY in environment variables.' },
        { status: 500 }
      );
    }

    const incoming = Array.isArray(body.messages) ? body.messages : [];
    const mode = body.mode || 'general';

    let hasImage = false;

    const normalizedMessages = incoming.map((m: any) => {
      if (Array.isArray(m?.parts)) {
        const text = m.parts
          .filter((p: any) => p?.type === 'text')
          .map((p: any) => p.text || '')
          .join('\n');

        const images = m.parts.filter(
          (p: any) =>
            p?.type === 'file' &&
            p?.mediaType?.startsWith('image/') &&
            p?.url
        );

        if (images.length > 0) {
          hasImage = true;

          return {
            role: m.role,
            content: [
              { type: 'text', text: text || 'Analyze this image.' },
              ...images.map((img: any) => ({
                type: 'image_url',
                image_url: { url: img.url },
              })),
            ],
          };
        }

        return { role: m.role, content: text || ' ' };
      }

      if (Array.isArray(m?.content)) {
        if (m.content.some((p: any) => p?.type === 'image_url')) {
          hasImage = true;
        }

        return { role: m.role, content: m.content };
      }

      return {
        role: m.role,
        content: String(m?.content ?? ' '),
      };
    });

    const model = hasImage
      ? 'qwen/qwen3.8-27b'
      : 'openai/gpt-oss-120b';

    const finalMessages = hasImage
      ? normalizedMessages
      : normalizedMessages.map((m: any) => ({
          role: m.role,
          content: Array.isArray(m.content)
            ? m.content.map((p: any) => p?.text || '').join('\n') || ' '
            : m.content,
        }));

    const creatorRule =
      'If any user asks who created you, who made you, who built you, or who owns/founded Gliteco, always answer clearly: "I am Gliteco AI, created by Pavan (CEO) and Shalini (CFO) of Gliteco."';

    const imageGuidance = `
IMAGE AND REAL-PERSON PHOTO GUIDANCE:

- Do not automatically refuse a request just because an uploaded image contains a real person.
- You may help with ordinary, respectful and non-harmful creative image transformations involving people.
- Examples include adding a crown, royal outfit, queen or king theme, changing the background, improving lighting, creating a professional portrait, adding decorative elements, and other harmless artistic edits.
- Do not tell users that all editing or generation involving real people is prohibited.
- Do not demand proof of permission for ordinary, benign editing requests.
- Do not invent restrictions or claim that a feature is prohibited when it is not.
- Refuse only requests that are genuinely unsafe or disallowed, and briefly explain the specific issue.
- If the user wants an image generated or edited, guide them to the appropriate Gliteco image studio instead of writing a fake image-generation result.
- IMPORTANT: Gliteco's current photo-reference editing capability may be temporarily unavailable. Never claim that an uploaded person's exact face or identity can be preserved unless the image tool actually supports it.
- If reference-photo editing is unavailable, explain that limitation honestly and offer a suitable alternative without suggesting that editing real people is generally forbidden.
`;

    const systemPrompt = {
      role: 'system',
      content:
        mode === 'dev'
          ? `You are Gliteco App & Web Designer. ${creatorRule} Build complete, self-contained, interactive single-file HTML/CSS/JS apps inside a \`\`\`html code block.`
          : `You are Gliteco AI (mode: ${mode}). ${creatorRule}

Be helpful, clear, friendly, and concise.

${imageGuidance}

Never output fake "Photorealistic 8K Image Prompt" text recipes. If the user wants an image or video generated, guide them to HD Image Studio or AI Video Studio. Do not claim that you generated an image unless an image-generation tool actually did so.`,
    };

    const res = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [systemPrompt, ...finalMessages],
          temperature: 0.4,
          reasoning_effort: 'low',
          max_tokens: hasImage ? 900 : 4096,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            data?.error?.message || `Groq API error (${res.status})`,
        },
        { status: res.status }
      );
    }

    const replyText =
      data?.choices?.[0]?.message?.content || 'Done!';

    const encoder = new TextEncoder();
    const partId = `text-${Date.now()}`;

    const stream = new ReadableStream({
      start(controller) {
        const sendEvent = (payload: any) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );
        };

        sendEvent({ type: 'start' });
        sendEvent({ type: 'text-start', id: partId });
        sendEvent({
          type: 'text-delta',
          id: partId,
          delta: replyText,
        });
        sendEvent({ type: 'text-end', id: partId });
        sendEvent({ type: 'finish' });

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'x-vercel-ai-ui-message-stream': 'v1',
      },
    });
  } catch (err: any) {
    console.error('Chat API Error:', err);

    return NextResponse.json(
      { error: err?.message || 'Chat request failed.' },
      { status: 500 }
    );
  }
}
