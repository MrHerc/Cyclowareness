/**
 * Disclosure sections — analyzer output, policy rules, evidence lists.
 *
 * `AccordionItem` takes its heading as a prop rather than as a `<Trigger>`
 * child so every section header in the product has the same hit area, the same
 * chevron and the same hairline. The chevron rotates; nothing else moves,
 * because content that slides while an analyst is reading it is worse than
 * content that simply appears.
 */

import * as RadixAccordion from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/format'

export const Accordion = RadixAccordion.Root
export type AccordionProps = ComponentProps<typeof RadixAccordion.Root>

export interface AccordionItemProps {
  value: string
  heading: ReactNode
  /** Right-aligned in the header — a count, a Badge, a timestamp. */
  meta?: ReactNode
  disabled?: boolean
  className?: string
  children: ReactNode
}

export function AccordionItem({
  value,
  heading,
  meta,
  disabled,
  className,
  children,
}: AccordionItemProps) {
  return (
    <RadixAccordion.Item
      value={value}
      disabled={disabled}
      className={cn('border-b border-line-subtle last:border-b-0', className)}
    >
      <RadixAccordion.Header className="flex">
        <RadixAccordion.Trigger
          className={cn(
            'group flex flex-1 items-center gap-3 py-3 text-left',
            'text-body font-medium text-fg-muted transition-colors duration-150',
            'hover:text-fg disabled:pointer-events-none disabled:opacity-40',
          )}
        >
          <ChevronDown
            size={15}
            aria-hidden="true"
            className="shrink-0 text-fg-faint transition-transform duration-150 group-data-[state=open]:rotate-180"
          />
          <span className="min-w-0 flex-1 truncate">{heading}</span>
          {meta && <span className="shrink-0 text-sm text-fg-subtle">{meta}</span>}
        </RadixAccordion.Trigger>
      </RadixAccordion.Header>
      <RadixAccordion.Content className="pb-4 pl-6 text-body text-fg-muted">
        {children}
      </RadixAccordion.Content>
    </RadixAccordion.Item>
  )
}
