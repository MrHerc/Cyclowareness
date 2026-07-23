import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Send,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import { api } from '../../lib/api'
import type { AssignmentDetail, QuizResult } from '../../lib/types'
import {
  Button,
  Callout,
  Chip,
  Empty,
  LoadState,
  PageHeader,
  Panel,
  Provenance,
  RiskMeter,
  Spinner,
  channelLabel,
  cx,
  signed,
} from '../../components/ui'

type Phase = 'lesson' | 'quiz' | 'result' | 'review'

export function TakeTraining() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null)
  const [phase, setPhase] = useState<Phase>('lesson')
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const startedAt = useRef(Date.now())

  useEffect(() => {
    api
      .get<AssignmentDetail>(`/api/training/assignments/${id}`)
      .then((a) => {
        setAssignment(a)
        setAnswers(new Array(a.module.quiz.length).fill(null))
        if (a.status === 'completed') setPhase('review')
        else if (a.status === 'assigned') void api.post(`/api/training/assignments/${a.id}/start`)
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to load training'))
  }, [id])

  if (loadError)
    return (
      <div className="rise mx-auto max-w-2xl">
        <LoadState error={loadError} />
        <p className="text-sm mt-4 text-center">
          <Link to="/me" className="inline-flex items-center gap-1.5 text-brand-fg hover:underline">
            <ArrowLeft size={14} aria-hidden /> Back to your portal
          </Link>
        </p>
      </div>
    )
  if (!assignment) return <Spinner label="Loading training…" />
  const module = assignment.module
  const isReview = phase === 'review'

  const submitQuiz = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await api.post<QuizResult>(`/api/training/assignments/${assignment.id}/complete`, {
        answers: answers.map((a) => a ?? 0),
        time_spent_seconds: Math.round((Date.now() - startedAt.current) / 1000),
      })
      setResult(res)
      setPhase('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit')
    } finally {
      setBusy(false)
    }
  }

  const isLast = questionIndex === module.quiz.length - 1
  const allAnswered = answers.every((a) => a !== null)
  const question = module.quiz[questionIndex]

  return (
    <div className="rise mx-auto max-w-2xl space-y-6 pb-8">
      <PageHeader
        breadcrumb={
          <Link to="/me" className="inline-flex items-center gap-1.5 hover:text-c1">
            <ArrowLeft size={14} aria-hidden /> Your portal
          </Link>
        }
        title={module.title}
        lede={module.description}
      />

      <div className="flex flex-wrap items-center gap-2">
        {/* Never let canned content borrow the model's credit — Provenance
            decides the employee-facing wording from the generation source. */}
        {module.ai_generated && <Provenance source={module.generation_source} audience="employee" />}
        <Chip>{channelLabel(module.channel)}</Chip>
        <span className="text-xs text-c3">about {module.est_minutes} min</span>
      </div>

      {assignment.targeting_reasons.length > 0 && (
        <Callout tone="brand" title="Why you received this">
          {assignment.targeting_reasons.join(' · ')}
        </Callout>
      )}

      {isReview && (
        <Callout tone="success" title="Already completed" icon={<CheckCircle2 size={13} aria-hidden />}>
          {assignment.score !== null ? (
            <>
              You scored <span className="font-semibold text-c1">{assignment.score.toFixed(0)}%</span> on this module.
              Nothing here can change that score — this is the lesson kept open for reference.
            </>
          ) : (
            <>
              You have finished this module. Nothing here can change your score — this is the lesson kept open for
              reference.
            </>
          )}
        </Callout>
      )}

      {(phase === 'lesson' || isReview) && (
        <>
          <Panel title="Lesson">
            <div className="space-y-6">
              {module.content.map((section, i) => (
                <article key={section.heading}>
                  <h3 className="text-h flex items-baseline gap-2.5">
                    <span className="text-xs shrink-0 font-mono text-c3">{String(i + 1).padStart(2, '0')}</span>
                    <span>{section.heading}</span>
                  </h3>
                  <p className="text-body mt-2 leading-relaxed text-c2">{section.body}</p>
                </article>
              ))}
            </div>
          </Panel>

          {module.takeaway && isReview && (
            <Callout tone="brand" title="Remember this">
              <span className="italic">{module.takeaway}</span>
            </Callout>
          )}

          <div className="flex justify-end">
            {isReview ? (
              <Button onClick={() => navigate('/me')}>Back to your portal</Button>
            ) : (
              <Button variant="primary" size="lg" onClick={() => setPhase('quiz')}>
                Take the quiz <ArrowRight size={15} aria-hidden />
              </Button>
            )}
          </div>
        </>
      )}

      {phase === 'quiz' && (
        <Panel
          title={`Question ${questionIndex + 1} of ${module.quiz.length}`}
          actions={
            <div role="group" aria-label="Quiz progress" className="flex items-center gap-1">
              {module.quiz.map((_, i) => {
                const answered = answers[i] !== null
                const current = i === questionIndex
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setQuestionIndex(i)}
                    aria-current={current ? 'step' : undefined}
                    aria-label={`Question ${i + 1}, ${answered ? 'answered' : 'not answered'}`}
                    className="flex h-4 items-center px-0.5"
                  >
                    <span
                      className={cx(
                        'block h-1.5 rounded-full transition-all',
                        current ? 'w-8' : 'w-5',
                        answered ? 'bg-brand' : current ? 'bg-brand/45' : 'bg-line-strong',
                      )}
                    />
                  </button>
                )
              })}
            </div>
          }
        >
          {!question ? (
            <Empty>This module has no quiz questions.</Empty>
          ) : (
            <>
              <h3 className="text-lead font-semibold">{question.question}</h3>
              <div role="group" aria-label={question.question} className="mt-4 space-y-2">
                {question.options.map((opt, oi) => {
                  const selected = answers[questionIndex] === oi
                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => setAnswers((prev) => prev.map((a, i) => (i === questionIndex ? oi : a)))}
                      aria-pressed={selected}
                      className={cx(
                        'text-body flex w-full items-baseline gap-3 rounded-control border px-4 py-3 text-left transition-colors',
                        selected
                          ? 'border-brand bg-brand/12 text-c1'
                          : 'border-line bg-raised text-c2 hover:border-line-strong hover:text-c1',
                      )}
                    >
                      <span className={cx('text-xs shrink-0 font-mono', selected ? 'text-brand-fg' : 'text-c3')}>
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  )
                })}
              </div>

              {/* Deliberate navigation — no auto-submit traps. An earlier version
                  submitted the quiz on the last answer click, so one misclick
                  applied an irreversible score and risk change. Submitting is
                  always an explicit act, and only once every question is answered. */}
              <div className="mt-6 flex items-center justify-between gap-3 border-t border-hair pt-4">
                <Button
                  variant="ghost"
                  disabled={questionIndex === 0}
                  onClick={() => setQuestionIndex((i) => Math.max(0, i - 1))}
                >
                  <ArrowLeft size={14} aria-hidden /> Previous
                </Button>
                {isLast ? (
                  <Button
                    variant="primary"
                    onClick={() => void submitQuiz()}
                    busy={busy}
                    disabled={!allAnswered}
                  >
                    <Send size={14} aria-hidden /> Submit answers
                  </Button>
                ) : (
                  <Button
                    disabled={answers[questionIndex] === null}
                    onClick={() => setQuestionIndex((i) => Math.min(module.quiz.length - 1, i + 1))}
                  >
                    Next <ArrowRight size={14} aria-hidden />
                  </Button>
                )}
              </div>
              {isLast && !allAnswered && (
                <p className="text-xs mt-2 text-right text-c3">Answer every question before you submit.</p>
              )}
              {error && (
                <div className="mt-3" role="alert">
                  <Callout tone="danger" title="Submission failed">
                    {error}
                  </Callout>
                </div>
              )}
            </>
          )}
        </Panel>
      )}

      {phase === 'result' && result && (
        <div className="space-y-5" aria-live="polite">
          <Panel tone="feature">
            <div className="text-center">
              <div className="label text-c3">Your score</div>
              <p className="text-display mt-1.5">{result.score.toFixed(0)}%</p>
              <p className="text-sm mt-1 text-c2">
                {result.correct} of {result.total} correct
              </p>
              <p
                className={cx(
                  'text-lead mt-4 inline-flex items-center gap-2 font-semibold',
                  result.passed ? 'text-success' : 'text-warning',
                )}
              >
                {result.passed ? (
                  <CheckCircle2 size={16} aria-hidden />
                ) : (
                  <XCircle size={16} aria-hidden />
                )}
                {result.passed ? 'Passed' : 'Not a pass yet'}
              </p>
              <p className="text-sm mt-1 text-c2">
                {result.passed
                  ? 'This module is closed out for you.'
                  : 'Read the explanations below — they are the part that sticks.'}
              </p>
            </div>

            {/* Cause and effect, stated in that order: what you did, what it
                moved, where it now sits. The sign is spelled out so the colour
                is never the only thing carrying the direction. */}
            <div className="mt-6 border-t border-hair pt-5 text-center">
              <div className="label text-c3">What this changed</div>
              <p className="text-lead mt-2 text-c2">
                You completed this module, so your risk score moved by{' '}
                <span
                  className={cx(
                    'inline-flex items-baseline gap-1 font-mono font-semibold',
                    result.risk_delta <= 0 ? 'text-success' : 'text-warning',
                  )}
                >
                  {result.risk_delta <= 0 ? (
                    <TrendingDown size={14} aria-hidden />
                  ) : (
                    <TrendingUp size={14} aria-hidden />
                  )}
                  {signed(result.risk_delta)}
                </span>
                . It is now{' '}
                <span className="font-mono font-semibold text-c1">{result.new_risk_score.toFixed(1)}</span> out of 100.
              </p>
              <div className="mt-3 flex justify-center">
                <RiskMeter score={result.new_risk_score} />
              </div>
            </div>
          </Panel>

          <Panel title="Answer review">
            <ul className="space-y-3">
              {module.quiz.map((q, qi) => {
                const pq = result.per_question[qi]
                // per_question is keyed by position; if the server ever returns a
                // shorter list, skip rather than blank the whole result screen.
                if (!pq) return null
                return (
                  <li key={qi} className="rounded-control border border-hair bg-raised p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-body font-medium">{q.question}</p>
                      <span className="shrink-0">
                        <Chip tone={pq.correct ? 'success' : 'danger'}>{pq.correct ? 'Correct' : 'Incorrect'}</Chip>
                      </span>
                    </div>
                    {!pq.correct && (
                      <p className="text-sm mt-1.5 text-success">
                        The right answer was {q.options[pq.correct_index] ?? '—'}
                      </p>
                    )}
                    {pq.explanation && <p className="text-sm mt-1.5 text-c2">{pq.explanation}</p>}
                  </li>
                )
              })}
            </ul>
          </Panel>

          {module.takeaway && (
            <Callout tone="brand" title="Remember this">
              <span className="italic">{module.takeaway}</span>
            </Callout>
          )}

          <div className="flex justify-center">
            <Button variant="primary" size="lg" onClick={() => navigate('/me')}>
              Back to your portal
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
