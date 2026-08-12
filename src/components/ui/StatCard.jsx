import React from "react";

export default function StatCard({ label, value, sublabel, icon: Icon, color = "blue", children }) {
  const colorMap = {
    blue: "bg-mx-blue-light text-mx-blue",
    green: "bg-brand-primary-subtle text-brand-primary",
    amber: "bg-mx-amber-light text-mx-amber",
    red: "bg-mx-red-light text-mx-red",
    navy: "bg-muted text-mx-navy",
  };

  return (
    <div className="bg-white rounded-[var(--mx-card-radius)] p-5 shadow-[var(--mx-card-shadow)] border border-border-subtle hover:shadow-[var(--mx-card-hover-shadow)] transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-mx-navy">{value}</p>
          {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-[var(--mx-card-radius)] flex items-center justify-center ${colorMap[color] || colorMap.blue}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
