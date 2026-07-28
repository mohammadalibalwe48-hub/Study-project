'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Award, CheckCircle2, XCircle, HelpCircle, Send, Lightbulb, FileText, MessageSquare, RefreshCw } from 'lucide-react';
import { MathText } from './FormulaRenderer';

interface RubricItem {
  step: string;
  marks: string;
  detail: string;
}

interface AiRubricData {
  rubric: RubricItem[];
  detailedExplanation: string;
  examTip: string;
}

interface Question {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  points: number;
  explanation: string;
}

interface AiRubricModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
  userAnswerIndex?: number;
  subjectName?: string;
  year?: string;
  track?: string;
}

export default function AiRubricModal({
  isOpen,
  onClose,
  question,
  userAnswerIndex,
  subjectName,
  year,
  track,
}: AiRubricModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AiRubricData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Follow-up chat state
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !question) return;

    async function fetchAnalysis() {
      setLoading(true);
      setError(null);
      setData(null);
      setChatMessages([]);

      try {
        const res = await fetch('/api/explain-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionText: question?.question,
            options: question?.options,
            correctAnswerIndex: question?.correctIndex,
            userAnswerIndex,
            subjectName: subjectName || 'البكالوريا السورية',
            year: year || 'الوزارية',
            explanation: question?.explanation,
            track,
          }),
        });

        if (!res.ok) {
          throw new Error('فشل تحميل تحليل سلم التصحيح');
        }

        const result = await res.json();
        setData({
          rubric: result.rubric || [],
          detailedExplanation: result.detailedExplanation || question?.explanation || '',
          examTip: result.examTip || 'تأكد من قراءة السؤال بدقة وكتابة الوحدات والخطوات بالترتيب.',
        });
      } catch (err: any) {
        console.error('Error fetching AI rubric:', err);
        setError('تعذر تحميل تحليل الذكاء الاصطناعي الآن. يمكنك الاستعانة بالتوضيح الأولي.');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalysis();
  }, [isOpen, question, userAnswerIndex, subjectName, year, track]);

  if (!isOpen || !question || !mounted) return null;

  const isCorrect = userAnswerIndex === question.correctIndex;
  const isSkipped = userAnswerIndex === undefined;
  const correctAnswerText = question.options[question.correctIndex] || '';
  const userAnswerText = userAnswerIndex !== undefined ? question.options[userAnswerIndex] : 'لم يتم الإجابة';

  async function handleSendFollowUp(e: React.FormEvent) {
    e.preventDefault();
    if (!followUpQuery.trim() || chatLoading) return;

    const userText = followUpQuery.trim();
    setFollowUpQuery('');
    setChatMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setChatLoading(true);

    try {
      const prompt = `حول سؤال مادة (${subjectName || 'البكالوريا'}): "${question?.question}" 
الإجابة الصحيحة هي: "${correctAnswerText}". 
استفسار الطالب: "${userText}"`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      });

      if (!response.ok) throw new Error('فشل الرد');

      const chatData = await response.json();
      setChatMessages((prev) => [
        ...prev,
        { sender: 'ai', text: chatData.reply || 'أتمنى أن يكون الشرح واضحاً لك يا بطل!' },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { sender: 'ai', text: 'تعذر الرد حالياً. يمكنك إعادة طرح السؤال لاحقاً.' },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
      dir="rtl"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-[#282825] bg-[#fafaf7] p-6 sm:p-8 shadow-[8px_8px_0_#282825] space-y-6 text-right">
        
        {/* Modal Header */}
        <header className="flex items-center justify-between border-b-2 border-[#282825]/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-[#282825] bg-[#ffd64d] shadow-[2px_2px_0_#282825]">
              <Sparkles className="h-6 w-6 text-[#ff5636]" />
            </span>
            <div>
              <h2 className="text-xl font-black text-[#282825]">سلم التصحيح والتحليل الذكي</h2>
              <p className="text-xs font-bold text-[#5f5f59]">مادة {subjectName || 'البكالوريا السورية'} • {year || 'دورة امتحانية'}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#282825] bg-white hover:bg-[#ff5636] hover:text-white transition-all shadow-[2px_2px_0_#282825] cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Question & Answer Overview Card */}
        <div className="rounded-2xl border-2 border-[#282825] bg-white p-5 shadow-[3px_3px_0_#282825] space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-black text-[#282825] leading-relaxed">
              <MathText text={question.question} />
            </h3>
            <span
              className={`px-3 py-1 text-xs font-black rounded-xl border-2 shrink-0 shadow-[1.5px_1.5px_0_#282825] flex items-center gap-1 ${
                isCorrect
                  ? 'bg-[#cce6b4] text-[#15803d] border-[#282825]'
                  : isSkipped
                  ? 'bg-[#ffd64d] text-[#282825] border-[#282825]'
                  : 'bg-[#ff5636] text-white border-[#282825]'
              }`}
            >
              {isCorrect ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> إجابة صحيحة (+{question.points})
                </>
              ) : isSkipped ? (
                <>
                  <HelpCircle className="w-3.5 h-3.5" /> سؤال غير مجاب
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" /> إجابة غير صحيحة
                </>
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-bold">
            <div className="bg-[#cce6b4]/30 border border-[#282825]/20 p-3 rounded-xl">
              <span className="text-[#15803d] font-black block mb-0.5">الإجابة النموذجية:</span>
              <MathText text={correctAnswerText} />
            </div>
            {!isCorrect && (
              <div className="bg-[#ff5636]/10 border border-[#282825]/20 p-3 rounded-xl">
                <span className="text-[#b91c1c] font-black block mb-0.5">إجابتك المسجلة:</span>
                <MathText text={userAnswerText} />
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-12 text-center space-y-4 rounded-2xl border-2 border-dashed border-[#282825] bg-white p-8">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#282825] border-t-[#ff5636]"></div>
            <p className="text-[#282825] text-sm font-black animate-pulse">
              جاري تحليل سلم التصحيح الوزاري بالذكاء الاصطناعي... 🤖
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="rounded-2xl border-2 border-[#282825] bg-[#ff5636]/10 p-4 text-xs font-bold text-[#b91c1c]">
            {error}
          </div>
        )}

        {/* AI Rubric Content */}
        {!loading && data && (
          <div className="space-y-6">
            
            {/* Official Scoring Rubric Table */}
            {data.rubric && data.rubric.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-black text-[#282825] flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#ff5636]" /> سلم التصحيح الوزاري المعتمد
                </h4>

                <div className="overflow-hidden rounded-2xl border-2 border-[#282825] shadow-[3px_3px_0_#282825] bg-white">
                  <table className="w-full text-right text-xs font-semibold">
                    <thead className="bg-[#ffd64d] border-b-2 border-[#282825] text-[#282825] font-black">
                      <tr>
                        <th className="p-3 border-l border-[#282825]/20">خطوة الحل / المعيار</th>
                        <th className="p-3 border-l border-[#282825]/20 w-24 text-center">الدرجة</th>
                        <th className="p-3">التفصيل والتنبيه الوزاري</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border-[#282825]/10">
                      {data.rubric.map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#fafaf7]">
                          <td className="p-3 font-black text-[#282825] border-l border-[#282825]/10">{item.step}</td>
                          <td className="p-3 font-black text-[#ff5636] text-center border-l border-[#282825]/10 bg-[#ffdc72]/20">
                            {item.marks}
                          </td>
                          <td className="p-3 text-[#5f5f59]">
                            <MathText text={item.detail} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Detailed Step-by-Step Explanation */}
            <div className="space-y-2">
              <h4 className="text-sm font-black text-[#282825] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#ff5636]" /> الشرح والتحليل المنطقي التفصيلي
              </h4>
              <div className="rounded-2xl border-2 border-[#282825] bg-[#bce9fa]/30 p-4 text-xs font-semibold text-[#282825] leading-relaxed shadow-[2.5px_2.5px_0_#282825]">
                <MathText text={data.detailedExplanation} />
              </div>
            </div>

            {/* Exam Pitfalls & Tips */}
            {data.examTip && (
              <div className="rounded-2xl border-2 border-[#282825] bg-[#d8bcff]/40 p-4 text-xs font-bold text-[#282825] space-y-1 shadow-[2.5px_2.5px_0_#282825]">
                <span className="font-black text-[#7c3aed] flex items-center gap-1.5 text-sm">
                  <Lightbulb className="w-4 h-4 fill-[#ffd64d] text-[#282825]" /> نصيحة امتحانية وزارية:
                </span>
                <p className="leading-relaxed">
                  <MathText text={data.examTip} />
                </p>
              </div>
            )}

            {/* Follow-up Interactive Chat */}
            <div className="space-y-3 pt-2 border-t-2 border-[#282825]/10">
              <h4 className="text-sm font-black text-[#282825] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#ff5636]" /> اسأل رفيق مسار الذكي حول هذا السؤال
              </h4>

              {chatMessages.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto p-3 rounded-2xl border-2 border-[#282825] bg-white">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl border border-[#282825] text-xs font-bold ${
                        msg.sender === 'user' ? 'bg-[#dcbcff] text-[#282825] mr-auto max-w-[85%]' : 'bg-[#ffd64d]/40 text-[#282825] ml-auto max-w-[85%]'
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="text-xs font-black text-[#ff5636] animate-pulse">جاري صياغة التوضيح... 🤖</div>
                  )}
                </div>
              )}

              <form onSubmit={handleSendFollowUp} className="flex gap-2">
                <input
                  type="text"
                  value={followUpQuery}
                  onChange={(e) => setFollowUpQuery(e.target.value)}
                  placeholder="مثال: كيف طبقنا القانون في الخطوة الثانية؟"
                  className="w-full rounded-xl border-2 border-[#282825] bg-white p-3 text-xs font-semibold placeholder-[#77776f] shadow-[2px_2px_0_#282825] focus:outline-none focus:border-[#ff5636]"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !followUpQuery.trim()}
                  className="app-button border-2 border-[#282825] bg-[#ff5636] text-white px-5 py-2.5 text-xs font-black shadow-[2px_2px_0_#282825] hover:shadow-[3.5px_3.5px_0_#282825] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <span>استفسر</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

          </div>
        )}

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
