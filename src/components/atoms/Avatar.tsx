import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const avatarVariants = cva(
  "relative inline-flex items-center justify-center rounded-mx-full overflow-hidden bg-surface-alt border border-border shrink-0",
  {
    variants: {
      size: {
        sm: "h-8 w-8 text-mx-micro",
        md: "h-10 w-10 text-mx-tiny",
        lg: "h-12 w-12 text-sm",
        xl: "h-16 w-16 text-lg",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

const statusDotVariants = cva(
  "absolute rounded-mx-full border-2 border-white",
  {
    variants: {
      status: {
        online: "bg-status-success",
        offline: "bg-text-tertiary",
        busy: "bg-status-error",
        away: "bg-status-warning",
      },
      size: {
        sm: "size-mx-tiny bottom-mx-0 right-mx-0",
        md: "size-2.5 bottom-mx-0 right-mx-0",
        lg: "size-3 bottom-mx-tiny right-mx-tiny",
        xl: "size-3.5 bottom-mx-tiny right-mx-tiny",
      },
    },
    defaultVariants: {
      status: undefined,
      size: "md",
    },
  }
)

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  src?: string
  alt?: string
  fallback?: string
  status?: 'online' | 'offline' | 'busy' | 'away'
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size, src, alt, fallback, status, ...props }, ref) => {
    const [imgError, setImgError] = React.useState(false)

  const showFallback = !src || imgError
  const initials = fallback ? getInitials(fallback) : '?'
  const accessibleName = alt || fallback || 'Avatar'

  return (
    <div
      ref={ref}
      role={showFallback ? 'img' : undefined}
      aria-label={showFallback ? accessibleName : undefined}
      className={cn(avatarVariants({ size }), className)}
      {...props}
    >
      {showFallback ? (
        <span className="font-bold uppercase text-status-success-text select-none" aria-hidden="true">
          {initials}
        </span>
      ) : (
        <img
          src={src}
          alt={accessibleName}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
        )}
        {status && (
          <span className={cn(statusDotVariants({ status, size }))} aria-label={status} />
        )}
      </div>
    )
  }
)
Avatar.displayName = "Avatar"

export { Avatar, avatarVariants }
