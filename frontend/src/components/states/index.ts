/**
 * Async, empty and confirmation states.
 *
 * These are what a demo hits when the wifi wobbles, when a queue is genuinely
 * empty, and when someone is one click from destroying the world they are
 * demonstrating. Import them from here rather than by file, so a page never
 * accidentally reimplements one of them.
 */

export {
  Skeleton,
  SkeletonText,
  SkeletonRow,
  SkeletonCard,
  SkeletonTable,
  SkeletonChart,
  type SkeletonProps,
  type SkeletonTextProps,
  type SkeletonRowProps,
  type SkeletonCardProps,
  type SkeletonTableProps,
  type SkeletonChartProps,
} from './LoadingSkeleton'

export { StateAction, type StateActionProps, type StateActionTone } from './StateAction'
export { ErrorState, type ErrorStateProps } from './ErrorState'
export { EmptyState, type EmptyStateProps } from './EmptyState'
export { DisconnectedBanner, type DisconnectedBannerProps } from './DisconnectedBanner'
export { ErrorBoundary, RouteErrorBoundary, type ErrorBoundaryProps } from './ErrorBoundary'
export { ConfirmationDialog, type ConfirmationDialogProps } from './ConfirmationDialog'
export { AsyncBoundary, type AsyncBoundaryProps } from './AsyncBoundary'
