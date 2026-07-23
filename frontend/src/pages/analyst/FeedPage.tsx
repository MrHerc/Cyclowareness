import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Rss } from 'lucide-react'
import { api } from '../../lib/api'
import { usePoll } from '../../lib/usePoll'
import type { FeedItem } from '../../lib/types'
import {
  Button,
  Callout,
  Chip,
  CodeBlock,
  Empty,
  GroupLabel,
  LoadState,
  PageHeader,
  Panel,
  Status,
  channelLabel,
  timeAgo,
} from '../../components/ui'

export function FeedPage() {
  const { data: items, error: loadError, refresh } = usePoll<FeedItem[]>(() => api.get('/api/feed'), 8000)
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
    <div className="rise space-y-6">
      <PageHeader
        title="Intel feed"
        lede="Curated real-world threats an analyst can push straight into stage 1. Input only — this is not a news portal."
      />

      {/* A push that fails leaves the analyst on this page, so the reason has to
          be announced rather than silently swallowed. */}
      {error && (
        <div role="alert" aria-live="polite">
          <Callout tone="danger">{error}</Callout>
        </div>
      )}

      {!items ? (
        <LoadState error={loadError} label="Loading the feed" onRetry={refresh} />
      ) : items.length === 0 ? (
        <Empty icon={<Rss size={20} aria-hidden />}>
          Nothing in the feed right now. Curated items appear here as they are published.
        </Empty>
      ) : (
        <Panel
          title="Published items"
          actions={<span className="text-sm text-c3">{items.length}</span>}
        >
          <ul className="divide-hair">
            {items.map((item) => (
              <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <Status value={item.severity} />
                  <Chip>{item.threat_type.replace(/_/g, ' ')}</Chip>
                  <Chip>{channelLabel(item.artifact_type)}</Chip>
                  <span className="text-xs text-c3">
                    {item.source_name} · {timeAgo(item.published_at)}
                  </span>
                  {item.pushed_to_loop && (
                    <span className="ml-auto">
                      <Status value="in_loop" label="In the loop" />
                    </span>
                  )}
                </div>

                <h3 className="text-h mt-2.5">{item.title}</h3>
                <p className="text-body mt-1 max-w-3xl text-c2">{item.summary}</p>

                {item.artifact_example && (
                  <div className="mt-3 max-w-3xl">
                    <GroupLabel>Sample artifact</GroupLabel>
                    <CodeBlock maxHeight={140}>{item.artifact_example}</CodeBlock>
                  </div>
                )}

                {!item.pushed_to_loop && (
                  <div className="mt-3">
                    <Button variant="primary" busy={busyId === item.id} onClick={() => void push(item)}>
                      Push into the loop <ArrowRight size={14} aria-hidden />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}
