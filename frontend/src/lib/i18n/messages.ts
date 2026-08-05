/**
 * The message catalogue. English is the source; Azerbaijani is a peer, not a
 * fallback layer.
 *
 * No i18n library. Two locales and a flat key space do not need forty kilobytes
 * of runtime, an ICU parser or a plural engine that this product never calls —
 * a typed record and a lookup are the whole requirement. `MessageKey` is derived
 * from the English catalogue, so a key that exists in one locale and not the
 * other is a type error rather than a blank space on screen at a demo.
 *
 * WHAT IS TRANSLATED, stated plainly so a pass is not read as more than it is:
 * the shell — navigation, its section names and hints, the account menu, common
 * actions and states — and every page's title and standfirst. That is the layer
 * a person navigates by.
 *
 * WHAT IS NOT: the analytical prose inside panels, chart captions and the long
 * explanatory paragraphs, which run to tens of thousands of words. Those stay in
 * English until translated deliberately. They are not marked up as missing
 * because they are not missing — they are untranslated, which is a different
 * thing, and pretending otherwise would put machine-shaped Azerbaijani in front
 * of a reader in the one product whose whole claim is that it does not fabricate.
 */

export const LOCALES = ['en', 'az'] as const
export type Locale = (typeof LOCALES)[number]

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  az: 'Azərbaycanca',
}

const en = {
  // --- navigation sections -------------------------------------------------
  'nav.section.operate': 'Operate',
  'nav.section.programme': 'Programme',
  'nav.section.people': 'People & risk',
  'nav.section.governance': 'Governance',
  'nav.section.system': 'System',
  'nav.section.personal': 'Personal',

  // --- navigation destinations --------------------------------------------
  'nav.command-center': 'Command Center',
  'nav.command-center.hint': 'Live operational picture',
  'nav.loops': 'Closed loops',
  'nav.loops.hint': 'Every threat travelling the seven stages',
  'nav.threats': 'Threat intake',
  'nav.threats.hint': 'What entered the platform, and from where',
  'nav.approvals': 'Approval gate',
  'nav.approvals.hint': 'Nothing reaches an employee without a human here',
  'nav.simulations': 'Simulations',
  'nav.simulations.hint': 'Safe campaigns built from real threats',
  'nav.training': 'Training Studio',
  'nav.training.hint': 'Author, review and version training content',
  'nav.sandbox': 'Sandbox',
  'nav.sandbox.hint': 'Static and behavioural analysis of files and URLs',
  'nav.employees': 'Employees',
  'nav.employees.hint': 'Individual behaviour and risk history',
  'nav.departments': 'Departments',
  'nav.departments.hint': 'Where the risk concentrates',
  'nav.risk-profiles': 'Risk profiles',
  'nav.risk-profiles.hint': 'How every score was actually derived',
  'nav.remediation': 'Remediation',
  'nav.remediation.hint': 'What gets attached to a person, and what deliberately does not',
  'nav.incident-risks': 'Incident risks',
  'nav.incident-risks.hint': 'Risk raised by incident response against people',
  'nav.policy': 'Policy intelligence',
  'nav.policy.hint': 'Policies, extracted rules and drift findings',
  'nav.intel': 'Threat intelligence',
  'nav.intel.hint': 'External advisories matched to what we run',
  'nav.reports': 'Reports',
  'nav.reports.hint': 'Evidence packs and exports',
  'nav.executive': 'Executive view',
  'nav.executive.hint': 'The one-screen posture read',
  'nav.integrations': 'Integrations',
  'nav.integrations.hint': 'LMS, SSO and identity connections',
  'nav.audit': 'Audit log',
  'nav.audit.hint': 'Every material change, and who made it',
  'nav.portal': 'My security',
  'nav.portal.hint': 'Your assigned training and your risk score',

  // --- shell chrome --------------------------------------------------------
  'shell.skipToContent': 'Skip to content',
  'shell.search': 'Search or jump to',
  'shell.collapse': 'Collapse',
  'shell.expand': 'Expand navigation',
  'shell.switchAccount': 'Switch account',
  'shell.settings': 'Settings',
  'shell.signOut': 'Sign out',
  'shell.language': 'Language',
  'shell.running': 'running',
  'shell.atGate': 'at gate',

  // --- common actions ------------------------------------------------------
  'action.retry': 'Try again',
  'action.checkNow': 'Check now',
  'action.checking': 'Checking',

  // --- common states -------------------------------------------------------
  'state.error': 'Something went wrong',

  // --- severity ------------------------------------------------------------
  'severity.critical': 'Critical',
  'severity.high': 'High',
  'severity.medium': 'Medium',
  'severity.low': 'Low',
  'severity.info': 'Info',

  // --- page titles ---------------------------------------------------------
  'page.command-center.title': 'Command Center',
  'page.loops.title': 'Closed loops',
  'page.threats.title': 'Threat intake',
  'page.approvals.title': 'Approval gate',
  'page.simulations.title': 'Simulations',
  'page.training.title': 'Training Studio',
  'page.sandbox.title': 'Sandbox',
  'page.employees.title': 'Employees',
  'page.departments.title': 'Departments',
  'page.risk-profiles.title': 'Risk profiles',
  'page.remediation.title': 'Remediation',
  'page.incident-risks.title': 'Incident risks',
  'page.policy.title': 'Policy drift and exposure',
  'page.intel.title': 'Threat intelligence',
  'page.reports.title': 'Reports',
  'page.executive.title': 'Executive view',
  'page.integrations.title': 'Integrations',
  'page.audit.title': 'Audit log',
  'page.settings.title': 'Settings',

  // --- command centre bands ------------------------------------------------
  'cc.operationalAreas': 'Operational areas',
  'cc.awaitingApproval': 'Awaiting human approval',
  'cc.closedLoop': 'The closed loop',
  'cc.degraded': 'Degraded capability',
  'cc.attention': 'What needs attention now',
  'cc.timeline': 'Incident timeline',
  'cc.fullAudit': 'Full audit log',
  'cc.open.threats': 'Open threat intake',
  'cc.open.simulations': 'Open simulations',
  'cc.open.incidents': 'Open incident risks',
  'cc.open.policy': 'Open policy intelligence',
  'cc.open.integrations': 'Open integrations',
} as const

