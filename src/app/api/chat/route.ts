import { NextResponse } from 'next/server';
import { queryGroqBalanced, ChatMessage } from '@/utils/groqLoadBalancer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, message } = body;

    let chatHistory: ChatMessage[] = [];

    if (Array.isArray(messages) && messages.length > 0) {
      chatHistory = messages.map((m: any) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text || m.content || '',
      }));
    } else if (typeof message === 'string' && message.trim()) {
      chatHistory = [{ role: 'user', content: message.trim() }];
    }

    if (chatHistory.length === 0) {
      return NextResponse.json(
        { error: 'الرجاء إدخال نص السؤال.' },
        { status: 400 }
      );
    }

    const reply = await queryGroqBalanced(chatHistory);

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error('API Chat Error:', error);
    return NextResponse.json(
      {
        reply:
          'أهلاً بك! يواجه السيرفر ضغطاً مؤقتاً صغيراً، لكنني هنا لمساعدتك. تفضل بإعادة كتابة سؤالك وسأجيبك فوراً!',
        error: error?.message || 'Server error',
      },
      { status: 500 }
    );
  }
}
