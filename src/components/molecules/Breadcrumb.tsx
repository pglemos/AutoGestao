import * as React from 'react'
import { ChevronRight } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  to?: string
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[]
}

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  ({ items, className, ...props }, ref) => {
    if (items.length === 0) return null

    return (
      <nav ref={ref} aria-label="Breadcrumb" className={cn("mb-mx-md", className)} {...props}>
        <ol className="flex items-center gap-mx-xs text-sm text-muted-foreground">
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-mx-xs">
              {index > 0 && <ChevronRight size={14} className="text-muted-foreground" aria-hidden="true" />}
              {item.to && index < items.length - 1 ? (
                <NavLink to={item.to} className="hover:text-foreground transition-colors">
                  {item.label}
                </NavLink>
              ) : (
                <span aria-current={index === items.length - 1 ? 'page' : undefined} className="text-foreground font-medium">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    )
  }
)
Breadcrumb.displayName = "Breadcrumb"

export { Breadcrumb }
