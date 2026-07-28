export interface LiveRoom {
  id: string;
  title: string;
  subject: string;
  hostName: string;
  hostAvatar?: string;
  isTutorSession: boolean;
  activeCount: number;
  maxCount: number;
  tags: string[];
  description: string;
  createdAt: string;
}

export const INITIAL_LIVE_ROOMS: LiveRoom[] = [
  {
    id: 'math-vectors-101',
    title: 'جلسة حل مسائل النواسات والنواس الثقيل 🧮',
    subject: 'الفيزياء',
    hostName: 'أ. عصام الحلاق',
    isTutorSession: true,
    activeCount: 14,
    maxCount: 50,
    tags: ['الفرع العلمي', 'بث مباشر', 'نواسات'],
    description: 'مراجعة وزارية شاملة لمسائل النواس الثقيل والنواس المرن مع تجميع أسئلة دورات سابقة.',
    createdAt: 'منذ 15 دقيقة',
  },
  {
    id: 'chem-organic-study',
    title: 'مذاكرة جماعية: الكيمياء العضوية والتسميات 🧪',
    subject: 'الكيمياء',
    hostName: 'أحمد الحمصي (طالب)',
    isTutorSession: false,
    activeCount: 6,
    maxCount: 12,
    tags: ['الفرع العلمي', 'مذاكرة جماعية'],
    description: 'نراجع سوا قسم العضوية والأغوال والألدهيدات ونحل الاختبارات بالتناوب.',
    createdAt: 'منذ 30 دقيقة',
  },
  {
    id: 'arabic-grammar-room',
    title: 'تطبيقات على قواعد اللغة العربية والإعراب ✍️',
    subject: 'اللغة العربية',
    hostName: 'أ. مروان الخطيب',
    isTutorSession: true,
    activeCount: 22,
    maxCount: 60,
    tags: ['مشترك علمي وأدبي', 'إعراب'],
    description: 'إعراب مفردات وجمل القصائد المقررة وشرح أسئلة الامتحان الوزاري.',
    createdAt: 'منذ 5 دقائق',
  },
  {
    id: 'english-vocab-quiz',
    title: 'English Speaking & Grammar Focus 🇬🇧',
    subject: 'اللغة الإنكليزية',
    hostName: 'سارة العلي (طالبة)',
    isTutorSession: false,
    activeCount: 4,
    maxCount: 8,
    tags: ['محادثة', 'قواعد'],
    description: 'Practice English conversation and solve Baccalaureate grammar exercises together.',
    createdAt: 'منذ 40 دقيقة',
  },
];
