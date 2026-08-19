import { forwardRef, useRef, type HTMLAttributes, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const modalSizeVariants = cva(
  "fixed left-mx-md right-mx-md top-1/2 -translate-y-1/2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 focus:outline-none w-auto sm:w-full flex flex-col",
  {
    variants: {
      size: {
        sm: "max-w-md",
        md: "max-w-lg",
        lg: "max-w-xl",
        xl: "max-w-3xl",
        "2xl": "max-w-5xl",
        "3xl": "max-w-[1280px]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export interface ModalProps extends VariantProps<typeof modalSizeVariants> {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  showClose?: boolean;
  footer?: ReactNode;
  className?: string;
  closeOnEscape?: boolean;
  referenceStyle?: boolean;
  onOpenAutoFocus?: (event: Event) => void;
}

export const ModalBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-mx-overlay-body="true"
      className={cn("mx-overlay-body", className)}
      {...props}
    />
  ),
);
ModalBody.displayName = "ModalBody";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  showClose = true,
  footer,
  className,
  closeOnEscape = true,
  referenceStyle = false,
  onOpenAutoFocus,
}: ModalProps) {
  const resolvedSize = size ?? "md";
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  if (open && !wasOpenRef.current && typeof document !== "undefined") {
    previouslyFocusedElementRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  }
  wasOpenRef.current = open;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          data-mx-overlay-backdrop="modal"
          data-reference-overlay={referenceStyle ? "true" : undefined}
          className="mx-overlay-backdrop fixed inset-0 z-[var(--mx-z-overlay,50)]"
        />
        <Dialog.Content
          data-mx-overlay="modal"
          data-mx-overlay-layer="modal"
          data-reference-modal={referenceStyle ? "true" : undefined}
          onEscapeKeyDown={(event) => {
            if (!closeOnEscape) event.preventDefault();
          }}
          onOpenAutoFocus={onOpenAutoFocus}
          onCloseAutoFocus={(event) => {
            const previouslyFocusedElement = previouslyFocusedElementRef.current;
            if (!previouslyFocusedElement?.isConnected) return;

            event.preventDefault();
            requestAnimationFrame(() => previouslyFocusedElement.focus());
          }}
          className={cn(
            "mx-overlay-surface z-[var(--mx-z-modal,60)]",
            modalSizeVariants({ size: resolvedSize }),
            className,
          )}
        >
          <div className={cn(
            "flex shrink-0 justify-between gap-mx-md border-b bg-white",
            referenceStyle
              ? "items-center border-border-subtle px-mx-5 py-mx-4"
              : "items-start border-border p-mx-md sm:p-mx-lg",
          )}>
            <div className="min-w-0">
              <Dialog.Title asChild>
                <h2 className={cn(
                  "truncate text-lg",
                  "font-semibold leading-6 text-foreground",
                )} title={title}>{title}</h2>
              </Dialog.Title>
              {description && (
                <Dialog.Description asChild>
                  <p className={cn(
                    "text-sm text-muted-foreground",
                    referenceStyle ? "mt-0.5" : "mt-1",
                  )}>{description}</p>
                </Dialog.Description>
              )}
            </div>
            {showClose && (
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Fechar modal"
                  className={cn(
                    "mx-overlay-close shrink-0 transition-colors",
                    referenceStyle
                      ? "!min-h-0 !min-w-0 h-5 w-5 rounded-none bg-transparent p-0 text-muted-foreground hover:text-muted-foreground"
                      : "rounded-[var(--mx-overlay-close-radius)] bg-surface-alt text-muted-foreground hover:text-foreground",
                  )}
                >
                  <X size={referenceStyle ? 18 : 20} />
                </button>
              </Dialog.Close>
            )}
          </div>

          <ModalBody className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain",
            referenceStyle
              ? "p-mx-5 [&_input]:!text-sm [&_select]:!text-sm [&_textarea]:!text-sm"
              : "p-mx-md sm:p-mx-lg",
          )}>
            {children}
          </ModalBody>

          {footer && (
            <div
              className={cn(
                "flex shrink-0 border-t bg-white",
                referenceStyle
                  ? "flex-row justify-end gap-mx-sm border-border-subtle px-mx-5 py-mx-4 [&>button]:!min-h-0"
                  : "flex-col-reverse gap-mx-sm border-border p-mx-md sm:flex-row sm:justify-end sm:p-mx-lg",
              )}
              style={{
                paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1rem)",
              }}
            >
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
