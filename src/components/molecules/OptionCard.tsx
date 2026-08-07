import * as React from 'react'
import { IconBadge, type IconBadgeProps } from '@/components/atoms/IconBadge'
import { Checkbox } from '@/components/atoms/Checkbox'
import { Typography } from '@/components/atoms/Typography'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { cn } from '@/lib/utils'

export interface OptionCardProps {
  title: string
  description?: string
  tooltip?: string
  icon?: React.ReactNode
  iconVariant?: IconBadgeProps['variant']
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  name?: string
  className?: string
}

export function OptionCard({
  title,
  description,
  tooltip,
  icon,
  iconVariant = 'emerald',
  checked,
  onChange,
  disabled = false,
  name,
  className,
}: OptionCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    // If click originated from the Checkbox button or HelpTooltip, let it handle directly
    if ((e.target as HTMLElement).closest('button[role="checkbox"]') || (e.target as HTMLElement).closest('[aria-label="Ajuda"]')) {
      return
    }
    if (!disabled) {
      onChange(!checked)
    }
  }

  return (
    <div
      role="checkbox"
      tabIndex={disabled ? -1 : 0}
      aria-checked={checked}
      onClick={handleClick}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !disabled) {
          e.preventDefault()
          onChange(!checked)
        }
      }}
      className={cn(
        'flex items-center justify-between p-mx-md rounded-2xl bg-gray-50 border border-gray-200 select-none',
        'hover:bg-white hover:shadow-sm transition-all cursor-pointer group',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-gray-50 hover:shadow-none',
        className,
      )}
    >
      <div className="flex items-center gap-mx-md">
        {icon && (
          <IconBadge variant={iconVariant} size="md">
            {icon}
          </IconBadge>
        )}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <Typography variant="h3" className="text-sm tracking-tight text-gray-800">
              {title}
            </Typography>
            {tooltip && <HelpTooltip text={tooltip} side="right" />}
          </div>
          {description && (
            <Typography variant="caption" tone="muted" className="text-mx-nano block">
              {description}
            </Typography>
          )}
        </div>
      </div>
      <Checkbox
        name={name}
        checked={checked}
        onCheckedChange={(val) => {
          if (!disabled) onChange(val === true)
        }}
        disabled={disabled}
        className="w-5 h-5 rounded-lg shrink-0 accent-emerald-600 cursor-pointer"
      />
    </div>
  )
}
