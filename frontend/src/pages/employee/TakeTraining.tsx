import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle } from 'lucide-react'
import { api } from '../../lib/api'
import type { AssignmentDetail, QuizResult } from '../../lib/types'
import { Badge, Button, Card, Spinner, channelLabel, cx } from '../../components/ui'

type Phase = 'lesson' | 'quiz' | 'result'

export function TakeTraining() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null)
  const [phase, setPhase] = useState<Phase>('lesson')
  const [answers, setAnswers] = useState<number[]>([])
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
        if (a.status === 'assigned') void api.post(`/api/training/assignments/${a.id}/start`)
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to load training'))
  }, [id])

  if (loadError)
    return (
      <div className="fade-in mx-auto max-w-2xl py-10 text-center">
        <p className="text-sm text-bad">{loadError}</p>
        <Link to="/me" className="mt-3 inline-block text-sm text-accent hover:underline">
          ← Back to your portal
        </Link>
      </div>
    )
  if (!assignment) return <Spinner label="Loading training…" />
  const module = assignment.module

  if (assignment.status === 'completed' && phase !== 'result') {
    return (
      <div className="fade-in mx-auto max-w-2xl py-8 text-center">
        <CheckCircle2 size={32} className="mx-auto text-good" />
        <h1 className="mt-3 text-lg font-bold">Already completed</h1>
        <p className="mt-1 text-sm text-muted">
          You scored {assignment.score?.toFixed(0)}% on this module.
        </p>
        <Link to="/me" className="mt-4 inline-block text-sm text-accent hover:underline">
          ← Back to your portal
        </Link>
      </div>
    )
  }

  const submitQuiz = async (finalAnswers: number[]) => {
    setBusy(true)
    setError(null)
    try {
      const res = await api.post<QuizResult>(`/api/training/assignments/${assignment.id}/complete`, {
        answers: finalAnswers,
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

  const answer = (optionIndex: number) => {
    const next = [...answers]
    next[questionIndex] = optionIndex
    setAnswers(next)
    if (questionIndex < module.quiz.length - 1) {
      setQuestionIndex(questionIndex + 1)
    } else {
      void submitQuiz(next)
    }
  }

  return (
    <div className="fade-in mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/me')} className="flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft size={15} /> Portal
        </button>
        <Badge value={module.channel} label={channelLabel(module.channel)} />
        <span className="text-[11px] text-faint">~{module.est_minutes} min</span>
      </div>

      <div>
        <h1 className="text-xl font-bold tracking-tight">{module.title}</h1>
        <p className="mt-1 text-sm text-muted">{module.description}</p>
        {assignment.targeting_reasons.length > 0 && (
          <p className="mt-2 rounded-lg border border-indigo/25 bg-indigo/5 px-3 py-2 text-xs italic text-indigo">
            Why you received this: {assignment.targeting_reasons.join(' · ')}
          </p>
        )}
      </div>

      {phase === 'lesson' && (
        <>
          <div className="space-y-3">
            {module.content.map((section, i) => (
              <Card key={section.heading} className="p-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                    {i + 1}
                  </span>
                  <h2 className="text-sm font-semibold">{section.heading}</h2>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">{section.body}</p>
              </Card>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setPhase('quiz')} className="px-5 py-2">
              Take the quiz <ArrowRight size={15} />
            </Button>
          </div>
        </>
      )}

      {phase === 'quiz' && (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between text-xs text-faint">
            <span>
              Question {questionIndex + 1} of {module.quiz.length}
            </span>
            <div className="flex gap-1">
              {module.quiz.map((_, i) => (
                <span
                  key={i}
                  className={cx(
                    'h-1.5 w-6 rounded-full',
                    i < questionIndex ? 'bg-accent' : i === questionIndex ? 'bg-accent/50' : 'bg-surface-3',
                  )}
                />
              ))}
            </div>
          </div>
          <h2 className="text-base font-semibold leading-relaxed">{module.quiz[questionIndex].question}</h2>
          <div className="mt-4 space-y-2">
            {module.quiz[questionIndex].options.map((opt, oi) => (
              <button
                key={oi}
                disabled={busy}
                onClick={() => answer(oi)}
                className="block w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-left text-sm transition-colors hover:border-accent/60 hover:bg-accent/5 disabled:opacity-50"
              >
                <span className="mr-2 font-mono text-xs text-faint">{String.fromCharCode(65 + oi)}</span>
                {opt}
              </button>
            ))}
          </div>
          {error && <div className="mt-3 text-xs text-bad">{error}</div>}
        </Card>
      )}

      {phase === 'result' && result && (
        <div className="space-y-4">
          <Card className={cx('p-6 text-center', result.passed ? 'border-good/40' : 'border-warn/40')}>
            <div className="text-4xl">{result.passed ? '🎉' : '💪'}</div>
            <h2 className="mt-2 text-2xl font-bold">
              {result.score.toFixed(0)}%{' '}
              <span className="text-sm font-medium text-muted">
                ({result.correct}/{result.total} correct)
              </span>
            </h2>
            <p className={cx('mt-1 text-sm font-medium', result.passed ? 'text-good' : 'text-warn')}>
              {result.passed ? 'Passed — well done!' : 'Not quite — review the explanations below.'}
            </p>
            <div
              className={cx(
                'mx-auto mt-4 w-fit rounded-xl border px-4 py-2.5 text-sm',
                result.risk_delta <= 0 ? 'border-good/40 bg-good/10 text-good' : 'border-warn/40 bg-warn/10 text-warn',
              )}
            >
              Your risk score changed by{' '}
              <span className="font-mono font-bold">
                {result.risk_delta > 0 ? '+' : ''}
                {result.risk_delta.toFixed(1)}
              </span>{' '}
              → now <span className="font-mono font-bold">{result.new_risk_score.toFixed(1)}</span>
            </div>
          </Card>

          <Card className="p-5">
            <div className="space-y-3">
              {module.quiz.map((q, qi) => {
                const pq = result.per_question[qi]
                return (
                  <div key={qi} className="rounded-lg border border-border bg-surface-2 p-3">
                    <div className="flex items-start gap-2">
                      {pq.correct ? (
                        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-good" />
                      ) : (
                        <XCircle size={15} className="mt-0.5 shrink-0 text-bad" />
                      )}
                      <div>
                        <div className="text-[13px] font-medium">{q.question}</div>
                        {!pq.correct && (
                          <div className="mt-1 text-xs text-good">Correct: {q.options[pq.correct_index]}</div>
                        )}
                        {pq.explanation && <p className="mt-1 text-xs text-muted">{pq.explanation}</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {module.takeaway && (
            <Card className="border-accent/30 bg-accent/5 p-5 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">Remember this</div>
              <p className="mt-1.5 text-sm italic leading-relaxed">“{module.takeaway}”</p>
            </Card>
          )}

          <div className="flex justify-center pb-6">
            <Button onClick={() => navigate('/me')} className="px-5 py-2">
              Back to your portal
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
