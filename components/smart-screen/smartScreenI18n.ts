/**
 * Smart Screen dictionary.
 *
 * Arabic is **الفصحى** throughout, and Arabic is the source of truth — this
 * screen is the first thing anyone sees of String in a classroom, and it is
 * read by a whole room at once, not by one person holding a phone. English
 * mirrors it faithfully rather than the other way around.
 *
 * Register note: the screen addresses the teacher, never the class. It uses
 * no exclamation marks and no encouragement. A wall that cheers at a teacher
 * in front of their students is a wall they will resent.
 */

import { fill } from '../directory/directoryI18n';

export type Locale = 'ar' | 'en';
export { fill };

const dict: Record<Locale, Record<string, string>> = {
  ar: {
    'brand.name': 'String',
    'brand.product': 'الشاشة الصفّية',
    'brand.tagline': 'نظام التشغيل للتعليم الحديث.',

    // ─── طرق الدخول · نفس تبويبات الدخول على الويب ───
    'tab.email': 'البريد الإلكتروني',
    'tab.classCode': 'رمز الصف',
    'tab.qr': 'رمز QR',
    'tab.note': 'الشاشة الصفّية تعمل برمز QR فقط.',

    // ─── لوحة العلامة ───
    'quote.text':
      '«String ليست مجرد نظام تعلّم أفضل، بل فئة جديدة كلّيًا. مكّنتنا من الاستغناء عن تسعة أنظمة منفصلة، وأعادت لمعلّمينا عشر ساعات في الأسبوع، وضاعفت تفاعل طلبتنا.»',
    'quote.name': 'د. جهاد الكسواني',
    'quote.role': 'مدير مدارس الخضر الحديثة',
    'trust.uptime': 'جاهزية ٩٩٫٩٪',
    'trust.soc2': 'مطابقة SOC2',

    // ─── الحالة الافتراضية · بانتظار المسح ───
    'hero.title': 'امسح الرمز لتبدأ حصّتك',
    'hero.sub': 'سجّل الدخول من هاتفك، ثم تابع من هذه الشاشة.',
    'panel.title': 'رمز الدخول',
    'panel.hint': 'وجّه كاميرا هاتفك نحو الرمز',
    'code.label': 'أو أدخل هذا الرمز في التطبيق',
    'code.renews': 'يتجدّد الرمز خلال {n} ثانية',
    'code.renewNow': 'تجديد الرمز',

    'steps.title': 'ثلاث خطوات',
    'steps.one': 'افتح تطبيق String على هاتفك.',
    'steps.two': 'امسح الرمز الظاهر على الشاشة.',
    'steps.three': 'اختر صفّك، وستفتح الحصّة هنا.',

    // ─── جارٍ الاقتران ───
    'pairing.title': 'تم مسح الرمز',
    'pairing.sub': 'أكمِل تأكيد الدخول على هاتفك.',
    'pairing.waiting': 'بانتظار التأكيد…',
    'pairing.cancel': 'إلغاء',

    // ─── تم الدخول ───
    'authed.title': 'أهلاً بك، {name}',
    'authed.sub': 'جارٍ فتح صفوفك…',
    'authed.role': 'معلّم',

    // ─── انتهت صلاحية الرمز ───
    'expired.title': 'انتهت صلاحية الرمز',
    'expired.sub': 'لأسباب تتعلّق بالأمان، تنتهي صلاحية كل رمز بعد دقيقة.',
    'expired.action': 'إظهار رمز جديد',

    // ─── تعذّر الاتصال ───
    'error.title': 'تعذّر الاتصال بالمدرسة',
    'error.sub': 'تحقّق من اتصال الشاشة بالشبكة، ثم أعد المحاولة.',
    'error.action': 'إعادة المحاولة',

    // ─── التذييل ───
    'footer.screen': 'الشاشة {id}',
    'footer.unassigned': 'شاشة غير مُسجّلة لغرفة',
    'footer.help': 'للمساعدة، راجع إدارة المدرسة',
    'footer.online': 'متصلة',
    'footer.offline': 'غير متصلة',

    // ─── أدوات المعاينة ───
    'dev.states': 'الحالات',
    'dev.theme': 'المظهر',
    'dev.theme.dark': 'داكن',
    'dev.theme.light': 'فاتح',
    'dev.lang': 'العربية',
    'state.waiting': 'بانتظار المسح',
    'state.pairing': 'جارٍ الاقتران',
    'state.authed': 'تم الدخول',
    'state.expired': 'منتهية',
    'state.error': 'خطأ',
  },

  en: {
    'brand.name': 'String',
    'brand.product': 'Classroom Screen',
    'brand.tagline': 'The operating system for modern education.',

    'tab.email': 'Email Login',
    'tab.classCode': 'Class Code',
    'tab.qr': 'QR Login',
    'tab.note': 'The classroom screen signs in by QR only.',

    'quote.text':
      "“String isn't just a 'better LMS' — it's a whole new category. It allowed us to stop paying for 9 different tools, gave our teachers back 10 hours a week, and doubled our student engagement.”",
    'quote.name': 'Dr. Jihad Al-Kiswani',
    'quote.role': 'Principal, Al-Khader Schools',
    'trust.uptime': '99.9% Uptime',
    'trust.soc2': 'SOC2 Compliant',

    'hero.title': 'Scan to start your class',
    'hero.sub': 'Sign in from your phone, then carry on from this screen.',
    'panel.title': 'Sign-in code',
    'panel.hint': 'Point your phone camera at the code',
    'code.label': 'Or enter this code in the app',
    'code.renews': 'Code renews in {n}s',
    'code.renewNow': 'Renew code',

    'steps.title': 'Three steps',
    'steps.one': 'Open the String app on your phone.',
    'steps.two': 'Scan the code shown on this screen.',
    'steps.three': 'Pick your class, and it opens here.',

    'pairing.title': 'Code scanned',
    'pairing.sub': 'Finish confirming sign-in on your phone.',
    'pairing.waiting': 'Waiting for confirmation…',
    'pairing.cancel': 'Cancel',

    'authed.title': 'Welcome, {name}',
    'authed.sub': 'Opening your classes…',
    'authed.role': 'Teacher',

    'expired.title': 'This code has expired',
    'expired.sub': 'For security, every code expires after one minute.',
    'expired.action': 'Show a new code',

    'error.title': "Can't reach the school",
    'error.sub': "Check this screen's network connection, then try again.",
    'error.action': 'Try again',

    'footer.screen': 'Screen {id}',
    'footer.unassigned': 'Screen not assigned to a room',
    'footer.help': 'For help, contact the school office',
    'footer.online': 'Online',
    'footer.offline': 'Offline',

    'dev.states': 'States',
    'dev.theme': 'Theme',
    'dev.theme.dark': 'Dark',
    'dev.theme.light': 'Light',
    'dev.lang': 'English',
    'state.waiting': 'Waiting',
    'state.pairing': 'Pairing',
    'state.authed': 'Signed in',
    'state.expired': 'Expired',
    'state.error': 'Error',
  },
};

export function makeT(locale: Locale) {
  return (key: string): string => dict[locale][key] ?? dict.ar[key] ?? key;
}
