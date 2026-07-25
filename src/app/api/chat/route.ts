import { NextResponse } from 'next/server';
import { queryGroqBalanced, ChatMessage } from '@/utils/groqLoadBalancer';

// In-Memory Rate Limiter Map (IP -> request timestamps)
const rateLimitMap = new Map<string, number[]>();

const MAX_REQUESTS_PER_WINDOW = 8; // Max 8 questions per minute per user/IP
const WINDOW_DURATION_MS = 60 * 1000; // 60 seconds
const MAX_PROMPT_LENGTH = 500; // Max 500 characters per question to stop token spamming

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];

  // Filter timestamps within the current 60s window
  const validTimestamps = timestamps.filter((ts) => now - ts < WINDOW_DURATION_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);
  return false;
}

export async function POST(request: Request) {
  try {
    // Extract IP address from request headers
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

    // Anti-Spam Rate Limit Check
    if (isRateLimited(ip)) {
      return NextResponse.json(
        {
          reply:
            '⚠️ تم الوصول للحد الأقصى للأسئلة المسموحة في الدقيقة (8 أسئلة). يرجى الانتظار 30 ثانية قبل طرح السؤال التالي لحماية السيرفر من السبام.',
          rateLimited: true,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { messages, message } = body;

    let chatHistory: ChatMessage[] = [];

    if (Array.isArray(messages) && messages.length > 0) {
      chatHistory = messages.map((m: any) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: (m.text || m.content || '').slice(0, MAX_PROMPT_LENGTH),
      }));
    } else if (typeof message === 'string' && message.trim()) {
      chatHistory = [{ role: 'user', content: message.trim().slice(0, MAX_PROMPT_LENGTH) }];
    }

    if (chatHistory.length === 0) {
      return NextResponse.json({ error: 'الرجاء إدخال نص السؤال.' }, { status: 400 });
    }

    // Limit conversation context to last 6 messages to keep requests fast and save tokens
    const recentHistory = chatHistory.slice(-6);

    // Validate last message length
    const lastUserMsg = recentHistory[recentHistory.length - 1]?.content || '';
    if (lastUserMsg.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { reply: 'عذراً، السؤال طويل جداً. يرجى اختصار السؤال إلى أقل من 500 حرف.' },
        { status: 400 }
      );
    }

    const reply = await queryGroqBalanced(recentHistory);

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('API Chat Error:', error);
    return NextResponse.json(
      {
        reply:
          'أهلاً بك! يواجه المساعد ضغطاً صغيراً، تفضل بإعادة كتابة سؤالك وسأجيبك فوراً!',
        error: error?.message || 'Server error',
      },
      { status: 500 }
    );
  }
}