export type MessageKey = keyof typeof en

/** Azerbaijani. Security vocabulary follows the terms used in Azerbaijani
 *  practice; `Sandbox` is kept because it is the term analysts actually use. */
const az: Record<MessageKey, string> = {
  'nav.section.operate': 'Əməliyyat',
  'nav.section.programme': 'Proqram',
  'nav.section.people': 'İnsanlar və risk',
  'nav.section.governance': 'İdarəetmə',
  'nav.section.system': 'Sistem',
  'nav.section.personal': 'Şəxsi',

  'nav.command-center': 'Komanda Mərkəzi',
  'nav.command-center.hint': 'Canlı əməliyyat mənzərəsi',
  'nav.loops': 'Qapalı dövrələr',
  'nav.loops.hint': 'Yeddi mərhələdən keçən hər təhdid',
  'nav.threats': 'Təhdid qəbulu',
  'nav.threats.hint': 'Platformaya nə daxil oldu və haradan',
  'nav.approvals': 'Təsdiq qapısı',
  'nav.approvals.hint': 'İnsan təsdiqi olmadan heç nə işçiyə çatmır',
  'nav.simulations': 'Simulyasiyalar',
  'nav.simulations.hint': 'Real təhdidlərdən qurulan təhlükəsiz kampaniyalar',
  'nav.training': 'Təlim Studiyası',
  'nav.training.hint': 'Təlim məzmununu yarat, nəzərdən keçir və versiyalarını saxla',
  'nav.sandbox': 'Sandbox',
  'nav.sandbox.hint': 'Fayl və URL-lərin statik və davranış təhlili',
  'nav.employees': 'İşçilər',
  'nav.employees.hint': 'Fərdi davranış və risk tarixçəsi',
  'nav.departments': 'Departamentlər',
  'nav.departments.hint': 'Riskin harada cəmləndiyi',
  'nav.risk-profiles': 'Risk profilləri',
  'nav.risk-profiles.hint': 'Hər balın həqiqətən necə hesablandığı',
  'nav.remediation': 'Korrektiv tədbirlər',
  'nav.remediation.hint': 'Bir insana nə əlavə olunur və nə qəsdən olunmur',
  'nav.incident-risks': 'İnsident riskləri',
  'nav.incident-risks.hint': 'İnsidentə cavabın insanlara yazdığı risk',
  'nav.policy': 'Siyasət kəşfiyyatı',
  'nav.policy.hint': 'Siyasətlər, çıxarılmış qaydalar və uyğunsuzluqlar',
  'nav.intel': 'Təhdid kəşfiyyatı',
  'nav.intel.hint': 'İşlətdiyimizə uyğunlaşdırılmış xarici bildirişlər',
  'nav.reports': 'Hesabatlar',
  'nav.reports.hint': 'Sübut paketləri və ixraclar',
  'nav.executive': 'Rəhbər baxışı',
  'nav.executive.hint': 'Bir ekranda duruş oxunuşu',
  'nav.integrations': 'İnteqrasiyalar',
  'nav.integrations.hint': 'LMS, SSO və kimlik bağlantıları',
  'nav.audit': 'Audit jurnalı',
  'nav.audit.hint': 'Hər əhəmiyyətli dəyişiklik və onu edən',
  'nav.portal': 'Təhlükəsizliyim',
  'nav.portal.hint': 'Sizə təyin olunmuş təlim və risk balınız',

  'shell.skipToContent': 'Məzmuna keç',
  'shell.search': 'Axtar və ya keç',
  'shell.collapse': 'Yığ',
  'shell.expand': 'Naviqasiyanı aç',
  'shell.switchAccount': 'Hesabı dəyiş',
  'shell.settings': 'Tənzimləmələr',
  'shell.signOut': 'Çıxış',
  'shell.language': 'Dil',
  'shell.running': 'işləyir',
  'shell.atGate': 'qapıda',

  'action.retry': 'Yenidən cəhd et',
  'action.checkNow': 'İndi yoxla',
  'action.checking': 'Yoxlanılır',
  'state.error': 'Xəta baş verdi',

  'severity.critical': 'Kritik',
  'severity.high': 'Yüksək',
  'severity.medium': 'Orta',
  'severity.low': 'Aşağı',
  'severity.info': 'Məlumat',

  'page.command-center.title': 'Komanda Mərkəzi',
  'page.loops.title': 'Qapalı dövrələr',
  'page.threats.title': 'Təhdid qəbulu',
  'page.approvals.title': 'Təsdiq qapısı',
  'page.simulations.title': 'Simulyasiyalar',
  'page.training.title': 'Təlim Studiyası',
  'page.sandbox.title': 'Sandbox',
  'page.employees.title': 'İşçilər',
  'page.departments.title': 'Departamentlər',
  'page.risk-profiles.title': 'Risk profilləri',
  'page.remediation.title': 'Korrektiv tədbirlər',
  'page.incident-risks.title': 'İnsident riskləri',
  'page.policy.title': 'Siyasət uyğunsuzluğu və məruz qalma',
  'page.intel.title': 'Təhdid kəşfiyyatı',
  'page.reports.title': 'Hesabatlar',
  'page.executive.title': 'Rəhbər baxışı',
  'page.integrations.title': 'İnteqrasiyalar',
  'page.audit.title': 'Audit jurnalı',
  'page.settings.title': 'Tənzimləmələr',

  'cc.operationalAreas': 'Əməliyyat sahələri',
  'cc.awaitingApproval': 'İnsan təsdiqi gözləyir',
  'cc.closedLoop': 'Qapalı dövrə',
  'cc.degraded': 'Zəifləmiş imkan',
  'cc.attention': 'İndi nəyə diqqət lazımdır',
  'cc.timeline': 'İnsident vaxt xətti',
  'cc.fullAudit': 'Tam audit jurnalı',
  'cc.open.threats': 'Təhdid qəbulunu aç',
  'cc.open.simulations': 'Simulyasiyaları aç',
  'cc.open.incidents': 'İnsident risklərini aç',
  'cc.open.policy': 'Siyasət kəşfiyyatını aç',
  'cc.open.integrations': 'İnteqrasiyaları aç',
}

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = { en, az }
