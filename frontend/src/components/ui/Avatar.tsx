/**
 * A person, at a glance.
 *
 * There are no uploaded photos in this product, so the fallback IS the avatar:
 * initials from `format.initials()`, on a raised surface. Radix handles the
 * image-load race for the day one arrives, and the name always ships as the
 * accessible label — an avatar that is only a coloured circle tells a screen
 * reader nothing.
 */

import * as RadixAvatar from '@radix-ui/react-avatar'
import { cn, initials } from '../../lib/format'

export type AvatarSize = 'sm' | 'md' | 'lg'

const SIZE: Record<AvatarSize, string> = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-body',
}

export interface AvatarProps {
  name: string | null | undefined
  src?: string | null
  size?: AvatarSize
  className?: string
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  return (
    <RadixAvatar.Root
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center overflow-hidden',
        'rounded-full border border-line bg-raised',
        SIZE[size],
        className,
      )}
    >
      {src && (
        <RadixAvatar.Image src={src} alt={name ?? ''} className="h-full w-full object-cover" />
      )}
      <RadixAvatar.Fallback
        delayMs={src ? 300 : 0}
        className="font-medium text-fg-muted"
        aria-label={name ?? undefined}
      >
        {initials(name)}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  )
}
