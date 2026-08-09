import { getStatusMeta, TONE_CLASSES, DOT_CLASSES } from "@/features/owner/lib/ownerStatus";
import { cn } from "@/lib/utils";

export default function StatusBadge({ status, className }) {
  const meta = getStatusMeta(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASSES[meta.tone],
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASSES[meta.tone])} />
      {meta.label}
    </span>
  );
}
