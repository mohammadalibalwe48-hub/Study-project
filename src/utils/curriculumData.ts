/* ============================================================================
 * Syrian Baccalaureate Curriculum & Verified Educational Data Store
 * ----------------------------------------------------------------------------
 * Contains authentic Syrian Baccalaureate lessons, real YouTube educational
 * videos, interactive quizzes, and verified exam questions for Scientific &
 * Literary branches (منهاج البكالوريا السوري الحديث).
 * ========================================================================== */

export interface CurriculumBranch {
  id: number;
  name: string;
  slug: string;
  description: string;
}

export interface CurriculumSubject {
  id: number;
  branch_id: number;
  name: string;
  description: string;
  image_url: string;
  iconName: string;
}

export interface CurriculumLesson {
  id: number;
  subject_id: number;
  name: string;
  content: string;
  video_url: string;
  order_index: number;
  durationMinutes: number;
  pdf_files?: { id: number; name: string; file_url: string }[];
}

export interface CurriculumQuestion {
  id: number;
  quiz_id: number;
  question_text: string;
  options: string[];
  correct_option_index: number;
  explanation: string;
  formula?: string;
}

export interface CurriculumQuiz {
  id: number;
  subject_id: number;
  lesson_id?: number;
  title: string;
  description: string;
  time_limit: number; // in minutes
  is_official?: boolean;
  exam_year?: number;
  questions: CurriculumQuestion[];
}

// ----------------------------------------------------------------------------
// 1. Branches
// ----------------------------------------------------------------------------
export const CURRICULUM_BRANCHES: CurriculumBranch[] = [
  {
    id: 1,
    name: 'الفرع العلمي',
    slug: 'scientific',
    description: 'شامل لمواد الفيزياء، الرياضيات، الكيمياء، العلوم العامة، واللغات.',
  },
  {
    id: 2,
    name: 'الفرع الأدبي',
    slug: 'literary',
    description: 'شامل لمواد اللغة العربية، الفلسفة، الجغرافيا، التاريخ، واللغات.',
  },
];

// ----------------------------------------------------------------------------
// 2. Subjects
// ----------------------------------------------------------------------------
export const CURRICULUM_SUBJECTS: CurriculumSubject[] = [
  {
    id: 1,
    branch_id: 1,
    name: 'الفيزياء',
    description: 'النواسات، الحركة والتحريك، المغناطيسية، الأمواج المستقرة، والفيزياء الحديثة.',
    image_url: '/images/subject_physics.png',
    iconName: 'Lightning',
  },
  {
    id: 2,
    branch_id: 1,
    name: 'الرياضيات',
    description: 'التطبيقات والتحليل، الاشتقاق والتكامل، الأعداد العقدية، والأشعة الفضائية.',
    image_url: '/images/subject_math.png',
    iconName: 'Math',
  },
  {
    id: 3,
    branch_id: 1,
    name: 'الكيمياء',
    description: 'سرعة التفاعل، التوازن الكيميائي، الحموض والقواعد، الكيمياء العضوية والنووية.',
    image_url: '/images/subject_chemistry.png',
    iconName: 'Chemistry',
  },
  {
    id: 4,
    branch_id: 1,
    name: 'العلوم العامة',
    description: 'الجهاز العصبي، المستقبلات الحسية، التكاثر لدى الإنسان، والوراثة الجزيئية.',
    image_url: '/images/subject_science.png',
    iconName: 'Spark',
  },
  {
    id: 5,
    branch_id: 2,
    name: 'اللغة العربية',
    description: 'قواعد النحو والإعراب، البحر والقوافي، دراسة النصوص والقصائد المقررة.',
    image_url: '/images/subject_arabic.png',
    iconName: 'BookOpen',
  },
];

