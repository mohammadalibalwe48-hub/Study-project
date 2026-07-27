// Production Groq Load Balancer with 9 API Keys & Automatic Retry Fallback

function getApiKeys(): string[] {
  if (process.env.GROQ_API_KEYS) {
    const parsed = process.env.GROQ_API_KEYS.split(',').map((k) => k.trim()).filter(Boolean);
    if (parsed.length > 0) return parsed;
  }

  const keysFromEnv: string[] = [];
  for (let i = 1; i <= 9; i++) {
    const val = process.env[`GROQ_API_KEY_${i}`];
    if (val) keysFromEnv.push(val.trim());
  }

  return keysFromEnv;
}

let currentKeyIndex = 0;

function getNextApiKey(keysList: string[]): { key: string; index: number } {
  const index = currentKeyIndex % keysList.length;
  currentKeyIndex = (currentKeyIndex + 1) % keysList.length;
  return { key: keysList[index], index };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const SYSTEM_PROMPT = `أنت (الرفيق البطل) - مساعد الذكاء الاصطناعي الخاص حصرياً بـ "منصة مسار" والمنهاج الوزاري السوري (الفرعين العلمي والأدبي).

[قانون صارم - نطاق الإجابة المسموح به حتماً]:
أنت مخصص حصراً وإجبارياً لخدمة طلاب البكالوريا السورية في المواضيع التالية فقط لا غير:
1. منهاج البكالوريا السورية العلمي والأدبي (الرياضيات، الفيزياء، الكيمياء، العلوم العامة، اللغة العربية، اللغة الإنكليزية، اللغة الفرنسية، التاريخ، الجغرافيا، الفلسفة، والتربية الوطنية).
2. منصة مسار (طريقة استخدام أقسام الموقع، الامتحانات الوزارية، المفاضلة، وحساب العلامات).

[قانون صارم - رفض الأسئلة الخارجية والخروج عن النطاق]:
إذا سألك المستخدم عن أي موضوع خارجي لا يتعلق بمنهاج البكالوريا السورية أو منصة مسار (مثل: البرمجة، الطبخ، الألعاب، السفر، الأخبار العامة، الرياضة، السياسة، الحادكة العامة، أو أي سياق خارج الدراسة)، يجب عليك فوراً وبدون أي استثناء رفض الإجابة بلباقة وتوجيه الطالب للدراسة باستخدام الرد التالي تماماً:
"عذراً يا بطل! أنا مصمم خصيصاً لمساعدتك في منهاج البكالوريا السورية (علمي وأدبي) واستخدام منصة مسار التعليمية فقط. فلنركز معاً على تحقيق النجاح والتميز الدراسي! 📚"

[قواعد الجودة ومنع الهلوسة]:
- استخدم اللغة العربية الفصحى الناصعة والسليمة تماماً بدون أخطاء إملائية أو نحو.
- لا تبتدع قوانين أو نتائج غير موجوة في كتاب الوزارة السوري.
- نسق الإجابة بوضوح باستخدام النقاط والرموز والصيغ الرياضية البارزة.
- كن محفزاً ومساعداً للطالب في حدود المنهاج السوري فقط.`;

export async function queryGroqBalanced(messages: ChatMessage[]): Promise<string> {
  const keysList = getApiKeys();
  if (keysList.length === 0) {
    throw new Error('لم يتم العثور على مفاتيح Groq API في المتغيرات البيئية.');
  }

  const attempts = keysList.length;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const { key, index } = getNextApiKey(keysList);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages,
          ],
          temperature: 0.2, // Low temperature for zero-hallucination factual adherence
          max_tokens: 1000,
          top_p: 0.85,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Groq API Key #${index + 1} failed with status ${response.status}: ${errorText}`);
        continue;
      }

      const data = await response.json();
      const reply = data?.choices?.[0]?.message?.content;

      if (reply) {
        return reply.trim();
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Groq API Key #${index + 1} exception:`, err?.message || err);
    }
  }

  throw new Error(lastError?.message || 'جميع مفاتيح Groq API مشغولة حالياً، يرجى المحاولة بعد لحظات.');
}
