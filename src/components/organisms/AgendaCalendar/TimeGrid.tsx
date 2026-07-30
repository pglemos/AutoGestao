import { useEffect, useMemo, useRef, useState } from 'react'
import { format, isSameDay, isToday, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Typography } from '@/components/atoms/Typography'
import {
  END_HOUR,
  HOUR_HEIGHT,
  START_HOUR,
  clampDuration,
  getEventPosition,
  layoutOverlappingEvents,
  pxToMinutes,
} from './layout'
import { useDragToReschedule } from './useDragToReschedule'
import { useDragToResize } from './useDragToResize'
import { AgendaEventCard } from './AgendaEventCard'
import { AgendaEventPopover } from './AgendaEventPopover'
import type { AgendaQuickActions, CalendarAgendaItem, CalendarDay } from './types'

const TIME_SLOTS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => START_HOUR + index)
const GRID_HEIGHT = TIME_SLOTS.length * HOUR_HEIGHT

interface TimeGridProps {
  days: CalendarDay[]
  visitsByDate: Record<string, CalendarAgendaItem[]>
  getVisitDotColor: (status: string) => string
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  onSlotClick?: (date: Date, hour: number, minute: number) => void
  onReschedule?: (item: CalendarAgendaItem, newStartsAtISO: string) => void
  onResize?: (item: CalendarAgendaItem, newDurationHours: number) => void
  quickActions: AgendaQuickActions
}

function useNowOffset() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  const decimalHour = now.getHours() + now.getMinutes() / 60
  return { top: (decimalHour - START_HOUR) * HOUR_HEIGHT }
}

