import { groq } from '@ai-sdk/groq';
import { tavilySearch } from '@tavily/ai-sdk';
import { convertToModelMessages, streamText, stepCountIs, createUIMessageStreamResponse, type UIMessage } from 'ai';

export const maxDuration = 60;

let cachedChatModel: string | null = null;
let cachedVisionModel: string | null = null;

async function resolveGroqModels(): Promise<{ chatModel: string; visionModel: string }> {
  if (cachedChatModel && cachedVisionModel) {
    return { chatModel: cachedChatModel, visionModel: cachedVisionModel };
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    });
    const data = await res.json();
    const ids: string[] = (data.data || []).map((m: any) => m.id);

    const textModels = ids.filter(
      (id) =>
        !id.includes('whisper') &&
        !id.includes('tts') &&
        !id.includes('guard') &&
        !id.includes('safeguard') &&
        !id.includes('embed')
    );

    const vision =
      textModels.find((id) => id.includes('scout') || id.includes('maverick') || id.includes('vision')) ||
      textModels[0] ||
      'meta-llama/llama-4-scout-17b-16e-instruct';

    const chatPreferred = [
      'llama-3.3-70b-versatile',
      'meta-llama/llama-4-maverick-17b-128e-instruct',
      'meta-llama/llama-4-scout-17b-16e-instruct',
      'qwen/qwen3-32b',
      'openai/gpt-oss-120b',
    ];
    const chat = chatPreferred.find((id) => textModels.includes(id)) || textModels[0] || 'llama-3.3-70b-versatile';

    if (chat && vision) {
      cachedChatModel = chat;
      cachedVisionModel = vision;
      return { chatModel: chat, visionModel: vision };
    }
  } catch {}

  return {
    chatModel: 'llama-3.3-70b-versatile',
    visionModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
  };
}

