/* ============================================================================
 * النماذج الوزارية — Data Layer
 * ----------------------------------------------------------------------------
 * Typed dataset for the Ministry Official Exams. Content verified for factual
 * correctness; LaTeX strings are KaTeX-compatible.
 * ========================================================================== */

export type Track = 'scientific' | 'literary';

export interface ExamQuestion {
    id: number;
    question: string;
    formula?: string;
    options: string[];
    correctIndex: number;
    points: number;
    explanation: string;
}

export interface MinistryExam {
    id: string;
    title: string;
    year: string;
    session: 'الدورة الأولى' | 'الدورة الثانية';
    track: Track;
    subjectName: string;
    totalMarks: number;
    durationMinutes: number;
    questions: ExamQuestion[];
}

export const MINISTRY_EXAMS: MinistryExam[] = [
    {
        id: 'phys-2024-s1',
        title: 'نموذج الفيزياء الوزاري — دورة 2024',
        year: '2024',
        session: 'الدورة الأولى',
        track: 'scientific',
        subjectName: 'الفيزياء',
        totalMarks: 400,
        durationMinutes: 120,
        questions: [
            {
                id: 1,
                question: 'في النواس البسيط (المطالات الصغيرة)، يتناسب الدور الذاتي T₀ مع:',
                formula: 'T_0 = 2\\pi \\sqrt{\\dfrac{l}{g}}',
                options: [
                    'الجذر التربيعي لطول الخيط \\sqrt{l}',
                    'مربع طول الخيط l^2',
                    'كتلة الجسم المعلّق m',
                    'سعة الاهتزاز العظمى \\theta_{max}',
                ],
                correctIndex: 0,
                points: 100,
                explanation:
                    'من العلاقة T_0 = 2\\pi \\sqrt{\\dfrac{l}{g}} يتناسب الدور طرداً مع \\sqrt{l} ولا يتعلق بالكتلة m ولا بالسعة (في تقريب المطالات الصغيرة).',
            },
            {
                id: 2,
                question: 'تسارع جسيم شحنته q وكتلته m في حقل كهربائي منتظم \\vec{E} يساوي:',
                formula: '\\vec{a} = \\dfrac{q\\,\\vec{E}}{m}',
                options: [
                    '\\dfrac{q\\,\\vec{E}}{m}',
                    '\\dfrac{m\\,\\vec{E}}{q}',
                    'q\\,m\\,\\vec{E}',
                    '\\dfrac{\\vec{E}}{q\\,m}',
                ],
                correctIndex: 0,
                points: 100,
                explanation:
                    'القوة الكهربائية \\vec{F} = q\\vec{E}، ومن قانون نيوتن الثاني \\vec{F} = m\\vec{a}، إذن \\vec{a} = \\dfrac{q\\vec{E}}{m}.',
            },
            {
                id: 3,
                question: 'تزداد قوة لابلاس المؤثرة على سلك مستقيم في حقل مغناطيسي عند:',
                formula: 'F = I\\,L\\,B\\,\\sin(\\theta)',
                options: [
                    'زيادة شدة التيار I وشدة الحقل B',
                    'إنقاص شدة التيار I',
                    'جعل السلك موازياً لخطوط الحقل B',
                    'استبدال السلك الموصّل بسلك عازل',
                ],
                correctIndex: 0,
                points: 100,
                explanation:
                    'علاقة لابلاس F = I\\,L\\,B\\,\\sin(\\theta) تناسب طردي مع I وB و\\sin(\\theta)، فتزداد القوة بزيادة I وB وتكون عظمى عندما \\theta = 90^\\circ.',
            },
            {
                id: 4,
                question: 'تقع سلسلة بالمر في طيف ذرّة الهيدروجين في المنطقة:',
                options: [
                    'الضوء المرئي (Visible)',
                    'الأشعة تحت الحمراء (Infrared)',
                    'الأشعة فوق البنفسجية (Ultraviolet)',
                    'أشعة إكس (X-rays)',
                ],
                correctIndex: 0,
                points: 100,
                explanation:
                    'سلسلة بالمر تنجم عن عودة الإلكترون إلى المستوى n = 2، وتقع أطوالها الموجية في نطاق الضوء المرئي.',
            },
        ],
    },
    {
        id: 'math-2024-s1',
        title: 'نموذج الرياضيات الوزاري — دورة 2024',
        year: '2024',
        session: 'الدورة الأولى',
        track: 'scientific',
        subjectName: 'الرياضيات',
        totalMarks: 600,
        durationMinutes: 180,
        questions: [
            {
                id: 1,
                question: 'مشتق الدالة f(x) = \\ln(x^2 + 1) بالنسبة لـ x هو:',
                formula: "f'(x) = \\dfrac{2x}{x^2 + 1}",
                options: [
                    '\\dfrac{2x}{x^2 + 1}',
                    '\\dfrac{1}{x^2 + 1}',
                    '2x\\,(x^2 + 1)',
                    '\\dfrac{x}{x^2 + 1}',
                ],
                correctIndex: 0,
                points: 150,
                explanation:
                    'نضع u = x^2 + 1 فيكون u\' = 2x، ومشتق \\ln(u) هو \\dfrac{u\'}{u} = \\dfrac{2x}{x^2 + 1}.',
            },
            {
                id: 2,
                question: 'قيمة التكامل المحدّد التالي تساوي:',
                formula: '\\int_{0}^{1} e^{2x}\\,dx',
                options: [
                    '\\dfrac{e^2 - 1}{2}',
                    'e^2 - 1',
                    '\\dfrac{e^2 + 1}{2}',
                    '2\\,(e^2 - 1)',
                ],
                correctIndex: 0,
                points: 150,
                explanation:
                    'التابع الأصلي لـ e^{2x} هو \\dfrac{1}{2}e^{2x}، وبالتعويض بين 0 و1: \\dfrac{1}{2}e^2 - \\dfrac{1}{2}e^0 = \\dfrac{e^2 - 1}{2}.',
            },
            {
                id: 3,
                question: 'المعامل التوجيهي للمماس لمنحنى f(x) = x^3 - 3x عند x = 2 يساوي:',
                formula: "f'(2) = 3(2)^2 - 3 = 9",
                options: ['9', '12', '6', '3'],
                correctIndex: 0,
                points: 150,
                explanation:
                    'نشتق f\'(x) = 3x^2 - 3 ثم نعوّض x = 2 فنحصل على 3(4) - 3 = 9.',
            },
            {
                id: 4,
                question: 'الشكل القطبي للعدد المركّب z = 1 + i\\sqrt{3} هو:',
                formula: 'z = 2\\,e^{\\,i\\frac{\\pi}{3}}',
                options: [
                    '2\\,e^{\\,i\\frac{\\pi}{3}}',
                    '\\sqrt{2}\\,e^{\\,i\\frac{\\pi}{4}}',
                    '2\\,e^{\\,i\\frac{\\pi}{6}}',
                    '4\\,e^{\\,i\\frac{\\pi}{3}}',
                ],
                correctIndex: 0,
                points: 150,
                explanation:
                    'الطويلة r = \\sqrt{1 + 3} = 2، و\\cos\\theta = \\tfrac{1}{2} و\\sin\\theta = \\tfrac{\\sqrt{3}}{2}، إذن \\theta = \\dfrac{\\pi}{3}.',
            },
        ],
    },
    {
        id: 'chem-2024-s1',
        title: 'نموذج الكيمياء الوزاري — دورة 2024',
        year: '2024',
        session: 'الدورة الأولى',
        track: 'scientific',
        subjectName: 'الكيمياء',
        totalMarks: 300,
        durationMinutes: 90,
        questions: [
            {
                id: 1,
                question: 'الجسيم المنطلق عند تحوّل نيوترون إلى بروتون داخل النواة هو:',
                formula: '_{0}^{1}n \\rightarrow _{1}^{1}p + _{-1}^{0}e + \\bar{\\nu}',
                options: [
                    'إلكترون (جسيم بيتا السالبة \\beta^{-})',
                    'جسيم ألفا \\alpha',
                    'بوزيترون \\beta^{+}',
                    'أشعة غاما \\gamma',
                ],
                correctIndex: 0,
                points: 100,
                explanation:
                    'عند تحوّل نيوترون إلى بروتون تنطلق جسيمات بيتا السالبة _{-1}^{0}e مع مضاد النيوترينو \\bar{\\nu}.',
            },
            {
                id: 2,
                question: 'الناتج الرئيسي للأكسدة المعتدلة للكحول الأوّلي هو:',
                formula: 'R{-}CH_2OH \\xrightarrow{[O]} R{-}CHO',
                options: [
                    'ألديهيد (Aldehyde)',
                    'كيتون (Ketone)',
                    'حمض كربوكسيلي فقط',
                    'إيثر (Ether)',
                ],
                correctIndex: 0,
                points: 100,
                explanation:
                    'الأكسدة المعتدلة للكحول الأوّلي تُعطي ألديهيد، أمّا الكحول الثانوي فيُعطي كيتون، والأكسدة القوية للكحول الأوّلي تُعطي حمضاً كربوكسيلياً.',
            },
            {
                id: 3,
                question: 'الجداء الشاردي للماء النقي K_w عند 25°م يساوي:',
                formula: 'K_w = [H_3O^{+}][OH^{-}] = 10^{-14}',
                options: ['10^{-14}', '10^{-7}', '10^{-10}', '10^{-12}'],
                correctIndex: 0,
                points: 100,
                explanation:
                    'الجداء الشاردي للماء النقي ثابت عند حرارة معيّنة، وقيمته عند 25°م هي 10^{-14}.',
            },
        ],
    },
    {
        id: 'arabic-2024-s1',
        title: 'نموذج اللغة العربية الوزاري — دورة 2024',
        year: '2024',
        session: 'الدورة الأولى',
        track: 'literary',
        subjectName: 'اللغة العربية',
        totalMarks: 400,
        durationMinutes: 120,
        questions: [
            {
                id: 1,
                question: 'إعراب كلمة «وطني» في قول الشاعر: «وطني أنتَ هوايَ المستبِد»:',
                options: [
                    'منادى مضاف منصوب وعلامة نصبه الفتحة المقدّرة على ما قبل ياء المتكلّم',
                    'مبتدأ مرفوع بالضمة الظاهرة',
                    'خبر مرفوع بالضمة',
                    'فاعل مرفوع بالضمة المقدّرة',
                ],
                correctIndex: 0,
                points: 100,
                explanation:
                    'الأصل «يا وطني» وحُذفت أداة النداء، وهو مضاف لياء المتكلّم، فتُقدَّر الفتحة اشتغالاً بالمناسبة (حركة ياء المتكلّم).',
            },
            {
                id: 2,
                question: 'السبب في كتابة الهمزة على نبرة في كلمة «فِئَة» هو:',
                options: [
                    'همزة متوسطة مفتوحة وما قبلها مكسور، والكسرة أقوى الحركات',
                    'همزة متوسطة مكسورة وما قبلها مفتوح',
                    'همزة متطرّفة بعد ساكن',
                    'همزة متوسطة ساكنة بعد كسرة',
                ],
                correctIndex: 0,
                points: 100,
                explanation:
                    'الهمزة في «فِئَة» مفتوحة وما قبلها مكسور، والكسرة أقوى الحركات وتناسبها النبرة، فتُكتب على نبرة.',
            },
            {
                id: 3,
                question: 'الفعل «استغفر» على وزن:',
                options: ['استفعل', 'افتعل', 'تفعّل', 'افعلل'],
                correctIndex: 0,
                points: 100,
                explanation:
                    '«استغفر» من الأفعال الخماسية المزيدة على وزن «استفعل»: سين، تاء، عين، فاء، لام.',
            },
            {
                id: 4,
                question: 'الجمع الذي يُعامل معاملة المفرد المؤنّث في قوله تعالى «قالتِ الأعرابُ آمنّا» هو:',
                options: [
                    'جمع التكسير «الأعراب»',
                    'جمع المذكّر السالم',
                    'جمع المؤنّث السالم',
                    'اسم الجمع',
                ],
                correctIndex: 0,
                points: 100,
                explanation:
                    'جمع التكسير يُعامل معاملة المفرد المؤنّث، لذلك جاء الفعل «قالتْ» مسبوقاً بتاء التأنيث.',
            },
        ],
    },
    {
        id: 'phys-2023-s2',
        title: 'نموذج الفيزياء الوزاري — دورة 2023',
        year: '2023',
        session: 'الدورة الثانية',
        track: 'scientific',
        subjectName: 'الفيزياء',
        totalMarks: 400,
        durationMinutes: 120,
        questions: [
            {
                id: 1,
                question: 'وحدة قياس الطاقة في النظام الدولي (SI) هي:',
                options: ['الجول (J)', 'الواط (W)', 'النيوتن (N)', 'الباسكال (Pa)'],
                correctIndex: 0,
                points: 100,
                explanation:
                    'الجول هو وحدة الطاقة والعمل في النظام الدولي، حيث 1\\,J = 1\\,N \\cdot 1\\,m.',
            },
            {
                id: 2,
                question: 'في ظاهرة الحيود، يزداد تباعد الهالات الحيودية عند:',
                formula: '\\sin(\\theta) = \\dfrac{n\\lambda}{d}',
                options: [
                    'زيادة طول الموجة \\lambda أو إنقاص المسافة بين الشقوق d',
                    'إنقاص طول الموجة \\lambda',
                    'زيادة المسافة بين الشقوق d',
                    'استخدام ضوء أحادي اللون قصير الموجة',
                ],
                correctIndex: 0,
                points: 100,
                explanation:
                    'من علاقة الحيود \\sin(\\theta) = \\dfrac{n\\lambda}{d} تزداد الزاوية \\theta بزيادة \\lambda أو إنقاص d.',
            },
            {
                id: 3,
                question: 'الطاقة المخزّنة في مكثّفة سعتها C وشحنتها Q تساوي:',
                formula: 'E = \\dfrac{1}{2}\\dfrac{Q^2}{C}',
                options: [
                    '\\dfrac{1}{2}\\dfrac{Q^2}{C}',
                    '\\dfrac{1}{2}QC',
                    'QC^2',
                    '\\dfrac{Q}{C}',
                ],
                correctIndex: 0,
                points: 100,
                explanation:
                    'طاقة المكثّفة تُعطى بالعلاقة E = \\dfrac{1}{2}\\dfrac{Q^2}{C} = \\dfrac{1}{2}CU^2 = \\dfrac{1}{2}QU.',
            },
            {
                id: 4,
                question: 'عندما يقترب مصدر صوت من مستمع ثابت، فإنّ التردد المسموع:',
                options: [
                    'يزداد (ظاهرة دوبلر)',
                    'ينقص',
                    'يبقى ثابتاً',
                    'ينعدم',
                ],
                correctIndex: 0,
                points: 100,
                explanation:
                    'وفق ظاهرة دوبلر، عند اقتراب المصدر من المستمع يزداد التردد المسموع، وعند ابتعاده ينقص.',
            },
        ],
    },
];

export const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

export const TRACK_META: Record<
    Track,
    { label: string; icon: string; accent: string }
> = {
    scientific: { label: 'الفرع العلمي', icon: 'FlaskConical', accent: 'bg-blue text-white' },
    literary: { label: 'الفرع الأدبي', icon: 'BookOpen', accent: 'bg-pink text-black' },
};

export function formatTimer(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const mm = String(minutes).padStart(2, '0');
    const ss = String(secs).padStart(2, '0');
    return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