export function TimeGrid({
  days,
  visitsByDate,
  getVisitDotColor,
  selectedDate,
  onDateSelect,
  onSlotClick,
  onReschedule,
  onResize,
  quickActions,
}: TimeGridProps) {
  const columnsRef = useRef<HTMLDivElement>(null)
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null)
  const { top: nowTop } = useNowOffset()

  const itemIndex = useMemo(() => {
    const map = new Map<string, { item: CalendarAgendaItem; dateKey: string }>()
    for (const [dateKey, items] of Object.entries(visitsByDate)) {
      for (const item of items) map.set(item.id, { item, dateKey })
    }
    return map
  }, [visitsByDate])

  const dayKeys = useMemo(() => days.map((d) => format(d.date, 'yyyy-MM-dd')), [days])

  const { preview: dragPreview, startDrag } = useDragToReschedule({
    dayCount: days.length,
    hourHeight: HOUR_HEIGHT,
    onReschedule: (itemId, dayIndex, deltaMinutes) => {
      const found = itemIndex.get(itemId)
      if (!found) return
      const targetDay = days[dayIndex]?.date
      if (!targetDay) return
      const originalStart = parseISO(found.item.startsAt)
      const totalMinutes = originalStart.getHours() * 60 + originalStart.getMinutes() + deltaMinutes
      const clampedMinutes = Math.min(Math.max(totalMinutes, START_HOUR * 60), END_HOUR * 60)
      const newStart = new Date(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate())
      newStart.setHours(0, clampedMinutes, 0, 0)
      onReschedule?.(found.item, newStart.toISOString())
    },
  })

  const { preview: resizePreview, startResize } = useDragToResize({
    hourHeight: HOUR_HEIGHT,
    onResize: (itemId, deltaMinutes) => {
      const found = itemIndex.get(itemId)
      if (!found) return
      const newDuration = clampDuration(found.item.durationHours + deltaMinutes / 60, found.item.kind)
      onResize?.(found.item, newDuration)
    },
  })

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white">
      <div
        className="sticky top-0 z-30 grid overflow-x-auto border-b border-gray-200 bg-white"
        style={{ gridTemplateColumns: days.length === 1 ? '4rem minmax(0, 1fr)' : `4rem repeat(${days.length}, minmax(7.5rem, 1fr))` }}
      >
        <div className="border-r border-gray-200" aria-hidden="true" />
        {days.map((dayInfo) => {
          const isTodayDate = isToday(dayInfo.date)
          const isSelected = selectedDate ? isSameDay(dayInfo.date, selectedDate) : false
          return (
            <button
              key={format(dayInfo.date, 'yyyy-MM-dd')}
              type="button"
              onClick={() => onDateSelect(dayInfo.date)}
              className={cn(
                'min-w-0 border-r border-gray-200 px-mx-xs py-mx-sm text-center transition-colors last:border-r-0 hover:bg-gray-50',
                isSelected && 'bg-mx-green-50',
              )}
            >
              <Typography variant="tiny" tone="muted" className="block text-[10px] font-semibold tracking-normal">
                {format(dayInfo.date, 'EEE', { locale: ptBR })}
              </Typography>
              <span className={cn(
                'mx-auto mt-1 flex h-mx-9 w-mx-9 items-center justify-center rounded-mx-full text-sm font-semibold',
                isTodayDate ? 'bg-emerald-600 text-white' : 'text-gray-800',
              )}>
                {dayInfo.day}
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid overflow-x-auto" style={{ gridTemplateColumns: '4rem minmax(0, 1fr)' }}>
        <div className="border-r border-gray-200 bg-white">
          {TIME_SLOTS.map((slot) => (
            <div key={slot} className="border-b border-gray-100 pr-mx-xs pt-mx-xs text-right" style={{ height: HOUR_HEIGHT }}>
              <Typography variant="tiny" tone="muted" className="text-[10px] font-medium">{`${String(slot).padStart(2, '0')}:00`}</Typography>
            </div>
          ))}
        </div>

        <div
          ref={columnsRef}
          className="grid"
          style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`, minWidth: days.length > 1 ? '54rem' : undefined, height: GRID_HEIGHT }}
        >
          {days.map((dayInfo, dayIndex) => {
            const dateKey = dayKeys[dayIndex]
            const dayVisits = [...(visitsByDate[dateKey] || [])].sort(
              (a, b) => parseISO(a.startsAt).getTime() - parseISO(b.startsAt).getTime(),
            )
            const layout = layoutOverlappingEvents(dayVisits)
            const isWeekend = dayInfo.date.getDay() === 0 || dayInfo.date.getDay() === 6
            const showNowLine = isToday(dayInfo.date) && nowTop >= 0 && nowTop <= GRID_HEIGHT

            return (
              // Background click-to-create-slot on a day column, not a single
              // control — the focusable event cards inside already handle
              // keyboard interaction, so this stays a plain div.
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
              <div
                key={dateKey}
                className={cn(
                  'relative border-r border-gray-200 last:border-r-0',
                  isWeekend && 'bg-gray-50/40',
                )}
                onClick={(event) => {
                  if (!onSlotClick) return
                  const rect = event.currentTarget.getBoundingClientRect()
                  const offsetY = event.clientY - rect.top
                  const totalMinutes = Math.round(pxToMinutes(offsetY) / 15) * 15
                  const hour = START_HOUR + Math.floor(totalMinutes / 60)
                  const minute = totalMinutes % 60
                  onSlotClick(dayInfo.date, hour, minute)
                }}
              >
                {TIME_SLOTS.map((slot) => (
                  <div key={slot} className="border-b border-gray-100" style={{ height: HOUR_HEIGHT }} aria-hidden="true" />
                ))}

                {showNowLine && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                    style={{ top: nowTop }}
                    aria-hidden="true"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-mx-full bg-status-error" />
                    <span className="h-px flex-1 bg-status-error" />
                  </div>
                )}

                {layout.map(({ item, columnIndex, columnCount }) => {
                  const position = getEventPosition(item.startsAt, item.durationHours)
                  const isDraggingThis = dragPreview?.itemId === item.id
                  const isResizingThis = resizePreview?.itemId === item.id
                  const isDraggedAway = isDraggingThis && dragPreview!.dayIndex !== dayIndex
                  const top = isDraggingThis && !isDraggedAway ? position.top + dragPreview!.deltaMinutes / 60 * HOUR_HEIGHT : position.top
                  const height = isResizingThis
                    ? Math.max(30, position.height + (resizePreview!.deltaMinutes / 60) * HOUR_HEIGHT)
                    : position.height
                  const widthPct = 100 / columnCount
                  const leftPct = columnIndex * widthPct

                  if (isDraggedAway) return null

                  return (
                    <AgendaEventPopover
                      key={`${item.kind}-${item.id}`}
                      item={item}
                      getVisitDotColor={getVisitDotColor}
                      quickActions={quickActions}
                      open={openPopoverId === item.id}
                      onOpenChange={(open) => setOpenPopoverId(open ? item.id : null)}
                    >
                      <div
                        className="absolute px-px"
                        style={{ top, height, left: `${leftPct}%`, width: `${widthPct}%` }}
                      >
                        <AgendaEventCard
                          item={item}
                          getVisitDotColor={getVisitDotColor}
                          resizable
                          ghost={isDraggingThis || isResizingThis}
                          onPointerDownBody={(event) => startDrag(event, item, dayIndex, (columnsRef.current?.clientWidth || 0) / days.length)}
                          onPointerDownHandle={(event) => startResize(event, item.id)}
                          onOpen={() => setOpenPopoverId((current) => (current === item.id ? null : item.id))}
                        />
                      </div>
                    </AgendaEventPopover>
                  )
                })}

                {dragPreview?.dayIndex === dayIndex && itemIndex.get(dragPreview.itemId) && (
                  (() => {
                    const draggedEntry = itemIndex.get(dragPreview.itemId)
                    if (!draggedEntry || draggedEntry.dateKey === dateKey) return null
                    const position = getEventPosition(draggedEntry.item.startsAt, draggedEntry.item.durationHours)
                    const top = position.top + (dragPreview.deltaMinutes / 60) * HOUR_HEIGHT
                    return (
                      <div className="pointer-events-none absolute inset-x-1" style={{ top, height: position.height }}>
                        <AgendaEventCard item={draggedEntry.item} getVisitDotColor={getVisitDotColor} ghost />
                      </div>
                    )
                  })()
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
