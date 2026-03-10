import React from 'react'
import { cn } from '../../utils/cn'
import { useIsMobile } from '../../hooks/use-mobile'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip'
import { Separator } from '../ui/separator'
import { PanelLeft } from 'lucide-react'

export interface SidebarProps {
  className?: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  topItems?: React.ReactNode
  bottomItems?: React.ReactNode
}

export interface SidebarIconProps {
  icon: React.ElementType
  label: string
  active?: boolean
  onClick?: () => void
  href?: string
  testId?: string
}

export const SidebarIcon = ({
  icon: Icon,
  label,
  active,
  onClick,
  href,
  testId,
}: SidebarIconProps) => (
  <TooltipProvider delayDuration={300} skipDelayDuration={0}>
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        {onClick ? (
          <button
            onClick={onClick}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-card hover:text-foreground'
            )}
            data-testid={testId}
          >
            <Icon className="h-5 w-5" />
            <span className="sr-only">{label}</span>
          </button>
        ) : href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-card hover:text-foreground'
            )}
            data-testid={testId}
          >
            <Icon className="h-5 w-5" />
            <span className="sr-only">{label}</span>
          </a>
        ) : (
          <span
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-card hover:text-foreground'
            )}
            data-testid={testId}
          >
            <Icon className="h-5 w-5" />
            <span className="sr-only">{label}</span>
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
)

export const Sidebar = ({
  className,
  isCollapsed = false,
  onToggleCollapse,
  topItems,
  bottomItems,
}: SidebarProps) => {
  const isMobile = useIsMobile()

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-background transition-all duration-300',
        isCollapsed
          ? 'w-0 -translate-x-full overflow-hidden md:w-16 md:translate-x-0'
          : 'w-16',
        className
      )}
    >
      <nav className="flex flex-col items-center gap-4 px-2 py-4">
        {isMobile && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-card text-lg font-semibold text-foreground hover:bg-muted"
            data-testid="sidebar-toggle"
          >
            <PanelLeft className="h-5 w-5 transition-all group-hover:scale-110" />
            <span className="sr-only">Toggle Sidebar</span>
          </button>
        )}
        {topItems}
      </nav>

      <div className="flex-1 flex items-center justify-center">
        <Separator orientation="horizontal" className="bg-border w-8" />
      </div>

      <nav className="flex flex-col items-center gap-4 px-2 py-4">
        {bottomItems}
      </nav>
    </aside>
  )
}
