import Link from 'next/link';
import React from 'react';

interface Subject {
  id: number;
  name: string;
  description: string;
  image_url: string | null;
}

interface RecommendedCoursesProps {
  subjects: Subject[];
}

export default function RecommendedCourses({ subjects }: RecommendedCoursesProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h3 className="text-3xl font-display font-normal text-foreground">مقرراتي الدراسية التفاعلية</h3>
        <Link href="/subjects" className="liquid-glass-glow rounded-full px-6 py-2.5 text-xs font-medium text-foreground hover:scale-[1.03] transition-transform">
          تصفح كافة المواد →
        </Link>
      </div>

      {subjects.length === 0 ? (
        <div className="liquid-glass rounded-3xl p-12 text-center text-muted-foreground text-sm border border-white/10">
          لا توجد مواد تطابق بحثك أو لم تقم باختيار مسار بعد.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((sub) => {
            return (
              <Link
                key={sub.id}
                href={`/subjects/${sub.id}`}
                className="liquid-glass-glow rounded-3xl p-6 flex flex-col justify-between h-[220px] border border-white/15 hover:scale-[1.03] transition-transform group cursor-pointer"
              >
                <div className="space-y-3 text-right">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-400/20 px-3 py-1 rounded-full inline-block">
                      مقرر وزارية متاح
                    </span>
                    <span className="text-xs text-muted-foreground">تغطية شاملة</span>
                  </div>
                  <h4 className="text-2xl font-display font-normal text-foreground group-hover:text-cyan-200 transition-colors line-clamp-1">
                    {sub.name}
                  </h4>
                </div>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 max-w-[75%]">
                    {sub.description || 'تصفح الدروس، الشروحات التفاعلية، وبنك الاختبارات المؤتمتة.'}
                  </p>
                  <span className="p-3 rounded-full bg-white/10 text-foreground group-hover:bg-cyan-500 group-hover:text-black transition-all">
                    ←
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
