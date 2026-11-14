import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const groqKey = process.env.GROQ_API_KEY;

    if (!groqKey) {
      return NextResponse.json({ error: 'Missing GROQ_API_KEY in environment variables.' }, { status: 500 });
    }

    const incoming = Array.isArray(body.messages) ? body.messages : [];
    const mode = body.mode || 'general';

    // Convert @ai-sdk/react UIMessage (`parts`) or legacy `content` into OpenAI/Groq format
    let hasImage = false;
    const normalizedMessages = incoming.map((m: any) => {
      if (Array.isArray(m?.parts)) {
        const text = m.parts
          .filter((p: any) => p?.type === 'text')
          .map((p: any) => p.text || '')
          .join('\n');
        const images = m.parts.filter(
          (p: any) => p?.type === 'file' && p?.mediaType?.startsWith('image/') && p?.url
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
        if (m.content.some((p: any) => p?.type === 'image_url')) hasImage = true;
        return { role: m.role, content: m.content };
      }

      return { role: m.role, content: String(m?.content ?? ' ') };
    });

    const model = hasImage ? 'qwen/qwen3.8-27b' : 'openai/gpt-oss-120b';

    // Ensure all message contents are plain strings when using the text model
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

    const systemPrompt = {
      role: 'system',
      content:
        mode === 'dev'
          ? `You are Gliteco App & Web Designer. ${creatorRule} Build complete, self-contained, interactive single-file HTML/CSS/JS apps inside a \`\`\`html code block.`
          : `You are Gliteco AI (mode: ${mode}).${creatorRule} Be helpful, clear, and concise. Never output fake "Photorealistic 8K Image Prompt" text recipes—if the user wants an image or video generated, tell them to use HD Image Studio or AI Video Studio.`,
    };

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
        max_tokens: 4096,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message || `Groq API error (${res.status})` },
        { status: res.status }
      );
    }

    const replyText = data?.choices?.[0]?.message?.content || 'Done!';

    // Stream back in @ai-sdk/react UI Message Stream SSE format so useChat renders immediately
    const encoder = new TextEncoder();
    const partId = `text-${Date.now()}`; const stream = new ReadableStream({ start(controller) { const sendEvent = (payload: any) => { controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        };
        sendEvent({ type: 'start' });
        sendEvent({ type: 'text-start', id: partId });
        sendEvent({ type: 'text-delta', id: partId, delta: replyText });
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
    return NextResponse.json({ error: err?.message || 'Chat request failed.' }, { status: 500 });
  }
}