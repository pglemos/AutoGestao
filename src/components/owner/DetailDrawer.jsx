import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

// Drawer lateral padrão do ambiente do Dono.
export default function DetailDrawer({ open, onOpenChange, title, description, children, footer }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md md:max-w-lg"
      >
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle className="text-base">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <SheetBody className="p-5">{children}</SheetBody>
        {footer && <div className="border-t border-border p-4">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}