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
  'cc.degraded': 'Zəifləmiş imkan',
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
}

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = { en, az }