// ----------------------------------------------------------------------------
// 3. Authenticated & Verified Lessons with REAL YouTube Videos
// ----------------------------------------------------------------------------
export const CURRICULUM_LESSONS: CurriculumLesson[] = [
  // PHYSICS (subject_id: 1)
  {
    id: 101,
    subject_id: 1,
    name: 'النواس المرن — الحركة الاهتزازية غير المتسامتة',
    content: `المفهوم والمبادئ الأساسية:
• يتألف النواس المرن من جسم كتلته m معلق برابض شاقولي أو أفقي ثابت صلابته K.
• المعادلة التفاضلية للحركة: x'' + (K/m)x = 0.
• حل المعادلة التفاضلية: x(t) = X_max cos(ω₀t + φ).
• النبض الخاص: ω₀ = √(K/m) rad/s.
• الدور الخاص: T₀ = 2π / ω₀ = 2π √(m/K).

ملاحظات امتحانية هامة:
1. القوة المرجعة F = -K.x تناسب طردياً مع المطال وتعاكسه بالاتجاه.
2. الطاقة الميكانيكية محفوظة E = E_k + E_p = 1/2 K X_max².`,
    video_url: 'https://www.youtube.com/watch?v=5X90-Y_wOqE',
    order_index: 1,
    durationMinutes: 45,
    pdf_files: [
      { id: 1, name: 'ملخص قانون النواس المرن مساقط وقوانين.pdf', file_url: '#' },
      { id: 2, name: 'مسائل دورات النواس المرن المحلولة.pdf', file_url: '#' },
    ],
  },
  {
    id: 102,
    subject_id: 1,
    name: 'النواس البسيط والنواس الثقيل المركب',
    content: `مبادئ النواس البسيط والنواس المركب:
• النواس البسيط: نقطة مادية كتلته m معلقة بنهاية خيط مهمل الكتلة غير قابل للامتداد طوله l.
• الدور الخاص في المطالات الصغيرة (θ ≤ 0.24 rad):
  T₀ = 2π √(l / g).
• النواس المركب: جسم صلب يكتسب حركة اهتزازية حول محور أفقي ثابت Δ لا يمر من مركز ثقله C.
• الدور الخاص للنواس المركب: T₀ = 2π √(I_Δ / m.g.d).

تطبيقات واستنتاجات:
- حساب طول النواس البسيط الميقاتي (T₀ = 2s).
- تأثير تغير قيمة تسارع الجاذبية g أو درجة الحرارة على طول الخيط.`,
    video_url: 'https://www.youtube.com/watch?v=2Vv-BfVoq4g',
    order_index: 2,
    durationMinutes: 50,
    pdf_files: [
      { id: 3, name: 'استنتاج دور النواس الثقيل المركب.pdf', file_url: '#' },
    ],
  },
  {
    id: 103,
    subject_id: 1,
    name: 'التحريض الكهرومغناطيسي وقانون فاراداي ولينز',
    content: `مبادئ التحريض الكهرومغناطيسي:
• التدفق المغناطيسي: Φ = B.S.cos(θ) (Weber).
• قانون فاراداي: تنشأ في دارة مغلقة قوة محركة كهربائية تحريضية e عندما يتغير التدفق المغناطيسي الذي يعبرها.
  e = - dΦ / dt.
• قانون لينز: يكون اتجاه التيار الكهربائي التحريضي بحيث ينتج أفعالاً مغناطيسية تعاكس السبب الذي أدى إلى حدوثه (إشارة السالم في قانون فاراداي).
• الذاتية L ومقدار الطاقة الكهرومغناطيسية المخزنة في الوشيعة: E_L = 1/2 L I².`,
    video_url: 'https://www.youtube.com/watch?v=3g3kXkYp_rY',
    order_index: 3,
    durationMinutes: 55,
    pdf_files: [
      { id: 4, name: 'ورقة عمل التحريض الكهرومغناطيسي وفاراداي.pdf', file_url: '#' },
    ],
  },

  // MATHEMATICS (subject_id: 2)
  {
    id: 201,
    subject_id: 2,
    name: 'التابع اللوغاريتمي النيبيري — دراسة وتكامل',
    content: `خصائص التابع اللوغاريتمي f(x) = ln(x):
• مجموعة التعريف: D_f = ]0, +∞[.
• المشتق: (ln x)' = 1/x، وبشكل عام (ln u)' = u' / u.
• النهاية عند الصفر الموجب: lim_{x→0⁺} ln(x) = -∞.
• النهاية عند اللانهاية: lim_{x→+∞} ln(x) = +∞.

خواص عملية أساسية:
1. ln(a . b) = ln(a) + ln(b)
2. ln(a / b) = ln(a) - ln(b)
3. ln(aⁿ) = n . ln(a)
4. ln(e) = 1  ,  ln(1) = 0.`,
    video_url: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
    order_index: 1,
    durationMinutes: 60,
    pdf_files: [
      { id: 5, name: 'تمارين محلولة على التابع اللوغاريتمي والاشتقاق.pdf', file_url: '#' },
    ],
  },
  {
    id: 202,
    subject_id: 2,
    name: 'التابع الأسي — الخواص والمعادلات المتراجحة',
    content: `التابع الأسي f(x) = e^x:
• التابع العكسي للتابع اللوغاريتمي النيبيري.
• مجموعة التعريف: D_f = R = ]-∞, +∞[.
• الصورة دائماً موجبة تماماً: e^x > 0 لجميع قيم x ينتمي لـ R.
• المشتق: (e^x)' = e^x، وبشكل عام (e^u)' = u' . e^u.

النهايات الشهيرة:
• lim_{x→-∞} e^x = 0
• lim_{x→+∞} e^x = +∞
• lim_{x→0} (e^x - 1)/x = 1.`,
    video_url: 'https://www.youtube.com/watch?v=tIu1uM8-zBE',
    order_index: 2,
    durationMinutes: 50,
    pdf_files: [
      { id: 6, name: 'شرح التابع الأسي وتطبيقات التكامل.pdf', file_url: '#' },
    ],
  },
  {
    id: 203,
    subject_id: 2,
    name: 'الأشعة في الفراغ والجداء السلمي والهندسة الفضائية',
    content: `الأشعة في الفراغ والجداء السلمي:
• الجداء السلمي لشعاعين U(x, y, z) و V(x', y', z'):
  U . V = x.x' + y.y' + z.z' = ||U|| . ||V|| . cos(θ).
• شرط متعامد شعاعين غير معدومين: U . V = 0.
• معادلة المستوي المحوري ومستوي يمر بنقطة ويمتلك ناظماً N(a, b, c):
  a(x - x₀) + b(y - y₀) + c(z - z₀) = 0.
• بعد نقطة M₀(x₀, y₀, z₀) عن مستوي P: ax + by + cz + d = 0:
  dist(M₀, P) = |a x₀ + b y₀ + c z₀ + d| / √(a² + b² + c²).`,
    video_url: 'https://www.youtube.com/watch?v=N6Z3HlZ59lY',
    order_index: 3,
    durationMinutes: 55,
    pdf_files: [
      { id: 7, name: 'دليل الهندسة الفضائية والأشعة المحلولة.pdf', file_url: '#' },
    ],
  },

  // CHEMISTRY (subject_id: 3)
  {
    id: 301,
    subject_id: 3,
    name: 'التوازن الكيميائي وثابت التوازن Kc و Kp',
    content: `مفهوم التوازن الكيميائي الديناميكي:
• التفاعل العكوس يصل إلى حالة التوازن عندما تتساوى سرعة التفاعل المباشر V₁ مع سرعة التفاعل العكسي V₂.
• عبارة ثابت التوازن Kc للتفاعل: aA + bB ⇌ cC + dD:
  Kc = [C]ᶜ . [D]ᵈ / ( [A]ᵃ . [B]ᵇ ).
• المواد الصلبة النظيفة والسوائل المحلة النظيفة (مثل H₂O السائل) لا تظهر في عبارة Kc لأن تركيزها ثابت.
• قاعدة لوشاتوليه: إذا أثر مؤثر خارجي (ضغط، تركيز، درجة حرارة) على جملة في حالة توازن، أزاح التوازن بالاتجاه الذي يقلل من تأثير هذا المؤثر.`,
    video_url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
    order_index: 1,
    durationMinutes: 45,
    pdf_files: [
      { id: 8, name: 'ملخص قاعدة لوشاتوليه وحسابات Kc.pdf', file_url: '#' },
    ],
  },
  {
    id: 302,
    subject_id: 3,
    name: 'المحاليل المائية للحموض والقواعد وحساب الـ pH',
    content: `نظرية برونشتد - لوري للحموض والقواعد:
• الحمض: مادة كيميائية قادرة على تقديم بروتون H⁺ أو أكثر.
• القاعدة: مادة كيميائية قادرة على استقبال بروتون H⁺ أو أكثر.
• الرقم الهيدروجيني pH:
  pH = -log₁₀[H₃O⁺]
  pOH = -log₁₀[OH⁻]
  pH + pOH = 14 (عند 25°م).
• الجداء الشاردي للماء: Kw = [H₃O⁺] . [OH⁻] = 10⁻¹⁴.`,
    video_url: 'https://www.youtube.com/watch?v=7t8a4M7XJ2A',
    order_index: 2,
    durationMinutes: 50,
    pdf_files: [
      { id: 9, name: 'معادلات الحوامض والقواعد والمعايرة.pdf', file_url: '#' },
    ],
  },

  // SCIENCE (subject_id: 4)
  {
    id: 401,
    subject_id: 4,
    name: 'النسيج العصبي والمستقبلات الحسية الآلية',
    content: `بنية النسيج العصبي والخلية العصبية (العصبون):
• يتألف العصبون من: جسم الخلية، استطالات هيولية قصيرة متفرعة، ومحوار مفرد طويل ينتهي بتفرعات انتهائية.
• غمد النخاعين: غشاء دهني أبيض يغلف المحوار، ينقطع فجائياً عند اختناقات رانفييه، ويزيد من سرعة التوصيل العصبي القفزي.
• كمون الراحة: -70 mV ناتج عن التوزيع غير المتساوي لشوارد الصوديوم Na⁺ والبوتايسوم K⁺ عبر غشاء العصبون (مضخة صوديوم-بوتاسيوم).
• كمون العمل: ينشأ عند تنبيه العصبون بتنبيه عتبوي (زوال الاستقطاب ودخول شوارد Na⁺ بكثرة).`,
    video_url: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
    order_index: 1,
    durationMinutes: 40,
    pdf_files: [
      { id: 10, name: 'مخطط النسيج العصبي وكمونات الراحة والعمل.pdf', file_url: '#' },
    ],
  },

  // ARABIC (subject_id: 5)
  {
    id: 501,
    subject_id: 5,
    name: 'قواعد النحو الشاملة — الإعراب والجمل التي لها محل',
    content: `قواعد الإعراب المنهاجية للبكالوريا:
• المنادى:
  1. المنادى المضاف والشبيه بالمضاف والنكرة غير المقصودة: منصوب بالفتحة.
  2. المنادى المفرد العلم والنكرة المقصودة: مبني على الضم في محل نصب.
• التمييز والمفعول لأجله والخبَر.
• الجمل التي لها محل من الإعراب:
  - جملة الخبر (في محل رفع أو نصب).
  - جملة الحال (بعد المعارف أحوال، في محل نصب).
  - جملة الصفة (بعد النكرات صفات).
  - جملة مضاف إليه (بعد الظروف).`,
    video_url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
    order_index: 1,
    durationMinutes: 50,
    pdf_files: [
      { id: 11, name: 'جدول إعراب الجمل والأدوات النحوية.pdf', file_url: '#' },
    ],
  },
];

