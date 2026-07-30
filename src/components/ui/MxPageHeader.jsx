import React from "react";

import { PageHeader } from "@/design/components";
import { cn } from "@/lib/utils";

export default function MxPageHeader({ title, subtitle, chip, action, className = "" }) {
  return (
    <header
      className={cn(
        "relative z-40 shrink-0 border-b border-gray-200/70 bg-gray-50 px-4 pb-3 pt-2 shadow-card sm:px-6 md:sticky md:top-0 md:pt-3 2xl:px-8",
        className
      )}
    >
      <PageHeader
        title={title}
        subtitle={subtitle}
        dateLabel={chip}
        actions={action}
        variant="compact"
      />
    </header>
  );
}
