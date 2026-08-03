import { useRef, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const modalSizeVariants = cva(
  "w-auto sm:w-full bg-white shadow-sm rounded-2xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-4rem)]",
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

const referenceModalSizes = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-xl",
  xl: "max-w-3xl",
  "2xl": "max-w-5xl",
  "3xl": "max-w-[1280px]",
} as const;

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
          data-reference-overlay={referenceStyle ? "true" : undefined}
          className={cn(
            "fixed inset-0 z-[100]",
            referenceStyle ? "bg-black/30" : "bg-gray-900/60 backdrop-blur-md",
          )}
        />
        <Dialog.Content
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
            referenceStyle
              ? "fixed left-4 right-4 top-1/2 -translate-y-1/2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[101] focus:outline-none"
              : "fixed left-mx-md right-mx-md top-mx-md bottom-mx-md sm:left-1/2 sm:right-auto sm:top-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2 z-[101] focus:outline-none",
            referenceStyle
              // `w-auto` abaixo de sm, como no shell não-reference: com
              // `left-4 right-4` e `width:100%` o painel mede 100% da viewport
              // a partir de x=16 e vaza 16px à direita. Medido em 390px na
              // "Nova atividade" da Rotina do Dia: borda direita em 406.
              ? `w-auto sm:w-full max-h-[90vh] flex flex-col bg-white shadow-xl rounded-2xl ${referenceModalSizes[resolvedSize]}`
              : modalSizeVariants({ size: resolvedSize }),
            className,
          )}
        >
          <div className={cn(
            "border-b flex justify-between gap-mx-md bg-white z-10 shrink-0",
            referenceStyle
              ? "items-center border-gray-100 px-5 py-4"
              : "items-start border-gray-200 p-mx-md sm:p-mx-lg",
          )}>
            <div className="min-w-0">
              <Dialog.Title asChild>
                <h2 className={referenceStyle ? (resolvedSize === "sm" ? "text-base leading-6 font-semibold text-gray-800" : "text-lg leading-6 font-semibold text-gray-800") : "text-lg font-semibold text-gray-800"}>{title}</h2>
              </Dialog.Title>
              {description && (
                <Dialog.Description asChild>
                  {referenceStyle ? (
                    <p className="mt-0.5 text-sm text-gray-500">{description}</p>
                  ) : (
                    <p className="mt-1 text-sm text-gray-500">{description}</p>
                  )}
                </Dialog.Description>
              )}
            </div>
            {showClose && (
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Fechar modal"
                  className={cn(
                    "flex items-center justify-center transition-colors shrink-0",
                    referenceStyle
                      ? "h-5 w-5 !min-h-0 rounded-none bg-transparent p-0 text-gray-400 hover:text-gray-600"
                      : "h-mx-xl w-mx-xl rounded-2xl bg-gray-50",
                  )}
                >
                  <X size={referenceStyle ? 18 : 20} />
                </button>
              </Dialog.Close>
            )}
          </div>

          <div className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain",
            referenceStyle
              ? "p-5 [&_input]:!text-sm [&_select]:!text-sm [&_textarea]:!text-sm"
              : "p-mx-md sm:p-mx-lg",
          )}>
            {children}
          </div>

          {footer && (
            <div
              className={cn(
                "border-t flex bg-white shrink-0",
                referenceStyle
                  ? "flex-row justify-end gap-3 border-gray-100 px-5 py-4"
                  : "flex-col-reverse gap-mx-sm border-gray-200 sm:flex-row sm:justify-end p-mx-md sm:p-mx-lg",
              )}
              style={referenceStyle ? undefined : {
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