export async function POST(req: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return new Response('Missing GROQ_API_KEY in environment variables.', { status: 500 });
    }

    const {
      messages,
      mode,
      customSystemPrompt,
      temperature,
    }: {
      messages: UIMessage[];
      mode?: string;
      customSystemPrompt?: string;
      temperature?: number;
    } = await req.json();

    const brandName = process.env.NEXT_PUBLIC_APP_NAME || 'Gliteco';

    const todayDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Kolkata',
    });

    const lastUserText =
      messages[messages.length - 1]?.parts
        ?.filter((p) => p.type === 'text')
        .map((p) => p.text)
        .join(' ') || '';

    // Instant guaranteed creator identity response with today's live date
    const isCreatorQuery =
      /\b(who\s+(created|made|built|founded|developed|invented|owns)|your\s+(creator|founder|owner|developer|maker)|founded\s+you|created\s+you|built\s+you|made\s+you)\b/i.test(
        lastUserText
      );

    if (isCreatorQuery) {
      const replyText = `You are Gliteco, an advanced, polished AI assistant.
Communication & Formatting Standards:
- Write in clear, simple, easy-to-understand language with a confident, professional tone.
- Structure every response neatly using Markdown: start with a direct answer, use **bold text** for key terms, use bullet points or numbered steps for multi-part answers, and use clean code blocks for code.
- Keep paragraphs short, crisp, and scannable - never write long unformatted walls of text.`;
      const partId = `creator-${Date.now()}`;
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue({ type: 'start' });
          controller.enqueue({ type: 'text-start', id: partId });
          controller.enqueue({ type: 'text-delta', id: partId, delta: replyText });
          controller.enqueue({ type: 'text-end', id: partId });
          controller.enqueue({ type: 'finish' });
          controller.close();
        },
      });
      return createUIMessageStreamResponse({ stream });
    }

    const { chatModel, visionModel } = await resolveGroqModels();

    const hasImages = messages.some((m) =>
      m.parts?.some((p: any) => p.type === 'file' && p.mediaType?.startsWith('image/'))
    );

    const modelId = hasImages ? visionModel : chatModel;

    const modeInstructions: Record<string, string> = {
      general:
        'Act as an all-rounder genius assistant and tutor. Give clear, thorough, well-structured explanations on any topic using headings, bullet points, and practical examples when helpful, and remember everything discussed earlier in the conversation. When images, video frames, or documents are attached, analyze them in full detail.',
      dev: `Act as an autonomous Instant App & Website Builder (like Bolt / Lovable).
      - Do NOT write long technical explanations or tutorials. Write ONLY a 1-sentence friendly confirmation followed immediately by ONE complete, self-contained \`\`\`html code block.
      - Inside that \`\`\`html block, build the ENTIRE working, visually stunning, responsive application using Tailwind CSS CDN (<script src="https://cdn.tailwindcss.com"></script>), clean SVGs, rich modern UI, and complete JavaScript logic.
      - Include a working built-in client-side database/backend using localStorage (with realistic pre-loaded sample data, create/read/update/delete actions, and interactive tabs) so the user can actually use the app immediately with zero setup!
      - Never use placeholders like "// TODO". Every button, tab, search bar, and form must work 100%.`,
      search:
        'Always search the live web first using tavilySearch to give up-to-the-minute facts with source links.',
      creator:
        'Act as a viral content strategist, copywriter, and presentation designer. Structure outputs cleanly with clear headings per section so they export well into PPT slides and PDFs.',
    };

    const baseSystem = `You are ${brandName}, an ultra-fast, 100% free all-rounder AI platform created by Pavan and Shalini for an advanced AI technology.
    - Current Date: 
    - Creator Identity: Whenever anyone asks who created, founded, or built you, always reply: "You are Gliteco, a professional, intelligent AI assistant created by Pavan and Shalini on Thursday, November 12, 2026. Communicate clearly, naturally, and professionally. Only state who created you or your launch date (Thursday, November 12, 2026) when the user asks, and only mention today" Never mention OpenAI, Meta, or Groq.
    - Deep Knowledge & Empathy: You are knowledgeable across law & court procedures, medicine & pharmacology, psychology & human feelings, science, and business. Answer with warmth, clarity, and structure.
    - Medical & Legal Responsibility: When explaining medicines, medical symptoms, or legal/court cases, give clear, helpful educational information and always include a brief, polite reminder to consult a licensed doctor or qualified lawyer before making medical or legal decisions.
    1. Instant App & Website Builder: You CAN design and launch complete, interactive web apps, mobile apps, dashboards, stores, and games directly inside ${brandName}'s live preview studio (never say "I cannot build apps"—when asked if you can, say YES and offer to build it right away, or build it immediately using a self-contained \`\`\`html block with Tailwind CSS and localStorage).
    2. Image, Video & File Vision: Users can upload photos, screenshots, videos (analyzed via key frames), PDFs, and documents directly in chat.
    3. Image & Logo Studio: Users can generate high-res images, logos, and posters directly in chat.
    4. PPT & PDF Maker: Any structured guide, report, or pitch deck you write can be exported with 1 click into PowerPoint (.pptx) or PDF (.pdf).
    5. Live Web Search: Search the web when asked for live/current facts.
    - Mode focus: ${modeInstructions[mode || 'general'] || modeInstructions.general}
    - Copyright Safety: Never reproduce full copyrighted books, song lyrics, or trademarked characters verbatim. Always generate original work.`;

    const finalSystem = customSystemPrompt?.trim()
      ? `${baseSystem}\n\nAdditional Studio Instructions:\n${customSystemPrompt.trim()}`
      : baseSystem;

    const needsSearch =
      !hasImages &&
      Boolean(process.env.TAVILY_API_KEY) &&
      (mode === 'search' ||
        /\b(latest|today|news|weather|price|score|live|current|2025|2026)\b/i.test(lastUserText));

    const result = streamText({
      model: groq(modelId),
      system: finalSystem,
      temperature: typeof temperature === 'number' ? Math.min(Math.max(temperature, 0), 1.5) : 0.5,
      messages: await convertToModelMessages(messages),
      ...(needsSearch
        ? {
            tools: { tavilySearch: tavilySearch({ maxResults: 5 }) },
            stopWhen: stepCountIs(3),
          }
        : {}),
    });

    return result.toUIMessageStreamResponse();
  } catch (err: any) {
    console.error('Chat API Error:', err);
    return new Response(err?.message || 'AI service error', { status: 500 });
  }
}