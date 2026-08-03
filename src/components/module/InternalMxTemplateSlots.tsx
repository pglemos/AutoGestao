import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function InternalMxTemplatePage({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      data-mx-template-page=""
      data-mx-template-slot="page"
      className={cn('min-h-full w-full', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function InternalMxTemplateHeader({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <header
      data-mx-template-header=""
      data-mx-template-slot="header"
      className={className}
      {...props}
    >
      {children}
    </header>
  )
}

export function InternalMxTemplateToolbar({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <section
      data-mx-template-toolbar=""
      data-mx-template-slot="toolbar"
      className={className}
      {...props}
    >
      {children}
    </section>
  )
}

export function InternalMxTemplateSection({
  as: Component = 'section',
  children,
  className,
  ...props
}: {
  as?: ElementType
  children: ReactNode
  className?: string
} & HTMLAttributes<HTMLElement>) {
  return (
    <Component
      data-mx-template-section=""
      data-mx-template-slot="section"
      className={className}
      {...props}
    >
      {children}
    </Component>
  )
}

export function InternalMxTemplateTable({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      data-mx-template-table=""
      data-mx-template-slot="table"
      className={className}
      {...props}
    >
      {children}
    </div>
  )
}

export function InternalMxTemplateTabs({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <nav
      data-mx-template-tabs=""
      data-mx-template-slot="tabs"
      className={className}
      {...props}
    >
      {children}
    </nav>
  )
}

export function InternalMxTemplateSidebar({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return (
    <aside
      data-mx-template-sidebar=""
      data-mx-template-slot="sidebar"
      className={className}
      {...props}
    >
      {children}
    </aside>
  )
}
