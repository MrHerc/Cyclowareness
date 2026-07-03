import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Rss } from 'lucide-react'
import { api } from '../../lib/api'
import { usePoll } from '../../lib/usePoll'
import type { FeedItem } from '../../lib/types'
import { Badge, Button, Card, EmptyState, Spinner, channelLabel, timeAgo } from '../../components/ui'

export function FeedPage() {
  const { data: items, refresh } = usePoll<FeedItem[]>(() => api.get('/api/feed'), 8000)
  const navigate = useNavigate()
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const push = async (item: FeedItem) => {
    setBusyId(item.id)
    setError(null)
    try {
      const res = await api.post<{ loop_run_id: number }>(`/api/feed/${item.id}/push-to-loop`)
      await refresh()
      navigate(`/loop/${res.loop_run_id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
      setBusyId(null)
    }
  }

  return (
    <div className="fade-in space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Curated Intel Feed</h1>
        <p className="text-sm text-muted">
          Input-only: relevant real-world threats an analyst can push straight into the loop (stage 1). Not a news portal.
        </p>
      </div>

      {error && <div className="text-sm text-bad">{error}</div>}

      {!items ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState>
          <Rss size={20} className="mx-auto mb-2 text-faint" />
          Feed is empty.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge value={item.severity} />
                <Badge value={item.threat_type} />
                <Badge value={item.artifact_type} label={channelLabel(item.artifact_type)} />
                <span className="text-xs text-faint">
                  {item.source_name} · {timeAgo(item.published_at)}
                </span>
                {item.pushed_to_loop && (
                  <span className="ml-auto rounded-md border border-good/30 bg-good/10 px-1.5 py-0.5 text-[10px] text-good">
                    in the loop ✓
                  </span>
                )}
              </div>
              <h3 className="mt-2 text-sm font-semibold">{item.title}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">{item.summary}</p>
              {item.artifact_example && (
                <pre className="mt-3 max-h-28 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-bg p-3 font-mono text-[11px] leading-relaxed text-muted">
                  {item.artifact_example}
                </pre>
              )}
              {!item.pushed_to_loop && (
                <div className="mt-3">
                  <Button busy={busyId === item.id} onClick={() => void push(item)}>
                    Push into the loop <ArrowRight size={14} />
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
