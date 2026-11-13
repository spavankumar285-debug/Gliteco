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

    // Check if any message contains an image_url part
    const hasImage = incoming.some(
      (m: any) => Array.isArray(m?.content) && m.content.some((p: any) => p?.type === 'image_url')
    );

    // Groq's active multimodal vision model is qwen/qwen3.8-27b; text-only models require string content
    const model = hasImage ? 'qwen/qwen3.8-27b' : 'openai/gpt-oss-120b';

    const sanitizedMessages = incoming.map((m: any) => {
      if (typeof m?.content === 'string') {
        return { role: m.role, content: m.content };
      }
      if (Array.isArray(m?.content)) {
        if (hasImage) {
          return {
            role: m.role,
            content: m.content.map((part: any) =>
              part?.type === 'image_url'
                ? { type: 'image_url', image_url: { url: part.image_url?.url || part.url } }
                : { type: 'text', text: typeof part === 'string' ? part : part?.text || '' }
            ),
          };
        }
        const joinedText = m.content
          .map((part: any) => (typeof part === 'string' ? part : part?.text || ''))
          .filter(Boolean)
          .join('\n');
        return { role: m.role, content: joinedText || ' ' };
      }
      return { role: m.role, content: String(m?.content ?? '') };
    });

    const systemPrompt = {
      role: 'system',
      content: `You are Gliteco AI (mode: ${mode}). Be helpful, clear, and concise. Never output fake "Photorealistic 8K Image Prompt" text recipes—if the user wants an image or video generated, tell them to use HD Image Studio or AI Video Studio.`,
    };

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [systemPrompt, ...sanitizedMessages],
        temperature: 0.3,
      reasoning_effort: 'low',
        max_tokens: 2048,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message || `Groq API error (${res.status})` },
        { status: res.status }
      );
    }

    const reply = data?.choices?.[0]?.message?.content || '';
    return NextResponse.json({ reply, content: reply, message: { role: 'assistant', content: reply } });
  } catch (err: any) {
    console.error('Chat API Error:', err);
    return NextResponse.json({ error: err?.message || 'Chat request failed.' }, { status: 500 });
  }
}