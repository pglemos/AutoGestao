import type { ReactNode } from 'react'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { cn } from '@/lib/utils'
import { toneClasses, type KpiTone } from './types'
import { SectionTitle } from './primitives'

export function OwnerModuleGrid({
  title,
  subtitle,
  items,
}: {
  title: string
  subtitle: string
  items: Array<{ title: string; detail: string; icon: ReactNode; tone: KpiTone }>
}) {
  return (
    <div className="space-y-mx-md">
      <SectionTitle title={title} subtitle={subtitle} />
      <div className="grid grid-cols-1 gap-mx-md md:grid-cols-3">
        {items.map((item) => {
          const classes = toneClasses[item.tone]
          return (
            <Card key={item.title} className="min-h-[168px] p-mx-lg">
              <div className={cn('flex h-mx-12 w-mx-12 items-center justify-center rounded-2xl shadow-sm', classes.bg)}>
                {item.icon}
              </div>
              <Typography variant="h3" className="mt-mx-md text-lg">{item.title}</Typography>
              <Typography variant="p" tone="muted" className="mt-mx-xs text-sm font-bold">{item.detail}</Typography>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
