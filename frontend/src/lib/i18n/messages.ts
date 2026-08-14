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
  'nav.sandbox': 'Portal Sandbox',
  'nav.sandbox.hint': 'Static and behavioural analysis of files and URLs, inside the portal',
  'nav.sandbox.app': 'Full Sandbox',
  'nav.sandbox.app.hint':
    'Opens the full sandbox deployment in a new tab, already signed in as you.',
  'nav.sandbox.app.failed': 'Could not open the sandbox',
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
  'page.sandbox.title': 'Portal Sandbox',
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

  'page.approvals.lead':
    'Nothing generated from a real threat reaches a named employee until a person approves it here. Every row is a loop run stopped between conversion and targeting, waiting on a decision.',
  'page.audit.lead':
    'Every material change the platform made, who made it, and the state of the record on both sides of it. The trail is written by the API in the same transaction as the change, and there is no route that can append to it — which is what makes it worth reading.',
  'page.command-center.lead':
    'Where the loop is right now, and what is waiting on a person.',
  'page.departments.lead':
    'The same risk model, rolled up to the teams that carry it. Departed staff are excluded from every average, so a department is not credited for people who left.',
  'page.employees.lead':
    'Every person the risk engine scores, with the score it currently holds and the movement it has recorded. Open anyone to see the arithmetic behind their number.',
  'page.executive.lead':
    'Whether real threats are changing how people behave, and what is still open. Every figure states the period and the sample it came from; anything that was not measured says so rather than showing a zero.',
  'page.incident-risks.lead':
    'Risk that incident response raised against named people, and the work required to discharge it. A risk opens as a draft — nobody is on the hook until it is assigned.',
  'page.integrations.lead':
    'Connections to the learning platforms training would be delivered through, and to the identity providers people would sign in with.',
  'page.loops.lead':
    'Every threat that entered Cyclowareness, and exactly how far around the seven stages it has travelled. Nothing here advances past stage three without a human decision.',
  'page.remediation.lead':
    'What gets attached to a named person after something happened to them — and, just as often, the reasoned decision to attach nothing.',
  'page.reports.lead':
    'Evidence packs are built from the same records the operational screens read. The window below scopes every count on this page, and each pack says whether this deployment can actually produce it.',
  'page.settings.lead':
    'What this deployment is, what it can do, and the two preferences this browser remembers. Anything the platform cannot store is not offered here — a settings page of switches that do nothing is worse than a short one that is accurate.',
  'page.simulations.lead':
    'Safe campaigns built from prebuilt lures or from a real threat the sandbox has already analyzed. Delivery is not wired to a gateway here — outcomes are recorded against targets by an analyst, and every rate on this page says how many that was.',
  'page.intel.lead':
    'External advisories, compared against what this organisation runs and what it has approved. An advisory earns attention here when it matches something of ours.',
  'page.threats.lead':
    'Stage 1 of the loop. Employees report what reaches them, analysts push what matters from the curated feed, and anything submitted here starts a run immediately.',
  'page.training.lead':
    'Every module the platform has produced, with how it was written on the face of each row. Content that came from a fixed template is never labelled as AI — the distinction is the reason this screen can be trusted.',

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

  // --- panel titles, subtitles and captions (batch-translated, reviewer-
  //     checked; keys are content-derived slugs) --------------------------
  'x.a-campaign-appears-here-once':
    'A campaign appears here once you build one from a lure template or from a threat the sandbox has analyzed. Campaigns start as drafts and deliver nothing until launched.',
  'x.a-control-not-a-module':
    'a control, not a module',
  'x.a-finding-appears-here-when':
    'A finding appears here when intelligence, a policy review or an analyst raises something that contradicts one of these rules.',
  'x.a-finding-is-owned-dated':
    'A finding is owned, dated and worked. This one keeps the advisory as its evidence.',
  'x.a-module-appears-here-when':
    'A module appears here when a loop run reaches its conversion stage and turns an analyzed threat into training. Put an artifact into Threat Intake to start one.',
  'x.a-module-lands-here-when':
    'A module lands here when a real threat reaches your organisation, an analyst approves the training built from it, and the risk engine selects you as someone it actually affects.',
  'x.a-policy-appears-here-as':
    'A policy appears here as soon as a finding is raised against one of its rules and has not yet been resolved, accepted or marked a false positive.',
  'x.a-record-of-what-you':
    'A record of what you have done. It does not affect your risk score.',
  'x.a-risk-charged-to-named':
    'A risk charged to named people. It starts as a draft — nobody is asked for anything until the required work is assigned.',
  'x.a-risk-with-no-subjects':
    'A risk with no subjects asks nothing of anyone. Attach the people the incident named, then assign the required work.',
  'x.a-row-appears-here-once':
    'A row appears here once a real artifact has been analysed, converted into training and approved at the gate. Runs that were analysed and closed without targeting anybody are deliberately not listed.',
  'x.a-run-appears-here-the':
    'A run appears here the moment a threat is submitted, pushed from the curated feed, or promoted from an employee report. Each one then carries its own record of the seven stages.',
  'x.a-simulation-appears-here-once':
    'A simulation appears here once it is launched. Draft campaigns are not delivering to anyone.',
  'x.a-single-claim-about-the':
    'A single claim about the gap between a policy and the world, with the evidence behind it.',
  'x.a-snapshot-is-written-the':
    'A snapshot is written the first time a rule is activated or superseded on this policy. A document whose rules nobody has reviewed has no history to show.',
  'x.a-threat-record-is-written':
    'A threat record is written when an analyst pushes a report into the loop, pushes a curated feed item, or submits an artifact directly.',
  'x.accepting-discharges-this-persons-obligation':
    'Accepting discharges this person\'s obligation. Rejecting sends them back to it.',
  'x.account-request':
    'Account request',
  'x.active-simulations':
    'Active simulations',
  'x.add-external-material':
    'Add external material',
  'x.admin-portal':
    'Admin portal',
  'x.advisory-feed':
    'Advisory feed',
  'x.all-seven-stages-including-the':
    'All seven stages, including the ones this run never reached.',
  'x.also-assigned-to-you':
    'Also assigned to you',
  'x.an-entry-appears-here-the':
    'An entry appears here the moment this risk is edited, assigned, reviewed, closed or reopened. Opening it should already have written one, so an empty timeline means the audit trail did not answer.',
  'x.an-export-becomes-available-once':
    'An export becomes available once a sandbox job finishes. Widen the reporting window, or submit a file or URL to the sandbox to produce one.',
  'x.analysis':
    'Analysis',
  'x.analysis-capability-on-this-host':
    'Analysis capability on this host',
  'x.analysis-failed':
    'Analysis failed',
  'x.analysis-in-progress':
    'Analysis in progress',
  'x.analysis-tiers':
    'Analysis tiers',
  'x.analyst-feedback':
    'Analyst feedback',
  'x.and-whether-the-score-comes':
    'And whether the score comes from the seat or from the behaviour.',
  'x.answer-every-question-then-submit':
    'Answer every question, then submit. Nothing is graded until you do.',
  'x.answer-this-dispute':
    'Answer this dispute',
  'x.appearance':
    'Appearance',
  'x.approval-history':
    'Approval history',
  'x.approvals-policy-decisions-integration-chang':
    'Approvals, policy decisions, integration changes and demo resets are all recorded here as they happen.',
  'x.artifacts-in-the-platform':
    'Artifacts in the platform',
  'x.asking-the-platform-what-it':
    'Asking the platform what it can do',
  'x.asking-the-sandbox-what-it':
    'Asking the sandbox what it can do',
  'x.assess-relevance':
    'Assess relevance',
  'x.assign-the-required-work':
    'Assign the required work',
  'x.assign-training-for-this-finding':
    'Assign training for this finding',
  'x.assigned-by-incident-response':
    'Assigned by incident response',
  'x.assigned-to-you-after-an':
    'Assigned to you after an event',
  'x.attach-people-to-this-risk':
    'Attach people to this risk',
  'x.attaches-an-alreadyapproved-module-to':
    'Attaches an already-approved module to the people this finding names. No lesson content is generated here.',
  'x.attaching-names-somebody-in-the':
    'Attaching names somebody in the record. It does not yet ask anything of them — that happens when the required work is assigned.',
  'x.audit-entries':
    'Audit entries',
  'x.audit-trail':
    'Audit trail',
  'x.available-because-this-deployment-reports':
    'Available because this deployment reports demo mode. These routes do not exist in a production build.',
  'x.awaiting-triage':
    'Awaiting triage',
  'x.baseline-or-behaviour':
    'Baseline or behaviour',
  'x.baseline-plus-every-recorded-signal':
    'Baseline plus every recorded signal. Check it by hand.',
  'x.between-0-and-100-lower':
    'Between 0 and 100. Lower is safer. Every movement below was recorded by the risk engine when it happened.',
  'x.between-conversion-and-targeting-the':
    'Between conversion and targeting. The one step no machine performs.',
  'x.change-the-review-state-or':
    'Change the review state or clear the search to see the modules that do exist.',
  'x.change-the-status-of-this':
    'Change the status of this finding',
  'x.choose-a-lure-source-above':
    'Choose a lure source above to see exactly what will be stored on this campaign.',
  'x.close-this-campaign':
    'Close this campaign',
  'x.close-this-incident-risk':
    'Close this incident risk',
  'x.control-gaps':
    'Control gaps',
  'x.counting-the-records-behind-each':
    'Counting the records behind each pack',
  'x.course-imports-and-completion-sync':
    'Course imports and completion sync stop. The connection settings and the last sync result are kept.',
  'x.coverage-gaps':
    'Coverage gaps',
  'x.creates-real-training-assignments-against':
    'Creates real training assignments against the people attached to this risk.',
  'x.curated-intel-feed':
    'Curated intel feed',
  'x.current-risk-score':
    'Current risk score',
  'x.decision':
    'Decision',
  'x.deduplicated-across-every-analyzer-network':
    'De-duplicated across every analyzer. Network indicators are defanged and not clickable.',
  'x.demonstration-controls':
    'Demonstration controls',
  'x.department-context':
    'Department context',
  'x.departments-appear-here-once-they':
    'Departments appear here once they contain at least one employee the risk engine has scored.',
  'x.departments-appear-here-once-they-2':
    'Departments appear here once they contain at least one employee who has not left. Import an organisation, or seed the demonstration one, and the roll-ups follow.',
  'x.departments-requiring-attention':
    'Departments requiring attention',
  'x.derived-from-the-figures-on':
    'Derived from the figures on this page by a fixed rule set. Each one names the measurement it came from.',
  'x.dismiss-this-advisory':
    'Dismiss this advisory',
  'x.dismiss-this-report':
    'Dismiss this report?',
  'x.distribution-across-the-organisation':
    'Distribution across the organisation',
  'x.each-of-these-was-triggered':
    'Each of these was triggered by something specific, which is named.',
  'x.edit-the-generated-content':
    'Edit the generated content',
  'x.editing':
    'Editing',
  'x.editing-this-module':
    'Editing this module',
  'x.entries-appear-when-a-person':
    'Entries appear when a person acts on the run — an approval, a rejection, a forced measurement. Stage transitions performed by the orchestrator are recorded in the timeline above rather than here.',
  'x.every-audited-move-on-this':
    'Every audited move on this risk, oldest first',
  'x.every-current-score-on-the':
    'Every current score, on the scale the model actually uses.',
  'x.every-department':
    'Every department',
  'x.every-fact-this-deployment-records':
    'Every fact this deployment records about the artifact’s origin.',
  'x.every-loop-run-approval-assignment':
    'Every loop run, approval, assignment, sandbox job and audit entry is deleted and the seeded organisation is rebuilt. This cannot be undone.',
  'x.every-place-the-world-has':
    'Every place the world has moved away from a rule this organisation wrote down — with the evidence, the people affected, and what to do about it.',
  'x.every-point-traced-to-the':
    'Every point, traced to the thing that produced it.',
  'x.every-question-and-why':
    'Every question, and why',
  'x.every-recorded-event':
    'Every recorded event',
  'x.every-report-you-have-sent':
    'Every report you have sent, and where it got to.',
  'x.every-screen-below-is-one':
    'Every screen below is one this account can open. Anything not listed is enforced by the server as well as hidden here.',
  'x.every-threat-record-whatever-route':
    'Every threat record, whatever route it arrived by.',
  'x.evidence':
    'Evidence',
  'x.exactly-what-this-campaign-stored':
    'Exactly what this campaign stored. It is never rendered as a live link.',
  'x.external-material-each-link-checked':
    'External material, each link checked against the provider before it was listed.',
  'x.files-inside-this-archive':
    'Files inside this archive',
  'x.finding':
    'Finding',
  'x.findings':
    'Findings',
  'x.findings-appear-here-while-their':
    'Findings appear here while their status is open, in review, remediation planned or training assigned. Resolving, accepting or dismissing one takes it out.',
  'x.findings-by-severity':
    'Findings by severity',
  'x.findings-by-status':
    'Findings by status',
  'x.findings-queue':
    'Findings queue',
  'x.finished-without-a-verdict':
    'Finished without a verdict',
  'x.for-a-human-decision':
    'for a human decision',
  'x.generate-synthetic-outcomes':
    'Generate synthetic outcomes',
  'x.generating-content':
    'Generating content',
  'x.highest-current-scores':
    'Highest current scores',
  'x.highestseverity-open-findings':
    'Highest-severity open findings',
  'x.how-this-score-is-derived':
    'How this score is derived',
  'x.ids-the-server-could-not':
    'Ids the server could not resolve are shown, not dropped.',
  'x.if-it-looks-wrong-send':
    'If it looks wrong, send it. Reporting is never the wrong call.',
  'x.incident-response-raises-a-record':
    'Incident response raises a record here when an investigation identifies a person-level risk that needs a remedial action.',
  'x.incident-risk-assignments':
    'Incident risk assignments',
  'x.incidentresponse-work-could-not-be':
    'Incident-response work could not be loaded',
  'x.indicators':
    'Indicators',
  'x.integration-health':
    'Integration health',
  'x.issued-by-the-platform-when':
    'Issued by the platform when you authenticated.',
  'x.it-leaves-the-queue-its':
    'It leaves the queue. Its relevance assessment is left exactly as it stands.',
  'x.latest-threat-intake':
    'Latest threat intake',
  'x.loading-advisories':
    'Loading advisories',
  'x.loading-approved-training-modules':
    'Loading approved training modules',
  'x.loading-campaign':
    'Loading campaign',
  'x.loading-control-gaps':
    'Loading control gaps',
  'x.loading-coverage-gaps':
    'Loading coverage gaps',
  'x.loading-department-risk':
    'Loading department risk',
  'x.loading-findings':
    'Loading findings',
  'x.loading-findings-against-this-policy':
    'Loading findings against this policy',
  'x.loading-imported-courses':
    'Loading imported courses',
  'x.loading-incident-risks':
    'Loading incident risks',
  'x.loading-integrations':
    'Loading integrations',
  'x.loading-loop-runs':
    'Loading loop runs',
  'x.loading-measured-behaviour':
    'Loading measured behaviour',
  'x.loading-open-findings':
    'Loading open findings',
  'x.loading-policy-exposure':
    'Loading policy exposure',
  'x.loading-policy-finding-counts':
    'Loading policy finding counts',
  'x.loading-recent-actions':
    'Loading recent actions',
  'x.loading-remediation-plans':
    'Loading remediation plans',
  'x.loading-reports':
    'Loading reports',
  'x.loading-sandbox-analyses':
    'Loading sandbox analyses',
  'x.loading-simulation-campaigns':
    'Loading simulation campaigns',
  'x.loading-simulations':
    'Loading simulations',
  'x.loading-submissions':
    'Loading submissions',
  'x.loading-the-advisory':
    'Loading the advisory',
  'x.loading-the-analysis-report':
    'Loading the analysis report',
  'x.loading-the-approval-queue':
    'Loading the approval queue',
  'x.loading-the-approval-workspace':
    'Loading the approval workspace',
  'x.loading-the-artifact':
    'Loading the artifact',
  'x.loading-the-audit-trail':
    'Loading the audit trail',
  'x.loading-the-curated-feed':
    'Loading the curated feed',
  'x.loading-the-finding':
    'Loading the finding',
  'x.loading-the-humansensor-queue':
    'Loading the human-sensor queue',
  'x.loading-the-incident-risk':
    'Loading the incident risk',
  'x.loading-the-loop':
    'Loading the loop',
  'x.loading-the-loop-run':
    'Loading the loop run',
  'x.loading-the-matched-policy':
    'Loading the matched policy',
  'x.loading-the-organisation-posture':
    'Loading the organisation posture',
  'x.loading-the-organisation-trend':
    'Loading the organisation trend',
  'x.loading-the-policy':
    'Loading the policy',
  'x.loading-the-policy-library':
    'Loading the policy library',
  'x.loading-the-roster':
    'Loading the roster',
  'x.loading-the-status-breakdown':
    'Loading the status breakdown',
  'x.loading-this-persons-risk-profile':
    'Loading this person\'s risk profile',
  'x.loading-threat-intake':
    'Loading threat intake',
  'x.loading-threat-records':
    'Loading threat records',
  'x.loading-training-module':
    'Loading training module',
  'x.loading-training-modules':
    'Loading training modules',
  'x.loading-your-security-portal':
    'Loading your security portal',
  'x.loading-your-training-module':
    'Loading your training module',
  'x.lowest-averages-with-nobody-in':
    'Lowest averages with nobody in the high-risk band. Standing, not improvement.',
  'x.lure':
    'Lure',
  'x.map-course-to-behaviours':
    'Map course to behaviours',
  'x.measured-behaviour':
    'Measured behaviour',
  'x.module':
    'Module',
  'x.module-record':
    'Module record',
  'x.modules-appear-here-once-you':
    'Modules appear here once you complete them, with the score you achieved and how long it took.',
  'x.modules-whose-author-was-never':
    'Modules whose author was never written down',
  'x.most-recent-first-each-one':
    'Most recent first. Each one was approved by a person before anybody was targeted.',
  'x.movement-by-department-cannot-be':
    'Movement by department cannot be measured here',
  'x.named-here-written-in-the':
    'Named here, written in the editor it opens into. It starts in pending review.',
  'x.new-simulation-campaign':
    'New simulation campaign',
  'x.new-training-module':
    'New training module',
  'x.newest-first-expand-an-entry':
    'Newest first. Expand an entry to see the before and after snapshot.',
  'x.newest-first-with-the-delta':
    'Newest first, with the delta the engine applied and the loop run that caused it.',
  'x.newest-publication-first-open-one':
    'Newest publication first. Open one to see what of ours it touches.',
  'x.no-department-movement-to-show':
    'No department movement to show',
  'x.no-evidence-rows-were-recorded':
    'No evidence rows were recorded for this finding. Treat it as unverified until they are.',
  'x.no-evidence-was-recorded-for':
    'No evidence was recorded for this risk. Nobody reviewing it later will be able to check it.',
  'x.no-evidence-was-recorded-for-2':
    'No evidence was recorded for this.',
  'x.no-metadata-was-recorded-with':
    'No metadata was recorded with this artifact.',
  'x.no-model-involved':
    'no model involved',
  'x.no-verdict-has-been-recorded':
    'No verdict has been recorded',
  'x.nonsensitive-connection-settings-stored-loca':
    'Non-sensitive connection settings. Stored locally and audited; nothing is sent to the provider.',
  'x.nothing-covered-it':
    'nothing covered it',
  'x.nothing-reaches-a-person-until':
    'Nothing reaches a person until a named human approves it.',
  'x.only-a-module-that-has':
    'Only a module that has passed the human approval gate may be put in front of a named person. Approve one first, then come back.',
  'x.open-an-incident-risk':
    'Open an incident risk',
  'x.open-and-closed-risks':
    'Open and closed risks',
  'x.open-policy-findings-by-severity':
    'Open policy findings by severity',
  'x.ordered-by-severity-then-by':
    'Ordered by severity, then by how soon they are due.',
  'x.outcomes':
    'Outcomes',
  'x.password-reset-request':
    'Password reset request',
  'x.paste-video-or-course-urls':
    'Paste video or course URLs. Each is fetched before it is stored; whatever cannot be reached is refused with the reason.',
  'x.peranalyzer-detail':
    'Per-analyzer detail',
  'x.pick-a-lure-name-the':
    'Pick a lure, name the campaign, and choose who receives it. It is created as a draft.',
  'x.plans':
    'Plans',
  'x.plans-assigned-to-you-could':
    'Plans assigned to you could not be loaded',
  'x.policies-most-in-drift':
    'Policies most in drift',
  'x.policy-library':
    'Policy library',
  'x.proposed-audience':
    'Proposed audience',
  'x.provenance':
    'Provenance',
  'x.quiz':
    'Quiz',
  'x.quiz-and-answer-key':
    'Quiz and answer key',
  'x.raise-a-policy-finding':
    'Raise a policy finding',
  'x.raised-by-an-analyst-against':
    'Raised by an analyst against a specific incident, and reviewed by one when you finish.',
  'x.rates-are-divided-by-the':
    'Rates are divided by the targets that have a recorded outcome, not by everyone targeted.',
  'x.raw-artifact':
    'Raw artifact',
  'x.read-every-finding-below-against':
    'Read every finding below against this.',
  'x.read-from-the-engine-at':
    'Read from the engine at request time, not from configuration.',
  'x.read-from-the-platform-at':
    'Read from the platform at runtime. Nothing on this panel is configurable from the browser.',
  'x.real-threats-that-put-people':
    'Real threats that put people into training',
  'x.realworld-items-an-analyst-can':
    'Real-world items an analyst can push into stage 1 of the loop.',
  'x.recent-analyst-actions':
    'Recent analyst actions',
  'x.recognition':
    'Recognition',
  'x.recommended-next-steps':
    'Recommended next steps',
  'x.refreshes-while-a-job-is':
    'Refreshes while a job is moving.',
  'x.registered-policies':
    'Registered policies',
  'x.rejecting-marks-the-module-rejected':
    'Rejecting marks the module rejected and closes the run as failed by review. Nobody is assigned anything, and the run cannot be resumed from here.',
  'x.reopen-this-incident-risk':
    'Reopen this incident risk',
  'x.reopening-clears-the-closure-note':
    'Reopening clears the closure note and raises the reopened count. Both are kept in the audit trail.',
  'x.report-something-suspicious':
    'Report something suspicious',
  'x.reports-arrive-here-the-moment':
    'Reports arrive here the moment somebody uses the report control in the employee portal. Each one is triaged automatically and then waits for an analyst.',
  'x.reports-submitted':
    'Reports submitted',
  'x.request-an-account':
    'Request an account',
  'x.reset-the-demonstration-world':
    'Reset the demonstration world',
  'x.reset-your-password':
    'Reset your password',
  'x.review-history':
    'Review history',
  'x.roster':
    'Roster',
  'x.rules-whose-status-this-build':
    'Rules whose status this build does not have a heading for. Shown rather than hidden.',
  'x.runs-awaiting-a-decision':
    'Runs awaiting a decision',
  'x.safety-and-provenance':
    'Safety and provenance',
  'x.sandbox-analysis-exports':
    'Sandbox analysis exports',
  'x.saved-to-the-module-before':
    'Saved to the module before any decision is recorded.',
  'x.score-breakdown':
    'Score breakdown',
  'x.sections':
    'Sections',
  'x.select-a-stage-or-the':
    'Select a stage or the gate to filter the runs below',
  'x.seven-stages-stage-7-feeds':
    'Seven stages. Stage 7 feeds stage 1 — the evidence from one cycle decides the next.',
  'x.sign-in':
    'Sign in',
  'x.signals':
    'Signals',
  'x.signed-in':
    'Signed in',
  'x.simulation-outcomes':
    'Simulation outcomes',
  'x.sorted-by-how-long-each':
    'Sorted by how long each item has waited. Nothing below has reached an employee.',
  'x.sorted-by-risk-score-by':
    'Sorted by risk score by default. Every column header sorts, and every filter is in the URL.',
  'x.source-coverage':
    'Source coverage',
  'x.source-document-and-extraction':
    'Source document and extraction',
  'x.stage-timeline':
    'Stage timeline',
  'x.standing-today-an-elevated-or':
    'Standing today — an elevated or high average, or anyone in the high-risk band.',
  'x.stored-in-this-browser-for':
    'Stored in this browser, for this browser. Nothing here leaves the device or reaches the platform.',
  'x.strongest-departments-today':
    'Strongest departments today',
  'x.subjects':
    'Subjects',
  'x.submissions':
    'Submissions',
  'x.submit-a-sample':
    'Submit a sample',
  'x.submit-an-artifact':
    'Submit an artifact',
  'x.submit-your-answers':
    'Submit your answers',
  'x.take-these-after-the-one':
    'Take these after the one above.',
  'x.targets':
    'Targets',
  'x.targets-are-chosen-when-the':
    'Targets are chosen when the campaign is created, from departments and risk bands. A campaign with none cannot be measured.',
  'x.the-advisory-was-not-dismissed':
    'The advisory was not dismissed',
  'x.the-analyzer-found-nothing-it':
    'The analyzer found nothing it recognised as a URL, domain, sender pattern or hash in this artifact. That is a result, not a gap — an SMS lure with no link produces none.',
  'x.the-api-writes-an-entry':
    'The API writes an entry on every material change to a risk. An empty list here means nothing has changed since it was opened — or that the trail was not readable.',
  'x.the-approval-workspace-needs-a':
    'The approval workspace needs a loop run that exists. Return to the gate and open a run from the queue.',
  'x.the-assessment-was-not-recorded':
    'The assessment was not recorded',
  'x.the-documents-the-organisation-is':
    'The documents the organisation is measured against, the rules extracted from them, and the passage behind every rule.',
  'x.the-executive-endpoint-answered-without':
    'The executive endpoint answered without a posture payload. Nothing is inferred in its place — reload once the platform is serving again.',
  'x.the-file-is-quarantined-on':
    'The file is quarantined on arrival and parsed. It is never executed.',
  'x.the-finding-was-not-raised':
    'The finding was not raised',
  'x.the-generated-training':
    'The generated training',
  'x.the-highestseverity-observations-in-the':
    'The highest-severity observations, in the analyzers\' own words.',
  'x.the-loop':
    'The loop',
  'x.the-loop-in-order':
    'The loop, in order',
  'x.the-model':
    'The model',
  'x.the-model-above-is-still':
    'The model above is still exactly what this deployment runs — there is simply nobody for it to run on. Import an organisation, or seed the demonstration one, and every figure on this page fills in.',
  'x.the-most-recent-artifacts-the':
    'The most recent artifacts the platform accepted',
  'x.the-note-is-the-record':
    'The note is the record that the closure criteria were met. It cannot be left blank.',
  'x.the-one-thing-to-remember':
    'The one thing to remember',
  'x.the-only-packs-this-deployment':
    'The only packs this deployment generates. Each one is produced by the API from the stored analysis, in the format named on the button.',
  'x.the-original-threat':
    'The original threat',
  'x.the-policy-and-the-rule':
    'The policy and the rule',
  'x.the-record':
    'The record',
  'x.the-record-may-have-been':
    'The record may have been removed, or the link may point at a different deployment.',
  'x.the-report-is-closed-without':
    'The report is closed without starting a loop run. Nothing is deleted, and the employee keeps the credit their risk score already received for reporting.',
  'x.the-signals':
    'The signals',
  'x.the-source-check-could-not':
    'The source check could not be requested',
  'x.the-stats-endpoint-answered-but':
    'The stats endpoint answered, but not with the counts this screen needs. Nothing is shown rather than a row of zeros, because zero findings and no answer are different facts.',
  'x.this-archive-is-encrypted':
    'This archive is encrypted',
  'x.this-deployment':
    'This deployment',
  'x.this-feed-is-filled-by':
    'This feed is filled by the platform, not by an external subscription. When it holds items, an analyst can push any of them into the loop from here.',
  'x.this-module-has-no-questions':
    'This module has no questions',
  'x.this-persons-score-is-still':
    'This person\'s score is still exactly their role baseline. Events appear the moment the engine records a simulation outcome, a completed module, a report or an analyst adjustment.',
  'x.this-starts-a-loop-run':
    'This starts a loop run immediately: analysis, conversion, then the human approval gate.',
  'x.threats-appear-here-when-an':
    'Threats appear here when an employee reports one, an analyst submits one, or an item is pushed from the intelligence feed.',
  'x.timeline':
    'Timeline',
  'x.title-description-sections-quiz-and':
    'Title, description, sections, quiz and takeaway are the fields the API accepts.',
  'x.trail':
    'Trail',
  'x.training-and-simulation-history':
    'Training and simulation history',
  'x.training-is-delivered-inside-cyclowareness':
    'Training is delivered inside Cyclowareness. Connect an LMS or identity provider to sync courses and people.',
  'x.training-recorded':
    'Training recorded',
  'x.training-you-have-finished':
    'Training you have finished',
  'x.two-lines-and-the-four':
    'Two lines, and the four rules that keep them honest.',
  'x.two-things-worth-knowing-before':
    'Two things worth knowing before you start',
  'x.use-report-something-suspicious-at':
    'Use “Report something suspicious” at the top of this page. Anything you send appears here with the outcome your security team recorded.',
  'x.version-history':
    'Version history',
  'x.was-this-verdict-right-the':
    'Was this verdict right? The answer is kept with the job, and it does not alter the score.',
  'x.what-each-one-means-what':
    'What each one means, what it is worth, and what the engine has recorded lately.',
  'x.what-is-on-this-screen':
    'What is on this screen',
  'x.what-ran-and-what-did':
    'What ran, and what did not',
  'x.what-the-affected-employee-sees':
    'What the affected employee sees',
  'x.what-the-employee-reads':
    'What the employee reads',
  'x.what-the-employee-reads-in':
    'What the employee reads, in order.',
  'x.what-the-incident-found-a':
    'What the incident found. A risk without it is an assertion.',
  'x.what-this-artifact-set-in':
    'What this artifact set in motion.',
  'x.what-this-build-records-on':
    'What this build records on the finding itself.',
  'x.what-this-connection-has-mirrored':
    'What this connection has mirrored, and which of our behaviours each course is claimed to move.',
  'x.what-this-deployment-can-fetch':
    'What this deployment can fetch, and what it last fetched.',
  'x.what-to-do':
    'What to do',
  'x.what-you-have-reported':
    'What you have reported',
  'x.where-the-organisation-stands':
    'Where the organisation stands',
  'x.where-the-organisations-own-documents':
    'Where the organisation\'s own documents no longer match the world they were written for — each finding tied to the rule it contradicts and the evidence behind it.',
  'x.where-the-rules-came-from':
    'Where the rules came from, or why there are none.',
  'x.where-this-came-from':
    'Where this came from',
  'x.where-this-stands':
    'Where this stands',
  'x.where-to-learn-more':
    'Where to learn more',
  'x.which-half-of-the-model':
    'Which half of the model the organisation\'s risk is actually coming from.',
  'x.who-is-affected':
    'Who is affected',
  'x.why-this-scored-the-way':
    'Why this scored the way it did',
  'x.widen-the-status-channel-or':
    'Widen the status, channel or search filter to see the campaigns that do exist.',
  'x.without-these-a-finding-is':
    'Without these, a finding is an assertion. Each row is something a reader can go and check.',
  'x.work-appears-here-when-an':
    'Work appears here when an analyst attaches you to an incident — for example after a real threat reached your inbox and needed a documented response.',
  'x.worst-first-open-a-roster':
    'Worst first. Open a roster to see the individuals behind the average.',
  'x.written-by-the-api-on':
    'Written by the API on every material change',
  'x.written-whenever-a-rule-is':
    'Written whenever a rule is activated or superseded. Append-only.',
  'x.your-answers-are-graded-now':
    'Your answers are graded now and the result is recorded against you, including the change to your risk score. This cannot be undone or retaken.',
  'x.your-answers-were-not-graded':
    'Your answers were not graded',
  'x.your-assigned-training-could-not':
    'Your assigned training could not be loaded',
  'x.your-record-scores-are-the':
    'Your record. Scores are the ones the platform graded at the time.',
  'x.your-recorded-events-could-not':
    'Your recorded events could not be loaded',
  'x.your-report-was-not-sent':
    'Your report was not sent',
  'x.your-reports-could-not-be':
    'Your reports could not be loaded',
  'x.your-risk-score':
    'Your risk score',

  // --- inline headings and labels ---------------------------------------
  'y.analysis-capability':
    'Analysis capability',
  'y.approval-gate':
    'Approval gate',
  'y.as-published':
    'As published',
  'y.assigned':
    'Assigned',
  'y.badges':
    'Badges',
  'y.behaviour-summary':
    'Behaviour summary',
  'y.behavioural-analysis':
    'Behavioural analysis',
  'y.chain-of-custody':
    'Chain of custody',
  'y.closure-criteria-as-written-when':
    'Closure criteria, as written when this was opened',
  'y.content-provenance':
    'Content provenance',
  'y.demonstration-accounts':
    'DEMONSTRATION ACCOUNTS',
  'y.departments-this-run-touched':
    'Departments this run touched',
  'y.from':
    'From',
  'y.how-the-open-findings-are':
    'How the open findings are distributed',
  'y.impact':
    'Impact',
  'y.indicators-of-compromise':
    'Indicators of compromise',
  'y.lesson-sections':
    'Lesson sections',
  'y.mitre-attampck':
    'MITRE ATT&amp;CK',
  'y.mitre-attampck-mapping':
    'MITRE ATT&amp;CK mapping',
  'y.model-component':
    'Model component',
  'y.module-complete':
    'Module complete',
  'y.net-risk-movement':
    'Net risk movement',
  'y.packs-this-deployment-cannot-yet':
    'Packs this deployment cannot yet generate',
  'y.plainlanguage-explanation':
    'Plain-language explanation',
  'y.policy-exposure-by-severity':
    'Policy exposure by severity',
  'y.quiz':
    'Quiz',
  'y.recent-changes':
    'Recent changes',
  'y.recorded-metadata':
    'Recorded metadata',
  'y.required-approvals':
    'Required approvals',
  'y.riskscore-impact':
    'Risk-score impact',
  'y.rule-component':
    'Rule component',
  'y.sandbox':
    'Sandbox',
  'y.sandbox-report':
    'Sandbox report',
  'y.skipped-and-why':
    'Skipped, and why',
  'y.teams-safest-first':
    'Teams, safest first',
  'y.the-closure-note-that-did':
    'The closure note that did not hold',
  'y.the-content-contradicts-the-name':
    'The content contradicts the name it was given',
  'y.what-carries-each-requirement':
    'What carries each requirement',
  'y.what-this-run-leaves-open':
    'What this run leaves open',
  'y.where-your-score-started':
    'Where your score started',
  'y.why-each-person':
    'Why each person',
  'y.why-you-received-this':
    'Why you received this',

  // --- report catalogue -------------------------------------------------
  'z.closedloop-evidence-pack':
    'Closed-loop evidence pack',
  'z.department-risk-report':
    'Department risk report',
  'z.policy-exposure-report':
    'Policy exposure report',
  'z.incidentrisk-remediation-report':
    'Incident-risk remediation report',
  'z.the-document-a-regulator-or':
    'The document a regulator or an insurer asks for: proof that a real threat reached a real person and that something measurable happened afterwards.',
  'z.where-the-human-risk-concentrates':
    'Where the human risk concentrates, for a leadership review — the rollup an executive is asked to act on quarterly.',
  'z.every-place-the-world-has':
    'Every place the world has moved away from a rule this organisation wrote down, with the passage each rule came from.',
  'z.what-incident-response-asked-of':
    'What incident response asked of named people, and whether it was completed to the standard that was set.',

  // --- late literals (helpers and inline ternaries) ---------------------
  'w.every-active-and-recently-closed':
    'Every active and recently closed run',
  'w.static-and-dynamic-analysis':
    'Static and dynamic analysis',
  'w.static-analysis-only':
    'Static analysis only',
  'w.worker-attached':
    'Worker attached',

  // --- the authentication screens ---------------------------------------
  'a.admin-intro':
    'The operational console. A registered admin number, then a one-time code.',
  'a.admin-phone-label':
    'Admin phone number',
  'a.digits-only':
    'Digits only; spaces are ignored.',
  'a.otp-label':
    'One-time code',
  'a.otp-hint':
    'Six digits. A code works once and expires in five minutes.',
  'a.enter-admin':
    'Enter the admin portal',
  'a.different-number':
    'Different number',
  'a.continue':
    'Continue',
  'a.not-admin':
    'Not an administrator?',
  'a.employee-signin':
    'Employee sign-in',
  'a.phone-entry-label':
    'Sign in with your phone number',
  'a.phone-entry-hint':
    'The number your workplace registered for you.',
  'a.continue-phone':
    'Continue with phone',
  'a.not-registered':
    'This number is not registered.',
  'a.no-answer':
    'The server did not answer.',
  'a.login-intro':
    'Your role decides what the platform shows you, and what it lets you approve.',
  'a.accounts-provisioned':
    'Accounts are provisioned by the security team.',
  'a.request-account':
    'Request one',
  'a.built-by':
    'Built by',
  'a.tagline':
    'CLOSED-LOOP HUMAN CYBER RISK',

  // --- explanatory prose ------------------------------------------------
  'p.a-blank-measurement-is-a-blank':
    'A blank measurement is a blank measurement. Where the platform has not measured something yet it prints an em dash and says how large the sample was, rather than a zero that looks like good news.',
  'p.a-connection-record-appears-once-a':
    'A connection record appears once a provider is registered with the platform. This deployment ships a set of them so the states can be demonstrated.',
  'p.a-current-position-not-a-trend':
    'A current position, not a trend. The trend lives on the department screen.',
  'p.a-detonation-host-is-attached':
    'A detonation host is attached.',
  'p.a-detonation-worker-is-attached-behavioural':
    'A detonation worker is attached. Behavioural signals in a report were observed, not inferred.',
  'p.a-fictional-organisation-is-seeded-for':
    'A fictional organisation is seeded for demonstration. The risk engine, the sandbox and the approval gate operating on it are the real ones.',
  'p.a-finding-is-raised-when-threat':
    'A finding is raised when threat intelligence matches a policy rule, when a policy review turns something up, or when an analyst records one directly.',
  'p.a-floor-not-a-total-a':
    'A floor, not a total. A finding scoped to a whole department contributes nobody to this head count.',
  'p.a-high-completion-rate-is-not':
    'A high completion rate is not evidence of changed behaviour. The click and report rates are.',
  'p.a-language-model-is-connected-generated':
    'A language model is connected — generated content is labelled AI.',
  'p.a-mapping-is-your-assertion-that':
    'A mapping is your assertion that finishing this course changes the behaviour named. It is recorded against your account, because targeting depends on it — an over-claimed mapping sends the wrong people to the wrong course, and the measurement afterwards reads as a training failure.',
  'p.a-model-is-connected-content-it':
    'A model is connected. Content it writes is labelled as AI-generated and still passes the human approval gate before anyone receives it.',
  'p.a-named-person-approved-this-content':
    'A named person approved this content at the gate before it was used.',
  'p.a-persignal-rollup-across-the-whole':
    'A per-signal roll-up across the whole organisation is not exposed by the API — the breakdown endpoint answers for one person at a time. The table below therefore counts real events from the recent tail rather than claiming an all-time total.',
  'p.a-plan-is-raised-when-a':
    'A plan is raised when a signal names a specific person — a simulation click, a credential submission, a malicious verdict on something they received. Nothing is raised on a schedule.',
  'p.a-policy-appears-here-once-its':
    'A policy appears here once its document — or just its metadata — has been registered through the platform API. Extraction is a separate, opt-in step.',
  'p.a-reason-is-required-to-dismiss':
    'A reason is required to dismiss an advisory.',
  'p.a-reason-is-required-to-mark':
    'A reason is required to mark an advisory not applicable.',
  'p.a-reason-is-required':
    'A reason is required.',
  'p.a-refusal-is-a-security-metric':
    'A refusal is a security metric, not an error. A rise in one code means somebody is probing what this product will write into an employee&rsquo;s screen.',
  'p.a-rejected-rule-was-never-in':
    'A rejected rule was never in force, so no version snapshot is written. The reason is recorded in the audit trail.',
  'p.a-risk-appears-here-when-incident':
    'A risk appears here when incident response charges an exposure to named people — a credential entered on a spoofed portal, a file sent to the wrong recipient, a procedure skipped under pressure.',
  'p.a-risk-score-is-one-number':
    'A risk score is one number between 0 and 100 describing how likely this person is to be the point where an attack succeeds. It is not a performance rating and it is not an opinion — it is a starting point set by their role, plus every signal the platform has recorded about them.',
  'p.a-sync-against-a-connection-that':
    'A sync against a connection that is not configured or is disabled is refused by the API. Configure it first, and the refusal will be shown here.',
  'p.a-sync-asks-the-provider-for':
    'A sync asks the provider for courses and completions. No provider client exists in this build, so it will report plainly that nothing was requested and leave the stored sync state alone.',
  'p.a-threat-that-became-training-and':
    'A threat that became training and was then measured. Runs that closed without measuring anything are not counted.',
  'p.accepted-file-types':
    'Accepted file types',
  'p.account-name':
    'Account name',
  'p.activate-this-proposed-rule':
    'Activate this proposed rule',
  'p.activating-changes-the-set-of-rules':
    'Activating changes the set of rules this organisation is checked against, so the API writes an immutable snapshot of the rule set at this moment.',
  'p.add-a-behaviour':
    'Add a behaviour',
  'p.add-a-comment-first-a-revision':
    'Add a comment first — a revision request without one leaves nothing to act on.',
  'p.add-a-comment-first-the-server':
    'Add a comment first — the server refuses a rejection without a reason.',
  'p.advisories-reach-this-module-by-being':
    'Advisories reach this module by being seeded or entered by hand — no external source is configured, so nothing arrives on its own. Configure one and fetched advisories will appear here.',
  'p.advisories-updated':
    'Advisories updated',
  'p.affected-department':
    'Affected department',
  'p.affected-products-as-published':
    'Affected products, as published',
  'p.all-named-subjects-accepted-at-or':
    'All named subjects accepted at or above the pass mark, and the credential rotated.',
  'p.already-raised-from-this-advisory':
    'Already raised from this advisory',
  'p.an-analyst-accepted-the-report-targeting':
    'An analyst accepted the report; targeting keys from the reporter were stripped at this boundary.',
  'p.an-analyst-pushed-a-curated-feed':
    'An analyst pushed a curated feed item into the loop.',
  'p.an-analyst-submitted-the-artifact-directly':
    'An analyst submitted the artifact directly.',
  'p.an-analyst-wrote-or-rewrote-this':
    'An analyst wrote or rewrote this content.',
  'p.an-assignment-is-delivered-by-appearing':
    'An assignment is delivered by appearing in the assignee&apos;s portal. No mail gateway is connected in this deployment, so nothing was emailed and no send or open event is recorded.',
  'p.an-entry-is-written-whenever-an':
    'An entry is written whenever an approval is decided, a policy rule is reviewed, an integration is changed, or an incident risk moves. Widen the window to reach older activity.',
  'p.an-extraction-run-completed-and-wrote':
    'An extraction run completed and wrote nothing. Check the document under the Document tab.',
  'p.an-isolated-detonation-worker-is-attached':
    'An isolated detonation worker is attached to this deployment. Samples are parsed and also executed under supervision, and both sets of findings appear in the report.',
  'p.an-unexpected-error-stopped-this-view':
    'An unexpected error stopped this view from loading. The details below are all the product knows.',
  'p.analyse-a-file-or-a-url':
    'Analyse a file or a URL',
  'p.analysis-stopped-rather-than-continuing-on':
    'Analysis stopped rather than continuing on a container it cannot open. The engine does not guess passwords and does not brute-force them — supplying one is a deliberate analyst action, and it is recorded as such.',
  'p.analysis-time':
    'Analysis time',
  'p.analyst-comment':
    'Analyst comment',
  'p.analyzed-threat':
    'Analyzed threat',
  'p.analyzer-verdict':
    'Analyzer verdict',
  'p.anyone-already-attached-is-shown-as':
    'Anyone already attached is shown as such and is left untouched.',
  'p.anything-else-is-still-accepted-and':
    'Anything else is still accepted and identified by content — the list is what the engine has a dedicated parser for.',
  'p.anything-else-worth-knowing-optional':
    'Anything else worth knowing (optional)',
  'p.approval-gate':
    'Approval gate',
  'p.approve-and-release':
    'Approve and release',
  'p.approved-by-policy':
    'Approved by policy',
  'p.approved-module':
    'Approved module',
  'p.approved-software':
    'Approved software…',
  'p.archive-password':
    'Archive password',
  'p.archive-password-optional':
    'Archive password (optional)',
  'p.argument-this-finding-rests-on':
    'Argument this finding rests on',
  'p.arrival-time-not-recorded':
    'Arrival time not recorded',
  'p.artifact-body':
    'Artifact body',
  'p.artifact-metadata':
    'Artifact metadata',
  'p.artifact-reference-displayed-verbatim-never-link':
    'Artifact reference — displayed verbatim, never linkified',
  'p.artifact-type':
    'Artifact type',
  'p.asking-the-api-which-environment-this':
    'Asking the API which environment this is.',
  'p.asking-the-sandbox-what-it-can':
    'Asking the sandbox what it can do.',
  'p.assessed-as-urgent':
    'Assessed as urgent',
  'p.at-least-one-configured-engine-receives':
    'At least one configured engine receives data from this deployment. What each one receives is named below.',
  'p.at-least-three-characters-sentence-case':
    'At least three characters. Sentence case, like the rest of the catalogue.',
  'p.attendance-not-behaviour-change-read-it':
    'Attendance, not behaviour change. Read it as the floor under the two rates above.',
  'p.average-behaviour-risk':
    'Average behaviour risk',
  'p.average-quiz-score':
    'Average quiz score',
  'p.average-reporting-time':
    'Average reporting time',
  'p.average-risk-across-everyone-in-the':
    'Average risk across everyone in the department. It is a team average, not anyone\'s individual score.',
  'p.average-risk-across-the-organisation':
    'Average risk across the organisation',
  'p.average-risk-score':
    'Average risk score',
  'p.average-role-baseline':
    'Average role baseline',
  'p.average-score':
    'Average score',
  'p.average-time-spent':
    'Average time spent',
  'p.awaiting-review':
    'Awaiting review',
  'p.bands-are-fixed-029-low-3059':
    'Bands are fixed: 0–29 low, 30–59 medium, 60–79 high, 80–100 critical.',
  'p.behaviour-over-time':
    'Behaviour over time',
  'p.blocked-by-sovereign-mode':
    'Blocked by sovereign mode',
  'p.cve-id-title-or-summary':
    'CVE id, title or summary',
  'p.cvss-not-scored':
    'CVSS not scored',
  'p.campaign-created-as-a-draft':
    'Campaign created as a draft',
  'p.campaign-name':
    'Campaign name',
  'p.campaigns-launched-and-still-collecting-outcomes':
    'Campaigns launched and still collecting outcomes',
  'p.carried-by-a-real-training-assignment':
    'Carried by a real training assignment against an approved module.',
  'p.caspian-dynamics-has-been-reseeded-with':
    'Caspian Dynamics has been re-seeded with six months of history re-anchored to now.',
  'p.change-in-average-risk':
    'Change in average risk',
  'p.change-in-average-risk-negative-is':
    'Change in average risk · negative is improvement',
  'p.changed-saving-rewrites-the-module-and':
    'Changed. Saving rewrites the module and marks it analyst-edited.',
  'p.changing-a-finding-requires-the-policy':
    'Changing a finding requires the policy management permission.',
  'p.chart-unavailable':
    'Chart unavailable',
  'p.chart-window':
    'Chart window',
  'p.choose-a-lure-source':
    'Choose a lure source.',
  'p.choose-a-module':
    'Choose a module…',
  'p.choose-an-approved-module':
    'Choose an approved module',
  'p.choose-another-state-or-set-the':
    'Choose another state, or set the filter back to every state.',
  'p.chooses-how-the-analyzer-reads-the':
    'Chooses how the analyzer reads the body below.',
  'p.classification':
    'Classification',
  'p.clear-a-filter-or-widen-the':
    'Clear a filter or widen the window. An action filter also matches every verb beneath it, so a family name is usually a better place to start than an exact one.',
  'p.clear-a-filter-to-widen-the':
    'Clear a filter to widen the search. The department filter runs over the most recently updated policies, so a very old document may sit outside it.',
  'p.clear-one-of-the-filters-to':
    'Clear one of the filters to widen the search. The department filter runs over a capped scan of the most recent findings, so an old one can fall outside it.',
  'p.clear-the-filter-to-see-every':
    'Clear the filter to see every plan the engine has produced.',
  'p.clear-the-search':
    'Clear the search',
  'p.clear-the-search-to-see-the':
    'Clear the search to see the courses this connection does hold.',
  'p.click-rate-is-at-or-below':
    'Click rate is at or below reporting rate, no department sits in the high band, no high-severity finding is open, and at least one loop has closed with a measurement. That is the absence of a warning, not a certificate.',
  'p.clicked-targets-divided-by-every-simulation':
    'Clicked targets divided by every simulation target that reached an outcome.',
  'p.close-campaign':
    'Close campaign',
  'p.close-the-palette-a-dialog-or':
    'Close the palette, a dialog or a side sheet',
  'p.closed-loops':
    'Closed loops',
  'p.closes-the-run-as-failedbyreview-nothing':
    'Closes the run as failed-by-review. Nothing is assigned.',
  'p.closure-criteria':
    'Closure criteria',
  'p.closure-note':
    'Closure note',
  'p.command-palette':
    'Command palette',
  'p.compiled-at-startup-and-applied-to':
    'Compiled at startup and applied to every submission.',
  'p.complete-the-supplierimpersonation-module-and-ch':
    'Complete the supplier-impersonation module and change the exposed credential.',
  'p.completed-assignments-divided-by-assignments-mad':
    'Completed assignments divided by assignments made in the window.',
  'p.completing-this-module-moves-the-employeeaposs':
    'Completing this module moves the employee&apos;s risk score. The size of that move is decided by the risk engine at completion time, not here.',
  'p.completion-is-attendance-not-behaviour-change':
    'Completion is attendance, not behaviour change',
  'p.completion-is-not-the-same-as':
    'Completion is not the same as competence. The score below is what evidences that.',
  'p.computed-from-the-roster-in-the':
    'Computed from the roster in the browser, so every person counts once. The department averages below come from the server and exclude people who have left.',
  'p.computed-when-the-employee-completes-the':
    'Computed when the employee completes the quiz. Nothing has been measured for this module yet, so no number is shown here.',
  'p.confidentiality':
    'Confidentiality',
  'p.configurable-per-pilot-so-a-deployment':
    'Configurable per pilot so a deployment can be white-labelled.',
  'p.configured-sources':
    'Configured sources',
  'p.connected-generated-content-is-labelled-ai':
    'Connected. Generated content is labelled AI.',
  'p.connection-state':
    'Connection state',
  'p.content-author':
    'Content author',
  'p.content-type':
    'Content type',
  'p.content-written-by-a-model-is':
    'Content written by a model is labelled as such, everywhere it appears. Template output is labelled as template output, never as AI.',
  'p.control-gaps':
    'Control gaps',
  'p.copy-every-indicator':
    'Copy every indicator',
  'p.copy-failed-try-again':
    'Copy failed — try again',
  'p.copy-the-original-url':
    'Copy the original URL',
  'p.correct-answer':
    'Correct answer',
  'p.could-not-close-the-campaign':
    'Could not close the campaign',
  'p.could-not-generate-outcomes':
    'Could not generate outcomes',
  'p.could-not-record-the-feedback':
    'Could not record the feedback',
  'p.could-not-switch-account':
    'Could not switch account',
  'p.counted-from-the-returned-rows-not':
    'Counted from the returned rows, not from a server-side total.',
  'p.counted-over-every-finding-not-just':
    'Counted over every finding, not just this window — being overdue is a fact about today.',
  'p.counts-describe-the-advisories-stored-in':
    'Counts describe the advisories stored in this deployment. They are not a count of what has been published — no source is configured to fetch from.',
  'p.courses-appear-once-a-sync-imports':
    'Courses appear once a sync imports them from the provider. No provider client exists in this build, so nothing can be fetched here.',
  'p.coverage-gaps':
    'Coverage gaps',
  'p.creating-a-campaign-records-it-and':
    'Creating a campaign records it and its targets. This deployment has no mail or SMS gateway wired in, so nothing is actually sent — outcomes are recorded against targets by an analyst.',
  'p.credential-entered-on-a-spoofed-supplier':
    'Credential entered on a spoofed supplier portal',
  'p.critical-and-high':
    'Critical and high',
  'p.current-standing-of-the-scored-population':
    'Current standing of the scored population, on a 0–100 scale.',
  'p.cyclowareness-cannot-reach-its-backend-the':
    'Cyclowareness cannot reach its backend. The service may still be starting, or the connection dropped. Nothing you did caused this, and nothing was lost.',
  'p.decide-what-reaches-an-employee':
    'Decide what reaches an employee',
  'p.decision-comment':
    'Decision comment',
  'p.declared-capabilities':
    'Declared capabilities',
  'p.defanged-for-display-and-deliberately-not':
    'Defanged for display and deliberately not clickable.',
  'p.defanged-for-display-and-never-rendered':
    'Defanged for display and never rendered as links. Copy them into a ticket or a block list rather than opening them here.',
  'p.defaults-to-the-advisorys-own-title':
    'Defaults to the advisory\'s own title.',
  'p.defaults-to-the-advisorys-published-severity':
    'Defaults to the advisory\'s published severity.',
  'p.delivered-to-inbox-no-quarantine':
    'Delivered to inbox, no quarantine',
  'p.demonstration-data-nothing-here-was-measured':
    'Demonstration data. Nothing here was measured from a live system.',
  'p.demonstration-deployment-the-organisation-is-see':
    'Demonstration deployment. The organisation is seeded; the engine operating on it is the real one.',
  'p.demonstration-world-rebuilt':
    'Demonstration world rebuilt',
  'p.demonstration-world-reset':
    'Demonstration world reset',
  'p.demonstration-the-organisation-is-seeded':
    'Demonstration — the organisation is seeded',
  'p.department-average':
    'Department average',
  'p.department-names-could-not-be-loaded':
    'Department names could not be loaded, so the roll-ups are not shown.',
  'p.derived-by-the-server-from-the':
    'Derived by the server from the lure source. It cannot be set independently.',
  'p.derived-from-the-analyser-verdict':
    'Derived from the analyser verdict.',
  'p.derived-from-the-live-queues-this':
    'Derived from the live queues. This deployment sends no email or push notifications.',
  'p.derived-from-this-runaposs-own-status':
    'Derived from this run&apos;s own status and assignment records. It is not a recommendation produced by a model.',
  'p.describe-the-incident-how-it-was':
    'Describe the incident, how it was found, and what the exposure was.',
  'p.destroys-every-run-decision-and-result':
    'Destroys every run, decision and result',
  'p.dismiss-report':
    'Dismiss report',
  'p.dismissed-by-an-analyst-no-loop':
    'Dismissed by an analyst. No loop run was started and no risk score moved.',
  'p.display-name':
    'Display name',
  'p.dispute-answered':
    'Dispute answered',
  'p.disputes-waiting':
    'Disputes waiting',
  'p.distinct-employees-named-individually-by-any':
    'Distinct employees named individually by any open finding.',
  'p.drafted-by-a-language-model-and':
    'Drafted by a language model and finished by a person.',
  'p.dynamic-detonation-is-not-available-on':
    'Dynamic detonation is not available on this host. Nothing submitted here is executed — samples are parsed, scanned and scored, never run.',
  'p.each-entry-performs-a-real-signin':
    'Each entry performs a real sign-in. The server issues the token and continues to enforce every permission — no role is faked in the browser.',
  'p.effective-from':
    'Effective from',
  'p.employees-appear-here-once-the-organisation':
    'Employees appear here once the organisation has been loaded into the platform.',
  'p.endorsed-once-a-different-person-must':
    'Endorsed once; a different person must approve',
  'p.estimated-duration':
    'Estimated duration',
  'p.estimated-minutes':
    'Estimated minutes',
  'p.estimated-time':
    'Estimated time',
  'p.every-account-is-bound-to-an':
    'Every account is bound to an employee record, a department and a role. That binding is what makes targeting and risk history mean anything, and it is why an account cannot be created from this screen.',
  'p.every-analyzer-this-build-knows-about':
    'Every analyzer this build knows about loaded on this host.',
  'p.every-cached-view-has-been-invalidated':
    'Every cached view has been invalidated and is reloading.',
  'p.every-incident-risk-is-excluded-by':
    'Every incident risk is excluded by the current selection. Clear the filters to see the whole set.',
  'p.every-material-change-recorded-against-this':
    'Every material change recorded against this run.',
  'p.every-named-person-was-skipped-the':
    'Every named person was skipped. The reasons are on the dialog.',
  'p.every-proposed-rule-sits-below-awaiting':
    'Every proposed rule sits below awaiting a reviewer. None of them is checked against anything yet.',
  'p.every-question-is-answered-submitting-grades':
    'Every question is answered. Submitting grades them and cannot be undone.',
  'p.every-record-on-screen-belongs-to':
    'Every record on screen belongs to this organisation.',
  'p.every-report-states-this-as-a':
    'Every report states this as a blind spot rather than reporting a clean behavioural result that was never observed.',
  'p.everyone-attached-to-this-risk-already':
    'Everyone attached to this risk already holds an assignment. Assigning again would reset work somebody may have completed, so the server leaves them untouched.',
  'p.expire-and-measure':
    'Expire and measure',
  'p.explanation-shown-after-answering':
    'Explanation shown after answering',
  'p.exposure-is-carried-by-the-match':
    'Exposure is carried by the match: it comes from the departments a matched policy applies to and the people recorded as using a matched technology. Neither was recorded for this advisory.',
  'p.exposure-not-recorded':
    'Exposure not recorded',
  'p.external-learning-and-identity-systems':
    'External learning and identity systems',
  'p.external-pages-opened-in-a-new':
    'External pages, opened in a new tab. Cyclowareness does not fetch, parse or act on anything they contain.',
  'p.extraction-was-not-attempted':
    'Extraction was not attempted.',
  'p.filter-runs-by-status':
    'Filter runs by status',
  'p.finding-type':
    'Finding type',
  'p.findings-detected':
    'Findings detected',
  'p.forcemeasure-did-not-run':
    'Force-measure did not run',
  'p.forensic-analysis-of-a-file-or':
    'Forensic analysis of a file or a URL — static here, detonation on an isolated worker — with the reasoning behind every point of the score.',
  'p.from-the-library':
    'From the library',
  'p.gaps-are-days-with-no-resolved':
    'Gaps are days with no resolved events',
  'p.gating-a-loop-run':
    'Gating a loop run',
  'p.generated-by-the-configured-anthropic-model':
    'Generated by the configured Anthropic model.',
  'p.generated-from':
    'Generated from',
  'p.give-the-campaign-a-name':
    'Give the campaign a name.',
  'p.has-a-recorded-outcome':
    'Has a recorded outcome',
  'p.has-this-happened-to-you':
    'Has this happened to you?',
  'p.head-of-security-operations':
    'Head of Security Operations',
  'p.held-for-a-second-approver':
    'Held for a second approver',
  'p.hidden-by-default-this-is-attackerauthored':
    'Hidden by default. This is attacker-authored content; it is displayed verbatim as text and is never fetched, executed or turned into a link.',
  'p.hide-the-raw-artifact':
    'Hide the raw artifact',
  'p.high-risk-is-a-score-of':
    'High risk is a score of 60 or above.',
  'p.highrisk-policy-findings':
    'High-risk policy findings',
  'p.how-each-metric-was-set':
    'How each metric was set',
  'p.how-this-campaign-appears-in-the':
    'How this campaign appears in the programme list and in the audit trail.',
  'p.how-this-content-was-produced-was':
    'How this content was produced was not recorded.',
  'p.how-this-model-was-built':
    'How this model was built',
  'p.inc20260184':
    'INC-2026-0184',
  'p.identity-federation-is-not-configured-for':
    'Identity federation is not configured for this deployment. No SAML or OIDC provider is connected, so these are inactive rather than pretending to redirect.',
  'p.if-anything-here-reminds-you-of':
    'If anything here reminds you of a message you received, report it now. It does not interrupt this training.',
  'p.imported-from-a-connected-learning-system':
    'Imported from a connected learning system. Cyclowareness did not author it.',
  'p.incident-remediation-completion':
    'Incident remediation completion',
  'p.incident-risks-in-the-closed-state':
    'Incident risks in the closed state, divided by all incident risks.',
  'p.incidentresponse-records-name-individuals-and-ar':
    'Incident-response records name individuals and are held by the security team. This view cannot read them, which is not the same as there being none.',
  'p.inside-archive':
    'Inside archive',
  'p.it-fell-short-a-note-saying':
    'It fell short. A note saying what was short of the bar is required.',
  'p.it-is-attached-to-this-job':
    'It is attached to this job and visible in the export.',
  'p.it-is-no-longer-assigned-and':
    'It is no longer assigned, and they are told why.',
  'p.it-is-now-cleared-to-reach':
    'It is now cleared to reach the person it names.',
  'p.it-may-still-be-queued':
    'It may still be queued.',
  'p.it-stops-being-assigned-to-them':
    'It stops being assigned to them. Choose this when they were right.',
  'p.json-carries-the-complete-analyzer-output':
    'JSON carries the complete analyzer output, the score breakdown and every extracted indicator. STIX 2.1 carries the indicators as a bundle another tool can ingest. The PDF is the rendered report. All three are the stored analysis — re-running a sample is a separate action on the job itself.',
  'p.keeps-your-comment-and-unsaved-edits':
    'Keeps your comment and unsaved edits in this browser. There is no draft endpoint, so a draft never leaves this device.',
  'p.kept-on-the-audit-entry-optional':
    'Kept on the audit entry. Optional for an approval, and the reason a rejection can be reviewed later.',
  'p.language-model':
    'Language model',
  'p.leave-blank-unless-the-archive-is':
    'Leave blank unless the archive is encrypted. If it is, analysis pauses and asks — the engine does not guess or brute-force passwords.',
  'p.live-data-has-resumed-open-views':
    'Live data has resumed. Open views have been refreshed.',
  'p.loading-approved-modules':
    'Loading approved modules…',
  'p.loading-resources':
    'Loading resources…',
  'p.loading-the-policy-record':
    'Loading the policy record.',
  'p.loading-the-thread':
    'Loading the thread…',
  'p.longest-wait':
    'Longest wait',
  'p.loop-run-record':
    'Loop run record',
  'p.loop-run-records':
    'Loop run records',
  'p.loop-run-records-are-analystscoped-so':
    'Loop run records are analyst-scoped, so this view can show the closed count the dashboard reports but not the split between completed, in flight and failed.',
  'p.loop-runs-could-not-be-read':
    'Loop runs could not be read, so the outcome split is unavailable.',
  'p.loop-status-unavailable':
    'Loop status unavailable',
  'p.lure-as-stored':
    'Lure as stored',
  'p.lure-preview':
    'Lure preview',
  'p.mitre-attampck-techniques':
    'MITRE ATT&amp;CK techniques',
  'p.mail-gateway-verdict':
    'Mail gateway verdict',
  'p.matching-these-filters':
    'Matching these filters',
  'p.measured-for-this-run-only-not':
    'Measured for this run only, not over a rolling window.',
  'p.measured-from-this-deployments-own-records':
    'Measured from this deployment’s own records.',
  'p.minimum-score':
    'Minimum score',
  'p.module-to-assign':
    'Module to assign',
  'p.more-entries-matched-than-are-shown':
    'More entries matched than are shown here. Open the audit log to page through the rest.',
  'p.more-risk-is-coming-from-what':
    'More risk is coming from what people have done than the roles alone would explain.',
  'p.move-through-palette-results':
    'Move through palette results',
  'p.move-to-the-next-control-the':
    'Move to the next control; the skip link comes first',
  'p.name-owner-or-notes-press-enter':
    'Name, owner or notes. Press Enter to search.',
  'p.names-the-behaviour-to-train-training':
    'Names the behaviour to train. Training itself is assigned on the finding.',
  'p.negative-is-the-good-direction-here':
    'Negative is the good direction here: it means the organisation has earned more credit from reporting and training than it has lost to clicks and expiries.',
  'p.never-sent-to-the-employee-it':
    'Never sent to the employee. It is what the grader scores against.',
  'p.new-advisories':
    'New advisories',
  'p.new-threat-submissions':
    'New threat submissions',
  'p.newest-advisory-in-view':
    'Newest advisory in view',
  'p.no-advisory-is-stored-in-this':
    'No advisory is stored in this deployment',
  'p.no-advisory-matches-these-filters':
    'No advisory matches these filters',
  'p.no-analyzed-threat-is-available':
    'No analyzed threat is available',
  'p.no-analyzer-raised-a-signal-on':
    'No analyzer raised a signal on this sample. Read that alongside the tier statement above: it means nothing recognised fired, not that the sample was proven safe.',
  'p.no-analyzer-result-was-recorded-for':
    'No analyzer result was recorded for this job. That is a gap in the record, not a clean result.',
  'p.no-answer-key-was-recorded-for':
    'No answer key was recorded for this question, so it cannot be scored.',
  'p.no-approved-training-module-exists-in':
    'No approved training module exists in this deployment, so there is nothing to attach. The API deliberately will not write one here — generating a lesson at this point would push unreviewed content past the human approval gate. Approve a module in the Training Studio first.',
  'p.no-artifact-body-was-stored-for':
    'No artifact body was stored for this threat — only its metadata.',
  'p.no-audit-events-yet-every-decision':
    'No audit events yet. Every decision that crosses the human gate is recorded here.',
  'p.no-automated-triage-was-recorded-against':
    'No automated triage was recorded against this report.',
  'p.no-automated-triage-was-recorded-for':
    'No automated triage was recorded for this report. An analyst will read it.',
  'p.no-capability-was-derived-from-the':
    'No capability was derived from the evidence, so there is no impact to score.',
  'p.no-checks-were-reported-for-this':
    'No checks were reported for this run.',
  'p.no-configuration-has-been-stored-for':
    'No configuration has been stored for this connection.',
  'p.no-connection-has-been-registered':
    'No connection has been registered',
  'p.no-connection-is-in-that-state':
    'No connection is in that state',
  'p.no-correct-answer-is-recorded-for':
    'No correct answer is recorded for this question. It cannot be graded.',
  'p.no-course-has-been-imported':
    'No course has been imported',
  'p.no-course-matches-this-search':
    'No course matches this search',
  'p.no-credential-field-exists-on-this':
    'No credential field exists on this form. API keys, client secrets and tokens belong in the deployment’s secret store — the API rejects credential-shaped values outright rather than storing them where every backup and screenshot would carry them.',
  'p.no-department-is-above-the-low':
    'No department is above the low band and none carries a person in the high-risk band.',
  'p.no-department-is-currently-in-the':
    'No department is currently in the low band with nobody in the high-risk band.',
  'p.no-department-or-employee-is-named':
    'No department or employee is named on this finding. That is a gap in the record, not a statement that nobody is affected.',
  'p.no-departments':
    'No departments',
  'p.no-departments-are-recorded':
    'No departments are recorded.',
  'p.no-detonation-host-files-are-analysed':
    'No detonation host. Files are analysed statically and never executed.',
  'p.no-detonation-worker-is-attached-so':
    'No detonation worker is attached, so nothing submitted here is executed. Reports say so per tier rather than leaving a viewer to assume a sample was run.',
  'p.no-employee-in-the-directory-matches':
    'No employee in the directory matches that name, email or role title.',
  'p.no-employee-is-currently-selected-so':
    'No employee is currently selected, so approving advances the run with nothing to assign.',
  'p.no-employee-matched-this-threats-targeting':
    'No employee matched this threat’s targeting signals. That is not "nobody is at risk" — approving would advance the run with nothing to assign.',
  'p.no-engine-recorded':
    'No engine recorded',
  'p.no-entry-matches-these-filters':
    'No entry matches these filters',
  'p.no-evidence-rows-yet-a-risk':
    'No evidence rows yet. A risk with no evidence can still be opened, but nobody reviewing it later will be able to check it.',
  'p.no-evidence-was-recorded-for-this':
    'No evidence was recorded for this.',
  'p.no-explanation-is-recorded-the-employee':
    'No explanation is recorded — the employee sees only whether they were right.',
  'p.no-explanation-was-recorded-for-this':
    'No explanation was recorded for this question.',
  'p.no-external-engine-is-configured-to':
    'No external engine is configured to receive anything from this deployment.',
  'p.no-external-provider-is-connected-in':
    'No external provider is connected in this deployment.',
  'p.no-extracted-rule-an-approved-version':
    'No extracted rule — an approved version, a whitelist entry, an exception — was touched by this advisory. Rules can only be matched once a policy document has been uploaded and its rules extracted.',
  'p.no-feature-was-present-in-this':
    'No feature was present in this sample, so the score is the model\'s base rate alone.',
  'p.no-filter-applied-beyond-the-window':
    'No filter applied beyond the window',
  'p.no-filters-applied-every-finding-this':
    'No filters applied — every finding this deployment holds.',
  'p.no-finding-matches-these-filters':
    'No finding matches these filters',
  'p.no-findings-could-be-read':
    'No findings could be read.',
  'p.no-findings-have-been-raised':
    'No findings have been raised',
  'p.no-incident-risk-has-been-opened':
    'No incident risk has been opened',
  'p.no-indicators-were-extracted-for-a':
    'No indicators were extracted. For a sample with no network or filesystem behaviour to describe that is expected — it is not evidence that the sample is harmless.',
  'p.no-indicators-were-extracted-on-a':
    'No indicators were extracted. On a social-engineering artifact with no payload and no link, that is the expected result rather than a gap.',
  'p.no-individual-events-have-been-recorded':
    'No individual events have been recorded against you.',
  'p.no-individual-rule-is-cited-the':
    'No individual rule is cited. The finding is against the policy as a whole — often because nothing was ever extracted from it.',
  'p.no-individual-was-named-the-exposure':
    'No individual was named — the exposure was recorded at department level.',
  'p.no-jobs-in-this-state':
    'No jobs in this state',
  'p.no-language-model-is-connected-generated':
    'No language model is connected. Generated content is template output and is labelled as such.',
  'p.no-loop-runs-are-executing-right':
    'No loop runs are executing right now.',
  'p.no-loops-yet':
    'No loops yet',
  'p.no-lure-source-recorded':
    'No lure source recorded',
  'p.no-match-named-a-technology-from':
    'No match named a technology from the approved-software list or from the recorded inventory. Anything below is the publisher\'s claim, not ours.',
  'p.no-match-my-own-claim':
    'No match — my own claim',
  'p.no-metadata-was-recorded-with-this':
    'No metadata was recorded with this artifact.',
  'p.no-model-connected-in-this-deployment':
    'No model connected in this deployment — template output.',
  'p.no-model-is-connected-generated-training':
    'No model is connected. Generated training and briefings are deterministic template output, and are labelled as template rather than as AI.',
  'p.no-module-was-generated-for-this':
    'No module was generated for this run',
  'p.no-movement-to-show':
    'No movement to show',
  'p.no-one-matches-these-filters':
    'No one matches these filters',
  'p.no-one-was-selected-that-is':
    'No one was selected. That is not “nobody is at risk” — it means nothing in the artifact, the exposed departments or the recent-behaviour signals matched a person. A run approved in this state advances with nothing to assign.',
  'p.no-one-was-targeted-so-no':
    'No one was targeted, so no department was touched.',
  'p.no-open-findings':
    'No open findings',
  'p.no-pass-mark-was-set-on':
    'No pass mark was set on this incident.',
  'p.no-passage-was-recorded-for-this':
    'No passage was recorded for this rule, so it cannot be checked against the document here.',
  'p.no-people-have-been-loaded':
    'No people have been loaded',
  'p.no-perdepartment-history-is-stored-the':
    'No per-department history is stored: the departments endpoint returns a current roll-up only, and no recent risk event could be attributed to a person in a department.',
  'p.no-plainlanguage-explanation-was-written-for':
    'No plain-language explanation was written for this artifact.',
  'p.no-plan-has-been-raised-yet':
    'No plan has been raised yet',
  'p.no-plan-holds-this-status':
    'No plan holds this status',
  'p.no-policies-have-been-registered':
    'No policies have been registered',
  'p.no-policy-matches-these-filters':
    'No policy matches these filters',
  'p.no-provider-client-exists-in-this':
    'No provider client exists in this build. The stored sync state is unchanged.',
  'p.no-questions-are-attached-so-nothing':
    'No questions are attached, so nothing about this module can be measured.',
  'p.no-quiz-score-was-recorded-against':
    'No quiz score was recorded against this assignment.',
  'p.no-quiz-was-recorded-against-this':
    'No quiz was recorded against this module, so there is nothing to answer. Your security team can tell you whether that is intended.',
  'p.no-recent-risk-event-could-be':
    'No recent risk event could be attributed to a named person, so no movement is shown.',
  'p.no-recent-risk-event-could-be-2':
    'No recent risk event could be attributed to a person, so no movement is shown.',
  'p.no-record-on-this-deployment-links':
    'No record on this deployment links this artifact to a loop run. The threats API does not index runs by threat, and only a human-sensor report carries both ids.',
  'p.no-risk-matches-these-filters':
    'No risk matches these filters',
  'p.no-risk-score-is-recorded-for':
    'No risk score is recorded for anyone in this audience, so no distribution can be shown.',
  'p.no-rollup-available':
    'No roll-up available',
  'p.no-rule-on-this-page-fired':
    'No rule on this page fired.',
  'p.no-rules-exist-yet-so-nothing':
    'No rules exist yet, so nothing names a technology',
  'p.no-sandbox-job-is-linked-to':
    'No sandbox job is linked to this run. Anything shown above came from the analysis stage, not from detonation.',
  'p.no-score-was-recorded-for-this':
    'No score was recorded for this person. The required action may not carry a quiz.',
  'p.no-selection-reasons-were-recorded-against':
    'No selection reasons were recorded against this assignment, so this screen cannot tell you why you were chosen. Your security team can.',
  'p.no-severity-band-contributed-no-signal':
    'No severity band contributed — no signal above informational fired.',
  'p.no-severity-was-derived-for-this':
    'No severity was derived for this run, because the analysis stage recorded no verdict.',
  'p.no-signal-fired-on-this-sample':
    'No signal fired on this sample. That is not a clean bill of health — it means the analyzers that ran found nothing they recognise, and anything they could not run is listed above.',
  'p.no-source-check-has-been-requested':
    'No source check has been requested in this session. An unchanged list is not evidence that no new advisory exists — it is evidence that nobody looked.',
  'p.no-submission-currently-holds-this-status':
    'No submission currently holds this status. Clear the filter to see everything the engine has analysed.',
  'p.no-sync-was-attempted':
    'No sync was attempted',
  'p.no-training-module-exists-on-this':
    'No training module exists on this run. A benign verdict closes the loop at this stage without generating one, and a run that failed earlier never reached it.',
  'p.no-training-module-was-generated-for':
    'No training module was generated for this run. There is nothing here to review, and approving would advance the loop with nothing to assign.',
  'p.no-verdict-was-recorded-that-is':
    'No verdict was recorded. That is not a clean result — nothing has been concluded about this artifact.',
  'p.no-verdict-yet':
    'No verdict yet',
  'p.nobody-is-attached-yet-so-nobody':
    'Nobody is attached yet, so nobody is on the hook.',
  'p.nobody-is-selected-yet':
    'Nobody is selected yet.',
  'p.nobody-was-attached-the-risk-is':
    'Nobody was attached. The risk is unchanged.',
  'p.none-endorsed-and-held':
    'None endorsed and held',
  'p.none-of-its-rules-names-a':
    'None of its rules names a technology',
  'p.none-every-plan-built-so-far':
    'None. Every plan built so far passed the firewall — no destination, invented key or unsafe answer has reached it.',
  'p.none-this-deployment-has-no-threatintelligence':
    'None. This deployment has no threat-intelligence source to contact.',
  'p.not-a-humansensor-report':
    'Not a human-sensor report',
  'p.not-available-the-threat-record-served':
    'Not available. The threat record served to this screen carries a verdict, a threat type, a behaviour summary and indicators — it carries no technique mapping, so none is shown.',
  'p.not-classified':
    'Not classified',
  'p.not-completed-so-no-score-was':
    'Not completed, so no score was recorded.',
  'p.not-connected-content-is-template-output':
    'Not connected. Content is template output and is never labelled AI.',
  'p.not-derived-from-the-perassignment-scores':
    'Not derived from the per-assignment scores in the browser, because this view cannot see all of them.',
  'p.not-exposed-selected-on-risk-signals':
    'Not exposed — selected on risk signals',
  'p.not-reached-nothing-has-been-proposed':
    'Not reached. Nothing has been proposed for review on this run yet.',
  'p.not-reached-nothing-has-been-proposed-2':
    'Not reached. Nothing has been proposed for review on this run.',
  'p.not-recorded':
    'Not recorded',
  'p.not-stated-on-the-artifact':
    'Not stated on the artifact',
  'p.not-yet-assessed':
    'Not yet assessed',
  'p.not-yet-reviewed-by-anyone':
    'Not yet reviewed by anyone',
  'p.note-optional':
    'Note (optional)',
  'p.note-for-the-assignment-optional':
    'Note for the assignment (optional)',
  'p.nothing-assigned':
    'Nothing assigned',
  'p.nothing-has-been-recorded-against-this':
    'Nothing has been recorded against this run yet. The first decision, endorsement or revision request will appear here.',
  'p.nothing-has-been-submitted-yet':
    'Nothing has been submitted yet',
  'p.nothing-has-been-written-on-this':
    'Nothing has been written on this finding yet. It has not been closed, accepted or dismissed.',
  'p.nothing-has-moved-your-score-yet':
    'Nothing has moved your score yet. It is still the starting point set by how sensitive your role is.',
  'p.nothing-has-produced-rules-for-this':
    'Nothing has produced rules for this policy yet. The Document tab says what stands in the way, and rules can also be entered by hand through the API.',
  'p.nothing-in-the-humansensor-queue-is':
    'Nothing in the human-sensor queue is waiting for a decision.',
  'p.nothing-in-this-catalogue-is-mapped':
    'Nothing in this catalogue is mapped yet. Add the first behaviour below.',
  'p.nothing-in-this-deployment-can-assign':
    'Nothing in this deployment can assign one — sandbox submission is analyst-only. Recording it is a manual step.',
  'p.nothing-is-checked-against-them-until':
    'Nothing is checked against them until a reviewer activates each one.',
  'p.nothing-is-delivered-until-you-launch':
    'Nothing is delivered until you launch it.',
  'p.nothing-is-graded-on-arrival-the':
    'Nothing is graded on arrival. The verdict and confidence in stage 2 are the first assessment this artifact receives.',
  'p.nothing-is-held-at-this-point':
    'Nothing is held at this point of the loop right now. Clear the filter to see every run.',
  'p.nothing-is-scored-until-the-analysis':
    'Nothing is scored until the analysis finishes. This job has no risk level to report.',
  'p.nothing-is-waiting-at-the-approval':
    'Nothing is waiting at the approval gate.',
  'p.nothing-reaches-an-employee-until-a':
    'Nothing reaches an employee until a human decides',
  'p.nothing-stored-here-matches-the-source':
    'Nothing stored here matches the source, type, severity, assessment and search you have set. Clearing them shows everything this deployment holds.',
  'p.nothing-to-show':
    'Nothing to show',
  'p.nothing-verified-for-this-channel-yet':
    'Nothing verified for this channel yet. An analyst adds material from the training screen, and a link is only listed once the provider has confirmed it.',
  'p.nothing-was-assigned-on-this-run':
    'Nothing was assigned on this run. Either it has not passed the gate yet, or targeting selected no one.',
  'p.nothing-was-assigned-the-decision-is':
    'Nothing was assigned. The decision is in the audit log.',
  'p.nothing-was-delivered':
    'Nothing was delivered.',
  'p.nothing-was-recorded-in-this-window':
    'Nothing was recorded in this window',
  'p.nothing-was-sent-cyclowareness-has-no':
    'Nothing was sent. Cyclowareness has no endpoint for this — copy the text below and send it yourself.',
  'p.obligation-discharged':
    'Obligation discharged',
  'p.one-approval-releases-this-run-use':
    'One approval releases this run. Use "Require a second approval" below to hold it for a co-signer instead.',
  'p.one-behavioural-finding-was-observed-and':
    'One behavioural finding was observed, and scored alongside the static evidence.',
  'p.oneline-description':
    'One-line description',
  'p.only-approved-modules-appear-here-choosing':
    'Only approved modules appear here. Choosing none still records the attempt and reports what went unfulfilled.',
  'p.only-modules-a-human-has-approved':
    'Only modules a human has approved can be assigned.',
  'p.only-satisfied-if-the-module-you':
    'Only satisfied if the module you assign actually carries questions.',
  'p.open-findings-whose-severity-is-critical':
    'Open findings whose severity is critical or high.',
  'p.open-highrisk-findings':
    'Open high-risk findings',
  'p.open-navigation':
    'Open navigation',
  'p.open-the-approval-gate':
    'Open the approval gate',
  'p.open-the-command-palette':
    'Open the command palette',
  'p.open-in-review-remediation-planned-or':
    'Open, in review, remediation planned or training assigned.',
  'p.opening-it-now-training-is-assigned':
    'Opening it now. Training is assigned from the finding.',
  'p.optional-for-this-move-and-kept':
    'Optional for this move, and kept on the record either way.',
  'p.optional-url-log-id-ticket':
    'Optional — URL, log id, ticket',
  'p.optional-and-worth-writing-it-is':
    'Optional, and worth writing: it is what the next analyst reads.',
  'p.optional-appended-to-the-audit-entry':
    'Optional. Appended to the audit entry for this change.',
  'p.optional-interpreted-as-the-end-of':
    'Optional. Interpreted as the end of that day, UTC.',
  'p.optional-it-helps-whoever-provisions-the':
    'Optional. It helps whoever provisions the account pick the right role.',
  'p.optional-left-blank-the-platform-names':
    'Optional. Left blank, the platform names it after the artifact type.',
  'p.optional-recorded-on-the-audit-entry':
    'Optional. Recorded on the audit entry.',
  'p.optional-use-it-when-the-exposure':
    'Optional. Use it when the exposure is a team\'s, not one person\'s.',
  'p.optional-what-would-resolve-it':
    'Optional. What would resolve it.',
  'p.outcomes-for-this-campaign-could-not':
    'Outcomes for this campaign could not be loaded. Open the campaign to try again.',
  'p.outcomes-the-loop-is-meant-to':
    'Outcomes the loop is meant to move',
  'p.overdue-and-open':
    'Overdue and open',
  'p.part-of-an-email-address':
    'Part of an email address',
  'p.pass-criteria':
    'Pass criteria',
  'p.passing-streak':
    'Passing streak',
  'p.paste-at-least-part-of-what':
    'Paste at least part of what you saw.',
  'p.paste-it-here':
    'Paste it here',
  'p.people-in-a-scored-department':
    'People in a scored department',
  'p.people-in-the-highrisk-band':
    'People in the high-risk band',
  'p.people-to-attach':
    'People to attach',
  'p.phishing-click-rate':
    'Phishing click rate',
  'p.pick-departments-risk-bands-or-both':
    'Pick departments, risk bands, or both. Anyone matching either is included once.',
  'p.platform-api':
    'Platform API',
  'p.point-in-time-todays-stored-scores':
    'Point in time — today’s stored scores',
  'p.points-count-completed-training-only-50':
    'Points count completed training only — 50 for each module you finish, plus half your quiz score. They are a record of what you did, not a measurement of how safe you are.',
  'p.policy-exposure':
    'Policy exposure',
  'p.policy-findings-could-not-be-read':
    'Policy findings could not be read, so nothing is counted here.',
  'p.policy-intelligence':
    'Policy intelligence',
  'p.policy-intelligence-sections':
    'Policy intelligence sections',
  'p.preview-width':
    'Preview width',
  'p.produced-by-a-fixed-template-no':
    'Produced by a fixed template. No language model wrote any of it.',
  'p.produced-by-the-analysis-sandbox-from':
    'Produced by the analysis sandbox from a real artifact.',
  'p.production-deployment-every-record-on-screen':
    'Production deployment. Every record on screen belongs to this organisation.',
  'p.provider-topic-tags':
    'Provider topic tags',
  'p.published-by-the-source-cyclowareness-did':
    'Published by the source. Cyclowareness did not verify this list against the inventory — only the matches above were checked.',
  'p.pushing-a-feed-item-into-the':
    'Pushing a feed item into the loop requires the analyst role.',
  'p.quiz-generation-and-role-variants-are':
    'Quiz generation and role variants are part of the same stage and are not separately callable. To produce a new module, put an artifact into the loop.',
  'p.quiz-pass-rate':
    'Quiz pass rate',
  'p.quoted-back-when-somebody-closes-this':
    'Quoted back when somebody closes this, so the closure note can be checked against it.',
  'p.raised-by-incident-response-against-named':
    'Raised by incident response against named people',
  'p.raw-headers-message-text-url-or':
    'Raw headers, message text, URL or filename. Stored as inert text and never fetched.',
  'p.reading-the-decision-from-the-audit':
    'Reading the decision from the audit trail…',
  'p.reading-the-live-loop-counts':
    'Reading the live loop counts.',
  'p.reading-the-queues':
    'Reading the queues.',
  'p.reason-for-reopening':
    'Reason for reopening',
  'p.received-the-artifact':
    'Received the artifact',
  'p.recorded-against-this-risk':
    'Recorded against this risk',
  'p.recorded-against-your-account-in-the':
    'Recorded against your account in the audit trail. Required by the API.',
  'p.recorded-against-your-name-in-the':
    'Recorded against your name in the audit trail.',
  'p.recorded-asis-never-contacted':
    'Recorded as-is. Never contacted.',
  'p.recorded-behaviour-has-cancelled-out-exactly':
    'Recorded behaviour has cancelled out exactly, so the organisation currently sits on its role baselines.',
  'p.recorded-on-the-audit-entry-why':
    'Recorded on the audit entry — why these people, and not others.',
  'p.recorded-on-the-audit-entry-not':
    'Recorded on the audit entry, not shown to the employee.',
  'p.recorded-on-the-version-snapshot-alongside':
    'Recorded on the version snapshot alongside your name.',
  'p.records-your-objection-and-leaves-the':
    'Records your objection and leaves the run at the gate for editing.',
  'p.refused-by-the-output-firewall':
    'Refused by the output firewall',
  'p.reject-the-module':
    'Reject the module',
  'p.reject-this-proposed-rule':
    'Reject this proposed rule',
  'p.rejecting-or-requesting-a-revision-needs':
    'Rejecting or requesting a revision needs a comment first — the server refuses either without a reason, and a decision with nothing to act on helps no one.',
  'p.related-incident-reference':
    'Related incident reference',
  'p.released-by-a-human-the-run':
    'Released by a human — the run could not have reached targeting otherwise. The approval record was not loaded, so the reviewer and comment are not shown here.',
  'p.released-by-a-person-the-run':
    'Released by a person — the run could not have reached targeting otherwise. No decision entry was found in the audit trail for it, so the reviewer and comment are not shown here rather than guessed at.',
  'p.reload-the-page':
    'Reload the page',
  'p.remember-my-email-on-this-device':
    'Remember my email on this device',
  'p.rendered-as-absent-rather-than-derived':
    'Rendered as absent rather than derived in the browser from partial data.',
  'p.rendered-exactly-as-the-employee-will':
    'Rendered exactly as the employee will see it.',
  'p.report-status':
    'Report status',
  'p.reported-by-the-human-sensor-and':
    'Reported by the human sensor and not yet triaged',
  'p.reporters-note':
    'Reporter’s note',
  'p.reporting-rate':
    'Reporting rate',
  'p.reporting-window':
    'Reporting window',
  'p.reports-sent':
    'Reports sent',
  'p.required-action':
    'Required action',
  'p.required-for-a-rejection-or-a':
    'Required for a rejection or a revision request. Stored with the decision in the audit trail.',
  'p.required-training':
    'Required training',
  'p.required-resolving-accepting-or-reopening-a':
    'Required. Resolving, accepting or reopening a finding is a claim the organisation may have to defend later.',
  'p.required-the-api-refuses-a-rejection':
    'Required. The API refuses a rejection without a stated reason.',
  'p.required-this-is-what-the-person':
    'Required. This is what the person is told about why their work was not accepted.',
  'p.requires-a-quiz':
    'Requires a quiz',
  'p.requires-a-sandbox-exercise':
    'Requires a sandbox exercise',
  'p.requires-training':
    'Requires training',
  'p.reset-everything':
    'Reset everything',
  'p.reset-the-demonstration-world':
    'Reset the demonstration world',
  'p.reset-the-world':
    'Reset the world',
  'p.resetting-deletes-every-loop-run-approval':
    'Resetting deletes every loop run, approval decision, training assignment, quiz result, sandbox job and audit entry, then rebuilds the seeded organisation deterministically — the same people, the same six months of history, re-anchored to today. Nothing is recoverable afterwards.',
  'p.review-decisions-are-recorded-against-the':
    'Review decisions are recorded against the individual subject rather than the risk, so they appear in the timeline above and not in this list.',
  'p.review-state':
    'Review state',
  'p.reviewer-note-optional':
    'Reviewer note (optional)',
  'p.risk-opened-as-a-draft':
    'Risk opened as a draft',
  'p.risk-opened-but-nobody-was-attached':
    'Risk opened, but nobody was attached',
  'p.risk-scores-are-the-values-recorded':
    'Risk scores are the values recorded when this list was drawn. A person&apos;s score moves afterwards, so the number here will not always match their profile today.',
  'p.role-sensitivity-is-set-when-a':
    'Role sensitivity is set when a person is imported. It is a judgement about the seat, not a measurement of the person.',
  'p.run-the-selected-palette-result':
    'Run the selected palette result',
  'p.running-extraction-requires-the-policy-managemen':
    'Running extraction requires the policy management permission.',
  'p.runs-appear-once-a-threat-is':
    'Runs appear once a threat is submitted, reported by an employee, or pushed from the intelligence feed.',
  'p.runs-currently-moving-through-the-seven':
    'Runs currently moving through the seven stages',
  'p.runs-held-at-the-gate':
    'Runs held at the gate',
  'p.runs-over-the-most-recent-findings':
    'Runs over the most recent findings; the count says so when it is a floor.',
  'p.runs-that-reached-the-completed-state':
    'Runs that reached the completed state and produced a measurement.',
  'p.sha256-hash':
    'SHA-256 hash',
  'p.sandbox-detonation':
    'Sandbox detonation',
  'p.sanitised-for-display-shown-as-plain':
    'Sanitised for display: shown as plain text, never rendered',
  'p.save-edits-and-approve':
    'Save edits and approve',
  'p.saving-makes-this-content-analystedited-the':
    'Saving makes this content analyst-edited. The module record carries no edited flag and this endpoint writes no audit entry, so the provenance badge elsewhere keeps reporting how the module was originally generated. Treat that as a known gap, not as evidence that nobody touched it.',
  'p.saving-marks-this-module-as-analystedited':
    'Saving marks this module as analyst-edited for this review, so it is no longer presented as machine output. The module record stores which engine generated it and not whether a person rewrote it — put what you changed in the decision comment, because that is what the audit trail keeps.',
  'p.say-what-you-checked-this-is':
    'Say what you checked. This is the record of the decision.',
  'p.say-why-the-closure-did-not':
    'Say why the closure did not hold. The people named by this risk may be asked for more work on the strength of it.',
  'p.score-across-recent-events':
    'Score across recent events',
  'p.score-points-added-or-removed-by':
    'Score points added or removed by recorded events across the whole roster.',
  'p.score-you-must-reach':
    'Score you must reach',
  'p.scoring-has-not-run-for-this':
    'Scoring has not run for this job yet, so it has no risk level.',
  'p.search-by-name-email-or-role':
    'Search by name, email or role',
  'p.search-by-run-id-threat-type':
    'Search by run id, threat, type or verdict',
  'p.search-campaigns':
    'Search campaigns',
  'p.search-courses':
    'Search courses',
  'p.search-intake':
    'Search intake',
  'p.search-modules':
    'Search modules',
  'p.search-name-email-or-role':
    'Search name, email or role',
  'p.search-people':
    'Search people',
  'p.search-screens-and-actions':
    'Search screens and actions',
  'p.search-the-directory':
    'Search the directory',
  'p.search-titles-references-and-descriptions':
    'Search titles, references and descriptions',
  'p.search-titles-senders-artifact-text-reporters':
    'Search titles, senders, artifact text, reporters…',
  'p.seeded-credentials-for-the-fictional-caspian':
    'Seeded credentials for the fictional Caspian Dynamics organisation.',
  'p.select-at-least-one-person':
    'Select at least one person.',
  'p.sent-to-a-person-as-you':
    'Sent to a person as you wrote it. Your score does not change until someone answers.',
  'p.set-before-anything-you-did-and':
    'Set before anything you did, and not a judgement about you.',
  'p.set-by-the-lure-source':
    'Set by the lure source',
  'p.set-by-the-platform-not-by':
    'Set by the platform, not by this browser. Switching roles is a real sign-in against a different account.',
  'p.severity-is-set-when-a-finding':
    'Severity is set when a finding is raised, and is not recomputed as it ages.',
  'p.severityweighted-and-saturating-on-purpose-twent':
    'Severity-weighted, and saturating on purpose: twenty low-severity observations must not add up to one critical one, because they are not the same evidence.',
  'p.shares-a-denominator-with-the-click':
    'Shares a denominator with the click rate, so the two are directly comparable.',
  'p.show-the-raw-artifact':
    'Show the raw artifact',
  'p.shown-defanged-copying-gives-the-original':
    'Shown defanged. Copying gives the original value.',
  'p.shown-to-the-affected-employee-as':
    'Shown to the affected employee as who to contact.',
  'p.shown-to-the-affected-employee-at':
    'Shown to the affected employee at every confidentiality level.',
  'p.shown-to-the-employee-after-grading':
    'Shown to the employee after grading, right or wrong.',
  'p.since-the-run-reached-the-gate':
    'Since the run reached the gate',
  'p.someone-will-read-what-you-wrote':
    'Someone will read what you wrote and answer it here.',
  'p.something-in-the-request-did-not':
    'Something in the request did not pass validation. The field is named below.',
  'p.something-was-assigned-to-you':
    'Something was assigned to you',
  'p.source-address-not-recorded':
    'Source address not recorded',
  'p.sources-contacted':
    'Sources contacted',
  'p.start-a-run-at-stage-one':
    'Start a run at stage one',
  'p.start-with-the-navigation-rail-collapsed':
    'Start with the navigation rail collapsed',
  'p.state-how-the-criteria-above-were':
    'State how the criteria above were met. This is what an auditor reads.',
  'p.static-analysis-and-dynamic-detonation-are':
    'Static analysis and dynamic detonation are both available.',
  'p.static-analysis-only-no-detonation-host':
    'Static analysis only. No detonation host is attached, so nothing submitted here is executed — reports say "not run" rather than "clean".',
  'p.static-forensic-analysis-of-a-file':
    'Static forensic analysis of a file or a URL, with the reasoning behind every point of the score.',
  'p.still-loading-the-people-list-the':
    'Still loading the people list — the count is not final.',
  'p.stored-as-typed-lowercased-and-underscored':
    'Stored as typed, lowercased and underscored.',
  'p.stored-configuration':
    'Stored configuration',
  'p.structured-observations':
    'Structured observations',
  'p.subjects-accepted':
    'Subjects accepted',
  'p.subjects-whose-completion-a-reviewer-accepted':
    'Subjects whose completion a reviewer accepted, divided by the subjects attached to this risk.',
  'p.submit-a-threat-into-the-loop':
    'Submit a threat into the loop',
  'p.submit-an-artifact-to-the-sandbox':
    'Submit an artifact to the sandbox',
  'p.submit-and-grade':
    'Submit and grade',
  'p.submitted-url':
    'Submitted URL',
  'p.suggested-remediation':
    'Suggested remediation',
  'p.summary-object-label-or-action':
    'Summary, object label or action',
  'p.supplied-by-a-third-party-cyclowareness':
    'Supplied by a third party. Cyclowareness did not measure it.',
  'p.supplied-by-the-provider-shown-for':
    'Supplied by the provider. Shown for context only — they are not a mapping.',
  'p.suspicion-level':
    'Suspicion level',
  'p.synthetic-outcomes-written':
    'Synthetic outcomes written',
  'p.take-me-to-my-home-screen':
    'Take me to my home screen',
  'p.target-count-unavailable':
    'Target count unavailable',
  'p.targeting-has-been-released-the-decision':
    'Targeting has been released. The decision is in the audit log.',
  'p.targets-are-now-open-for-outcome':
    'Targets are now open for outcome recording.',
  'p.targets-who-reported-divided-by-every':
    'Targets who reported divided by every target that reached an outcome.',
  'p.team-or-department':
    'Team or department',
  'p.techniques-mapped-from-findings-this-analysis':
    'Techniques mapped from findings this analysis produced. Each row names the signals it was derived from, so the mapping can be checked rather than taken on trust.',
  'p.technologies-named-by-its-rules':
    'Technologies named by its rules',
  'p.tenant-migration-the-old-moodle-instance':
    'Tenant migration — the old Moodle instance is being retired.',
  'p.that-change-no-longer-applies':
    'That change no longer applies',
  'p.the-analyze-stage-has-not-recorded':
    'The ANALYZE stage has not recorded a verdict for this artifact. That is not a clean result — nothing has been concluded about it.',
  'p.the-api-and-this-interface-are':
    'The API and this interface are served from one origin, so there is no cross-origin request and the loop stream is same-origin.',
  'p.the-api-is-not-answering':
    'The API is not answering',
  'p.the-api-returned-an-error-instead':
    'The API returned an error instead of data. This is a fault on the server side, not something you did wrong.',
  'p.the-api-returned-only-part-of':
    'The API returned only part of the match list, so match counts are not shown here. Open an advisory to see every match recorded against it.',
  'p.the-api-returned-only-part-of-2':
    'The API returned only part of the match list, so this advisory\'s matches were not all seen. Open it to count them.',
  'p.the-advisories-on-this-screen-are':
    'The advisories on this screen are the records stored in this deployment. Nothing on it was fetched from an external source while you have been looking at it.',
  'p.the-affected-employee-sees-the-incident':
    'The affected employee sees the incident narrative and the evidence.',
  'p.the-affected-employees-are-not-shown':
    'The affected employees are not shown what happened.',
  'p.the-affected-employees-see-the-full':
    'The affected employees see the full narrative.',
  'p.the-analyser-recorded-no-indicators-for':
    'The analyser recorded no indicators for this artifact. That is an absence of extraction, not a finding of none.',
  'p.the-analysis-stage-recorded-no-verdict':
    'The analysis stage recorded no verdict for this artifact. Nothing has been concluded about it.',
  'p.the-analyzer-returned-no-behaviour-summary':
    'The analyzer returned no behaviour summary for this artifact.',
  'p.the-answer-did-not-save':
    'The answer did not save',
  'p.the-answer-key-was-not-included':
    'The answer key was not included in this payload, so no option is marked correct here.',
  'p.the-artifact-is-being-analysed-stage':
    'The artifact is being analysed. Stage 3 will stop at the approval gate.',
  'p.the-artifact-was-not-accepted':
    'The artifact was not accepted',
  'p.the-assignment-did-not-go-through':
    'The assignment did not go through. Nothing was assigned.',
  'p.the-audience-is-recomputed-at-execution':
    'The audience is recomputed at execution time. If a risk score moves or somebody&apos;s status changes between now and approval, the list can differ from this one.',
  'p.the-capability-endpoint-did-not-answer':
    'The capability endpoint did not answer',
  'p.the-change-and-its-reason-are':
    'The change and its reason are in the audit trail.',
  'p.the-completion-time-was-not-recorded':
    'The completion time was not recorded.',
  'p.the-connection-records-their-states-and':
    'The connection records, their states and every action below are real and audited. No sync client is compiled into this build, so nothing on this page can reach a provider — a sync says so rather than inventing a result. The course catalogues attached to these connections are demonstration data.',
  'p.the-dashboard-did-not-answer-so':
    'The dashboard did not answer, so no department standing can be shown.',
  'p.the-dashboard-has-not-answered-yet':
    'The dashboard has not answered yet, so nothing can be summarised.',
  'p.the-decision-did-not-save':
    'The decision did not save',
  'p.the-decision-was-not-recorded':
    'The decision was not recorded',
  'p.the-decision-was-not-recorded-nothing':
    'The decision was not recorded. Nothing changed.',
  'p.the-decision-was-recorded-without-a':
    'The decision was recorded without a comment.',
  'p.the-delivery-route-this-lesson-teaches':
    'The delivery route this lesson teaches about.',
  'p.the-departments-endpoint-returned-no-rollup':
    'The departments endpoint returned no roll-up for this department, which happens when it has no active employees.',
  'p.the-detail-of-this-incident-is':
    'The detail of this incident is restricted and is not shown in this view.',
  'p.the-directory-is-empty':
    'The directory is empty',
  'p.the-download-did-not-complete':
    'The download did not complete.',
  'p.the-employee-sees-their-score-which':
    'The employee sees their score, which questions they got wrong, and the explanation for each.',
  'p.the-employees-could-not-be-attached':
    'The employees could not be attached.',
  'p.the-employees-endpoint-returned-an-empty':
    'The employees endpoint returned an empty roster. People appear here once an organisation is imported or the demonstration organisation is seeded.',
  'p.the-engine-has-not-reached-a':
    'The engine has not reached a verdict for this job yet.',
  'p.the-engine-reached-this-classification':
    'The engine reached this classification.',
  'p.the-engine-stopped-partway-through-and':
    'The engine stopped part-way through and produced no verdict. The sample is still quarantined, so the run can be repeated on exactly the same bytes.',
  'p.the-extraction-request-failed':
    'The extraction request failed',
  'p.the-feed-item-was-not-pushed':
    'The feed item was not pushed',
  'p.the-finding-record-keeps-only-the':
    'The finding record keeps only the most recent note. Every status change, owner change and training assignment is written to the audit trail as it happens.',
  'p.the-import-request-failed':
    'The import request failed.',
  'p.the-incident-narrative-and-the-evidence':
    'The incident narrative and the evidence are withheld from the affected employee at this level.',
  'p.the-integrations-layer-did-not-load':
    'The integrations layer did not load on this host, so the destinations it would describe are unknown rather than absent.',
  'p.the-item-moved-to-another-state':
    'The item moved to another state before this action reached the server — usually because someone else acted on it first. Reload to see where it stands now.',
  'p.the-job-failed-without-recording-a':
    'The job failed without recording a reason.',
  'p.the-judgement-and-its-reason-are':
    'The judgement and its reason are on the audit trail.',
  'p.the-kernel-would-refuse-to-execute':
    'The kernel would refuse to execute a file in the quarantine. Read from the host mounts, not assumed.',
  'p.the-list-response-does-not-carry':
    'The list response does not carry a subject count. Open the risk to see who is attached.',
  'p.the-loop-counts-could-not-be':
    'The loop counts could not be read. Open Closed Loops for the error in full.',
  'p.the-loop-has-been-released-to':
    'The loop has been released to targeting.',
  'p.the-loops-analyze-stage-has-not':
    'The loop\'s ANALYZE stage has not written a verdict for this artifact. That is not a clean result — nothing has been concluded about it.',
  'p.the-loops-analyze-stage-runs-the':
    'The loop’s ANALYZE stage runs the platform analyzer over this artifact’s text. It does not raise a sandbox job, and this deployment records no link from a threat record to one — so no detonation verdict is claimed here.',
  'p.the-match-named-this-policy-but':
    'The match named this policy but no single rule inside it.',
  'p.the-match-supplies-the-policy-the':
    'The match supplies the policy, the departments, the people and the confidence.',
  'p.the-mean-behaviourrisk-score-across-active':
    'The mean behaviour-risk score across active employees: role baseline plus what each person did when a threat reached them.',
  'p.the-mean-current-risk-score-of':
    'The mean current risk score of every person on the roster.',
  'p.the-mean-of-20-role-sensitivity':
    'The mean of 20 + role sensitivity × 20 across the roster.',
  'p.the-mean-of-every-current-risk':
    'The mean of every current risk score on the roster.',
  'p.the-measurement-window-is-set-by':
    'The measurement window is set by the server and reported with each rate.',
  'p.the-module-could-not-be-created':
    'The module could not be created.',
  'p.the-module-is-marked-rejected-and':
    'The module is marked rejected and the run is closed as failed-by-review. Nothing is assigned to anyone, and the run cannot be reopened from this screen.',
  'p.the-module-was-rejected-and-the':
    'The module was rejected and the run is closed.',
  'p.the-note-is-not-attributed-the':
    'The note is not attributed — the finding is open again.',
  'p.the-one-sentence-the-employee-is':
    'The one sentence the employee is left with.',
  'p.the-oneparagraph-summary-an-employee-sees':
    'The one-paragraph summary an employee sees before opening the module.',
  'p.the-organisation-or-tenant-identifier-the':
    'The organisation or tenant identifier the provider knows you by.',
  'p.the-password-is-used-once-for':
    'The password is used once, for this run, and is never stored.',
  'p.the-person-this-account-acts-as':
    'The person this account acts as. Their risk score moves when they complete training.',
  'p.the-platform-compared-it-against-the':
    'The platform compared it against the extracted policy rules, the approved-software list and the technologies recorded as in use, and found no overlap. That is not a statement that the organisation is unaffected — it is a statement about what has been recorded here.',
  'p.the-platform-did-not-answer-the':
    'The platform did not answer the capability request, so this build cannot tell you which environment it is talking to.',
  'p.the-platform-does-not-attribute-a':
    'The platform does not attribute a risk-score change to an incident risk. Risk events record the loop run that caused them and carry no incident reference, so no honest number can be shown here. Each subject&rsquo;s score and its derivation live on their own profile.',
  'p.the-provider-answered':
    'The provider answered.',
  'p.the-provider-tenant-this-connection-would':
    'The provider tenant this connection would talk to.',
  'p.the-provider-was-not-contacted':
    'The provider was not contacted.',
  'p.the-publisher-did-not-attach-a':
    'The publisher did not attach a CVSS score to this advisory.',
  'p.the-publisher-did-not-attach-a-2':
    'The publisher did not attach a CVSS score.',
  'p.the-quarantine-is-not-mounted-noexec':
    'The quarantine is NOT mounted noexec on this host. Samples are never executed by the analysis, but the mount does not enforce it.',
  'p.the-queues-could-not-be-read':
    'The queues could not be read, so this list is empty for a reason that has nothing to do with your workload.',
  'p.the-reason-is-on-the-audit':
    'The reason is on the audit trail. Re-assess it to bring it back.',
  'p.the-reason-was-written-to-the':
    'The reason was written to the audit trail. The last sync record is unchanged.',
  'p.the-records-for-each-of-these':
    'The records for each of these exist and are served by the API. What is missing is the route that renders them into a document. Each card names the gap rather than hiding it behind a button.',
  'p.the-report-is-now-a-threat':
    'The report is now a threat record and the artifact is being analysed.',
  'p.the-report-was-not-dismissed':
    'The report was not dismissed',
  'p.the-report-was-not-pushed':
    'The report was not pushed',
  'p.the-request-could-not-be-completed':
    'The request could not be completed',
  'p.the-request-did-not-complete-and':
    'The request did not complete, and the reason was not reported.',
  'p.the-request-took-too-long':
    'The request took too long',
  'p.the-required-action-was-met-to':
    'The required action was met to this incident’s standard.',
  'p.the-reset-did-not-complete':
    'The reset did not complete',
  'p.the-resource-catalogue-could-not-be':
    'The resource catalogue could not be loaded, so this list is not a statement that nothing exists for this topic.',
  'p.the-reviewer-applies-this-bar-when':
    'The reviewer applies this bar when accepting a completion. The quiz grader does not know about it.',
  'p.the-risk-could-not-be-closed':
    'The risk could not be closed. Nothing changed.',
  'p.the-risk-could-not-be-opened':
    'The risk could not be opened. Nothing was saved.',
  'p.the-risk-could-not-be-reopened':
    'The risk could not be reopened. Nothing changed.',
  'p.the-risk-engine-gave-no-reason':
    'The risk engine gave no reason for selecting this person.',
  'p.the-run-completed-and-produced-no':
    'The run completed and produced no behavioural findings — the sample did nothing the worker recognised.',
  'p.the-run-this-artifact-started-its':
    'The run this artifact started. Its stage history is the record of what happened next.',
  'p.the-same-quarantined-bytes-are-being':
    'The same quarantined bytes are being analysed again.',
  'p.the-sample-is-quarantined-and-waiting':
    'The sample is quarantined and waiting for a worker.',
  'p.the-sandbox-did-not-report-its':
    'The sandbox did not report its capabilities. Treat its availability as unknown rather than assuming either answer.',
  'p.the-sandbox-pipeline-this-deployment-runs':
    'The sandbox pipeline this deployment runs submissions through.',
  'p.the-sender-address-the-subject-line':
    'The sender address, the subject line, the link — whatever you have. Do not open it first.',
  'p.the-server-did-not-accept-it':
    'The server did not accept it.',
  'p.the-server-downloads-the-content-and':
    'The server downloads the content and analyses what comes back. It refuses to fetch private, loopback and cloud-metadata addresses, and says which rule it hit.',
  'p.the-server-failed-on-this-request':
    'The server failed on this request',
  'p.the-server-issued-a-new-token':
    'The server issued a new token for this account.',
  'p.the-server-refused-this-change':
    'The server refused this change',
  'p.the-server-refused-this-decision':
    'The server refused this decision',
  'p.the-server-refused-this-request-reloading':
    'The server refused this request. Reloading is unlikely to change the answer — what it said is below.',
  'p.the-server-rejected-these-values':
    'The server rejected these values',
  'p.the-server-returned-no-description-of':
    'The server returned no description of what it did. Treat the advisory list as unchanged rather than as up to date.',
  'p.the-server-took-the-request-but':
    'The server took the request but did not answer in time. It is likely busy rather than broken — trying again usually works.',
  'p.the-session-expired-or-was-signed':
    'The session expired or was signed out elsewhere. Sign in again to pick up where you left off.',
  'p.the-share-of-people-who-acted':
    'The share of people who acted on a simulated lure.',
  'p.the-share-who-recognised-a-lure':
    'The share who recognised a lure and said so. This is the human sensor.',
  'p.the-shell-reads-this-once-when':
    'The shell reads this once when the application loads, so it decides how the rail comes up next time rather than moving it now. The control at the foot of the rail collapses it immediately, and writes the same preference.',
  'p.the-signin-request-failed-before-the':
    'The sign-in request failed before the server answered.',
  'p.the-single-behaviour-this-module-is':
    'The single behaviour this module is asking for.',
  'p.the-source-did-not-list-affected':
    'The source did not list affected products.',
  'p.the-source-named-no-technique':
    'The source named no technique.',
  'p.the-source-published-no-indicators-with':
    'The source published no indicators with this advisory.',
  'p.the-source-published-no-references':
    'The source published no references.',
  'p.the-studio-has-no-generate-button':
    'The studio has no generate button, because the platform has no studio generator. A module is written in one place only: the conversion stage of a loop run, from a threat that has already been analyzed. That is what keeps every module traceable to a real artifact instead of to a prompt somebody typed.',
  'p.the-threat-record-does-not-carry':
    'The threat record does not carry the engine that wrote this sentence, so nothing is claimed about how it was produced.',
  'p.the-ticket-or-case-this-came':
    'The ticket or case this came from. It is what the audit trail labels every entry with.',
  'p.the-training-assignment-was-refused':
    'The training assignment was refused',
  'p.the-vendor-that-produced-the-platform':
    'The vendor that produced the platform. The organisation running it is named separately on incident records.',
  'p.the-window-for-taking-it-closed':
    'The window for taking it closed. The lesson is below and still worth reading; if you need it reassigned, ask the security team.',
  'p.there-is-not-enough-measured-activity':
    'There is not enough measured activity to summarise this period.',
  'p.these-are-the-current-rollups-for':
    'These are the current roll-ups for the departments this run selected from. They are context, not this run&apos;s effect — no before-and-after department measurement is recorded per run.',
  'p.these-were-generated-not-observed-they':
    'These were generated, not observed. They are demonstration data.',
  'p.they-can-read-your-answer-on':
    'They can read your answer on their own screen.',
  'p.they-read-this-on-their-own':
    'They read this on their own screen. Written to the audit trail under your name.',
  'p.this-account-is-not-attached-to':
    'This account is not attached to a person in the organisation, so it has no risk score of its own.',
  'p.this-analyzer-did-not-run-and':
    'This analyzer did not run and did not record a reason.',
  'p.this-analyzer-recorded-no-structured-observation':
    'This analyzer recorded no structured observations for this sample.',
  'p.this-archive-is-encrypted-and-analysis':
    'This archive is encrypted and analysis has paused for a password.',
  'p.this-artifact-carries-no-recipient-or':
    'This artifact carries no recipient or department metadata, so how far it reached is unknown.',
  'p.this-assignment-expired-before-the-quiz':
    'This assignment expired before the quiz was taken, so there is no score.',
  'p.this-assignment-has-not-been-completed':
    'This assignment has not been completed, so there is no score.',
  'p.this-assignment-was-never-completed-so':
    'This assignment was never completed, so no quiz was graded.',
  'p.this-browser-refused-to-store-the':
    'This browser refused to store the preference — private browsing or a full quota. It applies for this session and will not survive a reload.',
  'p.this-build-talks-to-a-separate':
    'This build talks to a separate API host.',
  'p.this-content-is-now-analystedited':
    'This content is now analyst-edited.',
  'p.this-deployment-did-not-describe-the':
    'This deployment did not describe the extraction state of the document.',
  'p.this-deployment-did-not-record-where':
    'This deployment did not record where the number came from.',
  'p.this-deployment-did-not-report-its':
    'This deployment did not report its integration matrix, so where a sample would go cannot be answered here.',
  'p.this-deployment-reports-demo-mode-so':
    'This deployment reports demo mode, so the seeded accounts are offered directly. Each button performs a real sign-in against the platform.',
  'p.this-expired-before-it-was-finished':
    'This expired before it was finished',
  'p.this-finding-is-in-a-state':
    'This finding is in a state the API allows no move out of. Nothing can be changed here.',
  'p.this-finding-is-not-about-a':
    'This finding is not about a version. No affected, approved or recommended version was recorded for it.',
  'p.this-finding-is-not-tied-to':
    'This finding is not tied to a policy. It describes an exposure the platform found without a document to check it against.',
  'p.this-finding-names-no-employees-and':
    'This finding names no employees, and the API requires an explicit list. There is nobody to assign from this screen — record the affected people on the finding first.',
  'p.this-host-cannot-report-whether-the':
    'This host cannot report whether the quarantine is mounted noexec.',
  'p.this-id-no-longer-resolves-to':
    'This id no longer resolves to an employee record.',
  'p.this-is-an-automated-first-pass':
    'This is an automated first pass. An analyst decides what happens next.',
  'p.this-is-derived-from-the-riskevent':
    'This is derived from the risk-event trail, not from an assignment list. The platform exposes no per-employee assignment or campaign endpoint, so an outstanding assignment that has not yet produced an event does not appear here.',
  'p.this-is-no-longer-assigned-to':
    'This is no longer assigned to you.',
  'p.this-is-sent-to-a-person':
    'This is sent to a person as you wrote it.',
  'p.this-is-the-module-exactly-as':
    'This is the module exactly as an employee meets it, with the answer key added.',
  'p.this-is-the-number-the-product':
    'This is the number the product stakes its claim on, so the measurement condition is part of the definition rather than a footnote.',
  'p.this-is-the-only-risk-figure':
    'This is the only risk figure that may be read as evidence the programme works. The composite score also falls when training is merely completed, so a fall in the composite can mean nothing more than that modules were assigned.',
  'p.this-job-did-not-record-which':
    'This job did not record which tiers ran. Treat the findings below as incomplete rather than as a full picture.',
  'p.this-member-has-not-finished-analysis':
    'This member has not finished analysis.',
  'p.this-module-carries-no-questions-so':
    'This module carries no questions, so completing it evidences nothing about comprehension.',
  'p.this-module-carries-no-quiz':
    'This module carries no quiz.',
  'p.this-module-has-no-lesson-sections':
    'This module has no lesson sections recorded.',
  'p.this-module-has-no-lesson-sections-3':
    'This module has no lesson sections. An employee would open it and find only the quiz.',
  'p.this-module-has-no-quiz-an':
    'This module has no quiz. An assignment carrying it could not be completed.',
  'p.this-module-has-no-quiz-it':
    'This module has no quiz. It cannot be completed by an employee.',
  'p.this-module-has-no-sections-to':
    'This module has no sections to edit.',
  'p.this-module-has-no-sections-add':
    'This module has no sections. Add at least one before saving.',
  'p.this-module-has-no-sections-an':
    'This module has no sections. An employee would open it and find nothing to read.',
  'p.this-module-is-not-linked-to':
    'This module is not linked to a policy document. This deployment records the threat a module was built from, but does not attach policies to training content.',
  'p.this-person-has-no-recorded-score':
    'This person has no recorded score. The required action may not carry a quiz.',
  'p.this-persons-current-score-could-not':
    'This person\'s current score could not be read.',
  'p.this-record-does-not-exist-it':
    'This record does not exist. It may have been deleted, or the link may point at a different environment.',
  'p.this-report-has-a-status-this':
    'This report has a status this screen does not recognise.',
  'p.this-risk-is-closed-reopen-it':
    'This risk is closed. Reopen it before attaching more people.',
  'p.this-role-has-no-analyst-surfaces':
    'This role has no analyst surfaces. Its world is the portal.',
  'p.this-role-has-no-surfaces-assigned':
    'This role has no surfaces assigned in the permission matrix. That is a configuration problem rather than something you can fix here — ask whoever provisioned the account.',
  'p.this-run-has-already-left-the':
    'This run has already left the gate. The record below is read-only.',
  'p.this-run-has-no-threat-attached':
    'This run has no threat attached, so there is no artifact to review. Approving it would advance a loop with nothing behind it.',
  'p.this-run-has-not-been-measured':
    'This run has not been measured. Nothing is shown here rather than zeroes: no completion rate, no score and no risk movement have been computed for it.',
  'p.this-run-produces-a-training-module':
    'This run produces a training module. No simulation lure is attached to a loop run in this deployment — simulated campaigns are built separately under Simulations.',
  'p.this-score-has-never-been-recalculated':
    'This score has never been recalculated — no events have been recorded against you.',
  'p.this-score-is-not-asserted-it':
    'This score is not asserted, it is computed. It starts at a baseline set by how sensitive the role is, and every signal the engine has recorded since then moves it. Add the column below up and you get the number at the top of this page.',
  'p.this-source-has-not-answered-yet':
    'This source has not answered yet',
  'p.this-verdict-came-from-a-keyword':
    'This verdict came from a keyword and indicator extractor running on this deployment, not from a language model. It is a first pass, not a decision.',
  'p.this-view-is-served-one-figure':
    'This view is served one figure per department — the average as it stands now — and one organisation-wide series. There is no stored per-department history to difference, so no department can honestly be called most improved.',
  'p.threat-and-run-records-are-analystscoped':
    'Threat and run records are analyst-scoped. Ask the security team for the underlying runs behind the closed-loop count above.',
  'p.threat-or-module-title':
    'Threat or module title',
  'p.time-spent-was-not-recorded-for':
    'Time spent was not recorded for this assignment.',
  'p.title-or-description':
    'Title or description',
  'p.title-topic-or-behaviour':
    'Title, topic or behaviour',
  'p.total-moved-by-behaviour':
    'Total moved by behaviour',
  'p.trail-window':
    'Trail window',
  'p.training-completion':
    'Training completion',
  'p.training-completion-rate':
    'Training completion rate',
  'p.training-content-not-generated-yet':
    'Training content not generated yet',
  'p.triaging-a-report-requires-the-analyst':
    'Triaging a report requires the analyst role. This account can read the queue only.',
  'p.truncated-by-the-server-the-excerpt':
    'Truncated by the server. The excerpt exists for a person to read, not for completeness.',
  'p.two-or-more-events-are-needed':
    'Two or more events are needed to draw a line',
  'p.urls-one-per-line':
    'URLs, one per line',
  'p.unclassified':
    'Unclassified',
  'p.update-time-not-recorded':
    'Update time not recorded',
  'p.upload-a-file-or-submit-a':
    'Upload a file or submit a URL above. Every submission appears here the moment it is queued, and updates as the engine works through it.',
  'p.user-agent-not-recorded':
    'User agent not recorded',
  'p.version-history-is-not-recorded-for':
    'Version history is not recorded for modules yet. Editing overwrites the stored content in place, and no revision is kept — so there is nothing to compare against and nothing to roll back to. Policies are versioned; modules are not.',
  'p.version-recorded-here':
    'Version recorded here',
  'p.waiting-for-a-human-decision-no':
    'Waiting for a human decision. No targeting or training happens until it is given.',
  'p.what-configuring-a-source-would-do':
    'What configuring a source would do',
  'p.what-happened':
    'What happened',
  'p.what-happened-2':
    'What happened?',
  'p.what-it-contains':
    'What it contains',
  'p.what-made-you-suspicious-or-what':
    'What made you suspicious, or what you already did.',
  'p.what-people-have-done-is-currently':
    'What people have done is currently pulling the organisation below where its roles alone would place it.',
  'p.what-the-engine-got-right-or':
    'What the engine got right or wrong, in the words you would use in a ticket.',
  'p.what-the-engine-reported':
    'What the engine reported',
  'p.what-the-evidence-shows-it-can':
    'What the evidence shows it can do',
  'p.what-the-incident-actually-found-empty':
    'What the incident actually found. Empty rows are discarded when the risk is opened.',
  'p.what-they-wrote':
    'What they wrote',
  'p.what-this-connection-is-called-on':
    'What this connection is called on the integrations screen.',
  'p.what-to-do-next':
    'What to do next',
  'p.what-you-checked-what-you-changed':
    'What you checked, what you changed, or what is wrong with it.',
  'p.what-your-role-covers':
    'What your role covers',
  'p.where-the-organisation-would-sit-if':
    'Where the organisation would sit if nobody had done anything at all.',
  'p.who-is-accountable-for-closing-it':
    'Who is accountable for closing it. Optional.',
  'p.who-the-incident-named-they-are':
    'Who the incident named. They are attached to the risk; the required work is assigned separately, from the risk itself.',
  'p.why-do-you-think-this-was':
    'Why do you think this was assigned in error?',
  'p.why-is-this-being-disabled':
    'Why is this being disabled',
  'p.why-this-does-not-need-to':
    'Why this does not need to stay in front of an analyst.',
  'p.why-this-rule-is-being-rejected':
    'Why this rule is being rejected',
  'p.widen-the-search-choose-another-department':
    'Widen the search, choose another department, or clear the risk band to see the rest of the roster.',
  'p.with-a-match-against-us':
    'With a match against us',
  'p.with-a-model':
    'With a model',
  'p.with-no-match-behind-it-the':
    'With no match behind it the finding carries no confidence value, no policy and no named people.',
  'p.withdraw-the-plan':
    'Withdraw the plan',
  'p.work-email-on-the-account':
    'Work email on the account',
  'p.would-be-graded-quizzes-at-or':
    'Would be graded quizzes at or above the pass mark, divided by graded quizzes.',
  'p.would-be-the-median-time-from':
    'Would be the median time from lure delivery to the report being filed.',
  'p.write-synthetic-outcomes':
    'Write synthetic outcomes',
  'p.written-by-a-language-model-no':
    'Written by a language model. No person has edited the wording.',
  'p.written-for-the-record-depending-on':
    'Written for the record. Depending on the confidentiality below, the affected employee may read this.',
  'p.you-are-editing-the-content-an':
    'You are editing the content an employee will be assigned. Nothing is saved until you say so.',
  'p.you-can-reach-every-one-of':
    'You can reach every one of these screens from the navigation once you are inside.',
  'p.you-contested-this-nobody-has-answered':
    'You contested this. Nobody has answered yet.',
  'p.you-do-not-have-access-to':
    'You do not have access to this',
  'p.you-have-already-completed-this':
    'You have already completed this',
  'p.your-assigned-training-the-work-raised':
    'Your assigned training, the work raised against you, and how your risk score was calculated.',
  'p.your-individual-answers-were-graded-and':
    'Your individual answers were graded and then discarded — only the score was kept, so this screen cannot show you which questions you got wrong.',
  'p.your-role-can-read-intelligence-but':
    'Your role can read intelligence but not ask the platform to check its sources.',
  'p.your-role-can-read-intelligence-but-2':
    'Your role can read intelligence but not assess, dismiss or raise findings from it.',
  'p.your-role-can-read-this-module':
    'Your role can read this module but not change it. Editing training content requires the authoring permission.',
  'p.your-role-can-read-this-queue':
    'Your role can read this queue but cannot decide on it. An analyst has to act.',
  'p.your-role-can-read-this-review':
    'Your role can read this review but cannot record a decision.',
  'p.your-role-cannot-read-sandbox-analyses':
    'Your role cannot read sandbox analyses, so no export is offered here. An analyst can produce these files from the sandbox surface.',
  'p.your-role-cannot-read-the-report':
    'Your role cannot read the report queue, so this person’s reports cannot be shown here. The reporting credit is still visible in the event trail.',
  'p.your-role-does-not-include-this':
    'Your role does not include this view. An administrator can grant the permission if you need it.',
  'p.your-session-has-ended':
    'Your session has ended',
  'p.your-system-asks-for-reduced-motion':
    'Your system asks for reduced motion, and this product honours it.',
  'p.your-system-does-not-ask-for':
    'Your system does not ask for reduced motion.',
  'p.zero-to-100-lower-is-safer':
    'Zero to 100. Lower is safer. A point-in-time property of the roster, not a windowed rate.',
  'p.httpsexamplecominvoicezip':
    'https://example.com/invoice.zip',
  'p.httpsexampleinstructurecom':
    'https://example.instructure.com',
  'p.verifypaymentchange':
    'verify_payment_change',
  'p.err-not-found':
    'Not found',

  // --- hero tiles -------------------------------------------------------
  'h.assigned-to-you':
    'Assigned to you',
  'h.waiting-at-the-gate':
    'Waiting at the gate',
  'h.active-loops':
    'Active loops',
  'h.open-incident-risks':
    'Open incident risks',
  'h.running-simulations':
    'Running simulations',
  'h.sandbox-analyzers':
    'Sandbox analyzers',
  'h.approval-items-naming-you':
    'Approval items naming you',

  // --- wired from the parked work-list ------------------------------------
  'p.a-chat-or-messaging-app':
    'A chat or messaging app',
  'p.a-reviewer-discarded-these-they-were':
    'A reviewer discarded these. They were never in force.',
  'p.an-analyst-reviewed-it-and-decided':
    'An analyst reviewed it and decided no action was needed. Reporting it was still right.',
  'p.an-analyst-took-it-forward-it':
    'An analyst took it forward. It became a real threat record and started a loop.',
  'p.an-employee-reported-this-and-an':
    'An employee reported this and an analyst pushed it into the loop.',
  'p.analyzers-reported-ready-by-the-sandbox':
    'Analyzers reported ready by the sandbox',
  'p.continue-with-microsoft':
    'Continue with Microsoft',
  'p.duration-not-measured':
    'Duration not measured',
  'p.dynamic-detonation-did-not-run':
    'Dynamic detonation did not run',
  'p.dynamic-detonation-ran':
    'Dynamic detonation ran',
  'p.employment-status-is-not-returned-by':
    'Employment status is not returned by the employees endpoint, so no status column is shown.',
  'p.endorsed-held-for-a-second-approver':
    'Endorsed, held for a second approver',
  'p.findings-that-matter-but-not-enough':
    'Findings that matter, but not enough of them to call it malicious. An analyst decides.',
  'p.lowers-the-risk-score':
    'Lowers the risk score',
  'p.nothing-found-reached-the-threshold-to':
    'Nothing found reached the threshold to flag this sample.',
  'p.nothing-is-checked-against-these-a':
    'Nothing is checked against these. A machine may propose; only a person may activate, and activating writes a version snapshot.',
  'p.open-findings-at-critical-or-high':
    'Open findings at critical or high severity',
  'p.proposed-awaiting-a-human':
    'Proposed — awaiting a human',
  'p.raises-the-risk-score':
    'Raises the risk score',
  'p.refused-by-the-firewall':
    'Refused by the firewall',
  'p.replaced-by-a-later-rule-kept':
    'Replaced by a later rule. Kept so an older finding still resolves to what it cited.',
  'p.reported-by-an-employee':
    'Reported by an employee',
  'p.runs-waiting-at-the-human-approval':
    'Runs waiting at the human approval gate',
  'p.single-signon-and-directory-sync-neither':
    'Single sign-on and directory sync. Neither is wired here: this deployment authenticates against its own user table.',
  'p.static-analysis-did-not-run':
    'Static analysis did not run',
  'p.submitted-by-an-analyst':
    'Submitted by an analyst',
  'p.submitted-directly-by-an-analyst-on':
    'Submitted directly by an analyst on this screen.',
  'p.take-me-to-my-training':
    'Take me to my training',
  'p.take-me-to-the-command-center':
    'Take me to the Command Center',
  'p.take-me-to-the-executive-view':
    'Take me to the Executive View',
  'p.taken-from-the-curated-intel-feed':
    'Taken from the curated intel feed by an analyst.',
  'p.the-evidence-is-sufficient-to-call':
    'The evidence is sufficient to call this malicious. The findings behind it are listed below.',
  'p.the-loop-stops-here-a-named':
    'The loop stops here. A named analyst reads what was generated and decides before anything is targeted at a colleague. Nothing crosses this line on its own.',
  'p.the-rules-this-organisation-is-actually':
    'The rules this organisation is actually checked against today.',
  'p.the-server-returned-a-full-page':
    'The server returned a full page, so every count here is a floor.',
  'p.waiting-for-a-decision':
    'Waiting for a decision',
  'p.waiting-for-an-analyst-to-read':
    'Waiting for an analyst to read it.',
  'p.where-approved-training-would-be-delivered':
    'Where approved training would be delivered, and where completions would be read back so measurement is not taken on trust.',
  'p.written-by-a-template':
    'Written by a template',
  'p.your-edits-are-written-to-the':
    'Your edits are written to the module first, which marks it analyst-edited.',
  'p.active':
    'Active',
  'p.no-rules-on-this-policy':
    'No rules on this policy',
  'p.proposed':
    'Proposed',
  'p.rejected':
    'Rejected',
  'p.superseded':
    'Superseded',
  'p.activate':
    'Activate',
  'p.location-in-the-document-was-not-recorded':
    'Location in the document was not recorded',
  'p.reject':
    'Reject',
  'p.reviewed-by-on':
    'Reviewed by {who} on {when}',
  'p.a-file-or-attachment':
    'A file or attachment',
  'p.a-link-or-website':
    'A link or website',
  'p.a-text-message':
    'A text message',
  'p.an-email':
    'An email',
  'p.analyst-submission':
    'Analyst submission',
  'p.any-author':
    'Any author',
  'p.approved':
    'Approved',
  'p.avg-over-n':
    'avg {avg} · n={sample}',
  'p.clicked-the-lure':
    'Clicked the lure',
  'p.comment':
    'Comment',
  'p.continue-with-google':
    'Continue with Google',
  'p.curated-feed':
    'Curated feed',
  'p.delivered':
    'Delivered',
  'p.every-plan':
    'Every plan',
  'p.human-approval-gate':
    'Human approval gate',
  'p.human-sensor':
    'Human sensor',
  'p.identity-providers':
    'Identity providers',
  'p.ignored-it':
    'Ignored it',
  'p.learning-platforms':
    'Learning platforms',
  'p.no-risk-movement':
    'No risk movement',
  'p.open-findings':
    'open findings',
  'p.open-findings-scanned':
    'open findings scanned',
  'p.people':
    'people',
  'p.person':
    'person',
  'p.reported-the-lure':
    'Reported the lure',
  'p.required':
    'Required',
  'p.revision-requested':
    'Revision requested',
  'p.runs-held-at':
    'Runs held at {stage}',
  'p.static-analysis-ran':
    'Static analysis ran',
  'p.threat-feed':
    'Threat feed',
  'p.written-by-a-model':
    'Written by a model',
  'p.continue-with-sso':
    'Continue with SSO',
  'p.source-not-recorded':
    'Source not recorded',
  'p.available':
    'available',
  'p.items-at-the-gate-in-total':
    '{count} {noun} at the gate in total',
  'p.not-available':
    'not available',
  'p.open-findings-at-all-severities':
    '{count} open {noun} at all severities',
  'p.unavailable-dynamic-detonation':
    '{count} unavailable · dynamic detonation {state}',
  'p.people-risk-scores-are-current':
    '{count} {noun}. Risk scores are the engine’s current values. ',
  'p.recent-movement-is-derived-from':
    'Recent movement is derived from the {count} most recent risk events that could be attributed to a named person; it is not a full history.',

  // --- the seven loop stages ----------------------------------------------
  's.ingest.label': 'Intake',
  's.ingest.hint': 'Human sensor, feed, API',
  's.ingest.owner': 'Platform',
  's.analyze.label': 'Analysis',
  's.analyze.hint': 'Sandbox verdict and IOCs',
  's.analyze.owner': 'Sandbox',
  's.convert.label': 'Conversion',
  's.convert.hint': 'Threat becomes safe training',
  's.convert.owner': 'AI',
  's.target.label': 'Targeting',
  's.target.hint': 'The people actually at risk',
  's.target.owner': 'Risk engine',
  's.train.label': 'Training',
  's.train.hint': 'Delivery and completion',
  's.train.owner': 'Employee',
  's.measure.label': 'Measurement',
  's.measure.hint': 'Behaviour, not attendance',
  's.measure.owner': 'Platform',
  's.feedback.label': 'Feedback',
  's.feedback.hint': 'Evidence updates the model',
  's.feedback.owner': 'Risk engine',
  'u.behaviour-over-time':
    'Behaviour over time',
  'u.about-this-deployment-2':
    'About this deployment',
  'u.approval-gate-2':
    'Approval gate',
  'u.average-risk-score-0-100-worst-first-2':
    'Average risk score, 0–100 · worst first',
  'u.back-to-intake-2':
    'Back to intake',
  'u.clear-filters-2':
    'Clear filters',
  'u.command-palette-2':
    'Command palette',
  'u.confidence-not-stated-2':
    'Confidence not stated',
  'u.demo-data-2':
    'Demo data',
  'u.every-screen-your-role-can-open-2':
    'Every screen your role can open.',
  'u.everything-in-the-shell-is-reachable-without-2':
    'Everything in the shell is reachable without a pointer.',
  'u.human-decision-required-2':
    'Human decision required',
  'u.keyboard-shortcuts-2':
    'Keyboard shortcuts',
  'u.loop-outcomes-2':
    'Loop outcomes',
  'u.no-runs-here-2':
    'No runs here',
  'u.not-measured-2':
    'Not measured',
  'u.nothing-matches-the-palette-only-lists-screens-2':
    'Nothing matches. The palette only lists screens your role can open.',
  'u.read-from-the-running-server-not-from-2':
    'Read from the running server, not from the build.',
  'u.reset-the-demonstration-world-2':
    'Reset the demonstration world',
  'u.risk-by-department-2':
    'Risk by department',
  'u.risk-movement-by-department-2':
    'Risk movement by department',
  'u.risk-over-time-2':
    'Risk over time',
  'u.sample-size-not-recorded-2':
    'Sample size not recorded',
  'u.training-completion-2':
    'Training completion',
  'u.all-incident-risks':
    'All incident risks',
  'u.all-simulations':
    'All simulations',
  'u.all-threats':
    'All threats',
  'u.analyser-conclusion':
    'Analyser conclusion',
  'u.approve-with-edits':
    'Approve with edits',
  'u.artifact-as-received':
    'Artifact, as received',
  'u.clear-stage-filter':
    'Clear stage filter',
  'u.click-rate':
    'Click rate',
  'u.close-the-risk':
    'Close the risk',
  'u.completion-screen':
    'Completion screen',
  'u.correct-answer':
    'Correct answer',
  'u.discard-changes':
    'Discard changes',
  'u.discard-draft':
    'Discard draft',
  'u.edit-content':
    'Edit content',
  'u.escalation-is-not-available':
    'Escalation is not available.',
  'u.forgot-password':
    'Forgot password',
  'u.full-audit-log':
    'Full audit log',
  'u.generated-training':
    'Generated training',
  'u.go-to-training':
    'Go to training',
  'u.headers-and-attachment-metadata':
    'Headers and attachment metadata',
  'u.held-for-a-second-approver':
    'Held for a second approver',
  'u.incident-remediation-completion':
    'Incident remediation completion',
  'u.items-appear-here-once-an-analyst-is':
    'Items appear here once an analyst is named on them. Unassigned work stays in the whole queue.',
  'u.items-appear-here-when-a-loop-run':
    'Items appear here when a loop run finishes conversion and needs a person to release it into targeting.',
  'u.loading-the-employee-directory':
    'Loading the employee directory',
  'u.loading-this-screen':
    'Loading this screen',
  'u.new-reports-to-triage':
    'New reports to triage',
  'u.no-approved-module-to-assign':
    'No approved module to assign',
  'u.no-campaign-is-running':
    'No campaign is running',
  'u.no-department-has-a-scored-population':
    'No department has a scored population',
  'u.no-object':
    'No object',
  'u.no-open-findings':
    'No open findings.',
  'u.no-provider-is-connected':
    'No provider is connected',
  'u.no-score':
    'No score',
  'u.no-threat-has-reached-targeting-yet':
    'No threat has reached targeting yet',
  'u.not-derived':
    'Not derived',
  'u.not-reported':
    'Not reported',
  'u.not-yet-analysed':
    'Not yet analysed',
  'u.nothing-has-been-changed-yet':
    'Nothing has been changed yet',
  'u.nothing-has-been-submitted':
    'Nothing has been submitted',
  'u.nothing-is-open':
    'Nothing is open',
  'u.object-type':
    'Object type',
  'u.observed-behaviour':
    'Observed behaviour',
  'u.open-high-risk-findings':
    'Open high-risk findings',
  'u.open-integrations':
    'Open integrations',
  'u.open-review':
    'Open review',
  'u.open-risk':
    'Open risk',
  'u.open-simulations':
    'Open simulations',
  'u.open-the-findings-register':
    'Open the findings register',
  'u.open-the-full-sandbox-report':
    'Open the full sandbox report',
  'u.open-threat-intake':
    'Open threat intake',
  'u.page-size':
    'Page size',
  'u.policy-exposure':
    'Policy exposure',
  'u.quiz-and-answer-key':
    'Quiz and answer key',
  'u.report-rate':
    'Report rate',
  'u.reported-by':
    'Reported by',
  'u.request-revision':
    'Request revision',
  'u.require-a-second-approval':
    'Require a second approval',
  'u.risk-type':
    'Risk type',
  'u.sandbox-verdict':
    'Sandbox verdict',
  'u.sanitisation-not-recorded':
    'Sanitisation not recorded',
  'u.save-content':
    'Save content',
  'u.save-draft':
    'Save draft',
  'u.seeded-demonstration-accounts':
    'Seeded demonstration accounts',
  'u.sign-in':
    'Sign in',
  'u.take-away':
    'Take away',
  'u.threat-record':
    'Threat record',
  'u.unsaved-edits-shown':
    'Unsaved edits shown',
  'u.waiting-at-the-approval-gate':
    'Waiting at the approval gate',
  'u.what-discharges-this-risk':
    'What discharges this risk',
  'u.what-they-are-left-with':
    'What they are left with',
  'u.who-to-assign':
    'Who to assign',
  'u.work-email':
    'Work email',
  'u.your-role-can-read-this-queue-but':
    'Your role can read this queue but cannot decide on it.',
  'u.a-closed-loop-starts-from-an-artifact':
    'A closed loop starts from an artifact',
  'u.add-evidence-row':
    'Add evidence row',
  'u.all-closed-loops':
    'All closed loops',
  'u.already-attached':
    'Already attached',
  'u.already-disabled':
    'Already disabled',
  'u.approve-and-release':
    'Approve and release',
  'u.assign-required-work':
    'Assign required work',
  'u.attach-people':
    'Attach people',
  'u.average-risk':
    'Average risk',
  'u.average-risk-today':
    'Average risk today',
  'u.base-url':
    'Base URL',
  'u.behaviours-in-use-in-this-catalogue':
    'Behaviours in use in this catalogue',
  'u.by-when':
    'By when',
  'u.chain-of-custody':
    'Chain of custody',
  'u.check-sources-now':
    'Check sources now',
  'u.clamped-to-0-100':
    'Clamped to 0–100.',
  'u.delivery-status':
    'Delivery status',
  'u.disable-connection':
    'Disable connection',
  'u.due-date':
    'Due date',
  'u.duration-not-recorded':
    'Duration not recorded',
  'u.edit-mapping':
    'Edit mapping',
  'u.force-measurement-now':
    'Force measurement now',
  'u.high-risk':
    'High risk',
  'u.last-sync':
    'Last sync',
  'u.loop-run':
    'Loop run',
  'u.machine-derived':
    'Machine-derived',
  'u.no-approved-technology-was-matched':
    'No approved technology was matched.',
  'u.no-audit-entries-for-this-run':
    'No audit entries for this run',
  'u.no-audit-entry-for-this-risk':
    'No audit entry for this risk',
  'u.no-deadline':
    'No deadline',
  'u.no-deadline-was-set':
    'No deadline was set.',
  'u.no-department-or-person-was-named':
    'No department or person was named.',
  'u.no-external-id':
    'No external id',
  'u.no-incident-reference':
    'No incident reference',
  'u.no-policy-rule-was-matched':
    'No policy rule was matched.',
  'u.no-reason-was-recorded':
    'No reason was recorded',
  'u.no-recent-events':
    'No recent events',
  'u.no-risk-events-recorded':
    'No risk events recorded',
  'u.nobody-is-attached-yet':
    'Nobody is attached yet',
  'u.not-analysed':
    'Not analysed',
  'u.not-completed':
    'Not completed',
  'u.not-counted':
    'Not counted',
  'u.not-from-a-loop':
    'Not from a loop',
  'u.not-listed':
    'Not listed',
  'u.not-mapped-to-any-behaviour-targeting-will':
    'Not mapped to any behaviour — targeting will never select it.',
  'u.not-scored':
    'Not scored',
  'u.not-started':
    'Not started',
  'u.nothing-assigned':
    'Nothing assigned',
  'u.nothing-has-happened-yet':
    'Nothing has happened yet',
  'u.nothing-of-ours-matched-this-advisory':
    'Nothing of ours matched this advisory.',
  'u.open-department-risk':
    'Open department risk',
  'u.open-in-the-training-studio':
    'Open in the training studio',
  'u.open-roster':
    'Open roster',
  'u.open-the-approval':
    'Open the approval',
  'u.open-the-audit-log':
    'Open the audit log',
  'u.open-the-full-review':
    'Open the full review',
  'u.open-the-policy-library':
    'Open the policy library',
  'u.open-the-review-workspace':
    'Open the review workspace',
  'u.quiz-score':
    'Quiz score',
  'u.raise-a-policy-finding':
    'Raise a policy finding',
  'u.raise-finding':
    'Raise finding',
  'u.record-assessment':
    'Record assessment',
  'u.record-decision':
    'Record decision',
  'u.reviewer-decision':
    'Reviewer decision',
  'u.risk-at-selection':
    'Risk at selection',
  'u.risk-band':
    'Risk band',
  'u.risk-change':
    'Risk change',
  'u.risk-now':
    'Risk now',
  'u.save-configuration':
    'Save configuration',
  'u.search-runs':
    'Search runs',
  'u.share-high-risk':
    'Share high risk',
  'u.share-of-the-score':
    'Share of the score',
  'u.should-training-or-a-finding-be-created':
    'Should training or a finding be created?',
  'u.shown-here':
    'Shown here',
  'u.sync-now':
    'Sync now',
  'u.the-baseline':
    'The baseline',
  'u.the-module':
    'The module',
  'u.the-score':
    'The score',
  'u.training-is-not-created-from-an-advisory':
    'Training is not created from an advisory',
  'u.what-happened':
    'What happened',
  'u.what-you-must-do':
    'What you must do',
  'u.which-approved-technologies-are-affected':
    'Which approved technologies are affected?',
  'u.which-policy-is-affected':
    'Which policy is affected?',
  'u.which-users-or-departments-are-exposed':
    'Which users or departments are exposed?',
  'u.why-does-this-matter-to-this-organisation':
    'Why does this matter to this organisation?',
  'u.why-they-were-selected':
    'Why they were selected',
  'u.withdrawn-after-review-not-counted-in-the':
    'Withdrawn after review — not counted in the score',
  'u.withheld-at-this-classification-incident-evidence-routin':
    'Withheld at this classification. Incident evidence routinely names other people.',
  'u.withheld-this-key-is-credential-shaped-and':
    'Withheld — this key is credential-shaped and is never displayed',
  'u.analyse-a-url':
    'Analyse a URL',
  'u.analyse-file':
    'Analyse file',
  'u.answer-the-dispute':
    'Answer the dispute',
  'u.applies-to':
    'Applies to',
  'u.assign-training':
    'Assign training',
  'u.automated-first-pass':
    'Automated first pass',
  'u.back-to-my-security':
    'Back to my security',
  'u.baseline-from-role':
    'Baseline from role',
  'u.being-attacked-is-not-a-mark-against':
    'Being attacked is not a mark against you.',
  'u.cannot-be-approved-regenerate-it-instead':
    'Cannot be approved. Regenerate it instead.',
  'u.close-campaign':
    'Close campaign',
  'u.copy-all':
    'Copy all',
  'u.create-draft':
    'Create draft',
  'u.delivered-as':
    'Delivered as',
  'u.did-not-run':
    'Did not run',
  'u.false-positive':
    'False positive',
  'u.fetch-and-analyse':
    'Fetch and analyse',
  'u.fill-outcomes-synthetically-demo':
    'Fill outcomes synthetically (demo)',
  'u.first-pass-verdict':
    'First-pass verdict',
  'u.from-behaviour':
    'From behaviour',
  'u.go-to-your-training':
    'Go to your training',
  'u.in-use':
    'In use',
  'u.indicators-extracted':
    'Indicators extracted',
  'u.keep-checking':
    'Keep checking',
  'u.last-change':
    'Last change',
  'u.launch-campaign':
    'Launch campaign',
  'u.lure-source':
    'Lure source',
  'u.matched-from-your-library':
    'Matched from your library',
  'u.md5-hash':
    'MD5 hash',
  'u.net-effect':
    'Net effect',
  'u.new-status':
    'New status',
  'u.no-control-gap-has-been-raised':
    'No control gap has been raised',
  'u.no-departments-named-this-policy-is-organisation':
    'No departments named — this policy is organisation-wide',
  'u.no-due-date-this-deployment-does-not':
    'No due date — this deployment does not set one on training assignments',
  'u.no-findings-against-this-policy':
    'No findings against this policy',
  'u.no-owner-recorded':
    'No owner recorded',
  'u.no-policy-has-an-open-finding':
    'No policy has an open finding',
  'u.no-review-date-set':
    'No review date set',
  'u.no-version-snapshots-yet':
    'No version snapshots yet',
  'u.none-named':
    'None named.',
  'u.none-recorded':
    'None recorded',
  'u.not-linked':
    'Not linked',
  'u.not-recorded':
    'Not recorded',
  'u.not-specified-for-this-assignment':
    'Not specified for this assignment',
  'u.not-tied-to-a-policy':
    'Not tied to a policy',
  'u.nothing-has-been-raised-against-you':
    'Nothing has been raised against you',
  'u.nothing-has-gone-unanswered-yet':
    'Nothing has gone unanswered yet',
  'u.nothing-refused-by-the-firewall':
    'Nothing — refused by the firewall',
  'u.open-campaign':
    'Open campaign',
  'u.open-findings':
    'Open findings',
  'u.open-these-in-the-findings-queue':
    'Open these in the findings queue',
  'u.organisation-wide':
    'Organisation-wide',
  'u.person-and-trigger':
    'Person and trigger',
  'u.prebuilt-template':
    'Prebuilt template',
  'u.re-analyse':
    'Re-analyse',
  'u.record-count-not-available-the-source-query':
    'Record count not available — the source query did not answer.',
  'u.recorded-measured':
    'Recorded (measured)',
  'u.registered-as-metadata-only-no-document-was':
    'Registered as metadata only — no document was attached',
  'u.registered-by':
    'Registered by',
  'u.report-a-concern':
    'Report a concern',
  'u.report-something-else':
    'Report something else',
  'u.reporting-lowers-it':
    'Reporting lowers it.',
  'u.review-due':
    'Review due',
  'u.run-extraction':
    'Run extraction',
  'u.run-the-analysis-again':
    'Run the analysis again',
  'u.save-status':
    'Save status',
  'u.score-recorded':
    'Score recorded',
  'u.score-to-reach':
    'Score to reach:',
  'u.send-report':
    'Send report',
  'u.send-to-a-person':
    'Send to a person',
  'u.submit-answers':
    'Submit answers',
  'u.target-audience':
    'Target audience',
  'u.template-engine':
    'Template engine',
  'u.the-answer-was':
    'The answer was:',
  'u.this-deployment-cannot-generate-this-pack':
    'This deployment cannot generate this pack',
  'u.this-was-not-me':
    'This was not me',
  'u.time-spent':
    'Time spent',
  'u.training-this-finding-asks-for':
    'Training this finding asks for',
  'u.true-positive':
    'True positive',
  'u.type-and-size':
    'Type and size',
  'u.unlock-and-continue':
    'Unlock and continue',
  'u.upload-a-file':
    'Upload a file',
  'u.weight-constant':
    'Weight (constant)',
  'u.what-is-it':
    'What is it',
  'u.what-is-lowering-it':
    'What is lowering it',
  'u.what-is-raising-it':
    'What is raising it',
  'u.what-it-noticed':
    'What it noticed',
  'u.what-to-do':
    'What to do',
  'u.what-was-attached':
    'What was attached',
  'u.what-you-said':
    'What you said',
  'u.what-you-should-do':
    'What you should do',
  'u.why-detonation-runs-off-host':
    'Why detonation runs off-host',
  'u.you-answered':
    'You answered:',
  'u.you-disputed-this':
    'You disputed this.',
  'u.you-disputed-this-and-a-person-answered':
    'You disputed this, and a person answered.',
  'u.you-have-not-finished-any-training-yet':
    'You have not finished any training yet',
  'u.you-have-not-reported-anything-yet':
    'You have not reported anything yet',
  'u.you-scored':
    'You scored:',
  'u.your-answer':
    'Your answer',
  'u.your-role-cannot-read-these-records-so':
    'Your role cannot read these records, so the coverage is not counted here.',
  'u.accept-the-risk':
    'Accept the risk',
  'u.add-question':
    'Add question',
  'u.add-section':
    'Add section',
  'u.all-campaigns':
    'All campaigns',
  'u.already-pushed-into-the-loop':
    'Already pushed into the loop',
  'u.already-recorded':
    'Already recorded',
  'u.automated-triage':
    'Automated triage',
  'u.awaiting-approval':
    'Awaiting approval.',
  'u.back-to-sign-in':
    'Back to sign in',
  'u.back-to-submissions':
    'Back to submissions',
  'u.back-to-the-queue':
    'Back to the queue',
  'u.back-to-the-roster':
    'Back to the roster',
  'u.baseline-from-the-role':
    'Baseline from the role',
  'u.behaviour-observed':
    'Behaviour observed',
  'u.change-status':
    'Change status',
  'u.checking-the-approval-queue':
    'Checking the approval queue',
  'u.closure-criteria':
    'Closure criteria',
  'u.create-and-open-the-editor':
    'Create and open the editor',
  'u.edit-module':
    'Edit module',
  'u.event-trail':
    'Event trail',
  'u.file-under':
    'File under',
  'u.full-name':
    'Full name',
  'u.generated-from':
    'Generated from',
  'u.go-to-the-gate':
    'Go to the gate',
  'u.go-to-threat-intake':
    'Go to threat intake',
  'u.go-to-your-home-screen':
    'Go to your home screen',
  'u.held-for-a-second-approver-2':
    'Held for a second approver.',
  'u.how-the-score-is-computed':
    'How the score is computed',
  'u.how-urgency-is-coloured':
    'How urgency is coloured',
  'u.looking-for-the-loop-run-behind-this':
    'Looking for the loop run behind this artifact',
  'u.mark-false-positive':
    'Mark false positive',
  'u.moved-by-recorded-behaviour':
    'Moved by recorded behaviour',
  'u.my-security':
    'My security',
  'u.new-campaign':
    'New campaign',
  'u.new-module':
    'New module',
  'u.no-approver-recorded':
    'No approver recorded',
  'u.no-artifact-has-entered-the-platform-yet':
    'No artifact has entered the platform yet',
  'u.no-artifact-matches-these-filters':
    'No artifact matches these filters',
  'u.no-campaign-matches-these-filters':
    'No campaign matches these filters',
  'u.no-campaigns-have-been-created':
    'No campaigns have been created',
  'u.no-connection-records-exist':
    'No connection records exist.',
  'u.no-employee-has-reported-anything-yet':
    'No employee has reported anything yet',
  'u.no-feed-item-matches-these-filters':
    'No feed item matches these filters',
  'u.no-indicators-were-extracted':
    'No indicators were extracted',
  'u.no-loop-runs-yet':
    'No loop runs yet',
  'u.no-module-matches-this-view':
    'No module matches this view',
  'u.no-one-is-scored-yet':
    'No one is scored yet',
  'u.no-report-matches-these-filters':
    'No report matches these filters',
  'u.no-run-matches-these-filters':
    'No run matches these filters',
  'u.no-settled-analysis-in-this-window':
    'No settled analysis in this window',
  'u.no-threat-is-linked-this-module-was':
    'No threat is linked. This module was not produced by a loop run.',
  'u.no-training-is-waiting-on-you':
    'No training is waiting on you',
  'u.no-training-module-exists-yet':
    'No training module exists yet',
  'u.not-from-a-threat':
    'Not from a threat',
  'u.not-yet':
    'Not yet',
  'u.nothing-is-waiting-for-a-decision':
    'Nothing is waiting for a decision',
  'u.open-a-risk':
    'Open a risk',
  'u.open-departments':
    'Open departments',
  'u.open-the-policy':
    'Open the policy',
  'u.open-the-run-list':
    'Open the run list',
  'u.open-the-sandbox':
    'Open the sandbox',
  'u.open-threat-intake-2':
    'Open Threat Intake',
  'u.plain-language-explanation':
    'Plain-language explanation',
  'u.policy-library':
    'Policy library',
  'u.prepare-the-request':
    'Prepare the request',
  'u.prepare-the-reset-request':
    'Prepare the reset request',
  'u.push-into-stage-1':
    'Push into stage 1',
  'u.push-into-the-loop':
    'Push into the loop',
  'u.read-the-full-stage':
    'Read the full stage',
  'u.real-analyzed-threat':
    'Real analyzed threat',
  'u.report-something-suspicious':
    'Report something suspicious',
  'u.reporter-s-note':
    'Reporter’s note:',
  'u.reports-submitted':
    'Reports submitted',
  'u.required-action':
    'Required action',
  'u.required-training':
    'Required training',
  'u.review-state':
    'Review state',
  'u.revision-requested':
    'Revision requested.',
  'u.risk-score':
    'Risk score',
  'u.role-sensitivity':
    'Role sensitivity',
  'u.save-changes':
    'Save changes',
  'u.see-all-open':
    'See all open',
  'u.see-every-change-in-the-audit-log':
    'See every change in the audit log',
  'u.see-what-is-waiting-at-the-approval':
    'See what is waiting at the approval gate',
  'u.shown-after-grading':
    'Shown after grading:',
  'u.still-open':
    'Still open',
  'u.submit-an-artifact-in-threat-intake':
    'Submit an artifact in Threat Intake',
  'u.submit-and-start-the-loop':
    'Submit and start the loop',
  'u.submit-artifact':
    'Submit artifact',
  'u.suggested-remediation':
    'Suggested remediation',
  'u.the-curated-feed-is-empty':
    'The curated feed is empty',
  'u.the-dashboard-returned-nothing':
    'The dashboard returned nothing',
  'u.the-finding-counts-are-unavailable':
    'The finding counts are unavailable',
  'u.the-server-would-reject-this-module':
    'The server would reject this module',
  'u.this-campaign-has-no-targets':
    'This campaign has no targets',
  'u.this-finding-could-not-be-loaded':
    'This finding could not be loaded',
  'u.this-finding-is-closed-reopen-it-before':
    'This finding is closed. Reopen it before assigning training.',
  'u.this-page-does-not-exist':
    'This page does not exist',
  'u.this-run-could-not-be-loaded':
    'This run could not be loaded',
  'u.this-run-has-already-left-the-gate':
    'This run has already left the gate.',
  'u.threat-intake':
    'Threat intake',
  'u.threat-type':
    'Threat type',
  'u.training-and-simulations':
    'Training and simulations',
  'u.training-studio':
    'Training Studio',
  'u.verify-and-add':
    'Verify and add',
  'u.work-the-queue':
    'Work the queue',
  'u.go-back':
    'Go back',
  'u.sign-in-with-a-phone-number-instead':
    'Sign in with a phone number instead',
  'u.sign-in-with-email-instead':
    'Sign in with email instead',
  'u.or':
    'OR',
  'u.an-action-matches-exactly-or-as':
    'An action matches exactly or as a dotted prefix, so',
  'u.api-origin':
    'API origin',
  'u.behaviour-trend-description':
    'Phishing click rate and threat report rate per day. Days without resolved simulation outcomes are omitted rather than interpolated.',
  'u.behaviour-trend-empty':
    'Simulation outcomes are needed on at least two days before a behaviour trend can be drawn.',
  'u.completion-trend-description':
    'Share of assigned training completed, per day. Days with no assignments due are omitted.',
  'u.completion-trend-empty':
    'Fewer than two days in this window had assignments due.',
  'u.configured':
    'configured',
  'u.department-heatmap-description':
    'Average risk score per department, with headcount and the number of high-risk people in each.',
  'u.department-heatmap-empty':
    'No department has a scored population yet.',
  'u.finds-every-verb-beneath-it':
    'finds every verb beneath it. Actor is a case-insensitive substring of the email.',
  'u.loop-outcome-empty':
    'No loop has been started in this window.',
  'u.open-closed-loops-for-the-full':
    'Open Closed Loops for the full picture.',
  'u.risk-movement-empty':
    'No department has two scored points to compare in this window.',
  'u.risk-trend-empty':
    'Behaviour risk has been measured on fewer than two days in this window.',
  'u.runs-are-waiting-for-a-human':
    '{count} {noun} waiting for a human decision.',
  'u.same-origin-as-this-page':
    'same origin as this page',
  'u.saving-moves-this-connection-to':
    'Saving moves this connection to',
  'u.severity-bar-empty':
    'No findings have been raised in this view.',
  'u.waiting-for-you':
    'Waiting for you',
  'u.which-is-a-statement-about-these':
    ', which is a statement about these settings only. A connection is reported as connected when a sync reaches the provider and it answers, never because a form was submitted.',
  'u.yara-rules':
    'YARA rules',
  'u.assigned-modules':
    'assigned modules',
  'u.attributed-risk-events':
    'attributed risk events',
  'u.completions-that-recorded-a-duration':
    'completions that recorded a duration',
  'u.counted-by-the-platform-api-over-its':
    'Counted by the platform API over its own records',
  'u.counted-from-the-subject-rows-on-this':
    'Counted from the subject rows on this risk',
  'u.current-score-role-baseline-over-every-person':
    'Σ(current score − role baseline), over every person on the roster.',
  'u.delivered-simulations':
    'delivered simulations',
  'u.departments-with-a-current-roll-up':
    'departments with a current roll-up',
  'u.findings-on-record':
    'findings on record',
  'u.graded-quizzes':
    'graded quizzes',
  'u.incident-risks':
    'Incident risks',
  'u.incident-risks-on-record':
    'incident risks on record',
  'u.measurement-summary-stored-on-the-run':
    'Measurement summary stored on the run',
  'u.no-assignment-on-this-run-has-been':
    'No assignment on this run has been completed with a score.',
  'u.no-completion-on-this-run-recorded-how':
    'No completion on this run recorded how long it took.',
  'u.no-department-reported-a-headcount':
    'no department reported a headcount',
  'u.no-department-reported-a-high-risk-count':
    'no department reported a high-risk count',
  'u.no-employee-currently-carries-a-score':
    'no employee currently carries a score',
  'u.no-employee-has-a-score-yet':
    'no employee has a score yet',
  'u.no-employee-has-a-scored-risk-profile':
    'No employee has a scored risk profile yet',
  'u.no-endpoint-aggregates-quiz-scores-into-a':
    'no endpoint aggregates quiz scores into a pass rate',
  'u.no-endpoint-reports-the-interval-between-delivery':
    'no endpoint reports the interval between delivery and report',
  'u.no-subject-has-recorded-a-score-yet':
    'No subject has recorded a score yet.',
  'u.nobody-is-attached-to-this-risk-yet':
    'Nobody is attached to this risk yet.',
  'u.nothing-was-assigned-on-this-run-so':
    'Nothing was assigned on this run, so there is no rate to compute.',
  'u.people-in-a-scored-department':
    'people in a scored department',
  'u.people-on-a-scored-roster':
    'people on a scored roster',
  'u.platform-analyzer-output-on-the-threat-record':
    'Platform analyzer output on the threat record',
  'u.platform-api':
    'Platform API',
  'u.policy-intelligence':
    'Policy intelligence',
  'u.quiz-scores-recorded-against-this-incident':
    'Quiz scores recorded against this incident\'s assignments',
  'u.recorded-risk-events':
    'recorded risk events',
  'u.resolved-simulation-outcomes':
    'resolved simulation outcomes',
  'u.resolved-targets':
    'resolved targets',
  'u.risk-engine':
    'risk engine',
  'u.risk-engine-behaviour-only':
    'Risk engine — behaviour only',
  'u.risk-engine-roll-ups-and-the-daily':
    'Risk engine roll-ups and the daily metric snapshot',
  'u.risk-engine-selection-stored-on-the-run':
    'Risk engine selection stored on the run',
  'u.scored-assignments':
    'scored assignments',
  'u.scored-employees':
    'scored employees',
  'u.scored-people':
    'scored people',
  'u.scored-subject':
    'scored subject',
  'u.the-dashboard-did-not-report-a-count':
    'the dashboard did not report a count',
  'u.the-findings-list-could-not-be-read':
    'the findings list could not be read',
  'u.the-roster-is-empty':
    'the roster is empty',
  'u.the-run-by-run-breakdown-is-held':
    'The run-by-run breakdown is held by the security team',
  'u.the-threat-list-is-held-by-the':
    'The threat list is held by the security team',
  'u.there-is-nothing-here':
    'there is nothing here',
  'u.threat-record-2':
    'Threat record',
  'u.timed-reports':
    'timed reports',
  'u.training-assignment-records':
    'Training assignment records',
  'u.training-module-record':
    'Training module record',
  'cc.and-n-more':
    'and {count} more',
  'cc.counts-current':
    'Counts are current as of the last refresh.',
  'cc.open-integrations':
    'Open integrations',
  'cc.open-loops':
    'Open closed loops',
  'cc.open-sandbox':
    'Open the sandbox',
  'cc.rates-window':
    'Rates cover a trailing {days} days and are withheld below {min} resolved events.',
  'cc.warn-analyzers-detail':
    'Not running: {list}. Signals those analyzers would raise cannot appear in a verdict.',
  'cc.warn-analyzers-title':
    '{count} static {noun} unavailable',
  'cc.warn-dynamic-detail':
    'Analysis runs static analyzers only. Behaviour that appears solely at runtime will not be observed, and verdicts say so.',
  'cc.warn-dynamic-title':
    'Dynamic detonation is not available',
  'cc.warn-integrations-degraded-title':
    '{count} {noun} degraded',
  'cc.warn-integrations-error-title':
    '{count} {noun} in error',
  'cc.warn-no-model-detail':
    'Conversion writes training from a fixed template. Anything generated here is labelled Template, never AI generated.',
  'cc.warn-no-model-title':
    'No language model is connected',
  'cc.warn-runs-failed-detail':
    '{list} stopped before closing the loop.',
  'cc.warn-runs-failed-title':
    '{count} loop {noun} failed',
  'cc.warn-yara-detail':
    'The rule set compiled to zero rules, so no YARA signal can fire.',
  'cc.warn-yara-title':
    'No YARA rules are loaded',
  'u.demo-dataset':
    'Demo dataset',
  'u.external-feed':
    'External feed',
  'u.live-api':
    'Live API',
  'u.no-role':
    'No role',
  'u.no-role-assigned':
    'No role assigned',
  'u.people-trained':
    '{count} people trained',
  'u.person-trained':
    '{count} person trained',
  'u.role-analyst':
    'Security analyst',
  'u.role-employee':
    'Employee',
  'u.role-executive':
    'Executive',
  'u.sandbox-full':
    'Sandbox: full',
  'u.sandbox-static-only':
    'Sandbox: static only',
  'u.updated-prefix':
    'Updated',
  'u.closed-loops-counted-by-server':
    'closed loops counted by the server',
  'u.def-assignments-before-window':
    'Assignments made before the window, even if completed inside it',
  'u.def-employees-named-by-finding':
    'Employees a finding lists by name',
  'u.def-employees-who-left':
    'Employees who have left',
  'u.def-events-excluded-baseline':
    'Every recorded event — this is the starting point only',
  'u.def-every-applied-event':
    'Every non-revoked event the engine has applied',
  'u.def-every-assignment-in-window':
    'Every assignment created in the window, whatever created it',
  'u.def-every-incident-risk':
    'Every incident risk the platform holds, whatever its age',
  'u.def-everyone-endpoint-returns':
    'Everyone the employees endpoint returns',
  'u.def-no-trailing-window-score':
    'Any trailing window — this is the score as it stands now',
  'u.def-no-window-on-figure':
    'Nothing — there is no trailing window on this figure',
  'u.def-open-statuses':
    'Statuses open, in review, remediation planned and training assigned',
  'u.def-people-via-department':
    'People covered only because their department was named',
  'u.def-platform-does-not-compute':
    'Everything — the platform does not currently compute this',
  'u.def-real-threats-excluded':
    'Real threats — these are simulations only',
  'u.def-reports-genuine-threats':
    'Reports of genuine threats, which have no delivered denominator',
  'u.def-reports-human-sensor-sim':
    'Reports made through the human-sensor path against a simulated lure',
  'u.def-resolved-accepted-fp':
    'Resolved, accepted risk and false positive',
  'u.def-role-baselines-excluded':
    'The role baselines themselves',
  'u.def-role-sensitivity':
    'Every person’s recorded role sensitivity',
  'u.def-runs-awaiting':
    'Runs still awaiting approval, training or measurement',
  'u.def-runs-closed-benign':
    'Runs that closed at conversion because the artifact came back benign',
  'u.def-runs-trained-scored':
    'Runs where training was assigned, taken, and scored',
  'u.def-sim-clicks-reports-incidents':
    'Simulation clicks and reports, real-threat reports, incident findings',
  'u.def-subjects-accepted':
    'Subjects a reviewer marked accepted',
  'u.def-subjects-completed-unreviewed':
    'Subjects who completed but have not been reviewed',
  'u.def-subjects-rejected':
    'Subjects a reviewer rejected',
  'u.def-targets-clicked-reported-ignored':
    'Targets that clicked, reported, or ignored a delivered lure',
  'u.def-targets-pending':
    'Targets still pending an outcome',
  'u.def-training-completion-moves-credit':
    'Training completion and quiz scores — those move training credit, not this',
  'u.def-whole-register':
    'Any trailing window — this is the whole register',
  'u.def-whole-roster':
    'Nothing — this is the whole roster, not a trailing window',
  'u.loop-runs-on-record':
    'loop runs on record',
  'u.open-findings-naming-neither':
    '{count} open {noun} naming neither a person nor a department',
  'u.active-and-recent-runs':
    'Active and recent runs',
  'u.converted-from':
    'Converted from',
  'u.flow-at-the-gate':
    '{count} at the approval gate',
  'u.flow-closed':
    '{count} {noun} closed the loop.',
  'u.flow-failed':
    'Failed: {list}.',
  'u.flow-in-stage':
    '{count} in {stage}',
  'u.flow-none':
    'No runs are in the loop right now.',
  'u.flow-processing':
    'Processing: {list}.',
  'u.flow-waiting':
    'Waiting: {list}.',
  'u.further-providers-not-configured':
    '{count} further {noun} not configured in this deployment',
  'u.gate-aria':
    'Approval gate between stage 3 and stage 4. {waiting} waiting for a human decision. {wait}. {approved} released.',
  'u.manage':
    'Manage',
  'u.standing-not-movement':
    'Standing, not movement — the dashboard reports a current average per department and no per-department history to difference it against.',
  'u.action':
    'Action',
  'u.active':
    'Active',
  'u.actor':
    'Actor',
  'u.added':
    'Added',
  'u.after':
    'After',
  'u.all-departments':
    'All departments',
  'u.all-submissions':
    'All submissions',
  'u.analysed':
    'Analysed',
  'u.analyst-submission':
    'Analyst submission',
  'u.analyzer':
    'Analyzer',
  'u.any-artifact-type':
    'Any artifact type',
  'u.any-department':
    'Any department',
  'u.any-due-date':
    'Any due date',
  'u.any-policy':
    'Any policy',
  'u.any-risk-band':
    'Any risk band',
  'u.any-severity':
    'Any severity',
  'u.any-source':
    'Any source',
  'u.any-suspicion-level':
    'Any suspicion level',
  'u.any-verdict':
    'Any verdict',
  'u.approved':
    'Approved',
  'u.approver':
    'Approver',
  'u.assessment':
    'Assessment',
  'u.awaiting-approval-2':
    'Awaiting approval',
  'u.awaiting-password':
    'Awaiting password',
  'u.awaiting-training':
    'Awaiting training',
  'u.awaiting-triage':
    'Awaiting triage',
  'u.before':
    'Before',
  'u.benign':
    'Benign',
  'u.category':
    'Category',
  'u.changed':
    'Changed',
  'u.channel':
    'Channel',
  'u.chat':
    'Chat',
  'u.chat-message':
    'Chat message',
  'u.clean':
    'Clean',
  'u.clicked':
    'Clicked',
  'u.close':
    'Close',
  'u.completed':
    'Completed',
  'u.completion':
    'Completion',
  'u.counted':
    'Counted',
  'u.created':
    'Created',
  'u.critical':
    'Critical',
  'u.curated-feed':
    'Curated feed',
  'u.deadline':
    'Deadline',
  'u.decision':
    'Decision',
  'u.department':
    'Department',
  'u.departments-in-the-organisation':
    'departments in the organisation',
  'u.description':
    'Description',
  'u.dismiss':
    'Dismiss',
  'u.dismissed':
    'Dismissed',
  'u.draft':
    'Draft',
  'u.due-within-30-days':
    'Due within 30 days',
  'u.due-within-7-days':
    'Due within 7 days',
  'u.elevated':
    'Elevated',
  'u.elevated-40-59':
    'Elevated (40–59)',
  'u.email':
    'Email',
  'u.environment':
    'Environment',
  'u.every-channel':
    'Every channel',
  'u.every-report':
    'Every report',
  'u.excluded':
    'Excluded',
  'u.failed':
    'Failed',
  'u.family':
    'Family',
  'u.file':
    'File',
  'u.findings-detected-in-the-window':
    'findings detected in the window',
  'u.help':
    'Help',
  'u.high':
    'High',
  'u.high-risk-60-100':
    'High risk (60–100)',
  'u.high-suspicion':
    'High suspicion',
  'u.human-sensor':
    'Human sensor',
  'u.incident-risks-raised-in-the-window':
    'incident risks raised in the window',
  'u.judgement':
    'Judgement',
  'u.label':
    'Label',
  'u.longest-wait-first':
    'Longest wait first',
  'u.loop-runs-closed-in-the-window':
    'loop runs closed in the window',
  'u.low-risk':
    'Low risk',
  'u.low-risk-0-39':
    'Low risk (0–39)',
  'u.low-suspicion':
    'Low suspicion',
  'u.malicious':
    'Malicious',
  'u.medium':
    'Medium',
  'u.medium-suspicion':
    'Medium suspicion',
  'u.monitoring':
    'Monitoring',
  'u.navigation':
    'Navigation',
  'u.newest-first':
    'Newest first',
  'u.no-verdict-recorded':
    'No verdict recorded',
  'u.not-applicable':
    'Not applicable',
  'u.note':
    'Note',
  'u.opened':
    'Opened',
  'u.optional':
    'Optional.',
  'u.order':
    'Order',
  'u.overdue':
    'Overdue',
  'u.owner':
    'Owner',
  'u.password':
    'Password',
  'u.pending':
    'Pending',
  'u.pending-review':
    'Pending review',
  'u.plans':
    'Plans',
  'u.platform':
    'Platform',
  'u.points':
    'Points',
  'u.policy':
    'Policy',
  'u.primary':
    'Primary',
  'u.product':
    'Product',
  'u.provenance':
    'Provenance',
  'u.pushed-into-the-loop':
    'Pushed into the loop',
  'u.qr-code':
    'QR code',
  'u.questions':
    'Questions',
  'u.queued':
    'Queued',
  'u.reach':
    'Reach',
  'u.reason':
    'Reason',
  'u.recommended':
    'Recommended',
  'u.reference':
    'Reference',
  'u.rejected':
    'Rejected',
  'u.relevant':
    'Relevant',
  'u.removed':
    'Removed',
  'u.reported':
    'Reported',
  'u.reporter':
    'Reporter',
  'u.requested':
    'Requested',
  'u.resolved':
    'Resolved',
  'u.running':
    'Running',
  'u.score-of-40-to-59':
    'Score of 40 to 59',
  'u.score-of-60-or-more':
    'Score of 60 or more',
  'u.score-under-40':
    'Score under 40',
  'u.search':
    'Search',
  'u.sender':
    'Sender',
  'u.severity':
    'Severity',
  'u.size':
    'Size',
  'u.sms-phone':
    'SMS / phone',
  'u.something-unexpected-stopped-the-request-before-it':
    'Something unexpected stopped the request before it reached the platform. Reload the page and try again.',
  'u.source':
    'Source',
  'u.stage':
    'Stage',
  'u.standing':
    'Standing',
  'u.started':
    'Started',
  'u.status':
    'Status',
  'u.subject':
    'Subject',
  'u.subjects':
    'Subjects',
  'u.submitted':
    'Submitted',
  'u.suspicious':
    'Suspicious',
  'u.takeaway':
    'Takeaway',
  'u.targeted':
    'Targeted',
  'u.technology':
    'Technology',
  'u.template':
    'Template',
  'u.the-platform-did-not-recognise-that-combination':
    'The platform did not recognise that combination. Passwords are case sensitive, and accounts are issued by the security team rather than self-registered.',
  'u.the-service-may-still-be-starting-or':
    'The service may still be starting, or the connection dropped. Your credentials were not sent anywhere else — try again in a moment.',
  'u.title':
    'Title',
  'u.took':
    'Took',
  'u.type':
    'Type',
  'u.urgent':
    'Urgent',
  'u.value':
    'Value',
  'u.verdict':
    'Verdict',
  'u.waiting':
    'Waiting',
  'u.we-assessed-it-and-it-does-not':
    'We assessed it and it does not touch us. A reason is required.',
  'u.accept-2':
    'Accept',
  'u.advisory-dismissed-2':
    'Advisory dismissed',
  'u.affected-department-2':
    'Affected department',
  'u.all-stages-2':
    'All stages',
  'u.any-department-2':
    'Any department',
  'u.approved-by-2':
    'Approved by',
  'u.artifact-type-2':
    'Artifact type',
  'u.awaiting-2':
    'Awaiting',
  'u.behaviour-risk-2':
    'Behaviour risk',
  'u.campaign-closed-2':
    'Campaign closed',
  'u.campaign-launched-2':
    'Campaign launched',
  'u.channel-2':
    'Channel',
  'u.click-rate-3':
    'Click rate',
  'u.completed-2':
    'Completed',
  'u.completion-rate-2':
    'Completion rate',
  'u.composite-score-2':
    'Composite score',
  'u.configuration-stored-2':
    'Configuration stored',
  'u.domains-2':
    'Domains',
  'u.elevated-2':
    'Elevated',
  'u.estimated-time-2':
    'Estimated time',
  'u.every-action-2':
    'Every action',
  'u.every-object-type-2':
    'Every object type',
  'u.failed-2':
    'Failed',
  'u.feedback-recorded-2':
    'Feedback recorded',
  'u.findings-2':
    'Findings',
  'u.hashes-2':
    'Hashes',
  'u.high-risk-3':
    'High risk',
  'u.launch-failed-2':
    'Launch failed',
  'u.low-risk-2':
    'Low risk',
  'u.module-not-saved-2':
    'Module not saved',
  'u.module-saved-2':
    'Module saved',
  'u.no-material-change-2':
    'No material change',
  'u.no-single-department-2':
    'No single department',
  'u.nobody-was-assigned-2':
    'Nobody was assigned',
  'u.open-closed-loops-2':
    'Open Closed Loops',
  'u.open-departments-3':
    'Open Departments',
  'u.open-findings-3':
    'Open Findings',
  'u.outcome-not-recorded-2':
    'Outcome not recorded',
  'u.quiz-questions-2':
    'Quiz questions',
  'u.reject-2':
    'Reject',
  'u.reject-this-content-2':
    'Reject this content',
  'u.report-dismissed-2':
    'Report dismissed',
  'u.report-rate-3':
    'Report rate',
  'u.reported-by-3':
    'Reported by',
  'u.reset-failed-2':
    'Reset failed',
  'u.risk-fell-2':
    'Risk fell',
  'u.risk-rose-2':
    'Risk rose',
  'u.sections-2':
    'Sections',
  'u.sender-patterns-2':
    'Sender patterns',
  'u.sent-to-a-person-2':
    'Sent to a person',
  'u.severity-at-intake-2':
    'Severity at intake',
  'u.since-your-last-recorded-change-2':
    'since your last recorded change',
  'u.source-2':
    'Source',
  'u.status-2':
    'Status',
  'u.submitted-2':
    'Submitted',
  'u.sync-completed-2':
    'Sync completed',
  'u.sync-refused-2':
    'Sync refused',
  'u.that-did-not-send-2':
    'That did not send',
  'u.your-training-module-2':
    'Your training module',
  'u.yours-2':
    'Yours',
  'u.it-applies-to-this-organisation-and':
    'It applies to this organisation and belongs in the queue.',
  'u.it-could-apply-watch-it':
    'It could apply. Watch it; do not act yet.',
  'u.it-reaches-something-we-run':
    'It reaches something we run and it needs action now.',
  'u.hide-password':
    'Hide password',
  'u.show-password':
    'Show password',

  // --- the public landing (`/`) --------------------------------------------
  'l.cta.body':
    'The demonstration build carries a seeded organisation and a loop already waiting at its approval gate, so the whole cycle can be walked in a few minutes.',
  'l.cta.note':
    'No card, no trial timer. Accounts are issued by the security team.',
  'l.cta.title':
    'See it running against a real threat.',
  'l.faq.ai.a':
    'The training text, and nothing else. The verdict and the score come from the engine\'s own analyzers and its weighted model — they do not change whether a language model is configured or not. Generated modules are held at a human approval gate, carry the name of the engine that wrote them, and can be edited before anyone receives them.',
  'l.faq.ai.q':
    'How much of this is a language model?',
  'l.faq.data.a':
    'It stays in the deployment you run. Outbound calls in the analysis path pass through a single sovereignty checkpoint that can be closed, and every refusal it makes is counted and reported. The one deliberate exception is fetching a URL an analyst submitted, because submitting a URL for analysis is a request to fetch it — and that too can be switched off for an air-gapped install.',
  'l.faq.data.q':
    'Where does our data go?',
  'l.faq.eyebrow':
    'Questions',
  'l.faq.gaps.a':
    'Roster import and outbound mail. There is no write path for employees and no mail transport, so a pilot today is loaded and driven by an analyst rather than by an HR feed and a mail gateway. Both are named in the roadmap in the public repository, with the sequence and the effort. A page that implied otherwise would be contradicted by the first file a technical reader opens.',
  'l.faq.gaps.q':
    'What is not built yet?',
  'l.faq.intro':
    'Including the ones about what is not built yet.',
  'l.faq.malware.a':
    'No. The web service parses samples and never executes them; a test forbids the code paths that could. Dynamic detonation runs on a separate, disposable machine the operator controls, and posts its findings back over an authenticated seam. With no such machine attached, reports say the sample was not detonated.',
  'l.faq.malware.q':
    'Do you run malware on the server?',
  'l.faq.start.a':
    'Request an account and we will set up a single-tenant instance with your own threats in it. There is no self-service signup: accounts are issued by the security team, which is the same reason the sign-in screen has no registration form.',
  'l.faq.start.q':
    'How do we start?',
  'l.faq.title':
    'The things a security team asks first.',
  'l.faq.what.a':
    'A closed-loop security awareness platform. It analyses a real threat that reached your organisation, converts the verdict into a short training module, assigns it to the employees most at risk, measures what changes, and feeds the result back into the risk model. The analysis engine behind it is also sold on its own as Cyclowareness Sandbox.',
  'l.faq.what.q':
    'What is Cyclowareness?',
  'l.footer.line':
    'Closed-loop human cyber risk. Real threats become targeted training, and the result is measured.',
  'l.hero.eyebrow':
    'Closed-loop security awareness',
  'l.hero.figure.analyzers':
    'static analyzers, dispatched by content',
  'l.hero.figure.rules':
    'YARA rules shipped with the engine',
  'l.hero.figure.stages':
    'stages in the loop, each one persisted',
  'l.hero.lead':
    'A threat that actually reached your people is analysed, turned into a short module for the specific employees most at risk, and the change in their behaviour is fed back into the model. Not a template course anyone can ignore once a year.',
  'l.hero.note':
    'Accounts are issued by the security team.',
  'l.hero.secondary':
    'See how the loop turns',
  'l.hero.title':
    'Real attacks. Targeted training. Behaviour you can measure.',
  'l.honesty.audit':
    'Numbers can be walked back',
  'l.honesty.audit.body':
    'Each score movement is a stored event with a weight, a written reason and a timestamp, and the person it concerns can contest it.',
  'l.honesty.execute':
    'Nothing hostile runs on the web tier',
  'l.honesty.execute.body':
    'The service parses samples and never executes them. Detonation belongs to a disposable machine the operator controls, and the boundary is enforced by a test, not by a policy document.',
  'l.honesty.eyebrow':
    'What it will not do',
  'l.honesty.gate':
    'A model does not speak to staff',
  'l.honesty.gate.body':
    'Generated training is held at an approval gate until an analyst has read it. The gate is what makes the loop stop, and that is the intended cost.',
  'l.honesty.intro':
    'Anyone can build a dashboard that always has a number. These are the places this one declines to produce one, and each exists because the opposite behaviour shipped once and was caught.',
  'l.honesty.provenance':
    'Provenance is recorded, not inferred',
  'l.honesty.provenance.body':
    'Every module names the engine that wrote it. A fallback to the offline generator is recorded as such rather than passed off as model output.',
  'l.honesty.sample':
    'Being targeted is not a mark against you',
  'l.honesty.sample.body':
    'A threat reaching an employee is recorded but scores zero. Weighting it let an outsider raise somebody else\'s risk by mailing them — so it measures what the person did, not what was done to them.',
  'l.honesty.tiers':
    'A blind spot is stated',
  'l.honesty.tiers.body':
    'Every report names the analysis tiers that ran. A verdict computed without dynamic analysis says so, instead of being presented as a behavioural finding.',
  'l.honesty.title':
    'The refusals are the product.',
  'l.loop.eyebrow':
    'The loop',
  'l.loop.footnote':
    'Every pass is a persisted record with its stage history, so a run that stalled is inspectable rather than merely missing.',
  'l.loop.gate.body':
    'Between Convert and Target an analyst reviews — and may edit — every generated module. Nothing written by a model reaches an employee unread.',
  'l.loop.gate.eyebrow':
    'Human gate',
  'l.loop.intro':
    'Most awareness tools stop at delivery. This one records what happened afterwards and changes who gets trained next — which is the only thing that makes a programme different in month six than it was in month one.',
  'l.loop.stage.analyze':
    'Analyze',
  'l.loop.stage.analyze.detail':
    'The sandbox engine identifies it by content, scores it, and extracts indicators.',
  'l.loop.stage.convert':
    'Convert',
  'l.loop.stage.convert.detail':
    'The verdict becomes a short module: a lesson, a three-to-five question quiz, one takeaway.',
  'l.loop.stage.feedback':
    'Feedback',
  'l.loop.stage.feedback.detail':
    'Every result updates the score, which changes who the next threat targets.',
  'l.loop.stage.ingest':
    'Ingest',
  'l.loop.stage.ingest.detail':
    'A threat arrives — reported by an employee, pulled from a feed, or submitted by an analyst.',
  'l.loop.stage.measure':
    'Measure',
  'l.loop.stage.measure.detail':
    'Completion, comprehension and later behaviour are recorded as individual events.',
  'l.loop.stage.target':
    'Target',
  'l.loop.stage.target.detail':
    'The risk engine selects who receives it, and states in writing why each person was chosen.',
  'l.loop.stage.train':
    'Train',
  'l.loop.stage.train.detail':
    'The module is assigned. The employee sees the threat that caused it, not a generic topic.',
  'l.loop.title':
    'Seven stages, and the whole point is the seventh.',
  'l.nav.open-portal':
    'Open the portal',
  'l.nav.sign-in':
    'Sign in',
  'l.risk.baseline.body':
    'The baseline is role sensitivity, not behaviour: how much damage this seat could do if it were used against the organisation. Everything above and below it is something the person actually did.',
  'l.risk.baseline.title':
    'Where a score starts',
  'l.risk.col.delta':
    'Change',
  'l.risk.col.signal':
    'Signal',
  'l.risk.eyebrow':
    'The risk model',
  'l.risk.footnote':
    'Baseline plus the sum of every non-revoked event equals the score on screen. If it does not, that is a defect, and a test says so.',
  'l.risk.intro':
    'A human-risk score a vendor will not show the arithmetic for is one an employee cannot contest and a buyer cannot audit. This is the table the engine actually uses.',
  'l.risk.split.body':
    'Behaviour risk moves only on what someone did when a threat reached them. Training credit moves on engagement with the programme. Efficacy is reported from behaviour alone — otherwise assigning more training would lower the score and the product would report its own activity as improvement.',
  'l.risk.split.title':
    'Two numbers, not one',
  'l.risk.table-caption':
    'Score change applied by each recorded signal',
  'l.risk.title':
    'The whole scoring table, in public.',
  'l.risk.w.click':
    'Clicked a simulated phishing lure',
  'l.risk.w.completed':
    'Completed an assigned module',
  'l.risk.w.comprehension':
    'Quiz comprehension, scaled by the score achieved',
  'l.risk.w.exposure':
    'Was reached by a real threat — recorded, deliberately unweighted',
  'l.risk.w.failed':
    'Completed training but failed the quiz',
  'l.risk.w.ignored':
    'Let assigned training expire',
  'l.risk.w.report-real':
    'Reported a genuinely suspicious artifact',
  'l.risk.w.report-sim':
    'Reported a simulated phish instead of acting on it',
  'l.sandbox.cap.archives':
    'Archives, with bounds',
  'l.sandbox.cap.archives.body':
    'Members are unpacked under expansion, ratio and depth limits, and each becomes its own scored job. An encrypted archive pauses and asks for the password — it is never brute-forced.',
  'l.sandbox.cap.export':
    'Evidence that leaves the building',
  'l.sandbox.cap.export.body':
    'JSON, STIX 2.1 and PDF, each stating which analysis tiers actually ran. With a signing key configured, the report carries an Ed25519 signature a recipient can verify without trusting the deployment.',
  'l.sandbox.cap.identify':
    'Identified by its bytes',
  'l.sandbox.cap.identify.body':
    'An executable renamed invoice.pdf is flagged the moment its content disagrees with its name. The extension is treated as a claim, not a fact.',
  'l.sandbox.cap.score':
    'A score with its arithmetic',
  'l.sandbox.cap.score.body':
    '0.6 × rule + 0.4 × model, banded low to critical. The model is expert-weighted and labelled as such — not presented as a classifier trained on a corpus it never saw.',
  'l.sandbox.cap.static':
    'Parsed, never run',
  'l.sandbox.cap.static.body':
    'PE imports, Office macros, script obfuscation with base64 layers decoded, PDF actions, ELF sections — plus a YARA tier. The web service never executes a sample, and a test forbids the code paths that could.',
  'l.sandbox.cap.url':
    'URLs, behind a guard',
  'l.sandbox.cap.url.body':
    'A submitted URL is fetched server-side behind an SSRF guard that refuses private, loopback and cloud-metadata addresses, and re-checks every redirect.',
  'l.sandbox.eyebrow':
    'The analysis engine',
  'l.sandbox.families':
    'Analyzers dispatched by content type',
  'l.sandbox.footnote':
    'Dynamic detonation runs off-host on an isolated worker. With no worker attached, every report says the sample was not detonated rather than reporting a clean behavioural result nobody observed.',
  'l.sandbox.intro':
    'The same engine runs as a standalone product and as stage two of the loop — the same files, byte for byte, checked by a test that fails when they differ. A verdict reached in one place is reached by the same code in the other.',
  'l.sandbox.title':
    'A verdict you can take apart.',
  'l.skip-to-content':
    'Skip to content',
  'l.hero.scene-alt':
    'A desk and an open laptop standing in a mountain meadow at dawn; the camera moves in until the screen fills the frame.',
  'l.hero.scroll-hint':
    'Scroll',
  'l.loop.shot-alt':
    'The Closed Loops screen: each run with its stage history and current status.',
  'l.risk.shot-alt':
    'The risk profiles screen, where every score is broken down into the events that produced it.',
  'l.sandbox.shot-alt':
    'A completed analysis: the file, its classification, the score and the techniques mapped from it.',
  'l.loop.gate.shot-alt':
    'The approval queue: a generated module held for an analyst to read before anyone receives it.',
  'l.loop.tabs-hint':
    'Pick a stage to see the screen it runs on.',
  'sbx.standalone.body':
    'Opens in a new tab, already signed in as you — no second password. The session carries your own address, so the standalone\'s chain of custody records the person who acted rather than a shared account.',
  'sbx.standalone.cap.audit':
    'Chain of custody',
  'sbx.standalone.cap.engines':
    'Engine matrix',
  'sbx.standalone.cap.retention':
    'Retention policy',
  'sbx.standalone.cap.tuning':
    'Score tuning',
  'sbx.standalone.open':
    'Open the sandbox',
  'sbx.standalone.subtitle':
    'Same engine, byte for byte — plus the operator surfaces this portal does not re-implement.',
  'sbx.standalone.title':
    'The full sandbox deployment',

  // --- the finding->training pipeline, GRC watch and Cyber AI -------------
  'pl.approve-module':
    'Approve module',
  'pl.ask-cyber-ai':
    'Ask Cyber AI',
  'pl.assigned-to':
    'Assigned to',
  'pl.assistant-error':
    'The assistant could not answer',
  'pl.assistant-intro':
    'Ask about the portal\'s screens, who depends on which system, or what prevents an attack.',
  'pl.assistant-thinking':
    'Thinking…',
  'pl.auto-train':
    'Auto-train',
  'pl.awaiting-review':
    'Awaiting review',
  'pl.close-assistant':
    'Close the assistant',
  'pl.cyber-ai':
    'Cyber AI',
  'pl.cyber-ai-tagline':
    'The portal, the inventory, and prevention — grounded answers only.',
  'pl.escalated':
    'Escalated',
  'pl.finding-is-closed':
    'This finding is closed',
  'pl.generated-awaiting-approval':
    'Generated — awaiting approval',
  'pl.grc-watch':
    'GRC watch',
  'pl.grc-watch-subtitle':
    'Intel scanned against the active policy rules in the background. News surfaces here; escalating it stays your decision.',
  'pl.knowledge-base':
    'Knowledge base',
  'pl.last-scan-summary':
    'Last scan {when}: {rules} rules watched against {items} intel items.',
  'pl.no-employees-on-finding':
    'This finding names no employees',
  'pl.no-watch-matches-yet':
    'No watch matches on record yet.',
  'pl.open-threat-intelligence':
    'Open threat intelligence',
  'pl.path-assigned':
    'Assigned',
  'pl.path-generated':
    'Awaiting approval',
  'pl.reading-watch-status':
    'Reading the watch status',
  'pl.reject-module':
    'Reject',
  'pl.rejection-reason':
    'Why is this module being rejected?',
  'pl.scan-now':
    'Scan now',
  'pl.send':
    'Send',
  'pl.skipped':
    'Skipped',
  'pl.suggest-interface':
    'What does the Command Center show?',
  'pl.suggest-inventory':
    'What does the ERP depend on?',
  'pl.suggest-preventive':
    'How do I prevent phishing?',
  'pl.supporting-resources':
    'Supporting resources',
  'pl.template':
    'Template',
  'pl.training-assigned':
    'Training assigned',
  'pl.watch-disabled':
    'The background scan is disabled on this deployment; manual scans still work.',
  'pl.watch-footer':
    'Matches are reviewed and escalated on the intel screen.',
  'pl.watch-has-not-run-yet':
    'The background scan has not run yet. Run one now, or wait for the interval.',

  // --- the guided tour ----------------------------------------------------
  'tour.ai.body':
    'Ask it about any screen, who depends on which system, or what actually prevents an attack. Every answer carries where it came from, and a question it has no grounding for is refused rather than improvised.',
  'tour.ai.title':
    'Cyber AI, in the corner',
  'tour.aria':
    'Guided tour',
  'tour.back':
    'Back',
  'tour.cc.body':
    'One question per screen: what needs a person right now. The tiles are live counts — what waits at the approval gate, what is moving through the loop, what the sandbox cannot do today. Every tile is a link.',
  'tour.cc.title':
    'Start here: the Command Center',
  'tour.end':
    'End the tour',
  'tour.finish':
    'Finish',
  'tour.gate.body':
    'Nothing generated reaches an employee until a named person approves it. The analyst reads exactly what the employee will read, may edit it, and a rejection requires a written reason. This gate is the product\'s central claim, not a setting.',
  'tour.gate.title':
    'The approval gate',
  'tour.grc.body':
    'Your own documents as a rules register — ISO 27001, NIST CSF, NIS2, PCI DSS are here. The watcher matches new advisories against the active rules in the background and surfaces what it finds; escalating a match into a finding stays your decision.',
  'tour.grc.title':
    'Policy and the GRC watch',
  'tour.incident.body':
    'This is the product\'s front door for governance work. A finding binds named people, may carry a deadline, and "Auto-train" turns it into training: an approved module from the catalogue when one fits, or a generated one queued for review when nothing does.',
  'tour.incident.title':
    'Incident risks: the IR team\'s findings',
  'tour.intake.body':
    'Real artifacts, from three doors: an employee reports one, a curated feed carries one, or an analyst submits one here. Everything downstream is built from these — the training is never invented from a template about a threat nobody saw.',
  'tour.intake.title':
    'Intake: where a threat arrives',
  'tour.next':
    'Next',
  'tour.people.body':
    'Behaviour moves the score, attendance does not. Completing training earns credit on a separate axis, so a person cannot lower their risk by clicking through lessons. Where a score was never measured, the screen says so instead of showing a zero.',
  'tour.people.title':
    'People and risk',
  'tour.portal.body':
    'What is assigned to you and why — each item says which real incident or threat put it here. Finish a lesson, answer the questions, and the result feeds back into your own risk picture.',
  'tour.portal.title':
    'Your training',
  'tour.report.body':
    'An email, a link, a text, a chat message or a file. It reaches an analyst; if it turns out to be real it starts a loop that protects everyone else. Reporting is always the right move — including after you clicked.',
  'tour.report.title':
    'Report anything suspicious',
  'tour.sandbox.body':
    'Static analysis runs here; dynamic detonation runs only on an isolated off-host worker, never inside this web application. When detonation is unavailable the verdict says so rather than implying it looked and found nothing.',
  'tour.sandbox.title':
    'Analysis: the sandbox',
  'tour.step-of':
    'Step {n} of {total}',
  'tour.take-the-tour':
    'Take the tour',
  'tour.training.body':
    'Micro-lessons converted from real threats, backed by verified external material — YouTube and Coursera links that something actually fetched and checked. A link that has never been dereferenced is not shown at all.',
  'tour.training.title':
    'Training: modules and real courses',
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
  'nav.sandbox': 'Portal Sandbox',
  'nav.sandbox.hint': 'Portalın içində fayl və ünvanların statik və davranış təhlili',
  'nav.sandbox.app': 'Tam Sandbox',
  'nav.sandbox.app.hint':
    'Tam sandbox quraşdırmasını yeni səhifədə, sizin adınıza açıq şəkildə açır.',
  'nav.sandbox.app.failed': 'Sandbox açıla bilmədi',
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
  'shell.search': 'Axtarış və keçid',
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
  'page.sandbox.title': 'Portal Sandbox',
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

  'page.approvals.lead':
    'Real təhdiddən yaradılan heç nə insan burada təsdiqləməyincə adı çəkilən işçiyə çatmır. Hər sətir çevrilmə ilə hədəfləmə arasında dayandırılmış, qərar gözləyən dövrə axınıdır.',
  'page.audit.lead':
    'Platformanın etdiyi hər əhəmiyyətli dəyişiklik, onu edən şəxs və qeydin hər iki tərəfdəki vəziyyəti. İz API tərəfindən dəyişikliklə eyni tranzaksiyada yazılır və ona sonradan əlavə edə biləcək marşrut yoxdur — oxunmağa dəyər olmasının səbəbi budur.',
  'page.command-center.lead':
    'Dövrənin hazırkı yeri və insan qərarını gözləyənlər.',
  'page.departments.lead':
    'Eyni risk modeli, onu daşıyan komandalara görə ümumiləşdirilib. İşdən çıxmış əməkdaşlar bütün ortalamalardan çıxarılır, ona görə departament getmiş insanlara görə qiymətləndirilmir.',
  'page.employees.lead':
    'Risk mühərrikinin qiymətləndirdiyi hər şəxs, hazırkı balı və qeydə alınmış hərəkəti ilə. Rəqəmin arxasındakı hesablamanı görmək üçün istənilən şəxsi açın.',
  'page.executive.lead':
    'Real təhdidlərin insan davranışını dəyişib-dəyişmədiyi və hələ açıq qalanlar. Hər rəqəm dövrü və gəldiyi seçməni bildirir; ölçülməyən şey sıfır göstərmək əvəzinə bunu açıq deyir.',
  'page.incident-risks.lead':
    'İnsidentə cavabın adı çəkilən şəxslərə yazdığı risk və onu bağlamaq üçün tələb olunan iş. Risk qaralama kimi açılır — təyin olunanadək heç kim məsuliyyət daşımır.',
  'page.integrations.lead':
    'Təlimin çatdırılacağı öyrənmə platformalarına və insanların daxil olacağı kimlik provayderlərinə bağlantılar.',
  'page.loops.lead':
    'Cyclowareness-ə daxil olan hər təhdid və yeddi mərhələnin nə qədərini keçdiyi. Burada heç nə insan qərarı olmadan üçüncü mərhələdən irəli getmir.',
  'page.remediation.lead':
    'Bir şey baş verdikdən sonra adı çəkilən şəxsə nə əlavə olunur — və çox vaxt heç nə əlavə etməmək barədə əsaslandırılmış qərar.',
  'page.reports.lead':
    'Sübut paketləri əməliyyat ekranlarının oxuduğu eyni qeydlərdən qurulur. Aşağıdakı pəncərə bu səhifədəki hər sayı əhatələndirir və hər paket bu quraşdırmanın onu həqiqətən hazırlaya bilib-bilmədiyini bildirir.',
  'page.settings.lead':
    'Bu quraşdırmanın nə olduğu, nə edə bildiyi və bu brauzerin yadda saxladığı iki seçim. Platformanın saxlaya bilmədiyi heç nə burada təklif olunmur — heç nə etməyən açarlardan ibarət tənzimləmə səhifəsi qısa və doğru olandan pisdir.',
  'page.simulations.lead':
    'Hazır tələlərdən və ya sandbox-un artıq təhlil etdiyi real təhdiddən qurulan təhlükəsiz kampaniyalar. Çatdırılma burada şlüzə bağlanmayıb — nəticələr analitik tərəfindən hədəflərə qarşı qeyd olunur və bu səhifədəki hər nisbət bunun neçə nəfər olduğunu bildirir.',
  'page.intel.lead':
    'Xarici bildirişlər, bu təşkilatın işlətdiyi və təsdiqlədiyi ilə müqayisə olunub. Bildiriş bizimkilərdən biri ilə uyğunlaşanda burada diqqətə layiq olur.',
  'page.threats.lead':
    'Dövrənin 1-ci mərhələsi. İşçilər onlara çatanı bildirir, analitiklər seçilmiş axından vacib olanı irəli verir, və burada göndərilən hər şey dərhal bir axın başladır.',
  'page.training.lead':
    'Platformanın hazırladığı hər modul, hər sətrin üzərində necə yazıldığı ilə. Sabit şablondan gələn məzmun heç vaxt AI kimi etiketlənmir — bu fərq həmin ekrana etibar etməyin səbəbidir.',

  'cc.operationalAreas': 'Əməliyyat sahələri',
  'cc.awaitingApproval': 'İnsan təsdiqi gözləyir',
  'cc.closedLoop': 'Qapalı dövrə',
  'cc.degraded': 'Sistem məhdudiyyətləri',
  'cc.attention': 'İndi nəyə diqqət lazımdır',
  'cc.timeline': 'İnsident vaxt xətti',
  'cc.fullAudit': 'Tam audit jurnalı',
  'cc.open.threats': 'Təhdid qəbulunu aç',
  'cc.open.simulations': 'Simulyasiyaları aç',
  'cc.open.incidents': 'İnsident risklərini aç',
  'cc.open.policy': 'Siyasət kəşfiyyatını aç',
  'cc.open.integrations': 'İnteqrasiyaları aç',
  'x.a-campaign-appears-here-once':
    'Kampaniya tələ şablonundan və ya sandbox-ın təhlil etdiyi təhdiddən qurulduqdan sonra burada görünür. Kampaniyalar qaralama kimi başlayır və işə salınmayana qədər heç nə çatdırmır.',
  'x.a-control-not-a-module':
    'nəzarət vasitəsi, modul deyil',
  'x.a-finding-appears-here-when':
    'Kəşfiyyat, siyasətə baxış və ya analitik bu qaydalardan birinə zidd bir məsələ qaldırdıqda tapıntı burada görünür.',
  'x.a-finding-is-owned-dated':
    'Tapıntının sahibi və tarixi olur, üzərində iş aparılır. Bu tapıntı sübut kimi bülleteni saxlayır.',
  'x.a-module-appears-here-when':
    'Dövrə axını çevrilmə mərhələsinə çatıb təhlil edilmiş təhdidi təlimə çevirdikdə modul burada görünür. Yeni dövrə axını başlatmaq üçün Təhdid Qəbuluna bir artefakt yerləşdirin.',
  'x.a-module-lands-here-when':
    'Real təhdid təşkilatınıza çatdıqda, analitik onun əsasında qurulmuş təlimi təsdiqlədikdə və risk mühərriki sizi həmin təhdidin həqiqətən təsir etdiyi şəxs kimi seçdikdə modul buraya düşür.',
  'x.a-policy-appears-here-as':
    'Siyasət burada o zaman görünür ki, onun qaydalarından birinə qarşı tapıntı qaldırılıb və həmin tapıntı hələ həll edilməyib, qəbul edilməyib və ya yanlış müsbət kimi işarələnməyib.',
  'x.a-record-of-what-you':
    'Etdiklərinizin qeydi. Risk balınıza təsir etmir.',
  'x.a-risk-charged-to-named':
    'Adı çəkilən şəxslərin üzərinə yazılan risk. Qaralama kimi başlayır — tələb olunan iş tapşırılmayana qədər heç kimdən heç nə istənilmir.',
  'x.a-risk-with-no-subjects':
    'Subyekti olmayan risk heç kimdən heç nə tələb etmir. İnsidentdə adı çəkilən şəxsləri əlavə edin, sonra tələb olunan işi tapşırın.',
  'x.a-row-appears-here-once':
    'Real artefakt təhlil edilib, təlimə çevrilib və təsdiq qapısından keçdikdən sonra sətir burada görünür. Təhlil edilib heç kimi hədəfə almadan bağlanan axınlar bilərəkdən siyahıya salınmır.',
  'x.a-run-appears-here-the':
    'Təhdid təqdim edildiyi, kurasiya olunmuş lentdən ötürüldüyü və ya işçi hesabatından yüksəldildiyi anda burada dövrə axını görünür. Bundan sonra hər biri yeddi mərhələ üzrə öz qeydini daşıyır.',
  'x.a-simulation-appears-here-once':
    'Simulyasiya işə salındıqdan sonra burada görünür. Qaralama kampaniyalar heç kimə heç nə çatdırmır.',
  'x.a-single-claim-about-the':
    'Siyasət ilə reallıq arasındakı boşluq barədə tək bir iddia — arxasındakı sübutla birlikdə.',
  'x.a-snapshot-is-written-the':
    'Bu siyasətdə qayda ilk dəfə aktivləşdirildikdə və ya əvəz edildikdə anlıq görüntü yazılır. Qaydalarını heç kimin nəzərdən keçirmədiyi sənədin göstərəcəyi tarixçə yoxdur.',
  'x.a-threat-record-is-written':
    'Analitik bir hesabatı dövrəyə göndərdikdə, seçilmiş lent elementini göndərdikdə və ya artefaktı birbaşa təqdim etdikdə təhdid qeydi yazılır.',
  'x.accepting-discharges-this-persons-obligation':
    'Qəbul etmək bu şəxsi öhdəliyindən azad edir. Rədd etmək onu həmin öhdəliyə geri qaytarır.',
  'x.account-request':
    'Hesab sorğusu',
  'x.active-simulations':
    'Aktiv simulyasiyalar',
  'x.add-external-material':
    'Xarici material əlavə et',
  'x.admin-portal':
    'Admin portalı',
  'x.advisory-feed':
    'Xəbərdarlıq lenti',
  'x.all-seven-stages-including-the':
    'Bütün yeddi mərhələ, bu axının heç vaxt çatmadığı mərhələlər də daxil olmaqla.',
  'x.also-assigned-to-you':
    'Sizə də təyin olunanlar',
  'x.an-entry-appears-here-the':
    'Bu risk redaktə edildiyi, tapşırıldığı, nəzərdən keçirildiyi, bağlandığı və ya yenidən açıldığı anda burada qeyd yaranır. Onu açmağın özü artıq bir qeyd yazmış olmalı idi, ona görə də boş xronologiya o deməkdir ki, audit izi cavab verməyib.',
  'x.an-export-becomes-available-once':
    'İxrac sandbox işi başa çatdıqdan sonra əlçatan olur. Hesabat pəncərəsini genişləndirin və ya ixrac yaratmaq üçün sandbox-a fayl yaxud URL təqdim edin.',
  'x.analysis':
    'Təhlil',
  'x.analysis-capability-on-this-host':
    'Bu hostda analiz imkanı',
  'x.analysis-failed':
    'Təhlil uğursuz oldu',
  'x.analysis-in-progress':
    'Təhlil davam edir',
  'x.analysis-tiers':
    'Təhlil səviyyələri',
  'x.analyst-feedback':
    'Analitik rəyi',
  'x.and-whether-the-score-comes':
    'Və balın vəzifədən, yoxsa davranışdan gəldiyini.',
  'x.answer-every-question-then-submit':
    'Bütün sualları cavablandırın, sonra göndərin. Siz göndərməyənə qədər heç nə qiymətləndirilmir.',
  'x.answer-this-dispute':
    'Bu etiraza cavab verin',
  'x.appearance':
    'Görünüş',
  'x.approval-history':
    'Təsdiq tarixçəsi',
  'x.approvals-policy-decisions-integration-chang':
    'Təsdiqlər, siyasət qərarları, inteqrasiya dəyişiklikləri və nümayiş məlumatının sıfırlanması — hamısı baş verdiyi anda burada qeydə alınır.',
  'x.artifacts-in-the-platform':
    'Platformadakı artefaktlar',
  'x.asking-the-platform-what-it':
    'Platformadan nə edə bildiyi soruşulur',
  'x.asking-the-sandbox-what-it':
    'Sandbox-dan nə edə bildiyi soruşulur',
  'x.assess-relevance':
    'Aidiyyəti qiymətləndirin',
  'x.assign-the-required-work':
    'Tələb olunan işi tapşırın',
  'x.assign-training-for-this-finding':
    'Bu tapıntı üçün təlim təyin et',
  'x.assigned-by-incident-response':
    'İnsidentə cavab çərçivəsində təyin edilib',
  'x.assigned-to-you-after-an':
    'Hadisədən sonra sizə təyin edilib',
  'x.attach-people-to-this-risk':
    'Bu riskə şəxslər əlavə edin',
  'x.attaches-an-alreadyapproved-module-to':
    'Artıq təsdiqlənmiş modulu bu tapıntıda adı çəkilən şəxslərə əlavə edir. Burada heç bir dərs məzmunu yaradılmır.',
  'x.attaching-names-somebody-in-the':
    'Əlavə etmək şəxsin adını qeydə yazır. Hələ ondan heç nə istənilmir — bu, tələb olunan iş tapşırılanda baş verir.',
  'x.audit-entries':
    'Audit qeydləri',
  'x.audit-trail':
    'Audit izi',
  'x.available-because-this-deployment-reports':
    'Bu yerləşdirmə demo rejimini bildirdiyi üçün əlçatandır. Bu marşrutlar produksiya versiyasında mövcud deyil.',
  'x.awaiting-triage':
    'Triaj gözlənilir',
  'x.baseline-or-behaviour':
    'Baza, yoxsa davranış',
  'x.baseline-plus-every-recorded-signal':
    'Bazis dəyər üstəgəl qeydə alınmış hər siqnal. Bunu əl ilə yoxlayın.',
  'x.between-0-and-100-lower':
    '0 ilə 100 arasında. Aşağı bal daha təhlükəsizdir. Aşağıdakı hər dəyişiklik baş verdiyi anda risk mühərriki tərəfindən qeydə alınıb.',
  'x.between-conversion-and-targeting-the':
    'Çevirmə ilə hədəfləmə arasında. Heç bir maşının atmadığı yeganə addım.',
  'x.change-the-review-state-or':
    'Mövcud olan modulları görmək üçün baxış vəziyyətini dəyişin və ya axtarışı təmizləyin.',
  'x.change-the-status-of-this':
    'Bu tapıntının statusunu dəyişin',
  'x.choose-a-lure-source-above':
    'Bu kampaniyada dəqiq nəyin saxlanacağını görmək üçün yuxarıdan tələ mənbəyini seçin.',
  'x.close-this-campaign':
    'Bu kampaniyanı bağlayın',
  'x.close-this-incident-risk':
    'Bu insident riskini bağla',
  'x.control-gaps':
    'Nəzarət boşluqları',
  'x.counting-the-records-behind-each':
    'Hər paketin arxasındakı qeydlər sayılır',
  'x.course-imports-and-completion-sync':
    'Kurs idxalı və tamamlanma sinxronizasiyası dayanır. Qoşulma parametrləri və son sinxronizasiya nəticəsi saxlanılır.',
  'x.coverage-gaps':
    'Əhatə boşluqları',
  'x.creates-real-training-assignments-against':
    'Bu riskə bağlanmış şəxslər üçün real təlim tapşırıqları yaradır.',
  'x.curated-intel-feed':
    'Kurasiya olunmuş kəşfiyyat lenti',
  'x.current-risk-score':
    'Cari risk balı',
  'x.decision':
    'Qərar',
  'x.deduplicated-across-every-analyzer-network':
    'Bütün analizatorlar üzrə dublikatlar çıxarılıb. Şəbəkə göstəriciləri zərərsizləşdirilib və klik edilə bilmir.',
  'x.demonstration-controls':
    'Nümayiş idarəetmə elementləri',
  'x.department-context':
    'Şöbə konteksti',
  'x.departments-appear-here-once-they':
    'Şöbələr yalnız tərkibində risk mühərrikinin bal verdiyi ən azı bir işçi olduqdan sonra burada görünür.',
  'x.departments-appear-here-once-they-2':
    'Şöbələr tərkibində işdən ayrılmamış ən azı bir işçi olduqda burada görünür. Təşkilat idxal edin və ya nümayiş təşkilatını yaradın — ümumiləşdirilmiş göstəricilər ardınca gələcək.',
  'x.departments-requiring-attention':
    'Diqqət tələb edən şöbələr',
  'x.derived-from-the-figures-on':
    'Bu səhifədəki rəqəmlərdən sabit qaydalar toplusu ilə əldə edilib. Hər biri qaynaqlandığı ölçmənin adını göstərir.',
  'x.dismiss-this-advisory':
    'Bu xəbərdarlığı bağla',
  'x.dismiss-this-report':
    'Bu bildiriş rədd edilsin?',
  'x.distribution-across-the-organisation':
    'Təşkilat üzrə paylanma',
  'x.each-of-these-was-triggered':
    'Bunların hər biri konkret bir səbəbdən yaranıb və həmin səbəb adı ilə göstərilib.',
  'x.edit-the-generated-content':
    'Yaradılmış məzmunu redaktə edin',
  'x.editing':
    'Redaktə edilir',
  'x.editing-this-module':
    'Bu modul redaktə olunur',
  'x.entries-appear-when-a-person':
    'Bir şəxs dövrə axını üzərində əməliyyat etdikdə — təsdiq, rədd və ya məcburi ölçmə — burada qeyd yaranır. Orkestratorun yerinə yetirdiyi mərhələ keçidləri isə burada deyil, yuxarıdakı zaman xəttində qeydə alınır.',
  'x.every-audited-move-on-this':
    'Bu risk üzrə audit edilmiş hər addım, ən köhnədən başlayaraq',
  'x.every-current-score-on-the':
    'Hər bir cari bal, modelin faktiki istifadə etdiyi şkalada.',
  'x.every-department':
    'Bütün şöbələr',
  'x.every-fact-this-deployment-records':
    'Bu quraşdırmanın artefaktın mənşəyi haqqında qeydə aldığı bütün faktlar.',
  'x.every-loop-run-approval-assignment':
    'Hər dövrə axını, təsdiq, tapşırıq, sandbox işi və audit qeydi silinir, nümayiş təşkilatı isə yenidən qurulur. Bu, geri qaytarıla bilməz.',
  'x.every-place-the-world-has':
    'Dünyanın bu təşkilatın yazıya aldığı qaydadan uzaqlaşdığı hər yer — sübutu, təsirə məruz qalan insanları və görüləcək tədbiri ilə birlikdə.',
  'x.every-point-traced-to-the':
    'Hər bal, onu yaradan mənbəyə qədər izlənilir.',
  'x.every-question-and-why':
    'Hər sual və izahı',
  'x.every-recorded-event':
    'Qeydə alınmış hər hadisə',
  'x.every-report-you-have-sent':
    'Göndərdiyiniz hər bildiriş və onun hansı mərhələyə çatdığı.',
  'x.every-screen-below-is-one':
    'Aşağıdakı hər ekran bu hesabın aça bildiyi ekrandır. Siyahıda olmayanlar burada gizlədilməklə yanaşı, server tərəfindən də məhdudlaşdırılır.',
  'x.every-threat-record-whatever-route':
    'Hansı yolla gəlməsindən asılı olmayaraq bütün təhdid qeydləri.',
  'x.evidence':
    'Sübutlar',
  'x.exactly-what-this-campaign-stored':
    'Bu kampaniyanın saxladığı dəqiq məzmun. O, heç vaxt aktiv keçid kimi göstərilmir.',
  'x.external-material-each-link-checked':
    'Xarici material — hər keçid siyahıya salınmazdan əvvəl provayder üzərindən yoxlanılıb.',
  'x.files-inside-this-archive':
    'Bu arxivin daxilindəki fayllar',
  'x.finding':
    'Tapıntı',
  'x.findings':
    'Tapıntılar',
  'x.findings-appear-here-while-their':
    'Tapıntılar statusu “açıq”, “baxışda”, “korrektiv tədbir planlaşdırılıb” və ya “təlim təyin edilib” olduğu müddətcə burada görünür. Tapıntını həll etmək, qəbul etmək və ya rədd etmək onu siyahıdan çıxarır.',
  'x.findings-by-severity':
    'Ciddilik üzrə tapıntılar',
  'x.findings-by-status':
    'Statusa görə tapıntılar',
  'x.findings-queue':
    'Tapıntılar növbəsi',
  'x.finished-without-a-verdict':
    'Hökm verilmədən tamamlandı',
  'x.for-a-human-decision':
    'insan qərarı üçün',
  'x.generate-synthetic-outcomes':
    'Sintetik nəticələr yaradın',
  'x.generating-content':
    'Məzmun yaradılır',
  'x.highest-current-scores':
    'Ən yüksək cari ballar',
  'x.highestseverity-open-findings':
    'Ən yüksək ciddilikli açıq tapıntılar',
  'x.how-this-score-is-derived':
    'Bu bal necə hesablanır',
  'x.ids-the-server-could-not':
    'Serverin tanıya bilmədiyi ID-lər atılmır, göstərilir.',
  'x.if-it-looks-wrong-send':
    'Səhv görünürsə, göndərin. Bildirmək heç vaxt yanlış qərar deyil.',
  'x.incident-response-raises-a-record':
    'Araşdırma korrektiv tədbir tələb edən şəxs səviyyəsində risk müəyyən etdikdə, insidentə cavab burada qeyd yaradır.',
  'x.incident-risk-assignments':
    'İnsident üzrə risk təyinatları',
  'x.incidentresponse-work-could-not-be':
    'İnsidentə cavab üzrə işlər yüklənə bilmədi',
  'x.indicators':
    'İndikatorlar',
  'x.integration-health':
    'İnteqrasiyaların vəziyyəti',
  'x.issued-by-the-platform-when':
    'Autentifikasiya etdiyiniz zaman platforma tərəfindən verilib.',
  'x.it-leaves-the-queue-its':
    'O, növbədən çıxır. Aidiyyət qiymətləndirməsi isə olduğu kimi qalır.',
  'x.latest-threat-intake':
    'Son təhdid daxilolmaları',
  'x.loading-advisories':
    'Bülletenlər yüklənir',
  'x.loading-approved-training-modules':
    'Təsdiqlənmiş təlim modulları yüklənir',
  'x.loading-campaign':
    'Kampaniya yüklənir',
  'x.loading-control-gaps':
    'Nəzarət boşluqları yüklənir',
  'x.loading-coverage-gaps':
    'Əhatə boşluqları yüklənir',
  'x.loading-department-risk':
    'Şöbə riski yüklənir',
  'x.loading-findings':
    'Tapıntılar yüklənir',
  'x.loading-findings-against-this-policy':
    'Bu siyasət üzrə tapıntılar yüklənir',
  'x.loading-imported-courses':
    'İdxal edilmiş kurslar yüklənir',
  'x.loading-incident-risks':
    'İnsident riskləri yüklənir',
  'x.loading-integrations':
    'İnteqrasiyalar yüklənir',
  'x.loading-loop-runs':
    'Dövrə axınları yüklənir',
  'x.loading-measured-behaviour':
    'Ölçülmüş davranış yüklənir',
  'x.loading-open-findings':
    'Açıq tapıntılar yüklənir',
  'x.loading-policy-exposure':
    'Siyasət üzrə məruz qalma yüklənir',
  'x.loading-policy-finding-counts':
    'Siyasət üzrə tapıntı sayları yüklənir',
  'x.loading-recent-actions':
    'Son əməliyyatlar yüklənir',
  'x.loading-remediation-plans':
    'Korrektiv tədbir planları yüklənir',
  'x.loading-reports':
    'Hesabatlar yüklənir',
  'x.loading-sandbox-analyses':
    'Sandbox təhlilləri yüklənir',
  'x.loading-simulation-campaigns':
    'Simulyasiya kampaniyaları yüklənir',
  'x.loading-simulations':
    'Simulyasiyalar yüklənir',
  'x.loading-submissions':
    'Göndərişlər yüklənir',
  'x.loading-the-advisory':
    'Tövsiyə yüklənir',
  'x.loading-the-analysis-report':
    'Analiz hesabatı yüklənir',
  'x.loading-the-approval-queue':
    'Təsdiq növbəsi yüklənir',
  'x.loading-the-approval-workspace':
    'Təsdiq iş sahəsi yüklənir',
  'x.loading-the-artifact':
    'Artefakt yüklənir',
  'x.loading-the-audit-trail':
    'Audit izi yüklənir',
  'x.loading-the-curated-feed':
    'Seçilmiş lent yüklənir',
  'x.loading-the-finding':
    'Tapıntı yüklənir',
  'x.loading-the-humansensor-queue':
    'İnsan-sensor növbəsi yüklənir',
  'x.loading-the-incident-risk':
    'İnsident riski yüklənir',
  'x.loading-the-loop':
    'Dövrə yüklənir',
  'x.loading-the-loop-run':
    'Dövrə axını yüklənir',
  'x.loading-the-matched-policy':
    'Uyğun gələn siyasət yüklənir',
  'x.loading-the-organisation-posture':
    'Təşkilatın durumu yüklənir',
  'x.loading-the-organisation-trend':
    'Təşkilat üzrə trend yüklənir',
  'x.loading-the-policy':
    'Siyasət yüklənir',
  'x.loading-the-policy-library':
    'Siyasət kitabxanası yüklənir',
  'x.loading-the-roster':
    'Heyət siyahısı yüklənir',
  'x.loading-the-status-breakdown':
    'Status bölgüsü yüklənir',
  'x.loading-this-persons-risk-profile':
    'Bu şəxsin risk profili yüklənir',
  'x.loading-threat-intake':
    'Təhdid qəbulu yüklənir',
  'x.loading-threat-records':
    'Təhdid qeydləri yüklənir',
  'x.loading-training-module':
    'Təlim modulu yüklənir',
  'x.loading-training-modules':
    'Təlim modulları yüklənir',
  'x.loading-your-security-portal':
    'Təhlükəsizlik portalınız yüklənir',
  'x.loading-your-training-module':
    'Təlim modulunuz yüklənir',
  'x.lowest-averages-with-nobody-in':
    'Ən aşağı orta ballar — yüksək risk aralığında heç kim olmadan. Bu, irəliləyiş deyil, mövcud mövqedir.',
  'x.lure':
    'Tələ',
  'x.map-course-to-behaviours':
    'Kursu davranışlarla əlaqələndirin',
  'x.measured-behaviour':
    'Ölçülmüş davranış',
  'x.module':
    'Modul',
  'x.module-record':
    'Modul qeydi',
  'x.modules-appear-here-once-you':
    'Modullar onları tamamladıqdan sonra burada görünür — topladığınız bal və sərf etdiyiniz vaxtla birlikdə.',
  'x.modules-whose-author-was-never':
    'Müəllifi heç vaxt qeyd edilməmiş modullar',
  'x.most-recent-first-each-one':
    'Ən yenilər əvvəldə. Hər biri kimsə hədəfə alınmazdan əvvəl bir şəxs tərəfindən təsdiqlənib.',
  'x.movement-by-department-cannot-be':
    'Şöbələr üzrə hərəkət burada ölçülə bilmir',
  'x.named-here-written-in-the':
    'Adı burada verilir, mətni isə açılan redaktorda yazılır. Başlanğıcda nəzərdən keçirilmə gözləyən statusda olur.',
  'x.new-simulation-campaign':
    'Yeni simulyasiya kampaniyası',
  'x.new-training-module':
    'Yeni təlim modulu',
  'x.newest-first-expand-an-entry':
    'Ən yenilər əvvəldə. Əvvəl və sonra görüntüsünə baxmaq üçün qeydi genişləndirin.',
  'x.newest-first-with-the-delta':
    'Ən yenilər əvvəldə — mühərrikin tətbiq etdiyi delta və buna səbəb olan dövrə axını ilə birlikdə.',
  'x.newest-publication-first-open-one':
    'Ən yeni nəşr əvvəldə. Bizim nəyimizə toxunduğunu görmək üçün birini açın.',
  'x.no-department-movement-to-show':
    'Şöbələr üzrə göstəriləcək dəyişiklik yoxdur',
  'x.no-evidence-rows-were-recorded':
    'Bu tapıntı üçün sübut sətirləri qeydə alınmayıb. Onlar qeydə alınana qədər tapıntını yoxlanılmamış hesab edin.',
  'x.no-evidence-was-recorded-for':
    'Bu risk üçün heç bir sübut qeydə alınmayıb. Sonradan onu nəzərdən keçirən heç kim bunu yoxlaya bilməyəcək.',
  'x.no-evidence-was-recorded-for-2':
    'Bunun üçün heç bir sübut qeydə alınmayıb.',
  'x.no-metadata-was-recorded-with':
    'Bu artefaktla birlikdə heç bir metaməlumat qeydə alınmayıb.',
  'x.no-model-involved':
    'heç bir model iştirak etmir',
  'x.no-verdict-has-been-recorded':
    'Heç bir verdikt qeydə alınmayıb',
  'x.nonsensitive-connection-settings-stored-loca':
    'Həssas olmayan bağlantı parametrləri. Lokal saxlanılır və audit edilir; provayderə heç nə göndərilmir.',
  'x.nothing-covered-it':
    'heç nə bunu əhatə etməyib',
  'x.nothing-reaches-a-person-until':
    'Adı bəlli bir insan təsdiq etməyənə qədər heç nə heç kimə çatmır.',
  'x.only-a-module-that-has':
    'Yalnız insan təsdiq qapısından keçmiş modul konkret bir şəxsin qarşısına çıxarıla bilər. Əvvəlcə birini təsdiqləyin, sonra geri qayıdın.',
  'x.open-an-incident-risk':
    'İnsident riski aç',
  'x.open-and-closed-risks':
    'Açıq və bağlanmış risklər',
  'x.open-policy-findings-by-severity':
    'Ciddilik üzrə açıq siyasət tapıntıları',
  'x.ordered-by-severity-then-by':
    'Əvvəl ciddiliyə, sonra isə son tarixin yaxınlığına görə sıralanıb.',
  'x.outcomes':
    'Nəticələr',
  'x.password-reset-request':
    'Şifrə sıfırlama sorğusu',
  'x.paste-video-or-course-urls':
    'Video və ya kurs URL-lərini yapışdırın. Hər biri saxlanmazdan əvvəl əldə edilir; əlçatmayan hər şey səbəbi göstərilməklə rədd edilir.',
  'x.peranalyzer-detail':
    'Hər analizator üzrə təfərrüat',
  'x.pick-a-lure-name-the':
    'Tələ seçin, kampaniyanı adlandırın və onu kimin alacağını seçin. Kampaniya qaralama kimi yaradılır.',
  'x.plans':
    'Planlar',
  'x.plans-assigned-to-you-could':
    'Sizə təyin edilmiş planları yükləmək mümkün olmadı',
  'x.policies-most-in-drift':
    'Ən çox kənarlaşan siyasətlər',
  'x.policy-library':
    'Siyasət kitabxanası',
  'x.proposed-audience':
    'Təklif olunan auditoriya',
  'x.provenance':
    'Mənşə',
  'x.quiz':
    'Test',
  'x.quiz-and-answer-key':
    'Test və cavab açarı',
  'x.raise-a-policy-finding':
    'Siyasət üzrə tapıntı qaldırın',
  'x.raised-by-an-analyst-against':
    'Analitik tərəfindən konkret insidentlə bağlı qaldırılır və siz bitirdikdə yenə analitik tərəfindən nəzərdən keçirilir.',
  'x.rates-are-divided-by-the':
    'Nisbətlər hədəfə alınan hər kəsə deyil, nəticəsi qeydə alınmış hədəflərə bölünür.',
  'x.raw-artifact':
    'Xam artefakt',
  'x.read-every-finding-below-against':
    'Aşağıdakı hər tapıntını bununla tutuşduraraq oxuyun.',
  'x.read-from-the-engine-at':
    'Konfiqurasiyadan deyil, sorğu anında mühərrikdən oxunur.',
  'x.read-from-the-platform-at':
    'İcra zamanı platformadan oxunur. Bu paneldəki heç nə brauzerdən konfiqurasiya oluna bilməz.',
  'x.real-threats-that-put-people':
    'İnsanları təlimə göndərən real təhdidlər',
  'x.realworld-items-an-analyst-can':
    'Analitikin dövrənin 1-ci mərhələsinə ötürə biləcəyi real dünya elementləri.',
  'x.recent-analyst-actions':
    'Analitiklərin son əməliyyatları',
  'x.recognition':
    'Tanıma',
  'x.recommended-next-steps':
    'Tövsiyə olunan növbəti addımlar',
  'x.refreshes-while-a-job-is':
    'İş davam edərkən yenilənir.',
  'x.registered-policies':
    'Qeydə alınmış siyasətlər',
  'x.rejecting-marks-the-module-rejected':
    'Rədd etmək modulu rədd edilmiş kimi işarələyir və dövrə axınını baxış nəticəsində uğursuz kimi bağlayır. Heç kimə heç nə təyin edilmir və axın buradan davam etdirilə bilməz.',
  'x.reopen-this-incident-risk':
    'Bu insident riskini yenidən aç',
  'x.reopening-clears-the-closure-note':
    'Yenidən açılma bağlanma qeydini təmizləyir və yenidən açılma sayını artırır. Hər ikisi audit izində saxlanılır.',
  'x.report-something-suspicious':
    'Şübhəli bir şey bildirin',
  'x.reports-arrive-here-the-moment':
    'Kimsə işçi portalındakı bildirmə düyməsindən istifadə etdiyi anda hesabatlar buraya düşür. Hər biri avtomatik triaj olunur və sonra analitiki gözləyir.',
  'x.reports-submitted':
    'Təqdim edilmiş hesabatlar',
  'x.request-an-account':
    'Hesab üçün müraciət edin',
  'x.reset-the-demonstration-world':
    'Nümayiş dünyasını sıfırla',
  'x.reset-your-password':
    'Parolunuzu sıfırlayın',
  'x.review-history':
    'Baxış tarixçəsi',
  'x.roster':
    'Heyət siyahısı',
  'x.rules-whose-status-this-build':
    'Bu buraxılışda statusu üçün başlıq nəzərdə tutulmayan qaydalar. Gizlədilmək əvəzinə göstərilir.',
  'x.runs-awaiting-a-decision':
    'Qərar gözləyən axınlar',
  'x.safety-and-provenance':
    'Təhlükəsizlik və mənşə',
  'x.sandbox-analysis-exports':
    'Sandbox təhlili ixracları',
  'x.saved-to-the-module-before':
    'Hər hansı qərar qeydə alınmazdan əvvəl modula yazılır.',
  'x.score-breakdown':
    'Bal bölgüsü',
  'x.sections':
    'Bölmələr',
  'x.select-a-stage-or-the':
    'Aşağıdakı axınları filtrləmək üçün mərhələ və ya təsdiq qapısını seçin',
  'x.seven-stages-stage-7-feeds':
    'Yeddi mərhələ. 7-ci mərhələnin nəticəsi 1-ci mərhələyə ötürülür — bir dövrənin sübutları növbətini müəyyən edir.',
  'x.sign-in':
    'Daxil olun',
  'x.signals':
    'Siqnallar',
  'x.signed-in':
    'Daxil olunub',
  'x.simulation-outcomes':
    'Simulyasiya nəticələri',
  'x.sorted-by-how-long-each':
    'Hər elementin nə qədər gözlədiyinə görə sıralanıb. Aşağıdakılardan heç biri işçiyə çatmayıb.',
  'x.sorted-by-risk-score-by':
    'Standart olaraq risk balına görə sıralanır. Hər sütun başlığı ilə sıralamaq mümkündür və hər filtr URL-də saxlanılır.',
  'x.source-coverage':
    'Mənbə əhatəsi',
  'x.source-document-and-extraction':
    'Mənbə sənədi və çıxarış',
  'x.stage-timeline':
    'Mərhələ xronologiyası',
  'x.standing-today-an-elevated-or':
    'Bugünkü vəziyyət — yüksəlmiş və ya yüksək orta bal, yaxud yüksək risk zolağında olan hər hansı şəxs.',
  'x.stored-in-this-browser-for':
    'Bu brauzerdə, bu brauzer üçün saxlanılır. Buradakı heç nə cihazdan kənara çıxmır və platformaya çatmır.',
  'x.strongest-departments-today':
    'Bu gün ən güclü şöbələr',
  'x.subjects':
    'Mövzular',
  'x.submissions':
    'Təqdim olunanlar',
  'x.submit-a-sample':
    'Nümunə göndərin',
  'x.submit-an-artifact':
    'Artefakt təqdim edin',
  'x.submit-your-answers':
    'Cavablarınızı göndərin',
  'x.take-these-after-the-one':
    'Bunları yuxarıdakından sonra yerinə yetirin.',
  'x.targets':
    'Hədəflər',
  'x.targets-are-chosen-when-the':
    'Hədəflər kampaniya yaradılarkən şöbələrdən və risk qruplarından seçilir. Hədəfi olmayan kampaniya ölçülə bilməz.',
  'x.the-advisory-was-not-dismissed':
    'Xəbərdarlıq bağlanmadı',
  'x.the-analyzer-found-nothing-it':
    'Analizator bu artefaktda URL, domen, göndərici şablonu və ya heş kimi tanıdığı heç nə tapmadı. Bu, boşluq deyil, nəticədir — keçidi olmayan SMS tələsi heç birini yaratmır.',
  'x.the-api-writes-an-entry':
    'API riskə edilən hər əhəmiyyətli dəyişiklikdə bir qeyd yazır. Buradakı boş siyahı ya risk açılandan bəri heç nəyin dəyişmədiyini, ya da audit izinin oxuna bilmədiyini göstərir.',
  'x.the-approval-workspace-needs-a':
    'Təsdiq iş sahəsi üçün mövcud olan dövrə axını lazımdır. Qapıya qayıdın və növbədən bir axın açın.',
  'x.the-assessment-was-not-recorded':
    'Qiymətləndirmə qeydə alınmadı',
  'x.the-documents-the-organisation-is':
    'Təşkilatın əsasında ölçüldüyü sənədlər, onlardan çıxarılmış qaydalar və hər qaydanın arxasındakı mətn parçası.',
  'x.the-executive-endpoint-answered-without':
    'Rəhbərlik endpointi vəziyyət məlumatı olmadan cavab verdi. Onun yerinə heç nə ehtimal edilmir — platforma yenidən xidmət göstərəndə səhifəni yenidən yükləyin.',
  'x.the-file-is-quarantined-on':
    'Fayl daxil olan kimi karantinə alınır və təhlil edilir. Heç vaxt icra olunmur.',
  'x.the-finding-was-not-raised':
    'Tapıntı qaldırılmadı',
  'x.the-generated-training':
    'Yaradılmış təlim',
  'x.the-highestseverity-observations-in-the':
    'Ciddiliyi ən yüksək olan müşahidələr, analizatorların öz sözləri ilə.',
  'x.the-loop':
    'Dövrə',
  'x.the-loop-in-order':
    'Dövrə, ardıcıllıqla',
  'x.the-model':
    'Model',
  'x.the-model-above-is-still':
    'Yuxarıdakı model bu quraşdırmanın işlətdiyi modelin tam özüdür — sadəcə onun tətbiq olunacağı heç kim yoxdur. Təşkilat idxal edin və ya nümayiş təşkilatını yaradın — bu səhifədəki hər rəqəm dolacaq.',
  'x.the-most-recent-artifacts-the':
    'Platformanın qəbul etdiyi ən son artefaktlar',
  'x.the-note-is-the-record':
    'Qeyd bağlanma meyarlarının yerinə yetirildiyini təsdiqləyən sənəddir. Boş buraxıla bilməz.',
  'x.the-one-thing-to-remember':
    'Yadda saxlamalı olduğunuz yeganə şey',
  'x.the-only-packs-this-deployment':
    'Bu yerləşdirmənin yaratdığı yeganə paketlər. Hər birini API, saxlanılan təhlil əsasında, düymədə göstərilən formatda hazırlayır.',
  'x.the-original-threat':
    'İlkin təhdid',
  'x.the-policy-and-the-rule':
    'Siyasət və qayda',
  'x.the-record':
    'Qeyd',
  'x.the-record-may-have-been':
    'Qeyd silinmiş ola bilər, ya da keçid başqa bir quraşdırmaya işarə edə bilər.',
  'x.the-report-is-closed-without':
    'Hesabat dövrə axını başladılmadan bağlanır. Heç nə silinmir və işçi hesabat verdiyinə görə risk balının artıq aldığı krediti saxlayır.',
  'x.the-signals':
    'Siqnallar',
  'x.the-source-check-could-not':
    'Mənbə yoxlaması üçün sorğu göndərilə bilmədi',
  'x.the-stats-endpoint-answered-but':
    'Statistika endpointi cavab verdi, lakin bu ekranın ehtiyac duyduğu sayları qaytarmadı. Sıfırlardan ibarət sıra göstərmək əvəzinə heç nə göstərilmir, çünki sıfır tapıntı ilə cavabın olmaması fərqli faktlardır.',
  'x.this-archive-is-encrypted':
    'Bu arxiv şifrələnib',
  'x.this-deployment':
    'Bu quraşdırma',
  'x.this-feed-is-filled-by':
    'Bu lent xarici abunəliklə deyil, platformanın özü tərəfindən doldurulur. İçində elementlər olduqda analitik onlardan istənilənini buradan dövrəyə göndərə bilər.',
  'x.this-module-has-no-questions':
    'Bu modulda sual yoxdur',
  'x.this-persons-score-is-still':
    'Bu şəxsin balı hələ də tam olaraq rolunun baza dəyərinə bərabərdir. Hadisələr mühərrik simulyasiya nəticəsini, tamamlanmış modulu, hesabatı və ya analitik düzəlişini qeydə aldığı anda görünür.',
  'x.this-starts-a-loop-run':
    'Bu, dərhal dövrə axını başladır: təhlil, çevrilmə, daha sonra insan təsdiq qapısı.',
  'x.threats-appear-here-when-an':
    'İşçi təhdid bildirdikdə, analitik təqdim etdikdə və ya kəşfiyyat lentindən element göndərildikdə təhdidlər burada görünür.',
  'x.timeline':
    'Xronologiya',
  'x.title-description-sections-quiz-and':
    'Başlıq, təsvir, bölmələr, test və əsas fikir API-nin qəbul etdiyi sahələrdir.',
  'x.trail':
    'İz',
  'x.training-and-simulation-history':
    'Təlim və simulyasiya tarixçəsi',
  'x.training-is-delivered-inside-cyclowareness':
    'Təlim Cyclowareness daxilində çatdırılır. Kursları və insanları sinxronlaşdırmaq üçün LMS və ya kimlik provayderi qoşun.',
  'x.training-recorded':
    'Təlim qeydə alındı',
  'x.training-you-have-finished':
    'Tamamladığınız təlimlər',
  'x.two-lines-and-the-four':
    'İki xətt və onları dürüst saxlayan dörd qayda.',
  'x.two-things-worth-knowing-before':
    'Başlamazdan əvvəl bilməyə dəyər iki məqam',
  'x.use-report-something-suspicious-at':
    'Bu səhifənin yuxarısındakı “Şübhəli bir şey bildirin” düyməsindən istifadə edin. Göndərdiyiniz hər şey burada təhlükəsizlik komandanızın qeydə aldığı nəticə ilə birlikdə görünür.',
  'x.version-history':
    'Versiya tarixçəsi',
  'x.was-this-verdict-right-the':
    'Bu verdikt düzgün idimi? Cavab işlə birlikdə saxlanılır və balı dəyişdirmir.',
  'x.what-each-one-means-what':
    'Hər birinin nə mənaya gəldiyi, nə qədər dəyər daşıdığı və mühərrikin son vaxtlar nə qeydə aldığı.',
  'x.what-is-on-this-screen':
    'Bu ekranda nə var',
  'x.what-ran-and-what-did':
    'İcra olunanlar və olunmayanlar',
  'x.what-the-affected-employee-sees':
    'Təsirə məruz qalan işçinin gördükləri',
  'x.what-the-employee-reads':
    'İşçinin oxuduğu mətn',
  'x.what-the-employee-reads-in':
    'İşçinin oxuyacağı məzmun, ardıcıllıqla.',
  'x.what-the-incident-found-a':
    'İnsidentin aşkar etdikləri. Bunsuz risk sadəcə bir iddiadır.',
  'x.what-this-artifact-set-in':
    'Bu artefaktın hərəkətə gətirdikləri.',
  'x.what-this-build-records-on':
    'Bu buraxılışın tapıntının özündə qeydə aldıqları.',
  'x.what-this-connection-has-mirrored':
    'Bu bağlantının əks etdirdiyi məzmun və hər kursun davranışlarımızdan hansını dəyişdirdiyinə dair iddia.',
  'x.what-this-deployment-can-fetch':
    'Bu yerləşdirmə nəyi əldə edə bilir və ən son nəyi əldə edib.',
  'x.what-to-do':
    'Nə etməli',
  'x.what-you-have-reported':
    'Bildirdikləriniz',
  'x.where-the-organisation-stands':
    'Təşkilatın hazırkı vəziyyəti',
  'x.where-the-organisations-own-documents':
    'Təşkilatın öz sənədlərinin yazıldığı dünyaya artıq uyğun gəlmədiyi yerlər — hər tapıntı zidd getdiyi qaydaya və onun arxasındakı sübuta bağlanıb.',
  'x.where-the-rules-came-from':
    'Qaydaların haradan gəldiyi və ya niyə heç birinin olmadığı.',
  'x.where-this-came-from':
    'Bu haradan gəlib',
  'x.where-this-stands':
    'Bunun hazırkı vəziyyəti',
  'x.where-to-learn-more':
    'Daha ətraflı öyrənmək üçün hara baxmalı',
  'x.which-half-of-the-model':
    'Təşkilatın riskinin əslində modelin hansı yarısından qaynaqlandığı.',
  'x.who-is-affected':
    'Kimlərə təsir edir',
  'x.why-this-scored-the-way':
    'Bu niyə belə bal alıb',
  'x.widen-the-status-channel-or':
    'Mövcud olan kampaniyaları görmək üçün status, kanal və ya axtarış filtrini genişləndirin.',
  'x.without-these-a-finding-is':
    'Bunlar olmadan tapıntı sadəcə iddiadır. Hər sətir oxucunun gedib yoxlaya biləcəyi bir şeydir.',
  'x.work-appears-here-when-an':
    'Analitik sizi insidentə bağladıqda iş burada görünür — məsələn, real təhdid poçt qutunuza çatıb sənədləşdirilmiş cavab tələb etdikdən sonra.',
  'x.worst-first-open-a-roster':
    'Ən pisi əvvəldə. Orta göstəricinin arxasındakı fərdləri görmək üçün heyət siyahısını açın.',
  'x.written-by-the-api-on':
    'Hər əhəmiyyətli dəyişiklikdə API tərəfindən yazılır',
  'x.written-whenever-a-rule-is':
    'Qayda aktivləşdirildikdə və ya əvəz edildikdə yazılır. Yalnız əlavə olunur, dəyişdirilmir.',
  'x.your-answers-are-graded-now':
    'Cavablarınız indi qiymətləndirilir və nəticə, risk balınızdakı dəyişiklik də daxil olmaqla, sizin adınıza qeydə alınır. Bunu geri qaytarmaq və ya testi yenidən vermək mümkün deyil.',
  'x.your-answers-were-not-graded':
    'Cavablarınız qiymətləndirilmədi',
  'x.your-assigned-training-could-not':
    'Sizə tapşırılan təlim yüklənə bilmədi',
  'x.your-record-scores-are-the':
    'Sizin qeydiniz. Ballar platformanın həmin vaxt qiymətləndirdiyi ballardır.',
  'x.your-recorded-events-could-not':
    'Qeydə alınmış hadisələriniz yüklənə bilmədi',
  'x.your-report-was-not-sent':
    'Hesabatınız göndərilmədi',
  'x.your-reports-could-not-be':
    'Hesabatlarınız yüklənə bilmədi',
  'x.your-risk-score':
    'Risk balınız',
  'y.analysis-capability':
    'Təhlil imkanı',
  'y.approval-gate':
    'Təsdiq qapısı',
  'y.as-published':
    'Dərc olunduğu kimi',
  'y.assigned':
    'Tapşırılıb',
  'y.badges':
    'Nişanlar',
  'y.behaviour-summary':
    'Davranış xülasəsi',
  'y.behavioural-analysis':
    'Davranış təhlili',
  'y.chain-of-custody':
    'Saxlama zənciri',
  'y.closure-criteria-as-written-when':
    'Bağlanma meyarları — açılarkən yazıldığı kimi',
  'y.content-provenance':
    'Məzmunun mənşəyi',
  'y.demonstration-accounts':
    'NÜMAYİŞ HESABLARI',
  'y.departments-this-run-touched':
    'Bu axının toxunduğu şöbələr',
  'y.from':
    'Başlanğıc',
  'y.how-the-open-findings-are':
    'Açıq tapıntıların paylanması',
  'y.impact':
    'Təsir',
  'y.indicators-of-compromise':
    'Kompromis göstəriciləri',
  'y.lesson-sections':
    'Dərs bölmələri',
  'y.mitre-attampck':
    'MITRE ATT&amp;CK',
  'y.mitre-attampck-mapping':
    'MITRE ATT&amp;CK uyğunlaşdırması',
  'y.model-component':
    'Model komponenti',
  'y.module-complete':
    'Modul tamamlandı',
  'y.net-risk-movement':
    'Xalis risk hərəkəti',
  'y.packs-this-deployment-cannot-yet':
    'Bu quraşdırmanın hələ yarada bilmədiyi paketlər',
  'y.plainlanguage-explanation':
    'Sadə dildə izah',
  'y.policy-exposure-by-severity':
    'Ciddiliyə görə siyasət üzrə məruz qalma',
  'y.quiz':
    'Test',
  'y.recent-changes':
    'Son dəyişikliklər',
  'y.recorded-metadata':
    'Qeydə alınmış metadata',
  'y.required-approvals':
    'Tələb olunan təsdiqlər',
  'y.riskscore-impact':
    'Risk balına təsir',
  'y.rule-component':
    'Qayda komponenti',
  'y.sandbox':
    'Sandbox',
  'y.sandbox-report':
    'Sandbox hesabatı',
  'y.skipped-and-why':
    'Atlananlar və səbəbi',
  'y.teams-safest-first':
    'Komandalar — ən təhlükəsizdən başlayaraq',
  'y.the-closure-note-that-did':
    'Doğrulanmayan bağlanma qeydi',
  'y.the-content-contradicts-the-name':
    'Məzmun ona verilmiş adla ziddiyyət təşkil edir',
  'y.what-carries-each-requirement':
    'Hər tələbi nəyin daşıdığı',
  'y.what-this-run-leaves-open':
    'Bu axının açıq qoyduqları',
  'y.where-your-score-started':
    'Balınızın başlanğıc nöqtəsi',
  'y.why-each-person':
    'Hər şəxsin niyə seçildiyi',
  'y.why-you-received-this':
    'Bunu niyə aldığınız',
  'z.closedloop-evidence-pack':
    'Qapalı dövrə sübut paketi',
  'z.department-risk-report':
    'Şöbə üzrə risk hesabatı',
  'z.policy-exposure-report':
    'Siyasət üzrə məruz qalma hesabatı',
  'z.incidentrisk-remediation-report':
    'İnsident riski üzrə korrektiv tədbir hesabatı',
  'z.the-document-a-regulator-or':
    'Tənzimləyicinin və ya sığortaçının tələb etdiyi sənəd: real təhdidin real şəxsə çatdığının və sonrasında ölçülə bilən nəyinsə baş verdiyinin sübutu.',
  'z.where-the-human-risk-concentrates':
    'İnsan riskinin harada cəmləndiyi — rəhbərlik baxışı üçün; rəhbərin rüblük əsasda tədbir görməsi istənilən ümumiləşdirmə.',
  'z.every-place-the-world-has':
    'Dünyanın bu təşkilatın yazıya aldığı qaydadan uzaqlaşdığı hər yer — hər qaydanın götürüldüyü mətn parçası ilə birlikdə.',
  'z.what-incident-response-asked-of':
    'İnsidentə cavabın adı çəkilən şəxslərdən nə tələb etdiyi və bunun təyin olunmuş standarta uyğun tamamlanıb-tamamlanmadığı.',
  'w.every-active-and-recently-closed':
    'Bütün aktiv və yaxınlarda bağlanmış axınlar',
  'w.static-and-dynamic-analysis':
    'Statik və dinamik təhlil',
  'w.static-analysis-only':
    'Yalnız statik təhlil',
  'w.worker-attached':
    'İşçi qoşulub',
  'a.admin-intro':
    'Əməliyyat konsolu. Qeydiyyatdan keçmiş admin nömrəsi, sonra birdəfəlik kod.',
  'a.admin-phone-label':
    'Admin telefon nömrəsi',
  'a.digits-only':
    'Yalnız rəqəmlər; boşluqlar nəzərə alınmır.',
  'a.otp-label':
    'Birdəfəlik kod',
  'a.otp-hint':
    'Altı rəqəm. Kod bir dəfə işləyir və beş dəqiqədən sonra etibarını itirir.',
  'a.enter-admin':
    'Admin portalına daxil ol',
  'a.different-number':
    'Başqa nömrə',
  'a.continue':
    'Davam et',
  'a.not-admin':
    'Administrator deyilsiniz?',
  'a.employee-signin':
    'İşçi girişi',
  'a.phone-entry-label':
    'Telefon nömrənizlə daxil olun',
  'a.phone-entry-hint':
    'İş yerinizin sizin üçün qeydiyyata aldığı nömrə.',
  'a.continue-phone':
    'Telefonla davam et',
  'a.not-registered':
    'Bu nömrə qeydiyyatdan keçməyib.',
  'a.no-answer':
    'Server cavab vermədi.',
  'a.login-intro':
    'Rolunuz platformanın sizə nə göstərdiyini və nəyi təsdiqləməyə icazə verdiyini müəyyən edir.',
  'a.accounts-provisioned':
    'Hesablar təhlükəsizlik komandası tərəfindən yaradılır.',
  'a.request-account':
    'Hesab tələb edin',
  'a.built-by':
    'Hazırlayıb',
  'a.tagline':
    'İNSAN KİBER RİSKİNİN QAPALI DÖVRƏSİ',
  'p.a-blank-measurement-is-a-blank':
    'Boş ölçmə boş ölçmə olaraq qalır. Platforma nəyisə hələ ölçməyibsə, yaxşı xəbər kimi görünən sıfır əvəzinə uzun tire yazır və nümunənin nə qədər böyük olduğunu bildirir.',
  'p.a-connection-record-appears-once-a':
    'Bağlantı qeydi provayder platformada qeydiyyatdan keçdikdən sonra görünür. Bu quraşdırma vəziyyətləri nümayiş etdirmək üçün belə qeydlərin hazır dəsti ilə gəlir.',
  'p.a-current-position-not-a-trend':
    'Bu, cari vəziyyətdir, trend deyil. Trend şöbə ekranındadır.',
  'p.a-detonation-host-is-attached':
    'Detonasiya hostu qoşulub.',
  'p.a-detonation-worker-is-attached-behavioural':
    'Detonasiya icraçısı qoşulub. Hesabatdakı davranış siqnalları müşahidə edilib, ehtimal yolu ilə çıxarılmayıb.',
  'p.a-fictional-organisation-is-seeded-for':
    'Uydurma bir təşkilat nümayiş məlumatı kimi qurulub. Onun üzərində işləyən risk mühərriki, sandbox və təsdiq qapısı isə gerçəkdir.',
  'p.a-finding-is-raised-when-threat':
    'Təhdid kəşfiyyatı hansısa siyasət qaydasına uyğun gəldikdə, siyasət baxışı nəyisə üzə çıxardıqda və ya analitik onu birbaşa qeyd etdikdə tapıntı yaradılır.',
  'p.a-floor-not-a-total-a':
    'Bu, alt həddir, yekun say deyil. Bütöv bir şöbəyə şamil edilən tapıntı bu insan sayına heç kimi əlavə etmir.',
  'p.a-high-completion-rate-is-not':
    'Yüksək tamamlanma nisbəti davranışın dəyişdiyinə sübut deyil. Klik və bildirmə nisbətləri sübutdur.',
  'p.a-language-model-is-connected-generated':
    'Dil modeli qoşulub — yaradılan məzmun AI kimi işarələnir.',
  'p.a-mapping-is-your-assertion-that':
    'Uyğunlaşdırma bu kursu tamamlamağın adı çəkilən davranışı dəyişdiyinə dair sizin iddianızdır. O, hesabınıza yazılır, çünki hədəfləmə ondan asılıdır — həddindən artıq iddialı uyğunlaşdırma yanlış şəxsləri yanlış kursa göndərir və sonrakı ölçmə təlim uğursuzluğu kimi oxunur.',
  'p.a-model-is-connected-content-it':
    'Model qoşulub. Onun yazdığı məzmun süni intellektin yaratdığı məzmun kimi işarələnir və kiməsə çatmazdan əvvəl yenə də insan təsdiq qapısından keçir.',
  'p.a-named-person-approved-this-content':
    'Bu məzmun istifadə edilməzdən əvvəl təsdiq qapısında adı göstərilən şəxs tərəfindən təsdiqlənib.',
  'p.a-persignal-rollup-across-the-whole':
    'Bütün təşkilat üzrə hər siqnal üçün ayrıca yekun API tərəfindən verilmir — bölgü endpoint-i hər dəfə yalnız bir şəxs üçün cavab qaytarır. Ona görə də aşağıdakı cədvəl bütün dövrün yekununu iddia etmək əvəzinə, son qeydlərdəki real hadisələri sayır.',
  'p.a-plan-is-raised-when-a':
    'Plan yalnız siqnal konkret şəxsin adını çəkdikdə yaradılır — simulyasiyada klik, giriş məlumatlarının göndərilməsi, şəxsin aldığı nəyəsə verilən zərərli verdikt. Heç bir plan cədvəl üzrə yaradılmır.',
  'p.a-policy-appears-here-once-its':
    'Siyasət burada yalnız onun sənədi — və ya sadəcə metaməlumatı — platforma API-si vasitəsilə qeydə alındıqdan sonra görünür. Mətnin çıxarılması isə ayrıca, könüllü seçilən addımdır.',
  'p.a-reason-is-required-to-dismiss':
    'Xəbərdarlığı rədd etmək üçün səbəb tələb olunur.',
  'p.a-reason-is-required-to-mark':
    'Xəbərdarlığı aid deyil kimi işarələmək üçün səbəb göstərilməlidir.',
  'p.a-reason-is-required':
    'Səbəb göstərilməlidir.',
  'p.a-refusal-is-a-security-metric':
    'İmtina təhlükəsizlik göstəricisidir, xəta deyil. Hər hansı bir kod üzrə sayın artması o deməkdir ki, kimsə bu məhsulun işçinin ekranına nə yazacağını sınaqdan keçirir.',
  'p.a-rejected-rule-was-never-in':
    'Rədd edilmiş qayda heç vaxt qüvvədə olmayıb, ona görə versiya anlıq görüntüsü yazılmır. Səbəb audit izində qeydə alınır.',
  'p.a-risk-appears-here-when-incident':
    'Risk burada insidentə cavab prosesi hər hansı məruz qalmanı adı çəkilən şəxslərin üzərinə yazdıqda yaranır — saxta portalda daxil edilmiş giriş məlumatı, yanlış alıcıya göndərilmiş fayl, təzyiq altında buraxılmış prosedur.',
  'p.a-risk-score-is-one-number':
    'Risk balı 0 ilə 100 arasında bir ədəddir və bu şəxsin hücumun uğur qazandığı nöqtə olma ehtimalını göstərir. Bu, nə iş fəaliyyətinin qiymətləndirilməsi, nə də rəydir — bu, onun vəzifəsi ilə müəyyən olunan başlanğıc nöqtəsi, üstəgəl platformanın onun haqqında qeydə aldığı bütün siqnallardır.',
  'p.a-sync-against-a-connection-that':
    'Konfiqurasiya edilməmiş və ya söndürülmüş bağlantı üzrə sinxronizasiya API tərəfindən rədd edilir. Əvvəlcə onu konfiqurasiya edin; rədd cavabı isə burada göstəriləcək.',
  'p.a-sync-asks-the-provider-for':
    'Sinxronizasiya provayderdən kursları və tamamlanmaları istəyir. Bu buraxılışda provayder klienti yoxdur, ona görə də o, heç bir sorğunun göndərilmədiyini açıq bildirəcək və saxlanmış sinxronizasiya vəziyyətinə toxunmayacaq.',
  'p.a-threat-that-became-training-and':
    'Təlimə çevrilmiş və sonra ölçülmüş təhdid. Heç nə ölçmədən bağlanan dövrə axınları sayılmır.',
  'p.accepted-file-types':
    'Qəbul edilən fayl tipləri',
  'p.account-name':
    'Hesab adı',
  'p.activate-this-proposed-rule':
    'Təklif olunan bu qaydanı aktivləşdir',
  'p.activating-changes-the-set-of-rules':
    'Aktivləşdirmə bu təşkilatın hansı qaydalar toplusu üzrə yoxlanıldığını dəyişir, ona görə də API həmin anda qüvvədə olan qaydalar toplusunun dəyişməz anlıq surətini yazır.',
  'p.add-a-behaviour':
    'Davranış əlavə et',
  'p.add-a-comment-first-a-revision':
    'Əvvəlcə şərh əlavə edin — şərhsiz düzəliş sorğusundan sonra üzərində işləmək üçün heç nə qalmır.',
  'p.add-a-comment-first-the-server':
    'Əvvəlcə şərh yazın — server səbəbsiz rədd cavabını qəbul etmir.',
  'p.advisories-reach-this-module-by-being':
    'Xəbərdarlıqlar bu modula yalnız nümayiş məlumatı kimi yüklənməklə və ya əl ilə daxil edilməklə çatır — heç bir xarici mənbə konfiqurasiya olunmayıb, ona görə də heç nə öz-özünə gəlmir. Mənbə konfiqurasiya edin və alınan xəbərdarlıqlar burada görünəcək.',
  'p.advisories-updated':
    'Yenilənən bülletenlər',
  'p.affected-department':
    'Təsirə məruz qalan şöbə',
  'p.affected-products-as-published':
    'Təsirə məruz qalan məhsullar, dərc olunduğu kimi',
  'p.all-named-subjects-accepted-at-or':
    'Adı çəkilən bütün subyektlər keçid balında və ya ondan yuxarı qəbul edildi, giriş məlumatı isə dəyişdirildi.',
  'p.already-raised-from-this-advisory':
    'Bu xəbərdarlıq əsasında artıq yaradılıb',
  'p.an-analyst-accepted-the-report-targeting':
    'Analitik hesabatı qəbul etdi; bildirən şəxsə aid hədəfləmə açarları bu sərhəddə çıxarıldı.',
  'p.an-analyst-pushed-a-curated-feed':
    'Analitik seçilmiş lent yazısını dövrəyə ötürüb.',
  'p.an-analyst-submitted-the-artifact-directly':
    'Artefaktı analitik birbaşa təqdim edib.',
  'p.an-analyst-wrote-or-rewrote-this':
    'Bu məzmunu analitik yazıb və ya yenidən yazıb.',
  'p.an-assignment-is-delivered-by-appearing':
    'Tapşırıq təyin olunan işçinin portalında görünməklə çatdırılır. Bu quraşdırmada heç bir poçt şlüzü qoşulmayıb, ona görə də heç nə e-poçtla göndərilməyib və heç bir göndərilmə və ya açılma hadisəsi qeydə alınmayıb.',
  'p.an-entry-is-written-whenever-an':
    'Təsdiq barədə qərar veriləndə, siyasət qaydası nəzərdən keçiriləndə, inteqrasiya dəyişdiriləndə və ya insidentin riski dəyişəndə qeyd yazılır. Daha köhnə fəaliyyətə çatmaq üçün zaman aralığını genişləndirin.',
  'p.an-extraction-run-completed-and-wrote':
    'Çıxarma axını tamamlandı, lakin heç nə yazmadı. «Sənəd» bölməsindəki sənədi yoxlayın.',
  'p.an-isolated-detonation-worker-is-attached':
    'Bu quraşdırmaya təcrid olunmuş detonasiya icraçısı qoşulub. Nümunələr həm ayrışdırılır, həm də nəzarət altında icra olunur və hər iki tapıntı dəsti hesabatda göstərilir.',
  'p.an-unexpected-error-stopped-this-view':
    'Gözlənilməz xəta bu görünüşün yüklənməsinin qarşısını aldı. Aşağıdakı təfərrüatlar məhsulun bildiyi hər şeydir.',
  'p.analyse-a-file-or-a-url':
    'Faylı və ya URL-i təhlil et',
  'p.analysis-stopped-rather-than-continuing-on':
    'Analiz aça bilmədiyi konteyner üzərində davam etmək əvəzinə dayandı. Mühərrik parolları nə təxmin edir, nə də kobud güclə seçir — parolun verilməsi analitikin qəsdən atdığı addımdır və məhz belə də qeyd olunur.',
  'p.analysis-time':
    'Təhlil müddəti',
  'p.analyst-comment':
    'Analitik şərhi',
  'p.analyzed-threat':
    'Təhlil edilmiş təhdid',
  'p.analyzer-verdict':
    'Analizatorun qərarı',
  'p.anyone-already-attached-is-shown-as':
    'Artıq əlavə edilmiş şəxslər bu qeydlə göstərilir və onlara toxunulmur.',
  'p.anything-else-is-still-accepted-and':
    'Qalan hər şey yenə də qəbul olunur və məzmununa görə müəyyən edilir — siyahıda isə mühərrikin ayrıca parserə malik olduğu formatlar göstərilib.',
  'p.anything-else-worth-knowing-optional':
    'Bilməli olduğumuz başqa bir şey varsa (istəyə bağlı)',
  'p.approval-gate':
    'Təsdiq qapısı',
  'p.approve-and-release':
    'Təsdiqlə və yayımla',
  'p.approved-by-policy':
    'Siyasətlə təsdiqlənib',
  'p.approved-module':
    'Təsdiqlənmiş modul',
  'p.approved-software':
    'Təsdiqlənmiş proqram təminatı…',
  'p.archive-password':
    'Arxiv parolu',
  'p.archive-password-optional':
    'Arxiv parolu (məcburi deyil)',
  'p.argument-this-finding-rests-on':
    'Bu tapıntının əsaslandığı arqument',
  'p.arrival-time-not-recorded':
    'Gəlmə vaxtı qeydə alınmayıb',
  'p.artifact-body':
    'Artefaktın məzmunu',
  'p.artifact-metadata':
    'Artefakt metaməlumatları',
  'p.artifact-reference-displayed-verbatim-never-link':
    'Artefakt istinadı — eynilə göstərilir, heç vaxt keçidə çevrilmir',
  'p.artifact-type':
    'Artefakt növü',
  'p.asking-the-api-which-environment-this':
    'Bunun hansı mühit olduğu API-dən soruşulur.',
  'p.asking-the-sandbox-what-it-can':
    'Sandbox-dan nə edə bildiyi soruşulur.',
  'p.assessed-as-urgent':
    'Təcili olaraq qiymətləndirilib',
  'p.at-least-one-configured-engine-receives':
    'Ən azı bir konfiqurasiya edilmiş mühərrik bu quraşdırmadan məlumat alır. Hər birinin nə aldığı aşağıda göstərilib.',
  'p.at-least-three-characters-sentence-case':
    'Ən azı üç simvol. Kataloqun qalanı kimi, yalnız ilk hərfi böyük yazın.',
  'p.attendance-not-behaviour-change-read-it':
    'Bu, davranış dəyişikliyi deyil, iştirakdır. Onu yuxarıdakı iki göstərici üçün aşağı hədd kimi oxuyun.',
  'p.average-behaviour-risk':
    'Orta davranış riski',
  'p.average-quiz-score':
    'Orta test balı',
  'p.average-reporting-time':
    'Orta bildiriş vaxtı',
  'p.average-risk-across-everyone-in-the':
    'Şöbədəki bütün işçilər üzrə orta risk. Bu, komandanın orta göstəricisidir, kiminsə fərdi balı deyil.',
  'p.average-risk-across-the-organisation':
    'Təşkilat üzrə orta risk',
  'p.average-risk-score':
    'Orta risk balı',
  'p.average-role-baseline':
    'Rolların orta baza dəyəri',
  'p.average-score':
    'Orta bal',
  'p.average-time-spent':
    'Sərf olunan orta vaxt',
  'p.awaiting-review':
    'Baxış gözləyir',
  'p.bands-are-fixed-029-low-3059':
    'Zolaqlar sabitdir: 0–29 aşağı, 30–59 orta, 60–79 yüksək, 80–100 kritik.',
  'p.behaviour-over-time':
    'Zaman ərzində davranış',
  'p.blocked-by-sovereign-mode':
    'Suveren rejim tərəfindən bloklanıb',
  'p.cve-id-title-or-summary':
    'CVE identifikatoru, başlıq və ya xülasə',
  'p.cvss-not-scored':
    'CVSS balı verilməyib',
  'p.campaign-created-as-a-draft':
    'Kampaniya qaralama kimi yaradıldı',
  'p.campaign-name':
    'Kampaniyanın adı',
  'p.campaigns-launched-and-still-collecting-outcomes':
    'Başladılmış və hələ də nəticə toplayan kampaniyalar',
  'p.carried-by-a-real-training-assignment':
    'Təsdiqlənmiş modul üzrə verilmiş real təlim tapşırığına əsaslanır.',
  'p.caspian-dynamics-has-been-reseeded-with':
    'Caspian Dynamics altı aylıq tarixçə ilə yenidən doldurulub və tarixlər indiki ana uyğunlaşdırılıb.',
  'p.change-in-average-risk':
    'Orta riskdəki dəyişiklik',
  'p.change-in-average-risk-negative-is':
    'Orta riskdə dəyişiklik · mənfi qiymət yaxşılaşmadır',
  'p.changed-saving-rewrites-the-module-and':
    'Dəyişdirilib. Yadda saxlamaq modulu yenidən yazır və onu analitik tərəfindən redaktə edilmiş kimi işarələyir.',
  'p.changing-a-finding-requires-the-policy':
    'Tapıntının dəyişdirilməsi siyasətin idarə edilməsi icazəsini tələb edir.',
  'p.chart-unavailable':
    'Qrafik əlçatan deyil',
  'p.chart-window':
    'Qrafikin vaxt aralığı',
  'p.choose-a-lure-source':
    'Tələ mənbəyini seçin.',
  'p.choose-a-module':
    'Modul seçin…',
  'p.choose-an-approved-module':
    'Təsdiqlənmiş modul seçin',
  'p.choose-another-state-or-set-the':
    'Başqa vəziyyət seçin və ya filtri yenidən bütün vəziyyətlərə qaytarın.',
  'p.chooses-how-the-analyzer-reads-the':
    'Analizatorun aşağıdakı mətni necə oxuyacağını müəyyən edir.',
  'p.classification':
    'Təsnifat',
  'p.clear-a-filter-or-widen-the':
    'Bir filtri təmizləyin və ya zaman aralığını genişləndirin. Əməliyyat filtri özündən aşağıdakı bütün fellərə də uyğun gəlir, ona görə də dəqiq addan deyil, əməliyyat ailəsinin adından başlamaq adətən daha yaxşıdır.',
  'p.clear-a-filter-to-widen-the':
    'Axtarışı genişləndirmək üçün filtrlərdən birini təmizləyin. Şöbə filtri ən son yenilənmiş siyasətlər üzərində işləyir, ona görə çox köhnə sənəd onun xaricində qala bilər.',
  'p.clear-one-of-the-filters-to':
    'Axtarışı genişləndirmək üçün filtrlərdən birini təmizləyin. Şöbə filtri yalnız ən son tapıntıların məhdud bir hissəsini nəzərdən keçirir, ona görə də köhnə tapıntı bu həddin kənarında qala bilər.',
  'p.clear-the-filter-to-see-every':
    'Mühərrikin hazırladığı bütün planları görmək üçün filtri təmizləyin.',
  'p.clear-the-search':
    'Axtarışı təmizləyin',
  'p.clear-the-search-to-see-the':
    'Bu bağlantıda həqiqətən mövcud olan kursları görmək üçün axtarışı təmizləyin.',
  'p.click-rate-is-at-or-below':
    'Klikləmə faizi bildiriş faizinə bərabər və ya ondan aşağıdır, heç bir şöbə yüksək zolaqda deyil, yüksək ciddilikli açıq tapıntı yoxdur və ən azı bir dövrə ölçmə ilə bağlanıb. Bu, xəbərdarlığın olmamasıdır, sertifikat deyil.',
  'p.clicked-targets-divided-by-every-simulation':
    'Klikləyən hədəflərin sayı nəticəyə çatmış bütün simulyasiya hədəflərinin sayına bölünür.',
  'p.close-campaign':
    'Kampaniyanı bağla',
  'p.close-the-palette-a-dialog-or':
    'Palitranı, dialoqu və ya yan paneli bağlamaq',
  'p.closed-loops':
    'Bağlanmış dövrələr',
  'p.closes-the-run-as-failedbyreview-nothing':
    'Axını baxış nəticəsində uğursuz kimi bağlayır. Heç bir tapşırıq verilmir.',
  'p.closure-criteria':
    'Bağlanma meyarları',
  'p.closure-note':
    'Bağlanma qeydi',
  'p.command-palette':
    'Əmr paleti',
  'p.compiled-at-startup-and-applied-to':
    'Sistem işə düşərkən kompilyasiya edilir və hər təqdimata tətbiq olunur.',
  'p.complete-the-supplierimpersonation-module-and-ch':
    'Təchizatçı adından saxtakarlıq modulunu tamamlayın və ifşa olunmuş giriş məlumatını dəyişin.',
  'p.completed-assignments-divided-by-assignments-mad':
    'Tamamlanmış tapşırıqların həmin aralıqda verilmiş tapşırıqlara nisbəti.',
  'p.completing-this-module-moves-the-employeeaposs':
    'Bu modulun tamamlanması işçinin risk balını dəyişir. Bu dəyişikliyin həcmini burada deyil, tamamlanma anında risk mühərriki müəyyən edir.',
  'p.completion-is-attendance-not-behaviour-change':
    'Tamamlama iştirakdır, davranış dəyişikliyi deyil',
  'p.completion-is-not-the-same-as':
    'Tamamlamaq səriştə ilə eyni şey deyil. Bunu sübut edən aşağıdakı baldır.',
  'p.computed-from-the-roster-in-the':
    'Brauzerdə işçi siyahısı əsasında hesablanır, ona görə də hər bir şəxs yalnız bir dəfə sayılır. Aşağıdakı şöbə ortalamaları serverdən gəlir və işdən ayrılmış şəxsləri əhatə etmir.',
  'p.computed-when-the-employee-completes-the':
    'İşçi testi tamamladıqda hesablanır. Bu modul üzrə hələ heç nə ölçülməyib, ona görə burada rəqəm göstərilmir.',
  'p.confidentiality':
    'Məxfilik',
  'p.configurable-per-pilot-so-a-deployment':
    'Hər pilot üçün ayrıca konfiqurasiya olunur ki, quraşdırma müştəri brendi altında (white-label) təqdim edilə bilsin.',
  'p.configured-sources':
    'Konfiqurasiya edilmiş mənbələr',
  'p.connected-generated-content-is-labelled-ai':
    'Qoşulub. Yaradılan məzmun AI kimi işarələnir.',
  'p.connection-state':
    'Bağlantının vəziyyəti',
  'p.content-author':
    'Məzmun müəllifi',
  'p.content-type':
    'Məzmun növü',
  'p.content-written-by-a-model-is':
    'Model tərəfindən yazılmış məzmun göründüyü hər yerdə məhz belə işarələnir. Şablon nəticəsi şablon nəticəsi kimi işarələnir, heç vaxt AI kimi yox.',
  'p.control-gaps':
    'Nəzarət boşluqları',
  'p.copy-every-indicator':
    'Bütün indikatorları kopyala',
  'p.copy-failed-try-again':
    'Kopyalanmadı — yenidən cəhd edin',
  'p.copy-the-original-url':
    'Orijinal URL-i kopyala',
  'p.correct-answer':
    'Düzgün cavab',
  'p.could-not-close-the-campaign':
    'Kampaniyanı bağlamaq mümkün olmadı',
  'p.could-not-generate-outcomes':
    'Nəticələr yaradıla bilmədi',
  'p.could-not-record-the-feedback':
    'Rəyi qeyd etmək mümkün olmadı',
  'p.could-not-switch-account':
    'Hesabı dəyişmək mümkün olmadı',
  'p.counted-from-the-returned-rows-not':
    'Qaytarılan sətirlərə görə sayılıb, server tərəfindəki ümumi göstəriciyə görə deyil.',
  'p.counted-over-every-finding-not-just':
    'Yalnız bu zaman aralığı üzrə deyil, bütün tapıntılar üzrə sayılır — vaxtın ötməsi bugünkü günə aid faktdır.',
  'p.counts-describe-the-advisories-stored-in':
    'Buradakı saylar bu quraşdırmada saxlanan bülletenlərə aiddir. Bu, dərc olunmuşların sayı deyil — məlumat çəkmək üçün heç bir mənbə konfiqurasiya edilməyib.',
  'p.courses-appear-once-a-sync-imports':
    'Kurslar yalnız sinxronizasiya onları provayderdən idxal etdikdən sonra görünür. Bu buraxılışda provayder klienti yoxdur, ona görə burada heç nə əldə edilə bilməz.',
  'p.coverage-gaps':
    'Əhatə boşluqları',
  'p.creating-a-campaign-records-it-and':
    'Kampaniya yaratmaq onu və hədəflərini qeydə alır. Bu quraşdırmaya nə poçt, nə də SMS şlüzü qoşulmayıb, ona görə əslində heç nə göndərilmir — nəticələri hədəflər üzrə analitik qeyd edir.',
  'p.credential-entered-on-a-spoofed-supplier':
    'Saxta təchizatçı portalında daxil edilmiş giriş məlumatları',
  'p.critical-and-high':
    'Kritik və yüksək',
  'p.current-standing-of-the-scored-population':
    'Balı hesablanan işçilərin hazırkı vəziyyəti, 0–100 şkalası üzrə.',
  'p.cyclowareness-cannot-reach-its-backend-the':
    'Cyclowareness öz backend-inə çata bilmir. Ola bilsin, xidmət hələ işə düşür, ya da bağlantı kəsilib. Bu, sizin etdiyiniz hər hansı əməlin nəticəsi deyil və heç nə itməyib.',
  'p.decide-what-reaches-an-employee':
    'İşçiyə nəyin çatacağına qərar verin',
  'p.decision-comment':
    'Qərar şərhi',
  'p.declared-capabilities':
    'Bəyan edilmiş imkanlar',
  'p.defanged-for-display-and-deliberately-not':
    'Ekranda göstərmək üçün zərərsizləşdirilib və qəsdən kliklənə bilmir.',
  'p.defanged-for-display-and-never-rendered':
    'Göstərmək üçün zərərsizləşdirilib və heç vaxt keçid kimi verilmir. Onları burada açmaq əvəzinə, tikətə və ya bloklama siyahısına kopyalayın.',
  'p.defaults-to-the-advisorys-own-title':
    'Standart olaraq xəbərdarlığın öz başlığı götürülür.',
  'p.defaults-to-the-advisorys-published-severity':
    'Standart olaraq xəbərdarlığın dərc edilmiş ciddiliyini götürür.',
  'p.delivered-to-inbox-no-quarantine':
    'Gələnlər qutusuna çatdırılıb, karantinə alınmayıb',
  'p.demonstration-data-nothing-here-was-measured':
    'Nümayiş məlumatı. Buradakı heç nə canlı sistemdən ölçülməyib.',
  'p.demonstration-deployment-the-organisation-is-see':
    'Nümayiş məqsədli quraşdırma. Təşkilat nümayiş məlumatıdır; onun üzərində işləyən mühərrik isə həqiqidir.',
  'p.demonstration-world-rebuilt':
    'Nümayiş dünyası yenidən quruldu',
  'p.demonstration-world-reset':
    'Nümayiş mühiti sıfırlandı',
  'p.demonstration-the-organisation-is-seeded':
    'Nümayiş — təşkilat nümayiş məlumatı üzərində qurulub',
  'p.department-average':
    'Şöbə üzrə orta',
  'p.department-names-could-not-be-loaded':
    'Şöbə adları yüklənə bilmədi, ona görə də yekun göstəricilər göstərilmir.',
  'p.derived-by-the-server-from-the':
    'Serverin tələ mənbəyindən çıxardığı dəyərdir. Müstəqil şəkildə təyin edilə bilməz.',
  'p.derived-from-the-analyser-verdict':
    'Analizatorun verdiktindən çıxarılıb.',
  'p.derived-from-the-live-queues-this':
    'Canlı növbələrdən əldə edilib. Bu quraşdırma nə e-poçt, nə də push bildirişi göndərir.',
  'p.derived-from-this-runaposs-own-status':
    'Bu axının öz statusu və tapşırıq qeydləri əsasında çıxarılıb. Bu, model tərəfindən hazırlanmış tövsiyə deyil.',
  'p.describe-the-incident-how-it-was':
    'İnsidenti, onun necə aşkar edildiyini və məruz qalmanın nədən ibarət olduğunu təsvir edin.',
  'p.destroys-every-run-decision-and-result':
    'Bütün axınları, qərarları və nəticələri məhv edir',
  'p.dismiss-report':
    'Hesabatı rədd et',
  'p.dismissed-by-an-analyst-no-loop':
    'Analitik tərəfindən rədd edilib. Heç bir dövrə axını başladılmayıb və heç bir risk balı dəyişməyib.',
  'p.display-name':
    'Göstərilən ad',
  'p.dispute-answered':
    'Etiraz cavablandırıldı',
  'p.disputes-waiting':
    'Gözləyən etirazlar',
  'p.distinct-employees-named-individually-by-any':
    'Hər hansı açıq tapıntıda adbaad göstərilən fərqli işçilər.',
  'p.drafted-by-a-language-model-and':
    'Qaralaması dil modeli tərəfindən hazırlanıb, insan tərəfindən tamamlanıb.',
  'p.dynamic-detonation-is-not-available-on':
    'Dinamik detonasiya bu hostda mövcud deyil. Buraya göndərilən heç nə icra olunmur — nümunələr ayrışdırılır, skan edilir və bal alır, heç vaxt işə salınmır.',
  'p.each-entry-performs-a-real-signin':
    'Buradakı hər sətir real giriş həyata keçirir. Tokeni server verir və bütün icazələri tətbiq etməyə davam edir — brauzerdə heç bir rol saxtalaşdırılmır.',
  'p.effective-from':
    'Qüvvəyə minmə tarixi',
  'p.employees-appear-here-once-the-organisation':
    'İşçilər təşkilat platformaya yükləndikdən sonra burada görünür.',
  'p.endorsed-once-a-different-person-must':
    'Bir dəfə dəstəklənib; təsdiqi başqa bir şəxs verməlidir',
  'p.estimated-duration':
    'Təxmini müddət',
  'p.estimated-minutes':
    'Təxmini dəqiqə',
  'p.estimated-time':
    'Təxmini vaxt',
  'p.every-account-is-bound-to-an':
    'Hər hesab bir işçi qeydinə, şöbəyə və rola bağlıdır. Hədəfləmə və risk tarixçəsi məhz bu bağlılıq sayəsində məna kəsb edir; hesabın bu ekrandan yaradıla bilməməsinin səbəbi də budur.',
  'p.every-analyzer-this-build-knows-about':
    'Bu buraxılışın tanıdığı hər analizator bu hostda yüklənib.',
  'p.every-cached-view-has-been-invalidated':
    'Keşdəki bütün görünüşlər etibarsız sayılıb və yenidən yüklənir.',
  'p.every-incident-risk-is-excluded-by':
    'Cari seçim bütün insident risklərini kənarda saxlayır. Hamısını görmək üçün filtrləri təmizləyin.',
  'p.every-material-change-recorded-against-this':
    'Bu axına dair qeydə alınmış hər əhəmiyyətli dəyişiklik.',
  'p.every-named-person-was-skipped-the':
    'Adı çəkilən şəxslərin hamısı kənarda saxlanıldı. Səbəblər dialoq pəncərəsində göstərilib.',
  'p.every-proposed-rule-sits-below-awaiting':
    'Təklif olunan hər qayda aşağıda rəyçini gözləyir. Onlardan heç biri hələ heç nə ilə tutuşdurulmayıb.',
  'p.every-question-is-answered-submitting-grades':
    'Bütün suallar cavablandırılıb. Göndərdikdə cavablar qiymətləndiriləcək və bunu geri qaytarmaq mümkün olmayacaq.',
  'p.every-record-on-screen-belongs-to':
    'Ekrandakı hər qeyd bu təşkilata aiddir.',
  'p.every-report-states-this-as-a':
    'Hər hesabat bunu heç vaxt müşahidə olunmamış təmiz davranış nəticəsi kimi təqdim etmək əvəzinə, kor nöqtə kimi qeyd edir.',
  'p.everyone-attached-to-this-risk-already':
    'Bu riskə bağlanmış hər kəsin artıq tapşırığı var. Təkrar tapşırıq vermək kiminsə tamamlamış ola biləcəyi işi sıfırlayardı, ona görə server onlara toxunmur.',
  'p.expire-and-measure':
    'Müddəti bitir və ölç',
  'p.explanation-shown-after-answering':
    'Cavabdan sonra göstərilən izah',
  'p.exposure-is-carried-by-the-match':
    'Məruz qalmanı uyğunluq daşıyır: o, uyğun gələn siyasətin şamil olunduğu şöbələrdən və uyğun gələn texnologiyadan istifadə etdikləri qeyd olunan şəxslərdən gəlir. Bu xəbərdarlıq üçün nə biri, nə də digəri qeyd olunmayıb.',
  'p.exposure-not-recorded':
    'Məruz qalma qeydə alınmayıb',
  'p.external-learning-and-identity-systems':
    'Xarici təlim və kimlik sistemləri',
  'p.external-pages-opened-in-a-new':
    'Xarici səhifələr yeni tabda açılır. Cyclowareness onların içindəki heç nəyi yükləmir, təhlil etmir və ona əsaslanaraq hərəkət etmir.',
  'p.extraction-was-not-attempted':
    'Çıxarma cəhdi edilməyib.',
  'p.filter-runs-by-status':
    'Axınları statusa görə filtrləyin',
  'p.finding-type':
    'Tapıntı növü',
  'p.findings-detected':
    'Aşkarlanan tapıntılar',
  'p.forcemeasure-did-not-run':
    'Məcburi ölçmə işə düşmədi',
  'p.forensic-analysis-of-a-file-or':
    'Faylın və ya URL-in forenzik təhlili — burada statik, detonasiya isə təcrid olunmuş icraçıda — balın hər bir bəndinin arxasındakı əsaslandırma ilə birlikdə.',
  'p.from-the-library':
    'Kitabxanadan',
  'p.gaps-are-days-with-no-resolved':
    'Boşluqlar həll edilmiş hadisənin olmadığı günlərdir',
  'p.gating-a-loop-run':
    'Dövrə axınının təsdiq qapısından keçirilməsi',
  'p.generated-by-the-configured-anthropic-model':
    'Konfiqurasiya edilmiş Anthropic modeli tərəfindən yaradılıb.',
  'p.generated-from':
    'Yaradılma mənbəyi',
  'p.give-the-campaign-a-name':
    'Kampaniyaya ad verin.',
  'p.has-a-recorded-outcome':
    'Qeydə alınmış nəticəsi var',
  'p.has-this-happened-to-you':
    'Bu, sizin başınıza gəlib?',
  'p.head-of-security-operations':
    'Təhlükəsizlik Əməliyyatlarının rəhbəri',
  'p.held-for-a-second-approver':
    'İkinci təsdiqləyici üçün saxlanılır',
  'p.hidden-by-default-this-is-attackerauthored':
    'Standart olaraq gizlidir. Bu, hücumçunun yazdığı məzmundur; eynilə mətn kimi göstərilir və heç vaxt əldə edilmir, icra olunmur və keçidə çevrilmir.',
  'p.hide-the-raw-artifact':
    'Xam artefaktı gizlət',
  'p.high-risk-is-a-score-of':
    'Yüksək risk 60 və ondan yuxarı baldır.',
  'p.highrisk-policy-findings':
    'Yüksək riskli siyasət tapıntıları',
  'p.how-each-metric-was-set':
    'Hər göstəricinin necə müəyyən edildiyi',
  'p.how-this-campaign-appears-in-the':
    'Bu kampaniyanın proqram siyahısında və audit izində necə göründüyü.',
  'p.how-this-content-was-produced-was':
    'Bu məzmunun necə hazırlandığı qeydə alınmayıb.',
  'p.how-this-model-was-built':
    'Bu model necə qurulub',
  'p.inc20260184':
    'INC-2026-0184',
  'p.identity-federation-is-not-configured-for':
    'Bu quraşdırma üçün kimlik federasiyası konfiqurasiya edilməyib. Heç bir SAML və ya OIDC provayderi qoşulmayıb, ona görə də bunlar yönləndirirmiş kimi görünmək əvəzinə qeyri-aktivdir.',
  'p.if-anything-here-reminds-you-of':
    'Buradakı nəsə sizə gələn hansısa mesajı xatırladırsa, elə indi bildirin. Bu, təlimi yarıda kəsmir.',
  'p.imported-from-a-connected-learning-system':
    'Qoşulmuş təlim sistemindən idxal edilib. Onu Cyclowareness yazmayıb.',
  'p.incident-remediation-completion':
    'İnsident üzrə korrektiv tədbirlərin tamamlanması',
  'p.incident-risks-in-the-closed-state':
    'Bağlı vəziyyətdə olan insident riskləri bütün insident risklərinə bölünür.',
  'p.incidentresponse-records-name-individuals-and-ar':
    'İnsidentə cavab qeydlərində konkret şəxslərin adı çəkilir və onları təhlükəsizlik komandası saxlayır. Bu görünüş onları oxuya bilmir, bu isə belə qeydlərin olmaması demək deyil.',
  'p.inside-archive':
    'Arxivin içində',
  'p.it-fell-short-a-note-saying':
    'Tələb olunan səviyyəyə çatmadı. Nəyin həddən aşağı qaldığını izah edən qeyd tələb olunur.',
  'p.it-is-attached-to-this-job':
    'O, bu işə əlavə edilib və ixracda görünür.',
  'p.it-is-no-longer-assigned-and':
    'Tapşırıq artıq təyin edilmiş deyil və işçiyə səbəbi bildirilir.',
  'p.it-is-now-cleared-to-reach':
    'O, artıq adını çəkdiyi şəxsə çatmaq üçün təsdiqlənib.',
  'p.it-may-still-be-queued':
    'O, hələ növbədə ola bilər.',
  'p.it-stops-being-assigned-to-them':
    'Tapşırıq artıq onlara təyin olunmur. Onlar haqlı idisə, bunu seçin.',
  'p.json-carries-the-complete-analyzer-output':
    'JSON analizatorun tam nəticəsini, balın bölgüsünü və çıxarılmış hər indikatoru daşıyır. STIX 2.1 indikatorları başqa alətin qəbul edə biləcəyi paket şəklində daşıyır. PDF isə hazırlanmış hesabatdır. Hər üçü saxlanmış təhlildir — nümunənin yenidən analiz edilməsi isə işin özü üzərində ayrıca əməliyyatdır.',
  'p.keeps-your-comment-and-unsaved-edits':
    'Şərhinizi və yadda saxlanmamış düzəlişləri bu brauzerdə saxlayır. Qaralama üçün ayrıca endpoint yoxdur, ona görə qaralama heç vaxt bu cihazdan çıxmır.',
  'p.kept-on-the-audit-entry-optional':
    'Audit qeydində saxlanılır. Təsdiq üçün məcburi deyil, lakin rədd qərarını sonradan nəzərdən keçirməyə məhz bu imkan verir.',
  'p.language-model':
    'Dil modeli',
  'p.leave-blank-unless-the-archive-is':
    'Arxiv şifrələnməyibsə, boş buraxın. Şifrələnibsə, təhlil dayanıb parolu soruşur — mühərrik parolları nə təxmin edir, nə də brute-force ilə tapır.',
  'p.live-data-has-resumed-open-views':
    'Canlı məlumat bərpa olunub. Açıq görünüşlər yenilənib.',
  'p.loading-approved-modules':
    'Təsdiqlənmiş modullar yüklənir…',
  'p.loading-resources':
    'Resurslar yüklənir…',
  'p.loading-the-policy-record':
    'Siyasət qeydi yüklənir.',
  'p.loading-the-thread':
    'Yazışma yüklənir…',
  'p.longest-wait':
    'Ən uzun gözləmə',
  'p.loop-run-record':
    'Dövrə axını qeydi',
  'p.loop-run-records':
    'Dövrə axını qeydləri',
  'p.loop-run-records-are-analystscoped-so':
    'Dövrə axını qeydləri analitik üzrə məhdudlaşdırılıb, ona görə bu görünüş idarə panelinin bildirdiyi bağlanmış axınların sayını göstərə bilir, tamamlanmış, davam edən və uğursuz olanlar arasındakı bölgünü isə göstərə bilmir.',
  'p.loop-runs-could-not-be-read':
    'Dövrə axınlarını oxumaq mümkün olmadı, ona görə nəticələrin bölgüsü əlçatan deyil.',
  'p.loop-status-unavailable':
    'Dövrə statusu əlçatan deyil',
  'p.lure-as-stored':
    'Tələ saxlandığı kimi',
  'p.lure-preview':
    'Tələyə öncədən baxış',
  'p.mitre-attampck-techniques':
    'MITRE ATT&amp;CK texnikaları',
  'p.mail-gateway-verdict':
    'Poçt şlüzünün qərarı',
  'p.matching-these-filters':
    'Bu filtrlərə uyğun gələnlər',
  'p.measured-for-this-run-only-not':
    'Yalnız bu axın üçün ölçülüb, sürüşən aralıq üzrə deyil.',
  'p.measured-from-this-deployments-own-records':
    'Bu quraşdırmanın öz qeydləri əsasında ölçülüb.',
  'p.minimum-score':
    'Minimum bal',
  'p.module-to-assign':
    'Təyin ediləcək modul',
  'p.more-entries-matched-than-are-shown':
    'Uyğun gələn qeydlərin sayı burada göstərilənlərdən çoxdur. Qalanlarını səhifə-səhifə nəzərdən keçirmək üçün audit jurnalını açın.',
  'p.more-risk-is-coming-from-what':
    'İnsanların etdiklərindən gələn risk, təkcə rolların izah edə biləcəyindən çoxdur.',
  'p.move-through-palette-results':
    'Palitra nəticələri arasında hərəkət et',
  'p.move-to-the-next-control-the':
    'Növbəti idarəetmə elementinə keçir; birinci keçid linki gəlir',
  'p.name-owner-or-notes-press-enter':
    'Ad, sahib və ya qeydlər. Axtarmaq üçün Enter basın.',
  'p.names-the-behaviour-to-train-training':
    'Təlim keçiriləcək davranışı adlandırır. Təlimin özü isə tapıntı üzərində təyin edilir.',
  'p.negative-is-the-good-direction-here':
    'Burada mənfi istiqamət yaxşıdır: bu o deməkdir ki, təşkilatın bildirişlərdən və təlimlərdən qazandığı bal kliklərə və vaxtı keçmiş tapşırıqlara itirdiyi baldan çoxdur.',
  'p.never-sent-to-the-employee-it':
    'İşçiyə heç vaxt göndərilmir. Qiymətləndirici cavabları məhz bununla tutuşdurub ballandırır.',
  'p.new-advisories':
    'Yeni bülletenlər',
  'p.new-threat-submissions':
    'Yeni təhdid bildirişləri',
  'p.newest-advisory-in-view':
    'Görünüşdəki ən yeni bülleten',
  'p.no-advisory-is-stored-in-this':
    'Bu quraşdırmada heç bir xəbərdarlıq saxlanmır',
  'p.no-advisory-matches-these-filters':
    'Bu filtrlərə uyğun xəbərdarlıq yoxdur',
  'p.no-analyzed-threat-is-available':
    'Təhlil edilmiş təhdid mövcud deyil',
  'p.no-analyzer-raised-a-signal-on':
    'Bu nümunə üzrə heç bir analizator siqnal vermədi. Bunu yuxarıdakı səviyyə bildirişi ilə birlikdə oxuyun: bu, tanınan heç nəyin işə düşmədiyini bildirir, nümunənin təhlükəsiz olduğunun sübut edildiyini yox.',
  'p.no-analyzer-result-was-recorded-for':
    'Bu iş üçün analizator nəticəsi qeydə alınmayıb. Bu, qeydlərdəki boşluqdur, təmiz nəticə deyil.',
  'p.no-answer-key-was-recorded-for':
    'Bu sual üçün düzgün cavab qeydə alınmayıb, ona görə balı hesablana bilmir.',
  'p.no-approved-training-module-exists-in':
    'Bu quraşdırmada təsdiqlənmiş təlim modulu yoxdur, ona görə də əlavə ediləsi heç nə yoxdur. API burada qəsdən modul yazmır — bu mərhələdə dərs yaratmaq yoxlanılmamış məzmunu insan təsdiq qapısından yan keçirmiş olardı. Əvvəlcə Təlim Studiyasında bir modul təsdiqləyin.',
  'p.no-artifact-body-was-stored-for':
    'Bu təhdid üçün artefaktın özü saxlanılmayıb — yalnız metadatası saxlanılıb.',
  'p.no-audit-events-yet-every-decision':
    'Hələ audit hadisəsi yoxdur. İnsan qapısından keçən hər qərar burada qeydə alınır.',
  'p.no-automated-triage-was-recorded-against':
    'Bu bildiriş üzrə heç bir avtomatik ilkin qiymətləndirmə qeydə alınmayıb.',
  'p.no-automated-triage-was-recorded-for':
    'Bu bildiriş üçün avtomatik ilkin qiymətləndirmə qeyd olunmayıb. Onu analitik oxuyacaq.',
  'p.no-capability-was-derived-from-the':
    'Sübutdan heç bir qabiliyyət çıxarılmayıb, ona görə bal veriləcək təsir yoxdur.',
  'p.no-checks-were-reported-for-this':
    'Bu axın üçün heç bir yoxlama bildirilməyib.',
  'p.no-configuration-has-been-stored-for':
    'Bu bağlantı üçün heç bir konfiqurasiya saxlanılmayıb.',
  'p.no-connection-has-been-registered':
    'Heç bir bağlantı qeydə alınmayıb',
  'p.no-connection-is-in-that-state':
    'Bu vəziyyətdə heç bir bağlantı yoxdur',
  'p.no-correct-answer-is-recorded-for':
    'Bu sual üçün düzgün cavab qeyd olunmayıb. Onu qiymətləndirmək mümkün deyil.',
  'p.no-course-has-been-imported':
    'Heç bir kurs idxal edilməyib',
  'p.no-course-matches-this-search':
    'Bu axtarışa uyğun kurs yoxdur',
  'p.no-credential-field-exists-on-this':
    'Bu formada giriş məlumatı sahəsi yoxdur. API açarları, müştəri sirləri və tokenlər yerləşdirmənin sirlər anbarında saxlanılmalıdır — API giriş məlumatına bənzəyən dəyərləri hər ehtiyat nüsxənin və ekran görüntüsünün daşıyacağı yerdə saxlamaqdansa, birbaşa rədd edir.',
  'p.no-department-is-above-the-low':
    'Heç bir şöbə aşağı zolağın üstündə deyil və heç birində yüksək risk zolağında olan işçi yoxdur.',
  'p.no-department-is-currently-in-the':
    'Hazırda aşağı zolaqda olub, eyni zamanda yüksək risk zolağında heç bir işçisi olmayan şöbə yoxdur.',
  'p.no-department-or-employee-is-named':
    'Bu tapıntıda heç bir şöbə və ya işçi göstərilməyib. Bu, qeyddəki boşluqdur, heç kimin təsirə məruz qalmadığını bildirən ifadə deyil.',
  'p.no-departments':
    'Şöbə yoxdur',
  'p.no-departments-are-recorded':
    'Heç bir şöbə qeydə alınmayıb.',
  'p.no-detonation-host-files-are-analysed':
    'Detonasiya hostu yoxdur. Fayllar statik şəkildə təhlil edilir və heç vaxt icra olunmur.',
  'p.no-detonation-worker-is-attached-so':
    'Heç bir detonasiya icraçısı qoşulmayıb, ona görə buraya göndərilən heç nə icra olunmur. Hesabatlar bunu hər səviyyə üzrə açıq yazır ki, oxuyan nümunənin işə salındığını güman etməsin.',
  'p.no-employee-in-the-directory-matches':
    'Kataloqda bu ada, e-poçta və ya vəzifə adına uyğun gələn işçi yoxdur.',
  'p.no-employee-is-currently-selected-so':
    'Hazırda heç bir işçi seçilməyib, ona görə də təsdiq etmək axını təyin ediləcək heç nə olmadan irəli aparacaq.',
  'p.no-employee-matched-this-threats-targeting':
    'Heç bir işçi bu təhdidin hədəfləmə siqnallarına uyğun gəlmədi. Bu, "heç kim risk altında deyil" demək deyil — təsdiqləmək axını tapşırılacaq heç nə olmadan irəli aparardı.',
  'p.no-engine-recorded':
    'Heç bir mühərrik qeydə alınmayıb',
  'p.no-entry-matches-these-filters':
    'Bu filtrlərə uyğun qeyd yoxdur',
  'p.no-evidence-rows-yet-a-risk':
    'Hələ sübut sətri yoxdur. Sübutu olmayan risk yenə də açıla bilər, lakin sonradan onu nəzərdən keçirən heç kim onu yoxlaya bilməyəcək.',
  'p.no-evidence-was-recorded-for-this':
    'Bunun üçün heç bir sübut qeydə alınmayıb.',
  'p.no-explanation-is-recorded-the-employee':
    'Heç bir izah qeyd olunmayıb — işçi yalnız düz cavab verib-vermədiyini görür.',
  'p.no-explanation-was-recorded-for-this':
    'Bu sual üçün heç bir izah qeydə alınmayıb.',
  'p.no-external-engine-is-configured-to':
    'Bu quraşdırmadan hər hansı bir şey qəbul etmək üçün heç bir xarici mühərrik konfiqurasiya edilməyib.',
  'p.no-external-provider-is-connected-in':
    'Bu quraşdırmada heç bir xarici provayder qoşulmayıb.',
  'p.no-extracted-rule-an-approved-version':
    'Bu xəbərdarlıq heç bir çıxarılmış qaydaya — təsdiqlənmiş versiyaya, ağ siyahı yazısına, istisnaya — toxunmadı. Qaydalar yalnız siyasət sənədi yükləndikdən və onun qaydaları çıxarıldıqdan sonra uyğunlaşdırıla bilər.',
  'p.no-feature-was-present-in-this':
    'Bu nümunədə heç bir əlamət yox idi, ona görə də bal yalnız modelin baza göstəricisindən ibarətdir.',
  'p.no-filter-applied-beyond-the-window':
    'Zaman aralığından başqa heç bir filtr tətbiq edilməyib',
  'p.no-filters-applied-every-finding-this':
    'Filtr tətbiq edilməyib — bu quraşdırmanın saxladığı hər tapıntı.',
  'p.no-finding-matches-these-filters':
    'Bu filtrlərə uyğun tapıntı yoxdur',
  'p.no-findings-could-be-read':
    'Heç bir tapıntını oxumaq mümkün olmadı.',
  'p.no-findings-have-been-raised':
    'Heç bir tapıntı qeydə alınmayıb',
  'p.no-incident-risk-has-been-opened':
    'Heç bir insident riski açılmayıb',
  'p.no-indicators-were-extracted-for-a':
    'Heç bir indikator çıxarılmayıb. Təsvir ediləsi şəbəkə və ya fayl sistemi davranışı olmayan nümunə üçün bu gözləniləndir — bu, nümunənin zərərsiz olduğuna dair sübut deyil.',
  'p.no-indicators-were-extracted-on-a':
    'Heç bir indikator çıxarılmayıb. Yükü və keçidi olmayan sosial mühəndislik artefaktında bu, boşluq deyil, gözlənilən nəticədir.',
  'p.no-individual-events-have-been-recorded':
    'Sizinlə bağlı heç bir fərdi hadisə qeydə alınmayıb.',
  'p.no-individual-rule-is-cited-the':
    'Ayrıca bir qaydaya istinad edilmir. Tapıntı bütövlükdə siyasətin özünə aid edilib — çox vaxt ona görə ki, ondan heç vaxt heç nə çıxarılmayıb.',
  'p.no-individual-was-named-the-exposure':
    'Heç bir şəxsin adı çəkilməyib — məruz qalma şöbə səviyyəsində qeyd olunub.',
  'p.no-jobs-in-this-state':
    'Bu vəziyyətdə iş yoxdur',
  'p.no-language-model-is-connected-generated':
    'Heç bir dil modeli qoşulmayıb. Yaradılan məzmun şablon çıxışıdır və məhz belə də işarələnir.',
  'p.no-loop-runs-are-executing-right':
    'Hazırda icra olunan dövrə axını yoxdur.',
  'p.no-loops-yet':
    'Hələ dövrə yoxdur',
  'p.no-lure-source-recorded':
    'Tələnin mənbəyi qeyd edilməyib',
  'p.no-match-named-a-technology-from':
    'Heç bir uyğunluq nə təsdiqlənmiş proqram siyahısından, nə də qeydə alınmış inventardan texnologiya adı göstərmədi. Aşağıdakıların hamısı bizim deyil, istehsalçının iddiasıdır.',
  'p.no-match-my-own-claim':
    'Uyğunluq yoxdur — mənim öz iddiam',
  'p.no-metadata-was-recorded-with-this':
    'Bu artefaktla birlikdə heç bir metadata qeyd olunmayıb.',
  'p.no-model-connected-in-this-deployment':
    'Bu quraşdırmada heç bir model qoşulmayıb — şablon nəticəsi.',
  'p.no-model-is-connected-generated-training':
    'Heç bir model qoşulmayıb. Yaradılan təlim və brifinqlər deterministik şablon nəticəsidir və AI kimi deyil, şablon kimi etiketlənir.',
  'p.no-module-was-generated-for-this':
    'Bu axın üçün modul yaradılmayıb',
  'p.no-movement-to-show':
    'Göstəriləcək dinamika yoxdur',
  'p.no-one-matches-these-filters':
    'Bu filtrlərə uyğun gələn yoxdur',
  'p.no-one-was-selected-that-is':
    'Heç kim seçilmədi. Bu, “heç kim risk altında deyil” demək deyil — bu o deməkdir ki, nə artefaktda, nə təsirə məruz qalmış şöbələrdə, nə də son davranış siqnallarında heç nə konkret bir adamla uyğunlaşmadı. Bu vəziyyətdə təsdiqlənən axın təyin ediləcək heç nə olmadan irəli gedir.',
  'p.no-one-was-targeted-so-no':
    'Heç kim hədəfə alınmayıb, ona görə heç bir şöbəyə toxunulmayıb.',
  'p.no-open-findings':
    'Açıq tapıntı yoxdur',
  'p.no-pass-mark-was-set-on':
    'Bu insident üçün keçid balı təyin edilməyib.',
  'p.no-passage-was-recorded-for-this':
    'Bu qayda üçün heç bir mətn parçası qeydə alınmayıb, ona görə də onu burada sənədlə tutuşdurmaq mümkün deyil.',
  'p.no-people-have-been-loaded':
    'Heç bir şəxs yüklənməyib',
  'p.no-perdepartment-history-is-stored-the':
    'Şöbələr üzrə tarixçə saxlanmır: şöbələr endpointi yalnız cari yekunu qaytarır və son risk hadisələrinin heç biri hər hansı şöbədəki konkret şəxsə aid edilə bilmədi.',
  'p.no-plainlanguage-explanation-was-written-for':
    'Bu artefakt üçün sadə dildə izah yazılmayıb.',
  'p.no-plan-has-been-raised-yet':
    'Hələ heç bir plan yaradılmayıb',
  'p.no-plan-holds-this-status':
    'Bu statusda plan yoxdur',
  'p.no-policies-have-been-registered':
    'Heç bir siyasət qeydə alınmayıb',
  'p.no-policy-matches-these-filters':
    'Bu filtrlərə uyğun gələn siyasət yoxdur',
  'p.no-provider-client-exists-in-this':
    'Bu versiyada provayder klienti yoxdur. Saxlanmış sinxronizasiya vəziyyəti dəyişməyib.',
  'p.no-questions-are-attached-so-nothing':
    'Heç bir sual əlavə edilməyib, ona görə də bu modulla bağlı heç nə ölçülə bilməz.',
  'p.no-quiz-score-was-recorded-against':
    'Bu tapşırıq üzrə heç bir test balı qeydə alınmayıb.',
  'p.no-quiz-was-recorded-against-this':
    'Bu modul üçün heç bir test qeydə alınmayıb, ona görə də cavablandırılacaq heç nə yoxdur. Bunun nəzərdə tutulub-tutulmadığını təhlükəsizlik komandanız sizə deyə bilər.',
  'p.no-recent-risk-event-could-be':
    'Son dövrün heç bir risk hadisəsini adı bəlli şəxsə aid etmək mümkün olmadı, ona görə də heç bir dəyişiklik göstərilmir.',
  'p.no-recent-risk-event-could-be-2':
    'Son risk hadisələrinin heç biri konkret şəxsə aid edilə bilmədi, ona görə heç bir dəyişmə göstərilmir.',
  'p.no-record-on-this-deployment-links':
    'Bu quraşdırmada bu artefaktı hər hansı dövrə axını ilə əlaqələndirən heç bir qeyd yoxdur. Təhdidlər API-si axınları təhdid üzrə indeksləmir və hər iki id-ni yalnız insan-sensor bildirişi daşıyır.',
  'p.no-risk-matches-these-filters':
    'Bu filtrlərə uyğun risk yoxdur',
  'p.no-risk-score-is-recorded-for':
    'Bu auditoriyada heç kim üçün risk balı qeydə alınmayıb, ona görə paylanma göstərilə bilməz.',
  'p.no-rollup-available':
    'Yekun göstərici mövcud deyil',
  'p.no-rule-on-this-page-fired':
    'Bu səhifədəki heç bir qayda işə düşmədi.',
  'p.no-rules-exist-yet-so-nothing':
    'Hələ heç bir qayda yoxdur, ona görə də heç bir texnologiyanın adı çəkilmir',
  'p.no-sandbox-job-is-linked-to':
    'Bu icraya bağlı sandbox işi yoxdur. Yuxarıda göstərilənlərin hamısı təhlil mərhələsindən gəlir, detonasiyadan yox.',
  'p.no-score-was-recorded-for-this':
    'Bu şəxs üçün bal qeyd edilməyib. Tələb olunan tədbirdə test olmaya bilər.',
  'p.no-selection-reasons-were-recorded-against':
    'Bu tapşırıq üzrə seçim səbəbləri qeydə alınmayıb, ona görə də bu ekran sizə niyə seçildiyinizi deyə bilməz. Təhlükəsizlik komandanız deyə bilər.',
  'p.no-severity-band-contributed-no-signal':
    'Heç bir ciddilik zolağı töhfə verməyib — məlumat səviyyəsindən yuxarı heç bir siqnal işə düşməyib.',
  'p.no-severity-was-derived-for-this':
    'Bu icra üçün ciddilik müəyyən edilməyib, çünki təhlil mərhələsində heç bir hökm qeyd olunmayıb.',
  'p.no-signal-fired-on-this-sample':
    'Bu nümunədə heç bir siqnal işə düşmədi. Bu, hər şeyin təmiz olması demək deyil — işə düşən analizatorlar tanıdıqları heç nə tapmadılar, işə düşə bilməyənlər isə yuxarıda sadalanıb.',
  'p.no-source-check-has-been-requested':
    'Bu sessiyada heç bir mənbə yoxlaması tələb olunmayıb. Dəyişməyən siyahı yeni xəbərdarlığın olmadığına sübut deyil — o, sadəcə heç kimin baxmadığının sübutudur.',
  'p.no-submission-currently-holds-this-status':
    'Hazırda heç bir göndəriş bu statusda deyil. Mühərrikin təhlil etdiyi hər şeyi görmək üçün filtri təmizləyin.',
  'p.no-sync-was-attempted':
    'Sinxronizasiya cəhdi edilməyib',
  'p.no-training-module-exists-on-this':
    'Bu axında təlim modulu yoxdur. Zərərsiz hökm dövrəni bu mərhələdə modul yaratmadan bağlayır, daha əvvəl uğursuz olan axın isə bu mərhələyə heç çatmır.',
  'p.no-training-module-was-generated-for':
    'Bu axın üçün təlim modulu yaradılmayıb. Burada nəzərdən keçiriləcək heç nə yoxdur və təsdiq etsəniz, dövrə təyin ediləcək heç nə olmadan irəli gedəcək.',
  'p.no-verdict-was-recorded-that-is':
    'Heç bir hökm qeydə alınmayıb. Bu, təmiz nəticə deyil — bu artefakt barədə heç bir qənaətə gəlinməyib.',
  'p.no-verdict-yet':
    'Hələ hökm yoxdur',
  'p.nobody-is-attached-yet-so-nobody':
    'Hələ heç kim əlavə edilməyib, ona görə də heç kim məsuliyyət daşımır.',
  'p.nobody-is-selected-yet':
    'Hələ heç kim seçilməyib.',
  'p.nobody-was-attached-the-risk-is':
    'Heç kim əlavə edilmədi. Risk dəyişməz qalır.',
  'p.none-endorsed-and-held':
    'Heç biri təsdiqlənib saxlanılmayıb',
  'p.none-of-its-rules-names-a':
    'Onun qaydalarının heç biri hansısa texnologiyanın adını çəkmir',
  'p.none-every-plan-built-so-far':
    'Yoxdur. İndiyədək qurulan bütün planlar firewall-dan keçib — ona nə bir təyinat ünvanı, nə uydurma açar, nə də təhlükəli cavab çatıb.',
  'p.none-this-deployment-has-no-threatintelligence':
    'Yoxdur. Bu quraşdırmada müraciət ediləcək təhdid kəşfiyyatı mənbəyi yoxdur.',
  'p.not-a-humansensor-report':
    'İnsan-sensor hesabatı deyil',
  'p.not-available-the-threat-record-served':
    'Mövcud deyil. Bu ekrana verilən təhdid qeydində hökm, təhdid növü, davranış xülasəsi və indikatorlar var — texnika uyğunlaşdırması yoxdur, ona görə də heç nə göstərilmir.',
  'p.not-classified':
    'Təsnif edilməyib',
  'p.not-completed-so-no-score-was':
    'Tamamlanmayıb, ona görə heç bir bal qeydə alınmayıb.',
  'p.not-connected-content-is-template-output':
    'Qoşulmayıb. Məzmun şablon nəticəsidir və heç vaxt AI kimi işarələnmir.',
  'p.not-derived-from-the-perassignment-scores':
    'Brauzerdə hər tapşırıq üzrə ballardan hesablanmır, çünki bu görünüş onların hamısını görə bilmir.',
  'p.not-exposed-selected-on-risk-signals':
    'İfşa olunmayıb — risk siqnallarına görə seçilib',
  'p.not-reached-nothing-has-been-proposed':
    'Bu mərhələyə çatılmayıb. Bu axında hələ heç nə baxış üçün təklif edilməyib.',
  'p.not-reached-nothing-has-been-proposed-2':
    'Çatılmayıb. Bu icrada nəzərdən keçirilmək üçün heç nə təklif edilməyib.',
  'p.not-recorded':
    'Qeydə alınmayıb',
  'p.not-stated-on-the-artifact':
    'Artefaktda göstərilməyib',
  'p.not-yet-assessed':
    'Hələ qiymətləndirilməyib',
  'p.not-yet-reviewed-by-anyone':
    'Hələ heç kim tərəfindən nəzərdən keçirilməyib',
  'p.note-optional':
    'Qeyd (istəyə bağlı)',
  'p.note-for-the-assignment-optional':
    'Tapşırıq üçün qeyd (məcburi deyil)',
  'p.nothing-assigned':
    'Heç nə tapşırılmayıb',
  'p.nothing-has-been-recorded-against-this':
    'Bu axın üzrə hələ heç nə qeyd edilməyib. İlk qərar, dəstək və ya yenidən baxılma tələbi burada görünəcək.',
  'p.nothing-has-been-submitted-yet':
    'Hələ heç nə göndərilməyib',
  'p.nothing-has-been-written-on-this':
    'Bu tapıntı üzrə hələ heç nə yazılmayıb. O, nə bağlanıb, nə qəbul edilib, nə də rədd edilib.',
  'p.nothing-has-moved-your-score-yet':
    'Hələ heç nə balınızı dəyişməyib. O, hələ də rolunuzun nə dərəcədə həssas olmasına görə təyin edilmiş başlanğıc nöqtəsidir.',
  'p.nothing-has-produced-rules-for-this':
    'Bu siyasət üçün hələ heç nə qayda yaratmayıb. Maneənin nədən ibarət olduğu «Sənəd» bölməsində yazılıb, qaydaları həm də API vasitəsilə əl ilə daxil etmək olar.',
  'p.nothing-in-the-humansensor-queue-is':
    'İnsan-sensor növbəsində qərar gözləyən heç nə yoxdur.',
  'p.nothing-in-this-catalogue-is-mapped':
    'Bu kataloqda hələ heç nə uyğunlaşdırılmayıb. Aşağıda ilk davranışı əlavə edin.',
  'p.nothing-in-this-deployment-can-assign':
    'Bu quraşdırmada heç nə onu təyin edə bilməz — sandbox-a təqdim etməyi yalnız analitik edir. Bunun qeydə alınması əl ilə atılan addımdır.',
  'p.nothing-is-checked-against-them-until':
    'Yoxlayıcı hər birini aktivləşdirənə qədər onların əsasında heç nə yoxlanılmır.',
  'p.nothing-is-delivered-until-you-launch':
    'Siz işə salmayınca heç nə çatdırılmır.',
  'p.nothing-is-graded-on-arrival-the':
    'Daxil olan anda heç nə qiymətləndirilmir. 2-ci mərhələdəki hökm və inam dərəcəsi bu artefaktın aldığı ilk qiymətləndirmədir.',
  'p.nothing-is-held-at-this-point':
    'Hazırda dövrənin bu nöqtəsində heç nə gözləmir. Bütün axınları görmək üçün filtri təmizləyin.',
  'p.nothing-is-scored-until-the-analysis':
    'Təhlil bitməyincə heç nə ballandırılmır. Bu işin bildiriləcək risk səviyyəsi yoxdur.',
  'p.nothing-is-waiting-at-the-approval':
    'Təsdiq qapısında gözləyən heç nə yoxdur.',
  'p.nothing-reaches-an-employee-until-a':
    'İnsan qərar verməyincə heç nə işçiyə çatmır',
  'p.nothing-stored-here-matches-the-source':
    'Burada saxlananların heç biri təyin etdiyiniz mənbə, tip, ciddilik, qiymətləndirmə və axtarışa uyğun gəlmir. Onları təmizləsəniz, bu quraşdırmada olan hər şey görünəcək.',
  'p.nothing-to-show':
    'Göstəriləcək heç nə yoxdur',
  'p.nothing-verified-for-this-channel-yet':
    'Bu kanal üçün hələ heç nə yoxlanılmayıb. Materialı analitik təlim ekranından əlavə edir, keçid isə yalnız provayder onu təsdiqlədikdən sonra siyahıya düşür.',
  'p.nothing-was-assigned-on-this-run':
    'Bu axında heç nə təyin edilmədi. Ya o, hələ qapıdan keçməyib, ya da hədəfləmə heç kimi seçməyib.',
  'p.nothing-was-assigned-the-decision-is':
    'Heç bir tapşırıq verilmədi. Qərar audit jurnalındadır.',
  'p.nothing-was-delivered':
    'Heç nə çatdırılmadı.',
  'p.nothing-was-recorded-in-this-window':
    'Bu zaman aralığında heç nə qeydə alınmayıb',
  'p.nothing-was-sent-cyclowareness-has-no':
    'Heç nə göndərilmədi. Cyclowareness-in bunun üçün endpointi yoxdur — aşağıdakı mətni kopyalayıb özünüz göndərin.',
  'p.obligation-discharged':
    'Öhdəlik yerinə yetirildi',
  'p.one-approval-releases-this-run-use':
    'Bir təsdiq bu axını sərbəst buraxır. Bunun əvəzinə onu ikinci imzalayan üçün saxlamaq istəyirsinizsə, aşağıdakı "İkinci təsdiq tələb et" seçimindən istifadə edin.',
  'p.one-behavioural-finding-was-observed-and':
    'Bir davranış tapıntısı müşahidə edilib və statik sübutla yanaşı balda nəzərə alınıb.',
  'p.oneline-description':
    'Bir sətirlik təsvir',
  'p.only-approved-modules-appear-here-choosing':
    'Burada yalnız təsdiqlənmiş modullar görünür. Heç birini seçməsəniz belə, cəhd qeydə alınır və nəyin yerinə yetirilmədiyi bildirilir.',
  'p.only-modules-a-human-has-approved':
    'Yalnız insanın təsdiqlədiyi modullar təyin edilə bilər.',
  'p.only-satisfied-if-the-module-you':
    'Yalnız təyin etdiyiniz modulda həqiqətən suallar varsa təmin olunur.',
  'p.open-findings-whose-severity-is-critical':
    'Ciddiliyi kritik və ya yüksək olan açıq tapıntılar.',
  'p.open-highrisk-findings':
    'Açıq yüksək riskli tapıntılar',
  'p.open-navigation':
    'Naviqasiyanı aç',
  'p.open-the-approval-gate':
    'Təsdiq qapısını açın',
  'p.open-the-command-palette':
    'Əmr palitrasını açın',
  'p.open-in-review-remediation-planned-or':
    'Açıq, baxışda, korrektiv tədbir planlanıb və ya təlim təyin edilib.',
  'p.opening-it-now-training-is-assigned':
    'İndi açılır. Təlim tapıntıdan təyin edilir.',
  'p.optional-for-this-move-and-kept':
    'Bu addım üçün istəyə bağlıdır və doldurulsa da, doldurulmasa da qeydə alınır.',
  'p.optional-url-log-id-ticket':
    'Seçimlidir — URL, jurnal id-si, tiket',
  'p.optional-and-worth-writing-it-is':
    'İxtiyaridir, amma yazmağa dəyər: növbəti analitikin oxuyacağı məhz budur.',
  'p.optional-appended-to-the-audit-entry':
    'İstəyə bağlıdır. Bu dəyişikliyin audit qeydinə əlavə olunur.',
  'p.optional-interpreted-as-the-end-of':
    'İstəyə bağlı. UTC üzrə həmin günün sonu kimi başa düşülür.',
  'p.optional-it-helps-whoever-provisions-the':
    'Məcburi deyil. Hesabı yaradan şəxsə düzgün rolu seçməkdə kömək edir.',
  'p.optional-left-blank-the-platform-names':
    'İxtiyaridir. Boş buraxılsa, platforma ona artefakt növünün adını verir.',
  'p.optional-recorded-on-the-audit-entry':
    'Məcburi deyil. Audit qeydində saxlanılır.',
  'p.optional-use-it-when-the-exposure':
    'Məcburi deyil. Məruz qalma bir şəxsə deyil, komandaya aid olduqda istifadə edin.',
  'p.optional-what-would-resolve-it':
    'İstəyə bağlıdır. Onu nəyin həll edəcəyi.',
  'p.outcomes-for-this-campaign-could-not':
    'Bu kampaniyanın nəticələri yüklənə bilmədi. Yenidən cəhd etmək üçün kampaniyanı açın.',
  'p.outcomes-the-loop-is-meant-to':
    'Dövrənin dəyişdirməli olduğu nəticələr',
  'p.overdue-and-open':
    'Vaxtı keçmiş və açıq',
  'p.part-of-an-email-address':
    'E-poçt ünvanının bir hissəsi',
  'p.pass-criteria':
    'Keçid meyarları',
  'p.passing-streak':
    'Ardıcıl keçmə seriyası',
  'p.paste-at-least-part-of-what':
    'Gördüyünüzün heç olmasa bir hissəsini yapışdırın.',
  'p.paste-it-here':
    'Onu bura yapışdırın',
  'p.people-in-a-scored-department':
    'Balı hesablanan şöbədəki insanlar',
  'p.people-in-the-highrisk-band':
    'Yüksək risk zolağındakı şəxslər',
  'p.people-to-attach':
    'Əlavə ediləcək şəxslər',
  'p.phishing-click-rate':
    'Fişinq kliklənmə nisbəti',
  'p.pick-departments-risk-bands-or-both':
    'Şöbələri, risk zolaqlarını və ya hər ikisini seçin. Hər hansı birinə uyğun gələn şəxs bir dəfə daxil edilir.',
  'p.platform-api':
    'Platforma API-si',
  'p.point-in-time-todays-stored-scores':
    'Müəyyən an — bu gün saxlanmış ballar',
  'p.points-count-completed-training-only-50':
    'Xallar yalnız tamamlanmış təlimi nəzərə alır — bitirdiyiniz hər modula görə 50, üstəgəl test balınızın yarısı. Onlar nə etdiyinizin qeydidir, nə qədər təhlükəsiz olduğunuzun ölçüsü deyil.',
  'p.policy-exposure':
    'Siyasətdən doğan risk',
  'p.policy-findings-could-not-be-read':
    'Siyasət tapıntıları oxuna bilmədi, ona görə burada heç nə sayılmır.',
  'p.policy-intelligence':
    'Siyasət kəşfiyyatı',
  'p.policy-intelligence-sections':
    'Siyasət kəşfiyyatı bölmələri',
  'p.preview-width':
    'Önizləmə eni',
  'p.produced-by-a-fixed-template-no':
    'Sabit şablonla hazırlanıb. Onun heç bir hissəsini dil modeli yazmayıb.',
  'p.produced-by-the-analysis-sandbox-from':
    'Təhlil sandbox-u real artefaktdan hazırlayıb.',
  'p.production-deployment-every-record-on-screen':
    'İstismar mühitidir. Ekrandakı hər qeyd bu təşkilata aiddir.',
  'p.provider-topic-tags':
    'Provayderin mövzu etiketləri',
  'p.published-by-the-source-cyclowareness-did':
    'Mənbə tərəfindən dərc olunub. Cyclowareness bu siyahını inventarla tutuşdurmayıb — yalnız yuxarıdakı uyğunluqlar yoxlanılıb.',
  'p.pushing-a-feed-item-into-the':
    'Lent elementini dövrəyə göndərmək üçün analitik rolu tələb olunur.',
  'p.quiz-generation-and-role-variants-are':
    'Test yaradılması və rol variantları eyni mərhələnin hissəsidir və ayrıca çağırıla bilməz. Yeni modul hazırlamaq üçün dövrəyə artefakt verin.',
  'p.quiz-pass-rate':
    'Testdən keçmə faizi',
  'p.quoted-back-when-somebody-closes-this':
    'Kimsə bunu bağlayarkən mətn yenidən göstərilir ki, bağlanış qeydi onunla tutuşdurula bilsin.',
  'p.raised-by-incident-response-against-named':
    'İnsidentə cavab zamanı konkret əməkdaşlar barədə qaldırılıb',
  'p.raw-headers-message-text-url-or':
    'Xam başlıqlar, mesaj mətni, URL və ya fayl adı. Passiv mətn kimi saxlanılır və heç vaxt açılmır.',
  'p.reading-the-decision-from-the-audit':
    'Qərar audit izindən oxunur…',
  'p.reading-the-live-loop-counts':
    'Canlı dövrə sayları oxunur.',
  'p.reading-the-queues':
    'Növbələr oxunur.',
  'p.reason-for-reopening':
    'Yenidən açılma səbəbi',
  'p.received-the-artifact':
    'Artefaktı aldı',
  'p.recorded-against-this-risk':
    'Bu risk üzrə qeydə alınıb',
  'p.recorded-against-your-account-in-the':
    'Audit izində sizin hesabınıza yazılır. API bunu tələb edir.',
  'p.recorded-against-your-name-in-the':
    'Audit izində sizin adınıza qeyd olunur.',
  'p.recorded-asis-never-contacted':
    'Olduğu kimi qeyd olunub. Heç vaxt əlaqə saxlanılmayıb.',
  'p.recorded-behaviour-has-cancelled-out-exactly':
    'Qeydə alınmış davranışlar bir-birini tam olaraq neytrallaşdırıb, ona görə də təşkilat hazırda rol üzrə baza səviyyələrindədir.',
  'p.recorded-on-the-audit-entry-why':
    'Audit qeydində saxlanılıb — nə üçün məhz bu insanlar, başqaları yox.',
  'p.recorded-on-the-audit-entry-not':
    'Audit qeydində saxlanılır, işçiyə göstərilmir.',
  'p.recorded-on-the-version-snapshot-alongside':
    'Versiya anlıq görüntüsündə adınızla birlikdə qeyd edilib.',
  'p.records-your-objection-and-leaves-the':
    'Etirazınızı qeydə alır və axını redaktə üçün qapıda saxlayır.',
  'p.refused-by-the-output-firewall':
    'Çıxış firewall-u tərəfindən rədd edilib',
  'p.reject-the-module':
    'Modulu rədd et',
  'p.reject-this-proposed-rule':
    'Təklif olunan bu qaydanı rədd et',
  'p.rejecting-or-requesting-a-revision-needs':
    'Rədd etmək və ya düzəliş tələb etmək üçün əvvəlcə şərh lazımdır — server səbəb göstərilmədən heç birini qəbul etmir, əsasında addım atmağa heç nə verməyən qərar isə heç kimin işinə yaramır.',
  'p.related-incident-reference':
    'Əlaqəli insidentin istinadı',
  'p.released-by-a-human-the-run':
    'İnsan tərəfindən buraxılıb — əks halda axın hədəfləmə mərhələsinə çata bilməzdi. Təsdiq qeydi yüklənmədiyi üçün yoxlayıcı və şərh burada göstərilmir.',
  'p.released-by-a-person-the-run':
    'Bir insan tərəfindən buraxılıb — əks halda axın hədəfləmə mərhələsinə çata bilməzdi. Audit izində buna aid qərar qeydi tapılmadı, ona görə də nəzərdən keçirən şəxs və şərh təxmin edilmək əvəzinə burada ümumiyyətlə göstərilmir.',
  'p.reload-the-page':
    'Səhifəni yenidən yüklə',
  'p.remember-my-email-on-this-device':
    'E-poçtumu bu cihazda yadda saxla',
  'p.rendered-as-absent-rather-than-derived':
    'Brauzerdə natamam məlumatdan hesablanmaqdansa, mövcud deyil kimi göstərilir.',
  'p.rendered-exactly-as-the-employee-will':
    'İşçinin görəcəyi kimi eynilə göstərilib.',
  'p.report-status':
    'Bildirişin statusu',
  'p.reported-by-the-human-sensor-and':
    'İnsan-sensor tərəfindən bildirilib və hələ triaj edilməyib',
  'p.reporters-note':
    'Bildirən şəxsin qeydi',
  'p.reporting-rate':
    'Bildirmə faizi',
  'p.reporting-window':
    'Hesabat pəncərəsi',
  'p.reports-sent':
    'Göndərilmiş hesabatlar',
  'p.required-action':
    'Tələb olunan iş',
  'p.required-for-a-rejection-or-a':
    'Rədd cavabı və ya yenidən işlənmə tələbi üçün mütləqdir. Qərarla birlikdə audit izində saxlanılır.',
  'p.required-training':
    'Tələb olunan təlim',
  'p.required-resolving-accepting-or-reopening-a':
    'Məcburidir. Tapıntını həll etmək, qəbul etmək və ya yenidən açmaq təşkilatın sonradan müdafiə etməli ola biləcəyi bir iddiadır.',
  'p.required-the-api-refuses-a-rejection':
    'Mütləqdir. API səbəb göstərilmədən edilən rəddi qəbul etmir.',
  'p.required-this-is-what-the-person':
    'Mütləqdir. Şəxsə işinin niyə qəbul edilmədiyi barədə məhz bu deyilir.',
  'p.requires-a-quiz':
    'Test tələb edir',
  'p.requires-a-sandbox-exercise':
    'Sandbox məşqi tələb olunur',
  'p.requires-training':
    'Təlim tələb olunur',
  'p.reset-everything':
    'Hər şeyi sıfırla',
  'p.reset-the-demonstration-world':
    'Nümayiş mühitini sıfırla',
  'p.reset-the-world':
    'Dünyanı sıfırla',
  'p.resetting-deletes-every-loop-run-approval':
    'Sıfırlama hər dövrə axınını, təsdiq qərarını, təlim tapşırığını, test nəticəsini, sandbox işini və audit qeydini silir, sonra nümayiş məlumatı üzərində qurulmuş təşkilatı determinist şəkildə yenidən yaradır — eyni insanlar, eyni altı aylıq tarixçə, bu günə yenidən bağlanmış halda. Bundan sonra heç nə bərpa edilə bilməz.',
  'p.review-decisions-are-recorded-against-the':
    'Baxış qərarları riskin özünə deyil, ayrı-ayrı subyektə yazılır, ona görə də yuxarıdakı zaman xəttində görünür, bu siyahıda yox.',
  'p.review-state':
    'Baxış vəziyyəti',
  'p.reviewer-note-optional':
    'Nəzərdən keçirənin qeydi (istəyə bağlı)',
  'p.risk-opened-as-a-draft':
    'Risk qaralama kimi açılıb',
  'p.risk-opened-but-nobody-was-attached':
    'Risk açılıb, lakin heç kim ona bağlanmayıb',
  'p.risk-scores-are-the-values-recorded':
    'Risk balları bu siyahı tərtib edilərkən qeydə alınmış dəyərlərdir. Şəxsin balı sonradan dəyişir, ona görə buradakı rəqəm həmişə onun bugünkü profili ilə üst-üstə düşməyəcək.',
  'p.role-sensitivity-is-set-when-a':
    'Rol həssaslığı şəxs idxal edilərkən təyin olunur. Bu, vəzifə barədə mülahizədir, şəxsin ölçülməsi deyil.',
  'p.run-the-selected-palette-result':
    'Seçilmiş palitra nəticəsini işə salmaq',
  'p.running-extraction-requires-the-policy-managemen':
    'Çıxarmanı işə salmaq üçün siyasət idarəetməsi icazəsi tələb olunur.',
  'p.runs-appear-once-a-threat-is':
    'Axınlar təhdid göndəriləndə, işçi tərəfindən bildiriləndə və ya kəşfiyyat lentindən ötürüləndə görünür.',
  'p.runs-currently-moving-through-the-seven':
    'Hazırda yeddi mərhələdən keçən axınlar',
  'p.runs-held-at-the-gate':
    'Qapıda saxlanılan axınlar',
  'p.runs-over-the-most-recent-findings':
    'Ən son tapıntılar üzərində işləyir; say aşağı hədd olduqda bunu bildirir.',
  'p.runs-that-reached-the-completed-state':
    'Tamamlanmış vəziyyətə çatmış və ölçmə nəticəsi vermiş axınlar.',
  'p.sha256-hash':
    'SHA-256 heşi',
  'p.sandbox-detonation':
    'Sandbox-da detonasiya',
  'p.sanitised-for-display-shown-as-plain':
    'Göstərmək üçün zərərsizləşdirilib: adi mətn kimi verilir, heç vaxt render edilmir',
  'p.save-edits-and-approve':
    'Dəyişiklikləri saxla və təsdiqlə',
  'p.saving-makes-this-content-analystedited-the':
    'Yadda saxlamaqla bu məzmun analitik tərəfindən redaktə edilmiş sayılır. Modul qeydində redaktə bayrağı yoxdur və bu endpoint audit izinə qeyd yazmır, ona görə də başqa yerlərdəki mənşə nişanı modulun ilkin olaraq necə yaradıldığını bildirməyə davam edir. Bunu məlum boşluq kimi qəbul edin, heç kimin ona toxunmadığının sübutu kimi yox.',
  'p.saving-marks-this-module-as-analystedited':
    'Yadda saxlamaq bu modulu həmin baxış üçün analitik tərəfindən redaktə edilmiş kimi işarələyir, beləliklə o, artıq maşın nəticəsi kimi təqdim olunmur. Modul qeydi onu hansı mühərrikin yaratdığını saxlayır, insanın onu yenidən yazıb-yazmadığını yox — nəyi dəyişdiyinizi qərar şərhində yazın, çünki audit izi məhz onu saxlayır.',
  'p.say-what-you-checked-this-is':
    'Nəyi yoxladığınızı yazın. Bu, qərarın qeydidir.',
  'p.say-why-the-closure-did-not':
    'Bağlanmanın niyə etibarlı sayılmadığını yazın. Bu riskdə adı çəkilən şəxslərdən yazdığınıza əsasən əlavə iş tələb oluna bilər.',
  'p.score-across-recent-events':
    'Son hadisələr üzrə bal',
  'p.score-points-added-or-removed-by':
    'Bütün heyət üzrə qeydə alınmış hadisələrin əlavə etdiyi və ya çıxardığı bal.',
  'p.score-you-must-reach':
    'Toplamalı olduğunuz bal',
  'p.scoring-has-not-run-for-this':
    'Bu iş üçün ballandırma hələ aparılmayıb, ona görə də onun risk səviyyəsi yoxdur.',
  'p.search-by-name-email-or-role':
    'Ad, e-poçt və ya rol üzrə axtarın',
  'p.search-by-run-id-threat-type':
    'İcra id-si, təhdid, növ və ya hökmə görə axtarın',
  'p.search-campaigns':
    'Kampaniyalarda axtar',
  'p.search-courses':
    'Kurs axtar',
  'p.search-intake':
    'Qəbulda axtar',
  'p.search-modules':
    'Modullarda axtar',
  'p.search-name-email-or-role':
    'Ad, e-poçt və ya vəzifə axtar',
  'p.search-people':
    'Şəxsləri axtar',
  'p.search-screens-and-actions':
    'Ekranlar və əməliyyatlarda axtarış',
  'p.search-the-directory':
    'Kataloqda axtar',
  'p.search-titles-references-and-descriptions':
    'Başlıqlar, istinadlar və təsvirlər üzrə axtarın',
  'p.search-titles-senders-artifact-text-reporters':
    'Başlıqlar, göndərənlər, artefakt mətni, bildirənlər üzrə axtarın…',
  'p.seeded-credentials-for-the-fictional-caspian':
    'Uydurma Caspian Dynamics təşkilatı üçün nümayiş məlumatı kimi hazırlanmış giriş məlumatları.',
  'p.select-at-least-one-person':
    'Ən azı bir şəxs seçin.',
  'p.sent-to-a-person-as-you':
    'Şəxsə yazdığınız kimi göndərilir. Kimsə cavab verənə qədər balınız dəyişmir.',
  'p.set-before-anything-you-did-and':
    'Siz hər hansı addım atmamışdan əvvəl təyin olunub və sizin haqqınızda mülahizə deyil.',
  'p.set-by-the-lure-source':
    'Tələ mənbəyi tərəfindən təyin olunur',
  'p.set-by-the-platform-not-by':
    'Bu brauzer tərəfindən deyil, platforma tərəfindən təyin olunur. Rolu dəyişmək başqa hesabla real giriş deməkdir.',
  'p.severity-is-set-when-a-finding':
    'Ciddilik tapıntı qaldırılarkən müəyyən edilir və vaxt keçdikcə yenidən hesablanmır.',
  'p.severityweighted-and-saturating-on-purpose-twent':
    'Ciddiliyə görə çəki verilib və qəsdən doyma həddinə çatır: iyirmi aşağı ciddilikli müşahidə bir kritik müşahidəyə bərabər tutulmamalıdır, çünki onlar eyni sübut deyil.',
  'p.shares-a-denominator-with-the-click':
    'Klik nisbəti ilə eyni məxrəcə malikdir, ona görə də ikisi birbaşa müqayisə oluna bilər.',
  'p.show-the-raw-artifact':
    'Emal olunmamış artefaktı göstərin',
  'p.shown-defanged-copying-gives-the-original':
    'Zərərsizləşdirilmiş formada göstərilir. Kopyalayanda orijinal dəyər alınır.',
  'p.shown-to-the-affected-employee-as':
    'Təsirə məruz qalan işçiyə əlaqə saxlanılacaq şəxs kimi göstərilir.',
  'p.shown-to-the-affected-employee-at':
    'Bütün məxfilik səviyyələrində təsirə məruz qalan işçiyə göstərilir.',
  'p.shown-to-the-employee-after-grading':
    'Qiymətləndirmədən sonra işçiyə göstərilir — cavab düz olsa da, səhv olsa da.',
  'p.since-the-run-reached-the-gate':
    'Axın təsdiq qapısına çatandan bəri',
  'p.someone-will-read-what-you-wrote':
    'Yazdıqlarınızı kimsə oxuyacaq və burada cavab verəcək.',
  'p.something-in-the-request-did-not':
    'Sorğuda nəsə yoxlamadan keçmədi. Sahənin adı aşağıda göstərilib.',
  'p.something-was-assigned-to-you':
    'Sizə bir tapşırıq təyin edildi',
  'p.source-address-not-recorded':
    'Mənbə ünvanı qeyd edilməyib',
  'p.sources-contacted':
    'Müraciət olunan mənbələr',
  'p.start-a-run-at-stage-one':
    'Axını birinci mərhələdən başladın',
  'p.start-with-the-navigation-rail-collapsed':
    'Naviqasiya paneli yığılmış vəziyyətdə açılsın',
  'p.state-how-the-criteria-above-were':
    'Yuxarıdakı meyarların necə ödəndiyini yazın. Auditorun oxuduğu məhz budur.',
  'p.static-analysis-and-dynamic-detonation-are':
    'Həm statik təhlil, həm də dinamik detonasiya mövcuddur.',
  'p.static-analysis-only-no-detonation-host':
    'Yalnız statik təhlil. Heç bir detonasiya hostu qoşulmayıb, ona görə buraya göndərilən heç nə icra olunmur — hesabatlar "təmiz" yox, "işə salınmayıb" yazır.',
  'p.static-forensic-analysis-of-a-file':
    'Faylın və ya URL-in statik məhkəmə-ekspertiza analizi — balın hər bir bəndinin arxasındakı əsaslandırma ilə birlikdə.',
  'p.still-loading-the-people-list-the':
    'Şəxslər siyahısı hələ yüklənir — say hələ yekun deyil.',
  'p.stored-as-typed-lowercased-and-underscored':
    'Yazıldığı kimi saxlanılır — kiçik hərflərlə və alt xətlərlə.',
  'p.stored-configuration':
    'Saxlanmış konfiqurasiya',
  'p.structured-observations':
    'Strukturlaşdırılmış müşahidələr',
  'p.subjects-accepted':
    'Qəbul edilən subyektlər',
  'p.subjects-whose-completion-a-reviewer-accepted':
    'Tamamlanması baxış aparan tərəfindən qəbul edilmiş subyektlərin bu riskə əlavə edilmiş subyektlərə nisbəti.',
  'p.submit-a-threat-into-the-loop':
    'Dövrəyə təhdid göndər',
  'p.submit-an-artifact-to-the-sandbox':
    'Sandbox-a artefakt təqdim et',
  'p.submit-and-grade':
    'Göndər və qiymətləndir',
  'p.submitted-url':
    'Göndərilən URL',
  'p.suggested-remediation':
    'Təklif olunan korrektiv tədbir',
  'p.summary-object-label-or-action':
    'Xülasə, obyekt etiketi və ya əməliyyat',
  'p.supplied-by-a-third-party-cyclowareness':
    'Üçüncü tərəf təqdim edib. Cyclowareness bunu ölçməyib.',
  'p.supplied-by-the-provider-shown-for':
    'Provayder tərəfindən təqdim edilib. Yalnız kontekst üçün göstərilir — bunlar uyğunlaşdırma deyil.',
  'p.suspicion-level':
    'Şübhə səviyyəsi',
  'p.synthetic-outcomes-written':
    'Yazılan sintetik nəticələr',
  'p.take-me-to-my-home-screen':
    'Məni ana ekranıma apar',
  'p.target-count-unavailable':
    'Hədəflərin sayı mövcud deyil',
  'p.targeting-has-been-released-the-decision':
    'Hədəfləmə buraxılıb. Qərar audit jurnalındadır.',
  'p.targets-are-now-open-for-outcome':
    'Hədəflər artıq nəticələrin qeydə alınmasına açıqdır.',
  'p.targets-who-reported-divided-by-every':
    'Bildiriş göndərən hədəflərin sayının nəticəyə çatan bütün hədəflərin sayına bölünməsi.',
  'p.team-or-department':
    'Komanda və ya şöbə',
  'p.techniques-mapped-from-findings-this-analysis':
    'Bu təhlilin verdiyi tapıntılardan uyğunlaşdırılan texnikalar. Hər sətir hansı siqnallardan çıxarıldığını göstərir, beləliklə uyğunlaşdırmanı olduğu kimi qəbul etmək əvəzinə yoxlamaq mümkündür.',
  'p.technologies-named-by-its-rules':
    'Qaydalarında adı çəkilən texnologiyalar',
  'p.tenant-migration-the-old-moodle-instance':
    'Tenant köçürülməsi — köhnə Moodle nüsxəsi istifadədən çıxarılır.',
  'p.that-change-no-longer-applies':
    'Həmin dəyişiklik artıq keçərli deyil',
  'p.the-analyze-stage-has-not-recorded':
    'ANALİZ mərhələsi bu artefakt üçün heç bir verdikt qeydə almayıb. Bu, təmiz nəticə demək deyil — onun barəsində heç bir qənaətə gəlinməyib.',
  'p.the-api-and-this-interface-are':
    'API və bu interfeys eyni origin üzərindən verilir, ona görə də originlərarası sorğu yoxdur və dövrə yayımı da eyni origindən gəlir.',
  'p.the-api-is-not-answering':
    'API cavab vermir',
  'p.the-api-returned-an-error-instead':
    'API məlumat əvəzinə xəta qaytardı. Bu, server tərəfindəki nasazlıqdır, sizin səhviniz deyil.',
  'p.the-api-returned-only-part-of':
    'API uyğunluq siyahısının yalnız bir hissəsini qaytardı, ona görə də uyğunluq sayları burada göstərilmir. Ona aid qeydə alınmış bütün uyğunluqları görmək üçün xəbərdarlığı açın.',
  'p.the-api-returned-only-part-of-2':
    'API uyğunluq siyahısının yalnız bir hissəsini qaytardı, ona görə bu xəbərdarlığın uyğunluqlarının hamısı görünmədi. Onları saymaq üçün xəbərdarlığı açın.',
  'p.the-advisories-on-this-screen-are':
    'Bu ekrandakı xəbərdarlıqlar bu quraşdırmada saxlanılan qeydlərdir. Siz bu ekrana baxdığınız müddətdə buradakı heç nə xarici mənbədən gətirilməyib.',
  'p.the-affected-employee-sees-the-incident':
    'Təsirə məruz qalmış işçi insidentin təsvirini və sübutu görür.',
  'p.the-affected-employees-are-not-shown':
    'Təsirə məruz qalan işçilərə nə baş verdiyi göstərilmir.',
  'p.the-affected-employees-see-the-full':
    'Təsirə məruz qalan işçilər tam təsviri görür.',
  'p.the-analyser-recorded-no-indicators-for':
    'Analizator bu artefakt üçün heç bir indikator qeyd etməyib. Bu, çıxarmanın baş tutmamasıdır, indikatorun olmadığına dair tapıntı deyil.',
  'p.the-analysis-stage-recorded-no-verdict':
    'Təhlil mərhələsi bu artefakt üçün heç bir verdikt qeydə almayıb. Onun barəsində heç bir nəticə çıxarılmayıb.',
  'p.the-analyzer-returned-no-behaviour-summary':
    'Analizator bu artefakt üçün davranış xülasəsi qaytarmadı.',
  'p.the-answer-did-not-save':
    'Cavab yadda saxlanmadı',
  'p.the-answer-key-was-not-included':
    'Cavab açarı bu məlumat paketinə daxil edilməyib, ona görə burada heç bir variant düzgün kimi işarələnmir.',
  'p.the-artifact-is-being-analysed-stage':
    'Artefakt analiz edilir. 3-cü mərhələ təsdiq qapısında dayanacaq.',
  'p.the-artifact-was-not-accepted':
    'Artefakt qəbul edilmədi',
  'p.the-assignment-did-not-go-through':
    'Tapşırığın verilməsi baş tutmadı. Heç nə tapşırılmadı.',
  'p.the-audience-is-recomputed-at-execution':
    'Auditoriya icra anında yenidən hesablanır. İndi ilə təsdiq arasında hər hansı risk balı dəyişsə və ya kiminsə statusu dəyişsə, siyahı bundan fərqli ola bilər.',
  'p.the-capability-endpoint-did-not-answer':
    'İmkanlar son nöqtəsi cavab vermədi',
  'p.the-change-and-its-reason-are':
    'Dəyişiklik və onun səbəbi audit izindədir.',
  'p.the-completion-time-was-not-recorded':
    'Tamamlanma vaxtı qeydə alınmayıb.',
  'p.the-connection-records-their-states-and':
    'Bağlantı qeydləri, onların vəziyyətləri və aşağıdakı hər əməliyyat realdır və auditdən keçir. Bu buraxılışa heç bir sinxronizasiya klienti daxil edilməyib, ona görə də bu səhifədəki heç nə provayderə çata bilməz — sinxronizasiya nəticə uydurmaq əvəzinə bunu açıq bildirir. Bu bağlantılara qoşulmuş kurs kataloqları isə nümayiş məlumatıdır.',
  'p.the-dashboard-did-not-answer-so':
    'İdarə paneli cavab vermədi, ona görə şöbələrin vəziyyəti göstərilə bilmir.',
  'p.the-dashboard-has-not-answered-yet':
    'İdarə paneli hələ cavab qaytarmayıb, ona görə heç nəyi ümumiləşdirmək mümkün deyil.',
  'p.the-decision-did-not-save':
    'Qərar yadda saxlanmadı',
  'p.the-decision-was-not-recorded':
    'Qərar qeydə alınmadı',
  'p.the-decision-was-not-recorded-nothing':
    'Qərar qeyd olunmadı. Heç nə dəyişmədi.',
  'p.the-decision-was-recorded-without-a':
    'Qərar şərh olmadan qeydə alınıb.',
  'p.the-delivery-route-this-lesson-teaches':
    'Bu dərsin öyrətdiyi çatdırılma yolu.',
  'p.the-departments-endpoint-returned-no-rollup':
    'Şöbələr endpointi bu şöbə üçün heç bir yekun göstərici qaytarmadı; bu, şöbədə aktiv işçi olmayanda baş verir.',
  'p.the-detail-of-this-incident-is':
    'Bu insidentin təfərrüatı məhdudlaşdırılıb və bu görünüşdə göstərilmir.',
  'p.the-directory-is-empty':
    'Kataloq boşdur',
  'p.the-download-did-not-complete':
    'Yükləmə tamamlanmadı.',
  'p.the-employee-sees-their-score-which':
    'İşçi öz balını, hansı suallara səhv cavab verdiyini və hər birinin izahını görür.',
  'p.the-employees-could-not-be-attached':
    'İşçiləri bağlamaq mümkün olmadı.',
  'p.the-employees-endpoint-returned-an-empty':
    'İşçilər endpointi boş heyət siyahısı qaytardı. İnsanlar burada yalnız təşkilat idxal ediləndən və ya demonstrasiya təşkilatı nümayiş məlumatı kimi yüklənəndən sonra görünür.',
  'p.the-engine-has-not-reached-a':
    'Mühərrik bu iş üçün hələ hökm verməyib.',
  'p.the-engine-reached-this-classification':
    'Bu təsnifata mühərrik gəlib.',
  'p.the-engine-stopped-partway-through-and':
    'Mühərrik yarı yolda dayandı və hökm vermədi. Nümunə hələ də karantindədir, ona görə də axın tam eyni baytlar üzərində təkrarlana bilər.',
  'p.the-extraction-request-failed':
    'Çıxarma sorğusu uğursuz oldu',
  'p.the-feed-item-was-not-pushed':
    'Lent elementi göndərilmədi',
  'p.the-finding-record-keeps-only-the':
    'Tapıntı yazısında yalnız ən son qeyd saxlanılır. Hər status dəyişikliyi, sahib dəyişikliyi və təlim tapşırığı baş verdiyi anda audit izinə yazılır.',
  'p.the-import-request-failed':
    'İdxal sorğusu uğursuz oldu.',
  'p.the-incident-narrative-and-the-evidence':
    'Bu səviyyədə insident təsviri və sübut təsirə məruz qalan işçidən gizli saxlanılır.',
  'p.the-integrations-layer-did-not-load':
    'İnteqrasiya qatı bu hostda yüklənmədi, ona görə də onun təsvir edəcəyi təyinat nöqtələri yox deyil, sadəcə naməlumdur.',
  'p.the-item-moved-to-another-state':
    'Bu əməliyyat serverə çatmamış element başqa vəziyyətə keçib — adətən ona görə ki, kimsə ondan əvvəl hərəkət edib. İndiki vəziyyəti görmək üçün səhifəni yeniləyin.',
  'p.the-job-failed-without-recording-a':
    'İş heç bir səbəb qeydə alınmadan uğursuz oldu.',
  'p.the-judgement-and-its-reason-are':
    'Verilən qərar və onun səbəbi audit izindədir.',
  'p.the-kernel-would-refuse-to-execute':
    'Kernel karantindəki faylı icra etməkdən imtina edərdi. Host qoşma nöqtələrindən oxunub, güman edilməyib.',
  'p.the-list-response-does-not-carry':
    'Siyahı cavabında subyektlərin sayı göstərilmir. Kimin əlaqələndirildiyini görmək üçün riski açın.',
  'p.the-loop-counts-could-not-be':
    'Dövrə sayları oxuna bilmədi. Xətanın tam mətni üçün Qapalı Dövrələr bölməsini açın.',
  'p.the-loop-has-been-released-to':
    'Dövrə hədəfləmə mərhələsinə buraxıldı.',
  'p.the-loops-analyze-stage-has-not':
    'Dövrənin ANALİZ mərhələsi bu artefakt üçün qərar yazmayıb. Bu, təmiz nəticə demək deyil — onunla bağlı heç bir nəticəyə gəlinməyib.',
  'p.the-loops-analyze-stage-runs-the':
    'Dövrənin ANALYZE mərhələsi bu artefaktın mətni üzərində platforma analizatorunu işə salır. O, sandbox işi yaratmır və bu quraşdırmada təhdid qeydi ilə belə bir iş arasında heç bir bağlantı qeydə alınmır — ona görə də burada heç bir detonasiya hökmü iddia olunmur.',
  'p.the-match-named-this-policy-but':
    'Uyğunluqda bu siyasətin adı çəkilib, lakin onun daxilindəki heç bir konkret qayda göstərilməyib.',
  'p.the-match-supplies-the-policy-the':
    'Siyasəti, şöbələri, şəxsləri və etibarlılıq dərəcəsini uyğunluğun özü təmin edir.',
  'p.the-mean-behaviourrisk-score-across-active':
    'Aktiv işçilər üzrə orta davranış riski balı: rol üzrə baza dəyəri, üstəgəl təhdid onlara çatanda hər kəsin nə etdiyi.',
  'p.the-mean-current-risk-score-of':
    'Heyət siyahısındakı hər bir şəxsin cari risk balının orta göstəricisi.',
  'p.the-mean-of-20-role-sensitivity':
    'İşçi siyahısı üzrə 20 + rol həssaslığı × 20 ifadəsinin ortalaması.',
  'p.the-mean-of-every-current-risk':
    'Heyət siyahısındakı bütün cari risk ballarının orta qiymətidir.',
  'p.the-measurement-window-is-set-by':
    'Ölçmə pəncərəsini server təyin edir və onu hər göstərici ilə birlikdə bildirir.',
  'p.the-module-could-not-be-created':
    'Modul yaradıla bilmədi.',
  'p.the-module-is-marked-rejected-and':
    'Modul rədd edilmiş kimi işarələnir və axın baxış nəticəsində uğursuz sayılaraq bağlanır. Heç kimə heç nə tapşırılmır və axın bu ekrandan yenidən açıla bilməz.',
  'p.the-module-was-rejected-and-the':
    'Modul rədd edildi və icra bağlandı.',
  'p.the-note-is-not-attributed-the':
    'Qeydin müəllifi göstərilməyib — tapıntı yenidən açıqdır.',
  'p.the-one-sentence-the-employee-is':
    'İşçiyə qalan yeganə cümlə.',
  'p.the-oneparagraph-summary-an-employee-sees':
    'İşçinin modulu açmazdan əvvəl gördüyü bir abzaslıq xülasə.',
  'p.the-organisation-or-tenant-identifier-the':
    'Provayderin sizi tanıdığı təşkilat və ya tenant identifikatoru.',
  'p.the-password-is-used-once-for':
    'Parol yalnız bir dəfə, bu axın üçün istifadə olunur və heç vaxt saxlanmır.',
  'p.the-person-this-account-acts-as':
    'Bu hesabın adından fəaliyyət göstərdiyi şəxs. Təlimi tamamladıqda onun risk balı dəyişir.',
  'p.the-platform-compared-it-against-the':
    'Platforma onu çıxarılmış siyasət qaydaları, təsdiqlənmiş proqram siyahısı və istifadədə olduğu qeyd edilən texnologiyalarla tutuşdurdu və heç bir kəsişmə tapmadı. Bu, təşkilatın təsirlənmədiyini bildirmir — bu, yalnız burada nəyin qeyd olunduğunu bildirir.',
  'p.the-platform-did-not-answer-the':
    'Platforma imkanlar sorğusuna cavab vermədi, ona görə də bu buraxılış hansı mühitlə əlaqə qurduğunu sizə deyə bilmir.',
  'p.the-platform-does-not-attribute-a':
    'Platforma risk balındakı dəyişikliyi insident riskinə aid etmir. Risk hadisələri onları yaradan dövrə axınını qeyd edir və heç bir insident istinadı daşımır, ona görə də burada dürüst rəqəm göstərmək mümkün deyil. Hər bir şəxsin balı və onun necə alındığı öz profilində göstərilir.',
  'p.the-provider-answered':
    'Provayder cavab verdi.',
  'p.the-provider-tenant-this-connection-would':
    'Bu bağlantının müraciət edəcəyi provayder tenantı.',
  'p.the-provider-was-not-contacted':
    'Provayderlə əlaqə saxlanılmayıb.',
  'p.the-publisher-did-not-attach-a':
    'İstehsalçı bu xəbərdarlığa CVSS balı əlavə etməyib.',
  'p.the-publisher-did-not-attach-a-2':
    'Nəşr edən tərəf CVSS balı əlavə etməyib.',
  'p.the-quarantine-is-not-mounted-noexec':
    'Karantin bu hostda noexec rejimində mount EDİLMƏYİB. Nümunələr təhlil zamanı heç vaxt icra olunmur, lakin mount özü bunu texniki olaraq təmin etmir.',
  'p.the-queues-could-not-be-read':
    'Növbələri oxumaq mümkün olmadı, ona görə bu siyahı iş yükünüzlə heç bir əlaqəsi olmayan səbəbdən boşdur.',
  'p.the-reason-is-on-the-audit':
    'Səbəb audit izindədir. Geri qaytarmaq üçün onu yenidən qiymətləndirin.',
  'p.the-reason-was-written-to-the':
    'Səbəb audit izinə yazıldı. Son sinxronizasiya qeydi dəyişməyib.',
  'p.the-records-for-each-of-these':
    'Bunların hər biri üçün qeydlər mövcuddur və API onları verir. Çatışmayan şey onları sənədə çevirən marşrutdur. Hər kart bu boşluğu düymənin arxasında gizlətmək əvəzinə açıq adlandırır.',
  'p.the-report-is-now-a-threat':
    'Bildiriş artıq təhdid qeydidir və artefakt analiz edilir.',
  'p.the-report-was-not-dismissed':
    'Hesabat rədd edilmədi',
  'p.the-report-was-not-pushed':
    'Hesabat ötürülmədi',
  'p.the-request-could-not-be-completed':
    'Sorğu tamamlana bilmədi',
  'p.the-request-did-not-complete-and':
    'Sorğu tamamlanmadı və səbəb bildirilmədi.',
  'p.the-request-took-too-long':
    'Sorğu həddindən artıq uzun çəkdi',
  'p.the-required-action-was-met-to':
    'Tələb olunan tədbir bu insidentin standartına uyğun yerinə yetirilib.',
  'p.the-reset-did-not-complete':
    'Sıfırlama tamamlanmadı',
  'p.the-resource-catalogue-could-not-be':
    'Resurs kataloqu yüklənə bilmədi, ona görə bu siyahı bu mövzu üzrə heç nəyin mövcud olmadığını bildirmir.',
  'p.the-reviewer-applies-this-bar-when':
    'Yoxlayıcı tamamlamanı qəbul edərkən bu həddi tətbiq edir. Test qiymətləndiricisinin bundan xəbəri yoxdur.',
  'p.the-risk-could-not-be-closed':
    'Risk bağlana bilmədi. Heç nə dəyişmədi.',
  'p.the-risk-could-not-be-opened':
    'Risk açıla bilmədi. Heç nə yadda saxlanmadı.',
  'p.the-risk-could-not-be-reopened':
    'Risk yenidən açıla bilmədi. Heç nə dəyişmədi.',
  'p.the-risk-engine-gave-no-reason':
    'Risk mühərriki bu şəxsin seçilməsi üçün heç bir səbəb göstərmədi.',
  'p.the-run-completed-and-produced-no':
    'İcra tamamlandı və heç bir davranış tapıntısı vermədi — nümunə elə bir hərəkət etmədi ki, işçi proses onu tanısın.',
  'p.the-run-this-artifact-started-its':
    'Bu artefaktın başlatdığı axın. Onun mərhələ tarixçəsi sonra baş verənlərin qeydidir.',
  'p.the-same-quarantined-bytes-are-being':
    'Karantinə alınmış eyni baytlar yenidən təhlil edilir.',
  'p.the-sample-is-quarantined-and-waiting':
    'Nümunə karantinə alınıb və işçi prosesi gözləyir.',
  'p.the-sandbox-did-not-report-its':
    'Sandbox öz imkanlarını bildirmədi. Hər hansı bir cavabı fərz etmək əvəzinə, onun əlçatanlığını naməlum sayın.',
  'p.the-sandbox-pipeline-this-deployment-runs':
    'Bu quraşdırmanın təqdim olunanları keçirdiyi sandbox emal zənciri.',
  'p.the-sender-address-the-subject-line':
    'Göndərənin ünvanı, mövzu sətri, keçid — əlinizdə nə varsa. Onu əvvəlcədən açmayın.',
  'p.the-server-did-not-accept-it':
    'Server bunu qəbul etmədi.',
  'p.the-server-downloads-the-content-and':
    'Server məzmunu endirir və geri gələni analiz edir. O, özəl, loopback və bulud-metaməlumat ünvanlarını yükləməkdən imtina edir və hansı qaydanın işə düşdüyünü bildirir.',
  'p.the-server-failed-on-this-request':
    'Server bu sorğunu yerinə yetirə bilmədi',
  'p.the-server-issued-a-new-token':
    'Server bu hesab üçün yeni token verdi.',
  'p.the-server-refused-this-change':
    'Server bu dəyişikliyi qəbul etmədi',
  'p.the-server-refused-this-decision':
    'Server bu qərarı rədd etdi',
  'p.the-server-refused-this-request-reloading':
    'Server bu sorğunu rədd etdi. Yenidən yükləməklə cavabın dəyişməsi ehtimalı azdır — serverin dediyi aşağıdadır.',
  'p.the-server-rejected-these-values':
    'Server bu dəyərləri rədd etdi',
  'p.the-server-returned-no-description-of':
    'Server nə etdiyi barədə heç bir təsvir qaytarmadı. Bülleten siyahısına yenilənmiş kimi yox, dəyişməmiş kimi baxın.',
  'p.the-server-took-the-request-but':
    'Server sorğunu qəbul etdi, lakin vaxtında cavab vermədi. Ehtimal ki, sıradan çıxmayıb, sadəcə məşğuldur — təkrar cəhd adətən nəticə verir.',
  'p.the-session-expired-or-was-signed':
    'Sessiyanın vaxtı bitib və ya başqa yerdən çıxış edilib. Qaldığınız yerdən davam etmək üçün yenidən daxil olun.',
  'p.the-share-of-people-who-acted':
    'Simulyasiya edilmiş tələyə uyan şəxslərin payı.',
  'p.the-share-who-recognised-a-lure':
    'Tələni tanıyıb bunu bildirənlərin payı. Bu, insan sensorudur.',
  'p.the-shell-reads-this-once-when':
    'Tətbiq bu seçimi yüklənərkən bir dəfə oxuyur, ona görə də seçim yan paneli indi dəyişmir, onun növbəti dəfə necə açılacağını müəyyən edir. Yan panelin aşağısındakı idarəetmə elementi paneli dərhal yığır və eyni seçimi yazır.',
  'p.the-signin-request-failed-before-the':
    'Giriş sorğusu server cavab verməmişdən əvvəl uğursuz oldu.',
  'p.the-single-behaviour-this-module-is':
    'Bu modulun tələb etdiyi yeganə davranış.',
  'p.the-source-did-not-list-affected':
    'Mənbə təsirə məruz qalmış məhsulları sadalamayıb.',
  'p.the-source-named-no-technique':
    'Mənbə heç bir texnika adı göstərmədi.',
  'p.the-source-published-no-indicators-with':
    'Mənbə bu bülletenlə birlikdə heç bir indikator dərc etməyib.',
  'p.the-source-published-no-references':
    'Mənbə heç bir istinad dərc etməyib.',
  'p.the-studio-has-no-generate-button':
    'Studiyada generasiya düyməsi yoxdur, çünki platformada studiya generatoru yoxdur. Modul yalnız bir yerdə yazılır: dövrə axınının çevrilmə mərhələsində, artıq təhlil edilmiş təhdiddən. Məhz bu, hər modulun kiminsə yazdığı prompta deyil, real artefakta qədər izlənə bilməsini təmin edir.',
  'p.the-threat-record-does-not-carry':
    'Təhdid qeydi bu cümləni yazan mühərriki saxlamır, ona görə onun necə hazırlandığı barədə heç bir iddia irəli sürülmür.',
  'p.the-ticket-or-case-this-came':
    'Bunun gəldiyi tiket və ya iş. Audit izi hər qeydi məhz bununla etiketləyir.',
  'p.the-training-assignment-was-refused':
    'Təlim tapşırığı rədd edildi',
  'p.the-vendor-that-produced-the-platform':
    'Platformanı hazırlayan istehsalçı. Onu işlədən təşkilat insident qeydlərində ayrıca göstərilir.',
  'p.the-window-for-taking-it-closed':
    'Onu keçmək üçün nəzərdə tutulan vaxt bitib. Dərs aşağıdadır və hələ də oxumağa dəyər; yenidən təyin olunmasına ehtiyacınız varsa, təhlükəsizlik komandasına müraciət edin.',
  'p.there-is-not-enough-measured-activity':
    'Bu dövrü ümumiləşdirmək üçün kifayət qədər ölçülmüş fəaliyyət yoxdur.',
  'p.these-are-the-current-rollups-for':
    'Bunlar bu icranın seçim apardığı şöbələrin cari yekun göstəriciləridir. Onlar konteksdir, bu icranın nəticəsi deyil — hər icra üçün şöbə üzrə əvvəl-sonra ölçməsi qeydə alınmır.',
  'p.these-were-generated-not-observed-they':
    'Bunlar müşahidə edilməyib, yaradılıb. Bunlar nümayiş məlumatıdır.',
  'p.they-can-read-your-answer-on':
    'Onlar cavabınızı öz ekranlarında oxuya bilərlər.',
  'p.they-read-this-on-their-own':
    'Onlar bunu öz ekranlarında oxuyur. Audit izinə sizin adınızla yazılır.',
  'p.this-account-is-not-attached-to':
    'Bu hesab təşkilatdakı heç bir şəxsə bağlanmayıb, ona görə də onun öz risk balı yoxdur.',
  'p.this-analyzer-did-not-run-and':
    'Bu analizator işə düşmədi və heç bir səbəb qeydə almadı.',
  'p.this-analyzer-recorded-no-structured-observation':
    'Bu analizator həmin nümunə üçün heç bir strukturlaşdırılmış müşahidə qeydə almayıb.',
  'p.this-archive-is-encrypted-and-analysis':
    'Bu arxiv şifrələnib və təhlil parol gözləyərək dayanıb.',
  'p.this-artifact-carries-no-recipient-or':
    'Bu artefaktda alıcı və ya şöbə metadatası yoxdur, ona görə onun hara qədər çatdığı bilinmir.',
  'p.this-assignment-expired-before-the-quiz':
    'Bu tapşırığın müddəti test verilməmişdən əvvəl bitib, ona görə də bal yoxdur.',
  'p.this-assignment-has-not-been-completed':
    'Bu tapşırıq tamamlanmayıb, ona görə də bal yoxdur.',
  'p.this-assignment-was-never-completed-so':
    'Bu tapşırıq heç vaxt tamamlanmayıb, ona görə heç bir test qiymətləndirilməyib.',
  'p.this-browser-refused-to-store-the':
    'Bu brauzer seçimi yadda saxlamaqdan imtina etdi — məxfi rejim və ya dolmuş kvota. Seçim bu sessiya üçün qüvvədədir və səhifə yenidən yüklənəndə itəcək.',
  'p.this-build-talks-to-a-separate':
    'Bu qurulma ayrıca API hostu ilə əlaqə saxlayır.',
  'p.this-content-is-now-analystedited':
    'Bu məzmun artıq analitik tərəfindən redaktə olunub.',
  'p.this-deployment-did-not-describe-the':
    'Bu quraşdırma sənədin çıxarılma vəziyyətini bildirməyib.',
  'p.this-deployment-did-not-record-where':
    'Bu quraşdırma rəqəmin haradan gəldiyini qeyd etməyib.',
  'p.this-deployment-did-not-report-its':
    'Bu quraşdırma inteqrasiya matrisini bildirmədi, ona görə nümunənin hara gedəcəyinə burada cavab verilə bilmir.',
  'p.this-deployment-reports-demo-mode-so':
    'Bu quraşdırma demo rejimini bildirir, ona görə nümayiş məlumatı kimi yaradılmış hesablar birbaşa təklif olunur. Hər düymə platformada real giriş həyata keçirir.',
  'p.this-expired-before-it-was-finished':
    'Tamamlanmadan vaxtı bitib',
  'p.this-finding-is-in-a-state':
    'Bu tapıntı elə vəziyyətdədir ki, API oradan başqa vəziyyətə keçməyə icazə vermir. Burada heç nə dəyişdirilə bilməz.',
  'p.this-finding-is-not-about-a':
    'Bu tapıntı versiya ilə bağlı deyil. Onun üçün nə təsirlənən, nə təsdiqlənmiş, nə də tövsiyə olunan versiya qeyd edilib.',
  'p.this-finding-is-not-tied-to':
    'Bu tapıntı heç bir siyasətə bağlı deyil. O, platformanın aşkarladığı zəif nöqtəni təsvir edir — həmin nöqtəni üzləşdirib yoxlamaq üçün heç bir sənəd yoxdur.',
  'p.this-finding-names-no-employees-and':
    'Bu tapıntı heç bir işçinin adını çəkmir, API isə siyahının açıq şəkildə göstərilməsini tələb edir. Bu ekrandan tapşırılacaq heç kim yoxdur — əvvəlcə təsirə məruz qalan insanları tapıntıda qeyd edin.',
  'p.this-host-cannot-report-whether-the':
    'Bu host karantinin noexec ilə qoşulub-qoşulmadığını bildirə bilmir.',
  'p.this-id-no-longer-resolves-to':
    'Bu id artıq heç bir işçi qeydinə uyğun gəlmir.',
  'p.this-is-an-automated-first-pass':
    'Bu, avtomatlaşdırılmış ilkin baxışdır. Sonra nə olacağına analitik qərar verir.',
  'p.this-is-derived-from-the-riskevent':
    'Bu, tapşırıq siyahısından deyil, risk hadisələri izindən çıxarılıb. Platforma hər işçi üzrə ayrıca tapşırıq və ya kampaniya endpointi təqdim etmir, ona görə də hələ hadisə yaratmamış, icra gözləyən tapşırıq burada görünmür.',
  'p.this-is-no-longer-assigned-to':
    'Bu, artıq sizə təyin edilmir.',
  'p.this-is-sent-to-a-person':
    'Bu, şəxsə yazdığınız kimi göndərilir.',
  'p.this-is-the-module-exactly-as':
    'Bu, işçinin gördüyü modulun eynisidir — üzərinə cavab açarı əlavə edilib.',
  'p.this-is-the-number-the-product':
    'Məhsul öz iddiasını məhz bu rəqəmin üzərində qurur, ona görə də ölçmə şərti sətiraltı qeyd deyil, tərifin bir hissəsidir.',
  'p.this-is-the-only-risk-figure':
    'Proqramın işlədiyinə sübut kimi oxuna bilən yeganə risk göstəricisi budur. Kompozit bal təlim sadəcə tamamlandıqda da düşür, ona görə kompozitdəki düşmə modulların sadəcə təyin edildiyindən başqa heç nə ifadə etməyə bilər.',
  'p.this-job-did-not-record-which':
    'Bu iş hansı səviyyələrin işlədiyini qeyd etməyib. Aşağıdakı tapıntılara tam mənzərə kimi deyil, natamam kimi yanaşın.',
  'p.this-member-has-not-finished-analysis':
    'Bu üzvün təhlili hələ bitməyib.',
  'p.this-module-carries-no-questions-so':
    'Bu modulda sual yoxdur, ona görə onu tamamlamaq mövzunun mənimsənildiyi barədə heç nəyi sübut etmir.',
  'p.this-module-carries-no-quiz':
    'Bu modulda test yoxdur.',
  'p.this-module-has-no-lesson-sections':
    'Bu modul üçün heç bir dərs bölməsi qeyd edilməyib.',
  'p.this-module-has-no-lesson-sections-3':
    'Bu modulda dərs bölmələri yoxdur. İşçi onu açsa, yalnız testlə qarşılaşacaq.',
  'p.this-module-has-no-quiz-an':
    'Bu modulun testi yoxdur. Onu daşıyan tapşırıq tamamlana bilməzdi.',
  'p.this-module-has-no-quiz-it':
    'Bu modulun testi yoxdur. İşçi onu tamamlaya bilməz.',
  'p.this-module-has-no-sections-to':
    'Bu modulda redaktə ediləcək bölmə yoxdur.',
  'p.this-module-has-no-sections-add':
    'Bu modulda bölmə yoxdur. Yadda saxlamazdan əvvəl ən azı bir bölmə əlavə edin.',
  'p.this-module-has-no-sections-an':
    'Bu modulun bölmələri yoxdur. İşçi onu açsa, oxumağa heç nə tapmayacaq.',
  'p.this-module-is-not-linked-to':
    'Bu modul heç bir siyasət sənədinə bağlanmayıb. Bu quraşdırma modulun hansı təhdid əsasında hazırlandığını qeyd edir, lakin təlim məzmununa siyasət bağlamır.',
  'p.this-person-has-no-recorded-score':
    'Bu şəxsin qeydə alınmış balı yoxdur. Tələb olunan işdə test olmaya bilər.',
  'p.this-persons-current-score-could-not':
    'Bu şəxsin cari balı oxuna bilmədi.',
  'p.this-record-does-not-exist-it':
    'Bu qeyd mövcud deyil. O, silinmiş ola bilər və ya keçid başqa mühiti göstərə bilər.',
  'p.this-report-has-a-status-this':
    'Bu bildirişin statusunu bu ekran tanımır.',
  'p.this-risk-is-closed-reopen-it':
    'Bu risk bağlanıb. Yeni şəxslər əlavə etməzdən əvvəl onu yenidən açın.',
  'p.this-role-has-no-analyst-surfaces':
    'Bu rolun analitik ekranları yoxdur. Onun dünyası portaldır.',
  'p.this-role-has-no-surfaces-assigned':
    'İcazə matrisində bu rola heç bir ekran təyin edilməyib. Bu, burada həll edə biləcəyiniz məsələ deyil, konfiqurasiya problemidir — hesabı quran şəxsə müraciət edin.',
  'p.this-run-has-already-left-the':
    'Bu axın artıq qapıdan keçib. Aşağıdakı qeyd yalnız oxumaq üçündür.',
  'p.this-run-has-no-threat-attached':
    'Bu axına təhdid qoşulmayıb, ona görə də nəzərdən keçiriləsi artefakt yoxdur. Onu təsdiqləmək arxasında heç nə olmayan dövrəni irəli aparmaq demək olardı.',
  'p.this-run-has-not-been-measured':
    'Bu axın ölçülməyib. Burada sıfırlar əvəzinə heç nə göstərilmir: onun üçün nə tamamlanma faizi, nə bal, nə də risk dəyişməsi hesablanıb.',
  'p.this-run-produces-a-training-module':
    'Bu axın təlim modulu yaradır. Bu quraşdırmada dövrə axınına heç bir simulyasiya tələsi əlavə edilmir — simulyasiya kampaniyaları ayrıca, Simulyasiyalar bölməsində qurulur.',
  'p.this-score-has-never-been-recalculated':
    'Bu bal heç vaxt yenidən hesablanmayıb — sizin barənizdə heç bir hadisə qeydə alınmayıb.',
  'p.this-score-is-not-asserted-it':
    'Bu bal iddia edilmir, hesablanır. O, vəzifənin nə qədər həssas olmasına görə təyin edilən başlanğıc səviyyədən başlayır və mühərrikin o vaxtdan bəri qeydə aldığı hər siqnal onu dəyişir. Aşağıdakı sütunu toplasanız, bu səhifənin yuxarısındakı rəqəmi alarsınız.',
  'p.this-source-has-not-answered-yet':
    'Bu mənbə hələ cavab verməyib',
  'p.this-verdict-came-from-a-keyword':
    'Bu hökm dil modelindən deyil, bu quraşdırmada işləyən, açar sözləri və indikatorları çıxaran vasitədən gəlib. Bu, ilkin baxışdır, qərar deyil.',
  'p.this-view-is-served-one-figure':
    'Bu görünüşə hər şöbə üçün yalnız bir rəqəm — hazırkı orta göstərici — və bütün təşkilat üzrə bir zaman sırası verilir. Şöbələr üzrə fərqi hesablamağa imkan verən saxlanılmış tarixçə yoxdur, ona görə də heç bir şöbəni vicdanla ən çox irəliləyən şöbə adlandırmaq olmaz.',
  'p.threat-and-run-records-are-analystscoped':
    'Təhdid və icra qeydləri analitik səlahiyyətinə aiddir. Yuxarıdakı bağlanmış dövrə sayının arxasında duran icraları təhlükəsizlik komandasından soruşun.',
  'p.threat-or-module-title':
    'Təhdidin və ya modulun adı',
  'p.time-spent-was-not-recorded-for':
    'Bu tapşırıq üçün sərf olunan vaxt qeydə alınmayıb.',
  'p.title-or-description':
    'Başlıq və ya təsvir',
  'p.title-topic-or-behaviour':
    'Başlıq, mövzu və ya davranış',
  'p.total-moved-by-behaviour':
    'Davranış hesabına ümumi dəyişmə',
  'p.trail-window':
    'İz aralığı',
  'p.training-completion':
    'Təlimin tamamlanması',
  'p.training-completion-rate':
    'Təlimin tamamlanma nisbəti',
  'p.training-content-not-generated-yet':
    'Təlim məzmunu hələ yaradılmayıb',
  'p.triaging-a-report-requires-the-analyst':
    'Bildirişin triajı analitik rolu tələb edir. Bu hesab növbəni yalnız oxuya bilər.',
  'p.truncated-by-the-server-the-excerpt':
    'Server tərəfindən kəsilib. Bu çıxarış insanın oxuması üçündür, tamlıq üçün deyil.',
  'p.two-or-more-events-are-needed':
    'Xətt çəkmək üçün ən azı iki hadisə lazımdır',
  'p.urls-one-per-line':
    'URL-lər, hər sətirdə bir dənə',
  'p.unclassified':
    'Təsnifatsız',
  'p.update-time-not-recorded':
    'Yenilənmə vaxtı qeyd olunmayıb',
  'p.upload-a-file-or-submit-a':
    'Yuxarıda fayl yükləyin və ya URL təqdim edin. Hər təqdimat növbəyə düşdüyü an burada görünür və mühərrik onu emal etdikcə yenilənir.',
  'p.user-agent-not-recorded':
    'İstifadəçi agenti qeyd olunmayıb',
  'p.version-history-is-not-recorded-for':
    'Modullar üçün versiya tarixçəsi hələ saxlanmır. Redaktə yadda saxlanmış məzmunun üzərinə yazır və heç bir əvvəlki variant qalmır — beləliklə, nə müqayisə ediləcək, nə də geri qayıdılacaq bir şey olur. Siyasətlər versiyalanır, modullar isə yox.',
  'p.version-recorded-here':
    'Burada qeydə alınan versiya',
  'p.waiting-for-a-human-decision-no':
    'İnsan qərarı gözlənilir. Qərar verilənə qədər nə hədəfləmə, nə də təlim baş vermir.',
  'p.what-configuring-a-source-would-do':
    'Mənbənin konfiqurasiya edilməsi nəyi dəyişərdi',
  'p.what-happened':
    'Nə baş verdi',
  'p.what-happened-2':
    'Nə baş verdi?',
  'p.what-it-contains':
    'Nələri əhatə edir',
  'p.what-made-you-suspicious-or-what':
    'Sizdə şübhə oyadan nə oldu və ya artıq nə etdiniz.',
  'p.what-people-have-done-is-currently':
    'İnsanların etdikləri hazırda təşkilatı təkcə rollarının onu yerləşdirəcəyi səviyyədən aşağı çəkir.',
  'p.what-the-engine-got-right-or':
    'Mühərrikin nəyi düzgün, nəyi səhv tapdığı — müraciətdə yazacağınız sözlərlə.',
  'p.what-the-engine-reported':
    'Mühərrikin bildirdikləri',
  'p.what-the-evidence-shows-it-can':
    'Sübutun göstərdiyinə görə nə edə bilir',
  'p.what-the-incident-actually-found-empty':
    'İnsidentin əslində nə aşkarladığı. Risk açılanda boş sətirlər saxlanılmır.',
  'p.what-they-wrote':
    'Onun yazdığı',
  'p.what-this-connection-is-called-on':
    'Bu bağlantının inteqrasiyalar ekranındakı adı.',
  'p.what-to-do-next':
    'Bundan sonra nə etməli',
  'p.what-you-checked-what-you-changed':
    'Nəyi yoxladığınız, nəyi dəyişdiyiniz və ya onda nəyin səhv olduğu.',
  'p.what-your-role-covers':
    'Rolunuzun əhatə etdikləri',
  'p.where-the-organisation-would-sit-if':
    'Heç kim heç nə etməsəydi, təşkilatın hansı səviyyədə olacağı.',
  'p.who-is-accountable-for-closing-it':
    'Onun bağlanmasına kim cavabdehdir. İstəyə bağlıdır.',
  'p.who-the-incident-named-they-are':
    'İnsidentin adını çəkdiyi şəxslər. Onlar riskə bağlanır; tələb olunan iş isə ayrıca, riskin özündən tapşırılır.',
  'p.why-do-you-think-this-was':
    'Sizcə, bu niyə səhvən təyin edilib?',
  'p.why-is-this-being-disabled':
    'Bu nə üçün söndürülür',
  'p.why-this-does-not-need-to':
    'Bunun niyə analitikin diqqətində qalmasına ehtiyac olmadığı.',
  'p.why-this-rule-is-being-rejected':
    'Bu qayda nə üçün rədd edilir',
  'p.widen-the-search-choose-another-department':
    'Siyahının qalan hissəsini görmək üçün axtarışı genişləndirin, başqa şöbə seçin və ya risk zolağını təmizləyin.',
  'p.with-a-match-against-us':
    'Bizə uyğunluğu olanlar',
  'p.with-a-model':
    'Model ilə',
  'p.with-no-match-behind-it-the':
    'Arxasında uyğunluq olmadığı üçün tapıntının nə etibarlılıq dəyəri, nə siyasəti, nə də adı çəkilən şəxsləri var.',
  'p.withdraw-the-plan':
    'Planı geri götür',
  'p.work-email-on-the-account':
    'Hesabdakı iş e-poçtu',
  'p.would-be-graded-quizzes-at-or':
    'Keçid balına bərabər və ya ondan yuxarı qiymətləndirilmiş testlərin qiymətləndirilmiş testlərə nisbəti olardı.',
  'p.would-be-the-median-time-from':
    'Tələnin çatdırılmasından bildirişin qeydə alınmasına qədər olan median vaxt olardı.',
  'p.write-synthetic-outcomes':
    'Sintetik nəticələr yaz',
  'p.written-by-a-language-model-no':
    'Dil modeli tərəfindən yazılıb. Mətni heç bir insan redaktə etməyib.',
  'p.written-for-the-record-depending-on':
    'Qeyd üçün yazılıb. Aşağıdakı məxfilik səviyyəsindən asılı olaraq, təsirə məruz qalmış işçi bunu oxuya bilər.',
  'p.you-are-editing-the-content-an':
    'Siz işçiyə tapşırıq kimi veriləcək məzmunu redaktə edirsiniz. Siz deməyincə heç nə yadda saxlanmır.',
  'p.you-can-reach-every-one-of':
    'İçəri girdikdən sonra bu ekranların hər birinə naviqasiyadan keçə bilərsiniz.',
  'p.you-contested-this-nobody-has-answered':
    'Buna etiraz etdiniz. Hələ heç kim cavab verməyib.',
  'p.you-do-not-have-access-to':
    'Buna girişiniz yoxdur',
  'p.you-have-already-completed-this':
    'Siz bunu artıq tamamlamısınız',
  'p.your-assigned-training-the-work-raised':
    'Sizə təyin edilmiş təlimlər, adınıza açılmış işlər və risk balınızın necə hesablandığı.',
  'p.your-individual-answers-were-graded-and':
    'Fərdi cavablarınız qiymətləndirilib və sonra silinib — yalnız bal saxlanılıb, ona görə də bu ekran hansı suallarda səhv etdiyinizi göstərə bilmir.',
  'p.your-role-can-read-intelligence-but':
    'Sizin rolunuz kəşfiyyat məlumatlarını oxuya bilər, lakin platformadan mənbələri yoxlamağı tələb edə bilməz.',
  'p.your-role-can-read-intelligence-but-2':
    'Rolunuz təhdid kəşfiyyatını oxuya bilər, lakin onu qiymətləndirə, rədd edə və ya onun əsasında tapıntı yarada bilməz.',
  'p.your-role-can-read-this-module':
    'Rolunuz bu modulu oxuya bilir, lakin dəyişə bilmir. Təlim məzmununu redaktə etmək üçün müəlliflik icazəsi tələb olunur.',
  'p.your-role-can-read-this-queue':
    'Rolunuz bu növbəni oxuya bilir, lakin onun barəsində qərar verə bilmir. Analitik hərəkətə keçməlidir.',
  'p.your-role-can-read-this-review':
    'Rolunuz bu baxışı oxuya bilər, lakin qərar qeydə ala bilməz.',
  'p.your-role-cannot-read-sandbox-analyses':
    'Rolunuz sandbox analizlərini oxumağa imkan vermir, ona görə də burada ixrac təklif olunmur. Bu faylları analitik sandbox bölməsindən hazırlaya bilər.',
  'p.your-role-cannot-read-the-report':
    'Rolunuz bildiriş növbəsini oxuya bilmir, ona görə də bu şəxsin bildirişləri burada göstərilə bilməz. Bildirişə görə yazılan bal isə hadisə izində yenə də görünür.',
  'p.your-role-does-not-include-this':
    'Rolunuz bu görünüşü əhatə etmir. Ehtiyacınız varsa, administrator bu icazəni verə bilər.',
  'p.your-session-has-ended':
    'Sessiyanız başa çatıb',
  'p.your-system-asks-for-reduced-motion':
    'Sisteminiz azaldılmış hərəkət tələb edir və bu məhsul buna riayət edir.',
  'p.your-system-does-not-ask-for':
    'Sisteminiz azaldılmış hərəkət tələb etmir.',
  'p.zero-to-100-lower-is-safer':
    'Sıfırdan 100-ə qədər. Aşağı olması daha təhlükəsizdir. Bu, heyət siyahısının müəyyən andakı xassəsidir, pəncərə üzrə hesablanmış göstərici deyil.',
  'p.httpsexamplecominvoicezip':
    'https://example.com/invoice.zip',
  'p.httpsexampleinstructurecom':
    'https://example.instructure.com',
  'p.verifypaymentchange':
    'verify_payment_change',
  'p.err-not-found':
    'Tapılmadı',
  'h.assigned-to-you':
    'Sizə təyin olunub',
  'h.waiting-at-the-gate':
    'Təsdiq gözləyir',
  'h.active-loops':
    'Aktiv dövrələr',
  'h.open-incident-risks':
    'Açıq insident riskləri',
  'h.running-simulations':
    'İşləyən simulyasiyalar',
  'h.sandbox-analyzers':
    'Sandbox analizatorları',
  'h.approval-items-naming-you':
    'Adınızı çəkən təsdiq elementləri',

  // --- wired from the parked work-list ------------------------------------
  'p.a-chat-or-messaging-app':
    'Söhbət və ya mesajlaşma tətbiqi',
  'p.a-reviewer-discarded-these-they-were':
    'Yoxlayan bunları rədd etdi. Onlar heç vaxt qüvvədə olmayıb.',
  'p.an-analyst-reviewed-it-and-decided':
    'Analitik onu nəzərdən keçirib və heç bir tədbirə ehtiyac olmadığı qərarına gəlib. Buna baxmayaraq, onu bildirmək düzgün addım olub.',
  'p.an-analyst-took-it-forward-it':
    'Analitik onu irəli apardı. O, real təhdid qeydinə çevrildi və dövrə axını başlatdı.',
  'p.an-employee-reported-this-and-an':
    'Bunu bir işçi bildirib, analitik isə dövrəyə ötürüb.',
  'p.analyzers-reported-ready-by-the-sandbox':
    'Sandbox tərəfindən hazır bildirilən analizatorlar',
  'p.continue-with-microsoft':
    'Microsoft ilə davam et',
  'p.duration-not-measured':
    'Müddət ölçülməyib',
  'p.dynamic-detonation-did-not-run':
    'Dinamik detonasiya işə düşmədi',
  'p.dynamic-detonation-ran':
    'Dinamik detonasiya icra olunub',
  'p.employment-status-is-not-returned-by':
    'İşçilər son nöqtəsi məşğulluq statusunu qaytarmır, ona görə də status sütunu göstərilmir.',
  'p.endorsed-held-for-a-second-approver':
    'Dəstəklənib, ikinci təsdiqləyən üçün saxlanılır',
  'p.findings-that-matter-but-not-enough':
    'Əhəmiyyətli tapıntılar var, lakin onu zərərli adlandırmaq üçün onların sayı kifayət etmir. Qərarı analitik verir.',
  'p.lowers-the-risk-score':
    'Risk balını aşağı salır',
  'p.nothing-found-reached-the-threshold-to':
    'Aşkarlananların heç biri bu nümunəni işarələmək üçün lazım olan həddə çatmadı.',
  'p.nothing-is-checked-against-these-a':
    'Bunların əsasında heç nə yoxlanılmır. Maşın təklif edə bilər; yalnız insan aktivləşdirə bilər və aktivləşdirmə versiyanın anlıq surətini yazır.',
  'p.open-findings-at-critical-or-high':
    'Kritik və ya yüksək ciddilikdə açıq tapıntılar',
  'p.proposed-awaiting-a-human':
    'Təklif edilib — insan qərarı gözlənilir',
  'p.raises-the-risk-score':
    'Risk balını qaldırır',
  'p.refused-by-the-firewall':
    'Firewall tərəfindən rədd edilib',
  'p.replaced-by-a-later-rule-kept':
    'Sonrakı qayda ilə əvəz olunub. Köhnə tapıntının istinad etdiyi qayda hələ də tapıla bilsin deyə saxlanılır.',
  'p.reported-by-an-employee':
    'İşçi tərəfindən bildirilib',
  'p.runs-waiting-at-the-human-approval':
    'İnsan təsdiq qapısında gözləyən axınlar',
  'p.single-signon-and-directory-sync-neither':
    'Vahid giriş və kataloq sinxronizasiyası. Heç biri burada qoşulmayıb: bu quraşdırma öz istifadəçi cədvəli üzərindən autentifikasiya aparır.',
  'p.static-analysis-did-not-run':
    'Statik təhlil işə düşmədi',
  'p.submitted-by-an-analyst':
    'Analitik tərəfindən təqdim edilib',
  'p.submitted-directly-by-an-analyst-on':
    'Bu ekranda analitik tərəfindən birbaşa göndərilib.',
  'p.take-me-to-my-training':
    'Məni təlimimə apar',
  'p.take-me-to-the-command-center':
    'Məni Komanda Mərkəzinə apar',
  'p.take-me-to-the-executive-view':
    'Məni Rəhbər Görünüşünə apar',
  'p.taken-from-the-curated-intel-feed':
    'Seçilmiş kəşfiyyat lentindən analitik tərəfindən götürülüb.',
  'p.the-evidence-is-sufficient-to-call':
    'Sübutlar bunu zərərli hesab etmək üçün kifayətdir. Buna əsas verən tapıntılar aşağıda sadalanıb.',
  'p.the-loop-stops-here-a-named':
    'Dövrə burada dayanır. Adı bəlli olan analitik yaradılan məzmunu oxuyur və hər hansı material həmkarına yönəldilməzdən əvvəl qərar verir. Bu xətti heç nə öz-özünə keçmir.',
  'p.the-rules-this-organisation-is-actually':
    'Bu təşkilatın bu gün həqiqətən yoxlanıldığı qaydalar.',
  'p.the-server-returned-a-full-page':
    'Server tam bir səhifə qaytardı, ona görə də buradakı hər say yalnız aşağı həddir.',
  'p.waiting-for-a-decision':
    'Qərar gözlənilir',
  'p.waiting-for-an-analyst-to-read':
    'Analitikin onu oxumasını gözləyir.',
  'p.where-approved-training-would-be-delivered':
    'Təsdiqlənmiş təlimin harada çatdırılacağı və tamamlamaların harada geri oxunacağı — ölçmə etibar üzərində qurulmasın deyə.',
  'p.written-by-a-template':
    'Şablonla yazılıb',
  'p.your-edits-are-written-to-the':
    'Redaktələriniz əvvəlcə modula yazılır və bu, onu analitik tərəfindən redaktə edilmiş kimi işarələyir.',
  'p.active':
    'Aktiv',
  'p.no-rules-on-this-policy':
    'Bu siyasətdə qayda yoxdur',
  'p.proposed':
    'Təklif olunub',
  'p.rejected':
    'Rədd edilib',
  'p.superseded':
    'Əvəzlənib',
  'p.activate':
    'Aktivləşdir',
  'p.location-in-the-document-was-not-recorded':
    'Sənəddəki yer qeyd edilməyib',
  'p.reject':
    'Rədd et',
  'p.reviewed-by-on':
    '{who} tərəfindən {when} tarixində baxılıb',
  'p.a-file-or-attachment':
    'Fayl və ya qoşma',
  'p.a-link-or-website':
    'Link və ya vebsayt',
  'p.a-text-message':
    'SMS mesajı',
  'p.an-email':
    'E-poçt',
  'p.analyst-submission':
    'Analitik göndərişi',
  'p.any-author':
    'İstənilən müəllif',
  'p.approved':
    'Təsdiqlənib',
  'p.avg-over-n':
    'orta {avg} · n={sample}',
  'p.clicked-the-lure':
    'Tələyə klikləyib',
  'p.comment':
    'Şərh',
  'p.continue-with-google':
    'Google ilə davam et',
  'p.curated-feed':
    'Seçilmiş lent',
  'p.delivered':
    'Çatdırılıb',
  'p.every-plan':
    'Bütün planlar',
  'p.human-approval-gate':
    'İnsan təsdiq qapısı',
  'p.human-sensor':
    'İnsan sensoru',
  'p.identity-providers':
    'Kimlik provayderləri',
  'p.ignored-it':
    'Məhəl qoymayıb',
  'p.learning-platforms':
    'Təlim platformaları',
  'p.no-risk-movement':
    'Risk dəyişmir',
  'p.open-findings':
    'açıq tapıntı',
  'p.open-findings-scanned':
    'skan edilmiş açıq tapıntı',
  'p.people':
    'nəfər',
  'p.person':
    'nəfər',
  'p.reported-the-lure':
    'Tələni bildirib',
  'p.required':
    'Məcburi',
  'p.revision-requested':
    'Düzəliş tələb olunub',
  'p.runs-held-at':
    '{stage} mərhələsində saxlanan axınlar',
  'p.static-analysis-ran':
    'Statik təhlil icra olunub',
  'p.threat-feed':
    'Təhdid lenti',
  'p.written-by-a-model':
    'Model tərəfindən yazılıb',
  'p.continue-with-sso':
    'SSO ilə davam et',
  'p.source-not-recorded':
    'Mənbə qeyd edilməyib',
  'p.available':
    'əlçatandır',
  'p.items-at-the-gate-in-total':
    'Ümumilikdə {count} element qapıdadır',
  'p.not-available':
    'əlçatan deyil',
  'p.open-findings-at-all-severities':
    'Bütün ciddilik səviyyələrində {count} açıq tapıntı',
  'p.unavailable-dynamic-detonation':
    '{count} əlçatmaz · dinamik detonasiya {state}',
  'p.people-risk-scores-are-current':
    '{count} {noun}. Risk balları mühərrikin cari dəyərləridir. ',
  'p.recent-movement-is-derived-from':
    'Son dəyişmə adı bəlli şəxsə aid edilə bilən ən son {count} risk hadisəsindən çıxarılıb; bu, tam tarixçə deyil.',

  's.ingest.label': 'Qəbul',
  's.ingest.hint': 'İnsan sensoru, lent, API',
  's.ingest.owner': 'Platforma',
  's.analyze.label': 'Təhlil',
  's.analyze.hint': 'Sandbox qərarı və IOC-lar',
  's.analyze.owner': 'Sandbox',
  's.convert.label': 'Çevirmə',
  's.convert.hint': 'Təhdid təhlükəsiz təlimə çevrilir',
  's.convert.owner': 'Süni intellekt',
  's.target.label': 'Hədəfləmə',
  's.target.hint': 'Həqiqətən risk altında olan insanlar',
  's.target.owner': 'Risk mühərriki',
  's.train.label': 'Təlim',
  's.train.hint': 'Çatdırılma və tamamlanma',
  's.train.owner': 'İşçi',
  's.measure.label': 'Ölçmə',
  's.measure.hint': 'Davranış, iştirak deyil',
  's.measure.owner': 'Platforma',
  's.feedback.label': 'Geri əlaqə',
  's.feedback.hint': 'Sübutlar modeli yeniləyir',
  's.feedback.owner': 'Risk mühərriki',
  'u.behaviour-over-time':
    'Davranışın zaman üzrə dəyişməsi',
  'u.about-this-deployment-2':
    'Bu quraşdırma haqqında',
  'u.approval-gate-2':
    'Təsdiq qapısı',
  'u.average-risk-score-0-100-worst-first-2':
    'Orta risk balı, 0–100 · ən pisdən başlayaraq',
  'u.back-to-intake-2':
    'Qəbula qayıdır',
  'u.clear-filters-2':
    'Filtrləri təmizlə',
  'u.command-palette-2':
    'Əmr paleti',
  'u.confidence-not-stated-2':
    'Etibarlılıq bildirilməyib',
  'u.demo-data-2':
    'Nümayiş datası',
  'u.every-screen-your-role-can-open-2':
    'Rolunuzun aça bildiyi bütün ekranlar.',
  'u.everything-in-the-shell-is-reachable-without-2':
    'İnterfeysdəki hər şeyə kursor olmadan çatmaq mümkündür.',
  'u.human-decision-required-2':
    'İnsan qərarı tələb olunur',
  'u.keyboard-shortcuts-2':
    'Klaviatura qısayolları',
  'u.loop-outcomes-2':
    'Dövrə nəticələri',
  'u.no-runs-here-2':
    'Burada axın yoxdur',
  'u.not-measured-2':
    'Ölçülməyib',
  'u.nothing-matches-the-palette-only-lists-screens-2':
    'Uyğun nəticə yoxdur. Palet yalnız rolunuzun aça bildiyi ekranları göstərir.',
  'u.read-from-the-running-server-not-from-2':
    'İşləyən serverdən oxunur, bildirişdən deyil.',
  'u.reset-the-demonstration-world-2':
    'Nümayiş mühitini sıfırla',
  'u.risk-by-department-2':
    'Bölmə üzrə risk',
  'u.risk-movement-by-department-2':
    'Bölmə üzrə riskin dəyişməsi',
  'u.risk-over-time-2':
    'Riskin zaman üzrə dəyişməsi',
  'u.sample-size-not-recorded-2':
    'Nümunə həcmi qeyd edilməyib',
  'u.training-completion-2':
    'Təlimin tamamlanması',
  'u.all-incident-risks':
    'Bütün insident riskləri',
  'u.all-simulations':
    'Bütün simulyasiyalar',
  'u.all-threats':
    'Bütün təhdidlər',
  'u.analyser-conclusion':
    'Analizatorun nəticəsi',
  'u.approve-with-edits':
    'Düzəlişlərlə təsdiqlə',
  'u.artifact-as-received':
    'Artefakt, alındığı kimi',
  'u.clear-stage-filter':
    'Mərhələ filtrini təmizlə',
  'u.click-rate':
    'Klik nisbəti',
  'u.close-the-risk':
    'Riski bağla',
  'u.completion-screen':
    'Tamamlama ekranı',
  'u.correct-answer':
    'Düzgün cavab',
  'u.discard-changes':
    'Dəyişiklikləri at',
  'u.discard-draft':
    'Qaralamanı at',
  'u.edit-content':
    'Məzmunu redaktə et',
  'u.escalation-is-not-available':
    'Eskalasiya mümkün deyil.',
  'u.forgot-password':
    'Parolu unutmusunuz',
  'u.full-audit-log':
    'Tam audit jurnalı',
  'u.generated-training':
    'Yaradılmış təlim',
  'u.go-to-training':
    'Təlimə keç',
  'u.headers-and-attachment-metadata':
    'Başlıqlar və qoşma metadatası',
  'u.held-for-a-second-approver':
    'İkinci təsdiqləyən üçün saxlanılıb',
  'u.incident-remediation-completion':
    'İnsident aradan qaldırılmasının tamamlanması',
  'u.items-appear-here-once-an-analyst-is':
    'Elementlər analitik təyin ediləndən sonra burada görünür. Təyin edilməmiş iş ümumi növbədə qalır.',
  'u.items-appear-here-when-a-loop-run':
    'Dövrə axını çevirməni bitirib hədəfləməyə buraxılması üçün insan gözləyəndə elementlər burada görünür.',
  'u.loading-the-employee-directory':
    'İşçi kataloqu yüklənir',
  'u.loading-this-screen':
    'Bu ekran yüklənir',
  'u.new-reports-to-triage':
    'Baxılmalı yeni bildirişlər',
  'u.no-approved-module-to-assign':
    'Təyin etmək üçün təsdiqlənmiş modul yoxdur',
  'u.no-campaign-is-running':
    'Heç bir kampaniya işləmir',
  'u.no-department-has-a-scored-population':
    'Heç bir bölmədə qiymətləndirilmiş heyət yoxdur',
  'u.no-object':
    'Obyekt yoxdur',
  'u.no-open-findings':
    'Açıq tapıntı yoxdur.',
  'u.no-provider-is-connected':
    'Heç bir provayder qoşulmayıb',
  'u.no-score':
    'Bal yoxdur',
  'u.no-threat-has-reached-targeting-yet':
    'Hələ heç bir təhdid hədəfləməyə çatmayıb',
  'u.not-derived':
    'Törədilməyib',
  'u.not-reported':
    'Bildirilməyib',
  'u.not-yet-analysed':
    'Hələ təhlil edilməyib',
  'u.nothing-has-been-changed-yet':
    'Hələ heç nə dəyişdirilməyib',
  'u.nothing-has-been-submitted':
    'Hələ heç nə göndərilməyib',
  'u.nothing-is-open':
    'Açıq heç nə yoxdur',
  'u.object-type':
    'Obyekt növü',
  'u.observed-behaviour':
    'Müşahidə edilən davranış',
  'u.open-high-risk-findings':
    'Yüksək riskli tapıntıları aç',
  'u.open-integrations':
    'İnteqrasiyaları aç',
  'u.open-review':
    'Baxışı aç',
  'u.open-risk':
    'Açıq risk',
  'u.open-simulations':
    'Simulyasiyaları aç',
  'u.open-the-findings-register':
    'Tapıntılar reyestrini aç',
  'u.open-the-full-sandbox-report':
    'Tam sandbox hesabatını aç',
  'u.open-threat-intake':
    'Təhdid qəbulunu aç',
  'u.page-size':
    'Səhifə həcmi',
  'u.policy-exposure':
    'Siyasət təsiri',
  'u.quiz-and-answer-key':
    'Test və cavab açarı',
  'u.report-rate':
    'Bildirmə nisbəti',
  'u.reported-by':
    'Bildirən',
  'u.request-revision':
    'Düzəliş tələb et',
  'u.require-a-second-approval':
    'İkinci təsdiq tələb et',
  'u.risk-type':
    'Risk növü',
  'u.sandbox-verdict':
    'Sandbox qərarı',
  'u.sanitisation-not-recorded':
    'Sanitarlaşdırma qeyd edilməyib',
  'u.save-content':
    'Məzmunu yadda saxla',
  'u.save-draft':
    'Qaralamanı yadda saxla',
  'u.seeded-demonstration-accounts':
    'Hazır nümayiş hesabları',
  'u.sign-in':
    'Daxil ol',
  'u.take-away':
    'Əsas nəticə',
  'u.threat-record':
    'Təhdid qeydi',
  'u.unsaved-edits-shown':
    'Yadda saxlanmamış düzəlişlər göstərilir',
  'u.waiting-at-the-approval-gate':
    'Təsdiq qapısında gözləyir',
  'u.what-discharges-this-risk':
    'Bu riski nə aradan qaldırır',
  'u.what-they-are-left-with':
    'Onlarda qalan təəssürat',
  'u.who-to-assign':
    'Kimə təyin etməli',
  'u.work-email':
    'İş e-poçtu',
  'u.your-role-can-read-this-queue-but':
    'Rolunuz bu növbəni oxuya bilər, lakin qərar verə bilməz.',
  'u.a-closed-loop-starts-from-an-artifact':
    'Qapalı dövrə artefaktdan başlayır',
  'u.add-evidence-row':
    'Sübut sətri əlavə et',
  'u.all-closed-loops':
    'Bütün qapalı dövrələr',
  'u.already-attached':
    'Artıq əlavə edilib',
  'u.already-disabled':
    'Artıq söndürülüb',
  'u.approve-and-release':
    'Təsdiqlə və burax',
  'u.assign-required-work':
    'Tələb olunan işi təyin et',
  'u.attach-people':
    'Şəxsləri əlavə et',
  'u.average-risk':
    'Orta risk',
  'u.average-risk-today':
    'Bu günkü orta risk',
  'u.base-url':
    'Əsas URL',
  'u.behaviours-in-use-in-this-catalogue':
    'Bu kataloqda istifadə olunan davranışlar',
  'u.by-when':
    'Nə vaxta qədər',
  'u.chain-of-custody':
    'Qeydiyyat zənciri',
  'u.check-sources-now':
    'Mənbələri indi yoxla',
  'u.clamped-to-0-100':
    '0–100 aralığına məhdudlaşdırılıb.',
  'u.delivery-status':
    'Çatdırılma statusu',
  'u.disable-connection':
    'Bağlantını söndür',
  'u.due-date':
    'Son tarix',
  'u.duration-not-recorded':
    'Müddət qeyd edilməyib',
  'u.edit-mapping':
    'Uyğunlaşdırmanı redaktə et',
  'u.force-measurement-now':
    'Ölçməni indi məcbur et',
  'u.high-risk':
    'Yüksək risk',
  'u.last-sync':
    'Son sinxronlaşdırma',
  'u.loop-run':
    'Dövrə axını',
  'u.machine-derived':
    'Maşın tərəfindən çıxarılıb',
  'u.no-approved-technology-was-matched':
    'Heç bir təsdiqlənmiş texnologiya uyğun gəlmədi.',
  'u.no-audit-entries-for-this-run':
    'Bu axın üçün audit qeydi yoxdur',
  'u.no-audit-entry-for-this-risk':
    'Bu risk üçün audit qeydi yoxdur',
  'u.no-deadline':
    'Son tarix yoxdur',
  'u.no-deadline-was-set':
    'Son tarix təyin edilməyib.',
  'u.no-department-or-person-was-named':
    'Heç bir bölmə və ya şəxs adı çəkilməyib.',
  'u.no-external-id':
    'Xarici ID yoxdur',
  'u.no-incident-reference':
    'İnsident istinadı yoxdur',
  'u.no-policy-rule-was-matched':
    'Heç bir siyasət qaydası uyğun gəlmədi.',
  'u.no-reason-was-recorded':
    'Səbəb qeyd edilməyib',
  'u.no-recent-events':
    'Son hadisə yoxdur',
  'u.no-risk-events-recorded':
    'Risk hadisəsi qeyd edilməyib',
  'u.nobody-is-attached-yet':
    'Hələ heç kim əlavə edilməyib',
  'u.not-analysed':
    'Təhlil edilməyib',
  'u.not-completed':
    'Tamamlanmayıb',
  'u.not-counted':
    'Sayılmır',
  'u.not-from-a-loop':
    'Dövrədən deyil',
  'u.not-listed':
    'Siyahıda yoxdur',
  'u.not-mapped-to-any-behaviour-targeting-will':
    'Heç bir davranışa bağlanmayıb — hədəfləmə onu heç vaxt seçməyəcək.',
  'u.not-scored':
    'Qiymətləndirilməyib',
  'u.not-started':
    'Başlanmayıb',
  'u.nothing-assigned':
    'Heç nə təyin edilməyib',
  'u.nothing-has-happened-yet':
    'Hələ heç nə baş verməyib',
  'u.nothing-of-ours-matched-this-advisory':
    'Bizdə bu bülletenə uyğun heç nə tapılmadı.',
  'u.open-department-risk':
    'Bölmə riskini aç',
  'u.open-in-the-training-studio':
    'Təlim studiyasında aç',
  'u.open-roster':
    'Siyahını aç',
  'u.open-the-approval':
    'Təsdiqi aç',
  'u.open-the-audit-log':
    'Audit jurnalını aç',
  'u.open-the-full-review':
    'Tam baxışı aç',
  'u.open-the-policy-library':
    'Siyasət kitabxanasını aç',
  'u.open-the-review-workspace':
    'Baxış iş sahəsini aç',
  'u.quiz-score':
    'Test balı',
  'u.raise-a-policy-finding':
    'Siyasət tapıntısı qaldır',
  'u.raise-finding':
    'Tapıntı qaldır',
  'u.record-assessment':
    'Qiymətləndirməni qeyd et',
  'u.record-decision':
    'Qərarı qeyd et',
  'u.reviewer-decision':
    'Baxış qərarı',
  'u.risk-at-selection':
    'Seçim anındakı risk',
  'u.risk-band':
    'Risk zolağı',
  'u.risk-change':
    'Risk dəyişikliyi',
  'u.risk-now':
    'Hazırkı risk',
  'u.save-configuration':
    'Konfiqurasiyanı yadda saxla',
  'u.search-runs':
    'Axınlarda axtar',
  'u.share-high-risk':
    'Yüksək risk payı',
  'u.share-of-the-score':
    'Balın payı',
  'u.should-training-or-a-finding-be-created':
    'Təlim, yoxsa tapıntı yaradılmalıdır?',
  'u.shown-here':
    'Burada göstərilir',
  'u.sync-now':
    'İndi sinxronlaşdır',
  'u.the-baseline':
    'Başlanğıc səviyyə',
  'u.the-module':
    'Modul',
  'u.the-score':
    'Bal',
  'u.training-is-not-created-from-an-advisory':
    'Bülletendən təlim yaradılmır',
  'u.what-happened':
    'Nə baş verib',
  'u.what-you-must-do':
    'Nə etməlisiniz',
  'u.which-approved-technologies-are-affected':
    'Hansı təsdiqlənmiş texnologiyalar təsirlənir?',
  'u.which-policy-is-affected':
    'Hansı siyasət təsirlənir?',
  'u.which-users-or-departments-are-exposed':
    'Hansı istifadəçilər və ya bölmələr risk altındadır?',
  'u.why-does-this-matter-to-this-organisation':
    'Bu, bu təşkilat üçün nə üçün önəmlidir?',
  'u.why-they-were-selected':
    'Nə üçün seçiliblər',
  'u.withdrawn-after-review-not-counted-in-the':
    'Baxışdan sonra geri götürülüb — bala sayılmır',
  'u.withheld-at-this-classification-incident-evidence-routin':
    'Bu təsnifat səviyyəsində gizlədilir. İnsident sübutlarında adətən başqa şəxslərin adları keçir.',
  'u.withheld-this-key-is-credential-shaped-and':
    'Gizlədilir — bu açar etimadnamə formasındadır və heç vaxt göstərilmir',
  'u.analyse-a-url':
    'URL təhlil et',
  'u.analyse-file':
    'Faylı təhlil et',
  'u.answer-the-dispute':
    'Etiraza cavab ver',
  'u.applies-to':
    'Aid olduğu',
  'u.assign-training':
    'Təlim təyin et',
  'u.automated-first-pass':
    'Avtomatlaşdırılmış ilkin baxış',
  'u.back-to-my-security':
    'Təhlükəsizliyimə qayıt',
  'u.baseline-from-role':
    'Roldan gələn başlanğıc',
  'u.being-attacked-is-not-a-mark-against':
    'Hücuma məruz qalmaq sizin əleyhinizə qeyd deyil.',
  'u.cannot-be-approved-regenerate-it-instead':
    'Təsdiqlənə bilməz. Əvəzində yenidən yaradın.',
  'u.close-campaign':
    'Kampaniyanı bağla',
  'u.copy-all':
    'Hamısını kopyala',
  'u.create-draft':
    'Qaralama yarat',
  'u.delivered-as':
    'Çatdırılma forması',
  'u.did-not-run':
    'İşə düşmədi',
  'u.false-positive':
    'Yanlış müsbət',
  'u.fetch-and-analyse':
    'Gətir və təhlil et',
  'u.fill-outcomes-synthetically-demo':
    'Nəticələri sintetik doldur (demo)',
  'u.first-pass-verdict':
    'İlkin baxış qərarı',
  'u.from-behaviour':
    'Davranışdan',
  'u.go-to-your-training':
    'Təliminizə keçin',
  'u.in-use':
    'İstifadədə',
  'u.indicators-extracted':
    'Çıxarılmış göstəricilər',
  'u.keep-checking':
    'Yoxlamağa davam edin',
  'u.last-change':
    'Son dəyişiklik',
  'u.launch-campaign':
    'Kampaniyanı başlat',
  'u.lure-source':
    'Tələ mənbəyi',
  'u.matched-from-your-library':
    'Kitabxananızdan uyğunlaşdırılıb',
  'u.md5-hash':
    'MD5 heşi',
  'u.net-effect':
    'Xalis təsir',
  'u.new-status':
    'Yeni status',
  'u.no-control-gap-has-been-raised':
    'Heç bir nəzarət boşluğu qaldırılmayıb',
  'u.no-departments-named-this-policy-is-organisation':
    'Bölmə adı çəkilməyib — bu siyasət bütün təşkilata aiddir',
  'u.no-due-date-this-deployment-does-not':
    'Son tarix yoxdur — bu quraşdırma təlim təyinatlarına son tarix qoymur',
  'u.no-findings-against-this-policy':
    'Bu siyasətə qarşı tapıntı yoxdur',
  'u.no-owner-recorded':
    'Sahib qeyd edilməyib',
  'u.no-policy-has-an-open-finding':
    'Heç bir siyasətin açıq tapıntısı yoxdur',
  'u.no-review-date-set':
    'Baxış tarixi təyin edilməyib',
  'u.no-version-snapshots-yet':
    'Hələ versiya snapshotu yoxdur',
  'u.none-named':
    'Ad çəkilməyib.',
  'u.none-recorded':
    'Heç nə qeyd edilməyib',
  'u.not-linked':
    'Bağlı deyil',
  'u.not-recorded':
    'Qeyd edilməyib',
  'u.not-specified-for-this-assignment':
    'Bu təyinat üçün göstərilməyib',
  'u.not-tied-to-a-policy':
    'Siyasətə bağlı deyil',
  'u.nothing-has-been-raised-against-you':
    'Sizə qarşı heç nə qaldırılmayıb',
  'u.nothing-has-gone-unanswered-yet':
    'Hələ cavabsız qalan heç nə yoxdur',
  'u.nothing-refused-by-the-firewall':
    'Heç nə — firewall tərəfindən rədd edilib',
  'u.open-campaign':
    'Kampaniyanı aç',
  'u.open-findings':
    'Açıq tapıntılar',
  'u.open-these-in-the-findings-queue':
    'Bunları tapıntılar növbəsində aç',
  'u.organisation-wide':
    'Bütün təşkilat üzrə',
  'u.person-and-trigger':
    'Şəxs və səbəb',
  'u.prebuilt-template':
    'Hazır şablon',
  'u.re-analyse':
    'Yenidən təhlil et',
  'u.record-count-not-available-the-source-query':
    'Qeyd sayı mövcud deyil — mənbə sorğusu cavab vermədi.',
  'u.recorded-measured':
    'Qeydə alınıb (ölçülüb)',
  'u.registered-as-metadata-only-no-document-was':
    'Yalnız metadata kimi qeydə alınıb — sənəd əlavə edilməyib',
  'u.registered-by':
    'Qeydə alan',
  'u.report-a-concern':
    'Narahatlıq bildir',
  'u.report-something-else':
    'Başqa bir şey bildir',
  'u.reporting-lowers-it':
    'Bildirmək onu azaldır.',
  'u.review-due':
    'Baxış vaxtı',
  'u.run-extraction':
    'Çıxarmanı işə sal',
  'u.run-the-analysis-again':
    'Təhlili yenidən işə sal',
  'u.save-status':
    'Statusu yadda saxla',
  'u.score-recorded':
    'Bal qeydə alındı',
  'u.score-to-reach':
    'Çatılmalı bal:',
  'u.send-report':
    'Bildirişi göndər',
  'u.send-to-a-person':
    'Şəxsə göndər',
  'u.submit-answers':
    'Cavabları göndər',
  'u.target-audience':
    'Hədəf auditoriya',
  'u.template-engine':
    'Şablon mühərriki',
  'u.the-answer-was':
    'Düzgün cavab:',
  'u.this-deployment-cannot-generate-this-pack':
    'Bu quraşdırma bu paketi yarada bilmir',
  'u.this-was-not-me':
    'Bu mən deyildim',
  'u.time-spent':
    'Sərf olunan vaxt',
  'u.training-this-finding-asks-for':
    'Bu tapıntının tələb etdiyi təlim',
  'u.true-positive':
    'Həqiqi müsbət',
  'u.type-and-size':
    'Növ və həcm',
  'u.unlock-and-continue':
    'Kilidi aç və davam et',
  'u.upload-a-file':
    'Fayl yüklə',
  'u.weight-constant':
    'Çəki (sabit)',
  'u.what-is-it':
    'Bu nədir',
  'u.what-is-lowering-it':
    'Onu nə azaldır',
  'u.what-is-raising-it':
    'Onu nə qaldırır',
  'u.what-it-noticed':
    'Nəyi aşkar etdi',
  'u.what-to-do':
    'Nə etməli',
  'u.what-was-attached':
    'Nə əlavə edildi',
  'u.what-you-said':
    'Nə dediniz',
  'u.what-you-should-do':
    'Nə etməlisiniz',
  'u.why-detonation-runs-off-host':
    'Detonasiya nə üçün hostdan kənarda işləyir',
  'u.you-answered':
    'Cavabınız:',
  'u.you-disputed-this':
    'Siz buna etiraz etdiniz.',
  'u.you-disputed-this-and-a-person-answered':
    'Siz buna etiraz etdiniz və bir şəxs cavab verdi.',
  'u.you-have-not-finished-any-training-yet':
    'Hələ heç bir təlimi bitirməmisiniz',
  'u.you-have-not-reported-anything-yet':
    'Hələ heç nə bildirməmisiniz',
  'u.you-scored':
    'Sizin balınız:',
  'u.your-answer':
    'Sizin cavabınız',
  'u.your-role-cannot-read-these-records-so':
    'Rolunuz bu qeydləri oxuya bilmir, ona görə əhatə burada sayılmır.',
  'u.accept-the-risk':
    'Riski qəbul et',
  'u.add-question':
    'Sual əlavə et',
  'u.add-section':
    'Bölmə əlavə et',
  'u.all-campaigns':
    'Bütün kampaniyalar',
  'u.already-pushed-into-the-loop':
    'Artıq dövrəyə ötürülüb',
  'u.already-recorded':
    'Artıq qeydə alınıb',
  'u.automated-triage':
    'Avtomatlaşdırılmış triaj',
  'u.awaiting-approval':
    'Təsdiq gözlənilir.',
  'u.back-to-sign-in':
    'Girişə qayıt',
  'u.back-to-submissions':
    'Göndərişlərə qayıt',
  'u.back-to-the-queue':
    'Növbəyə qayıt',
  'u.back-to-the-roster':
    'Siyahıya qayıt',
  'u.baseline-from-the-role':
    'Roldan gələn başlanğıc',
  'u.behaviour-observed':
    'Müşahidə edilən davranış',
  'u.change-status':
    'Statusu dəyiş',
  'u.checking-the-approval-queue':
    'Təsdiq növbəsi yoxlanılır',
  'u.closure-criteria':
    'Bağlanma meyarları',
  'u.create-and-open-the-editor':
    'Yarat və redaktoru aç',
  'u.edit-module':
    'Modulu redaktə et',
  'u.event-trail':
    'Hadisə izi',
  'u.file-under':
    'Aid olduğu mövzu',
  'u.full-name':
    'Ad və soyad',
  'u.generated-from':
    'Yaradılma mənbəyi',
  'u.go-to-the-gate':
    'Qapıya keç',
  'u.go-to-threat-intake':
    'Təhdid qəbuluna keç',
  'u.go-to-your-home-screen':
    'Ana ekranınıza keçin',
  'u.held-for-a-second-approver-2':
    'İkinci təsdiqləyən üçün saxlanılıb.',
  'u.how-the-score-is-computed':
    'Bal necə hesablanır',
  'u.how-urgency-is-coloured':
    'Təcililik necə rənglənir',
  'u.looking-for-the-loop-run-behind-this':
    'Bu artefaktın arxasındakı dövrə axını axtarılır',
  'u.mark-false-positive':
    'Yanlış müsbət kimi işarələ',
  'u.moved-by-recorded-behaviour':
    'Qeydə alınmış davranışla dəyişib',
  'u.my-security':
    'Mənim təhlükəsizliyim',
  'u.new-campaign':
    'Yeni kampaniya',
  'u.new-module':
    'Yeni modul',
  'u.no-approver-recorded':
    'Təsdiqləyən qeyd edilməyib',
  'u.no-artifact-has-entered-the-platform-yet':
    'Platformaya hələ heç bir artefakt daxil olmayıb',
  'u.no-artifact-matches-these-filters':
    'Bu filtrlərə uyğun artefakt yoxdur',
  'u.no-campaign-matches-these-filters':
    'Bu filtrlərə uyğun kampaniya yoxdur',
  'u.no-campaigns-have-been-created':
    'Heç bir kampaniya yaradılmayıb',
  'u.no-connection-records-exist':
    'Bağlantı qeydi mövcud deyil.',
  'u.no-employee-has-reported-anything-yet':
    'Hələ heç bir işçi bir şey bildirməyib',
  'u.no-feed-item-matches-these-filters':
    'Bu filtrlərə uyğun lent elementi yoxdur',
  'u.no-indicators-were-extracted':
    'Heç bir göstərici çıxarılmadı',
  'u.no-loop-runs-yet':
    'Hələ dövrə axını yoxdur',
  'u.no-module-matches-this-view':
    'Bu görünüşə uyğun modul yoxdur',
  'u.no-one-is-scored-yet':
    'Hələ heç kim qiymətləndirilməyib',
  'u.no-report-matches-these-filters':
    'Bu filtrlərə uyğun bildiriş yoxdur',
  'u.no-run-matches-these-filters':
    'Bu filtrlərə uyğun axın yoxdur',
  'u.no-settled-analysis-in-this-window':
    'Bu pəncərədə yekunlaşmış təhlil yoxdur',
  'u.no-threat-is-linked-this-module-was':
    'Heç bir təhdid bağlı deyil. Bu modul dövrə axını tərəfindən yaradılmayıb.',
  'u.no-training-is-waiting-on-you':
    'Sizi gözləyən təlim yoxdur',
  'u.no-training-module-exists-yet':
    'Hələ heç bir təlim modulu mövcud deyil',
  'u.not-from-a-threat':
    'Təhdiddən deyil',
  'u.not-yet':
    'Hələ yox',
  'u.nothing-is-waiting-for-a-decision':
    'Qərar gözləyən heç nə yoxdur',
  'u.open-a-risk':
    'Risk aç',
  'u.open-departments':
    'Bölmələri aç',
  'u.open-the-policy':
    'Siyasəti aç',
  'u.open-the-run-list':
    'Axın siyahısını aç',
  'u.open-the-sandbox':
    'Sandbox-u aç',
  'u.open-threat-intake-2':
    'Təhdid Qəbulunu aç',
  'u.plain-language-explanation':
    'Sadə dildə izah',
  'u.policy-library':
    'Siyasət kitabxanası',
  'u.prepare-the-request':
    'Sorğunu hazırla',
  'u.prepare-the-reset-request':
    'Sıfırlama sorğusunu hazırla',
  'u.push-into-stage-1':
    '1-ci mərhələyə ötür',
  'u.push-into-the-loop':
    'Dövrəyə ötür',
  'u.read-the-full-stage':
    'Mərhələni tam oxu',
  'u.real-analyzed-threat':
    'Real təhlil edilmiş təhdid',
  'u.report-something-suspicious':
    'Şübhəli bir şey bildir',
  'u.reporter-s-note':
    'Bildirənin qeydi:',
  'u.reports-submitted':
    'Göndərilmiş bildirişlər',
  'u.required-action':
    'Tələb olunan addım',
  'u.required-training':
    'Tələb olunan təlim',
  'u.review-state':
    'Baxış vəziyyəti',
  'u.revision-requested':
    'Düzəliş tələb olunub.',
  'u.risk-score':
    'Risk balı',
  'u.role-sensitivity':
    'Rol həssaslığı',
  'u.save-changes':
    'Dəyişiklikləri yadda saxla',
  'u.see-all-open':
    'Bütün açıqları gör',
  'u.see-every-change-in-the-audit-log':
    'Hər dəyişikliyi audit jurnalında gör',
  'u.see-what-is-waiting-at-the-approval':
    'Təsdiq qapısında nəyin gözlədiyinə bax',
  'u.shown-after-grading':
    'Qiymətləndirmədən sonra göstərilir:',
  'u.still-open':
    'Hələ açıqdır',
  'u.submit-an-artifact-in-threat-intake':
    'Təhdid Qəbulunda artefakt göndər',
  'u.submit-and-start-the-loop':
    'Göndər və dövrəni başlat',
  'u.submit-artifact':
    'Artefakt göndər',
  'u.suggested-remediation':
    'Təklif olunan aradan qaldırma',
  'u.the-curated-feed-is-empty':
    'Seçilmiş lent boşdur',
  'u.the-dashboard-returned-nothing':
    'Panel heç nə qaytarmadı',
  'u.the-finding-counts-are-unavailable':
    'Tapıntı sayları mövcud deyil',
  'u.the-server-would-reject-this-module':
    'Server bu modulu rədd edərdi',
  'u.this-campaign-has-no-targets':
    'Bu kampaniyanın hədəfi yoxdur',
  'u.this-finding-could-not-be-loaded':
    'Bu tapıntı yüklənə bilmədi',
  'u.this-finding-is-closed-reopen-it-before':
    'Bu tapıntı bağlıdır. Təlim təyin etməzdən əvvəl yenidən açın.',
  'u.this-page-does-not-exist':
    'Bu səhifə mövcud deyil',
  'u.this-run-could-not-be-loaded':
    'Bu axın yüklənə bilmədi',
  'u.this-run-has-already-left-the-gate':
    'Bu axın artıq qapıdan keçib.',
  'u.threat-intake':
    'Təhdid qəbulu',
  'u.threat-type':
    'Təhdid növü',
  'u.training-and-simulations':
    'Təlim və simulyasiyalar',
  'u.training-studio':
    'Təlim Studiyası',
  'u.verify-and-add':
    'Yoxla və əlavə et',
  'u.work-the-queue':
    'Növbə üzərində işlə',
  'u.go-back':
    'Geri qayıt',
  'u.sign-in-with-a-phone-number-instead':
    'Əvəzində telefon nömrəsi ilə daxil olun',
  'u.sign-in-with-email-instead':
    'Əvəzində e-poçt ilə daxil olun',
  'u.or':
    'VƏ YA',
  'u.an-action-matches-exactly-or-as':
    'Əməliyyat tam və ya nöqtəli prefiks kimi uyğunlaşır, məsələn',
  'u.api-origin':
    'API mənbəyi',
  'u.behaviour-trend-description':
    'Gün üzrə fişinq klik nisbəti və təhdid bildirmə nisbəti. Nəticəsi yekunlaşmamış günlər interpolyasiya edilmir, buraxılır.',
  'u.behaviour-trend-empty':
    'Davranış trendi çəkilməzdən əvvəl ən azı iki gündə simulyasiya nəticəsi olmalıdır.',
  'u.completion-trend-description':
    'Gün üzrə tamamlanmış təyin edilmiş təlimin payı. Təyinatı olmayan günlər buraxılır.',
  'u.completion-trend-empty':
    'Bu pəncərədə təyinatı olan gün ikidən azdır.',
  'u.configured':
    'konfiqurasiya edilib',
  'u.department-heatmap-description':
    'Bölmə üzrə orta risk balı, heyət sayı və hər bölmədəki yüksək riskli insanların sayı ilə.',
  'u.department-heatmap-empty':
    'Hələ heç bir bölmədə qiymətləndirilmiş heyət yoxdur.',
  'u.finds-every-verb-beneath-it':
    'altındakı bütün əməlləri tapır. İcraçı e-poçtun böyük-kiçik hərfə həssas olmayan hissəsidir.',
  'u.loop-outcome-empty':
    'Bu pəncərədə heç bir dövrə başlanmayıb.',
  'u.open-closed-loops-for-the-full':
    'Tam mənzərə üçün Qapalı Dövrələri açın.',
  'u.risk-movement-empty':
    'Bu pəncərədə müqayisə üçün iki qiymətləndirilmiş nöqtəsi olan bölmə yoxdur.',
  'u.risk-trend-empty':
    'Bu pəncərədə davranış riski ikidən az gündə ölçülüb.',
  'u.runs-are-waiting-for-a-human':
    '{count} axın insan qərarını gözləyir.',
  'u.same-origin-as-this-page':
    'bu səhifə ilə eyni mənbə',
  'u.saving-moves-this-connection-to':
    'Yadda saxlamaq bu bağlantını',
  'u.severity-bar-empty':
    'Bu görünüşdə heç bir tapıntı qaldırılmayıb.',
  'u.waiting-for-you':
    'Sizi gözləyir',
  'u.which-is-a-statement-about-these':
    ' statusuna keçirir — bu, yalnız bu parametrlər haqqında ifadədir. Bağlantı yalnız sinxronlaşdırma provayderə çatıb cavab alanda qoşulmuş sayılır, forma göndərildiyi üçün yox.',
  'u.yara-rules':
    'YARA qaydaları',
  'u.assigned-modules':
    'təyin edilmiş modul',
  'u.attributed-risk-events':
    'aid edilmiş risk hadisəsi',
  'u.completions-that-recorded-a-duration':
    'müddəti qeydə alınmış tamamlama',
  'u.counted-by-the-platform-api-over-its':
    'Platforma API-si tərəfindən öz qeydləri üzərində sayılıb',
  'u.counted-from-the-subject-rows-on-this':
    'Bu riskin subyekt sətirlərindən sayılıb',
  'u.current-score-role-baseline-over-every-person':
    'Σ(cari bal − rol başlanğıcı), siyahıdakı hər insan üzrə.',
  'u.delivered-simulations':
    'çatdırılmış simulyasiya',
  'u.departments-with-a-current-roll-up':
    'cari yekunu olan bölmə',
  'u.findings-on-record':
    'qeydə alınmış tapıntı',
  'u.graded-quizzes':
    'qiymətləndirilmiş test',
  'u.incident-risks':
    'İnsident riskləri',
  'u.incident-risks-on-record':
    'qeydə alınmış insident riski',
  'u.measurement-summary-stored-on-the-run':
    'Axında saxlanılan ölçmə xülasəsi',
  'u.no-assignment-on-this-run-has-been':
    'Bu axında heç bir təyinat balla tamamlanmayıb.',
  'u.no-completion-on-this-run-recorded-how':
    'Bu axında heç bir tamamlama nə qədər çəkdiyini qeydə almayıb.',
  'u.no-department-reported-a-headcount':
    'heç bir bölmə heyət sayı bildirmədi',
  'u.no-department-reported-a-high-risk-count':
    'heç bir bölmə yüksək risk sayı bildirmədi',
  'u.no-employee-currently-carries-a-score':
    'hazırda heç bir işçinin balı yoxdur',
  'u.no-employee-has-a-score-yet':
    'hələ heç bir işçinin balı yoxdur',
  'u.no-employee-has-a-scored-risk-profile':
    'Hələ heç bir işçinin qiymətləndirilmiş risk profili yoxdur',
  'u.no-endpoint-aggregates-quiz-scores-into-a':
    'heç bir son nöqtə test ballarını keçid nisbətinə cəmləmir',
  'u.no-endpoint-reports-the-interval-between-delivery':
    'heç bir son nöqtə çatdırılma ilə bildirmə arasındakı intervalı hesabat etmir',
  'u.no-subject-has-recorded-a-score-yet':
    'Hələ heç bir subyekt bal qeydə almayıb.',
  'u.nobody-is-attached-to-this-risk-yet':
    'Bu riskə hələ heç kim əlavə edilməyib.',
  'u.nothing-was-assigned-on-this-run-so':
    'Bu axında heç nə təyin edilmədi, ona görə hesablanacaq nisbət yoxdur.',
  'u.people-in-a-scored-department':
    'qiymətləndirilmiş bölmədəki insan',
  'u.people-on-a-scored-roster':
    'qiymətləndirilmiş siyahıdakı insan',
  'u.platform-analyzer-output-on-the-threat-record':
    'Təhdid qeydindəki platforma analizatorunun çıxışı',
  'u.platform-api':
    'Platforma API-si',
  'u.policy-intelligence':
    'Siyasət kəşfiyyatı',
  'u.quiz-scores-recorded-against-this-incident':
    'Bu insidentin təyinatları üzrə qeydə alınmış test balları',
  'u.recorded-risk-events':
    'qeydə alınmış risk hadisəsi',
  'u.resolved-simulation-outcomes':
    'yekunlaşmış simulyasiya nəticəsi',
  'u.resolved-targets':
    'yekunlaşmış hədəf',
  'u.risk-engine':
    'risk mühərriki',
  'u.risk-engine-behaviour-only':
    'Risk mühərriki — yalnız davranış',
  'u.risk-engine-roll-ups-and-the-daily':
    'Risk mühərrikinin yekunları və gündəlik metrik snapshotu',
  'u.risk-engine-selection-stored-on-the-run':
    'Axında saxlanılan risk mühərriki seçimi',
  'u.scored-assignments':
    'qiymətləndirilmiş təyinat',
  'u.scored-employees':
    'qiymətləndirilmiş işçi',
  'u.scored-people':
    'qiymətləndirilmiş insan',
  'u.scored-subject':
    'qiymətləndirilmiş subyekt',
  'u.the-dashboard-did-not-report-a-count':
    'panel say bildirmədi',
  'u.the-findings-list-could-not-be-read':
    'tapıntılar siyahısı oxuna bilmədi',
  'u.the-roster-is-empty':
    'siyahı boşdur',
  'u.the-run-by-run-breakdown-is-held':
    'Axın-axın bölgü təhlükəsizlik komandasında saxlanılır',
  'u.the-threat-list-is-held-by-the':
    'Təhdid siyahısı təhlükəsizlik komandasında saxlanılır',
  'u.there-is-nothing-here':
    'burada heç nə yoxdur',
  'u.threat-record-2':
    'Təhdid qeydi',
  'u.timed-reports':
    'vaxtı ölçülmüş bildiriş',
  'u.training-assignment-records':
    'Təlim təyinatı qeydləri',
  'u.training-module-record':
    'Təlim modulu qeydi',
  'cc.and-n-more':
    'və daha {count}',
  'cc.counts-current':
    'Saylar son yenilənməyə əsasəndir.',
  'cc.open-integrations':
    'İnteqrasiyaları aç',
  'cc.open-loops':
    'Qapalı dövrələri aç',
  'cc.open-sandbox':
    'Sandbox-ı aç',
  'cc.rates-window':
    'Nisbətlər son {days} günü əhatə edir və {min} yekunlaşmış hadisədən az olduqda göstərilmir.',
  'cc.warn-analyzers-detail':
    'İşləmir: {list}. Bu analizatorların qaldıracağı siqnallar qərarda görünə bilməz.',
  'cc.warn-analyzers-title':
    '{count} statik analizator əlçatan deyil',
  'cc.warn-dynamic-detail':
    'Təhlil yalnız statik analizatorlarla aparılır. Yalnız icra zamanı üzə çıxan davranış müşahidə olunmayacaq və qərarlar bunu açıq deyir.',
  'cc.warn-dynamic-title':
    'Dinamik detonasiya əlçatan deyil',
  'cc.warn-integrations-degraded-title':
    '{count} inteqrasiyanın işi məhdudlaşıb',
  'cc.warn-integrations-error-title':
    '{count} inteqrasiya xətadadır',
  'cc.warn-no-model-detail':
    'Çevirmə təlimi sabit şablondan yazır. Burada yaradılan hər şey “Şablon” kimi işarələnir, heç vaxt “AI yaradıb” kimi yox.',
  'cc.warn-no-model-title':
    'Dil modeli qoşulmayıb',
  'cc.warn-runs-failed-detail':
    '{list} dövrəni bağlamadan dayandı.',
  'cc.warn-runs-failed-title':
    '{count} dövrə axını uğursuz oldu',
  'cc.warn-yara-detail':
    'Qayda dəsti sıfır qaydaya kompilyasiya olundu, ona görə heç bir YARA siqnalı işə düşə bilməz.',
  'cc.warn-yara-title':
    'Heç bir YARA qaydası yüklənməyib',
  'u.demo-dataset':
    'Demo dataseti',
  'u.external-feed':
    'Xarici lent',
  'u.live-api':
    'Canlı API',
  'u.no-role':
    'Rol yoxdur',
  'u.no-role-assigned':
    'Rol təyin edilməyib',
  'u.people-trained':
    '{count} nəfər təlim alıb',
  'u.person-trained':
    '{count} nəfər təlim alıb',
  'u.role-analyst':
    'Təhlükəsizlik analitiki',
  'u.role-employee':
    'İşçi',
  'u.role-executive':
    'Rəhbər',
  'u.sandbox-full':
    'Sandbox: tam',
  'u.sandbox-static-only':
    'Sandbox: yalnız statik',
  'u.updated-prefix':
    'Yeniləndi',
  'u.closed-loops-counted-by-server':
    'serverin saydığı qapalı dövrə',
  'u.def-assignments-before-window':
    'Pəncərədən əvvəl edilmiş təyinatlar, pəncərə içində tamamlansa belə',
  'u.def-employees-named-by-finding':
    'Tapıntının adbaad göstərdiyi işçilər',
  'u.def-employees-who-left':
    'İşdən ayrılmış işçilər',
  'u.def-events-excluded-baseline':
    'Bütün qeydə alınmış hadisələr — bu, yalnız başlanğıc nöqtəsidir',
  'u.def-every-applied-event':
    'Mühərrikin tətbiq etdiyi ləğv edilməmiş bütün hadisələr',
  'u.def-every-assignment-in-window':
    'Pəncərədə yaradılmış hər təyinat, kim yaratmasından asılı olmayaraq',
  'u.def-every-incident-risk':
    'Platformadakı hər insident riski, yaşından asılı olmayaraq',
  'u.def-everyone-endpoint-returns':
    'İşçilər son nöqtəsinin qaytardığı hər kəs',
  'u.def-no-trailing-window-score':
    'Heç bir zaman pəncərəsi — bu, balın hazırkı vəziyyətidir',
  'u.def-no-window-on-figure':
    'Heç nə — bu rəqəmdə zaman pəncərəsi yoxdur',
  'u.def-open-statuses':
    'Açıq, baxılır, korreksiya planlaşdırılıb və təlim təyin edilib statusları',
  'u.def-people-via-department':
    'Yalnız bölməsinin adı çəkildiyi üçün əhatə olunan insanlar',
  'u.def-platform-does-not-compute':
    'Hər şey — platforma bunu hazırda hesablamır',
  'u.def-real-threats-excluded':
    'Real təhdidlər — bunlar yalnız simulyasiyalardır',
  'u.def-reports-genuine-threats':
    'Həqiqi təhdid bildirmələri — onların çatdırılma məxrəci yoxdur',
  'u.def-reports-human-sensor-sim':
    'Simulyasiya tələsinə qarşı insan-sensor yolu ilə edilmiş bildirmələr',
  'u.def-resolved-accepted-fp':
    'Həll edilib, risk qəbul edilib və yanlış müsbət',
  'u.def-role-baselines-excluded':
    'Rol başlanğıc dəyərlərinin özü',
  'u.def-role-sensitivity':
    'Hər kəsin qeydə alınmış rol həssaslığı',
  'u.def-runs-awaiting':
    'Hələ təsdiq, təlim və ya ölçmə gözləyən axınlar',
  'u.def-runs-closed-benign':
    'Artefakt zərərsiz çıxdığı üçün çevirmə mərhələsində bağlanan axınlar',
  'u.def-runs-trained-scored':
    'Təlimin təyin edildiyi, keçildiyi və qiymətləndirildiyi axınlar',
  'u.def-sim-clicks-reports-incidents':
    'Simulyasiya klikləri və bildirmələri, real təhdid bildirmələri, insident tapıntıları',
  'u.def-subjects-accepted':
    'Rəyçinin qəbul edilmiş kimi işarələdiyi subyektlər',
  'u.def-subjects-completed-unreviewed':
    'Tamamlamış, lakin hələ baxılmamış subyektlər',
  'u.def-subjects-rejected':
    'Rəyçinin rədd etdiyi subyektlər',
  'u.def-targets-clicked-reported-ignored':
    'Çatdırılmış tələyə klikləyən, bildirən və ya məhəl qoymayan hədəflər',
  'u.def-targets-pending':
    'Nəticəsi hələ bilinməyən hədəflər',
  'u.def-training-completion-moves-credit':
    'Təlim tamamlanması və test balları — onlar bu göstəricini yox, təlim kreditini dəyişir',
  'u.def-whole-register':
    'Heç bir zaman pəncərəsi — bu, bütöv reyestrdir',
  'u.def-whole-roster':
    'Heç nə — bu, zaman pəncərəsi deyil, bütöv siyahıdır',
  'u.loop-runs-on-record':
    'qeydə alınmış dövrə axını',
  'u.open-findings-naming-neither':
    'Nə şəxs, nə də bölmə adı çəkməyən {count} açıq tapıntı',
  'u.active-and-recent-runs':
    'Aktiv və son axınlar',
  'u.converted-from':
    'Mənbəyi:',
  'u.flow-at-the-gate':
    '{count} təsdiq qapısında',
  'u.flow-closed':
    '{count} axın dövrəni bağlayıb.',
  'u.flow-failed':
    'Uğursuz: {list}.',
  'u.flow-in-stage':
    '{count} {stage} mərhələsində',
  'u.flow-none':
    'Hazırda dövrədə heç bir axın yoxdur.',
  'u.flow-processing':
    'İcra olunur: {list}.',
  'u.flow-waiting':
    'Gözləyir: {list}.',
  'u.further-providers-not-configured':
    'Daha {count} provayder bu quraşdırmada konfiqurasiya edilməyib',
  'u.gate-aria':
    '3-cü və 4-cü mərhələlər arasında təsdiq qapısı. {waiting} insan qərarını gözləyir. {wait}. {approved} buraxılıb.',
  'u.manage':
    'İdarə et',
  'u.standing-not-movement':
    'Dəyişmə yox, hazırkı vəziyyət — panel bölmə üzrə cari ortanı bildirir və fərq çıxarmaq üçün bölmə üzrə tarixçə yoxdur.',
  'u.action':
    'Əməliyyat',
  'u.active':
    'Aktiv',
  'u.actor':
    'İcraçı',
  'u.added':
    'Əlavə edilib',
  'u.after':
    'Sonra',
  'u.all-departments':
    'Bütün departamentlər',
  'u.all-submissions':
    'Bütün göndərişlər',
  'u.analysed':
    'Təhlil edilib',
  'u.analyst-submission':
    'Analitik göndərişi',
  'u.analyzer':
    'Analizator',
  'u.any-artifact-type':
    'İstənilən artefakt növü',
  'u.any-department':
    'İstənilən departament',
  'u.any-due-date':
    'İstənilən son tarix',
  'u.any-policy':
    'İstənilən siyasət',
  'u.any-risk-band':
    'İstənilən risk zolağı',
  'u.any-severity':
    'İstənilən ciddilik',
  'u.any-source':
    'İstənilən mənbə',
  'u.any-suspicion-level':
    'İstənilən şübhə səviyyəsi',
  'u.any-verdict':
    'İstənilən hökm',
  'u.approved':
    'Təsdiqlənib',
  'u.approver':
    'Təsdiqləyici',
  'u.assessment':
    'Qiymətləndirmə',
  'u.awaiting-approval-2':
    'Təsdiq gözləyir',
  'u.awaiting-password':
    'Parol gözləyir',
  'u.awaiting-training':
    'Təlim gözləyir',
  'u.awaiting-triage':
    'Triaj gözləyir',
  'u.before':
    'Əvvəl',
  'u.benign':
    'Zərərsiz',
  'u.category':
    'Kateqoriya',
  'u.changed':
    'Dəyişdirilib',
  'u.channel':
    'Kanal',
  'u.chat':
    'Çat',
  'u.chat-message':
    'Çat mesajı',
  'u.clean':
    'Təmiz',
  'u.clicked':
    'Klikləyib',
  'u.close':
    'Bağla',
  'u.completed':
    'Tamamlanıb',
  'u.completion':
    'Tamamlanma',
  'u.counted':
    'Sayılıb',
  'u.created':
    'Yaradılıb',
  'u.critical':
    'Kritik',
  'u.curated-feed':
    'Seçilmiş lent',
  'u.deadline':
    'Son tarix',
  'u.decision':
    'Qərar',
  'u.department':
    'Departament',
  'u.departments-in-the-organisation':
    'təşkilatdakı departament',
  'u.description':
    'Təsvir',
  'u.dismiss':
    'Rədd et',
  'u.dismissed':
    'Rədd edilib',
  'u.draft':
    'Qaralama',
  'u.due-within-30-days':
    '30 gün ərzində vaxtı çatır',
  'u.due-within-7-days':
    '7 gün ərzində vaxtı çatır',
  'u.elevated':
    'Yüksəlmiş',
  'u.elevated-40-59':
    'Yüksəlmiş (40–59)',
  'u.email':
    'E-poçt',
  'u.environment':
    'Mühit',
  'u.every-channel':
    'Bütün kanallar',
  'u.every-report':
    'Bütün hesabatlar',
  'u.excluded':
    'Kənarlaşdırılıb',
  'u.failed':
    'Uğursuz',
  'u.family':
    'Ailə',
  'u.file':
    'Fayl',
  'u.findings-detected-in-the-window':
    'bu pəncərədə aşkarlanan tapıntı',
  'u.help':
    'Kömək',
  'u.high':
    'Yüksək',
  'u.high-risk-60-100':
    'Yüksək risk (60–100)',
  'u.high-suspicion':
    'Yüksək şübhə',
  'u.human-sensor':
    'İnsan sensoru',
  'u.incident-risks-raised-in-the-window':
    'bu pəncərədə qaldırılan insident riski',
  'u.judgement':
    'Rəy',
  'u.label':
    'Etiket',
  'u.longest-wait-first':
    'Əvvəlcə ən uzun gözləyənlər',
  'u.loop-runs-closed-in-the-window':
    'bu pəncərədə bağlanan dövrə icrası',
  'u.low-risk':
    'Aşağı risk',
  'u.low-risk-0-39':
    'Aşağı risk (0–39)',
  'u.low-suspicion':
    'Aşağı şübhə',
  'u.malicious':
    'Zərərli',
  'u.medium':
    'Orta',
  'u.medium-suspicion':
    'Orta şübhə',
  'u.monitoring':
    'Müşahidə',
  'u.navigation':
    'Naviqasiya',
  'u.newest-first':
    'Əvvəlcə ən yenilər',
  'u.no-verdict-recorded':
    'Hökm qeydə alınmayıb',
  'u.not-applicable':
    'Aid deyil',
  'u.note':
    'Qeyd',
  'u.opened':
    'Açılıb',
  'u.optional':
    'Məcburi deyil.',
  'u.order':
    'Sıralama',
  'u.overdue':
    'Vaxtı keçib',
  'u.owner':
    'Sahib',
  'u.password':
    'Parol',
  'u.pending':
    'Gözləyir',
  'u.pending-review':
    'Baxış gözləyir',
  'u.plans':
    'Planlar',
  'u.platform':
    'Platforma',
  'u.points':
    'Xal',
  'u.policy':
    'Siyasət',
  'u.primary':
    'Əsas',
  'u.product':
    'Məhsul',
  'u.provenance':
    'Mənşə',
  'u.pushed-into-the-loop':
    'Dövrəyə göndərilib',
  'u.qr-code':
    'QR kod',
  'u.questions':
    'Suallar',
  'u.queued':
    'Növbədə',
  'u.reach':
    'Əhatə',
  'u.reason':
    'Səbəb',
  'u.recommended':
    'Tövsiyə olunan',
  'u.reference':
    'İstinad',
  'u.rejected':
    'Rədd edilib',
  'u.relevant':
    'Aidiyyatı var',
  'u.removed':
    'Silinib',
  'u.reported':
    'Bildirib',
  'u.reporter':
    'Bildirən',
  'u.requested':
    'Tələb edilib',
  'u.resolved':
    'Həll edilib',
  'u.running':
    'İcra olunur',
  'u.score-of-40-to-59':
    '40-dan 59-a qədər bal',
  'u.score-of-60-or-more':
    '60 və daha yüksək bal',
  'u.score-under-40':
    '40-dan aşağı bal',
  'u.search':
    'Axtarış',
  'u.sender':
    'Göndərən',
  'u.severity':
    'Ciddilik',
  'u.size':
    'Ölçü',
  'u.sms-phone':
    'SMS / telefon',
  'u.something-unexpected-stopped-the-request-before-it':
    'Gözlənilməz bir şey sorğunu platformaya çatmamış dayandırdı. Səhifəni yeniləyin və yenidən cəhd edin.',
  'u.source':
    'Mənbə',
  'u.stage':
    'Mərhələ',
  'u.standing':
    'Mövqe',
  'u.started':
    'Başlayıb',
  'u.status':
    'Status',
  'u.subject':
    'Mövzu',
  'u.subjects':
    'Aidiyyatı olan şəxslər',
  'u.submitted':
    'Göndərilib',
  'u.suspicious':
    'Şübhəli',
  'u.takeaway':
    'Əsas nəticə',
  'u.targeted':
    'Hədəflənib',
  'u.technology':
    'Texnologiya',
  'u.template':
    'Şablon',
  'u.the-platform-did-not-recognise-that-combination':
    'Platforma bu kombinasiyanı tanımadı. Parollar böyük-kiçik hərfə həssasdır və hesablar özünüqeydiyyat yolu ilə deyil, təhlükəsizlik komandası tərəfindən verilir.',
  'u.the-service-may-still-be-starting-or':
    'Xidmət hələ başlaya bilər və ya bağlantı kəsildi. Giriş məlumatlarınız başqa yerə göndərilmədi — bir azdan yenidən cəhd edin.',
  'u.title':
    'Başlıq',
  'u.took':
    'Çəkdi',
  'u.type':
    'Növ',
  'u.urgent':
    'Təcili',
  'u.value':
    'Dəyər',
  'u.verdict':
    'Hökm',
  'u.waiting':
    'Gözləyir',
  'u.we-assessed-it-and-it-does-not':
    'Qiymətləndirdik və bizə aid deyil. Səbəb göstərilməlidir.',
  'u.accept-2':
    'Qəbul et',
  'u.advisory-dismissed-2':
    'Xəbərdarlıq rədd edildi',
  'u.affected-department-2':
    'Təsirlənən departament',
  'u.all-stages-2':
    'Bütün mərhələlər',
  'u.any-department-2':
    'İstənilən departament',
  'u.approved-by-2':
    'Təsdiqləyən',
  'u.artifact-type-2':
    'Artefakt növü',
  'u.awaiting-2':
    'Gözləyir',
  'u.behaviour-risk-2':
    'Davranış riski',
  'u.campaign-closed-2':
    'Kampaniya bağlandı',
  'u.campaign-launched-2':
    'Kampaniya başladıldı',
  'u.channel-2':
    'Kanal',
  'u.click-rate-3':
    'Klik nisbəti',
  'u.completed-2':
    'Tamamlanıb',
  'u.completion-rate-2':
    'Tamamlanma nisbəti',
  'u.composite-score-2':
    'Məcmu bal',
  'u.configuration-stored-2':
    'Konfiqurasiya yadda saxlanıldı',
  'u.domains-2':
    'Domenlər',
  'u.elevated-2':
    'Yüksəlmiş',
  'u.estimated-time-2':
    'Təxmini vaxt',
  'u.every-action-2':
    'Bütün əməliyyatlar',
  'u.every-object-type-2':
    'Bütün obyekt növləri',
  'u.failed-2':
    'Uğursuz',
  'u.feedback-recorded-2':
    'Rəy qeydə alındı',
  'u.findings-2':
    'Tapıntılar',
  'u.hashes-2':
    'Heşlər',
  'u.high-risk-3':
    'Yüksək risk',
  'u.launch-failed-2':
    'Başladılma uğursuz oldu',
  'u.low-risk-2':
    'Aşağı risk',
  'u.module-not-saved-2':
    'Modul yadda saxlanılmadı',
  'u.module-saved-2':
    'Modul yadda saxlanıldı',
  'u.no-material-change-2':
    'Əhəmiyyətli dəyişiklik yoxdur',
  'u.no-single-department-2':
    'Vahid departament yoxdur',
  'u.nobody-was-assigned-2':
    'Heç kimə təyin edilməyib',
  'u.open-closed-loops-2':
    'Qapalı dövrələri aç',
  'u.open-departments-3':
    'Departamentləri aç',
  'u.open-findings-3':
    'Tapıntıları aç',
  'u.outcome-not-recorded-2':
    'Nəticə qeydə alınmayıb',
  'u.quiz-questions-2':
    'Test sualları',
  'u.reject-2':
    'Rədd et',
  'u.reject-this-content-2':
    'Bu məzmunu rədd et',
  'u.report-dismissed-2':
    'Bildiriş rədd edildi',
  'u.report-rate-3':
    'Bildirmə nisbəti',
  'u.reported-by-3':
    'Bildirən',
  'u.reset-failed-2':
    'Sıfırlama uğursuz oldu',
  'u.risk-fell-2':
    'Risk azaldı',
  'u.risk-rose-2':
    'Risk artdı',
  'u.sections-2':
    'Bölmələr',
  'u.sender-patterns-2':
    'Göndərən şablonları',
  'u.sent-to-a-person-2':
    'Şəxsə göndərilib',
  'u.severity-at-intake-2':
    'Qəbul anındakı ciddilik',
  'u.since-your-last-recorded-change-2':
    'sonuncu qeydə alınmış dəyişikliyinizdən bəri',
  'u.source-2':
    'Mənbə',
  'u.status-2':
    'Status',
  'u.submitted-2':
    'Göndərilib',
  'u.sync-completed-2':
    'Sinxronizasiya tamamlandı',
  'u.sync-refused-2':
    'Sinxronizasiya rədd edildi',
  'u.that-did-not-send-2':
    'Göndərilmədi',
  'u.your-training-module-2':
    'Sizin təlim modulunuz',
  'u.yours-2':
    'Sizin',
  'u.it-applies-to-this-organisation-and':
    'Bu təşkilata aiddir və növbəyə düşməlidir.',
  'u.it-could-apply-watch-it':
    'Aid ola bilər. İzləyin; hələ tədbir görməyin.',
  'u.it-reaches-something-we-run':
    'Bizdə işlək olan bir şeyə toxunur və indi tədbir tələb edir.',
  'u.hide-password':
    'Parolu gizlət',
  'u.show-password':
    'Parolu göstər',
  'l.cta.body':
    'Nümayiş quruluşu toxumlanmış təşkilat və artıq təsdiq qapısında gözləyən dövrə daşıyır — beləliklə bütün tsikl bir neçə dəqiqəyə gəzilə bilər.',
  'l.cta.note':
    'Kart yoxdur, sınaq sayğacı yoxdur. Hesabları təhlükəsizlik komandası verir.',
  'l.cta.title':
    'Real təhdid üzərində işlədiyini görün.',
  'l.faq.ai.a':
    'Yalnız təlim mətni, başqa heç nə. Hökm və bal mühərrikin öz analizatorlarından və çəkili modelindən gəlir — dil modelinin qoşulub-qoşulmamasından asılı olaraq dəyişmir. Yaradılmış modullar insan təsdiq qapısında saxlanılır, onları yazan mühərrikin adını daşıyır və kimsə onları almazdan əvvəl redaktə edilə bilər.',
  'l.faq.ai.q':
    'Bunun nə qədəri dil modelidir?',
  'l.faq.data.a':
    'Sizin işlətdiyiniz quraşdırmada qalır. Təhlil yolundakı bütün xarici çağırışlar bağlana bilən vahid suverenlik nəzarət nöqtəsindən keçir və hər imtina sayılıb bildirilir. Yeganə qəsdi istisna analitikin göndərdiyi URL-in yüklənməsidir, çünki URL-i təhlilə göndərmək onu yükləmək tələbidir — və bu da hava boşluqlu quraşdırma üçün söndürülə bilər.',
  'l.faq.data.q':
    'Məlumatlarımız hara gedir?',
  'l.faq.eyebrow':
    'Suallar',
  'l.faq.gaps.a':
    'İşçi siyahısının idxalı və göndərilən poçt. İşçilər üçün yazma yolu və poçt nəqliyyatı yoxdur, ona görə bugünkü pilot HR lenti və poçt şlüzü ilə deyil, analitik tərəfindən yüklənir və idarə olunur. Hər ikisi açıq repozitoriyadakı yol xəritəsində ardıcıllığı və həcmi ilə birlikdə adlandırılıb. Əksini nəzərdə tutan səhifə texniki oxucunun açdığı ilk fayl tərəfindən təkzib edilərdi.',
  'l.faq.gaps.q':
    'Hələ nə qurulmayıb?',
  'l.faq.intro':
    'Hələ qurulmamış şeylər haqqındakılar da daxil olmaqla.',
  'l.faq.malware.a':
    'Xeyr. Veb xidmət nümunələri təhlil edir, heç vaxt icra etmir; bunu edə biləcək kod yollarını bir test qadağan edir. Dinamik detonasiya operatorun idarə etdiyi ayrıca, birdəfəlik maşında işləyir və tapıntılarını autentifikasiyalı kanal üzərindən geri göndərir. Belə maşın qoşulmayıbsa, hesabatlar nümunənin detonasiya edilmədiyini bildirir.',
  'l.faq.malware.q':
    'Serverdə zərərli proqram işlədirsinizmi?',
  'l.faq.start.a':
    'Hesab tələb edin, biz sizin öz təhdidlərinizlə tək-icarəçili nümunə quraq. Özünüqeydiyyat yoxdur: hesabları təhlükəsizlik komandası verir — giriş ekranında qeydiyyat formasının olmamasının səbəbi də budur.',
  'l.faq.start.q':
    'Necə başlayaq?',
  'l.faq.title':
    'Təhlükəsizlik komandasının ilk soruşduqları.',
  'l.faq.what.a':
    'Qapalı dövrəli təhlükəsizlik məlumatlandırma platforması. Təşkilatınıza çatmış real təhdidi təhlil edir, hökmü qısa təlim moduluna çevirir, onu riski ən yüksək işçilərə təyin edir, nəyin dəyişdiyini ölçür və nəticəni risk modelinə qaytarır. Arxasındakı analiz mühərriki həm də Cyclowareness Sandbox adı ilə ayrıca satılır.',
  'l.faq.what.q':
    'Cyclowareness nədir?',
  'l.footer.line':
    'Qapalı dövrəli insan kiber riski. Real təhdidlər hədəflənmiş təlimə çevrilir və nəticə ölçülür.',
  'l.hero.eyebrow':
    'Qapalı dövrəli təhlükəsizlik məlumatlandırması',
  'l.hero.figure.analyzers':
    'statik analizator, məzmuna görə seçilir',
  'l.hero.figure.rules':
    'mühərriklə gələn YARA qaydası',
  'l.hero.figure.stages':
    'dövrə mərhələsi, hər biri qeydə alınır',
  'l.hero.lead':
    'İşçilərinizə həqiqətən çatmış təhdid təhlil olunur, riski ən yüksək olan konkret işçilər üçün qısa modula çevrilir və onların davranışındakı dəyişiklik modelə geri qaytarılır. İldə bir dəfə göz ardı edilən şablon kurs deyil.',
  'l.hero.note':
    'Hesabları təhlükəsizlik komandası yaradır.',
  'l.hero.secondary':
    'Dövrənin necə döndüyünə bax',
  'l.hero.title':
    'Real hücumlar. Hədəflənmiş təlim. Ölçə biləcəyiniz davranış.',
  'l.honesty.audit':
    'Rəqəmlər geriyə izlənə bilir',
  'l.honesty.audit.body':
    'Hər bal dəyişməsi çəkisi, yazılı səbəbi və vaxt möhürü olan saxlanılmış hadisədir və aidiyyatı olan şəxs ona etiraz edə bilər.',
  'l.honesty.execute':
    'Veb qatında zərərli heç nə icra olunmur',
  'l.honesty.execute.body':
    'Xidmət nümunələri təhlil edir, heç vaxt icra etmir. Detonasiya operatorun idarə etdiyi birdəfəlik maşına aiddir və sərhəd siyasət sənədi ilə deyil, testlə qorunur.',
  'l.honesty.eyebrow':
    'Nə etməyəcək',
  'l.honesty.gate':
    'Model işçi ilə birbaşa danışmır',
  'l.honesty.gate.body':
    'Yaradılmış təlim analitik onu oxuyana qədər təsdiq qapısında saxlanılır. Qapı dövrəni dayandıran şeydir və bu, nəzərdə tutulmuş qiymətdir.',
  'l.honesty.intro':
    'Hər zaman rəqəmi olan panel qurmaq çətin deyil. Bunlar isə bu məhsulun rəqəm verməkdən imtina etdiyi yerlərdir və hər biri ona görə var ki, əks davranış bir dəfə buraxılıb və tutulub.',
  'l.honesty.provenance':
    'Mənşə qeyd olunur, ehtimal edilmir',
  'l.honesty.provenance.body':
    'Hər modul onu yazan mühərriki adlandırır. Oflayn generatora keçid model nəticəsi kimi göstərilmir, olduğu kimi qeyd olunur.',
  'l.honesty.sample':
    'Hədəf olmaq sizin əleyhinizə deyil',
  'l.honesty.sample.body':
    'Təhdidin işçiyə çatması qeyd olunur, amma sıfır bal alır. Ona çəki vermək kənar şəxsə sadəcə məktub göndərməklə başqasının riskini qaldırmağa imkan verirdi — ona görə ölçülən şəxsin etdiyidir, ona edilən deyil.',
  'l.honesty.tiers':
    'Kor nöqtə açıq bildirilir',
  'l.honesty.tiers.body':
    'Hər hesabat işləmiş təhlil qatlarını adlandırır. Dinamik təhlil olmadan verilən hökm bunu bildirir, davranış tapıntısı kimi təqdim edilmir.',
  'l.honesty.title':
    'İmtinalar məhsulun özüdür.',
  'l.loop.eyebrow':
    'Dövrə',
  'l.loop.footnote':
    'Hər keçid mərhələ tarixçəsi ilə saxlanılan qeyddir — ona görə dayanmış icra sadəcə itmir, araşdırıla bilir.',
  'l.loop.gate.body':
    'Çevirmə ilə Hədəfləmə arasında analitik hər yaradılmış modula baxır və onu redaktə edə bilər. Model tərəfindən yazılmış heç nə oxunmadan işçiyə çatmır.',
  'l.loop.gate.eyebrow':
    'İnsan qapısı',
  'l.loop.intro':
    'Əksər məlumatlandırma alətləri çatdırılma ilə bitir. Bu isə sonra nə baş verdiyini qeyd edir və növbəti dəfə kimin təlim alacağını dəyişir — altıncı ayda proqramı birinci aydan fərqli edən yeganə şey budur.',
  'l.loop.stage.analyze':
    'Təhlil',
  'l.loop.stage.analyze.detail':
    'Sandbox mühərriki onu məzmununa görə tanıyır, bal verir və indikatorları çıxarır.',
  'l.loop.stage.convert':
    'Çevirmə',
  'l.loop.stage.convert.detail':
    'Hökm qısa modula çevrilir: dərs, üç-beş suallıq test, bir əsas nəticə.',
  'l.loop.stage.feedback':
    'Geri əlaqə',
  'l.loop.stage.feedback.detail':
    'Hər nəticə balı yeniləyir və bu, növbəti təhdidin kimi hədəflədiyini dəyişir.',
  'l.loop.stage.ingest':
    'Qəbul',
  'l.loop.stage.ingest.detail':
    'Təhdid daxil olur — işçi bildirir, lentdən gəlir və ya analitik göndərir.',
  'l.loop.stage.measure':
    'Ölçmə',
  'l.loop.stage.measure.detail':
    'Tamamlanma, mənimsəmə və sonrakı davranış ayrı-ayrı hadisələr kimi qeydə alınır.',
  'l.loop.stage.target':
    'Hədəfləmə',
  'l.loop.stage.target.detail':
    'Risk mühərriki kimin alacağını seçir və hər şəxsin niyə seçildiyini yazılı bildirir.',
  'l.loop.stage.train':
    'Təlim',
  'l.loop.stage.train.detail':
    'Modul təyin olunur. İşçi ümumi mövzunu deyil, ona səbəb olan təhdidi görür.',
  'l.loop.title':
    'Yeddi mərhələ, və bütün məsələ yeddincidədir.',
  'l.nav.open-portal':
    'Portala keç',
  'l.nav.sign-in':
    'Daxil ol',
  'l.risk.baseline.body':
    'Baza davranış deyil, rol həssaslığıdır: bu vəzifə təşkilata qarşı istifadə olunsa nə qədər ziyan verə bilər. Ondan yuxarı və aşağı olan hər şey şəxsin həqiqətən etdiyidir.',
  'l.risk.baseline.title':
    'Bal haradan başlayır',
  'l.risk.col.delta':
    'Dəyişiklik',
  'l.risk.col.signal':
    'Siqnal',
  'l.risk.eyebrow':
    'Risk modeli',
  'l.risk.footnote':
    'Baza üstəgəl ləğv edilməmiş hadisələrin cəmi ekrandakı bala bərabərdir. Bərabər deyilsə, bu nasazlıqdır və bir test bunu bildirir.',
  'l.risk.intro':
    'Satıcının hesablamasını göstərmədiyi insan-risk balı işçinin etiraz edə bilmədiyi, alıcının auditdən keçirə bilmədiyi baldır. Bu, mühərrikin həqiqətən işlətdiyi cədvəldir.',
  'l.risk.split.body':
    'Davranış riski yalnız təhdid çatanda şəxsin nə etdiyinə görə dəyişir. Təlim krediti proqramda iştiraka görə dəyişir. Səmərəlilik yalnız davranışdan hesablanır — əks halda daha çox təlim təyin etmək balı aşağı salardı və məhsul öz fəaliyyətini irəliləyiş kimi göstərərdi.',
  'l.risk.split.title':
    'Bir deyil, iki rəqəm',
  'l.risk.table-caption':
    'Hər qeydə alınmış siqnalın tətbiq etdiyi bal dəyişikliyi',
  'l.risk.title':
    'Bütün bal cədvəli, açıq şəkildə.',
  'l.risk.w.click':
    'Simulyasiya edilmiş fişinq tələsinə klikləyib',
  'l.risk.w.completed':
    'Təyin edilmiş modulu tamamlayıb',
  'l.risk.w.comprehension':
    'Testi mənimsəmə, alınan bala görə miqyaslanır',
  'l.risk.w.exposure':
    'Real təhdidə məruz qalıb — qeyd olunur, qəsdən çəkisizdir',
  'l.risk.w.failed':
    'Təlimi tamamlayıb, amma testdən keçməyib',
  'l.risk.w.ignored':
    'Təyin edilmiş təlimin vaxtını keçirib',
  'l.risk.w.report-real':
    'Həqiqətən şübhəli artefakt barədə bildirib',
  'l.risk.w.report-sim':
    'Simulyasiya edilmiş fişinqə əməl etmək əvəzinə bildirib',
  'l.sandbox.cap.archives':
    'Arxivlər, hədlərlə',
  'l.sandbox.cap.archives.body':
    'Üzvlər genişlənmə, nisbət və dərinlik hədləri altında açılır və hər biri ayrıca bal alan işə çevrilir. Şifrələnmiş arxiv dayanıb parol soruşur — heç vaxt brute-force edilmir.',
  'l.sandbox.cap.export':
    'Binadan çıxan sübut',
  'l.sandbox.cap.export.body':
    'JSON, STIX 2.1 və PDF — hər biri hansı təhlil qatlarının həqiqətən işlədiyini bildirir. İmza açarı təyin edilibsə, hesabat alıcının quraşdırmaya güvənmədən yoxlaya biləcəyi Ed25519 imzası daşıyır.',
  'l.sandbox.cap.identify':
    'Baytlarına görə tanınır',
  'l.sandbox.cap.identify.body':
    'invoice.pdf adı verilmiş icra faylı, məzmunu adı ilə ziddiyyət təşkil etdiyi anda işarələnir. Uzantı fakt deyil, iddia sayılır.',
  'l.sandbox.cap.score':
    'Hesablaması göstərilən bal',
  'l.sandbox.cap.score.body':
    '0.6 × qayda + 0.4 × model, aşağıdan kritikə qədər zolaqlarla. Model ekspert çəkiləri ilə qurulub və belə də adlandırılır — heç vaxt görmədiyi korpusda öyrədilmiş klassifikator kimi təqdim edilmir.',
  'l.sandbox.cap.static':
    'Təhlil olunur, icra edilmir',
  'l.sandbox.cap.static.body':
    'PE importları, Office makroları, base64 qatları açılmış skript gizlətməsi, PDF əməliyyatları, ELF bölmələri — üstəgəl YARA qatı. Veb xidmət nümunəni heç vaxt icra etmir və bunu edə biləcək kod yollarını bir test qadağan edir.',
  'l.sandbox.cap.url':
    'URL-lər, mühafizə arxasında',
  'l.sandbox.cap.url.body':
    'Göndərilən URL server tərəfdə, özəl, loopback və bulud-metadata ünvanlarını rədd edən SSRF mühafizəsi arxasında yüklənir və hər yönləndirmə yenidən yoxlanılır.',
  'l.sandbox.eyebrow':
    'Analiz mühərriki',
  'l.sandbox.families':
    'Məzmun növünə görə seçilən analizatorlar',
  'l.sandbox.footnote':
    'Dinamik detonasiya host-dan kənarda, izolyasiya olunmuş işçidə icra olunur. İşçi qoşulmayıbsa, hər hesabat heç kimin müşahidə etmədiyi təmiz davranış nəticəsi bildirmək əvəzinə, nümunənin detonasiya edilmədiyini yazır.',
  'l.sandbox.intro':
    'Eyni mühərrik həm müstəqil məhsul, həm də dövrənin ikinci mərhələsi kimi işləyir — eyni fayllar, bayt-bayt, və fərqlənsələr düşən bir testlə yoxlanılır. Bir yerdə verilən hökm digərində eyni kodla verilir.',
  'l.sandbox.title':
    'Hissələrinə ayıra biləcəyiniz hökm.',
  'l.skip-to-content':
    'Məzmuna keç',
  'l.hero.scene-alt':
    'Dan yeri sökülərkən dağ çəmənində duran masa və açıq noutbuk; kamera ekran bütün kadrı dolduranadək yaxınlaşır.',
  'l.hero.scroll-hint':
    'Aşağı sürüşdürün',
  'l.loop.shot-alt':
    'Qapalı dövrələr ekranı: hər icra mərhələ tarixçəsi və hazırkı statusu ilə.',
  'l.risk.shot-alt':
    'Risk profilləri ekranı — burada hər bal onu yaradan hadisələrə ayrılır.',
  'l.sandbox.shot-alt':
    'Tamamlanmış təhlil: fayl, təsnifatı, balı və ondan çıxarılan texnikalar.',
  'l.loop.gate.shot-alt':
    'Təsdiq növbəsi: yaradılmış modul kimsə onu almazdan əvvəl analitikin oxuması üçün saxlanılır.',
  'l.loop.tabs-hint':
    'Hansı ekranda baş verdiyini görmək üçün mərhələni seçin.',
  'sbx.standalone.body':
    'Yeni səhifədə, sizin adınıza açıq şəkildə açılır — ikinci parol yoxdur. Sessiya sizin öz ünvanınızı daşıyır, ona görə oradakı təhvil zənciri ortaq hesabı deyil, əməliyyatı edən şəxsi qeyd edir.',
  'sbx.standalone.cap.audit':
    'Təhvil zənciri',
  'sbx.standalone.cap.engines':
    'Mühərrik matrisi',
  'sbx.standalone.cap.retention':
    'Saxlama siyasəti',
  'sbx.standalone.cap.tuning':
    'Bal tənzimləməsi',
  'sbx.standalone.open':
    'Sandbox-u aç',
  'sbx.standalone.subtitle':
    'Eyni mühərrik, bayt-bayt — üstəgəl bu portalda təkrarlanmayan operator ekranları.',
  'sbx.standalone.title':
    'Tam sandbox quraşdırması',

  'pl.approve-module':
    'Modulu təsdiqlə',
  'pl.ask-cyber-ai':
    'Cyber AI-dan soruş',
  'pl.assigned-to':
    'Təyin edilib',
  'pl.assistant-error':
    'Köməkçi cavab verə bilmədi',
  'pl.assistant-intro':
    'Portalın ekranları, kimin hansı sistemdən asılı olduğu və ya hücumun qarşısını nəyin aldığı barədə soruşun.',
  'pl.assistant-thinking':
    'Düşünür…',
  'pl.auto-train':
    'Avtomatik təlim',
  'pl.awaiting-review':
    'Baxış gözləyir',
  'pl.close-assistant':
    'Köməkçini bağla',
  'pl.cyber-ai':
    'Cyber AI',
  'pl.cyber-ai-tagline':
    'Portal, inventar və qabaqlayıcı tədbirlər — yalnız əsaslandırılmış cavablar.',
  'pl.escalated':
    'Eskalasiya olunub',
  'pl.finding-is-closed':
    'Bu tapıntı bağlıdır',
  'pl.generated-awaiting-approval':
    'Yaradıldı — təsdiq gözləyir',
  'pl.grc-watch':
    'GRC müşahidəçisi',
  'pl.grc-watch-subtitle':
    'Kəşfiyyat lenti arxa planda aktiv siyasət qaydaları ilə tutuşdurulur. Yeniliklər burada görünür; tapıntıya çevirmək sizin qərarınızdır.',
  'pl.knowledge-base':
    'Bilik bazası',
  'pl.last-scan-summary':
    'Son skan {when}: {rules} qayda {items} kəşfiyyat elementi ilə tutuşdurulub.',
  'pl.no-employees-on-finding':
    'Bu tapıntıda işçi adı yoxdur',
  'pl.no-watch-matches-yet':
    'Hələ qeydə alınmış uyğunluq yoxdur.',
  'pl.open-threat-intelligence':
    'Təhdid kəşfiyyatını aç',
  'pl.path-assigned':
    'Təyin edildi',
  'pl.path-generated':
    'Təsdiq gözləyir',
  'pl.reading-watch-status':
    'Müşahidə statusu oxunur',
  'pl.reject-module':
    'Rədd et',
  'pl.rejection-reason':
    'Bu modul niyə rədd edilir?',
  'pl.scan-now':
    'İndi skan et',
  'pl.send':
    'Göndər',
  'pl.skipped':
    'Ötürülüb',
  'pl.suggest-interface':
    'Komanda Mərkəzi nə göstərir?',
  'pl.suggest-inventory':
    'ERP hansı serverdən asılıdır?',
  'pl.suggest-preventive':
    'Fişinqə qarşı nə edim?',
  'pl.supporting-resources':
    'Dəstəkləyici resurslar',
  'pl.template':
    'Şablon',
  'pl.training-assigned':
    'Təlim təyin edildi',
  'pl.watch-disabled':
    'Bu quraşdırmada arxa plan skanı söndürülüb; əl ilə skan işləyir.',
  'pl.watch-footer':
    'Uyğunluqlara kəşfiyyat ekranında baxılır və eskalasiya olunur.',
  'pl.watch-has-not-run-yet':
    'Arxa plan skanı hələ işləməyib. İndi işə salın və ya intervalı gözləyin.',

  'tour.ai.body':
    'İstənilən ekran, kimin hansı sistemdən asılı olduğu, və ya hücumun qarşısını əslində nəyin aldığı barədə soruşun. Hər cavab mənbəyini daşıyır; əsası olmayan sual uydurulmur, rədd edilir.',
  'tour.ai.title':
    'Cyber AI, küncdə',
  'tour.aria':
    'Bələdçili tur',
  'tour.back':
    'Geri',
  'tour.cc.body':
    'Hər ekranın bir sualı var: indi nəyə insan lazımdır. Plitələr canlı saylardır — təsdiq qapısında gözləyənlər, dövrədə hərəkət edənlər, sandbox-un bu gün edə bilmədikləri. Hər plitə keçiddir.',
  'tour.cc.title':
    'Buradan başlayın: Komanda Mərkəzi',
  'tour.end':
    'Turu bitir',
  'tour.finish':
    'Bitir',
  'tour.gate.body':
    'Yaradılan heç nə adı bəlli şəxs təsdiqləməyincə işçiyə çatmır. Analitik işçinin oxuyacağını eynilə oxuyur, redaktə edə bilir, rədd üçün isə yazılı səbəb tələb olunur. Bu qapı məhsulun əsas iddiasıdır, parametr deyil.',
  'tour.gate.title':
    'Təsdiq qapısı',
  'tour.grc.body':
    'Öz sənədləriniz qaydalar reyestri kimi — ISO 27001, NIST CSF, NIS2, PCI DSS buradadır. Müşahidəçi yeni bülletenləri arxa planda aktiv qaydalarla tutuşdurur və tapdığını göstərir; uyğunluğu tapıntıya çevirmək sizin qərarınız olaraq qalır.',
  'tour.grc.title':
    'Siyasət və GRC müşahidəsi',
  'tour.incident.body':
    'Bu, idarəetmə işinin əsas qapısıdır. Tapıntı konkret şəxsləri bağlayır, son tarix daşıya bilər, və "Avtomatik təlim" onu təlimə çevirir: kataloqdan uyğun təsdiqlənmiş modul, uyğun yoxdursa isə yaradılıb təsdiq növbəsinə qoyulan modul.',
  'tour.incident.title':
    'İnsident riskləri: İR komandasının tapıntıları',
  'tour.intake.body':
    'Real artefaktlar, üç qapıdan: işçi bildirir, seçilmiş lent gətirir, və ya analitik burada göndərir. Sonrakı hər şey bunlardan qurulur — təlim heç kimin görmədiyi təhdid haqqında şablondan uydurulmur.',
  'tour.intake.title':
    'Qəbul: təhdid buradan gəlir',
  'tour.next':
    'İrəli',
  'tour.people.body':
    'Balı davranış dəyişir, iştirak yox. Təlimi tamamlamaq ayrı oxda kredit qazandırır — yəni insan dərsləri kliklə keçərək riskini aşağı sala bilməz. Bal ölçülməyibsə, ekran sıfır göstərmək əvəzinə bunu deyir.',
  'tour.people.title':
    'İnsanlar və risk',
  'tour.portal.body':
    'Sizə nə təyin edilib və niyə — hər element onu buraya hansı real insident və ya təhdidin gətirdiyini deyir. Dərsi bitirin, suallara cavab verin, nəticə isə sizin risk mənzərənizə qayıdır.',
  'tour.portal.title':
    'Sizin təliminiz',
  'tour.report.body':
    'E-poçt, link, SMS, söhbət mesajı və ya fayl. O, analitikə çatır; real çıxsa, hamını qoruyan dövrəni başladır. Bildirmək həmişə düzgün addımdır — kliklədikdən sonra da.',
  'tour.report.title':
    'Şübhəli olan hər şeyi bildirin',
  'tour.sandbox.body':
    'Statik təhlil burada işləyir; dinamik detonasiya yalnız izolyasiya olunmuş kənar işçidə, heç vaxt bu veb tətbiqin içində. Detonasiya əlçatan olmayanda qərar bunu açıq deyir — baxıb heç nə tapmadığını iddia etmir.',
  'tour.sandbox.title':
    'Təhlil: sandbox',
  'tour.step-of':
    '{total} addımdan {n}-cisi',
  'tour.take-the-tour':
    'Turu keç',
  'tour.training.body':
    'Real təhdidlərdən çevrilmiş qısa dərslər, yoxlanılmış xarici material ilə — həqiqətən açılıb yoxlanılmış YouTube və Coursera linkləri. Heç vaxt açılmamış link ümumiyyətlə göstərilmir.',
  'tour.training.title':
    'Təlim: modullar və real kurslar',
}

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = { en, az }
