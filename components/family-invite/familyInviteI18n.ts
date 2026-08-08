/**
 * Family invite dictionary.
 *
 * Arabic is **الفصحى** throughout, deliberately: this is the first thing a
 * parent ever reads from the school, it will be read by families across
 * several dialects, and a school speaking colloquially reads as familiar to
 * some and careless to others. Formal is the safe register for a first
 * impression.
 *
 * Screens 1–4 say one thing each and sell nothing. Everything about what
 * String does waits for screen 5, once the link already exists.
 */

import { fill } from '../directory/directoryI18n';

export type Locale = 'ar' | 'en';
export { fill };

/** TODO: replace with the real family-app landing page. */
export const FAMILY_APP_URL = 'https://string.education/app';
/** TODO: replace once the app ships to the stores. */
export const APP_LAUNCH_WEEKS = 2;

const dict: Record<Locale, Record<string, string>> = {
  ar: {
    'brand.name': 'String',
    'page.title': 'ربط وليّ الأمر',
    'page.of': 'الخطوة {n} من {total}',
    'nav.back': 'رجوع',
    'nav.next': 'التالي',
    'nav.skip': 'تخطٍّ',
    'nav.finish': 'إنهاء',

    // ─── 1 · تأكيد الطالب ───
    's1.title': 'هل هذا ابنك؟',
    's1.grade': 'الصف {grade} — شعبة {section}',
    's1.phoneLabel': 'سيُربط الحساب برقم الهاتف',
    's1.phoneNote': 'هذا هو الرقم الذي وصلتنا منه رسالتك.',
    's1.yes': 'نعم، هذا ابني',
    's1.no': 'لا، ليس ابني',
    's1.wrongTitle': 'شكرًا لتنبيهنا.',
    's1.wrongBody': 'لن نربط أي بيانات بحسابك. يرجى التواصل مع إدارة المدرسة لتصحيح الرابط.',
    's1.wrongBack': 'عودة',

    // ─── 2 · بياناتك ───
    's2.title': 'مع من نتحدث؟',
    's2.name': 'الاسم الكامل',
    's2.name.ph': 'الاسم كما هو في الهوية',
    's2.relation': 'صفتك',
    's2.rel.father': 'الأب',
    's2.rel.mother': 'الأم',
    's2.rel.other': 'وليّ أمر',
    's2.occupation': 'المهنة',
    's2.occupation.ph': 'مثال: مهندس، معلّمة، صاحب عمل حر',
    // A question about a parent's job needs a stated reason, or it reads as
    // data collection for its own sake.
    's2.occupation.why':
      'نستعين بها لاختيار أوقات تواصل تناسب دوامك، وقد ندعوك للمشاركة في أنشطة الإرشاد المهني للطلبة إذا رغبت.',
    's2.optional': '(اختياري)',

    // ─── 3 · الإخوة ───
    's3.title': 'هل لديك أبناء آخرون في المدرسة؟',
    's3.subtitle': 'سنربطهم جميعًا بالحساب نفسه.',
    's3.gradeShort': 'الصف {grade}',
    's3.notFound': 'لم أجد ابني في القائمة',
    's3.notFoundNote': 'لا مشكلة — يمكنك إضافته لاحقًا من التطبيق، أو إبلاغ إدارة المدرسة.',
    's3.none': 'لم نجد أبناءً آخرين مرتبطين برقمك.',
    's3.selected': 'تم اختيار {n}',

    // ─── 4 · التنبيهات ───
    's4.title': 'لضبط التنبيهات وفق ما يناسبك',
    's4.q1': 'من يتابع شؤون المدرسة عادةً؟',
    's4.q1.me': 'أنا',
    's4.q1.second': 'وليّ الأمر الثاني',
    's4.q1.both': 'كلانا',
    's4.q2': 'متى تفضّل وصول التنبيهات؟',
    's4.q2.morning': 'صباحًا',
    's4.q2.evening': 'مساءً',
    's4.q2.any': 'في أي وقت',
    's4.q3': 'هل لدى {name} هاتف خاص به؟',
    // Without a reason this one reads as intrusive.
    's4.q3.why': 'نسأل لنعرف ما إذا كان بإمكاننا إرسال تمارينه إلى هاتفه مباشرة.',
    's4.q3.yes': 'نعم',
    's4.q3.no': 'لا',
    's4.q3.borrows': 'يستعير هاتف أحد أفراد الأسرة',

    // ─── 5 · تم ───
    's5.badge': 'تم',
    's5.title': 'تم ربط {name} بحسابك.',
    's5.linkedTo': 'مرتبط برقم',
    's5.siblingsLinked': 'وتم ربط {n} من إخوته بالحساب نفسه.',
    's5.fromDayOne': 'منذ أول يوم دراسي، ستعرف:',
    's5.b1.title': 'الحضور أولًا بأول',
    's5.b1.body': 'إشعار فور تسجيل حضوره، لا في نهاية الشهر.',
    's5.b2.title': 'العلامات فور صدورها',
    's5.b2.body': 'كل اختبار وكل واجب، لا في الشهادة وحدها.',
    's5.b3.title': 'مواضع القوة ومواضع الحاجة إلى الدعم',
    's5.b3.body': 'لا «مقصّر في الرياضيات»، بل الدرس والمهارة بالتحديد.',
    's5.b4.title': 'التواصل مع معلميه',
    's5.b4.body': 'من التطبيق مباشرة، دون انتظار يوم اللقاء.',

    's5.diff.title': 'ما لا تجده في مكان آخر',
    's5.diff.body':
      'يحلّل String طريقة تفكير {name}: كيف يستوعب، وأين يتشتت انتباهه، وأي أسلوب شرح يناسبه. ثم يقدّم لك خطوات عملية لمساعدته في المنزل.',

    // ─── تطبيق العائلة ───
    'app.title': 'تطبيق العائلة من String',
    'app.subtitle': 'كل ما سبق في تطبيق واحد على هاتفك.',
    'app.f1': 'إشعار فوري عند تسجيل الحضور أو الغياب أو التأخر.',
    'app.f2': 'متابعة جميع أبنائك من حساب واحد، دون تبديل بين الحسابات.',
    'app.f3': 'محادثة مباشرة مع المعلمين، مع سجل محفوظ لكل رسالة.',
    'app.f4': 'تقرير أسبوعي يوضّح التقدّم ومواضع الحاجة إلى الدعم.',
    'app.f5': 'خطوات عملية للمساعدة في المنزل، مبنية على أداء ابنك نفسه.',
    'app.f6': 'متاح بالعربية والإنجليزية، ويعمل على أجهزة أندرويد وآيفون.',
    'app.download': 'تحميل التطبيق',
    'app.soon': 'قريبًا',
    'app.link': 'رابط التطبيق',
    'app.launchNote':
      'يصدر التطبيق خلال {weeks} أسابيع، وسيصلك رابط التحميل على المحادثة نفسها. لا حاجة لأي إجراء منك الآن.',

    // ─── حفظ الرقم ───
    'save.title': 'احفظ رقمنا في جهازك',
    'save.body': 'بدون حفظ الرقم قد لا تصلك الإشعارات على واتساب.',
    'save.copy': 'نسخ الرقم',
    'save.copied': 'تم نسخ الرقم',

    // ─── دعوة وليّ الأمر الثاني ───
    'second.title': 'أرسل الدعوة إلى وليّ الأمر الثاني',
    'second.body': 'ليتابع {name} معك — بضغطة واحدة.',
    'second.cta': 'إرسال الدعوة',
    'second.sent': 'تم فتح المحادثة',

    'done.restart': 'إعادة العرض من البداية',

    // ─── شريط المعاينة (لا يراه وليّ الأمر) ───
    'preview.title': 'معاينة',
    'preview.note': 'هذه الشاشة يفتحها وليّ الأمر من رابط الدعوة. تُعرض هنا للمراجعة.',
    'preview.student': 'الطالب',
    'preview.as': 'يفتحها',
    'preview.reset': 'مسح الإجابات',
    'preview.saved': 'تم حفظ الإجابات وربط وليّ الأمر بالطالب.',
  },
  en: {
    'brand.name': 'String',
    'page.title': 'Link a guardian',
    'page.of': 'Step {n} of {total}',
    'nav.back': 'Back',
    'nav.next': 'Next',
    'nav.skip': 'Skip',
    'nav.finish': 'Finish',

    's1.title': 'Is this your child?',
    's1.grade': 'Grade {grade} — Section {section}',
    's1.phoneLabel': 'This account will be linked to',
    's1.phoneNote': 'This is the number your message reached us from.',
    's1.yes': 'Yes, this is my child',
    's1.no': 'No, this is not my child',
    's1.wrongTitle': 'Thank you for telling us.',
    's1.wrongBody': "Nothing will be linked to your account. Please contact the school office so they can correct the invite.",
    's1.wrongBack': 'Go back',

    's2.title': 'Who are we speaking with?',
    's2.name': 'Full name',
    's2.name.ph': 'As it appears on your ID',
    's2.relation': 'You are the',
    's2.rel.father': 'Father',
    's2.rel.mother': 'Mother',
    's2.rel.other': 'Guardian',
    's2.occupation': 'Occupation',
    's2.occupation.ph': 'e.g. engineer, teacher, self-employed',
    's2.occupation.why':
      'We use it to pick contact times that fit your working hours, and we may invite you to take part in careers sessions for students if you would like.',
    's2.optional': '(Optional)',

    's3.title': 'Do you have other children at this school?',
    's3.subtitle': "We'll link them all to the same account.",
    's3.gradeShort': 'Grade {grade}',
    's3.notFound': "I can't find my child in this list",
    's3.notFoundNote': "That's fine — you can add them later from the app, or tell the school office.",
    's3.none': 'We found no other children linked to your number.',
    's3.selected': '{n} selected',

    's4.title': 'So we can set your notifications correctly',
    's4.q1': 'Who usually follows up on school matters?',
    's4.q1.me': 'I do',
    's4.q1.second': 'The second guardian',
    's4.q1.both': 'Both of us',
    's4.q2': 'When would you like notifications to arrive?',
    's4.q2.morning': 'Morning',
    's4.q2.evening': 'Evening',
    's4.q2.any': 'Any time',
    's4.q3': 'Does {name} have a phone of their own?',
    's4.q3.why': "We ask so we know whether we can send their exercises straight to their phone.",
    's4.q3.yes': 'Yes',
    's4.q3.no': 'No',
    's4.q3.borrows': "Borrows a family member's",

    's5.badge': 'Done',
    's5.title': '{name} is now linked to your account.',
    's5.linkedTo': 'Linked to',
    's5.siblingsLinked': '{n} of their siblings were linked to the same account.',
    's5.fromDayOne': "From the first day of term, you'll know:",
    's5.b1.title': 'Attendance as it happens',
    's5.b1.body': 'A notification the moment they are marked in — not at the end of the month.',
    's5.b2.title': 'Grades as they are given',
    's5.b2.body': 'Every test and every assignment — not just the report card.',
    's5.b3.title': 'Where they are strong and where they need help',
    's5.b3.body': 'Not "behind in maths" — the exact lesson and the exact skill.',
    's5.b4.title': 'A direct line to their teachers',
    's5.b4.body': "From the app, without waiting for parents' evening.",

    's5.diff.title': "What you won't find anywhere else",
    's5.diff.body':
      'String analyses how {name} thinks: how they take things in, where their attention slips, and which way of explaining works for them. Then it gives you practical steps to help at home.',

    'app.title': 'The String family app',
    'app.subtitle': 'All of the above in one app on your phone.',
    'app.f1': 'An instant notification for attendance, absence or lateness.',
    'app.f2': 'Follow all of your children from one account, with no switching.',
    'app.f3': 'Message teachers directly, with every message kept on record.',
    'app.f4': 'A weekly report showing progress and where support is needed.',
    'app.f5': "Practical steps to help at home, based on your own child's work.",
    'app.f6': 'Available in Arabic and English, on both Android and iPhone.',
    'app.download': 'Download the app',
    'app.soon': 'Coming soon',
    'app.link': 'App link',
    'app.launchNote':
      'The app ships within {weeks} weeks and the download link will arrive on this same conversation. Nothing is needed from you now.',

    'save.title': 'Save our number to your phone',
    'save.body': "Without it, WhatsApp notifications may not reach you.",
    'save.copy': 'Copy the number',
    'save.copied': 'Number copied',

    'second.title': 'Send the invite to the second guardian',
    'second.body': 'So they can follow {name} alongside you — one tap.',
    'second.cta': 'Send the invite',
    'second.sent': 'WhatsApp opened',

    'done.restart': 'Replay from the start',

    'preview.title': 'Preview',
    'preview.note': 'This is what a guardian opens from the invite link. Shown here for review.',
    'preview.student': 'Student',
    'preview.as': 'Opened by',
    'preview.reset': 'Clear answers',
    'preview.saved': 'Answers saved and the guardian linked to the student.',
  },
};

export function getInviteString(locale: Locale, key: string): string {
  return dict[locale][key] ?? key;
}
