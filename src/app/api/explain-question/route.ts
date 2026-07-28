import { NextResponse } from 'next/server';
import { queryGroqBalanced } from '@/utils/groqLoadBalancer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      questionText,
      options,
      correctAnswerIndex,
      userAnswerIndex,
      subjectName,
      year,
      explanation,
      track,
    } = body;

    if (!questionText || !options || correctAnswerIndex === undefined) {
      return NextResponse.json({ error: 'بيانات السؤال غير مكتملة.' }, { status: 400 });
    }

    const correctAnswer = options[correctAnswerIndex] || '';
    const userAnswer = userAnswerIndex !== undefined && userAnswerIndex !== null ? options[userAnswerIndex] : 'لم يتم الإجابة';
    const isCorrect = userAnswerIndex === correctAnswerIndex;

    const prompt = `أنت الخبير الأول في سلالم التصحيح للامتحانات الوزارية السورية (البكالوريا - الفرع ${track === 'literary' ? 'الأدبي' : 'العلمي'}).
مطلوب منك تقديم تحليل شامل وسلم تصحيح رسمي للسؤال التالي من مادة (${subjectName || 'البكالوريا السورية'} - دورة ${year || 'الوزارية'}):

السؤال: ${questionText}
الخيارات:
${options.map((opt: string, idx: number) => `${idx + 1}. ${opt}`).join('\n')}

إجابة الطالب: ${userAnswer} ${isCorrect ? '(إجابة صحيحة ✅)' : '(إجابة خاطئة ❌)'}
الإجابة النموذجية الصحيحة: ${correctAnswer}
التوضيح الأولي: ${explanation || 'لا يوجد'}

قم بصياغة الإجابة بتنسيق JSON حصراً وبالشكل التالي دون أي مقدمات أو مؤخرات:
{
  "rubric": [
    { "step": "خطوة الإجابة / القانون", "marks": "علامة / درجة", "detail": "تفصيل الخطوة المطلوبة في سلم التصحيح" }
  ],
  "detailedExplanation": "شرح تفصيلي خطوة بخطوة باللغة العربية الفصحى الناصعة مع توضيح التعليل الرياضي أو العلمي أو اللغوي",
  "examTip": "نصيحة امتحانية هامة لتجنب الأخطاء الشائعة في هذا النوع من الأسئلة في الفحص الوزاري"
}`;

    try {
      const aiRawResponse = await queryGroqBalanced([
        {
          role: 'system',
          content: 'أنت مساعد متخصص في تحليل الامتحانات الوزارية للبكالوريا السورية وتنسيق سلالم التصحيح. أخرج إجابتك بتنسيق JSON فقط.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ]);

      // Extract and sanitize JSON from AI response (escape raw backslashes used in LaTeX)
      const jsonMatch = aiRawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let jsonStr = jsonMatch[0];
        // Fix unescaped backslashes inside JSON strings (e.g. \frac -> \\frac)
        jsonStr = jsonStr.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
        
        try {
          const parsed = JSON.parse(jsonStr);
          return NextResponse.json({
            success: true,
            rubric: parsed.rubric || [],
            detailedExplanation: parsed.detailedExplanation || explanation || 'لا يوجد شرح تفصيلي إضافي.',
            examTip: parsed.examTip || 'انتبه لصياغة الإجابة بدقة وحساب الوحدات النهائية.',
          });
        } catch (parseErr) {
          console.warn('JSON parsing retry with raw extraction:', parseErr);
        }
      }
    } catch (aiErr) {
      console.warn('AI call failed, using fallback rubric formatting:', aiErr);
    }

    // Fallback response if AI call fails or returns non-JSON
    const fallbackRubric = [
      {
        step: 'تحديد المعطيات والمفهوم الأساسي',
        marks: '25%',
        detail: `تحديد المطلوب في سؤال (${subjectName || 'المادة'}) بدقة.`,
      },
      {
        step: 'تطبيق القانون / القاعدة النموذجية',
        marks: '50%',
        detail: `الإجابة الصحيحة هي: "${correctAnswer}".`,
      },
      {
        step: 'الصياغة والتدقيق النهائي',
        marks: '25%',
        detail: 'مراجعة الخيارات وتجنب المشتتات المشابهة.',
      },
    ];

    return NextResponse.json({
      success: true,
      rubric: fallbackRubric,
      detailedExplanation: explanation || `الإجابة النموذجية هي "${correctAnswer}". يعتمد هذا السؤال على الفهم المباشر لأساسيات مادة ${subjectName || 'البكالوريا'}.`,
      examTip: 'في الامتحانات الوزارية، اقرأ جميع الخيارات بعناية قبل التظليل، واستبعد الإجابات المستحيلة أولاً.',
    });
  } catch (error) {
    console.error('Error in explain-question route:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم أثناء معالجة السؤال.' }, { status: 500 });
  }
}
