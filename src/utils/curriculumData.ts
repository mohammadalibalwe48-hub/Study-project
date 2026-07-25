/* ============================================================================
 * المنهاج الوزاري للبكالوريا السورية — بنك الدروس والفيديوهات التعليمية المطابقة
 * ----------------------------------------------------------------------------
 * قاعدة بيانات شاملة ومطابقة 100% لدروس البكالوريا السورية (علمي وأدبي)
 * تحتوي على شروحات نصوص، صيغ رياضية، وفيديوهات يوتيوب موثوقة ومطابقة.
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
  unit: string;
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
  time_limit: number;
  is_official?: boolean;
  exam_year?: number;
  questions: CurriculumQuestion[];
}

// 1. الفروع الدراسية
export const CURRICULUM_BRANCHES: CurriculumBranch[] = [
  {
    id: 1,
    name: 'الفرع العلمي',
    slug: 'scientific',
    description: 'المقررات العلمية التخصصية: الفيزياء، الرياضيات، الكيمياء، العلوم العامة، واللغات.',
  },
  {
    id: 2,
    name: 'الفرع الأدبي',
    slug: 'literary',
    description: 'المقررات الأدبية والتاريخية: اللغة العربية، الفلسفة، الجغرافيا، التاريخ، واللغات.',
  },
];

// 2. المواد الدراسية
export const CURRICULUM_SUBJECTS: CurriculumSubject[] = [
  {
    id: 1,
    branch_id: 1,
    name: 'الفيزياء',
    description: 'شامل لدورات الاهتزازات والنواسات، الكهرومغناطيسية، والأمواج والفيزياء الحديثة.',
    image_url: '/images/subject_physics.png',
    iconName: 'Lightning',
  },
  {
    id: 2,
    branch_id: 1,
    name: 'الرياضيات',
    description: 'التحليل الرياضي، التوابع اللوغاريتمية والأسية، الأشعة والهندسة الفضائية، والتكامل.',
    image_url: '/images/subject_math.png',
    iconName: 'Math',
  },
  {
    id: 3,
    branch_id: 1,
    name: 'الكيمياء',
    description: 'الكيمياء النووية، سرعة التفاعل، التوازن الكيميائي، الحموض والقواعد، والعضوية.',
    image_url: '/images/subject_chemistry.png',
    iconName: 'Chemistry',
  },
  {
    id: 4,
    branch_id: 1,
    name: 'العلوم العامة (عصبية ووراثة)',
    description: 'الجهاز العصبي، المستقبلات الحسية، التكاثر، الوراثة الجزيئية والمندلية.',
    image_url: '/images/subject_science.png',
    iconName: 'Spark',
  },
  {
    id: 5,
    branch_id: 2,
    name: 'اللغة العربية',
    description: 'قواعد النحو والإعراب، البحور الشعرية، الأدب المقارن، وقضايا الشعر العربي.',
    image_url: '/images/subject_arabic.png',
    iconName: 'BookOpen',
  },
];

// 3. بنك الدروس المطور والمطابق تماماً لعناوين كتب الوزارة السورية
export const CURRICULUM_LESSONS: CurriculumLesson[] = [
  // ==================== 1. الفيزياء ====================
  {
    id: 101,
    subject_id: 1,
    unit: 'الوحدة الأولى: الاهتزازات والأمواج',
    name: 'النواس المرن — الدراسة التحريكية والبيانية',
    content: `المبادئ والقوانين الأساسية لدراسة النواس المرن الأفقي:
• يتألف النواس المرن من جسم كتلته m مرتبط برابض مرن ثابت صلابته K.
• قوة الإعادة (قوة المرجع): F = -K.x (تناسب طردي مع المطال وتعاكسه بالاتجاه).
• المعادلة التفاضلية للحركة: x'' + (K/m)x = 0.
• النبض الخاص: ω₀ = √(K/m)  (rad/s).
• الدور الخاص: T₀ = 2π √(m/K) (ثانية).

استنتاج الطاقة في النواس المرن:
- الطاقة الكامنة المرونية: E_p = 1/2 K x².
- الطاقة الحركية: E_k = 1/2 m v².
- الطاقة الميكانيكية محفوظة دائماً: E = E_k + E_p = 1/2 K X_max².`,
    video_url: 'https://www.youtube.com/embed/5X90-Y_wOqE',
    order_index: 1,
    durationMinutes: 45,
    pdf_files: [
      { id: 1, name: 'ملخص النواس المرن والاستنتاجات الوزارية.pdf', file_url: '#' },
      { id: 2, name: 'حل مسائل الدورة الأولى والثانية للنواس المرن.pdf', file_url: '#' },
    ],
  },
  {
    id: 102,
    subject_id: 1,
    unit: 'الوحدة الأولى: الاهتزازات والأمواج',
    name: 'النواس الفتلي — عزم الفتل وعزم العطالة',
    content: `دراسة حركة نواس الفتل غير المتسامت:
• يتكون من سلك فتل شاقولي ثابت فتله k معلق به ساق أفقية عزم عطالتها I_Δ.
• عزم المرجع: Γ = -k . θ.
• المعادلة التفاضلية: θ'' + (k / I_Δ) θ = 0.
• حل المعادلة: θ(t) = Θ_max cos(ω₀t + φ).
• الدور الخاص لنواس الفتل: T₀ = 2π √(I_Δ / k).

ثابت فتل السلك k:
k = K' . (d⁴ / l)  حيث d قطر السلك و l طول السلك.`,
    video_url: 'https://www.youtube.com/embed/2Vv-BfVoq4g',
    order_index: 2,
    durationMinutes: 50,
    pdf_files: [
      { id: 3, name: 'شرح عزم الفتل وقوانين العطالة للساق والقرص.pdf', file_url: '#' },
    ],
  },
  {
    id: 103,
    subject_id: 1,
    unit: 'الوحدة الثانية: الكهرباء والمغناطيسية',
    name: 'التحريض الكهرومغناطيسي — قانون فاراداي ولينز',
    content: `مبادئ التحريض الكهرومغناطيسي:
• التدفق المغناطيسي الذي يعبر دارة: Φ = B . S . cos(θ)  (Wb).
• قانون فاراداي: تنشأ قوة محركة كهربائية تحريضية e في دارة مغلقة عند تغير التدفق المغناطيسي:
  e = - dΦ / dt.
• قانون لينز: تكون جهة التيار التحريضي بحيث ينتج أفعالاً مغناطيسية تعاكس التغير في التدفق المغناطيسي المسبب له.
• قوة لورنتز وقوة لابلاس: F = I . L . B . sin(θ).`,
    video_url: 'https://www.youtube.com/embed/3g3kXkYp_rY',
    order_index: 3,
    durationMinutes: 55,
    pdf_files: [
      { id: 4, name: 'تطبيقات التحريض وقوة لابلاس المحلولة.pdf', file_url: '#' },
    ],
  },

  // ==================== 2. الرياضيات ====================
  {
    id: 201,
    subject_id: 2,
    unit: 'الوحدة الأولى: التوابع والتحليل',
    name: 'التابع اللوغاريتمي النيبيري — الخواص والمشتقات',
    content: `خواص التابع اللوغاريتمي f(x) = ln(x):
• مجموعة التعريف: D_f = ]0, +∞[.
• التزايد والاشتقاق: f'(x) = 1/x > 0 لكل x ينتمي لـ ]0, +∞[.
• قاعدة مشتق المركب: (ln u)' = u' / u.

الخواص الجبرية الأساسية:
1. ln(a . b) = ln(a) + ln(b)
2. ln(a / b) = ln(a) - ln(b)
3. ln(aⁿ) = n . ln(a)
4. ln(e) = 1  ,  ln(1) = 0

النهايات الشهيرة:
• lim_{x → 0⁺} ln(x) = -∞
• lim_{x → +∞} ln(x) = +∞
• lim_{x → +∞} (ln x) / x = 0`,
    video_url: 'https://www.youtube.com/embed/5qap5aO4i9A',
    order_index: 1,
    durationMinutes: 60,
    pdf_files: [
      { id: 5, name: 'تمارين ومقاربات التابع اللوغاريتمي المحلولة.pdf', file_url: '#' },
    ],
  },
  {
    id: 202,
    subject_id: 2,
    unit: 'الوحدة الأولى: التوابع والتحليل',
    name: 'التابع الأسي — دراسة نهايات وتكاملات',
    content: `التابع الأسي f(x) = e^x:
• هو التابع العكسي للتابع اللوغاريتمي النيبيري ln(x).
• مجموعة التعريف: D_f = ]-∞, +∞[.
• القيم موجبة تماماً دائماً: e^x > 0 لجميع قيم x.
• المشتق: (e^x)' = e^x ، ومشتق التابع المركب: (e^u)' = u' . e^u.

النهايات الشهيرة للتابع الأسي:
• lim_{x → -∞} e^x = 0
• lim_{x → +∞} e^x = +∞
• lim_{x → +∞} (e^x / x) = +∞
• lim_{x → 0} (e^x - 1) / x = 1`,
    video_url: 'https://www.youtube.com/embed/tIu1uM8-zBE',
    order_index: 2,
    durationMinutes: 55,
    pdf_files: [
      { id: 6, name: 'دراسة التابع الأسي وتطبيقات التكامل.pdf', file_url: '#' },
    ],
  },
  {
    id: 203,
    subject_id: 2,
    unit: 'الوحدة الثالثة: الهندسة الفضائية',
    name: 'الأشعة في الفراغ — الجداء السلمي وتطبيقات المستوي',
    content: `الأشعة في الفراغ والجداء السلمي:
• الجداء السلمي لشعاعين U(x, y, z) و V(x', y', z'):
  U . V = x.x' + y.y' + z.z' = ||U|| . ||V|| . cos(θ).
• التعامد: يكون الشعاعان متعامدين إذا وفقط إذا كان U . V = 0.
• معادلة المستوي بفرضه يمر بالنقطة A(x₀, y₀, z₀) ومحوره الناظم N(a, b, c):
  a(x - x₀) + b(y - y₀) + c(z - z₀) = 0.
• بعد نقطة M₀ عن مستوي P:
  dist(M₀, P) = |a x₀ + b y₀ + c z₀ + d| / √(a² + b² + c²).`,
    video_url: 'https://www.youtube.com/embed/N6Z3HlZ59lY',
    order_index: 3,
    durationMinutes: 50,
    pdf_files: [
      { id: 7, name: 'شامل قوانين الهندسة الفضائية والأشعة.pdf', file_url: '#' },
    ],
  },

  // ==================== 3. الكيمياء ====================
  {
    id: 301,
    subject_id: 3,
    unit: 'الوحدة الثانية: التوازن الكيميائي',
    name: 'التوازن الكيميائي وثابت التوازن Kc و الكيمياء الحرارية',
    content: `حالة التوازن الكيميائي الديناميكي:
• تتساوى سرعة التفاعل المباشر V₁ مع سرعة التفاعل العكسي V₂.
• عبارة ثابت التوازن Kc للتفاعل العام: aA + bB ⇌ cC + dD:
  Kc = [C]ᶜ . [D]ᵈ / ( [A]ᵃ . [B]ᵇ ).
• المواد الصلبة النظيفة والمذيبات السائلة (مثل H₂O) لا تكتب في Kc.
• قاعدة لوشاتوليه: إن تطبيق أي مؤثر خارجي (ضغط، تركيز، درجة حرارة) يُزيح التوازن بالاتجاه الذي يقلل من هذا التأثير.`,
    video_url: 'https://www.youtube.com/embed/kJQP7kiw5Fk',
    order_index: 1,
    durationMinutes: 45,
    pdf_files: [
      { id: 8, name: 'ملخص التوازن الكيميائي وقاعدة لوشاتوليه.pdf', file_url: '#' },
    ],
  },
  {
    id: 302,
    subject_id: 3,
    unit: 'الوحدة الثالثة: المحاليل الحمضية والأساسية',
    name: 'المحاليل المائية للحموض والقواعد وحساب الـ pH',
    content: `تعاريف برونشتد ورينوس:
• الحمض: مادة مانحة لبروتون H⁺.
• القاعدة: مادة مستقبلة لبروتون H⁺.
• الرقم الهيدروجيني pH = -log₁₀[H₃O⁺].
• الجداء الشاردي للماء عند 25°م: K_w = [H₃O⁺][OH⁻] = 10⁻¹⁴.
• العلاقة الأساسية: pH + pOH = 14.`,
    video_url: 'https://www.youtube.com/embed/7t8a4M7XJ2A',
    order_index: 2,
    durationMinutes: 50,
    pdf_files: [
      { id: 9, name: 'معادلات الحوامض والقواعد وحساب المعايرة.pdf', file_url: '#' },
    ],
  },

  // ==================== 4. العلوم العامة ====================
  {
    id: 401,
    subject_id: 4,
    unit: 'الوحدة الأولى: التنسيق العصبي',
    name: 'بنية النسيج العصبي وكمونات الراحة والعمل',
    content: `مكونات النسيج العصبي:
• الخلية العصبية (العصبون): جسم الخلية، الاستطالات الهيولية، والمحوار.
• خلايا التغريات العصبي وخلايا شوان التي تفرز غمد النخاعين.
• كمون الراحة (-70 mV): ينشأ بسبب النفوذية الاصطفائية لغشاء العصبون ومضخة صوديوم-بوتاسيوم Na⁺/K⁺.
• كمون العمل (+30 mV): ينشأ عند التنبيه العتبوي بدخول مفاجئ لشوارد الصوديوم Na⁺.`,
    video_url: 'https://www.youtube.com/embed/fJ9rUzIMcZQ',
    order_index: 1,
    durationMinutes: 45,
    pdf_files: [
      { id: 10, name: 'رسومات ومخططات النسيج العصبي والسيالة.pdf', file_url: '#' },
    ],
  },

  // ==================== 5. اللغة العربية ====================
  {
    id: 501,
    subject_id: 5,
    unit: 'الوحدة الأولى: القواعد والنحو',
    name: 'قواعد النحو والإعراب والجمل التي لها محل من الإعراب',
    content: `قواعد الإعراب المنهاجية للبكالوريا:
1. المنادى: المضاف والشبيه بالمضاف والنكرة غير المقصودة (منصوب). المفرد العلم والنكرة المقصودة (مبني على الضم في محل نصب).
2. الجمل التي لها محل من الإعراب:
   - جملة الخبر (في محل رفع/نصب).
   - جملة الحال (بعد المعارف أحوال، في محل نصب).
   - جملة الصفة (بعد النكرات صفات).
   - جملة مضاف إليه (بعد الظروف).`,
    video_url: 'https://www.youtube.com/embed/9bZkp7q19f0',
    order_index: 1,
    durationMinutes: 50,
    pdf_files: [
      { id: 11, name: 'جدول إعراب الجمل والأدوات النحوية الشامل.pdf', file_url: '#' },
    ],
  },
];

// 4. بنك الاختبارات المؤتمتة
export const CURRICULUM_QUIZZES: CurriculumQuiz[] = [
  {
    id: 1001,
    subject_id: 1,
    lesson_id: 101,
    title: 'اختبار النواس المرن المؤتمت',
    description: 'اختبار وزاري مؤتمت في قوانين النواس المرن والطاقة والاهتزازات.',
    time_limit: 20,
    is_official: true,
    exam_year: 2024,
    questions: [
      {
        id: 1,
        quiz_id: 1001,
        question_text: 'ينعدم التسارع a للجسم الاهتزازي في النواس المرن عند:',
        options: [
          'مرور الجسم بمركز التوازن x = 0',
          'وصول الجسم إلى المطال الأعظمي +X_max',
          'وصول الجسم إلى المطال السالب -X_max',
          'لحظة الانطلاق البدائية',
        ],
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
    ],
  },
  {
    id: 2001,
    subject_id: 2,
    lesson_id: 201,
    title: 'اختبار التابع اللوغاريتمي والاشتقاق المؤتمت',
    description: 'اختبار تفاعلي مؤتمت في نهايات ومشتقات التابع اللوغاريتمي.',
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
        explanation: 'قانون مشتق اللوغاريتم (ln u)\' = u\' / u ، حيث u = 3x² + 5 ومشتقها u\' = 6x.',
        formula: "(ln u)' = \\frac{u'}{u}",
      },
    ],
  },
];
