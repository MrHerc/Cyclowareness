/**
 * The artifact itself, behind a deliberate click.
 *
 * It is collapsed by default because the raw body of a phish is the one thing on
 * this page that was written by an attacker, and it should be revealed on
 * purpose rather than encountered while scrolling. `CodeBlock` renders it as a
 * single text node — never linkified, never syntax-coloured, never sanitised
 * into something that reads as safe.
 */

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button, CodeBlock, Panel } from '../../components/ui'
import { bytes } from '../../lib/format'

export interface RawArtifactPanelProps {
  value: string
  artifactType: string
}

export function RawArtifactPanel({ value, artifactType }: RawArtifactPanelProps) {
  const [shown, setShown] = useState(false)
  const size = new TextEncoder().encode(value).length

  return (
    <Panel
      title="Raw artifact"
      subtitle={`${bytes(size)} of ${artifactType} content, stored as inert text.`}
      actions={
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShown((current) => !current)}
          aria-expanded={shown}
          aria-controls="raw-artifact-body"
          icon={
            shown ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )
          }
        >
          {shown ? 'Hide' : 'Show'}
        </Button>
      }
    >
      <div id="raw-artifact-body">
        {shown ? (
          <CodeBlock value={value} label="Artifact body" copyable wrap maxHeight="28rem" />
        ) : (
          <p className="text-body text-fg-subtle">
            Hidden by default. This is attacker-authored content; it is displayed verbatim as text and
            is never fetched, executed or turned into a link.
          </p>
        )}
      </div>
    </Panel>
  )
}
