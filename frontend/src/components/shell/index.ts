/**
 * The application frame.
 *
 * Only `AppShell` is normally imported from outside this folder — the router
 * mounts it and everything else is an internal part of it. The rest are
 * exported so a page can reuse a readout (the loop pill on an empty command
 * centre, say) without copying its honesty rules.
 */

export { AppShell } from './AppShell'
export { TopNavigation, type TopNavigationProps } from './TopNavigation'
export { SideNavigation, type SideNavigationProps } from './SideNavigation'
export { CommandPalette, type CommandPaletteProps } from './CommandPalette'
export { RoleSwitcher, type RoleSwitcherProps } from './RoleSwitcher'
export { UserMenu, type UserMenuProps } from './UserMenu'
export { HelpMenu, type HelpMenuProps } from './HelpMenu'
export { NotificationsMenu, type NotificationsMenuProps } from './NotificationsMenu'
export { EnvironmentIndicator, type EnvironmentIndicatorProps } from './EnvironmentIndicator'
export { LoopStatusPill, type LoopStatusPillProps } from './LoopStatusPill'
export { SandboxStatusPill, type SandboxStatusPillProps } from './SandboxStatusPill'
export { GlobalSearchButton, type GlobalSearchButtonProps } from './GlobalSearchButton'
export { ProductMark, type ProductMarkProps } from './ProductMark'
export { PageFallback } from './PageFallback'
export { useRouteMemory, type RecentRoute } from './recentRoutes'
