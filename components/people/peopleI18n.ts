/**
 * People Hub dictionary — the global roster at /people.
 *
 * The `type.*.desc` strings describe what each account can do. They are a
 * first pass — see the note at the top of memberTypes.ts. Only `lead_teacher`
 * is specified rather than guessed.
 *
 * Keys shared with the roster pages (panel chrome, bulk, danger, access card,
 * messaging) are repeated here rather than imported, so a hub-specific wording
 * change never leaks into the student or teacher surface.
 */

import { fill } from '../directory/directoryI18n';
import type { Locale } from '../directory/directoryI18n';

export { fill };

const dict: Record<Locale, Record<string, string>> = {
  ar: {
    'page.title': 'الأشخاص',
    'page.subtitle': 'كل من في المدرسة، في مكان واحد',
    'page.back': 'رجوع',
    'page.count': 'شخص',
    'page.local': 'مضاف يدويًا',
    'page.search': 'ابحث عن أي شخص…',

    // ─── Rail ───
    'rail.title': 'الأشخاص',
    'rail.all': 'الكل',
    // Plural, unlike `type.*.label` — the rail names a group, not one person.
    'rail.students': 'الطلاب',
    'rail.teachers': 'المعلّمون',
    'rail.other': 'أعضاء آخرون',
    'rail.expand': 'عرض الأنواع',
    'rail.collapse': 'إخفاء الأنواع',

    // ─── Search ───
    'search.hint': 'اكتب اسمًا أو معرّف String أو رقم وليّ أمر',
    'search.count': '{n} نتيجة',
    'search.none': 'لا نتائج لـ «{q}»',
    'search.advanced': 'كل الفلاتر المتقدّمة',
    'search.clear': 'مسح',

    'empty.title': 'لا يوجد أشخاص مطابقون لـ',
    'empty.titleNoQuery': 'لا يوجد أشخاص مطابقون',
    'empty.didYouMean': 'هل تقصد:',
    'empty.filtersNarrowing': 'الفلاتر التالية تُضيّق النتائج:',
    'empty.addPlain': 'إضافة عضو',
    'empty.clearFilters': 'مسح الفلاتر',

    // ─── Columns ───
    'col.name': 'الاسم',
    'col.type': 'النوع',
    'col.stringId': 'المعرّف',
    'col.detail': 'التفاصيل',
    'col.campus': 'المبنى',
    'col.actions': '',

    // ─── Filters ───
    'filter.add': 'إضافة فلتر',
    'filter.clear': 'مسح الكل',
    'filter.search': 'ابحث عن فلتر…',
    'filter.searchValues': 'ابحث…',
    'filter.noResults': 'لا توجد قيم مطابقة',
    'filter.hint': 'ضمن الحقل الواحد: أيّ قيمة. بين الحقول: الكل معًا.',
    'filter.type': 'النوع',
    'filter.campus': 'المبنى',
    'filter.grade': 'الصف',
    'filter.section': 'الشعبة',
    'filter.subject': 'المادة',
    'filter.gender': 'الجنس',
    'filter.nationality': 'الجنسية',
    'filter.employment': 'نوع التعاقد',
    /** Shown for a filter whose field only exists on some kinds of person. */
    'filter.scopedTo': '«{field}» يقتصر على: {type}',

    'emp.full-time': 'دوام كامل',
    'emp.part-time': 'دوام جزئي',
    'emp.visiting': 'زائر',

    // ─── Quick actions ───
    'quick.title': 'إجراءات سريعة',
    'quick.addMember': 'إضافة عضو',
    'quick.bulk': 'الإجراءات الجماعية',
    'quick.import': 'استيراد من CSV',

    // ─── Member types ───
    'types.title': 'أنواع الأعضاء',
    'types.subtitle': 'اختر نوع العضو الذي تريد إضافته',
    'add.title': 'اختر نوع العضو',
    'add.soon': 'قريبًا',
    'add.soonToast': '{name} — قريبًا',
    'add.viaStudent': 'يُضاف من ملف الطالب',

    'type.student.label': 'طالب',
    'type.student.desc': 'متعلّم مسجّل. يرى دروسه وتقدّمه ورسائله فقط.',
    'type.teacher.label': 'معلّم',
    'type.teacher.desc': 'يدرّس صفوفه المسندة إليه، ويدير الدروس والدرجات والحضور لمساحاته.',
    'type.lead_teacher.label': 'معلّم قائد',
    'type.lead_teacher.desc': 'معلّم يحمل صلاحيات مالك المبنى مؤقتًا — ينوب عنه دون تغيير دائم في دوره.',
    'type.supervisor.label': 'مشرف',
    'type.supervisor.desc': 'يشرف على مجموعة من المعلّمين، ويراجع جودة الدروس وأداء الصفوف عبر الشعب.',
    'type.campus_owner.label': 'مالك المبنى',
    'type.campus_owner.desc': 'يدير مبنى واحدًا بالكامل: طلابه وكادره وشعبه وجدوله.',
    'type.topic_manager.label': 'مدير المناهج',
    'type.topic_manager.desc': 'يملك المنهج. يبني الوحدات والدروس وبنوك الأسئلة المستخدمة في كل المباني.',
    'type.it_manager.label': 'مدير تقنية المعلومات',
    'type.it_manager.desc': 'يدير الحسابات والصلاحيات والتكاملات، ويعيد تعيين بيانات الدخول ويضبط النظام.',
    'type.parent.label': 'وليّ أمر',
    'type.parent.desc': 'يتابع أبناءه: تقدّمهم وحضورهم ورسائل المدرسة. يُضاف من قسم العائلة في ملف الطالب.',

    'type.guessNote': 'أوصاف مبدئية — تحتاج للمراجعة قبل ربطها بالصلاحيات الفعلية.',

    // ─── Rows ───
    'row.profile': 'الملف الشخصي',
    'row.profileSoon': 'الملف الشخصي — قريبًا',
    'row.message': 'رسالة سريعة',
    'row.card': 'بطاقة الدخول',
    'row.openStudent': 'فتح ملف الطالب',
    'reset.title': 'إعادة تعيين كلمة المرور',
    'reset.seeded': 'لا يمكن تغيير كلمة مرور سجل تجريبي',

    // ─── Edit / bulk ───
    'edit.mode': 'تحرير',
    'edit.exit': 'إنهاء التحرير',
    'bulk.selected': 'محدد',
    'bulk.selectAll': 'تحديد الكل ({n})',
    'bulk.clear': 'إلغاء التحديد',
    'bulk.move': 'نقل',
    'bulk.delete': 'حذف',
    'bulk.archive': 'أرشفة',
    'bulk.export': 'تصدير',
    'bulk.cards': 'بطاقات الدخول',
    'bulk.soon': 'قريبًا',
    'bulk.mixed': 'النقل يتطلّب تحديد نوع واحد فقط',
    'bulk.studentsOnly': 'النقل متاح للطلاب فقط',
    'bulk.selectAllHint': 'يشمل كل من تطابقهم الفلاتر الحالية',

    'del.title': 'حذف الأعضاء',
    'del.body': 'سيتم حذف {n} عضو نهائيًا.',
    'del.seededSkipped': 'تم تخطي {n} سجل تجريبي — لا يمكن حذف البيانات التجريبية.',
    'del.derivedSkipped': 'تم تخطي {n} وليّ أمر — يُحذفون من ملف الطالب.',
    'del.nothing': 'لا يوجد في التحديد ما يمكن حذفه.',
    'danger.typeLabel': 'اكتب «{word}» للتأكيد',
    'danger.passwordLabel': 'كلمة مرور حسابك',
    'danger.typeToConfirm': 'الكلمة غير مطابقة',
    'danger.passwordRequired': 'كلمة المرور مطلوبة',
    'danger.deleteWord': 'حذف',

    // ─── Toasts ───
    'msg.deleted.bulk': 'تم حذف {n} عضو',
    'msg.exported': 'تم تصدير {n} عضو',
    'msg.undo': 'تراجع',
    'msg.undone': 'تم التراجع',
    'msg.reset': 'تم إنشاء كلمة مرور جديدة',

    // ─── Compose ───
    'msg.title': 'رسالة سريعة',
    'msg.about': 'بخصوص {name}',
    'msg.to': 'إلى',
    'msg.body': 'الرسالة',
    'msg.bodyPh': 'اكتب رسالتك…',
    'msg.send': 'إرسال',
    'msg.count': '{n} مستلم',
    'msg.noRecipients': 'لا توجد بيانات تواصل لهذا الشخص.',
    'msg.role.student': 'الطالب',
    'msg.role.teacher': 'المعلّم',
    'msg.role.parent': 'وليّ الأمر',
    'msg.role.member': 'العضو',
    'msg.noContact': 'لا توجد بيانات تواصل',
    'msg.sent': 'تم إرسال الرسالة إلى {n} مستلم',

    // ─── Access card ───
    'card.title': 'بطاقة الدخول',
    'card.subtitle': 'بطاقة الدخول',
    'card.sheets': 'بطاقة',
    'card.print': 'طباعة',
    'card.howTo': 'كيفية تسجيل الدخول',
    'card.step1': 'امسح رمز QR بكاميرا هاتفك، أو افتح string.education',
    'card.step2': 'أدخل معرّف String وكلمة المرور الموضّحين أدناه.',
    'card.step3': 'غيّر كلمة المرور بعد أول تسجيل دخول.',
    'card.footer': 'احتفظ بهذه البطاقة في مكان آمن — تحتوي على بيانات الدخول.',
    'f.stringId': 'معرّف String',
    'f.loginEmail': 'بريد تسجيل الدخول',
    'f.password': 'كلمة المرور',
    'f.password.show': 'إظهار',
    'f.password.hide': 'إخفاء',

    // ─── Palette / shortcuts ───
    'cmd.placeholder': 'ابحث عن شخص أو أمر…',
    'cmd.people': 'الأشخاص',
    'cmd.actions': 'الإجراءات',
    'cmd.empty': 'لا نتائج',
    'cmd.hint': 'للتنقل ↑↓ · للفتح ⏎ · للإغلاق Esc',

    'shortcuts.search': 'بحث',
    'shortcuts.focus': 'تركيز البحث',
    'shortcuts.bulk': 'الإجراءات الجماعية',
    'shortcuts.close': 'إغلاق',
    'shortcuts.dismiss': 'إخفاء الاختصارات',

    'panel.close': 'إغلاق',
    'panel.cancel': 'إلغاء',
  },
  en: {
    'page.title': 'People',
    'page.subtitle': 'Everyone in the school, in one place',
    'page.back': 'Back',
    'page.count': 'people',
    'page.local': 'Added manually',
    'page.search': 'Search anyone…',

    'rail.title': 'People',
    'rail.all': 'All',
    'rail.students': 'Students',
    'rail.teachers': 'Teachers',
    'rail.other': 'Other members',
    'rail.expand': 'Show types',
    'rail.collapse': 'Hide types',

    'search.hint': 'Type a name, String ID or a guardian phone number',
    'search.count': '{n} results',
    'search.none': 'No results for "{q}"',
    'search.advanced': 'All advanced filters',
    'search.clear': 'Clear',

    'empty.title': 'No people match',
    'empty.titleNoQuery': 'No people match these filters',
    'empty.didYouMean': 'Did you mean:',
    'empty.filtersNarrowing': 'These filters are narrowing the results:',
    'empty.addPlain': 'Add a member',
    'empty.clearFilters': 'Clear filters',

    'col.name': 'Name',
    'col.type': 'Type',
    'col.stringId': 'String ID',
    'col.detail': 'Details',
    'col.campus': 'Campus',
    'col.actions': '',

    'filter.add': 'Filter',
    'filter.clear': 'Clear all',
    'filter.search': 'Filter by…',
    'filter.searchValues': 'Search…',
    'filter.noResults': 'No matching values',
    'filter.hint': 'Within a field: any value. Across fields: all must match.',
    'filter.type': 'Type',
    'filter.campus': 'Campus',
    'filter.grade': 'Grade',
    'filter.section': 'Section',
    'filter.subject': 'Subject',
    'filter.gender': 'Gender',
    'filter.nationality': 'Nationality',
    'filter.employment': 'Employment',
    'filter.scopedTo': '"{field}" applies to {type} only',

    'emp.full-time': 'Full-time',
    'emp.part-time': 'Part-time',
    'emp.visiting': 'Visiting',

    'quick.title': 'Quick actions',
    'quick.addMember': 'Add member',
    'quick.bulk': 'Bulk actions',
    'quick.import': 'Import from CSV',

    'types.title': 'Member types',
    'types.subtitle': 'Pick the kind of member you want to add',
    'add.title': 'Select Member Type',
    'add.soon': 'Coming soon',
    'add.soonToast': '{name} — coming soon',
    'add.viaStudent': 'Added from a student',

    'type.student.label': 'Student',
    'type.student.desc': 'An enrolled learner. Sees only their own lessons, progress and messages.',
    'type.teacher.label': 'Teacher',
    'type.teacher.desc': 'Teaches their assigned classes — lessons, grades and attendance for their spaces.',
    'type.lead_teacher.label': 'Lead Teacher',
    'type.lead_teacher.desc': 'A teacher holding campus-owner permissions temporarily — covers for the owner without a permanent role change.',
    'type.supervisor.label': 'Supervisor',
    'type.supervisor.desc': 'Oversees a group of teachers; reviews lesson quality and class performance across sections.',
    'type.campus_owner.label': 'Campus Owner',
    'type.campus_owner.desc': 'Runs one campus end to end: its students, staff, sections and schedule.',
    'type.topic_manager.label': 'Topic Manager',
    'type.topic_manager.desc': 'Owns the curriculum. Builds the units, lessons and question banks used across campuses.',
    'type.it_manager.label': 'IT Manager',
    'type.it_manager.desc': 'Manages accounts, access and integrations; resets credentials and configures the system.',
    'type.parent.label': 'Parent',
    'type.parent.desc': "Follows their children's progress, attendance and school messages. Added from the Family section of a student.",

    'type.guessNote': 'Draft descriptions — confirm these before they drive real permissions.',

    'row.profile': 'Profile',
    'row.profileSoon': 'Profile — coming soon',
    'row.message': 'Quick message',
    'row.card': 'Access card',
    'row.openStudent': 'Open student record',
    'reset.title': 'Reset password',
    'reset.seeded': "Demo records don't have a password to reset",

    'edit.mode': 'Edit',
    'edit.exit': 'Done editing',
    'bulk.selected': 'selected',
    'bulk.selectAll': 'Select all {n}',
    'bulk.clear': 'Clear selection',
    'bulk.move': 'Move',
    'bulk.delete': 'Delete',
    'bulk.archive': 'Archive',
    'bulk.export': 'Export',
    'bulk.cards': 'Access cards',
    'bulk.soon': 'Coming soon',
    'bulk.mixed': 'Moving needs a selection of one type',
    'bulk.studentsOnly': 'Only students can be moved',
    'bulk.selectAllHint': 'Everyone the current filters match',

    'del.title': 'Delete members',
    'del.body': '{n} members will be permanently deleted.',
    'del.seededSkipped': '{n} demo records skipped — demo data cannot be deleted.',
    'del.derivedSkipped': '{n} parents skipped — parents are removed from the student record.',
    'del.nothing': 'Nothing in this selection can be deleted.',
    'danger.typeLabel': 'Type "{word}" to confirm',
    'danger.passwordLabel': 'Your account password',
    'danger.typeToConfirm': "That doesn't match",
    'danger.passwordRequired': 'Password is required',
    'danger.deleteWord': 'DELETE',

    'msg.deleted.bulk': '{n} members deleted',
    'msg.exported': '{n} members exported',
    'msg.undo': 'Undo',
    'msg.undone': 'Undone',
    'msg.reset': 'New password generated',

    'msg.title': 'Quick message',
    'msg.about': 'About {name}',
    'msg.to': 'To',
    'msg.body': 'Message',
    'msg.bodyPh': 'Write your message…',
    'msg.send': 'Send',
    'msg.count': '{n} recipients',
    'msg.noRecipients': 'No contact details on file for this person.',
    'msg.role.student': 'Student',
    'msg.role.teacher': 'Teacher',
    'msg.role.parent': 'Parent',
    'msg.role.member': 'Member',
    'msg.noContact': 'No contact details',
    'msg.sent': 'Message sent to {n} recipients',

    'card.title': 'Access card',
    'card.subtitle': 'Access card',
    'card.sheets': 'cards',
    'card.print': 'Print',
    'card.howTo': 'How to sign in',
    'card.step1': 'Scan the QR with your phone camera, or open string.education',
    'card.step2': 'Enter the String ID and password shown below.',
    'card.step3': 'Change your password after the first sign-in.',
    'card.footer': 'Keep this card safe — it contains sign-in details.',
    'f.stringId': 'String ID',
    'f.loginEmail': 'Login Email',
    'f.password': 'Password',
    'f.password.show': 'Show',
    'f.password.hide': 'Hide',

    'cmd.placeholder': 'Search people or actions…',
    'cmd.people': 'People',
    'cmd.actions': 'Actions',
    'cmd.empty': 'No results',
    'cmd.hint': '↑↓ navigate · ⏎ open · Esc close',

    'shortcuts.search': 'search',
    'shortcuts.focus': 'focus search',
    'shortcuts.bulk': 'bulk actions',
    'shortcuts.close': 'close',
    'shortcuts.dismiss': 'Hide shortcuts',

    'panel.close': 'Close',
    'panel.cancel': 'Cancel',
  },
};

export function getPeopleString(locale: Locale, key: string): string {
  return dict[locale][key] ?? key;
}
