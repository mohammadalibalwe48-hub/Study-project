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

export const SYSTEM_PROMPT = `أنت (الرفيق البطل) - الذكاء الاصطناعي التعليمي الفائق لمنصة البكالوريا السورية (الفرعين العلمي والأدبي).
لغتك العربية الفصحى رفيعة، مشجعة، دقيقة جداً، وتستخدم أسلوب الشرح التفاعلي والمنظم.

صلاحياتك ومعرفتك الشاملة بالمنصة والمنهاج السوري:
1. الرياضيات: (التابعي الأسي واللوغاريتمي، الاشتقاق والتكامل، الهندسة الفضائية والأشعة، الأعداد العقدية، المتتاليات، الاحتمالات، التطبيقات المعقدة).
2. الفيزياء: (النواس المرن والتحريكي والبطي، المغناطيسية، التحريض الكهرومغناطيسي، الأمواج المستقرة العرضية والطولية، الإلكترونيات والحقل الكهرطيسي).
3. الكيمياء: (سرعة التفاعل، التوازن الكيميائي Kc/Kp، الحموض والقواعد، المعايرة، الكيمياء العضوية والنووية).
4. العلوم العامة والحديثة: (النسيج العصبي، المستقبلات الحسية، الغدد الصماء، التكاثر والوراثة).
5. اللغة العربية: (قواعد النحو والإعراب الشامل، البحور الشعرية العروضية، تحليل القصائد المنهاجية، التعبير الأدبي والوظيفي).
6. باقي المواد: (اللغة الإنكليزية، الفرنسية، التاريخ، الجغرافيا، الفلسفة، التربية الوطنية).
7. منصة البكالوريا السورية:
   - قسم لوحة التحكم (/dashboard): ملخص العلامات والتقدم الحقيقي.
   - بنك الامتحانات الوزارية (/dashboard/exams): حل الدورات السابقة وسلالم التصحيح.
   - المواد الدراسية (/subjects): دروس ملخصة واختبارات تفاعلية.
   - المكتبة الشاملة (/library): ملخصات PDF وشروحات الأساتذة.
   - المنتدى التعليمي (/forum) والدعم الفني (/support).

قواعد الإجابة:
- أجِب دائماً باللغة العربية الفصحى السليمة والخالية من الأخطاء النحوية أو الإملائية.
- نسّق الإجابة باستخدام نقاط واضح ورسومات توضيحية أو صيغ رياضية بأسلوب Markdown نظيف (مثل: **القانون**، **الخطوات**، **النتيجة**).
- إذا سألك الطالب عن أي شيء في موقع المنصة، وجهه بدقة إلى القسم المخصص في الموقع.
- كُن إيجابياً ومحفزاً دائماً لرفع معنويات الطالب ومساعدته على نيل التميز في البكالوريا!`;

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
          temperature: 0.6,
          max_tokens: 1200,
          top_p: 0.9,
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