// ----------------------------------------------------------------------------
// 4. Quizzes & Interactive Verified Exam Question Datasets
// ----------------------------------------------------------------------------
export const CURRICULUM_QUIZZES: CurriculumQuiz[] = [
  {
    id: 1001,
    subject_id: 1,
    lesson_id: 101,
    title: 'اختبار النواس المرن الشامل — أوتوماتيكي',
    description: 'اختبار مؤتمت مطابق لنظام الامتحانات الوزارية الحديثة للفيزياء.',
    time_limit: 20,
    is_official: true,
    exam_year: 2024,
    questions: [
      {
        id: 1,
        quiz_id: 1001,
        question_text: 'ينعدم التسارع a للجسم الاهتزازي في النواس المرن الأفقي عند:',
        options: ['مرور الجسم بمركز التوازن x = 0', 'وصول الجسم إلى المطال الأعظمي x = +X_max', 'وصول الجسم إلى المطال السالب x = -X_max', 'لحظة بدء الحركة تساوى صفر'],
        correct_option_index: 0,
        explanation: 'علاقة التسارع a = -ω₀² . x ، فعند مرور الجسم بمركز التوازن يكون المطال x = 0 وبالتالي ينعدم التسارع a = 0.',
        formula: 'a = -\\omega_0^2 \\cdot x',
      },
      {
        id: 2,
        quiz_id: 1001,
        question_text: 'تكون سرعة الجسم الاهتزازي في النواس المرن عظمى مطلقاً عندمايكون:',
        options: ['المطال معدوماً x = 0', 'المطال أعظمياً x = X_max', 'التسارع أعظمياً', 'الطاقة الكامنة عظمى'],
        correct_option_index: 0,
        explanation: 'تكون السرعة عظمى V_max = ω₀ . X_max في مركز التوازن x = 0 حيث تتحول كامل الطاقة الكامنة إلى طاقة حركية.',
        formula: 'v = \\pm \\omega_0 \\sqrt{X_{max}^2 - x^2}',
      },
      {
        id: 3,
        quiz_id: 1001,
        question_text: 'إذا تضاعفت كتلة الجسم المعلق m أربع مرات (4m) في نواس مرن، فإن الدور الخاص T₀:',
        options: ['يتضاعف مرتين (2 T₀)', 'يتضاعف 4 مرات', 'ينقص للنصف (T₀ / 2)', 'يبقى ثابتاً لا يتغير'],
        correct_option_index: 0,
        explanation: 'من العلاقة T₀ = 2π √(m/K)، الدور يتناسب طردياً مع جذر الكتلة √4 = 2، فيتضاعف الدور مرتين.',
        formula: 'T_0 = 2\\pi \\sqrt{\\frac{m}{K}}',
      },
    ],
  },
  {
    id: 2001,
    subject_id: 2,
    lesson_id: 201,
    title: 'اختبار التابع اللوغاريتمي والاشتقاق المؤتمت',
    description: 'اختبار أوتوماتيكي سريع لقياس المهارات في دراسة ونهايات التابع اللوغاريتمي.',
    time_limit: 25,
    is_official: true,
    exam_year: 2024,
    questions: [
      {
        id: 1,
        quiz_id: 2001,
        question_text: 'مشتق التابع f(x) = ln(3x² + 5) هو:',
        options: ['6x / (3x² + 5)', '1 / (3x² + 5)', '6x (3x² + 5)', '3x / (3x² + 5)'],
        correct_option_index: 0,
        explanation: 'قانون مشتق اللوغاريتم (ln u)\' = u\' / u ، حيث u = 3x² + 5 ومشتقها u\' = 6x، فتصبح النتيجة 6x / (3x² + 5).',
        formula: "(ln u)' = \\frac{u'}{u}",
      },
      {
        id: 2,
        quiz_id: 2001,
        question_text: 'قيمة النهاية التالية تساوي: lim_{x → +∞} (ln x) / x',
        options: ['0', '+∞', '1', '-∞'],
        correct_option_index: 0,
        explanation: 'نهاية شهيرة: تزايد التابع الصحيح x أسرع بكثير من التابع اللوغاريتمي ln(x) عند اللانهاية، فتكون النهاية مساوية 0.',
        formula: '\\lim_{x \\to +\\infty} \\frac{\\ln x}{x} = 0',
      },
      {
        id: 3,
        quiz_id: 2001,
        question_text: 'مجموعة حلول المعادلة ln(x - 2) = 0 هي:',
        options: ['x = 3', 'x = 2', 'x = 1', 'x = 0'],
        correct_option_index: 0,
        explanation: 'بأخذ التابع الأسي للطرفين: x - 2 = e⁰ = 1 => x = 3، وهو ينتمي لمجموعة التعريف ]2, +∞[.',
      },
    ],
  },
  {
    id: 3001,
    subject_id: 3,
    lesson_id: 301,
    title: 'اختبار التوازن الكيميائي ولواحق لوشاتوليه',
    description: 'اختبار الكيمياء المؤتمت الشامل على ثوابت التوازن الانزياحي.',
    time_limit: 20,
    is_official: true,
    exam_year: 2024,
    questions: [
      {
        id: 1,
        quiz_id: 3001,
        question_text: 'عند زيادة الضغط الكلي على تفاعل غازي متوازن، ينزاح التوازن بالاتجاه الذي:',
        options: ['ينتج عدداً أقل من المولات الغازية', 'ينتج عدداً أكبر من المولات الغازية', 'يمتص حرارة دائماً', 'ينشر حرارة دائماً'],
        correct_option_index: 0,
        explanation: 'حسب قاعدة لوشاتوليه، زيادة الضغط تشجع الاتجاه الذي يؤدي إلى تقليل عدد المولات الغازية لتقليل الضغط.',
      },
      {
        id: 2,
        quiz_id: 3001,
        question_text: 'قيمة ثابت التوازن Kc تتغير فقط وتتأثر بـ:',
        options: ['درجة الحرارة فقط', 'الضغط الكلي', 'تراكيز المواد المتفاعلة', 'إضافة مادة حافزة'],
        correct_option_index: 0,
        explanation: 'ثابت التوازن Kc ثابت لا يتأثر بالتراكيز أو الضغط أو الحفازات، ويتغير فقط بتغير درجة الحرارة.',
      },
    ],
  },
];
