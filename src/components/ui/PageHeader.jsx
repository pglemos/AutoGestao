import React from "react";
import { BookOpen, MessageSquare, Target, TrendingUp, UserCircle } from "lucide-react";
import { PageHeader as CanonicalPageHeader } from "@/components/molecules/PageHeader";

const ICONS = {
  "Meu Perfil": UserCircle,
  Treinamentos: BookOpen,
  Feedback: MessageSquare,
  PDI: Target,
};

export default function PageHeader({ title, subtitle, children }) {
  const Icon = ICONS[title] || TrendingUp;

  return (
    <CanonicalPageHeader
      className="mb-8"
      title={title}
      description={subtitle}
      icon={Icon}
      actions={children}
      titleVariant="h3"
      descriptionVariant="p"
    />
  );
}
